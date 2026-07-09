/**
 * runner — Canvas 2D 엔드리스 러너 (게임 카트리지).
 * 루프·입력·이벤트·수명주기는 공통 콘솔(gameMachine)이 담당하고,
 * 여기서는 게임 로직(RunnerGame)·렌더(render)를 Game 계약으로 어댑트만 한다.
 */
import type { Experience } from '../../core/types';
import { gameMachine, type Game, type GameEnv } from '../machine';
import { RunnerGame } from './game';
import { render, type RunnerTheme } from './render';

function pickTheme(theme: 'light' | 'dark'): RunnerTheme {
  return theme === 'dark'
    ? { bg: '#0f172a', fg: '#f8fafc', accent: '#38bdf8', muted: '#334155' }
    : { bg: '#f8fafc', fg: '#0f172a', accent: '#0ea5e9', muted: '#cbd5e1' };
}

function makeSeed(): number {
  const now = globalThis.performance?.now?.() ?? 1;
  return (Math.floor(now) ^ 0x9e3779b9) >>> 0 || 1;
}

function canvasSupported(): boolean {
  try {
    const c = document.createElement('canvas');
    return typeof c.getContext === 'function' && !!c.getContext('2d');
  } catch {
    return false;
  }
}

function createRunner(env: GameEnv): Game {
  const doc = env.host.ownerDocument;
  const canvas = doc.createElement('canvas');
  canvas.width = env.width;
  canvas.height = env.height;
  canvas.style.cssText = `display:block;width:100%;max-width:${env.width}px;border-radius:8px;touch-action:manipulation;`;
  env.host.appendChild(canvas);

  const context2d = canvas.getContext('2d');
  const game = new RunnerGame({ width: env.width, height: env.height, seed: makeSeed() });
  const theme = pickTheme(env.theme);

  return {
    get status() {
      return game.status;
    },
    get score() {
      return game.scoreValue;
    },
    input() {
      game.jump();
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
  return gameMachine(createRunner, canvasSupported);
}
