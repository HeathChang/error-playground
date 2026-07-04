/**
 * `<error-playground>` Custom Element — 모든 프레임워크에서 태그 하나로 동작(선언적).
 * 웹 표준이라 React/Vue/Svelte/순수 HTML 어디서든 별도 래퍼 없이 쓸 수 있다.
 *
 * 설정 두 가지:
 *  - **속성**(단순): `status` `home` `back` `theme` `locale` `experience`
 *    `reduced-motion` `asset-base` `message-title` `message-description`
 *  - **`config` property**(리치 객체): `el.config = { ... }` — 속성으로 표현 못 하는 값
 *
 * 폴백은 `config`에 맞춰 렌더된다. 자식 노드가 있으면 그것을 폴백으로 유지(모드 B).
 */
import { mount } from './mount';
import type { PlaygroundConfig, PlaygroundHandle, ThemeOption, ReducedMotionOption } from './types';

const OBSERVED = [
  'status',
  'home',
  'back',
  'theme',
  'locale',
  'experience',
  'reduced-motion',
  'asset-base',
  'message-title',
  'message-description',
  'src',
] as const;

function isTheme(v: string | null): v is ThemeOption {
  return v === 'light' || v === 'dark' || v === 'auto';
}
function isReducedMotion(v: string | null): v is ReducedMotionOption {
  return v === 'auto' || v === 'force' || v === 'off';
}

// SSR/Node 안전: HTMLElement가 없는 환경(서버 렌더/프리렌더)에서 import해도 크래시하지 않도록
// 더미 클래스를 상속한다. 실제 등록(defineErrorPlayground)은 브라우저에서만 일어난다.
const HTMLElementBase: typeof HTMLElement =
  typeof HTMLElement !== 'undefined' ? HTMLElement : (class {} as unknown as typeof HTMLElement);

export class ErrorPlaygroundElement extends HTMLElementBase {
  private handle: PlaygroundHandle | null = null;
  private configProp: PlaygroundConfig | null = null;

  static get observedAttributes(): readonly string[] {
    return OBSERVED;
  }

  /** 리치 config 주입용 property (속성으로 표현 못 하는 값 · 프레임워크 바인딩용). */
  get config(): PlaygroundConfig | null {
    return this.configProp;
  }
  set config(value: PlaygroundConfig | null) {
    this.configProp = value;
    if (this.isConnected) this.rerender();
  }

  connectedCallback(): void {
    this.rerender();
  }

  disconnectedCallback(): void {
    this.handle?.unmount();
    this.handle = null;
  }

  attributeChangedCallback(): void {
    if (this.isConnected) this.rerender();
  }

  /** 속성 + config property를 병합해 PlaygroundConfig를 만든다. */
  private buildConfig(): PlaygroundConfig {
    const cfg: PlaygroundConfig = { ...this.configProp };

    const status = this.getAttribute('status');
    if (status !== null && status.trim() !== '') cfg.status = Number(status);

    const theme = this.getAttribute('theme');
    if (isTheme(theme)) cfg.theme = theme;

    const locale = this.getAttribute('locale');
    if (locale) cfg.locale = locale;

    const experience = this.getAttribute('experience');
    if (experience) cfg.experience = experience;

    const reducedMotion = this.getAttribute('reduced-motion');
    if (isReducedMotion(reducedMotion)) cfg.reducedMotion = reducedMotion;

    const assetBase = this.getAttribute('asset-base');
    if (assetBase) cfg.assetBase = assetBase;

    const title = this.getAttribute('message-title');
    const description = this.getAttribute('message-description');
    if (title || description) {
      cfg.messages = {
        ...cfg.messages,
        ...(title ? { title } : {}),
        ...(description ? { description } : {}),
      };
    }

    const home = this.getAttribute('home');
    const back = this.hasAttribute('back');
    if (home || back) {
      cfg.links = {
        ...cfg.links,
        ...(home ? { home } : {}),
        ...(back ? { back: true } : {}),
      };
    }

    const src = this.getAttribute('src');
    if (src) cfg.options = { ...cfg.options, src };

    return cfg;
  }

  private rerender(): void {
    this.handle?.unmount();
    this.handle = mount(this, this.buildConfig());
  }
}

/** `<error-playground>`를 등록한다(멱등 · 브라우저에서만). */
export function defineErrorPlayground(tag = 'error-playground'): void {
  if (typeof customElements === 'undefined') return;
  if (customElements.get(tag)) return;
  customElements.define(tag, ErrorPlaygroundElement);
}
