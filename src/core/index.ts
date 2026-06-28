/**
 * 404 Playground — 코어 공개 API.
 *
 * M0 범위: `mount()`가 Tier 0 정적 폴백을 보장한다(모드 A 렌더 / 모드 B 유지).
 * 경험(게임) 동적 로더는 M1에서 연결된다 (docs/PLAN.md §16).
 */
import { resolveLocale, resolveTheme } from './context';
import { detectMode, renderFallback } from './fallback';
import type { Experience, PlaygroundConfig, PlaygroundHandle } from './types';

function resolveTarget(target: string | HTMLElement): HTMLElement {
  if (typeof target !== 'string') return target;
  const el = document.querySelector(target);
  if (!(el instanceof HTMLElement)) {
    throw new Error(`[error-playground] 대상을 찾을 수 없습니다: ${target}`);
  }
  return el;
}

/**
 * 컨테이너에 404 Playground를 마운트한다.
 *
 * @param target CSS 셀렉터 또는 HTMLElement
 * @param config 설정 (docs/PLAN.md §6)
 * @returns 정리용 핸들
 */
export function mount(target: string | HTMLElement, config: PlaygroundConfig = {}): PlaygroundHandle {
  const container = resolveTarget(target);
  const status = config.status ?? 404;
  const theme = resolveTheme(config.theme);
  const locale = resolveLocale(config.locale);
  const mode = detectMode(container);

  // 모드 A: 빈 컨테이너 → Tier 0 폴백 렌더. 모드 B: 기존 폴백 DOM을 그대로 유지.
  let fallbackRoot: HTMLElement | null = null;
  if (mode === 'A') {
    fallbackRoot = renderFallback(container, config, theme, status, locale);
  }

  config.onEvent?.({ type: 'ready' });

  // TODO(hschang, 2026-07): M1 — Experience 동적 로더 연결. import() 실패 시 폴백 유지(graceful). docs/PLAN.md §5.4
  return {
    unmount(): void {
      fallbackRoot?.remove();
      fallbackRoot = null;
    },
    setExperience(_experience: string | Experience): Promise<void> {
      // TODO(hschang, 2026-07): M1 — Experience 로더에서 구현.
      return Promise.reject(
        new Error('[error-playground] setExperience()는 M1(Experience 로더)에서 제공됩니다.'),
      );
    },
  };
}

export type {
  Experience,
  ExperienceContext,
  PlaygroundConfig,
  PlaygroundEvent,
  PlaygroundHandle,
} from './types';

