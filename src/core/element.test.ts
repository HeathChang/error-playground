import { afterEach, beforeAll, describe, expect, it } from 'vitest';
import { defineErrorPlayground, ErrorPlaygroundElement } from './element';
import type { PlaygroundConfig } from './types';

beforeAll(() => defineErrorPlayground());

afterEach(() => {
  document.body.innerHTML = '';
  document.getElementById('ep-fallback-style')?.remove();
});

function attach(html: string): ErrorPlaygroundElement {
  const wrap = document.createElement('div');
  wrap.innerHTML = html;
  const el = wrap.firstElementChild as ErrorPlaygroundElement;
  document.body.appendChild(el);
  return el;
}

describe('<error-playground> Custom Element (M-CE)', () => {
  it('is registered', () => {
    expect(customElements.get('error-playground')).toBe(ErrorPlaygroundElement);
  });

  it('renders the fallback per attributes (mode A)', () => {
    const el = attach('<error-playground status="404" home="/"></error-playground>');
    const root = el.querySelector('.ep-root');
    expect(root).not.toBeNull();
    expect(root?.querySelector('.ep-title')?.textContent).toContain('404');
    expect(el.querySelector('a.ep-btn')?.getAttribute('href')).toBe('/');
  });

  it('applies message-title / message-description attributes', () => {
    const el = attach(
      '<error-playground status="500" message-title="서버 오류" message-description="곧 복구됩니다"></error-playground>',
    );
    expect(el.querySelector('.ep-title')?.textContent).toBe('서버 오류');
    expect(el.querySelector('.ep-desc')?.textContent).toBe('곧 복구됩니다');
  });

  it('accepts a rich config via the .config property', () => {
    const el = document.createElement('error-playground') as ErrorPlaygroundElement;
    const cfg: PlaygroundConfig = { status: 404, messages: { title: '없어요' } };
    el.config = cfg;
    document.body.appendChild(el);
    expect(el.querySelector('.ep-title')?.textContent).toBe('없어요');
  });

  it('keeps existing children as fallback (mode B)', () => {
    const el = attach(
      '<error-playground status="404"><h1>커스텀 폴백</h1><a href="/">홈</a></error-playground>',
    );
    expect(el.querySelector('.ep-root')).toBeNull(); // 코어가 새로 그리지 않음
    expect(el.querySelector('h1')?.textContent).toBe('커스텀 폴백');
  });

  it('re-renders when an attribute changes', () => {
    const el = attach('<error-playground status="404"></error-playground>');
    expect(el.querySelector('.ep-title')?.textContent).toContain('404');
    el.setAttribute('status', '500');
    expect(el.querySelector('.ep-title')?.textContent).toContain('500');
  });

  it('unmounts on disconnect', () => {
    const el = attach('<error-playground status="404"></error-playground>');
    expect(el.querySelector('.ep-root')).not.toBeNull();
    el.remove();
    expect(el.querySelector('.ep-root')).toBeNull();
  });
});
