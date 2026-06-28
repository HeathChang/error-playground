---
title: 테스트
stack: library
category: 품질
extends: [base.md]
---

# Testing (Vitest + Playwright)

> `base.md`를 상속한다. 이 프로젝트는 프레임워크 독립 라이브러리다 — 테스트도 **Vitest(유닛/jsdom) + Playwright(브라우저 스모크)** 기준이며 React Testing Library/Storybook은 쓰지 않는다.

## 테스트 대상 (`docs/PLAN.md` §15)

| 대상 | 도구 | 수준 |
|------|------|------|
| 순수 함수 (config 파싱, context 확정, URL 검증) | Vitest | 필수 |
| 코어 로더 (모드 A/B 판별, 동적 import, **실패 시 폴백 유지**) | Vitest + jsdom | 필수 |
| Experience `mount`/`unmount` 라이프사이클 (누수 0) | Playwright / jsdom | 필수 |
| 통합 플로우 (vanilla·React에서 폴백→경험 로드) | Playwright | 권장 |
| 번들 사이즈 예산 (코어 ≤ 8KB, 러너 ≤ 20KB gzip) | CI 게이트 | 필수 |

## 이 프로젝트의 핵심 테스트 (불변식 검증)

- **장애 주입**: 경험 청크 `import()` 를 강제 실패시켜도 **정적 폴백이 유지**되고 `onEvent('error')` 가 발생하는지. (불변식: "에러 정보는 항상 보인다")
- **누수 0**: `unmount()` 후 `requestAnimationFrame`·이벤트 리스너·타이머·WebGL 컨텍스트가 전부 해제됐는지.
- **reduced-motion**: `prefers-reduced-motion` 모킹 시 자동 재생이 멈추고 opt-in 시작으로 바뀌는지.

## 테스트 원칙

- **테스트 없는 리팩토링 금지**. 기존 테스트가 없으면 먼저 추가.
- 테스트는 **구현이 아닌 동작**을 검증(내부 상태 직접 접근 금지). 사용자/호스트가 관찰 가능한 DOM·이벤트로 검증.
  - 근거: 구현 결합 테스트는 동일 동작 리팩토링에도 깨진다 — 테스트가 리팩토링의 적이 됨.
- **모킹 최소화** — 내부 모듈 모킹은 설계 문제 신호. 경계(`import()`·네트워크·`matchMedia`)에서만 모킹.
- 각 테스트는 **하나의 동작**만, 테스트 간 **독립성**(실행 순서 비의존) 유지.

## 결정성 (게임/애니메이션 필수)

- 러너 게임은 `requestAnimationFrame`·타이머·난수에 의존한다 → 테스트는 **반드시 결정적**으로.
  - 시간: `vi.useFakeTimers()` + `vi.setSystemTime()`, rAF는 가짜 클럭으로 스텝 구동.
  - 난수: seed 주입 가능한 RNG로 설계(테스트에서 고정 seed). `Math.random()` 직접 호출 지양.
  - 근거: 시간·랜덤이 그대로 들어간 테스트는 CI에서 flaky의 1순위 원인.

```ts
// DO — rAF/타이머 결정성
vi.useFakeTimers();
vi.setSystemTime(new Date('2026-01-01'));
// rAF를 fake clock에 연결해 프레임을 수동으로 진행
```

## 파일 위치 / 네이밍

- 테스트는 대상과 **같은 디렉토리**, `{대상}.test.ts`.
- 네이밍은 **should 형식**: `it('should keep fallback when chunk import fails', …)`.

## AI 행동 규칙

- 순수 함수 추가 시 **같은 PR에** 테스트 작성. 미루지 마라.
- 동적 import / rAF / 타이머 / 난수가 들어간 코드는 결정성 처리(fake timer·seed·import 모킹) 없이는 테스트 작성 금지.
- `unmount` 구현 시 누수 해제 테스트를 함께 작성.
- flaky 발견 시(같은 입력 다른 결과) 고치기 전 머지 금지. `it.skip` + 이슈 등록.

## 패턴 (DO / DON'T)

### 동작 검증

```ts
// DON'T — 내부 구현(state)에 결합
expect(loader._currentTier).toBe(2);

// DO — 관찰 가능한 결과
expect(container.querySelector('canvas')).not.toBeNull();
```

### 기타 금지/권장

| DON'T | DO |
|-------|-----|
| `any`/`as any`로 mock 타입 우회 | 실제 타입 기반 mock (`vi.mocked`) |
| 실시간 `Date.now()`/`Math.random()` 의존 | fake timer + 고정 seed |
| 내부 모듈 과도 모킹 | 경계(`import()`·`matchMedia`)만 모킹 |
| test 내 `console.log` 잔존 | 삭제 |
