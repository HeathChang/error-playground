---
title: 보안
stack: library
category: 보안
extends: [base.md]
---

# Security (경량 라이브러리)

> `base.md`를 상속한다. 이 프로젝트는 **서버·인증·DB가 없는** 정적 임베드 라이브러리다.
> 따라서 위협 모델은 ① **XSS**(호스트가 넘긴 메시지/외부 콘텐츠), ② **CSP 호환**, ③ **공급망**(npm 배포물)에 집중한다.

## XSS — 가장 중요

- 외부에서 들어온 문자열(`config.messages`, `locale`, URL 파라미터 등)은 **절대 `innerHTML`/`insertAdjacentHTML`/`document.write` 로 주입하지 않는다.** `textContent` / `createElement` + `append` 만 사용.
  - 근거: 호스트가 넘긴 메시지에 사용자 입력이 섞여 있을 수 있다. `innerHTML` 한 번이면 `<img onerror>` 류 XSS가 에러 페이지에서 실행된다.
- 불가피하게 HTML을 넣어야 하면 사유를 `// reason:` 로 명시하고 화이트리스트 새니타이즈(DOMPurify 등)를 거친다. 그조차 라이브러리 용량 예산상 지양.
- URL/쿼리 값은 사용 전 검증. `links.home` 같은 이동 URL은 **open redirect 방지**를 위해 스킴 확인(`javascript:` 거부, 상대경로/`http(s)`만 허용).

```ts
// DON'T — XSS
container.innerHTML = config.messages?.title ?? '';

// DO — 텍스트로만
const h1 = document.createElement('h1');
h1.textContent = config.messages?.title ?? '404';
container.append(h1);
```

```ts
// DO — 이동 URL 검증 (open redirect / javascript: 차단)
function safeHref(url: string): string {
  if (/^https?:\/\//i.test(url) || url.startsWith('/')) return url;
  return '/'; // reason: 안전하지 않은 스킴은 홈으로 폴백
}
```

## 동적 코드 / 스크립트 주입

- `eval` / `new Function` / 문자열 → 코드 실행 **금지**.
- 동적 `<script>` 태그 주입 금지. 경험 로드는 **표준 동적 `import()`** 만 사용(번들러가 추적·CSP 친화적).
- 동적 import 대상은 신뢰된 `assetBase` 로만 해석한다 — 호스트가 임의 오리진을 주입하지 못하도록 검증/문서화.

## CSP 호환

- 라이브러리는 **CSP가 엄격한 호스트**에서도 동작하도록 설계한다(`docs/PLAN.md` §13).
- 인라인 코어는 `script-src 'unsafe-inline'` 또는 **nonce/hash** 가 필요 → 빌드시 hash 제공, 안내 문서화. 불가 환경은 외부 코어 파일로 폴백.
- 동적 `import()` 청크 오리진(`assetBase`)을 `script-src` 에 허용하도록 안내.
- 인라인 스타일이 막힐 수 있으니 Shadow DOM + `<style>` (nonce) 또는 외부 CSS 폴백 경로를 둔다.
- iframe 경험(v2)은 `sandbox` 속성 + `frame-src` 격리.

## 시크릿 / 민감 정보

- 이 라이브러리는 **시크릿을 다루지 않는다.** API 키·토큰·인증 로직을 코어에 넣지 않는다.
- 어떤 값도 하드코딩하지 않는다(URL·키). 빌드 환경값이 필요하면 `import.meta.env.*`.
- 호스트 통합 가이드에 "에러 페이지 마크업/`config` 에 시크릿을 넣지 말 것"을 명시(에러 페이지는 캐시·크롤링되기 쉽다).
- `onEvent` 텔레메트리는 **옵트인**, 개인정보·PII 전송 금지.

## 공급망 (npm 배포물)

- 런타임 의존성은 **0(코어)** 을 유지한다. 추가 시 다운로드 수·최근 업데이트·알려진 취약점 확인.
- `npm audit` 경고를 무시하지 않는다.
- `postinstall` 등 설치 스크립트 추가 금지.
- 배포 전 `files` 화이트리스트로 산출물만 포함(소스/시크릿 유출 방지), 가능하면 provenance 서명.

## AI 행동 규칙

- `innerHTML` / `insertAdjacentHTML` / `document.write` 작성 시도 발견 시 즉시 `textContent`/DOM API로 교체. 불가피하면 새니타이즈 + `// reason:`.
- `eval` / `new Function` / 동적 `<script>` 발견 시 중단, 표준 `import()` 로 대체.
- 이동 URL(`links.home` 등)을 검증 없이 `location`/`href` 에 사용 시 스킴 검증 추가.
- 새 런타임 의존성 추가 시 사용자에게 용량·필요성 확인(코어는 의존성 0 원칙).

## 패턴 (DO / DON'T)

| DON'T | DO |
|-------|-----|
| `innerHTML = userText` | `textContent = userText` |
| `eval`, `new Function` | 정적 파싱 (`JSON.parse`) |
| 동적 `<script>` 주입 | 표준 `import()` + CSP 허용 |
| 검증 없는 redirect URL | 스킴/오리진 검증 후 사용 |
| 코어에 런타임 의존성 추가 | 의존성 0 유지, 무거운 건 v2 청크에서만 |
