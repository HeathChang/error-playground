import { describe, expect, it } from 'vitest';
import { TimingGame, type TimingOptions } from './game';

const OPTS: TimingOptions = { width: 320, height: 200, seed: 42 };
const STEP = 1 / 60;

/**
 * 테스트는 내부 상태를 **조작하지 않는다** — 오직 공개 API(`input`/`step`)로 구동하고,
 * 렌더러가 읽는 관찰 가능한 모델(status·score·pos·target·half·phase·dir)만 확인한다.
 * 결정성은 고정 seed로 보장한다(ruler/testing.md §결정성).
 */

/** 정지 연출(paused)이 끝나 다시 스윕할 때까지 진행. */
function drainPause(g: TimingGame): void {
  for (let guard = 0; g.phase === 'paused' && guard < 1000; guard += 1) g.step(STEP);
}

/**
 * 스윕 중 마커가 목표 존 안(want=true)/밖(want=false)에 올 때까지 진행한 뒤 정지 입력을 넣어 평가한다.
 * 존 진입 시점은 관찰 가능한 모델(pos·target·half)로 판단할 뿐, 내부 값을 세팅하지 않는다.
 */
function stopWhen(g: TimingGame, want: boolean): void {
  let found = false;
  for (let guard = 0; guard < 100_000; guard += 1) {
    if ((Math.abs(g.pos - g.target) <= g.half) === want) {
      found = true;
      break;
    }
    g.step(STEP);
  }
  // 탐색 전제가 깨지면(존 안/밖 진입점을 못 찾음) 후속 assertion이 아니라 여기서 원인을 드러낸다.
  if (!found) {
    throw new Error(`stopWhen: 마커가 목표 존 ${want ? '안' : '밖'}에 오는 지점을 100k 스텝 내에 찾지 못했습니다`);
  }
  g.input(); // 정지 요청
  g.step(STEP); // 평가(히트 또는 게임오버)
}

/** 확실한 히트 1회: (필요하면) 게임을 시작하고 정지 연출을 흘려보낸 뒤 존 안에서 멈춘다. */
function scoreOnce(g: TimingGame): void {
  if (g.status !== 'running') g.input(); // ready/over → 시작(step은 running에서만 진행)
  drainPause(g);
  stopWhen(g, true);
}

