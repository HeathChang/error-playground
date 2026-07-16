/**
 * 코어 명령형 API — `mount(el, config)`.
 *
 * M0: Tier 0 정적 폴백 보장(모드 A 렌더 / 모드 B 유지).
 * M1: 경험(Experience) 동적 로더 + graceful degradation
 *     — 로드/마운트 실패는 throw하지 않고 'error' 이벤트로만 알리며 폴백을 유지한다
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
 * 폴백/경험이 컨테이너 박스를 채우고 겹칠 수 있도록 기준 박스를 보장한다.
 * - static이면 position:relative (오버레이 기준)
 * - 높이가 없으면(auto로 collapse) min-height 바닥값 → 항상 보이게. 이미 더 크면 건드리지 않음.
 */
function ensureContainerBox(el: HTMLElement, minHeight: number): void {
  const position = el.ownerDocument.defaultView?.getComputedStyle(el).position;
  if (!position || position === 'static') el.style.position = 'relative';
  if (el.clientHeight < minHeight) el.style.minHeight = `${minHeight}px`;
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

  // 컨테이너가 어떤 크기든(600×600, auto, 전체화면…) 폴백/경험이 그 박스를 채우도록 보장.
  ensureContainerBox(container, config.minHeight ?? 240);

  const emit = (event: PlaygroundEvent): void => {
    config.onEvent?.(event);
  };

  // 모드 A: 빈 컨테이너 → Tier 0 폴백 렌더. 모드 B: 기존 폴백 DOM 유지.
  let fallbackRoot: HTMLElement | null =
    mode === 'A' ? renderFallback(container, config, theme, status, locale) : null;

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

  const load = async (spec: string | Experience): Promise<void> => {
    const token = ++loadToken;
    try {
      const experience = await resolveExperience(spec);
      if (disposed || token !== loadToken) return; // stale
      if (experience.isSupported && !experience.isSupported()) {
        return; // 지원 불가 → 폴백 유지 (에러 아님)
      }

      teardownExperience();
      const host = container.ownerDocument.createElement('div');
      host.className = 'ep-experience';
      host.style.cssText = 'position:absolute;inset:0;'; // 폴백 위에 겹쳐 채움
      container.appendChild(host);
      experienceHost = host;

      const ctx: ExperienceContext = {
        status,
        reducedMotion,
        theme,
        locale,
        emit,
        root: host,
        options: config.options,
      };
      await experience.mount(host, ctx);

      if (disposed || token !== loadToken) {
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

  if (config.experience != null) {
    void load(config.experience);
  }

  return {
    unmount(): void {
      disposed = true;
      loadToken++;
      teardownExperience();
      fallbackRoot?.remove();
      fallbackRoot = null;
    },
    setExperience(spec: string | Experience): Promise<void> {
      return load(spec);
    },
  };
}
