import { describe, expect, it } from 'vitest';
import { ZigzagGame, ZIGZAG_GEO, type ZigzagOptions } from './game';

const OPTS: ZigzagOptions = { width: 320, height: 200, seed: 42 };
const { HALF } = ZIGZAG_GEO;

/**
 * 공개 입력 API(input())만으로 길을 따라가는 "완벽 플레이".
 * dir을 직접 대입하지 않고, 원하는 방향과 다를 때만 input()으로 토글한다
 * → 실제 사용자 조작(Space/탭 토글) 경로를 그대로 검증한다.
 */
function playPerfectly(g: ZigzagGame, frames: number): void {
  for (let i = 0; i < frames; i += 1) {
    const here = g.pathX(g.ballY);
    const ahead = g.pathX(g.ballY + 0.5);
    const want: 1 | -1 = ahead >= here ? 1 : -1;
    if (g.dir !== want) g.input(); // 토글로만 방향을 맞춘다(대입 금지)
    g.step(1 / 60);
    if (g.status === 'over') return;
  }
}

/** 방향을 꺾지 않고 진행 → 결국 길 밖으로 벗어나 게임오버시킨다. */
function runUntilOver(g: ZigzagGame, maxFrames = 600): void {
  for (let i = 0; i < maxFrames && g.status !== 'over'; i += 1) g.step(1 / 60);
}

