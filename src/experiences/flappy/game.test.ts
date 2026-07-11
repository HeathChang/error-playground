import { describe, expect, it } from 'vitest';
import { FlappyGame, type FlappyOptions } from './game';

const OPTS: FlappyOptions = { width: 320, height: 200, seed: 42 };

function survive(game: FlappyGame, frames: number): void {
  // 바닥 사망을 막아 스폰/결정성을 관찰하기 위해 매 프레임 새를 중앙에 고정.
  for (let i = 0; i < frames; i += 1) {
    game.birdY = 100;
    game.vy = 0;
    game.step(1 / 60);
  }
}

describe('FlappyGame — 결정적 로직 (v2)', () => {
  it('starts in ready and does nothing until input()', () => {
    const g = new FlappyGame(OPTS);
    expect(g.status).toBe('ready');
    const y0 = g.birdY;
    g.step(1);
    expect(g.birdY).toBe(y0);
  });

  it('input() starts the game and the first flap lifts the bird', () => {
    const g = new FlappyGame(OPTS);
    const y0 = g.birdY;
    g.input();
    expect(g.status).toBe('running');
    g.step(1 / 60);
    expect(g.birdY).toBeLessThan(y0); // 위로 떠오름
  });

  it('falls to the ground and ends if never flapped again', () => {
    const g = new FlappyGame(OPTS);
    g.input();
    let guard = 0;
    while (g.status === 'running' && guard < 3000) {
      g.step(1 / 60);
      guard += 1;
    }
    expect(g.status).toBe('over');
  });

  it('spawns pipes over distance', () => {
    const g = new FlappyGame(OPTS);
    g.input();
    let guard = 0;
    while (g.pipes.length === 0 && guard < 400) {
      g.birdY = 100;
      g.vy = 0;
      g.step(1 / 60);
      guard += 1;
    }
    expect(g.pipes.length).toBeGreaterThan(0);
    expect(g.status).toBe('running');
  });

  it('scores when a pipe passes the bird', () => {
    const g = new FlappyGame(OPTS);
    g.input();
    g.pipes = [{ x: -100, gapY: 60, scored: false }]; // 이미 새 왼쪽을 지난 파이프
    const before = g.score;
    g.step(1 / 60);
    expect(g.score).toBe(before + 1);
    expect(g.status).toBe('running');
  });

  it('restarts cleanly from game over', () => {
    const g = new FlappyGame(OPTS);
    g.input();
    let guard = 0;
    while (g.status === 'running' && guard < 3000) {
      g.step(1 / 60);
      guard += 1;
    }
    expect(g.status).toBe('over');
    g.input();
    expect(g.status).toBe('running');
    expect(g.score).toBe(0);
    expect(g.pipes).toHaveLength(0);
  });

  it('is deterministic for the same seed', () => {
    const a = new FlappyGame({ ...OPTS, seed: 9 });
    const b = new FlappyGame({ ...OPTS, seed: 9 });
    a.input();
    b.input();
    survive(a, 120);
    survive(b, 120);
    expect(a.pipes.length).toBeGreaterThan(0);
    expect(a.pipes.map((p) => Math.round(p.gapY))).toEqual(b.pipes.map((p) => Math.round(p.gapY)));
  });
});
