/**
 * 경험(Experience) 로더 — 동적 import + 직접 주입 해석.
 *
 * - 문자열: 내장 레지스트리에서 동적 `import()` (빌드 시 코드 스플릿 → lazy)
 * - 객체: 직접 사용 (experimental, docs/PLAN.md §6)
 *
 * 실패는 reject로 던지고, 호출자(index.ts)가 폴백 유지 + error 이벤트로 흡수한다
 * (graceful degradation, docs/PLAN.md §5.4).
 */
import type { Experience } from './types';

type ExperienceFactory = () => Experience;

/**
 * 내장 경험 이름 → 동적 import 썽크.
 * 청크는 빌드 시 분리된다. M1은 contract 검증용 'noop'만, 실제 게임(runner)은 M2.
 * (assetBase 기반 외부 오리진 청크 해석은 실제 청크가 생기는 M2 빌드 단계에서 연결 — docs/PLAN.md §8)
 */
const BUILTINS: Record<string, () => Promise<unknown>> = {
  noop: () => import('../experiences/_noop/index'),
  runner: () => import('../experiences/runner/index'),
  iframe: () => import('../experiences/iframe/index'),
  cube: () => import('../experiences/cube/index'),
};

export function hasBuiltin(name: string): boolean {
  return Object.prototype.hasOwnProperty.call(BUILTINS, name);
}

export function isExperience(value: unknown): value is Experience {
  return (
    !!value &&
    typeof (value as Experience).mount === 'function' &&
    typeof (value as Experience).unmount === 'function'
  );
}

/** 경험 모듈에서 Experience 인스턴스를 추출한다(`create()` 팩토리 또는 default). */
function extractExperience(mod: unknown): Experience {
  const m = mod as { create?: ExperienceFactory; default?: ExperienceFactory | Experience };
  if (typeof m.create === 'function') return m.create();
  if (typeof m.default === 'function') return (m.default as ExperienceFactory)();
  if (isExperience(m.default)) return m.default;
  throw new Error('[error-playground] 유효한 Experience가 없습니다(export create() 또는 default 필요)');
}

/**
 * 경험 스펙을 Experience 인스턴스로 해석한다.
 * @throws 알 수 없는 이름이거나 계약 위반 객체일 때
 */
export async function resolveExperience(spec: string | Experience): Promise<Experience> {
  if (typeof spec !== 'string') {
    if (isExperience(spec)) return spec;
    throw new Error('[error-playground] 주입한 experience가 Experience 계약을 만족하지 않습니다');
  }
  const loader = BUILTINS[spec];
  if (!loader) {
    throw new Error(`[error-playground] 알 수 없는 experience: "${spec}"`);
  }
  return extractExperience(await loader());
}
