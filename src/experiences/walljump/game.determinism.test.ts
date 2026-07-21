/**
 * WallJumpGame — 결정성/재현성·스파이크 스폰 규칙(핵심 메커닉은 game.test.ts).
 * 고정 seed로 스파이크 시퀀스·궤적이 정확히 재현되는지, 재시작이 RNG를 재시드하는지,
 * 그리고 "한 altitude에 한쪽 벽만 스파이크"(솔벌빌리티)를 검증한다. (docs/PLAN.md §5.5)
 */
import { describe, expect, it } from 'vitest';
import { WallJumpGame, type Side } from './game';
import { OPTS, autoClimb } from './game.testkit';

describe('WallJumpGame — 결정성/스폰 규칙 (v2)', () => {
  it('should restore the exact fresh-start state on restart (re-seeds RNG for the same seed)', () => {
    // 재시작이 결정적임을 증명: 재시작 직후 필드 == 같은 seed로 새로 만든 게임의 시작 필드.
    const fresh = new WallJumpGame({ ...OPTS, seed: 7 });

    const g = new WallJumpGame({ ...OPTS, seed: 7 });
    g.input();
    for (let i = 0; i < 300 && g.status === 'running'; i += 1) g.step(1 / 60);
    expect(g.status).toBe('over');
    g.input(); // 재시작

    expect(g.worldY).toBe(fresh.worldY);
    expect(g.bestWorldY).toBe(fresh.bestWorldY);
    expect(g.side).toBe(fresh.side);
    expect(g.x).toBe(fresh.x);
    expect(g.score).toBe(fresh.score);
  });

  it('should reproduce the identical trajectory after restart under the same inputs (same seed)', () => {
    const fresh = new WallJumpGame({ ...OPTS, seed: 7 });
    const g = new WallJumpGame({ ...OPTS, seed: 7 });
    g.input();
    for (let i = 0; i < 300 && g.status === 'running'; i += 1) g.step(1 / 60);
    g.input(); // 재시작 → running

    fresh.input(); // ready→running: 양쪽 모두 running으로 정렬
    for (let i = 0; i < 400; i += 1) {
      // 동일한 조작 스크립트(붙으면 벽차기)를 양쪽에 적용.
      if (!g.airborne && g.status === 'running') g.input();
      if (!fresh.airborne && fresh.status === 'running') fresh.input();
      g.step(1 / 60);
      fresh.step(1 / 60);
    }
    expect(g.worldY).toBe(fresh.worldY);
    expect(g.bestWorldY).toBe(fresh.bestWorldY);
    expect(g.score).toBe(fresh.score);
    expect(g.side).toBe(fresh.side);
    expect(g.status).toBe(fresh.status);
    expect(g.spikes.map((s) => s.side)).toEqual(fresh.spikes.map((s) => s.side));
  });

  it('should be deterministic for the same seed (identical spike sequence + trajectory)', () => {
    const a = new WallJumpGame({ ...OPTS, seed: 9 });
    const b = new WallJumpGame({ ...OPTS, seed: 9 });
    a.input();
    b.input();
    autoClimb(a, 240);
    autoClimb(b, 240);
    expect(a.worldY).toBe(b.worldY); // 반올림 없이 정확 비교(고정 timestep 순수 로직)
    expect(a.score).toBe(b.score);
    expect(a.spikes.map((s) => `${s.side}@${s.worldY}`)).toEqual(
      b.spikes.map((s) => `${s.side}@${s.worldY}`),
    );
  });

  it('should produce a different spike sequence for different seeds', () => {
    const a = new WallJumpGame({ ...OPTS, seed: 1 });
    const b = new WallJumpGame({ ...OPTS, seed: 2 });
    a.input();
    b.input();
    autoClimb(a, 240);
    autoClimb(b, 240);
    // 시드가 다르면 스파이크 좌우 시퀀스가 갈라진다(코인플립 시퀀스라 전체 일치는 사실상 불가).
    expect(a.spikes.map((s) => s.side)).not.toEqual(b.spikes.map((s) => s.side));
  });

  it('should place at most one spike side per altitude so the opposite wall is always safe', () => {
    const g = new WallJumpGame(OPTS);
    g.input();
    autoClimb(g, 400);
    // 같은 worldY에 좌·우 스파이크가 동시에 놓이지 않는다 → 항상 반대 벽으로 피할 수 있다.
    const byY = new Map<number, Set<Side>>();
    for (const s of g.spikes) {
      const set = byY.get(s.worldY) ?? new Set<Side>();
      set.add(s.side);
      byY.set(s.worldY, set);
    }
    for (const set of byY.values()) expect(set.size).toBe(1);
  });
});
