/**
 * timing Experience — 실제 마운트/언마운트 라이프사이클 (jsdom).
 *
 * game.test.ts가 TimingGame 순수 상태 전이를 검증한다면, 여기서는 실제 배포 경로를 검증한다:
 * create() → gameMachine() → mountCanvas() → 입력 라우팅 → unmount()/destroy().
 * docs/PLAN.md §15("게임 마운트·언마운트 스모크"), ruler/testing.md("mount/unmount 라이프사이클 · 누수 0").
 *
 * 참고: jsdom은 test-setup.ts에서 canvas getContext를 null로 스텁한다 → render는 스킵되지만
 * <canvas> 노드 부착·입력 배선·정리 경로는 실제로 실행된다(canvasSupported()는 false).
 */
import { afterEach, describe, expect, it, vi } from 'vitest';
import { mount } from '../../core/mount';
import type { ExperienceContext } from '../../core/types';
import { create } from './index';

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

function mountedContainer() {
  const container = document.createElement('div');
  document.body.appendChild(container);
  return container;
}

/**
 * "지원 환경(Canvas 2D)" 재현용 최소 컨텍스트 스텁.
 * test-setup.ts는 getContext를 전역 null로 막아 **미지원** 경로를 검증한다 → canvasSupported()===false.
 * 실제 배포 경로(지원 브라우저)를 검증하려면 이 스파이로 getContext가 진짜 2D 컨텍스트를 반환하게 만든다.
 * render.ts가 실제로 그리는지 확인하려고 fillRect/fillText 호출 수를 센다. (afterEach의 restoreAllMocks가 전역 스텁으로 복구)
 */
function stubCanvas2d(): { fillRect: number; fillText: number } {
  const calls = { fillRect: 0, fillText: 0 };
  const ctx = {
    fillStyle: '',
    font: '',
    textAlign: 'left' as CanvasTextAlign,
    textBaseline: 'alphabetic' as CanvasTextBaseline,
    fillRect: (): void => {
      calls.fillRect += 1;
    },
    fillText: (): void => {
      calls.fillText += 1;
    },
  };
  vi.spyOn(HTMLCanvasElement.prototype, 'getContext').mockReturnValue(
    ctx as unknown as CanvasRenderingContext2D,
  );
  return calls;
}

/** rAF 콜백을 캡처해 프레임을 결정적으로(실제 타이머 없이) 구동하는 훅을 설치한다. */
function captureRaf(): { step: (t: number) => void; scheduled: () => boolean } {
  let cb: FrameRequestCallback | null = null;
  vi.spyOn(globalThis, 'requestAnimationFrame').mockImplementation((fn: FrameRequestCallback): number => {
    cb = fn;
    return 1;
  });
  return {
    step: (t: number): void => cb?.(t),
    scheduled: (): boolean => cb !== null,
  };
}

afterEach(() => {
  document.body.innerHTML = '';
  vi.restoreAllMocks();
});

