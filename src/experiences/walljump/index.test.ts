/**
 * walljump Experience — 실제 마운트/언마운트 라이프사이클 (jsdom).
 *
 * game.test.ts가 WallJumpGame 순수 상태 전이를 검증한다면, 여기서는 실제 배포 경로를 검증한다:
 * create() → gameMachine() → mountCanvas() → 입력 라우팅 → unmount()/destroy().
 * 공용 하네스(ctx/컨테이너/canvas 스텁/rAF)는 ../dom.testkit 로 분리했다.
 * docs/PLAN.md §15("게임 마운트·언마운트 스모크"), ruler/testing.md("mount/unmount 라이프사이클 · 누수 0").
 */
import { afterEach, describe, expect, it, vi } from 'vitest';
import { mount } from '../../core/mount';
import { captureRaf, makeCtx, mountedContainer, stubCanvas2d } from '../dom.testkit';
import { create } from './index';

afterEach(() => {
  document.body.innerHTML = '';
  vi.restoreAllMocks();
});

describe('walljump Experience — mount/unmount 라이프사이클 (v2)', () => {
  it('should mount an accessible canvas host (role=img + aria-live) into the container', () => {
    const container = mountedContainer();
    const exp = create();
    exp.mount(container, makeCtx().ctx);

    expect(container.querySelector('.ep-game')).not.toBeNull(); // 콘솔 host
    const canvas = container.querySelector('canvas');
    expect(canvas).not.toBeNull(); // 카트리지가 canvas.ts로 부착
    expect(canvas?.getAttribute('role')).toBe('img'); // a11y: 캔버스 정적 설명
    expect(canvas?.getAttribute('aria-label')).toBeTruthy();
    expect(container.querySelector('[aria-live]')).not.toBeNull(); // a11y: 점수/상태 라이브 영역

    exp.unmount();
  });

  it('should expose isSupported so the core keeps the fallback in canvas-less envs', () => {
    // jsdom은 getContext를 null로 스텁 → canvasSupported()===false → 코어가 폴백 유지 (docs/PLAN.md §5.4/§6.3)
    expect(create().isSupported?.()).toBe(false);
  });

  it('should route pointer input to the game and emit "start" on ready→running', () => {
    const container = mountedContainer();
    const { ctx, emit } = makeCtx();
    const exp = create();
    exp.mount(container, ctx);
    const host = container.querySelector('.ep-game') as HTMLElement;

    host.dispatchEvent(new Event('pointerdown'));
    expect(emit).toHaveBeenCalledWith({ type: 'start' });

    exp.unmount();
  });

  it('should route keyboard input (Space) to the game as well', () => {
    const container = mountedContainer();
    const { ctx, emit } = makeCtx();
    const exp = create();
    exp.mount(container, ctx);
    const host = container.querySelector('.ep-game') as HTMLElement;

    host.dispatchEvent(new KeyboardEvent('keydown', { code: 'Space' }));
    expect(emit).toHaveBeenCalledWith({ type: 'start' });

    exp.unmount();
  });

  it('should remove the canvas/host and cancel the loop + listeners on unmount (누수 0)', () => {
    const cancelSpy = vi.spyOn(globalThis, 'cancelAnimationFrame');
    const container = mountedContainer();
    const { ctx, emit } = makeCtx();
    const exp = create();
    exp.mount(container, ctx);
    const host = container.querySelector('.ep-game') as HTMLElement;

    host.dispatchEvent(new Event('pointerdown')); // 첫 입력 → 루프 시작
    expect(emit).toHaveBeenCalledWith({ type: 'start' });
    const callsBeforeUnmount = emit.mock.calls.length;

    exp.unmount();

    expect(container.querySelector('canvas')).toBeNull(); // 카트리지 canvas 제거
    expect(container.querySelector('.ep-game')).toBeNull(); // 콘솔 host 제거
    expect(cancelSpy).toHaveBeenCalled(); // rAF 루프 취소

    // 리스너 정리: 언마운트 후 입력은 더 이상 라우팅되지 않는다.
    host.dispatchEvent(new Event('pointerdown'));
    host.dispatchEvent(new KeyboardEvent('keydown', { code: 'Space' }));
    expect(emit.mock.calls.length).toBe(callsBeforeUnmount);
  });

  it('should mount/unmount repeatedly without leaking hosts', () => {
    const container = mountedContainer();
    for (let i = 0; i < 3; i += 1) {
      const exp = create();
      exp.mount(container, makeCtx().ctx);
      exp.unmount();
    }
    expect(container.querySelector('.ep-game')).toBeNull();
    expect(container.querySelector('canvas')).toBeNull();
    expect(container.childElementCount).toBe(0);
  });
});

