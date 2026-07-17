/**
 * gravity — 탭 중력 반전 회피 게임 (게임 카트리지).
 * 루프·입력·이벤트는 공통 콘솔(gameMachine)이, 캔버스 배관은 canvas.ts가 담당.
 */
import type { Experience } from '../../core/types';
import { canvasSupported, makeSeed, mountCanvas, type CanvasTheme } from '../canvas';
import { gameMachine, type Game, type GameEnv } from '../machine';
import { GravityGame } from './game';
import { render } from './render';

function pickTheme(theme: 'light' | 'dark'): CanvasTheme {
  return theme === 'dark'
    ? { bg: '#0f172a', fg: '#f8fafc', accent: '#a78bfa', muted: '#334155' }
    : { bg: '#f5f3ff', fg: '#0f172a', accent: '#7c3aed', muted: '#c4b5fd' };
}

function createGravity(env: GameEnv): Game {
  const { canvas, ctx } = mountCanvas(env);
  const game = new GravityGame({ width: env.width, height: env.height, seed: makeSeed(0x5f356495) });
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
  return gameMachine(createGravity, canvasSupported);
}
