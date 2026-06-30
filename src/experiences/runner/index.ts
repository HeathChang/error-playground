/**
 * runner — Canvas 2D 엔드리스 러너 (M2 플래그십 경험).
 * 게임 로직(game.ts)·렌더(render.ts)를 묶어 입력·rAF 루프·접근성·정리를 담당한다.
 *
 * 접근성(ruler/a11y.md):
 *  - 루프는 첫 입력(opt-in)에 시작 → prefers-reduced-motion에서도 강제 모션 없음.
 *  - canvas는 부가물(role=img). 핵심 정보(에러·링크)는 폴백이 담당한다.
 */
import type { Experience, ExperienceContext } from '../../core/types';
import { RunnerGame } from './game';
import { render, type RunnerTheme } from './render';

const STEP = 1 / 60; // 고정 timestep (결정적 진행)
const HEIGHT = 200;
const MAX_FRAME = 0.25; // 탭 비활성 등으로 큰 dt가 들어올 때 클램프

function pickTheme(theme: 'light' | 'dark'): RunnerTheme {
  return theme === 'dark'
    ? { bg: '#0f172a', fg: '#f8fafc', accent: '#38bdf8', muted: '#334155' }
    : { bg: '#f8fafc', fg: '#0f172a', accent: '#0ea5e9', muted: '#cbd5e1' };
}

function makeSeed(): number {
  const now = globalThis.performance?.now?.() ?? 1;
  return (Math.floor(now) ^ 0x9e3779b9) >>> 0 || 1;
}

class RunnerExperience implements Experience {
  private rafId = 0;
  private canvas: HTMLCanvasElement | null = null;
  private cleanups: Array<() => void> = [];

  isSupported(): boolean {
    try {
      const c = document.createElement('canvas');
      return typeof c.getContext === 'function' && !!c.getContext('2d');
    } catch {
      return false;
    }
  }

  mount(container: HTMLElement, ctx: ExperienceContext): void {
    const doc = container.ownerDocument;
    const width = Math.max(240, container.clientWidth || 320);

    const canvas = doc.createElement('canvas');
    canvas.width = width;
    canvas.height = HEIGHT;
    canvas.style.cssText = `display:block;width:100%;max-width:${width}px;border-radius:8px;touch-action:manipulation;outline:none;`;
    canvas.tabIndex = 0;
    canvas.setAttribute('role', 'img');
    canvas.setAttribute('aria-label', '미니 러너 게임 — 스페이스 또는 탭으로 점프/시작');
    container.appendChild(canvas);
    this.canvas = canvas;

    const context2d = canvas.getContext('2d');
    if (!context2d) throw new Error('[runner] 2D 컨텍스트를 얻을 수 없습니다');

    const game = new RunnerGame({ width, height: HEIGHT, seed: makeSeed() });
    const theme = pickTheme(ctx.theme);

    let loopStarted = false;
    let last = 0;
    let acc = 0;
    let lastMilestone = 0;

    const frame = (t: number): void => {
      if (last === 0) last = t;
      let elapsed = (t - last) / 1000;
      if (elapsed > MAX_FRAME) elapsed = MAX_FRAME;
      last = t;
      acc += elapsed;

      const prev = game.status;
      while (acc >= STEP) {
        game.step(STEP);
        acc -= STEP;
      }
      render(context2d, game, theme);

      const milestone = Math.floor(game.scoreValue / 100);
      if (milestone > lastMilestone) {
        lastMilestone = milestone;
        ctx.emit({ type: 'score', value: milestone * 100 });
      }
      if (prev === 'running' && game.status === 'over') {
        ctx.emit({ type: 'gameover', score: game.scoreValue });
      }

      this.rafId = requestAnimationFrame(frame);
    };

    const ensureLoop = (): void => {
      if (loopStarted) return;
      loopStarted = true;
      last = 0;
      this.rafId = requestAnimationFrame(frame);
    };

    const onInput = (): void => {
      const wasRunning = game.status === 'running';
      game.jump();
      if (!wasRunning && game.status === 'running') ctx.emit({ type: 'start' });
      ensureLoop();
    };
    const onKey = (e: KeyboardEvent): void => {
      if (e.code === 'Space' || e.code === 'ArrowUp') {
        e.preventDefault();
        onInput();
      }
    };

    canvas.addEventListener('keydown', onKey);
    canvas.addEventListener('pointerdown', onInput);
    this.cleanups.push(
      () => canvas.removeEventListener('keydown', onKey),
      () => canvas.removeEventListener('pointerdown', onInput),
    );

    // 초기 ready 화면만 그리고 루프는 첫 입력에 시작(위 ensureLoop) — reduced-motion 안전.
    render(context2d, game, theme);
  }

  unmount(): void {
    if (this.rafId) cancelAnimationFrame(this.rafId);
    this.rafId = 0;
    for (const fn of this.cleanups) fn();
    this.cleanups = [];
    this.canvas?.remove();
    this.canvas = null;
  }
}

/** 코어 로더가 호출하는 팩토리. */
export function create(): Experience {
  return new RunnerExperience();
}
