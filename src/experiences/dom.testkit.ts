/**
 * 게임 Experience 마운트/언마운트 테스트 공용 하네스(jsdom).
 *
 * rotor·walljump·(향후 게임)의 index.test.ts가 중복 정의하던 ctx/컨테이너/canvas 스텁/rAF 캡처를
 * 한곳에 모은다 → 중복 제거 + 각 테스트 파일을 200줄 규칙 아래로 유지 (ruler/base.md).
 * 파일명이 `.testkit.ts`라 vitest include(`*.test.ts`)에 잡히지 않고, 라이브러리 빌드에서도 제외된다.
 */
import { vi } from 'vitest';
import type { ExperienceContext } from '../core/types';

/** emit을 spy로 둔 최소 ExperienceContext. */
export function makeCtx(): { ctx: ExperienceContext; emit: ReturnType<typeof vi.fn> } {
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

/** document.body에 부착된 빈 컨테이너. */
export function mountedContainer(): HTMLElement {
  const container = document.createElement('div');
  document.body.appendChild(container);
  return container;
}

/**
 * 모드 B 폴백(상태코드·메시지·홈/뒤로 링크)이 미리 박힌 컨테이너.
 * "게임이 오버레이로 떠도 이 링크들은 항상 접근 가능"이라는 a11y 불변식 검증용 (ruler/a11y.md).
 */
export function mountedFallbackContainer(): {
  container: HTMLElement;
  home: HTMLAnchorElement;
  back: HTMLButtonElement;
} {
  const container = document.createElement('div');
  const h1 = document.createElement('h1');
  h1.textContent = '404 — 페이지를 찾을 수 없어요';
  const home = document.createElement('a');
  home.href = '/';
  home.textContent = '홈으로';
  const back = document.createElement('button');
  back.type = 'button';
  back.textContent = '뒤로 가기';
  container.append(h1, home, back);
  document.body.appendChild(container);
  return { container, home, back };
}

/**
 * "지원 환경(Canvas 2D)" 재현용 스텁 컨텍스트를 getContext에 심는다.
 * 그리기 호출(fillRect/fillText/stroke/fill/strokeRect) 횟수를 draws()로 노출
 * → 렌더가 실제로 돌았는지만 검증(픽셀 검증은 브라우저 스모크의 영역).
 */
export function stubCanvas2d(): { draws: () => number } {
  let n = 0;
  const bump = (): void => {
    n += 1;
  };
  const noop = (): void => undefined;
  const ctx = {
    fillStyle: '',
    strokeStyle: '',
    font: '',
    lineWidth: 0,
    lineCap: 'butt' as CanvasLineCap,
    textAlign: 'left' as CanvasTextAlign,
    textBaseline: 'alphabetic' as CanvasTextBaseline,
    fillRect: bump,
    fillText: bump,
    stroke: bump,
    fill: bump,
    strokeRect: bump,
    clearRect: noop,
    beginPath: noop,
    closePath: noop,
    moveTo: noop,
    lineTo: noop,
    arc: noop,
    rect: noop,
    save: noop,
    restore: noop,
    translate: noop,
    rotate: noop,
    scale: noop,
  };
  vi.spyOn(HTMLCanvasElement.prototype, 'getContext').mockReturnValue(
    ctx as unknown as CanvasRenderingContext2D,
  );
  return { draws: (): number => n };
}

/** rAF 콜백을 캡처해 프레임을 결정적으로 구동한다(자동 재귀 없음). */
export function captureRaf(): { step: (t: number) => void; scheduled: () => boolean } {
  let cb: FrameRequestCallback | null = null;
  vi.spyOn(globalThis, 'requestAnimationFrame').mockImplementation(
    (fn: FrameRequestCallback): number => {
      cb = fn;
      return 1;
    },
  );
  return {
    step: (t: number): void => cb?.(t),
    scheduled: (): boolean => cb !== null,
  };
}
