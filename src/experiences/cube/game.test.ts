import { afterEach, describe, expect, it } from 'vitest';
import { CubeGame, FACES } from './game';
import { createCubeView } from './render';

const OPTS = { seed: 42 };

afterEach(() => {
  document.body.innerHTML = '';
  document.getElementById('ep-cube-style')?.remove();
});

describe('CubeGame — 결정적 로직 (v2)', () => {
  it('starts in ready and does nothing until input()', () => {
    const g = new CubeGame(OPTS);
    expect(g.status).toBe('ready');
    const a0 = g.angleY;
    g.step(1);
    expect(g.angleY).toBe(a0);
  });

  it('input() starts the game', () => {
    const g = new CubeGame(OPTS);
    g.input();
    expect(g.status).toBe('running');
  });

  it('rotates over time while running', () => {
    const g = new CubeGame(OPTS);
    g.input();
    g.step(1);
    expect(g.angleY).toBeGreaterThan(0);
  });

  it('frontFace cycles with angleY', () => {
    const g = new CubeGame(OPTS);
    g.angleY = 0;
    expect(g.frontFace()).toBe(0);
    g.angleY = 90;
    expect(g.frontFace()).toBe(1);
    g.angleY = 180;
    expect(g.frontFace()).toBe(2);
    g.angleY = 360;
    expect(g.frontFace()).toBe(0);
  });

  it('alignmentError is 0 at exact face angles', () => {
    const g = new CubeGame(OPTS);
    g.angleY = 180;
    expect(g.alignmentError()).toBeCloseTo(0, 5);
    g.angleY = 180 + 15;
    expect(g.alignmentError()).toBeCloseTo(15, 5);
  });

  it('scores when tapping the aligned target face', () => {
    const g = new CubeGame(OPTS);
    g.input(); // start
    g.angleY = g.target * 90; // 목표를 정면에 정렬
    const before = g.score;
    g.input(); // hit
    expect(g.score).toBeGreaterThan(before);
    expect(g.combo).toBe(1);
  });

  it('resets combo on a miss (wrong face)', () => {
    const g = new CubeGame(OPTS);
    g.input();
    g.angleY = ((g.target + 1) % FACES.length) * 90; // 목표 아닌 면이 정면
    const before = g.score;
    g.input(); // miss
    expect(g.score).toBe(before);
    expect(g.combo).toBe(0);
    expect(g.lastHit).toBe('miss');
  });

  it('ends when the timer runs out', () => {
    const g = new CubeGame({ seed: 1, duration: 0.5 });
    g.input();
    g.step(0.6);
    expect(g.status).toBe('over');
  });

  it('restarts from game over', () => {
    const g = new CubeGame({ seed: 1, duration: 0.2 });
    g.input();
    g.step(0.3);
    expect(g.status).toBe('over');
    g.input(); // 재시작
    expect(g.status).toBe('running');
    expect(g.score).toBe(0);
    expect(g.combo).toBe(0);
  });

  it('is deterministic for the same seed', () => {
    const a = new CubeGame({ seed: 7 });
    const b = new CubeGame({ seed: 7 });
    expect(a.target).toBe(b.target);
    a.input();
    b.input();
    a.angleY = a.target * 90;
    b.angleY = b.target * 90;
    a.input();
    b.input();
    expect(a.target).toBe(b.target); // 다음 목표도 동일
    expect(a.score).toBe(b.score);
  });
});

describe('cube 뷰 (CSS 3D) — 스모크', () => {
  it('renders 4 faces + hud and cleans up', () => {
    const host = document.createElement('div');
    document.body.appendChild(host);
    const view = createCubeView(host, 'light');
    view.update(new CubeGame(OPTS));
    expect(host.querySelectorAll('.ep-cube-face')).toHaveLength(4);
    expect(host.querySelector('.ep-cube-hud')?.textContent).toContain('점수');
    view.destroy();
    expect(host.querySelector('.ep-cube-wrap')).toBeNull();
  });
});
