/**
 * walljump — 한쪽 벽에 붙어 미끄러지다 탭으로 반대 벽으로 벽차기해 오르는 게임 (게임 카트리지).
 * 루프·입력·이벤트는 공통 콘솔(gameMachine)이, 캔버스 배관은 canvas.ts가 담당.
 */
import type { Experience } from '../../core/types';
import { canvasSupported, makeSeed, mountCanvas, type CanvasTheme } from '../canvas';
import { gameMachine, type Game, type GameEnv } from '../machine';
import { WallJumpGame } from './game';
import { render } from './render';

function pickTheme(theme: 'light' | 'dark'): CanvasTheme {
  return theme === 'dark'
    ? { bg: '#0f172a', fg: '#f8fafc', accent: '#fbbf24', muted: '#422006' }
    : { bg: '#fffbeb', fg: '#0f172a', accent: '#d97706', muted: '#fde68a' };
}

function createWallJump(env: GameEnv): Game {
  const { canvas, ctx } = mountCanvas(env);
  const game = new WallJumpGame({ width: env.width, height: env.height, seed: makeSeed(0x27d4eb2f) });
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
  return gameMachine(createWallJump, canvasSupported);
}
