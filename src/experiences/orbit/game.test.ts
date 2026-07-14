import { describe, expect, it } from 'vitest';
import { OrbitGame, type OrbitOptions } from './game';

const OPTS: OrbitOptions = { width: 320, height: 200, seed: 42 };

describe('OrbitGame — 결정적 로직 (v2)', () => {
  it('starts in ready and does nothing until input()', () => {
    const g = new OrbitGame(OPTS);
    expect(g.status).toBe('ready');
    const a0 = g.angle;
    g.step(1);
    expect(g.angle).toBe(a0);
  });

  it('input() starts the game', () => {
    const g = new OrbitGame(OPTS);
    g.input();
    expect(g.status).toBe('running');
  });

  it('the dot orbits (angle grows) while running', () => {
    const g = new OrbitGame(OPTS);
    g.input();
    g.step(0.1);
    expect(g.angle).toBeGreaterThan(0);
  });

  it('input() toggles the lane while running', () => {
    const g = new OrbitGame(OPTS);
    g.input(); // start (lane 0)
    const before = g.dotLane;
    g.input(); // toggle
    expect(g.dotLane).toBe(before === 0 ? 1 : 0);
  });

  it('hits an obstacle on the same lane → game over', () => {
    const g = new OrbitGame(OPTS);
    g.input();
    g.obstacles = [{ angle: g.angle + 0.1, lane: g.dotLane, resolved: false }];
    let guard = 0;
    while (g.status === 'running' && guard < 60) {
      g.step(1 / 60);
      guard += 1;
    }
    expect(g.status).toBe('over');
  });

  it('passing an obstacle on the other lane scores', () => {
    const g = new OrbitGame(OPTS);
    g.input();
    const otherLane: 0 | 1 = g.dotLane === 0 ? 1 : 0;
    const obs = { angle: g.angle + 0.1, lane: otherLane, resolved: false };
    g.obstacles = [obs];
    const before = g.score;
    let guard = 0;
    while (!obs.resolved && g.status === 'running' && guard < 60) {
      g.step(1 / 60);
      guard += 1;
    }
    expect(obs.resolved).toBe(true);
    expect(g.score).toBe(before + 1);
    expect(g.status).toBe('running');
  });

  it('restarts cleanly from game over', () => {
    const g = new OrbitGame(OPTS);
    g.input();
    g.obstacles = [{ angle: g.angle + 0.05, lane: g.dotLane, resolved: false }];
    let guard = 0;
    while (g.status === 'running' && guard < 60) {
      g.step(1 / 60);
      guard += 1;
    }
    expect(g.status).toBe('over');
    g.input(); // 재시작
    expect(g.status).toBe('running');
    expect(g.score).toBe(0);
    expect(g.angle).toBe(0);
  });

  it('is deterministic for the same seed (obstacle lane sequence)', () => {
    const a = new OrbitGame({ ...OPTS, seed: 11 });
    const b = new OrbitGame({ ...OPTS, seed: 11 });
    expect(a.obstacles.map((o) => o.lane)).toEqual(b.obstacles.map((o) => o.lane));
  });
});
