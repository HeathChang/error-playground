/**
 * Canvas 기반 게임 카트리지 공통 헬퍼.
 * runner·flappy·stacker·orbit이 공유하는 배관(지원 체크·시드·캔버스 생성·테마 타입)을 한곳에 모은다.
 * (cube는 CSS 3D DOM 기반이라 여기에 해당하지 않음)
 */
import type { GameEnv } from './machine';

export interface CanvasTheme {
  bg: string;
  fg: string;
  accent: string;
  muted: string;
}

/** canvas 2D 지원 여부 (jsdom 등 미지원 환경에선 false → 코어가 폴백 유지). */
export function canvasSupported(): boolean {
  try {
    const c = document.createElement('canvas');
    return typeof c.getContext === 'function' && !!c.getContext('2d');
  } catch {
    return false;
  }
}

/**
 * 런타임 시드. 비결정적이어도 무방하다(테스트는 게임 로직에 고정 시드를 직접 주입).
 * @param salt 게임별 상수 — 같은 시각에 뜬 여러 게임의 시드가 겹치지 않게.
 */
export function makeSeed(salt: number): number {
  const now = globalThis.performance?.now?.() ?? 1;
  return (Math.floor(now) ^ salt) >>> 0 || 1;
}

/** env.host에 게임용 canvas를 만들어 붙이고 2D 컨텍스트와 함께 반환. */
export function mountCanvas(env: GameEnv): {
  canvas: HTMLCanvasElement;
  ctx: CanvasRenderingContext2D | null;
} {
  const doc = env.host.ownerDocument;
  const canvas = doc.createElement('canvas');
  canvas.width = env.width;
  canvas.height = env.height;
  canvas.style.cssText = `display:block;width:100%;max-width:${env.width}px;border-radius:8px;touch-action:manipulation;`;
  env.host.appendChild(canvas);
  return { canvas, ctx: canvas.getContext('2d') };
}
