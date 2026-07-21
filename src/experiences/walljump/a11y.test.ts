/**
 * walljump — a11y 불변식: 게임이 오버레이로 떠도 폴백(상태코드·메시지·홈/뒤로 링크)은
 * 항상 DOM에 남고 키보드로 도달 가능해야 한다. 마운트 중·게임 실행 중·언마운트 후 모두 검증한다.
 * (ruler/a11y.md 최우선 불변식 · docs/PLAN.md §5.4/§14)
 *
 * jsdom은 실제 픽셀/시각적 가림을 재현하지 않는다 → 여기선 링크의 **존재·포커스 가능성·DOM 순서**
 * (오버레이가 링크 뒤에 옴)를 검증하고, 오버레이의 실제 가시성/포커스는 브라우저 스모크(Playwright)로 남긴다.
 */
import { afterEach, describe, expect, it, vi } from 'vitest';
import { mount } from '../../core/mount';
import { captureRaf, mountedFallbackContainer, stubCanvas2d } from '../dom.testkit';

afterEach(() => {
  document.body.innerHTML = '';
  vi.restoreAllMocks();
});

/** 요소가 키보드 포커스를 받는가(제거·포커스 트랩되지 않았는가). */
function canFocus(el: HTMLElement): boolean {
  el.focus();
  return el.ownerDocument.activeElement === el;
}

/** overlay가 el보다 문서 뒤쪽에 오는가(= Tab 순서상 el에 먼저 도달). */
function overlayFollows(el: HTMLElement, overlay: HTMLElement): boolean {
  return Boolean(el.compareDocumentPosition(overlay) & Node.DOCUMENT_POSITION_FOLLOWING);
}

describe('walljump — 폴백 링크 접근성 불변식 (v2)', () => {
  it('keeps the fallback home/back links reachable during mount, play, and after unmount', async () => {
    stubCanvas2d();
    const raf = captureRaf();
    const { container, home, back } = mountedFallbackContainer();
    const handle = mount(container, { experience: 'walljump' });

    // 게임(canvas)이 폴백 위에 오버레이로 마운트될 때까지 대기(동적 import).
    await vi.waitFor(() => {
      expect(container.querySelector('.ep-experience canvas')).not.toBeNull();
    });

    // (a) 마운트 중: 폴백 링크가 DOM에 남아 있고 포커스 가능하다.
    expect(container.contains(home)).toBe(true);
    expect(container.contains(back)).toBe(true);
    expect(canFocus(home)).toBe(true);
    expect(canFocus(back)).toBe(true);

    // (b) Tab 순서: 폴백 링크가 경험 오버레이(.ep-experience)보다 앞선다 → 링크에 먼저 도달.
    const overlay = container.querySelector('.ep-experience') as HTMLElement;
    expect(overlay).not.toBeNull();
    expect(overlayFollows(home, overlay)).toBe(true);
    expect(overlayFollows(back, overlay)).toBe(true);

    // (c) 게임 실행 중: 첫 입력 후 프레임을 돌려도 링크는 여전히 접근 가능(포커스 트랩 없음).
    const gameHost = container.querySelector('.ep-game') as HTMLElement;
    gameHost.dispatchEvent(new Event('pointerdown'));
    raf.step(16);
    raf.step(200);
    expect(container.contains(home)).toBe(true);
    expect(canFocus(home)).toBe(true);

    // (d) 언마운트 후: 오버레이는 사라지고 폴백 링크는 그대로 남아 접근 가능(불변식 유지).
    handle.unmount();
    expect(container.querySelector('.ep-experience')).toBeNull();
    expect(container.querySelector('canvas')).toBeNull();
    expect(container.contains(home)).toBe(true);
    expect(container.contains(back)).toBe(true);
    expect(canFocus(home)).toBe(true);
  });
});
