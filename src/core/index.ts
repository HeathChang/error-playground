/**
 * 404 Playground — 코어 공개 API.
 *
 * M0: `mount()`가 Tier 0 정적 폴백을 보장(모드 A 렌더 / 모드 B 유지).
 * M1: 경험(Experience) 동적 로더 연결 + graceful degradation
 *     — 로드/마운트가 실패해도 throw하지 않고 'error' 이벤트로만 알리며 폴백을 유지한다
 *       (에러 페이지를 다시 깨뜨리지 않기 위한 원칙, docs/PLAN.md §5.4).
 */
import { resolveLocale, resolveReducedMotion, resolveTheme } from './context';
import { detectMode, renderFallback } from './fallback';
import { resolveExperience } from './loader';
import type {
  Experience,
  ExperienceContext,
  PlaygroundConfig,
  PlaygroundEvent,
  PlaygroundHandle,
} from './types';

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
  const reducedMotion = resolveReducedMotion(config.reducedMotion);
  const locale = resolveLocale(config.locale);
  const mode = detectMode(container);

  const emit = (event: PlaygroundEvent): void => {
    config.onEvent?.(event);
  };

  // 모드 A: 빈 컨테이너 → Tier 0 폴백 렌더. 모드 B: 기존 폴백 DOM 유지.
  let fallbackRoot: HTMLElement | null = mode === 'A' ? renderFallback(container, config, theme, status, locale) : null;

  let experienceHost: HTMLElement | null = null;
  let currentExperience: Experience | null = null;
  let disposed = false;
  let loadToken = 0;

  const teardownExperience = (): void => {
    currentExperience?.unmount();
    currentExperience = null;
    experienceHost?.remove();
    experienceHost = null;
  };

  /**
   * 경험을 로드해 마운트한다. **절대 throw하지 않는다** — 실패는 'error' 이벤트로 알리고
   * 폴백을 유지한다(graceful degradation). loadToken으로 stale/dispose 경합을 막는다.
   */
  const load = async (spec: string | Experience): Promise<void> => {
    const token = ++loadToken;
    try {
      const experience = await resolveExperience(spec);
      if (disposed || token !== loadToken) return; // stale: 더 새 로드 또는 언마운트됨
      if (experience.isSupported && !experience.isSupported()) {
        return; // 지원 불가 → 폴백 유지 (에러 아님)
      }

      teardownExperience();
      const host = container.ownerDocument.createElement('div');
      host.className = 'ep-experience';
      container.appendChild(host);
      experienceHost = host;

      const ctx: ExperienceContext = { status, reducedMotion, theme, locale, emit, root: host };
      await experience.mount(host, ctx);

      if (disposed || token !== loadToken) {
        // 마운트 도중 stale/dispose → 방금 만든 것만 정리(최신 상태는 건드리지 않음)
        experience.unmount();
        host.remove();
        if (experienceHost === host) experienceHost = null;
        return;
      }
      currentExperience = experience;
    } catch (cause) {
      emit({ type: 'error', cause }); // 폴백 유지 (docs/PLAN.md §5.4 불변식)
    }
  };

  emit({ type: 'ready' });

  // M1: experience가 명시된 경우에만 로드(기본 'runner' 자동 로드는 M2부터).
  if (config.experience != null) {
    void load(config.experience);
  }

  return {
    unmount(): void {
      disposed = true;
      loadToken++; // 진행 중 로드 무효화
      teardownExperience();
      fallbackRoot?.remove();
      fallbackRoot = null;
    },
    setExperience(spec: string | Experience): Promise<void> {
      return load(spec);
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
