import { afterEach, describe, expect, it, vi } from 'vitest';
import { mount } from './index';
import type { Experience, ExperienceContext, PlaygroundEvent } from './types';

afterEach(() => {
  document.body.innerHTML = '';
  document.getElementById('ep-fallback-style')?.remove();
});

interface SpyExperience extends Experience {
  mountCalls: number;
  unmountCalls: number;
}

function spyExperience(overrides: Partial<Experience> = {}): SpyExperience {
  const exp: SpyExperience = {
    mountCalls: 0,
    unmountCalls: 0,
    mount(container: HTMLElement, ctx: ExperienceContext) {
      exp.mountCalls += 1;
      const node = container.ownerDocument.createElement('span');
      node.setAttribute('data-test', 'mounted');
      container.appendChild(node);
      ctx.emit({ type: 'start' });
    },
    unmount() {
      exp.unmountCalls += 1;
    },
    ...overrides,
  };
  return exp;
}

function host(): HTMLElement {
  const el = document.createElement('div');
  document.body.appendChild(el);
  return el;
}

describe('mount — 경험 로딩 (M1)', () => {
  it('should mount an injected experience object into an experience host', async () => {
    const el = host();
    const exp = spyExperience();

    await mount(el).setExperience(exp);

    expect(exp.mountCalls).toBe(1);
    expect(el.querySelector('.ep-experience')).not.toBeNull();
    expect(el.querySelector('[data-test="mounted"]')).not.toBeNull();
  });

  it('should auto-load when config.experience is provided', async () => {
    const el = host();
    const exp = spyExperience();

    mount(el, { experience: exp });

    await vi.waitFor(() => expect(exp.mountCalls).toBe(1));
  });

  it('should pass resolved context (status/reducedMotion) to the experience', async () => {
    const el = host();
    let received: ExperienceContext | null = null;
    const exp = spyExperience({
      mount(_c, ctx) {
        received = ctx;
      },
    });

    await mount(el, { status: 500, reducedMotion: 'force' }).setExperience(exp);

    expect(received).not.toBeNull();
    expect(received!.status).toBe(500);
    expect(received!.reducedMotion).toBe(true);
  });
});

describe('graceful degradation — 불변식 "에러 정보는 항상 보인다" (M1)', () => {
  it('should KEEP the fallback when the experience name is unknown', async () => {
    const el = host();
    const events: PlaygroundEvent[] = [];

    await mount(el, { onEvent: (e) => events.push(e) }).setExperience('does-not-exist');

    expect(events.some((e) => e.type === 'error')).toBe(true); // error 이벤트 발생
    expect(el.querySelector('.ep-root')).not.toBeNull(); // 폴백 유지
    expect(el.querySelector('a.ep-btn')).not.toBeNull(); // 홈 링크 살아있음
  });

  it('should KEEP the fallback when experience.mount() throws (never crashes)', async () => {
    const el = host();
    const events: PlaygroundEvent[] = [];
    const exploding = spyExperience({
      mount() {
        throw new Error('boom');
      },
    });

    // throw가 새어나오지 않아야 한다(에러 페이지를 다시 깨뜨리면 안 됨)
    await expect(mount(el, { onEvent: (e) => events.push(e) }).setExperience(exploding)).resolves.toBeUndefined();
    expect(events.some((e) => e.type === 'error')).toBe(true);
    expect(el.querySelector('.ep-root')).not.toBeNull();
  });

  it('should skip (keep fallback, no error) when isSupported() is false', async () => {
    const el = host();
    const events: PlaygroundEvent[] = [];
    const unsupported = spyExperience({ isSupported: () => false });

    await mount(el, { onEvent: (e) => events.push(e) }).setExperience(unsupported);

    expect(unsupported.mountCalls).toBe(0);
    expect(el.querySelector('.ep-experience')).toBeNull();
    expect(events.some((e) => e.type === 'error')).toBe(false); // 미지원은 에러가 아님
    expect(el.querySelector('.ep-root')).not.toBeNull();
  });
});

describe('lifecycle — unmount / 경합', () => {
  it('should tear down both experience and fallback on unmount()', async () => {
    const el = host();
    const exp = spyExperience();
    const handle = mount(el);
    await handle.setExperience(exp);

    handle.unmount();

    expect(exp.unmountCalls).toBe(1);
    expect(el.querySelector('.ep-experience')).toBeNull();
    expect(el.querySelector('.ep-root')).toBeNull();
  });

  it('should NOT mount an experience if unmounted before the load resolves', async () => {
    const el = host();
    const exp = spyExperience();
    const handle = mount(el);

    const pending = handle.setExperience(exp);
    handle.unmount(); // 마이크로태스크 해결 전에 dispose

    await pending;
    expect(exp.mountCalls).toBe(0);
  });

  it('should swap experiences via setExperience()', async () => {
    const el = host();
    const first = spyExperience();
    const second = spyExperience();
    const handle = mount(el);

    await handle.setExperience(first);
    await handle.setExperience(second);

    expect(first.unmountCalls).toBe(1); // 이전 경험 정리
    expect(second.mountCalls).toBe(1);
  });
});
