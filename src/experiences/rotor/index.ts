/**
 * rotor — 회전하는 바늘을 목표 섹터와 정렬해 탭하는 각도 정렬 게임 (게임 카트리지).
 * 루프·입력·이벤트는 공통 콘솔(gameMachine)이, 캔버스 배관은 canvas.ts가 담당.
 */
import type { Experience } from '../../core/types';
import { canvasSupported, makeSeed, mountCanvas, type CanvasTheme } from '../canvas';
import { gameMachine, type Game, type GameEnv } from '../machine';
import { RotorGame } from './game';
import { render } from './render';

function pickTheme(theme: 'light' | 'dark'): CanvasTheme {
  return theme === 'dark'
    ? { bg: '#0f172a', fg: '#f8fafc', accent: '#f472b6', muted: '#4c1d3d' }
    : { bg: '#fdf2f8', fg: '#0f172a', accent: '#db2777', muted: '#fbcfe8' };
}

function createRotor(env: GameEnv): Game {
  const { canvas, ctx } = mountCanvas(env);
  const game = new RotorGame({ width: env.width, height: env.height, seed: makeSeed(0xcc9e2d51) });
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
  return gameMachine(createRotor, canvasSupported);
}
