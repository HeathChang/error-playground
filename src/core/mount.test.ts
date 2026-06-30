import { afterEach, describe, expect, it } from 'vitest';
import { resolveReducedMotion, resolveTheme } from './context';
import { detectMode, safeHref } from './fallback';
import { mount } from './index';

afterEach(() => {
  document.body.innerHTML = '';
  document.getElementById('ep-fallback-style')?.remove();
});

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
