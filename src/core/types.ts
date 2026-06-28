/**
 * 404 Playground — 코어 공개 타입.
 * 설계 근거: docs/PLAN.md §5.3(Experience 계약), §6(Public API).
 */

/** 에러 상태 코드 (404 | 500 | 그 외 임의 숫자). */
export type ErrorStatus = number;

export type ThemeOption = 'light' | 'dark' | 'auto';
export type ResolvedTheme = 'light' | 'dark';
export type ReducedMotionOption = 'auto' | 'force' | 'off';

/** 호스트가 계측에 사용하는 라이프사이클 이벤트. */
export type PlaygroundEvent =
  | { type: 'ready' }
  | { type: 'start' }
  | { type: 'score'; value: number }
  | { type: 'gameover'; score: number }
  | { type: 'error'; cause: unknown };

export interface PlaygroundConfig {
  /** 에러 상태 코드. 기본 404. */
  status?: ErrorStatus;
  /** 내장 경험 이름 또는 커스텀 Experience 객체. (M1+) */
  experience?: string | Experience;
  /** 폴백에 표시할 메시지. 미지정 시 status별 기본값. */
  messages?: { title?: string; description?: string };
  /** 폴백 링크. home은 안전 URL만 허용, back은 history.back 버튼. */
  links?: { home?: string; back?: boolean };
  /** 'auto'(기본)는 prefers-color-scheme를 따름. */
  theme?: ThemeOption;
  /** BCP-47 로케일. 미지정 시 navigator.language. */
  locale?: string;
  /** 'auto'(기본)는 prefers-reduced-motion을 따름. */
  reducedMotion?: ReducedMotionOption;
  /** 경험 청크를 동적 로드할 기준 URL. (M1+, docs/PLAN.md §8) */
  assetBase?: string;
  /** 라이프사이클 이벤트 콜백(옵트인 계측). */
  onEvent?: (event: PlaygroundEvent) => void;
}

export interface PlaygroundHandle {
  /** 마운트한 모든 리소스를 해제한다. */
  unmount(): void;
  /** 경험을 교체한다. (M1+) */
  setExperience(experience: string | Experience): Promise<void>;
}

/** 코어가 시스템 값을 확정해 경험에 넘기는 컨텍스트. */
export interface ExperienceContext {
  status: ErrorStatus;
  reducedMotion: boolean;
  theme: ResolvedTheme;
  locale: string;
  emit: (event: PlaygroundEvent) => void;
  root: HTMLElement | ShadowRoot;
}

/**
 * 경험(게임·애니메이션) 플러그인 계약.
 * 이 인터페이스만 구현하면 코어에 끼울 수 있다 (docs/PLAN.md §5.3).
 */
export interface Experience {
  mount(container: HTMLElement, ctx: ExperienceContext): void | Promise<void>;
  unmount(): void;
  /** 현재 환경에서 동작 가능한가? false면 코어가 하위 Tier/폴백으로 폴백. */
  isSupported?(): boolean;
}
