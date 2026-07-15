/**
 * rhythm — 노트 타이밍 탭 게임 (게임 카트리지).
 * 루프·입력·이벤트는 공통 콘솔(gameMachine)이, 캔버스 배관은 canvas.ts가 담당.
 */
import type { Experience } from '../../core/types';
import { canvasSupported, makeSeed, mountCanvas, type CanvasTheme } from '../canvas';
import { gameMachine, type Game, type GameEnv } from '../machine';
import { RhythmGame } from './game';
import { render } from './render';

function pickTheme(theme: 'light' | 'dark'): CanvasTheme {
  return theme === 'dark'
    ? { bg: '#0f172a', fg: '#f8fafc', accent: '#f472b6', muted: '#334155' }
    : { bg: '#f8fafc', fg: '#0f172a', accent: '#ec4899', muted: '#cbd5e1' };
}

function createRhythm(env: GameEnv): Game {
  const { canvas, ctx } = mountCanvas(env);
  const game = new RhythmGame({ width: env.width, height: env.height, seed: makeSeed(0x165667b1) });
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
      if (ctx) render(ctx, game, theme);
    },
    destroy() {
      canvas.remove();
    },
  };
}

/** 코어 로더가 호출하는 팩토리. */
export function create(): Experience {
  return gameMachine(createRhythm, canvasSupported);
}
