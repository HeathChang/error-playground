/**
 * ChargeGame — 결정성/재현성·레드라인 규칙(핵심 메커닉은 game.test.ts).
 * 고정 seed로 레드라인 시퀀스·궤적이 정확히 재현되는지, 재시작이 RNG를 재시드하는지,
 * 그리고 레드라인이 항상 공정한 범위(항상 방출 가능)에 뽑히는지 검증한다. (docs/PLAN.md §5.5)
 */
import { describe, expect, it } from 'vitest';
import { ChargeGame } from './game';
import { OPTS, tracedDischarge } from './game.testkit';

describe('ChargeGame — 결정성/레드라인 규칙 (v2)', () => {
  it('should restore the exact fresh-start state on restart (re-seeds RNG for the same seed)', () => {
    const fresh = new ChargeGame({ ...OPTS, seed: 7 });

    const g = new ChargeGame({ ...OPTS, seed: 7 });
    g.input();
    for (let i = 0; i < 600 && g.status === 'running'; i += 1) g.step(1 / 60);
    expect(g.status).toBe('over');
    g.input(); // 재시작

    expect(g.charge).toBe(fresh.charge);
    expect(g.rate).toBe(fresh.rate);
    expect(g.redline).toBe(fresh.redline); // 같은 seed → 첫 레드라인 동일
    expect(g.score).toBe(fresh.score);
  });

  it('should reproduce the identical redline sequence + final state under the same inputs (same seed)', () => {
    const a = new ChargeGame({ ...OPTS, seed: 7 });
    const b = new ChargeGame({ ...OPTS, seed: 7 });
    a.input();
    b.input();
    const seqA = tracedDischarge(a, 900);
    const seqB = tracedDischarge(b, 900);

    expect(seqA.length).toBeGreaterThan(1); // 실제로 여러 번 방출했다
    expect(seqA).toEqual(seqB); // 반올림 없이 정확 비교(고정 timestep 순수 로직)
    expect(a.charge).toBe(b.charge);
    expect(a.score).toBe(b.score);
    expect(a.redline).toBe(b.redline);
    expect(a.rate).toBe(b.rate);
  });

  it('should produce a different redline sequence for different seeds', () => {
    const a = new ChargeGame({ ...OPTS, seed: 1 });
    const b = new ChargeGame({ ...OPTS, seed: 2 });
    a.input();
    b.input();
    expect(tracedDischarge(a, 900)).not.toEqual(tracedDischarge(b, 900));
  });

  it('should always pick a redline in the fair range so a safe discharge is always possible', () => {
    const g = new ChargeGame(OPTS);
    g.input();
    const redlines = tracedDischarge(g, 1500);
    expect(redlines.length).toBeGreaterThan(3);
    for (const r of redlines) {
      expect(r).toBeGreaterThanOrEqual(0.7); // REDLINE_MIN
      expect(r).toBeLessThan(0.97); // REDLINE_MAX (< 1.0 → 게이지 최상단 전에 항상 방출 여유)
    }
  });
});
