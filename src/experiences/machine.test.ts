import { afterEach, describe, expect, it, vi } from 'vitest';
import type { ExperienceContext } from '../core/types';
import { captureRaf } from './dom.testkit';
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
  vi.restoreAllMocks();
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

/** 상태/점수를 외부에서 몰아줄 수 있는 카트리지 스텁(라이브 영역 동적 갱신 검증용). */
function scriptedGame() {
  let status: GameStatus = 'ready';
  let score = 0;
  let dieNext = false;
  return {
    get status(): GameStatus {
      return status;
    },
    get score(): number {
      return score;
    },
    input(): void {
      if (status !== 'running') status = 'running';
    },
    step(): void {
      if (dieNext) {
        status = 'over';
        dieNext = false;
      }
    },
    render(): void {},
    destroy(): void {},
    setScore(v: number): void {
      score = v;
    },
    dieNextStep(): void {
      dieNext = true;
    },
  };
}

describe('gameMachine — 접근성(aria-live 상태/점수)', () => {
  function mountScripted() {
    const container = document.createElement('div');
    document.body.appendChild(container);
    const raf = captureRaf();
    const game = scriptedGame();
    const { ctx, emit } = makeCtx();
    gameMachine(() => game).mount(container, ctx);
    const host = container.querySelector('.ep-game') as HTMLElement;
    const live = container.querySelector('[aria-live]') as HTMLElement;
    return { raf, game, emit, host, live };
  }

  it('exposes a polite live region announcing the ready state on mount', () => {
    const { live } = mountScripted();
    expect(live).not.toBeNull();
    expect(live.getAttribute('aria-live')).toBe('polite');
    expect(live.textContent).toMatch(/준비/); // 캔버스 밖 텍스트 대체 (ruler/a11y.md)
  });

  it('announces game start after the first input', () => {
    const { host, live } = mountScripted();
    host.dispatchEvent(new Event('pointerdown'));
    expect(live.textContent).toMatch(/시작/);
  });

  it('announces score milestones and game over with the score', () => {
    const { host, raf, game, live, emit } = mountScripted();
    host.dispatchEvent(new Event('pointerdown')); // ready→running

    game.setScore(120);
    raf.step(16);
    raf.step(200); // 프레임 구동 → 100점 마일스톤 감지
    expect(emit).toHaveBeenCalledWith({ type: 'score', value: 100 });
    expect(live.textContent).toMatch(/100/);

    game.dieNextStep();
    raf.step(400); // running→over 전이가 이 프레임 안에서 일어난다
    expect(emit).toHaveBeenCalledWith({ type: 'gameover', score: 120 });
    expect(live.textContent).toMatch(/게임 오버/);
    expect(live.textContent).toContain('120');
  });

  it('re-fires the score milestone and re-announces it after a restart (재시작 회귀)', () => {
    const { host, raf, game, live, emit } = mountScripted();

    // 1) 첫 판: 100점 마일스톤 이벤트·공지.
    host.dispatchEvent(new Event('pointerdown')); // ready→running
    game.setScore(120);
    raf.step(16);
    raf.step(200);
    expect(emit).toHaveBeenCalledWith({ type: 'score', value: 100 });
    expect(live.textContent).toMatch(/100/);

    // 2) 게임 오버 → 입력으로 재시작(카트리지가 점수를 0으로 되돌리는 상황 시뮬).
    game.dieNextStep();
    raf.step(400); // running→over
    expect(emit).toHaveBeenCalledWith({ type: 'gameover', score: 120 });
    host.dispatchEvent(new Event('pointerdown')); // over→running(재시작)
    game.setScore(0);
    raf.step(600); // 프레임 → 점수 0이라 마일스톤 추적이 0으로 되감긴다

    // 3) 두 번째 판에서 다시 100점 → 이벤트·공지가 재발화해야 한다.
    //    (회귀 전엔 lastMilestone이 1로 남아 1>1이 거짓 → score 이벤트·aria-live 공지 누락)
    emit.mockClear();
    live.textContent = '';
    game.setScore(120);
    raf.step(800);
    raf.step(1000);
    expect(emit).toHaveBeenCalledWith({ type: 'score', value: 100 });
    expect(live.textContent).toMatch(/100/);
  });
});
