import { describe, expect, it } from 'vitest';
import { GravityGame, GRAVITY_GEO, type GravityOptions } from './game';

const OPTS: GravityOptions = { width: 320, height: 200, seed: 42 };
const { PLAYER_X, PLAYER_R } = GRAVITY_GEO;

/** 중앙에 고정해 장애물 충돌 없이 스폰/결정성만 관찰(중앙은 어떤 장애물에도 안 닿음). */
function survive(game: GravityGame, frames: number): void {
  for (let i = 0; i < frames; i += 1) {
    game.playerY = OPTS.height / 2;
    game.vy = 0;
    game.step(1 / 60);
  }
}

describe('GravityGame — 결정적 로직 (v2)', () => {
  it('starts in ready and does nothing until input()', () => {
    const g = new GravityGame(OPTS);
    expect(g.status).toBe('ready');
    const y0 = g.playerY;
    g.step(1);
    expect(g.playerY).toBe(y0);
  });

  it('input() starts the game and the player begins falling downward', () => {
    const g = new GravityGame(OPTS);
    const y0 = g.playerY;
    g.input();
    expect(g.status).toBe('running');
    g.step(1 / 60);
    expect(g.playerY).toBeGreaterThan(y0); // 아래로 낙하
  });

  it('input() while running reverses gravity', () => {
    const g = new GravityGame(OPTS);
    g.input();
    g.step(1 / 60);
    const vyDown = g.vy;
    expect(vyDown).toBeGreaterThan(0);
    g.input(); // 반전
    expect(g.g).toBe(-1);
    g.step(1 / 60);
    expect(g.vy).toBeLessThan(vyDown); // 반대 방향으로 감속
  });

  it('dies when it hits an obstacle', () => {
    const g = new GravityGame(OPTS);
    g.input();
    g.playerY = OPTS.height / 2;
    g.obstacles = [{ x: PLAYER_X - 5, side: 'top', h: OPTS.height, scored: false }];
    g.step(1 / 60);
    expect(g.status).toBe('over');
  });

  it('scores when an obstacle passes the player', () => {
    const g = new GravityGame(OPTS);
    g.input();
    g.playerY = OPTS.height / 2;
    g.obstacles = [{ x: -100, side: 'top', h: 50, scored: false }];
    const before = g.score;
    g.step(1 / 60);
    expect(g.score).toBe(before + 1);
    expect(g.status).toBe('running');
  });

  it('restarts cleanly from game over', () => {
    const g = new GravityGame(OPTS);
    g.input();
    g.playerY = OPTS.height / 2;
    g.obstacles = [{ x: PLAYER_X - 5, side: 'top', h: OPTS.height, scored: false }];
    g.step(1 / 60);
    expect(g.status).toBe('over');
    g.input();
    expect(g.status).toBe('running');
    expect(g.score).toBe(0);
    expect(g.obstacles).toHaveLength(0);
  });

  it('resting on the ceiling or floor is safe (not death)', () => {
    const g = new GravityGame(OPTS);
    g.input();
    g.g = -1; // 위로
    for (let i = 0; i < 180; i += 1) {
      g.obstacles = [];
      g.step(1 / 60);
    }
    expect(g.status).toBe('running');
    expect(g.playerY).toBe(PLAYER_R);
    expect(g.vy).toBe(0);

    g.g = 1; // 아래로
    for (let i = 0; i < 180; i += 1) {
      g.obstacles = [];
      g.step(1 / 60);
    }
    expect(g.status).toBe('running');
    expect(g.playerY).toBe(OPTS.height - PLAYER_R);
    expect(g.vy).toBe(0);
  });

  it('is deterministic for the same seed', () => {
    const a = new GravityGame({ ...OPTS, seed: 9 });
    const b = new GravityGame({ ...OPTS, seed: 9 });
    a.input();
    b.input();
    survive(a, 240);
    survive(b, 240);
    expect(a.obstacles.length).toBeGreaterThan(0);
    expect(a.obstacles.map((o) => [o.side, Math.round(o.h)])).toEqual(
      b.obstacles.map((o) => [o.side, Math.round(o.h)]),
    );
  });
});
