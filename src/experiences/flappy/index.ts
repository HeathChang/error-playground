/**
 * flappy — 탭 날갯짓 게임 (게임 카트리지).
 * 루프·입력·이벤트는 공통 콘솔(gameMachine)이 담당. 여기선 FlappyGame·렌더를 Game으로 어댑트.
 */
import type { Experience } from '../../core/types';
import { gameMachine, type Game, type GameEnv } from '../machine';
import { FlappyGame } from './game';
import { render, type FlappyTheme } from './render';

function pickTheme(theme: 'light' | 'dark'): FlappyTheme {
  return theme === 'dark'
    ? { bg: '#0f172a', fg: '#f8fafc', accent: '#22c55e', muted: '#334155' }
    : { bg: '#e0f2fe', fg: '#0f172a', accent: '#22c55e', muted: '#94a3b8' };
}

function makeSeed(): number {
  const now = globalThis.performance?.now?.() ?? 1;
  return (Math.floor(now) ^ 0x27d4eb2f) >>> 0 || 1;
}

function canvasSupported(): boolean {
  try {
    const c = document.createElement('canvas');
    return typeof c.getContext === 'function' && !!c.getContext('2d');
  } catch {
    return false;
  }
}

function createFlappy(env: GameEnv): Game {
  const doc = env.host.ownerDocument;
  const canvas = doc.createElement('canvas');
  canvas.width = env.width;
  canvas.height = env.height;
  canvas.style.cssText = `display:block;width:100%;max-width:${env.width}px;border-radius:8px;touch-action:manipulation;`;
  env.host.appendChild(canvas);

  const context2d = canvas.getContext('2d');
  const game = new FlappyGame({ width: env.width, height: env.height, seed: makeSeed() });
  const theme = pickTheme(env.theme);

  return {
    get status() {
      return game.status;
    },
    get score() {
      return game.score;
    },
    input() {
      game.input();
    },
    step(dt) {
      game.step(dt);
    },
    render() {
      if (context2d) render(context2d, game, theme);
    },
    destroy() {
      canvas.remove();
    },
  };
}

/** 코어 로더가 호출하는 팩토리. */
export function create(): Experience {
  return gameMachine(createFlappy, canvasSupported);
}
