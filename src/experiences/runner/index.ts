/**
 * runner — Canvas 2D 엔드리스 러너 (게임 카트리지).
 * 루프·입력·이벤트는 공통 콘솔(gameMachine)이 담당하고, 캔버스 배관은 canvas.ts가 담당한다.
 */
import type { Experience } from '../../core/types';
import { canvasSupported, makeSeed, mountCanvas, type CanvasTheme } from '../canvas';
import { gameMachine, type Game, type GameEnv } from '../machine';
import { RunnerGame } from './game';
import { render } from './render';

function pickTheme(theme: 'light' | 'dark'): CanvasTheme {
  return theme === 'dark'
    ? { bg: '#0f172a', fg: '#f8fafc', accent: '#38bdf8', muted: '#334155' }
    : { bg: '#f8fafc', fg: '#0f172a', accent: '#0ea5e9', muted: '#cbd5e1' };
}

function createRunner(env: GameEnv): Game {
  const { canvas, ctx } = mountCanvas(env);
  const game = new RunnerGame({ width: env.width, height: env.height, seed: makeSeed(0x9e3779b9) });
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
      if (ctx) render(ctx, game, theme);
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
