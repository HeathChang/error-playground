/**
 * WallJumpGame — 핵심 메커닉/상태 전이 + dt 방어(결정성/스폰 검증은 game.determinism.test.ts).
 */
import { describe, expect, it } from 'vitest';
import { WallJumpGame } from './game';
import { OPTS, autoClimb, flyUntilLanded } from './game.testkit';

describe('WallJumpGame — 핵심 메커닉 (v2)', () => {
  it('should start in ready and do nothing until input()', () => {
    const g = new WallJumpGame(OPTS);
    expect(g.status).toBe('ready');
    const y0 = g.worldY;
    g.step(1);
    expect(g.worldY).toBe(y0); // ready에서 step 무동작
    expect(g.status).toBe('ready');
  });

  it('should begin clung to the left wall (not airborne, not dead) on the first input()', () => {
    const g = new WallJumpGame(OPTS);
    g.input(); // ready→running
    expect(g.status).toBe('running');
    expect(g.airborne).toBe(false);
    expect(g.side).toBe('left');
    expect(g.x).toBe(g.clungX('left'));
  });

  it('should slide down the wall while clung and not moving horizontally', () => {
    const g = new WallJumpGame(OPTS);
    g.input();
    const y0 = g.worldY;
    const x0 = g.x;
    for (let i = 0; i < 10; i += 1) g.step(1 / 60);
    expect(g.worldY).toBeGreaterThan(y0); // 아래로 미끄러짐
    expect(g.x).toBe(x0); // 붙어 있으면 x 고정
    expect(g.airborne).toBe(false);
  });

  it('should kick to the opposite wall and climb (net upward) on input while clung', () => {
    const g = new WallJumpGame(OPTS);
    g.input(); // running, clung left
    g.input(); // 벽차기 → 오른쪽 벽으로
    expect(g.airborne).toBe(true);
    expect(g.side).toBe('right');

    const landed = flyUntilLanded(g);
    expect(landed).toBe('right');
    expect(g.airborne).toBe(false);
    expect(g.x).toBe(g.clungX('right'));
    expect(g.bestWorldY).toBeLessThan(0); // 한 번 차서 위로 올라감(worldY 감소)
  });

  it('should ignore taps while airborne (can only kick from a wall)', () => {
    const g = new WallJumpGame(OPTS);
    g.input(); // running
    g.input(); // kick → airborne, side=right
    expect(g.airborne).toBe(true);
    const side = g.side;
    const vy = g.vy;
    g.input(); // 공중 탭 → 무시
    expect(g.airborne).toBe(true);
    expect(g.side).toBe(side); // 방향 안 바뀜
    expect(g.vy).toBe(vy); // 임펄스 재적용 없음
  });

  it('should die by falling when the player never kicks (slides off the bottom)', () => {
    const g = new WallJumpGame(OPTS);
    g.input(); // running, 이후 탭 없음
    for (let i = 0; i < 300 && g.status === 'running'; i += 1) g.step(1 / 60);
    expect(g.status).toBe('over'); // 미끄러져 최고점 대비 fallLimit 초과 → 추락사
  });

  it('should climb and score when kicking on every landing', () => {
    const g = new WallJumpGame(OPTS);
    g.input();
    const maxScore = autoClimb(g, 240);
    expect(maxScore).toBeGreaterThan(0); // 여러 번 벽차기로 층수 증가
    expect(g.bestWorldY).toBeLessThan(0);
  });

  it('should be safe from a spike while airborne but die from it once clung', () => {
    const g = new WallJumpGame(OPTS);
    g.input(); // running
    g.input(); // kick → airborne, side=right
    expect(g.airborne).toBe(true);

    // 향하는 벽(right)의 현재 높이에 스파이크를 둔다. 공중에는 안 죽는다.
    g.spikes = [{ side: 'right', worldY: g.worldY }];
    g.step(1 / 60);
    expect(g.status).toBe('running'); // 공중 = 벽 사이 = 안전

    // 착지시키고 같은 높이의 스파이크를 붙은 벽에 두면 죽는다.
    flyUntilLanded(g);
    expect(g.airborne).toBe(false);
    g.spikes = [{ side: g.side, worldY: g.worldY }];
    g.step(1 / 60);
    expect(g.status).toBe('over');
  });

  it('should not die from a spike on the opposite wall', () => {
    const g = new WallJumpGame(OPTS);
    g.input(); // running, clung left
    g.spikes = [{ side: 'right', worldY: g.worldY }]; // 반대 벽 스파이크
    g.step(1 / 60);
    expect(g.status).toBe('running'); // 붙은 벽이 아니면 안전
  });

  it('should ignore non-finite or non-positive dt without corrupting state', () => {
    const g = new WallJumpGame(OPTS);
    g.input();
    g.step(1 / 60);
    const y = g.worldY;

    for (const bad of [0, -1, NaN, Infinity, -Infinity]) {
      g.step(bad);
      expect(Number.isFinite(g.worldY)).toBe(true);
      expect(g.worldY).toBe(y); // 전진 없음(무시)
      expect(g.status).toBe('running'); // 몰래 죽거나 손상되지 않음
    }
  });

  it('should cap an oversized dt so a single step cannot explode the position', () => {
    const g = new WallJumpGame(OPTS);
    g.input();
    g.input(); // kick → 공중(속도 큼)
    g.step(1e9); // 과대 dt — 캡되어 유한한 좌표만 남는다.
    expect(Number.isFinite(g.worldY)).toBe(true);
    expect(Number.isFinite(g.x)).toBe(true);
  });

  it('should restart cleanly from game over', () => {
    const g = new WallJumpGame(OPTS);
    g.input();
    for (let i = 0; i < 300 && g.status === 'running'; i += 1) g.step(1 / 60);
    expect(g.status).toBe('over');

    g.input(); // 재시작
    expect(g.status).toBe('running');
    expect(g.score).toBe(0);
    expect(g.worldY).toBe(0);
    expect(g.side).toBe('left');
    expect(g.airborne).toBe(false);
    expect(g.spikes).toHaveLength(0);
  });
});
