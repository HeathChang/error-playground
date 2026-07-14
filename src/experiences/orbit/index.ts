/**
 * orbit — 방사형 2-레인 회피 게임 (게임 카트리지).
 * 루프·입력·이벤트는 공통 콘솔(gameMachine)이, 캔버스 배관은 canvas.ts가 담당.
 */
import type { Experience } from '../../core/types';
import { canvasSupported, makeSeed, mountCanvas, type CanvasTheme } from '../canvas';
import { gameMachine, type Game, type GameEnv } from '../machine';
import { OrbitGame } from './game';
import { render } from './render';

function pickTheme(theme: 'light' | 'dark'): CanvasTheme {
  return theme === 'dark'
    ? { bg: '#0f172a', fg: '#f8fafc', accent: '#a78bfa', muted: '#334155' }
    : { bg: '#f8fafc', fg: '#0f172a', accent: '#7c3aed', muted: '#cbd5e1' };
}

function createOrbit(env: GameEnv): Game {
  const { canvas, ctx } = mountCanvas(env);
  const game = new OrbitGame({ width: env.width, height: env.height, seed: makeSeed(0xc2b2ae35) });
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
  return gameMachine(createOrbit, canvasSupported);
}
