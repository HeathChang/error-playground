---
title: 스타일링
stack: library
category: 스타일
extends: [base.md]
---

# Styling (바닐라 CSS + CSS 변수, 프레임워크 없음)

> `base.md`를 상속한다. 이 프로젝트는 프레임워크 독립 **경량 라이브러리**다.
> **CSS 프레임워크(Tailwind 등) 사용 금지** — 용량 예산(`docs/PLAN.md` §11)과 "어디서든 div 하나로 동작"(프레임워크 독립) 원칙에 정면 충돌한다.

## 기본 원칙

- 스타일은 **표준 CSS**로 작성한다. Tailwind/styled-components 등 런타임·빌드 의존성을 추가하지 않는다.
  - 근거: 에러 페이지 임베드 라이브러리는 코어 ≤ 8KB(gzip)가 목표. CSS 프레임워크는 그 자체로 예산을 초과하고, 호스트 페이지가 무슨 프레임워크를 쓰든 동작해야 한다.
- 스타일은 **반드시 스코프**한다 — 호스트 페이지 CSS와 양방향 충돌 금지.
  - **1순위: Shadow DOM** 안에 스타일 주입(완전 격리).
  - 차선: 모든 클래스에 고유 prefix `ep-` 사용(`.ep-fallback`, `.ep-btn`). 전역 셀렉터(`button{}`, `*{}`) 금지.
- **하드코딩 금지** — 색·간격·폰트 값은 CSS 변수(디자인 토큰)로. 단, 토큰은 외부 설정 파일이 아니라 **컴포넌트 스타일 상단의 `:host`/루트에 선언**(라이브러리라 self-contained).

## 디자인 토큰 (CSS 커스텀 프로퍼티)

- 토큰 prefix는 `--ep-` (충돌 방지). 호스트가 값을 덮어써 테마를 바꿀 수 있게 **Shadow 경계를 관통**시킨다.
  - 근거: CSS 변수는 Shadow DOM 경계를 통과하는 거의 유일한 스타일 채널. 호스트가 `--ep-color-brand: …` 만 지정하면 내부 전체 테마가 바뀐다 → "순수 엔진"이 테마는 사용자에게 위임.

```css
/* 경험/코어 스타일 루트 (:host 또는 .ep-root) */
:host, .ep-root {
  --ep-color-text: #0f172a;
  --ep-color-bg: #f8fafc;
  --ep-color-brand: #0ea5e9;
  --ep-color-focus: #0ea5e9;
  --ep-space: 8px;
  --ep-radius: 8px;
}
@media (prefers-color-scheme: dark) {
  :host, .ep-root { --ep-color-text: #f8fafc; --ep-color-bg: #0f172a; }
}
```

```css
/* 사용 */
.ep-btn {
  color: var(--ep-color-text);
  background: var(--ep-color-bg);
  padding: calc(var(--ep-space) * 1.5);
  border-radius: var(--ep-radius);
}
```

## 테마 / 다크 모드

- 기본은 `prefers-color-scheme` 자동. `config.theme`('light'|'dark'|'auto')로 강제 가능 — 코어가 확정해 `:host` 에 토큰 값으로 반영.
- 호스트가 `--ep-*` 변수를 지정하면 그 값이 우선(사용자 커스텀 테마).

## 모션

- 모든 애니메이션/트랜지션은 `prefers-reduced-motion` 가드를 둔다(접근성 — `a11y.md` 참조).

```css
@media (prefers-reduced-motion: reduce) {
  .ep-anim { animation: none !important; transition: none !important; }
  /* reason: 모션 제거는 사용자 보호가 목적이라 특이도 강제가 정당 */
}
```

## 용량 의식

- 인라인 SVG/CSS 우선, 외부 폰트·이미지 import 지양(네트워크 추가 + CSP 충돌).
- 중복 셀렉터·미사용 규칙 제거. 큰 정적 에셋은 경험 청크 안에서 lazy fetch.

## AI 행동 규칙

- `tailwind`, `styled-components`, `emotion` 등 스타일 프레임워크 추가 시도 발견 시 **중단** — 이 프로젝트 원칙 위반. 표준 CSS로.
- 색·간격·폰트 리터럴(`#0ea5e9`, `13px`) 하드코딩 발견 시 `--ep-*` 토큰으로 교체. 일회성이면 `// reason: ...` 명시.
- 전역 셀렉터(`button{}`, `body{}`, `*{}`) 발견 시 즉시 `.ep-` 스코프로 한정 또는 Shadow DOM 이동.
- `requestAnimationFrame`/`animation` 작성 시 `prefers-reduced-motion` 가드 누락 금지.
- `!important` 는 모션 제거 등 정당 사유 외 금지 — 쓸 거면 `// reason:` 주석.

## 패턴 (DO / DON'T)

### 스코프

```css
/* DON'T — 호스트 페이지의 모든 버튼을 오염 */
button { background: #0ea5e9; }

/* DO — prefix 스코프 (또는 Shadow DOM 내부) */
.ep-btn { background: var(--ep-color-brand); }
```

### 동적 값

```ts
// DON'T — 인라인 스타일에 하드코딩 (테마/다크모드 전파 안 됨)
el.style.color = isActive ? '#0ea5e9' : '#64748b';

// DO — CSS 변수 토글 + 클래스
el.classList.toggle('ep-active', isActive);
```

### 기타 금지/권장

| DON'T | DO |
|-------|-----|
| Tailwind/CSS-in-JS 의존성 추가 | 표준 CSS + `--ep-*` 변수 |
| 전역 셀렉터 (`button{}`, `*{}`) | `.ep-` prefix 스코프 / Shadow DOM |
| 색·px 하드코딩 | `--ep-*` 토큰 |
| 외부 폰트 `<link>` | 시스템 폰트 스택 또는 인라인 |
| `!important` 남발 | 특이도 조정 (모션 제거만 예외) |
