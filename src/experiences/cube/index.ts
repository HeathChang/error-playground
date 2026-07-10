/**
 * cube — CSS 3D 큐브 탭 게임 (게임 카트리지).
 * 루프·입력·이벤트는 공통 콘솔(gameMachine)이 담당. 여기선 CubeGame·뷰를 Game으로 어댑트.
 */
import type { Experience } from '../../core/types';
import { gameMachine, type Game, type GameEnv } from '../machine';
import { CubeGame } from './game';
import { createCubeView } from './render';

function makeSeed(): number {
  const now = globalThis.performance?.now?.() ?? 1;
  return (Math.floor(now) ^ 0x85ebca6b) >>> 0 || 1;
}

function cubeSupported(): boolean {
  if (typeof document === 'undefined') return false;
  if (typeof CSS !== 'undefined' && typeof CSS.supports === 'function') {
    return (
      CSS.supports('transform-style', 'preserve-3d') ||
      CSS.supports('-webkit-transform-style', 'preserve-3d')
    );
  }
  return true; // CSS.supports 미제공 환경은 낙관적 가정
}

function createCube(env: GameEnv): Game {
  const game = new CubeGame({ seed: makeSeed() });
  const view = createCubeView(env.host, env.theme);
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
      view.update(game);
    },
    destroy() {
      view.destroy();
    },
  };
}

/** 코어 로더가 호출하는 팩토리. */
export function create(): Experience {
  return gameMachine(createCube, cubeSupported);
}
