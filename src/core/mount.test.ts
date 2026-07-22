import { afterEach, describe, expect, it } from 'vitest';
import { resolveReducedMotion, resolveTheme } from './context';
import { detectMode, safeHref } from './fallback';
import { mount } from './index';
import type { Experience } from './types';

afterEach(() => {
  document.body.innerHTML = '';
  document.getElementById('ep-fallback-style')?.remove();
});

/**
 * 폴백을 완전히 덮고 pointerdown을 가로채는 "실제 게임처럼 행동하는" 가짜 경험.
 * charge를 포함한 모든 canvas 카트리지가 콘솔(gameMachine)로 만드는 오버레이 구조를 최소 재현한다.
 */
function coveringExperience(): { exp: Experience; gameHits: () => number } {
  let hits = 0;
  const exp: Experience = {
    mount(host) {
      const game = host.ownerDocument.createElement('div');
      game.className = 'ep-game';
      game.style.cssText = 'position:absolute;inset:0;background:#000;'; // 불투명 + 전면
      game.addEventListener('pointerdown', () => {
        hits += 1;
      });
      host.appendChild(game);
    },
    unmount() {},
  };
  return { exp, gameHits: () => hits };
}

describe('mount — Tier 0 폴백 (M0)', () => {
  it('should render fallback into an empty container (mode A)', () => {
    const el = document.createElement('div');
    document.body.appendChild(el);

    mount(el, { status: 404 });

    const root = el.querySelector('.ep-root');
    expect(root).not.toBeNull();
    expect(root?.querySelector('.ep-title')?.textContent).toContain('404');
    expect(root?.querySelector('a.ep-btn')).not.toBeNull(); // 홈 링크 항상 존재 (불변식)
  });

  it('should keep existing fallback DOM untouched (mode B)', () => {
    const el = document.createElement('div');
    el.innerHTML = '<h1>404</h1><a href="/">홈</a>';
    const before = el.innerHTML;
    document.body.appendChild(el);

    mount(el, { status: 500 });

    expect(detectMode(el)).toBe('B');
    expect(el.querySelector('.ep-root')).toBeNull(); // 코어가 새로 렌더하지 않음
    expect(el.innerHTML).toBe(before); // 기존 DOM 보존
  });

  it('should remove the fallback on unmount()', () => {
    const el = document.createElement('div');
    document.body.appendChild(el);

    const handle = mount(el);
    expect(el.querySelector('.ep-root')).not.toBeNull();

    handle.unmount();
    expect(el.querySelector('.ep-root')).toBeNull();
  });

  it('should emit a "ready" event', () => {
    const el = document.createElement('div');
    document.body.appendChild(el);
    const events: string[] = [];

    mount(el, { onEvent: (e) => events.push(e.type) });

    expect(events).toContain('ready');
  });

  it('should resolve a string selector target', () => {
    const el = document.createElement('div');
    el.id = 'target';
    document.body.appendChild(el);

    mount('#target');
    expect(el.querySelector('.ep-root')).not.toBeNull();
  });

  it('should throw for a missing target', () => {
    expect(() => mount('#nope')).toThrow(/대상을 찾을 수 없습니다/);
  });

  it('setExperience("runner") keeps fallback in jsdom (no 2D canvas → isSupported=false)', async () => {
    const el = document.createElement('div');
    document.body.appendChild(el);
    const handle = mount(el);
    // 'runner'는 등록됐지만 jsdom엔 canvas 2D가 없어 isSupported=false → 건너뛰고 폴백 유지
    await expect(handle.setExperience('runner')).resolves.toBeUndefined();
    expect(el.querySelector('.ep-root')).not.toBeNull();
    expect(el.querySelector('canvas')).toBeNull();
  });
});

describe('반응형 컨테이너 박스 (사이징)', () => {
  it('gives a static container a box so fallback can fill (position + min-height)', () => {
    const el = document.createElement('div');
    document.body.appendChild(el);
    mount(el, { status: 404 });
    expect(el.style.position).toBe('relative');
    expect(el.style.minHeight).toBe('240px'); // 높이 없는 컨테이너 → 기본 바닥값
  });

  it('respects a custom minHeight', () => {
    const el = document.createElement('div');
    document.body.appendChild(el);
    mount(el, { minHeight: 400 });
    expect(el.style.minHeight).toBe('400px');
  });

  it('renders the fallback root as a fill layer (absolute)', () => {
    const el = document.createElement('div');
    document.body.appendChild(el);
    mount(el, { status: 404 });
    // .ep-root는 스타일시트에서 position:absolute;inset:0 로 컨테이너를 채운다
    expect(el.querySelector('.ep-root')).not.toBeNull();
  });
});

