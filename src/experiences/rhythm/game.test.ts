import { describe, expect, it } from 'vitest';
import { RhythmGame, type RhythmOptions } from './game';

const OPTS: RhythmOptions = { width: 320, height: 200, seed: 42 };

describe('RhythmGame — 결정적 로직 (v2)', () => {
  it('starts in ready and does nothing until input()', () => {
    const g = new RhythmGame(OPTS);
    expect(g.status).toBe('ready');
    g.notes = [{ y: 0, judged: false }];
    g.step(1);
    expect(g.notes[0].y).toBe(0); // ready면 진행 안 함
  });

  it('input() starts the game', () => {
    const g = new RhythmGame(OPTS);
    g.input();
    expect(g.status).toBe('running');
  });

  it('spawns notes over time', () => {
    const g = new RhythmGame(OPTS);
    g.input();
    for (let i = 0; i < 120; i += 1) g.step(1 / 60);
    expect(g.notes.length).toBeGreaterThan(0);
  });

  it('scores a perfect when tapping a note on the line', () => {
    const g = new RhythmGame(OPTS);
    g.input();
    g.notes = [{ y: g.lineY, judged: false }];
    g.input();
    expect(g.lastJudge).toBe('perfect');
    expect(g.score).toBeGreaterThan(0);
    expect(g.combo).toBe(1);
  });

  it('mistap (no note near) resets combo but costs no life', () => {
    const g = new RhythmGame(OPTS);
    g.input();
    g.notes = [{ y: g.lineY - 200, judged: false }]; // 아직 멀리 있음
    const lives0 = g.lives;
    const score0 = g.score;
    g.input();
    expect(g.lastJudge).toBe('miss');
    expect(g.combo).toBe(0);
    expect(g.lives).toBe(lives0);
    expect(g.score).toBe(score0);
  });

  it('missing a passed note costs a life and breaks combo', () => {
    const g = new RhythmGame(OPTS);
    g.input();
    g.notes = [{ y: g.lineY, judged: false }];
    g.step(0.5); // 노트가 판정선을 크게 지나침 → 놓침
    expect(g.lives).toBe(2);
    expect(g.combo).toBe(0);
  });

  it('ends after losing all lives', () => {
    const g = new RhythmGame(OPTS);
    g.input();
    for (let k = 0; k < 3; k += 1) {
      g.notes = [{ y: g.lineY, judged: false }];
      g.step(0.5);
    }
    expect(g.status).toBe('over');
  });

  it('restarts cleanly from game over', () => {
    const g = new RhythmGame(OPTS);
    g.input();
    for (let k = 0; k < 3; k += 1) {
      g.notes = [{ y: g.lineY, judged: false }];
      g.step(0.5);
    }
    expect(g.status).toBe('over');
    g.input(); // 재시작
    expect(g.status).toBe('running');
    expect(g.score).toBe(0);
    expect(g.lives).toBe(3);
    expect(g.notes).toHaveLength(0);
  });

  it('is deterministic for the same seed', () => {
    const a = new RhythmGame({ ...OPTS, seed: 8 });
    const b = new RhythmGame({ ...OPTS, seed: 8 });
    a.input();
    b.input();
    for (let i = 0; i < 90; i += 1) {
      a.step(1 / 60);
      b.step(1 / 60);
    }
    expect(a.notes.map((n) => Math.round(n.y))).toEqual(b.notes.map((n) => Math.round(n.y)));
    expect(a.lives).toBe(b.lives);
  });
});
