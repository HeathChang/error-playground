import { afterEach, describe, expect, it, vi } from 'vitest';
import type { ExperienceContext } from '../../core/types';
import { mount } from '../../core/index';
import { create } from './index';

afterEach(() => {
  document.body.innerHTML = '';
  document.getElementById('ep-fallback-style')?.remove();
});

function makeCtx(options?: Record<string, unknown>) {
  const emit = vi.fn();
  const ctx: ExperienceContext = {
    status: 404,
    reducedMotion: false,
    theme: 'light',
    locale: 'ko',
    emit,
    root: document.body,
    options,
  };
  return { ctx, emit };
}

function host(): HTMLElement {
  const el = document.createElement('div');
  document.body.appendChild(el);
  return el;
}

describe('iframe 경험 (v2)', () => {
  it('embeds a safe src in a sandboxed iframe', () => {
    const el = host();
    create().mount(el, makeCtx({ src: 'https://example.com/game' }).ctx);
    const frame = el.querySelector('iframe');
    expect(frame).not.toBeNull();
    expect(frame?.getAttribute('src')).toBe('https://example.com/game');
    expect(frame?.getAttribute('sandbox')).toBe('allow-scripts'); // 안전 기본값
  });

  it('allows relative paths', () => {
    const el = host();
    create().mount(el, makeCtx({ src: '/mini-game.html' }).ctx);
    expect(el.querySelector('iframe')?.getAttribute('src')).toBe('/mini-game.html');
  });

  it('rejects unsafe src (javascript:) → no iframe + error event', () => {
    const el = host();
    const { ctx, emit } = makeCtx({ src: 'javascript:alert(1)' });
    create().mount(el, ctx);
    expect(el.querySelector('iframe')).toBeNull();
    expect(emit).toHaveBeenCalledWith(expect.objectContaining({ type: 'error' }));
  });

  it('emits error when src is missing (keeps fallback)', () => {
    const el = host();
    const { ctx, emit } = makeCtx(undefined);
    create().mount(el, ctx);
    expect(el.querySelector('iframe')).toBeNull();
    expect(emit).toHaveBeenCalledWith(expect.objectContaining({ type: 'error' }));
  });

  it('honors custom sandbox / allow options', () => {
    const el = host();
    create().mount(el, makeCtx({ src: '/x', sandbox: 'allow-scripts allow-forms', allow: 'fullscreen' }).ctx);
    const frame = el.querySelector('iframe');
    expect(frame?.getAttribute('sandbox')).toBe('allow-scripts allow-forms');
    expect(frame?.getAttribute('allow')).toBe('fullscreen');
  });

  it('unmount removes the iframe', () => {
    const el = host();
    const exp = create();
    exp.mount(el, makeCtx({ src: '/x' }).ctx);
    expect(el.querySelector('iframe')).not.toBeNull();
    exp.unmount();
    expect(el.querySelector('iframe')).toBeNull();
  });

  it('works end-to-end via mount({ experience: "iframe", options })', async () => {
    const el = host();
    const handle = mount(el, { status: 404, experience: 'iframe', options: { src: '/g' } });
    await vi.waitFor(() => expect(el.querySelector('iframe')).not.toBeNull());
    expect(el.querySelector('iframe')?.getAttribute('src')).toBe('/g');
    handle.unmount();
  });
});
