/**
 * 시스템 환경(테마/모션 선호/로케일)을 읽어 확정값으로 변환한다.
 * 경험은 분기 없이 이 확정값만 사용한다 (docs/PLAN.md §6 설계 메모).
 */
import type { ReducedMotionOption, ResolvedTheme, ThemeOption } from './types';

function prefers(query: string): boolean {
  if (typeof window === 'undefined' || typeof window.matchMedia !== 'function') {
    return false;
  }
  return window.matchMedia(query).matches;
}

/** 'auto'/미지정은 prefers-color-scheme를 따른다. */
export function resolveTheme(theme: ThemeOption | undefined): ResolvedTheme {
  if (theme === 'light' || theme === 'dark') return theme;
  return prefers('(prefers-color-scheme: dark)') ? 'dark' : 'light';
}

/** 'force'/'off'는 강제, 'auto'/미지정은 prefers-reduced-motion을 따른다. */
export function resolveReducedMotion(option: ReducedMotionOption | undefined): boolean {
  if (option === 'force') return true;
  if (option === 'off') return false;
  return prefers('(prefers-reduced-motion: reduce)');
}

/** 미지정 시 navigator.language, 그것도 없으면 'en'. */
export function resolveLocale(locale: string | undefined): string {
  if (locale) return locale;
  if (typeof navigator !== 'undefined' && navigator.language) return navigator.language;
  return 'en';
}
