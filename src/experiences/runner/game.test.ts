import { describe, expect, it } from 'vitest';
import { RunnerGame, type RunnerOptions } from './game';

const OPTS: RunnerOptions = { width: 320, height: 200, seed: 42 };

function stepN(game: RunnerGame, n: number, dt = 1 / 60): void {
  for (let i = 0; i < n; i += 1) game.step(dt);
}

function runUntilOver(game: RunnerGame, maxSteps = 5000): number {
  let i = 0;
  while (game.status === 'running' && i < maxSteps) {
    game.step(1 / 60);
    i += 1;
  }
  return i;
}

describe('RunnerGame — 결정적 로직 (M2)', () => {
  it('starts in "ready" and does nothing until jump()', () => {
    const game = new RunnerGame(OPTS);
    expect(game.status).toBe('ready');
    const y0 = game.player.y;
    stepN(game, 10);
    expect(game.player.y).toBe(y0);
    expect(game.scoreValue).toBe(0);
  });

  it('jump() starts the game and lifts the player off the ground', () => {
    const game = new RunnerGame(OPTS);
    const ground = game.player.y;
    game.jump();
    expect(game.status).toBe('running');
    game.step(1 / 60);
    expect(game.player.y).toBeLessThan(ground); // 위로(y 감소)
  });

  it('gravity returns the player to the ground', () => {
    const game = new RunnerGame(OPTS);
    const ground = game.player.y;
    game.jump();
    stepN(game, 120); // ~2초
    expect(game.player.y).toBeCloseTo(ground, 0);
  });

  it('score increases while running', () => {
    const game = new RunnerGame(OPTS);
    game.jump();
    stepN(game, 60);
    expect(game.scoreValue).toBeGreaterThan(0);
  });

  it('spawns obstacles over time', () => {
    const game = new RunnerGame(OPTS);
    game.jump();
    stepN(game, 120);
    expect(game.obstacles.length).toBeGreaterThan(0);
  });

  it('speed ramps up over time', () => {
    const game = new RunnerGame(OPTS);
    game.jump();
    const v0 = game.currentSpeed;
    stepN(game, 300);
    expect(game.currentSpeed).toBeGreaterThan(v0);
  });

  it('ends in collision if the player never jumps again', () => {
    const game = new RunnerGame(OPTS);
    game.jump(); // 시작(첫 점프 후 착지)
    runUntilOver(game);
    expect(game.status).toBe('over');
  });

  it('restarts cleanly from game over', () => {
    const game = new RunnerGame(OPTS);
    game.jump();
    runUntilOver(game);
    expect(game.status).toBe('over');

    game.jump(); // 재시작
    expect(game.status).toBe('running');
    expect(game.scoreValue).toBe(0);
    expect(game.obstacles).toHaveLength(0);
  });

  it('is deterministic for the same seed', () => {
    const a = new RunnerGame({ ...OPTS, seed: 7 });
    const b = new RunnerGame({ ...OPTS, seed: 7 });
    a.jump();
    b.jump();
    stepN(a, 400);
    stepN(b, 400);
    expect(a.obstacles.map((o) => Math.round(o.x))).toEqual(b.obstacles.map((o) => Math.round(o.x)));
    expect(a.scoreValue).toBe(b.scoreValue);
  });
});
