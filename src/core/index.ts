/**
 * 404 Playground — 공개 진입점.
 *
 * 두 가지 사용법:
 *  1. 명령형: `mount(el, config)` — 모든 프레임워크에서 동작(ref/DOM 필요)
 *  2. 선언적: `<error-playground status="404" ...>` — 모든 프레임워크용 태그(임포트만 하면 자동 등록)
 *
 * 이 모듈을 임포트하면(또는 IIFE를 로드하면) `<error-playground>`가 자동 등록된다.
 */
import { defineErrorPlayground } from './element';

export { mount } from './mount';
export { ErrorPlaygroundElement, defineErrorPlayground } from './element';

export type {
  Experience,
  ExperienceContext,
  PlaygroundConfig,
  PlaygroundEvent,
  PlaygroundHandle,
} from './types';

// 브라우저에서 자동 등록(멱등). Node/SSR 등 customElements 없으면 no-op.
defineErrorPlayground();
