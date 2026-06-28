---
title: 기본 코딩 규칙
stack: frontend
category: 공통
extends: []
---

# Base Coding Rules

> 모든 코드에 적용되는 기본 규칙이다. 다른 ruler 파일은 이 규칙을 상속한다.

## 기본 원칙

- 모든 응답/설명은 **한국어**로 작성한다.
- 추측하지 않는다 — 불확실하면 질문한다.
- 가정이 필요하면 `"다음과 같이 가정하고 진행합니다"`를 명시한다.
- 규칙 위반이 불가피한 경우 **이유를 주석으로 명시**한다.

## TypeScript

### 절대 금지

- `any` 타입 — `unknown` + 런타임 타입 가드 사용.
  - 근거: any는 호출자가 잘못된 타입을 넘겨도 컴파일러가 침묵. 버그는 런타임에야 드러나고, 추적이 어려운 곳에서 터진다.
- `@ts-ignore` / `@ts-expect-error` 남발 — 근본 원인 해결.
  - 근거: 주석으로 가린 타입 에러는 다음 리팩토링 때 표면화된다. 그때는 원래 컨텍스트가 사라져 있어 디버깅 비용이 폭증.
- 숫자 `enum` — `as const` + union type 사용.
  - 근거: numeric enum은 런타임 객체를 생성하고(번들 사이즈+), reverse lookup(`Foo[0]`)이 의도치 않게 가능해진다. `as const` 는 zero-cost.

### 필수

- `strict: true` 환경을 전제로 작성한다.
  - 근거: strict 미사용 환경에선 nullable 누락이 silent하게 통과. 한 군데만 strict 끄면 그 지점부터 타입 안전성이 무너진다.
- 제네릭은 의미 있는 이름(`TItem`, `TResponse`)을 사용한다.
  - 근거: `T`, `U`, `V` 단일 문자는 함수 시그니처를 읽어도 의미가 안 드러남. `TResponse` 한 단어면 "응답 타입" 즉시 인지.

## 네이밍

| 대상 | 규칙 | 예시 |
|------|------|------|
| 변수 / 함수 | camelCase | `getUserName` |
| 컴포넌트 / 타입 | PascalCase | `UserProfile` |
| 상수 | SCREAMING_SNAKE_CASE | `MAX_RETRY` |
| boolean | is/has/can/should 접두어 | `isLoading` |

## 함수

- 함수명은 **동사로 시작**한다 (`getUser`, `validateInput`).
- **side-effect 없는 로직은 순수 함수로 추출**. side-effect(API 호출, DOM, 시간/난수)는 hook / 서비스 경계 안에만.
  - 근거: 순수 함수는 테스트가 입력→출력 검증 한 줄. side-effect가 섞이면 mocking + setup이 누적되어 테스트 비용 ×N.
- 중첩 조건문 대신 **Early Return**을 사용한다.
- 매개변수가 3개 초과면 **객체 파라미터**로 변경한다.
  - 근거: 순서 의존 매개변수는 호출자가 `foo(orgId, userId, ...)` 와 `foo(userId, orgId, ...)` 를 헷갈리기 쉽다. 객체 파라미터는 키로 강제 — 컴파일러가 오타도 잡는다.

## AI 행동 규칙

- 새 파일/함수 생성 직전: 작업 디렉토리의 `ruler/*.md` 중 *관련 카테고리* 룰을 먼저 Read.
- 단일 컴포넌트/모듈 파일이 **200줄을 초과**한 채로 PR 제출 금지 — 그 시점에서 분리.
- 사용하지 않는 `import` 발견 시 즉시 제거. 주석 처리된 코드 발견 시 즉시 삭제(git history가 보존).
- 규칙 위반이 불가피하면 `// reason: ...` 주석으로 사유 명시. 주석 없이 위반 금지.

## 패턴 (DO / DON'T)

### any 타입

```ts
// DON'T
function parse(data: any) { return data.id; }

// DO
function parse(data: unknown): string {
  if (typeof data === 'object' && data !== null && 'id' in data) {
    return String(data.id);
  }
  throw new Error('invalid data');
}
```

### Early Return

```ts
// DON'T
function check(user) {
  if (user) {
    if (user.active) {
      if (user.verified) { return true; }
    }
  }
  return false;
}

// DO
function check(user) {
  if (!user) return false;
  if (!user.active) return false;
  if (!user.verified) return false;
  return true;
}
```

### 기타 금지/권장

| DON'T | DO |
|-------|-----|
| `console.log` / `console.warn` 디버깅용 커밋 | 전용 logger 유틸 또는 삭제 후 커밋 |
| 하드코딩된 API URL, 시크릿, 토큰 | 환경 변수 (`import.meta.env.*`) |
| 주석 처리된 코드 블록 | 삭제 (git history에 남음) |
| 설명 없는 `TODO` | `TODO(username, 2026-05): 이유/티켓 링크` |
