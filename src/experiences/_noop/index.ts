/**
 * _noop — contract 검증용 trivial 경험 (M1).
 * 게임이 아니라 "로더·Experience 계약이 실제로 동작하는지" 증명용.
 * 컨테이너에 작은 마커를 그리고 컨텍스트 값(status/모션)을 표시한다.
 */
import type { Experience, ExperienceContext } from '../../core/types';

class NoopExperience implements Experience {
  private el: HTMLElement | null = null;

  mount(container: HTMLElement, ctx: ExperienceContext): void {
    const el = container.ownerDocument.createElement('div');
    el.setAttribute('data-ep-experience', 'noop');
    el.setAttribute('aria-hidden', 'true'); // 부가물 — 폴백이 본 정보를 담당 (ruler/a11y.md)
    el.textContent = `experience loaded · status ${ctx.status} · motion ${ctx.reducedMotion ? 'reduced' : 'full'}`;
    container.appendChild(el);
    this.el = el;
    ctx.emit({ type: 'start' });
  }

  unmount(): void {
    this.el?.remove();
    this.el = null;
  }

  isSupported(): boolean {
    return true;
  }
}

/** 코어 로더가 호출하는 팩토리. */
export function create(): Experience {
  return new NoopExperience();
}
