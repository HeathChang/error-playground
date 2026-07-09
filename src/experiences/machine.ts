/**
 * gameMachine — "게임 콘솔". 게임 카트리지(Game)를 꽂아 구동하는 공통 셸.
 *
 * 콘솔이 공통으로 담당:
 *  - 고정 timestep 게임 루프 (rAF)
 *  - 입력 라우팅 (스페이스/↑/포인터 → game.input())
 *  - 라이프사이클 이벤트 emit (start / score / gameover)
 *  - reduced-motion 안전: 루프는 첫 입력(opt-in) 후 시작
 *  - 마운트/언마운트 정리
 *
 * 카트리지(Game)는 게임별 로직·렌더만 구현 → 게임팩처럼 교체 가능.
 * (docs/PLAN.md §5.3 Experience 위에 얹은 게임 전용 추상화)
 */
import type { Experience, ExperienceContext } from '../core/types';

export type GameStatus = 'ready' | 'running' | 'over';

/** 콘솔이 카트리지에 제공하는 환경. */
export interface GameEnv {
  /** 게임이 그릴 컨테이너 (콘솔이 생성해 제공). */
  host: HTMLElement;
  theme: 'light' | 'dark';
  reducedMotion: boolean;
  width: number;
  height: number;
}

/** 게임 카트리지 계약. 콘솔이 이 메서드들을 구동한다. */
export interface Game {
  readonly status: GameStatus;
  readonly score: number;
  /** 사용자 입력(점프/탭). ready면 시작, over면 재시작, running이면 액션. */
  input(): void;
  /** 고정 timestep 진행. running이 아니면 no-op. status를 'over'로 바꿀 수 있다. */
  step(dt: number): void;
  /** 현재 상태 그리기(점수/오버레이 포함). */
  render(): void;
  /** 리소스 정리. */
  destroy(): void;
}

/** env를 받아 게임 카트리지를 생성. */
export type GameFactory = (env: GameEnv) => Game;

const STEP = 1 / 60; // 고정 timestep (결정적 진행)
const HEIGHT = 200;
const MAX_FRAME = 0.25; // 탭 비활성 등 큰 dt 클램프

/**
 * 게임 카트리지를 Experience로 감싼다.
 * @param factory 게임 생성 함수
 * @param isSupported 환경 지원 여부(예: 카트리지가 canvas 필요 시)
 */
export function gameMachine(factory: GameFactory, isSupported?: () => boolean): Experience {
  let rafId = 0;
  let host: HTMLElement | null = null;
  let game: Game | null = null;
  const cleanups: Array<() => void> = [];

  return {
    isSupported,

    mount(container: HTMLElement, ctx: ExperienceContext): void {
      const doc = container.ownerDocument;
      const width = Math.max(240, container.clientWidth || 320);

      const h = doc.createElement('div');
      h.className = 'ep-game';
      h.tabIndex = 0;
      h.setAttribute('role', 'application');
      h.setAttribute('aria-label', '미니 게임 — 스페이스 또는 탭으로 조작');
      h.style.cssText = `position:relative;width:100%;max-width:${width}px;outline:none;`;
      container.appendChild(h);
      host = h;

      const env: GameEnv = {
        host: h,
        theme: ctx.theme,
        reducedMotion: ctx.reducedMotion,
        width,
        height: HEIGHT,
      };
      const g = factory(env);
      game = g;

      let started = false;
      let last = 0;
      let acc = 0;
      let lastMilestone = 0;

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

      // 초기 ready 화면만 그리고 루프는 첫 입력에 시작 → reduced-motion 안전.
      g.render();
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
