/**
 * iframe — 외부 콘텐츠/게임을 sandbox iframe으로 임베드하는 경험 (v2).
 * 무게를 iframe 콘텐츠로 오프로드하므로 코어는 가볍게 유지된다.
 *
 * 옵션(`config.options` / CE `src` 속성):
 *  - `src`     (필수) http(s)/상대경로만 허용
 *  - `title`   접근성 제목
 *  - `sandbox` sandbox 속성 (기본 'allow-scripts' — 스크립트만 허용, 나머지 격리)
 *  - `allow`   Permissions-Policy allow 속성
 */
import type { Experience, ExperienceContext } from '../../core/types';

/** http(s)/상대경로만 허용 (javascript:, data: 등 차단 — ruler/security.md). */
function safeSrc(value: unknown): string | null {
  if (typeof value !== 'string') return null;
  if (/^https?:\/\//i.test(value) || value.startsWith('/')) return value;
  return null;
}

function str(value: unknown): string | undefined {
  return typeof value === 'string' ? value : undefined;
}

class IframeExperience implements Experience {
  private frame: HTMLIFrameElement | null = null;

  isSupported(): boolean {
    return typeof document !== 'undefined';
  }

  mount(container: HTMLElement, ctx: ExperienceContext): void {
    const src = safeSrc(ctx.options?.src);
    if (!src) {
      // src가 없거나 안전하지 않으면 임베드하지 않고 폴백 유지 (에러로 알림 — 불변식)
      ctx.emit({
        type: 'error',
        cause: new Error('[iframe] 유효한 src(http/https/상대경로)가 필요합니다'),
      });
      return;
    }

    const doc = container.ownerDocument;
    const frame = doc.createElement('iframe');
    frame.src = src;
    frame.title = str(ctx.options?.title) ?? '에러 페이지 콘텐츠';
    frame.loading = 'lazy';
    // 보안 기본값: 스크립트만 허용하고 나머지는 격리. 신뢰하는 콘텐츠면 options.sandbox로 확장.
    frame.setAttribute('sandbox', str(ctx.options?.sandbox) ?? 'allow-scripts');
    const allow = str(ctx.options?.allow);
    if (allow) frame.setAttribute('allow', allow);
    frame.style.cssText = 'display:block;width:100%;border:0;border-radius:8px;min-height:240px;';
    frame.addEventListener('load', () => ctx.emit({ type: 'start' }));

    container.appendChild(frame);
    this.frame = frame;
  }

  unmount(): void {
    this.frame?.remove();
    this.frame = null;
  }
}

/** 코어 로더가 호출하는 팩토리. */
export function create(): Experience {
  return new IframeExperience();
}
