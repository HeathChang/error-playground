/**
 * timing — 좌우 스윕 마커를 목표 존에서 정밀 정지시키는 게임 (게임 카트리지).
 * 루프·입력·이벤트는 공통 콘솔(gameMachine)이, 캔버스 배관은 canvas.ts가 담당.
 */
import type { Experience } from '../../core/types';
import { canvasSupported, makeSeed, mountCanvas, type CanvasTheme } from '../canvas';
import { gameMachine, type Game, type GameEnv } from '../machine';
import { TimingGame } from './game';
import { render } from './render';

function pickTheme(theme: 'light' | 'dark'): CanvasTheme {
  return theme === 'dark'
    ? { bg: '#0f172a', fg: '#f8fafc', accent: '#34d399', muted: '#334155' }
    : { bg: '#ecfdf5', fg: '#0f172a', accent: '#059669', muted: '#a7f3d0' };
}

function createTiming(env: GameEnv): Game {
  const { canvas, ctx } = mountCanvas(env);
  const game = new TimingGame({ width: env.width, height: env.height, seed: makeSeed(0x7a1c9e3d) });
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
  return gameMachine(createTiming, canvasSupported);
}
