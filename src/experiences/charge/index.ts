/**
 * charge — 자동으로 차오르는 게이지를 레드라인(과충전) 전에 탭으로 방출해 고득점하는 게임 (게임 카트리지).
 * 루프·입력·이벤트는 공통 콘솔(gameMachine)이, 캔버스 배관은 canvas.ts가 담당.
 */
import type { Experience } from '../../core/types';
import { canvasSupported, makeSeed, mountCanvas, type CanvasTheme } from '../canvas';
import { gameMachine, type Game, type GameEnv } from '../machine';
import { ChargeGame } from './game';
import { render } from './render';

function pickTheme(theme: 'light' | 'dark'): CanvasTheme {
  return theme === 'dark'
    ? { bg: '#0f172a', fg: '#f8fafc', accent: '#38bdf8', muted: '#1e293b' }
    : { bg: '#f0f9ff', fg: '#0f172a', accent: '#0284c7', muted: '#e2e8f0' };
}

function createCharge(env: GameEnv): Game {
  const { canvas, ctx } = mountCanvas(env, {
    ko: '충전 게임 — 레드라인 전에 방출',
    en: 'Charge mini-game — discharge before the redline',
  });
  const game = new ChargeGame({ width: env.width, height: env.height, seed: makeSeed(0x3f1a9c7d) });
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
  return gameMachine(createCharge, canvasSupported);
}