describe('ZigzagGame — 결정적 로직 (v2)', () => {
  it('should start in ready and do nothing until input()', () => {
    const g = new ZigzagGame(OPTS);
    expect(g.status).toBe('ready');
    const y0 = g.ballY;
    g.step(1);
    expect(g.ballY).toBe(y0);
    expect(g.status).toBe('ready');
  });

  it('should start on the path centerline (zero error at the origin)', () => {
    const g = new ZigzagGame(OPTS);
    expect(g.ballX - g.pathX(g.ballY)).toBe(0);
    // 첫 세그먼트 방향은 공의 초기 방향과 일치해야 시작 직후 죽지 않는다.
    expect(g.pathX(0.5)).toBeGreaterThan(g.pathX(0)); // START_DIR = +1 → 오른쪽 위로
  });

  it('should start the game and move the ball forward on input()', () => {
    const g = new ZigzagGame(OPTS);
    g.input();
    expect(g.status).toBe('running');
    g.step(1 / 60);
    expect(g.ballY).toBeGreaterThan(0); // 전진
  });

  it('should toggle the steering direction on input() while running', () => {
    const g = new ZigzagGame(OPTS);
    g.input(); // ready→running (dir stays +1)
    expect(g.dir).toBe(1);
    g.input();
    expect(g.dir).toBe(-1);
    g.input();
    expect(g.dir).toBe(1);
  });

  it('should survive and score at each corner when following the path via input()', () => {
    const g = new ZigzagGame(OPTS);
    g.input();
    playPerfectly(g, 600); // ~10초 — 공개 입력 API만으로 코너를 통과
    expect(g.status).toBe('running');
    expect(g.score).toBeGreaterThan(3); // 여러 코너를 통과
    // 완벽 플레이 중 오차는 허용치 안에 머문다(불변식: 길 위에 있음).
    expect(Math.abs(g.ballX - g.pathX(g.ballY))).toBeLessThanOrEqual(HALF);
  });

  it('should die when it drifts off the path (never turning)', () => {
    const g = new ZigzagGame(OPTS);
    g.input(); // dir = +1 고정, 코너에서 꺾지 않음
    runUntilOver(g, 300);
    expect(g.status).toBe('over');
    // 최소 첫 세그먼트(첫 코너 전)는 정렬돼 있으므로 즉사하지 않고 코너 이후에 벗어난다.
    expect(g.score).toBeGreaterThanOrEqual(1);
  });

  it('should restart cleanly from game over', () => {
    const g = new ZigzagGame(OPTS);
    g.input();
    runUntilOver(g, 300);
    expect(g.status).toBe('over');

    g.input(); // 재시작
    expect(g.status).toBe('running');
    expect(g.score).toBe(0);
    expect(g.ballX).toBe(0);
    expect(g.ballY).toBe(0);
    expect(g.dir).toBe(1);
    expect(g.ballX - g.pathX(g.ballY)).toBe(0); // 다시 중심선
  });

  it('should restore the exact fresh-start state on restart (re-seeds RNG for the same seed)', () => {
    // 재시작이 결정적임을 증명: 재시작 직후 상태 == 같은 seed로 새로 만든 게임의 시작 상태.
    // (재시작이 RNG를 다시 시드하지 않으면 points가 어긋나 이 테스트가 실패한다 — 회귀 가드.)
    const fresh = new ZigzagGame({ ...OPTS, seed: 7 });

    const g = new ZigzagGame({ ...OPTS, seed: 7 });
    g.input();
    runUntilOver(g, 300);
    expect(g.status).toBe('over');
    g.input(); // 재시작

    expect(g.points).toEqual(fresh.points); // 경로 전체가 정확히 일치
    expect(g.ballX).toBe(fresh.ballX);
    expect(g.ballY).toBe(fresh.ballY);
    expect(g.dir).toBe(fresh.dir);
    expect(g.speed).toBe(fresh.speed);
    expect(g.score).toBe(fresh.score);
  });

  it('should reproduce the identical trajectory after restart under the same inputs (same seed)', () => {
    const fresh = new ZigzagGame({ ...OPTS, seed: 7 });
    const g = new ZigzagGame({ ...OPTS, seed: 7 });
    g.input();
    runUntilOver(g, 300);
    g.input(); // 재시작 → running

    fresh.input(); // ready→running: 양쪽 모두 running·dir=+1로 정렬
    for (let i = 0; i < 180; i += 1) {
      if (i % 15 === 0) {
        g.input(); // 동일한 조작 스크립트를 양쪽에 적용
        fresh.input();
      }
      g.step(1 / 60);
      fresh.step(1 / 60);
    }
    expect(g.ballX).toBe(fresh.ballX);
    expect(g.ballY).toBe(fresh.ballY);
    expect(g.score).toBe(fresh.score);
    expect(g.points).toEqual(fresh.points);
  });

  it('should ignore non-finite or non-positive dt without corrupting state', () => {
    const g = new ZigzagGame(OPTS);
    g.input();
    g.step(1 / 60); // 정상 한 프레임
    const x = g.ballX;
    const y = g.ballY;

    for (const bad of [0, -1, NaN, Infinity, -Infinity]) {
      g.step(bad);
      expect(Number.isFinite(g.ballX)).toBe(true);
      expect(Number.isFinite(g.ballY)).toBe(true);
      expect(g.ballX).toBe(x); // 전진 없음(무시)
      expect(g.ballY).toBe(y);
      expect(g.status).toBe('running'); // NaN 경계검사로 몰래 죽거나 손상되지 않음
    }
  });

  it('should cap an oversized dt so a single step cannot hang or explode the path', () => {
    const g = new ZigzagGame(OPTS);
    g.input();
    g.step(1e9); // 과대 dt — 캡되어 유한 시간에 끝나고 상태가 유한해야 한다.
    expect(Number.isFinite(g.ballX)).toBe(true);
    expect(Number.isFinite(g.ballY)).toBe(true);
    expect(g.ballY).toBeGreaterThan(0);
    expect(g.ballY).toBeLessThan(200); // 한 프레임 상한(≈ speed*MAX_STEP) 이내로 전진
    expect(g.points.length).toBeLessThan(40); // 경로 폭주 없음
  });

  it('should keep the point window bounded (prunes points behind the ball)', () => {
    const g = new ZigzagGame(OPTS);
    g.input();
    playPerfectly(g, 1200); // 길게 진행
    expect(g.status).toBe('running');
    // 무한 성장 방지: 윈도우 크기는 앞/뒤 커버 범위에 비례해 작게 유지된다.
    expect(g.points.length).toBeLessThan(20);
    // 프루닝 후에도 공 위치의 길은 여전히 정의된다.
    expect(Number.isFinite(g.pathX(g.ballY))).toBe(true);
  });

  it('should be deterministic for the same seed (exact identical path + trajectory)', () => {
    const a = new ZigzagGame({ ...OPTS, seed: 9 });
    const b = new ZigzagGame({ ...OPTS, seed: 9 });
    a.input();
    b.input();
    playPerfectly(a, 240);
    playPerfectly(b, 240);
    expect(a.score).toBe(b.score);
    expect(a.ballX).toBe(b.ballX); // 반올림 없이 정확 비교(고정 timestep 순수 로직)
    expect(a.ballY).toBe(b.ballY);
    expect(a.status).toBe(b.status);
    expect(a.points).toEqual(b.points); // 폴리라인 전체 정확 일치
  });

  it('should produce different paths for different seeds', () => {
    const a = new ZigzagGame({ ...OPTS, seed: 1 });
    const b = new ZigzagGame({ ...OPTS, seed: 2 });
    // 코너 y 위치(세그먼트 길이)가 시드에 따라 달라진다.
    expect(a.points.map((p) => Math.round(p.y))).not.toEqual(b.points.map((p) => Math.round(p.y)));
  });
});
