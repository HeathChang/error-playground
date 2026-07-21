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

/** 카트리지가 넘기는 게임별 접근성 설명(언어쌍). 프레임워크 독립 라이브러리라 언어를 하드코딩하지 않는다. */
export interface CanvasLabel {
  ko: string;
  en: string;
}

/**
 * 캔버스 role="img"에 넣을 정적 대체 텍스트를 결정한다.
 * 카트리지가 게임별 설명을 넘기면 locale에 맞는 언어를, 없으면 중립 기본값을 쓴다
 * (ruler/a11y.md, ExperienceContext.locale 존중 — ko 외 로케일에서 한국어 고정 텍스트가 새지 않게).
 */
export function canvasLabel(locale: string, label?: CanvasLabel): string {
  const isKo = locale.toLowerCase().startsWith('ko');
  if (label) return isKo ? label.ko : label.en;
  return isKo ? '미니 게임 화면' : 'Mini-game';
}

/**
 * env.host에 게임용 canvas를 만들어 붙이고 2D 컨텍스트와 함께 반환.
 * @param label 게임별 접근성 설명(선택) — 없으면 env.locale 기준 중립 텍스트.
 */
export function mountCanvas(
  env: GameEnv,
  label?: CanvasLabel,
): {
  canvas: HTMLCanvasElement;
  ctx: CanvasRenderingContext2D | null;
} {
  const doc = env.host.ownerDocument;
  const canvas = doc.createElement('canvas');
  canvas.width = env.width;
  canvas.height = env.height;
  // 캔버스는 SR에 불투명 → 정적 설명을 role="img"+aria-label로. 점수·상태 등 동적 정보는
  // 콘솔(gameMachine)의 aria-live가 담당. 라벨은 locale 대응 + 카트리지별 설명 (ruler/a11y.md).
  canvas.setAttribute('role', 'img');
  canvas.setAttribute('aria-label', canvasLabel(env.locale, label));
  // 논리 크기(env.width×height)로 그리되, 호스트보다 크면 축소되고 flex 호스트가 가운데 정렬한다.
  canvas.style.cssText = `display:block;max-width:100%;max-height:100%;border-radius:8px;touch-action:manipulation;`;
  env.host.appendChild(canvas);
  return { canvas, ctx: canvas.getContext('2d') };
}
