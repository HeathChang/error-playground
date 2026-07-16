/**
 * gameMachine — "게임 콘솔". 게임 카트리지(Game)를 꽂아 구동하는 공통 셸.
 *
 * 콘솔이 공통으로 담당:
 *  - 고정 timestep 게임 루프 (rAF)
 *  - 입력 라우팅 (스페이스/↑/포인터 → game.input())
 *  - 라이프사이클 이벤트 emit (start / score / gameover)
 *  - reduced-motion 안전: 루프는 첫 입력(opt-in) 후 시작
 *  - **반응형 사이징**: 컨테이너를 채우고, 게임은 캡 크기로 가운데 정렬. 리사이즈 시 재생성(ResizeObserver)
 *  - 마운트/언마운트 정리
 */
import type { Experience, ExperienceContext } from '../core/types';

export type GameStatus = 'ready' | 'running' | 'over';

/** 콘솔이 카트리지에 제공하는 환경. */
export interface GameEnv {
  host: HTMLElement;
  theme: 'light' | 'dark';
  reducedMotion: boolean;
  width: number;
  height: number;
}

/** 게임 카트리지 계약. */
export interface Game {
  readonly status: GameStatus;
  readonly score: number;
  input(): void;
  step(dt: number): void;
  render(): void;
  destroy(): void;
}

export type GameFactory = (env: GameEnv) => Game;

const STEP = 1 / 60;
const MAX_FRAME = 0.25;
const MIN_W = 240;
const MAX_W = 560;
const MIN_H = 160;
const MAX_H = 340;
const DEFAULT_H = 220; // 컨테이너 높이가 0(auto collapse)일 때

const clamp = (v: number, min: number, max: number): number => Math.max(min, Math.min(max, v));

/** 호스트 박스에서 게임 캔버스 논리 크기를 계산(캡 적용). */
function measure(host: HTMLElement): { width: number; height: number } {
  const width = clamp(host.clientWidth || 320, MIN_W, MAX_W);
  const ch = host.clientHeight;
  const height = ch > 0 ? clamp(ch, MIN_H, MAX_H) : DEFAULT_H;
  return { width, height };
}

export function gameMachine(factory: GameFactory, isSupported?: () => boolean): Experience {
  let rafId = 0;
  let host: HTMLElement | null = null;
  let game: Game | null = null;
  const cleanups: Array<() => void> = [];

  return {
    isSupported,

    mount(container: HTMLElement, ctx: ExperienceContext): void {
      const doc = container.ownerDocument;
      const bg = ctx.theme === 'dark' ? '#0f172a' : '#f8fafc';

      const h = doc.createElement('div');
      h.className = 'ep-game';
      h.tabIndex = 0;
      h.setAttribute('role', 'application');
      h.setAttribute('aria-label', '미니 게임 — 스페이스 또는 탭으로 조작');
      // 컨테이너를 채우고 캔버스를 가운데 정렬. 배경으로 폴백을 완전히 덮는다.
      h.style.cssText = `width:100%;height:100%;display:flex;align-items:center;justify-content:center;outline:none;background:${bg};`;
      container.appendChild(h);
      host = h;

      let started = false;
      let last = 0;
      let acc = 0;
      let lastMilestone = 0;

      const build = (): void => {
        const { width, height } = measure(h);
        game = factory({ host: h, theme: ctx.theme, reducedMotion: ctx.reducedMotion, width, height });
        lastMilestone = 0;
      };

      const frame = (t: number): void => {
        if (!game) return;
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
        game.render();

        const milestone = Math.floor(game.score / 100);
        if (milestone > lastMilestone) {
          lastMilestone = milestone;
          ctx.emit({ type: 'score', value: milestone * 100 });
        }
        if (prev === 'running' && game.status === 'over') {
          ctx.emit({ type: 'gameover', score: game.score });
        }

        rafId = requestAnimationFrame(frame);
      };

      const ensureLoop = (): void => {
        if (started) return;
        started = true;
        last = 0;
        rafId = requestAnimationFrame(frame);
      };

      const onInput = (): void => {
        if (!game) return;
        const wasRunning = game.status === 'running';
        game.input();
        if (!wasRunning && game.status === 'running') ctx.emit({ type: 'start' });
        ensureLoop();
      };
      const onKey = (e: KeyboardEvent): void => {
        if (e.code === 'Space' || e.code === 'ArrowUp') {
          e.preventDefault();
          onInput();
        }
      };

      h.addEventListener('keydown', onKey);
      h.addEventListener('pointerdown', onInput);
      cleanups.push(
        () => h.removeEventListener('keydown', onKey),
        () => h.removeEventListener('pointerdown', onInput),
      );

      build();
      game?.render(); // 초기 ready 화면; 루프는 첫 입력에 시작 → reduced-motion 안전.

      // 반응형: 컨테이너 크기가 바뀌면 새 크기로 게임을 재생성(디바운스).
      // ResizeObserver 미지원 환경(jsdom 등)에선 초기 크기로만 동작.
      if (typeof ResizeObserver !== 'undefined') {
        let resizeTimer = 0;
        let cur = measure(h);
        const ro = new ResizeObserver(() => {
          if (resizeTimer) clearTimeout(resizeTimer);
          resizeTimer = setTimeout(() => {
            const next = measure(h);
            if (Math.abs(next.width - cur.width) > 4 || Math.abs(next.height - cur.height) > 4) {
              cur = next;
              game?.destroy();
              build();
              game?.render();
            }
          }, 200);
        });
        ro.observe(container);
        cleanups.push(() => {
          if (resizeTimer) clearTimeout(resizeTimer);
          ro.disconnect();
        });
      }
    },

    unmount(): void {
      if (rafId) cancelAnimationFrame(rafId);
      rafId = 0;
      for (const fn of cleanups) fn();
      cleanups.length = 0;
      game?.destroy();
      game = null;
      host?.remove();
      host = null;
    },
  };
}
