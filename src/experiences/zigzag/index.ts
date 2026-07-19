/**
 * zigzag — 탭 좌우 토글로 굽잇길을 따라가는 경로 추적 게임 (게임 카트리지).
 * 루프·입력·이벤트는 공통 콘솔(gameMachine)이, 캔버스 배관은 canvas.ts가 담당.
 */
import type { Experience } from '../../core/types';
import { canvasSupported, makeSeed, mountCanvas, type CanvasTheme } from '../canvas';
import { gameMachine, type Game, type GameEnv } from '../machine';
import { ZigzagGame } from './game';
import { render } from './render';

function pickTheme(theme: 'light' | 'dark'): CanvasTheme {
  return theme === 'dark'
    ? { bg: '#0f172a', fg: '#f8fafc', accent: '#34d399', muted: '#134e4a' }
    : { bg: '#ecfdf5', fg: '#0f172a', accent: '#10b981', muted: '#a7f3d0' };
}

function createZigzag(env: GameEnv): Game {
  const { canvas, ctx } = mountCanvas(env);
  const game = new ZigzagGame({ width: env.width, height: env.height, seed: makeSeed(0x85ebca6b) });
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
  return gameMachine(createZigzag, canvasSupported);
}
