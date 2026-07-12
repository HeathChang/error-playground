import { describe, expect, it } from 'vitest';
import { StackerGame, type StackerOptions } from './game';

const OPTS: StackerOptions = { width: 320, height: 200 };

describe('StackerGame — 결정적 로직 (v2)', () => {
  it('starts in ready with a base block and does nothing until input()', () => {
    const g = new StackerGame(OPTS);
    expect(g.status).toBe('ready');
    expect(g.placed).toHaveLength(1); // base
    const x0 = g.current.x;
    g.step(1);
    expect(g.current.x).toBe(x0);
  });

  it('input() starts the game', () => {
    const g = new StackerGame(OPTS);
    g.input();
    expect(g.status).toBe('running');
  });

  it('the current block moves and bounces within bounds', () => {
    const g = new StackerGame(OPTS);
    g.input();
    for (let i = 0; i < 600; i += 1) {
      g.step(1 / 60);
      expect(g.current.x).toBeGreaterThanOrEqual(0);
      expect(g.current.x + g.current.w).toBeLessThanOrEqual(g.width + 1e-6);
    }
  });

  it('perfect placement keeps the width and scores', () => {
    const g = new StackerGame(OPTS);
    g.input();
    const below = g.placed[g.placed.length - 1];
    g.current.x = below.x; // 완벽 정렬
    const w0 = g.current.w;
    g.input(); // 배치
    expect(g.score).toBe(1);
    expect(g.placed).toHaveLength(2);
    expect(g.placed[1].w).toBeCloseTo(w0, 5);
    expect(g.current.w).toBeCloseTo(w0, 5); // 다음 블록 폭 유지
  });

  it('partial overlap shrinks the block', () => {
    const g = new StackerGame(OPTS);
    g.input();
    const below = g.placed[g.placed.length - 1];
    g.current.x = below.x + 30; // 30px 어긋남
    g.input();
    expect(g.placed[1].w).toBeCloseTo(below.w - 30, 5);
  });

  it('no overlap ends the game', () => {
    const g = new StackerGame(OPTS);
    g.input();
    const below = g.placed[g.placed.length - 1];
    g.current.x = below.x + below.w + 5; // 완전히 벗어남
    g.current.w = 20;
    g.input();
    expect(g.status).toBe('over');
    expect(g.score).toBe(0);
  });

  it('restarts cleanly from game over', () => {
    const g = new StackerGame(OPTS);
    g.input();
    const below = g.placed[g.placed.length - 1];
    g.current.x = below.x + below.w + 5;
    g.input(); // miss → over
    expect(g.status).toBe('over');
    g.input(); // 재시작
    expect(g.status).toBe('running');
    expect(g.score).toBe(0);
    expect(g.placed).toHaveLength(1);
  });
});
