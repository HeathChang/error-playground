import { afterEach, describe, expect, it, vi } from 'vitest';
import type { ExperienceContext } from '../core/types';
import { gameMachine, type Game, type GameStatus } from './machine';

interface FakeGame extends Game {
  calls: { input: number; step: number; render: number; destroy: number };
}

function fakeGame(): FakeGame {
  let status: GameStatus = 'ready';
  const calls = { input: 0, step: 0, render: 0, destroy: 0 };
  return {
    calls,
    get status() {
      return status;
    },
    get score() {
      return 0;
    },
    input() {
      calls.input += 1;
      if (status === 'ready') status = 'running';
    },
    step() {
      calls.step += 1;
    },
    render() {
      calls.render += 1;
    },
    destroy() {
      calls.destroy += 1;
    },
  };
}

function makeCtx() {
  const emit = vi.fn();
  const ctx: ExperienceContext = {
    status: 404,
    reducedMotion: false,
    theme: 'light',
    locale: 'ko',
    emit,
    root: document.body,
  };
  return { ctx, emit };
}

afterEach(() => {
  document.body.innerHTML = '';
});

describe('gameMachine (게임 콘솔)', () => {
  it('mounts a host and renders the initial frame', () => {
    const container = document.createElement('div');
    document.body.appendChild(container);
    const game = fakeGame();
    gameMachine(() => game).mount(container, makeCtx().ctx);
    expect(container.querySelector('.ep-game')).not.toBeNull();
    expect(game.calls.render).toBeGreaterThanOrEqual(1);
    expect(game.calls.step).toBe(0); // 루프는 입력 전 시작 안 함
  });

  it('routes pointer input to game.input() and emits "start" on ready→running', () => {
    const container = document.createElement('div');
    document.body.appendChild(container);
    const game = fakeGame();
    const { ctx, emit } = makeCtx();
    gameMachine(() => game).mount(container, ctx);
    const host = container.querySelector('.ep-game') as HTMLElement;
    host.dispatchEvent(new Event('pointerdown'));
    expect(game.calls.input).toBe(1);
    expect(emit).toHaveBeenCalledWith({ type: 'start' });
  });

  it('unmount destroys the game and removes the host', () => {
    const container = document.createElement('div');
    document.body.appendChild(container);
    const game = fakeGame();
    const exp = gameMachine(() => game);
    exp.mount(container, makeCtx().ctx);
    exp.unmount();
    expect(game.calls.destroy).toBe(1);
    expect(container.querySelector('.ep-game')).toBeNull();
  });

  it('passes isSupported through', () => {
    expect(gameMachine(() => fakeGame(), () => false).isSupported?.()).toBe(false);
    expect(gameMachine(() => fakeGame(), () => true).isSupported?.()).toBe(true);
  });
});