describe('timing Experience — mount/unmount 라이프사이클 (v2)', () => {
  it('should mount a canvas host into the container', () => {
    const container = mountedContainer();
    const exp = create();
    exp.mount(container, makeCtx().ctx);

    expect(container.querySelector('.ep-game')).not.toBeNull(); // 콘솔 host
    expect(container.querySelector('canvas')).not.toBeNull(); // 카트리지가 canvas.ts로 부착

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

    host.dispatchEvent(new Event('pointerdown')); // 첫 입력 → 루프 시작(rAF 예약)
    expect(emit).toHaveBeenCalledWith({ type: 'start' });
    const callsBeforeUnmount = emit.mock.calls.length;

    exp.unmount();

    expect(container.querySelector('canvas')).toBeNull(); // 카트리지 canvas 제거
    expect(container.querySelector('.ep-game')).toBeNull(); // 콘솔 host 제거
    expect(cancelSpy).toHaveBeenCalled(); // rAF 루프 취소

    // 리스너 정리: 언마운트 후 입력은 더 이상 라우팅되지 않는다(추가 emit 없음).
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

describe('timing Experience — 지원 환경(Canvas 2D) 렌더/루프 경로 (v2)', () => {
  it('should report isSupported()===true when a 2D context is available', () => {
    stubCanvas2d(); // 지원 환경 재현 → canvasSupported()===true
    expect(create().isSupported?.()).toBe(true);
  });

  it('should draw to the 2D context on mount, run the loop after input, and stop drawing after unmount', () => {
    const calls = stubCanvas2d();
    const raf = captureRaf();
    const cancelSpy = vi.spyOn(globalThis, 'cancelAnimationFrame');
    const container = mountedContainer();
    const { ctx, emit } = makeCtx();
    const exp = create();
    exp.mount(container, ctx);

    // 마운트 직후 초기 ready 화면이 실제 2D 컨텍스트에 그려진다(루프 시작 전).
    expect(container.querySelector('canvas')).not.toBeNull();
    expect(calls.fillRect + calls.fillText).toBeGreaterThan(0);
    expect(raf.scheduled()).toBe(false); // reduced-motion 안전: 첫 입력 전엔 루프 미가동

    const host = container.querySelector('.ep-game') as HTMLElement;
    host.dispatchEvent(new Event('pointerdown')); // 첫 입력 → 게임 시작 + 루프 예약
    expect(emit).toHaveBeenCalledWith({ type: 'start' });
    expect(raf.scheduled()).toBe(true);

    // 프레임을 구동 → step/render가 실제로 돈다(그리기 호출 누적).
    const before = calls.fillRect + calls.fillText;
    raf.step(16);
    raf.step(200); // 큰 dt로 여러 step 진행 후 render
    expect(calls.fillRect + calls.fillText).toBeGreaterThan(before);

    exp.unmount();
    expect(container.querySelector('canvas')).toBeNull();
    expect(container.querySelector('.ep-game')).toBeNull();
    expect(cancelSpy).toHaveBeenCalled(); // rAF 루프 취소

    // 언마운트 후 남은 프레임 콜백이 다시 불려도 그리지 않는다(game=null 가드 · 누수 0).
    const afterUnmount = calls.fillRect + calls.fillText;
    raf.step(216);
    expect(calls.fillRect + calls.fillText).toBe(afterUnmount);
  });

  it('should load and mount through the core deployment path (mount(el,{experience:"timing"}))', async () => {
    // 실제 배포 경로: 코어가 isSupported() 검사 + timing 청크 동적 import를 거쳐 마운트한다.
    stubCanvas2d();
    captureRaf();
    const events: string[] = [];
    const container = mountedContainer();
    const handle = mount(container, {
      experience: 'timing',
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
    expect(container.querySelector('.ep-experience')).toBeNull(); // 경험 호스트 제거
    expect(container.querySelector('canvas')).toBeNull();
  });

  it('should keep the fallback (skip mount) through the core path when canvas is unsupported', async () => {
    // getContext 전역 null 스텁 그대로(canvasSupported()===false) → 코어는 마운트하지 않고 폴백 유지.
    const events: string[] = [];
    const container = mountedContainer();
    container.appendChild(document.createElement('h1')); // 모드 B: 기존 폴백 DOM
    const handle = mount(container, {
      experience: 'timing',
      onEvent: (e) => events.push(e.type),
    });

    await vi.waitFor(() => {
      expect(events).toContain('ready');
    });
    // 미지원은 에러가 아니다 → error 이벤트 없이 경험 미마운트, 폴백 유지 (docs/PLAN.md §5.4/§6.3).
    expect(events).not.toContain('error');
    expect(container.querySelector('canvas')).toBeNull();
    expect(container.querySelector('.ep-experience')).toBeNull();
    expect(container.querySelector('h1')).not.toBeNull();

    handle.unmount();
  });
});
