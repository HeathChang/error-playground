import { describe, expect, it } from 'vitest';
import { RotorGame, ROTOR_GEO, type RotorOptions } from './game';

const OPTS: RotorOptions = { width: 320, height: 200, seed: 42 };
const { TAU } = ROTOR_GEO;

/** 정렬될 때까지 프레임을 진행(탭 없이). 정렬 프레임에 도달하면 true. */
function stepUntilAligned(g: RotorGame, maxFrames = 3000): boolean {
  for (let i = 0; i < maxFrames; i += 1) {
    if (g.aligned) return true;
    g.step(1 / 60);
  }
  return false;
}

/**
 * 공개 입력 API(input())만으로 정렬 순간에만 탭하는 "완벽 플레이".
 * 상태를 우회 조작하지 않고 aligned 게터가 true일 때만 탭 → 실제 사용자 조작 경로를 그대로 검증한다.
 */
function playPerfectly(g: RotorGame, frames: number): void {
  for (let i = 0; i < frames; i += 1) {
    if (g.aligned) g.input(); // 정렬 순간에만 탭(득점)
    g.step(1 / 60);
    if (g.status === 'over') return;
  }
}

describe('RotorGame — 결정적 로직 (v2)', () => {
  it('should start in ready and do nothing until input()', () => {
    const g = new RotorGame(OPTS);
    expect(g.status).toBe('ready');
    const a0 = g.angle;
    g.step(1);
    expect(g.angle).toBe(a0); // ready에서 step 무동작
    expect(g.status).toBe('ready');
  });

  it('should place the first target away from the needle (not aligned at running start)', () => {
    const g = new RotorGame(OPTS);
    g.input(); // ready→running
    expect(g.status).toBe('running');
    expect(g.aligned).toBe(false); // 시작하자마자 정렬돼 즉시 득점/즉사하지 않는다
  });

  it('should rotate the needle forward while running and keep the angle normalized', () => {
    const g = new RotorGame(OPTS);
    g.input();
    for (let i = 0; i < 600; i += 1) {
      g.step(1 / 60);
      expect(g.angle).toBeGreaterThanOrEqual(0);
      expect(g.angle).toBeLessThan(TAU); // 항상 [0, TAU)
    }
    expect(g.status).toBe('running'); // 탭하지 않으면 죽지 않고 계속 회전
  });

  it('should score and ramp difficulty when tapping while aligned', () => {
    const g = new RotorGame(OPTS);
    g.input(); // running
    const arc0 = g.arc;
    const speed0 = g.speed;
    expect(stepUntilAligned(g)).toBe(true);

    g.input(); // 정렬된 채 탭 → 성공
    expect(g.score).toBe(1);
    expect(g.status).toBe('running');
    expect(g.arc).toBeLessThan(arc0); // 섹터가 좁아짐
    expect(g.speed).toBeGreaterThan(speed0); // 가속
    expect(g.aligned).toBe(false); // 목표가 새 위치로 이동 → 즉시 재히트 불가
  });

  it('should die when tapping while not aligned', () => {
    const g = new RotorGame(OPTS);
    g.input(); // running (시작 시 정렬 아님)
    expect(g.aligned).toBe(false);
    g.input(); // 벗어난 채 탭 → 게임오버
    expect(g.status).toBe('over');
  });

  it('should survive and score repeatedly when tapping only on alignment', () => {
    const g = new RotorGame(OPTS);
    g.input();
    playPerfectly(g, 900); // ~15초 — 공개 입력 API만으로 반복 정렬
    expect(g.status).toBe('running');
    expect(g.score).toBeGreaterThan(3); // 여러 번 성공
  });

  it('should keep the target sector width above zero as difficulty ramps', () => {
    const g = new RotorGame(OPTS);
    g.input();
    playPerfectly(g, 1500);
    expect(g.arc).toBeGreaterThan(0); // ARC_MIN 하한이 지켜져 게임이 결국 불가능해지지 않음
  });

  it('should restart cleanly from game over', () => {
    const g = new RotorGame(OPTS);
    g.input();
    g.input(); // 정렬 아닌 채 탭 → over
    expect(g.status).toBe('over');

    g.input(); // 재시작
    expect(g.status).toBe('running');
    expect(g.score).toBe(0);
    expect(g.angle).toBe(0);
    expect(g.dir).toBe(1);
  });

  it('should restore the exact fresh-start state on restart (re-seeds RNG for the same seed)', () => {
    // 재시작이 결정적임을 증명: 재시작 직후 필드 == 같은 seed로 새로 만든 게임의 시작 필드.
    // (재시작이 RNG를 다시 시드하지 않으면 targetAngle이 어긋나 이 테스트가 실패한다 — 회귀 가드.)
    const fresh = new RotorGame({ ...OPTS, seed: 7 });

    const g = new RotorGame({ ...OPTS, seed: 7 });
    g.input();
    g.input(); // over
    expect(g.status).toBe('over');
    g.input(); // 재시작

    expect(g.targetAngle).toBe(fresh.targetAngle);
    expect(g.angle).toBe(fresh.angle);
    expect(g.arc).toBe(fresh.arc);
    expect(g.speed).toBe(fresh.speed);
    expect(g.dir).toBe(fresh.dir);
    expect(g.score).toBe(fresh.score);
  });

  it('should reproduce the identical trajectory after restart under the same inputs (same seed)', () => {
    const fresh = new RotorGame({ ...OPTS, seed: 7 });
    const g = new RotorGame({ ...OPTS, seed: 7 });
    g.input();
    g.input(); // over
    g.input(); // 재시작 → running

    fresh.input(); // ready→running: 양쪽 모두 running으로 정렬
    for (let i = 0; i < 600; i += 1) {
      // 동일한 조작 스크립트(정렬 시에만 탭)를 양쪽에 적용.
      if (g.aligned) g.input();
      if (fresh.aligned) fresh.input();
      g.step(1 / 60);
      fresh.step(1 / 60);
    }
    expect(g.angle).toBe(fresh.angle);
    expect(g.targetAngle).toBe(fresh.targetAngle);
    expect(g.score).toBe(fresh.score);
    expect(g.speed).toBe(fresh.speed);
    expect(g.dir).toBe(fresh.dir);
  });

  it('should ignore non-finite or non-positive dt without corrupting state', () => {
    const g = new RotorGame(OPTS);
    g.input();
    g.step(1 / 60); // 정상 한 프레임
    const a = g.angle;

    for (const bad of [0, -1, NaN, Infinity, -Infinity]) {
      g.step(bad);
      expect(Number.isFinite(g.angle)).toBe(true);
      expect(g.angle).toBe(a); // 회전 없음(무시)
      expect(g.status).toBe('running'); // 몰래 죽거나 손상되지 않음
    }
  });

  it('should cap an oversized dt so a single step cannot explode the angle', () => {
    const g = new RotorGame(OPTS);
    g.input();
    g.step(1e9); // 과대 dt — 캡되어 유한하고 정규화된 각도만 남는다.
    expect(Number.isFinite(g.angle)).toBe(true);
    expect(g.angle).toBeGreaterThanOrEqual(0);
    expect(g.angle).toBeLessThan(TAU);
    expect(g.status).toBe('running');
  });

  it('should be deterministic for the same seed (exact identical trajectory + score)', () => {
    const a = new RotorGame({ ...OPTS, seed: 9 });
    const b = new RotorGame({ ...OPTS, seed: 9 });
    a.input();
    b.input();
    playPerfectly(a, 240);
    playPerfectly(b, 240);
    expect(a.score).toBe(b.score);
    expect(a.angle).toBe(b.angle); // 반올림 없이 정확 비교(고정 timestep 순수 로직)
    expect(a.targetAngle).toBe(b.targetAngle);
    expect(a.status).toBe(b.status);
  });

  it('should produce a different first target for different seeds', () => {
    const a = new RotorGame({ ...OPTS, seed: 1 });
    const b = new RotorGame({ ...OPTS, seed: 2 });
    expect(a.targetAngle).not.toBe(b.targetAngle); // 시드가 다르면 목표 시퀀스가 갈라진다
  });
});