describe('TimingGame — 결정적 로직 (v2)', () => {
  it('should stay in ready and ignore step() until the first input()', () => {
    const g = new TimingGame(OPTS);
    expect(g.status).toBe('ready');
    const pos0 = g.pos;
    g.step(1);
    expect(g.status).toBe('ready');
    expect(g.pos).toBe(pos0);
  });

  it('should start sweeping the marker on the first input()', () => {
    const g = new TimingGame(OPTS);
    g.input();
    expect(g.status).toBe('running');
    expect(g.phase).toBe('sweep');
    g.step(STEP);
    expect(g.pos).toBeGreaterThan(0); // 오른쪽으로 스윕 시작
  });

  it('should score and pause when stopped inside the target zone', () => {
    const g = new TimingGame(OPTS);
    g.input();
    stopWhen(g, true);
    expect(g.score).toBe(1);
    expect(g.status).toBe('running');
    expect(g.phase).toBe('paused');
  });

  it('should end the game when stopped outside the target zone', () => {
    const g = new TimingGame(OPTS);
    g.input();
    stopWhen(g, false);
    expect(g.status).toBe('over');
    expect(g.score).toBe(0);
  });

  it('should keep the marker inside the displayed target zone throughout the success pause', () => {
    const g = new TimingGame(OPTS);
    g.input();
    stopWhen(g, true); // 존 안에서 정지 → 성공 → paused
    expect(g.phase).toBe('paused');

    // render.ts는 paused에서도 game.target±half로 목표 존을, game.pos로 마커를 그린다.
    // 성공 지점(pos)이 화면에 표시되는 목표 존 안에 있어야 "여기서 멈췄다"를 올바로 보여 준다.
    const zoneTarget = g.target;
    const zoneHalf = g.half;
    const posAtStop = g.pos;
    expect(Math.abs(posAtStop - zoneTarget)).toBeLessThanOrEqual(zoneHalf);

    // 정지 연출이 이어지는 동안 목표/폭/마커가 성공 당시 값으로 보존된다(다음 목표로 미리 갈아타지 않음).
    for (let i = 0; i < 5; i += 1) {
      g.step(STEP); // PAUSE_TIME(0.35s) 안 → 아직 재개 전
      expect(g.phase).toBe('paused');
      expect(g.target).toBe(zoneTarget);
      expect(g.half).toBe(zoneHalf);
      expect(g.pos).toBe(posAtStop);
    }
  });

  it('should resume sweeping from the left after the pause elapses', () => {
    const g = new TimingGame(OPTS);
    scoreOnce(g);
    expect(g.phase).toBe('paused');
    drainPause(g);
    expect(g.phase).toBe('sweep');
    expect(g.pos).toBe(0);
    expect(g.dir).toBe(1);
  });

  it('should ramp difficulty on resume (not at the hit), within bounds', () => {
    const g = new TimingGame(OPTS);
    const half0 = g.half;
    const speed0 = g.speed;

    scoreOnce(g); // 히트 → paused: 성공 당시 존을 유지하므로 아직 램프 전
    expect(g.half).toBe(half0);
    expect(g.speed).toBe(speed0);
    drainPause(g); // 재개 시점에 난이도 램프 적용
    expect(g.half).toBeLessThan(half0);
    expect(g.speed).toBeGreaterThan(speed0);

    // 여러 번 성공해도 하한/상한을 벗어나지 않는다.
    for (let i = 0; i < 40; i += 1) scoreOnce(g);
    drainPause(g); // 마지막 히트의 램프까지 반영
    expect(g.half).toBeGreaterThanOrEqual(0.045);
    expect(g.speed).toBeLessThanOrEqual(2.2);
    expect(g.score).toBe(41);
  });

  it('should keep the marker within [0,1] while sweeping (ping-pong), even on a large step', () => {
    const g = new TimingGame(OPTS);
    g.input();
    let wentRight = false;
    let wentLeft = false;
    for (let i = 0; i < 600; i += 1) {
      g.step(STEP);
      expect(g.pos).toBeGreaterThanOrEqual(0);
      expect(g.pos).toBeLessThanOrEqual(1);
      if (g.dir === 1) wentRight = true;
      if (g.dir === -1) wentLeft = true;
    }
    expect(wentRight && wentLeft).toBe(true); // 양방향 반사 확인

    // 한 프레임이 트랙을 여러 번 가로지르는 큰 dt에도 범위를 유지한다(dt 계약 방어).
    g.step(10);
    expect(g.pos).toBeGreaterThanOrEqual(0);
    expect(g.pos).toBeLessThanOrEqual(1);
  });

  it('should restart cleanly from game over', () => {
    const g = new TimingGame(OPTS);
    g.input();
    stopWhen(g, false);
    expect(g.status).toBe('over');

    g.input(); // 재시작
    expect(g.status).toBe('running');
    expect(g.score).toBe(0);
    expect(g.speed).toBe(0.9);
    expect(g.half).toBe(0.16);
  });

  it('should be deterministic for the same seed', () => {
    const a = new TimingGame({ ...OPTS, seed: 9 });
    const b = new TimingGame({ ...OPTS, seed: 9 });
    expect(a.target).toBe(b.target); // 초기 목표 동일

    const targetsA: number[] = [];
    const targetsB: number[] = [];
    for (let i = 0; i < 12; i += 1) {
      scoreOnce(a);
      scoreOnce(b);
      targetsA.push(a.target);
      targetsB.push(b.target);
    }
    expect(targetsA).toEqual(targetsB);
    expect(a.score).toBe(12);
  });
});
