/**
 * ChargeGame — 핵심 메커닉/상태 전이 + dt 방어(결정성/레드라인 규칙은 game.determinism.test.ts).
 */
import { describe, expect, it } from 'vitest';
import { ChargeGame } from './game';
import { OPTS, autoDischarge, chargeTo } from './game.testkit';

describe('ChargeGame — 핵심 메커닉 (v2)', () => {
  it('should start in ready and do nothing until input()', () => {
    const g = new ChargeGame(OPTS);
    expect(g.status).toBe('ready');
    g.step(1);
    expect(g.charge).toBe(0); // ready에서 step 무동작
    expect(g.status).toBe('ready');
  });

  it('should begin charging from 0 with a redline in range on the first input()', () => {
    const g = new ChargeGame(OPTS);
    g.input(); // ready→running
    expect(g.status).toBe('running');
    expect(g.charge).toBe(0);
    expect(g.redline).toBeGreaterThanOrEqual(0.7);
    expect(g.redline).toBeLessThan(0.97);
  });

  it('should fill the gauge over time while running (monotonic up)', () => {
    const g = new ChargeGame(OPTS);
    g.input();
    const c0 = g.charge;
    for (let i = 0; i < 10; i += 1) g.step(1 / 60);
    expect(g.charge).toBeGreaterThan(c0);
  });

  it('should discharge on input while running below the redline (scores, resets, ramps rate)', () => {
    const g = new ChargeGame(OPTS);
    g.input(); // running
    chargeTo(g, g.redline * 0.8); // 레드라인 아래까지 충전
    const rateBefore = g.rate;
    const payout = g.payout;
    expect(payout).toBeGreaterThan(0);

    g.input(); // 방출
    expect(g.status).toBe('running'); // 방출은 죽지 않음
    expect(g.score).toBe(payout); // 방출 순간 charge에 비례한 점수
    expect(g.charge).toBe(0); // 게이지 리셋
    expect(g.rate).toBeGreaterThan(rateBefore); // 난이도 램프(가속)
  });

  it('should award more points for a higher (greedier) discharge', () => {
    const timid = new ChargeGame(OPTS);
    timid.input();
    chargeTo(timid, timid.redline * 0.4);
    timid.input();

    const greedy = new ChargeGame(OPTS);
    greedy.input();
    chargeTo(greedy, greedy.redline * 0.9);
    greedy.input();

    expect(greedy.score).toBeGreaterThan(timid.score); // 높이 채울수록 고득점
  });

  it('should overload (game over) if the player never discharges', () => {
    const g = new ChargeGame(OPTS);
    g.input(); // running, 이후 방출 없음
    for (let i = 0; i < 600 && g.status === 'running'; i += 1) g.step(1 / 60);
    expect(g.status).toBe('over'); // charge가 레드라인에 닿아 과충전
    expect(g.charge).toBe(g.redline); // 렌더가 레드라인에 딱 붙게 클램프
  });

  it('should treat a discharge at/over the redline as a failed overload (defensive)', () => {
    const g = new ChargeGame(OPTS);
    g.input(); // running
    g.charge = g.redline; // step 없이 레드라인에 도달한 경계 상황
    g.input();
    expect(g.status).toBe('over'); // 레드라인에서 방출은 실패
  });

  it('should keep climbing score across repeated safe discharges', () => {
    const g = new ChargeGame(OPTS);
    g.input();
    const maxScore = autoDischarge(g, 1200, 0.85);
    expect(maxScore).toBeGreaterThan(100); // 여러 번 방출로 점수 누적(마일스톤 넘김)
    expect(g.status).toBe('running'); // 안전 마진 플레이는 죽지 않는다
  });

  it('should ignore non-finite or non-positive dt without corrupting state', () => {
    const g = new ChargeGame(OPTS);
    g.input();
    g.step(1 / 60);
    const c = g.charge;

    for (const bad of [0, -1, NaN, Infinity, -Infinity]) {
      g.step(bad);
      expect(Number.isFinite(g.charge)).toBe(true);
      expect(g.charge).toBe(c); // 전진 없음(무시)
      expect(g.status).toBe('running'); // 몰래 죽거나 손상되지 않음
    }
  });

  it('should cap an oversized dt so a single step cannot explode the gauge', () => {
    const g = new ChargeGame(OPTS);
    g.input();
    g.step(1e9); // 과대 dt — 캡되어 게이지는 최대 redline까지만
    expect(Number.isFinite(g.charge)).toBe(true);
    expect(g.charge).toBeLessThanOrEqual(g.redline);
  });

  it('should restart cleanly from game over', () => {
    const g = new ChargeGame(OPTS);
    g.input();
    for (let i = 0; i < 600 && g.status === 'running'; i += 1) g.step(1 / 60);
    expect(g.status).toBe('over');

    g.input(); // 재시작
    expect(g.status).toBe('running');
    expect(g.score).toBe(0);
    expect(g.charge).toBe(0);
  });
});