describe('폴백 탐색 접근성 불변식 — 경험 오버레이 위·바깥의 exit nav (공통 레이어, a11y)', () => {
  // 회귀 근거: 게임 오버레이(.ep-experience/.ep-game, 불투명·inset:0·pointerdown 캡처)가 폴백 홈/뒤로 링크를
  // 시각적으로 가리고 포인터를 가로채 "폴백 링크 항상 접근 가능" 불변식을 깨뜨릴 수 있다(ruler/a11y.md).
  // 코어는 오버레이 바깥(별도 서브트리)·위(z-index)의 pointer-events 활성 탐색 레이어(.ep-exit)로 구조적으로 막는다.
  // jsdom은 픽셀 레이아웃을 재현하지 않으므로 여기선 그 구조/이벤트 계약을 검증하고, 픽셀 hit-test는 브라우저 스모크가 보완.

  it('lifts an on-top, pointer-reachable nav outside the experience subtree; game input stays separate', async () => {
    const el = document.createElement('div');
    document.body.appendChild(el);
    const { exp, gameHits } = coveringExperience();

    await mount(el, { links: { home: '/back-home', back: true } }).setExperience(exp);

    const overlay = el.querySelector('.ep-experience') as HTMLElement;
    const nav = el.querySelector('.ep-exit') as HTMLElement;
    expect(overlay).not.toBeNull();
    expect(nav).not.toBeNull();

    // 구조 계약: exit nav는 경험 오버레이 밖(게임 입력 서브트리 밖)이고, 오버레이보다 문서상 뒤(=위) + 명시 z-index로 뜬다.
    expect(overlay.contains(nav)).toBe(false);
    expect(Boolean(overlay.compareDocumentPosition(nav) & Node.DOCUMENT_POSITION_FOLLOWING)).toBe(true);
    expect(nav.style.zIndex).toBe('2'); // 오버레이(z-auto=0) 위
    expect(nav.style.pointerEvents).toBe('auto'); // 포인터가 게임에 먹히지 않고 링크에 닿음

    // 홈 링크: 안전 href + 키보드 포커스 도달. 뒤로 버튼도 노출(back:true).
    const home = nav.querySelector('a') as HTMLAnchorElement;
    expect(home.getAttribute('href')).toBe('/back-home');
    home.focus();
    expect(el.ownerDocument.activeElement).toBe(home);
    expect(nav.querySelector('button')).not.toBeNull();

    // 포인터 분리: exit 링크 위 pointerdown은 게임 입력으로 전파되지 않는다(다른 서브트리).
    home.dispatchEvent(new Event('pointerdown', { bubbles: true }));
    expect(gameHits()).toBe(0);
    // 대조군: 실제 게임 표면의 pointerdown은 정상적으로 게임에 전달된다.
    (overlay.querySelector('.ep-game') as HTMLElement).dispatchEvent(new Event('pointerdown', { bubbles: true }));
    expect(gameHits()).toBe(1);
  });

  it('keeps mode B fallback DOM intact and still overlays the exit nav on top', async () => {
    const el = document.createElement('div');
    el.innerHTML = '<h1>404</h1><a href="/">홈</a>';
    document.body.appendChild(el);
    const { exp } = coveringExperience();

    await mount(el, { links: { home: '/' } }).setExperience(exp);

    expect(detectMode(el)).toBe('B');
    expect(el.querySelector('h1')).not.toBeNull(); // 기존 폴백 유지(불변식)
    const nav = el.querySelector('.ep-exit') as HTMLElement;
    expect(nav).not.toBeNull();
    expect((nav.querySelector('a') as HTMLAnchorElement).getAttribute('href')).toBe('/');
    // back 미지정 → 뒤로 버튼 없음.
    expect(nav.querySelector('button')).toBeNull();
  });

  it('sanitizes the exit home href (javascript: / open-redirect → "/")', async () => {
    const el = document.createElement('div');
    document.body.appendChild(el);
    const { exp } = coveringExperience();

    await mount(el, { links: { home: 'javascript:alert(1)' } }).setExperience(exp);

    expect((el.querySelector('.ep-exit a') as HTMLAnchorElement).getAttribute('href')).toBe('/');
  });

  it('removes the exit nav on experience swap and on unmount (no leak)', async () => {
    const el = document.createElement('div');
    document.body.appendChild(el);
    const handle = mount(el);

    await handle.setExperience(coveringExperience().exp);
    expect(el.querySelectorAll('.ep-exit').length).toBe(1);

    await handle.setExperience(coveringExperience().exp);
    expect(el.querySelectorAll('.ep-exit').length).toBe(1); // 스왑해도 이전 것 제거 → 항상 1개

    handle.unmount();
    expect(el.querySelector('.ep-exit')).toBeNull(); // 언마운트 후 정리(누수 0)
  });
});

describe('safeHref — open redirect 방지 (보안)', () => {
  it('should allow http(s) and absolute paths', () => {
    expect(safeHref('https://example.com')).toBe('https://example.com');
    expect(safeHref('/home')).toBe('/home');
  });

  it('should reject javascript: and unknown schemes', () => {
    expect(safeHref('javascript:alert(1)')).toBe('/');
    expect(safeHref('data:text/html,x')).toBe('/');
    expect(safeHref(undefined)).toBe('/');
  });
});

describe('context resolvers', () => {
  it('should honor explicit theme over system', () => {
    expect(resolveTheme('dark')).toBe('dark');
    expect(resolveTheme('light')).toBe('light');
  });

  it('should force/disable reduced motion explicitly', () => {
    expect(resolveReducedMotion('force')).toBe(true);
    expect(resolveReducedMotion('off')).toBe(false);
  });
});