describe('walljump Experience — 지원 환경(Canvas 2D) 렌더/루프 경로 (v2)', () => {
  it('should report isSupported()===true when a 2D context is available', () => {
    stubCanvas2d();
    expect(create().isSupported?.()).toBe(true);
  });

  it('should draw on mount, run the loop after input, and stop drawing after unmount', () => {
    const { draws } = stubCanvas2d();
    const raf = captureRaf();
    const cancelSpy = vi.spyOn(globalThis, 'cancelAnimationFrame');
    const container = mountedContainer();
    const { ctx, emit } = makeCtx();
    const exp = create();
    exp.mount(container, ctx);

    // 마운트 직후 초기 ready 화면이 실제 2D 컨텍스트에 그려진다(루프 시작 전).
    expect(container.querySelector('canvas')).not.toBeNull();
    expect(draws()).toBeGreaterThan(0);
    expect(raf.scheduled()).toBe(false); // reduced-motion 안전: 첫 입력 전엔 루프 미가동

    const host = container.querySelector('.ep-game') as HTMLElement;
    host.dispatchEvent(new Event('pointerdown')); // 첫 입력 → 게임 시작 + 루프 예약
    expect(emit).toHaveBeenCalledWith({ type: 'start' });
    expect(raf.scheduled()).toBe(true);

    // 프레임을 구동 → step/render가 실제로 돈다(그리기 호출 누적).
    const before = draws();
    raf.step(16);
    raf.step(200);
    expect(draws()).toBeGreaterThan(before);

    exp.unmount();
    expect(container.querySelector('canvas')).toBeNull();
    expect(container.querySelector('.ep-game')).toBeNull();
    expect(cancelSpy).toHaveBeenCalled();

    // 언마운트 후 남은 프레임 콜백이 다시 불려도 그리지 않는다(game=null 가드 · 누수 0).
    const afterUnmount = draws();
    raf.step(216);
    expect(draws()).toBe(afterUnmount);
  });

  it('should load and mount through the core deployment path (mount(el,{experience:"walljump"}))', async () => {
    stubCanvas2d();
    captureRaf();
    const events: string[] = [];
    const container = mountedContainer();
    const handle = mount(container, {
      experience: 'walljump',
      onEvent: (e) => events.push(e.type),
    });

    // load()는 비동기(동적 import) → canvas가 붙을 때까지 대기.
    await vi.waitFor(() => {
      expect(container.querySelector('.ep-experience canvas')).not.toBeNull();
    });
    expect(events).toContain('ready');

    const host = container.querySelector('.ep-game') as HTMLElement;
    host.dispatchEvent(new Event('pointerdown'));
    expect(events).toContain('start');

    handle.unmount();
    expect(container.querySelector('.ep-experience')).toBeNull();
    expect(container.querySelector('canvas')).toBeNull();
  });

  it('should keep the fallback (skip mount) through the core path when canvas is unsupported', async () => {
    // getContext 전역 null 스텁 그대로(canvasSupported()===false) → 코어는 마운트하지 않고 폴백 유지.
    const events: string[] = [];
    const container = mountedContainer();
    container.appendChild(document.createElement('h1')); // 모드 B: 기존 폴백 DOM
    const handle = mount(container, {
      experience: 'walljump',
      onEvent: (e) => events.push(e.type),
    });

    await vi.waitFor(() => {
      expect(events).toContain('ready');
    });
    expect(events).not.toContain('error'); // 미지원은 에러가 아님 (docs/PLAN.md §5.4/§6.3)
    expect(container.querySelector('canvas')).toBeNull();
    expect(container.querySelector('.ep-experience')).toBeNull();
    expect(container.querySelector('h1')).not.toBeNull(); // a11y 불변식: 폴백 유지

    handle.unmount();
  });
});
