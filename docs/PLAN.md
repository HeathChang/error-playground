# 404 Playground — 기획서 (v2, 고도화)

> 에러 페이지(404 / 500)를 "막다른 길"이 아니라 "잠깐 머물 수 있는 작은 놀이터"로 바꾸는 경량 임베드 라이브러리

**문서 상태:** 설계 확정 단계. v1(MVP) 범위와 장애 대응·논리 일관성까지 반영함.
변경 이력: v1 초안 → v2(이번) — *v1 스코프 분리, 500 장애 대응 명시, Public API 스펙, 빌드 텐션 해소, 논리 일관성 체크 추가*.

---

## 1. 배경 & 문제 정의

- 사용자가 잘못된 URL, 삭제된 페이지, 서버 장애 등으로 에러 페이지에 도달한다.
- 대부분의 에러 페이지는 **"404 Not Found"** 메시지 + 홈 버튼이 전부 → 사용자는 이탈한다.
- 대표 성공 사례: **Chrome 오프라인 공룡 게임(T-Rex Runner)**. 부정적 감정을 가벼운 인터랙션으로 전환.

**우리가 만들 것:** 어떤 프론트엔드 프로젝트에든 `div` 하나만 꽂으면 동작하는, 에러 페이지용 인터랙티브 경험 라이브러리.

---

## 2. 목표 (Goals) & 비목표 (Non-Goals)

### Goals
- ✅ **경량**: 초기 로드 부담 최소화. 에러 페이지 본연의 가벼움 유지.
- ✅ **프레임워크 독립적**: React / Vue / Svelte / Angular / 순수 HTML 어디서든 동일 동작.
- ✅ **정적 배포**: 산출물은 정적 JS/CSS. CDN `<script>`와 npm import 둘 다 지원.
- ✅ **확장 가능**: CSS → Canvas → 3D → iframe까지 단계적으로 끼울 수 있는 플러그인 구조.
- ✅ **장애에 강함(Resilient)**: JS·청크 로드가 실패해도 에러 정보는 **항상** 보인다. (500 대응의 핵심)

### Non-Goals
- ❌ 무거운 풀스택 게임 엔진 (에러 페이지 성격과 충돌)
- ❌ 라우팅·서버 에러 핸들링 자체 대체 (우리는 "표시 레이어"만)
- ❌ 특정 프레임워크 종속 컴포넌트 (코어는 순수, 래퍼만 옵션)

---

## 3. 설계 원칙 (Principles)

| 원칙 | 의미 | 구현 방향 |
| --- | --- | --- |
| **Tiny Core** | 코어 로더는 극단적으로 작게 | 코어 < 8KB(gzip) 목표. 무거운 경험은 동적 import |
| **Lazy by default** | 무거운 건 필요할 때만 | 게임/3D는 code-split 후 on-demand |
| **Fallback-first** | 에러 메시지가 1순위 | 정적 폴백을 **네트워크 0회**로 먼저 보장, 그 위에 경험을 얹음 |
| **Degrade gracefully** | 실패는 조용히 폴백 | 청크 로드 실패·미지원 환경은 하위 Tier 또는 폴백으로 |
| **Framework-agnostic** | DOM만 있으면 동작 | v1은 명령형 `mount()` (모든 프레임워크 커버), Custom Element는 v2 |
| **Respect the user** | 과하지 않게 | `prefers-reduced-motion` 존중, 키보드 접근성, 소리 기본 off |

---

## 4. v1 범위 (MVP) vs 이후 — 스코프 분리 ⭐

> **핵심 결정:** 완성형 비전을 한 번에 짓지 않는다. **얇게 동작하는 v1을 먼저 띄우고**, 수요가 확인되면 일반화한다. 아래 비전(§10 Tier, §6 API 등)은 전부 북극성이되, **v1에 실제로 넣는 건 IN 목록만**이다.

| 영역 | v1 (MVP) — **IN** | v2+ — **유보** | 유보 근거 |
| --- | --- | --- | --- |
| 통합 API | 명령형 `mount(el, config)` + **Custom Element `<error-playground>`** | — | `mount()`는 범용 명령형, CE는 모든 프레임워크용 선언적 태그 (2026-07-01 v1 승격) |
| 폴백 | Tier 0 정적 폴백 (인라인) | — | 장애 대응의 근간, 필수 |
| 경험 | **Canvas 러너 게임 1종** + contract 검증용 trivial 1종 | 다수 게임, CSS 모음 | 플래그십 1개로 아키텍처 검증 |
| 3D / iframe | ❌ | WebGL(Three.js), iframe 임베드 | 용량·복잡도 큼. 코어 검증 후 |
| 확장성 | `experience`에 **객체 직접 주입**(experimental) | 공개 플러그인 **등록 레지스트리** API | 수요 검증 전 공개 API 고정은 하위호환 부채 |
| Tier 선택 | 명시적 지정 + `isSupported()` 정적 체크 | 네트워크/디바이스 기반 **auto 휴리스틱** | 에러 페이지는 네트워크가 불안정 → 휴리스틱 신뢰도 낮음 |
| 빌드 | ESM + IIFE 둘 다 | UMD 등 추가 포맷 | 두 포맷이면 대부분 커버 |
| 예제 | vanilla + React | Vue/Svelte/Angular | 패턴 검증 후 확장 |
| i18n | `messages`/`locale` 주입(문자열 외부화) | 번들 i18n 풀세트 | 외부 주입이면 충분 |

**v1 완료 정의(Definition of Done):** 정적 404/500 페이지에 코어를 인라인 → 즉시 폴백 노출 → Canvas 러너가 동적 로드되어 플레이 가능 → 청크 로드를 강제로 실패시켜도 폴백이 유지됨 → vanilla·React 예제에서 동일 동작.

---

## 5. 아키텍처

### 5.1 전체 구조

```
┌─────────────────────────────────────────────┐
│  Host Page (어떤 프레임워크든)                  │
│   <div id="playground"> …정적 폴백 HTML… </div>│  ← 모드 B: 폴백을 미리 박아둠
│   <script> /* 인라인 코어 */ </script>         │  ← 네트워크 0회로 동작
└───────────────────┬─────────────────────────┘
                    │ mount(el, config)
                    ▼
┌─────────────────────────────────────────────┐
│  CORE (인라인 가능, 항상 동작)                  │
│   • config 파싱 / 기본값                       │
│   • 폴백 보장(기존 DOM 유지 또는 Tier0 렌더)    │
│   • prefers-reduced-motion / 지원여부 체크      │
│   • Experience 동적 import (assetBase 기준)     │
│   • 실패 시 폴백 유지(에러 삼킴) — graceful      │
│   • 마운트/언마운트 라이프사이클                 │
└───────────────────┬─────────────────────────┘
                    │ dynamic import()  (ESM 청크, CDN)
        ┌───────────┼───────────┬──────────────┐
        ▼           ▼           ▼              ▼
   ┌─────────┐ ┌─────────┐ ┌─────────┐  ┌──────────┐
   │ CSS/SVG │ │ Canvas  │ │  WebGL  │  │  iframe  │
   │  Anim   │ │ Runner  │ │  (3D)   │  │  Embed   │
   └─────────┘ └─────────┘ └─────────┘  └──────────┘
   v1: Canvas Runner만 (+ trivial 1종)   │ v2+
```

### 5.2 통합 모델: 두 가지 마운트 방식

장애 내성과 사용 편의를 모두 잡기 위해 코어는 **두 모드를 모두** 지원한다.

- **모드 A — 빈 div 렌더**: `<div id="ep"></div>` 만 두고 JS가 폴백·경험을 전부 렌더.
  - 장점: 가장 간단("div만 주면 됨"). 정적 호스팅(404.html)처럼 JS가 안정적으로 로드되는 환경에 적합.
  - 약점: **JS가 안 뜨면 빈 화면.** 500처럼 자산 로드가 불확실한 상황엔 부적합.
- **모드 B — 기존 DOM 향상(Progressive Enhancement)**: 컨테이너 안에 **진짜 폴백 HTML**(상태코드·메시지·홈 링크)을 미리 넣어두면, JS는 그것을 유지하다가 경험이 준비되면 그 위에 얹거나 교체.
  - 장점: **JS가 실패해도 정적 에러가 그대로 보인다.** → 500 대응의 정답.
  - **권장: 에러 페이지에는 모드 B + 코어 인라인.**

코어 판별 규칙: 컨테이너에 자식 노드가 있으면 → 그걸 폴백으로 간주(모드 B). 비어 있으면 → Tier 0을 렌더(모드 A).

### 5.3 코어 ↔ Experience 인터페이스

각 경험 모듈은 동일 계약을 구현 → 코어는 무엇을 로드하든 동일하게 다룸.

```ts
interface Experience {
  /** 마운트: 컨테이너와 컨텍스트를 받아 렌더 시작 */
  mount(container: HTMLElement, ctx: ExperienceContext): void | Promise<void>;
  /** 정리: 이벤트/rAF/WebGL 컨텍스트 해제 (누수 방지 필수) */
  unmount(): void;
  /** (선택) 현재 환경에서 동작 가능한가? false면 코어가 하위 Tier로 폴백 */
  isSupported?(): boolean;
}

interface ExperienceContext {
  status: number;                 // 404 | 500 | ...
  reducedMotion: boolean;         // 모션 최소화 선호
  theme: 'light' | 'dark';        // 'auto'는 코어가 해석해 확정값 전달
  locale: string;
  emit: (event: PlaygroundEvent) => void; // ready/start/score/gameover/error
  root: HTMLElement | ShadowRoot; // 스타일 격리 시 ShadowRoot 전달
}
```

> 새로운 경험은 이 인터페이스만 구현하면 끼울 수 있다 → **확장성 확보**. v1에선 이 객체를 `mount()`의 `experience`로 직접 넘길 수 있게만 열어둔다(공개 레지스트리는 v2).

### 5.4 장애 시 동작 (Graceful Degradation) — 실패 모드 매트릭스 ⭐

에러 페이지, 특히 **500은 서버/CDN이 부분적으로 죽은 상황**일 수 있다. "우리 자산이 안 불러와질 수 있다"를 1급 시나리오로 다룬다.

| 시나리오 | 동작 | 설계 장치 |
| --- | --- | --- |
| 코어 JS 자체가 로드 실패 | 모드 B면 **정적 폴백 그대로 노출** / 모드 A면 빈 화면 | → 에러 페이지엔 **모드 B + 코어 인라인** 권장 (인라인이면 외부 fetch 0회) |
| 코어는 떴으나 경험 청크 fetch 실패 | 폴백 유지, 에러 삼킴, `onEvent('error')` 통지, (선택) 1회 재시도 | dynamic import `try/catch` |
| WebGL/기능 미지원 | `isSupported()=false` → 하위 Tier 또는 폴백 | 정적 capability 체크 |
| JS 비활성(noscript) | 정적 폴백(모드 B) | `<noscript>`도 폴백과 동일 마크업 |
| `prefers-reduced-motion` | 애니메이션/게임 자동 정지 또는 opt-in 시작 | 컨텍스트로 전달 |
| CSP가 inline script 차단 | 외부 코어 파일 로드로 폴백(인라인 불가 시) | hash/nonce 안내(§13) |

**불변식(Invariant):** *어떤 실패 경로에서도 사용자는 최소한 "상태코드 + 핵심 메시지 + 홈/뒤로 링크"를 본다.* 이것이 깨지면 설계 실패.

---

## 6. Public API & Config 스펙

```ts
// 단일 진입점
function mount(
  target: string | HTMLElement,
  config?: PlaygroundConfig
): PlaygroundHandle;

interface PlaygroundConfig {
  status?: number;                       // 기본 404
  experience?: BuiltinName | Experience; // 'runner' | 커스텀 객체(experimental). 기본: 'runner'
  messages?: { title?: string; description?: string };
  links?: { home?: string; back?: boolean };
  theme?: 'light' | 'dark' | 'auto';     // 기본 'auto'
  locale?: string;                       // 기본 navigator 언어
  reducedMotion?: 'auto' | 'force' | 'off'; // 기본 'auto'(시스템 설정 따름)
  assetBase?: string;                    // 경험 청크 로드 기준 URL (인라인/타 오리진 대응)
  onEvent?: (e: PlaygroundEvent) => void;
}

interface PlaygroundHandle {
  unmount(): void;                       // 모든 리소스 정리
  setExperience(name: BuiltinName | Experience): Promise<void>;
}

type BuiltinName = 'runner';            // v1. 이후 확장
type PlaygroundEvent =
  | { type: 'ready' }
  | { type: 'start' }
  | { type: 'score'; value: number }
  | { type: 'gameover'; score: number }
  | { type: 'error'; cause: unknown };
```

설계 메모:
- `experience`에 **객체를 직접 주입**할 수 있게 한 것이 v1의 확장 escape hatch (레지스트리 없이도 커스텀 가능, `experimental` 표기).
- `assetBase`는 §8의 "IIFE 인라인 코어 + ESM 청크" 텐션을 푸는 핵심 설정.
- `theme:'auto'`/`reducedMotion:'auto'`는 코어가 시스템 값을 읽어 **확정값**으로 바꿔 컨텍스트에 전달(경험은 분기 불필요).

---

## 7. 기술 스택

| 영역 | 선택 | 이유 |
| --- | --- | --- |
| 언어 | **TypeScript** | 플러그인 계약 안정성, DX |
| 빌드 | **Vite (library mode)** | code-splitting, 다중 포맷 출력 |
| 산출물 | **ESM + IIFE** | ESM=번들러/npm·청크, IIFE=CDN/인라인 코어 |
| 3D | Three.js (v2, Tier 3에서만) | 동적 import로 격리 |
| 스타일 격리 | `attachShadow` (선택) + CSS 변수 | Custom Element 없이도 격리 가능 |
| 테스트 | Vitest + Playwright | 유닛 + 크로스브라우저 스모크 |
| 패키지 | 단일 패키지 + code-split | 모노레포는 경험이 많아지면 |

---

## 8. 빌드 & 배포 — "IIFE 단일 파일"과 "lazy load"의 텐션 해소 ⭐

순진하게 "IIFE 한 파일 + lazy load"를 같이 두면 모순처럼 보인다(IIFE는 보통 단일 번들). 해소안:

- **ESM 빌드**: `error-playground.js` + 경험 청크(`runner-[hash].js`) 자동 code-split. `import()` 자연 동작. → npm/번들러용.
- **IIFE 빌드**: **코어만** `error-playground.iife.js`로. 극소 사이즈라 **HTML에 인라인 가능**. 경험은 런타임에 **동적 `import()`로 ESM 청크를 로드**(모든 에버그린 브라우저는 classic script에서도 `import()` 지원).
  - 청크 경로는 `config.assetBase`(또는 전역 `window.__EP_BASE__`)로 해석 → 코어를 인라인하거나 다른 오리진에 둬도 청크가 올바로 로드됨.
- 결과: **코어는 한 줄 인라인(장애 내성), 경험은 lazy 청크(경량)** 가 동시에 성립.

CI 게이트:
- 코어 gzip 사이즈 예산 검사(초과 시 실패).
- 경험 청크는 별도 예산.
- `import()` 실패 주입 테스트(네트워크 차단) → 폴백 유지 확인.

---

## 9. 통합 예시

### 9.1 정적 페이지 (권장: 모드 B + 인라인 코어)
```html
<div id="ep">
  <!-- 정적 폴백: JS 실패해도 이건 보인다 -->
  <h1>404 — 페이지를 찾을 수 없어요</h1>
  <a href="/">홈으로</a>
</div>
<script>/* error-playground.iife.js 내용 인라인 */</script>
<script>
  ErrorPlayground.mount('#ep', { status: 404, assetBase: 'https://cdn.example.com/ep/' });
</script>
```

### 9.2 React
```tsx
import { mount } from 'error-playground';
useEffect(() => {
  const h = mount(ref.current, { status: 404 });
  return () => h.unmount();
}, []);
return <div ref={ref}><h1>404</h1><a href="/">홈</a></div>; // 폴백 동봉
```

### 9.3 Vue / 기타 (v1은 동일 `mount()` 사용, CE 래퍼는 v2)

---

## 10. Experience 로드맵 — Tier 카탈로그 (북극성)

용량/복잡도 순. **v1은 Tier 2(러너)만 실제 구현**, 나머지는 카탈로그.

| Tier | 방식 | 예상 용량 | 예시 | 의존성 | v1? |
| --- | --- | --- | --- | --- | --- |
| **0** | 정적 폴백 | ~1–2KB | 상태코드+메시지+홈 | 없음 | ✅ (코어 내장) |
| **1** | CSS/SVG | ~3–5KB | 떠다니는 캐릭터, 글리치 | 없음 | △ (contract 검증용 trivial만) |
| **2** | Canvas 2D | ~10–20KB | **공룡게임류 러너** | 없음 | ✅ 플래그십 |
| **3** | WebGL/3D | lazy ~150KB+ | 3D 씬 | Three.js | ❌ v2+ |
| **4** | iframe | 가변 | 외부 게임/콘텐츠 | sandbox | ❌ v2+ |

---

## 11. 번들 사이즈 예산

- 코어는 **블로킹 없이** 즉시 폴백 보장 → 사용자는 항상 0.1초 내 에러 정보를 본다.
- 무거운 경험은 분리 청크 → 에러 페이지 초기 로드에 미포함.
- 인라인 SVG/CSS 우선, 에셋은 lazy fetch.
- 예산(초기 목표): **코어 ≤ 8KB gzip**, 러너 청크 ≤ 20KB gzip. CI에서 강제.

---

## 12. 디렉토리 구조 (제안)

```
404-playground/
├── docs/PLAN.md                # (이 문서)
├── src/
│   ├── core/
│   │   ├── index.ts            # public API: mount()
│   │   ├── fallback.ts         # Tier 0 / 모드 A·B 판별
│   │   ├── loader.ts           # 동적 import + assetBase + 실패 폴백
│   │   ├── context.ts          # theme/reduced-motion/locale 확정
│   │   └── types.ts            # Experience / Config / Event
│   └── experiences/
│       ├── runner/             # Tier 2 플래그십 (Canvas)
│       └── _noop/              # contract 검증용 trivial
├── examples/                   # vanilla / react
├── package.json
├── tsconfig.json
└── vite.config.ts              # ESM + IIFE 2-빌드
```

---

## 13. 보안 / CSP

- **인라인 코어**는 `script-src 'unsafe-inline'` 또는 **nonce/hash**가 필요 → 빌드시 hash 제공, 안내 문서화. 불가 환경은 외부 코어 파일로 폴백(장애 내성은 소폭 감소, 트레이드오프 명시).
- 동적 `import()`는 `script-src`에 청크 오리진(`assetBase`) 허용 필요.
- iframe Tier(v2)는 `frame-src` + `sandbox` 속성으로 격리.
- 외부 입력(`messages`)은 텍스트로만 삽입(XSS 방지, `innerHTML` 금지).

---

## 14. 접근성 & UX 가드레일

- **에러 정보 우선**: 어떤 경험이든 상태코드·핵심 메시지·홈/뒤로 링크는 항상 노출(불변식, §5.4).
- `prefers-reduced-motion: reduce` → 애니메이션 정지/축소, 게임은 opt-in 시작.
- 키보드 완전 조작, 포커스 트랩 금지, 링크 우선 포커스.
- 소리 기본 OFF, 사용자 액션 후에만.
- 다국어: `messages`/`locale` 외부 주입.

---

## 15. 테스트 & 품질

- **유닛(Vitest)**: config 파싱/기본값, 모드 A·B 판별, `import()` 실패 시 폴백 유지, 컨텍스트 확정 로직.
- **스모크(Playwright)**: vanilla·React에서 마운트→폴백 노출→경험 로드→`unmount` 후 rAF/리스너 누수 0.
- **장애 주입**: 청크 요청 네트워크 차단 → 폴백 유지·`error` 이벤트 발생 검증.
- **사이즈 예산**: 코어/청크 gzip 한도 CI 게이트.

---

## 16. 개발 마일스톤 (v1)

| 단계 | 산출물 | 완료 기준 |
| --- | --- | --- |
| **M0 — 스캐폴딩** | Vite+TS, ESM+IIFE 2-빌드, 빈 코어 | `mount()` → Tier 0 폴백 렌더, 두 포맷 빌드 성공 |
| **M1 — 코어 엔진** | `Experience` 계약, loader(동적 import+assetBase), 모드 A·B, graceful 폴백 | trivial 경험 로드/언마운트, **청크 실패 시 폴백 유지** 검증, 사이즈 예산 통과 |
| **M2 — 플래그십: Canvas 러너** | 공룡게임류 러너 | 키보드/터치, 점수, 재시작, reduced-motion 대응, 이벤트 emit |
| **M3 — 통합 예제 + 문서** | vanilla/React 예제, README/API | 두 환경 동일 동작, 인라인 코어+모드 B 데모, CSP 안내 |

> 3D·공개 레지스트리·auto Tier는 **v2 백로그**. (Custom Element·iframe은 승격 — CE 2026-07-01, iframe 2026-07-04. 3D는 경량 원칙상 보류)

---

## 17. 확정된 결정 사항

| 항목 | 결정 |
| --- | --- |
| 1차 플래그십 경험 | **Canvas 2D 러너(공룡게임류)** |
| 배포 형태 | **CDN(IIFE/인라인) + npm(ESM) 둘 다** |
| 프로젝트 성격 | **순수 엔진 + 기본 콘텐츠** (커스텀 주입 가능) |
| v1 통합 API | **명령형 `mount()` + Custom Element `<error-playground>`** (CE v1 승격, 2026-07-01) |
| 에러 페이지 권장 패턴 | **모드 B(기존 DOM 향상) + 코어 인라인** |
| 확장 방식(v1) | `experience` 객체 직접 주입(experimental), 공개 레지스트리는 v2 |
| 타겟 프레임워크 검증 | vanilla + React 우선 (나머지 v2) |

---

## 18. 논리적 일관성 체크 ⭐

기획 과정에서 발견한 모순/충돌과 해소안. (각 항목은 위 본문에 반영됨)

| # | 충돌 | 해소 |
| --- | --- | --- |
| 1 | "폴백을 먼저 보장" ↔ "`<script src>`로 로드"(JS 안 뜨면 폴백도 없음) | **코어 인라인 + 모드 B**(기존 DOM 향상)로 네트워크 0회 폴백 보장 (§5.2/§5.4) |
| 2 | "lazy load" ↔ "IIFE 단일 파일"(보통 단일 번들) | **코어 IIFE + 동적 `import()` ESM 청크 + `assetBase`**로 양립 (§8) |
| 3 | "프레임워크 독립 = Web Components 필요" ↔ "v1 얇게" | **`mount(el,config)`만으로 모든 프레임워크 커버** → CE는 부가 편의로 v2 강등. 스타일 격리는 `attachShadow`로 CE 없이도 가능 (§4/§7) |
| 4 | "auto Tier(네트워크 기반 선택)" ↔ "에러 페이지는 네트워크 불안정" | auto 휴리스틱 **v2 유보**, v1은 명시 지정 + 정적 `isSupported()`만 (§4/§10) |
| 5 | "엔진+SDK 제공" ↔ "수요 검증 전 공개 API 고정 = 하위호환 부채" | 공개 **레지스트리 보류**, 대신 `experience` **객체 직접 주입**으로 확장 욕구 흡수(experimental) (§6) |
| 6 | "코어 8KB 예산" ↔ "Canvas 게임 포함하면 초과?" | 게임은 **별도 청크** → 코어 예산과 독립. 일관됨 (§8/§11) |
| 7 | "Shadow DOM 스타일 격리" ↔ "사용자 테마 적용 필요" | **CSS 변수로 shadow 경계 관통** + `theme` 확정값 전달 (§5.3/§7) |
| 8 | "정적 폴백 항상 노출"(불변식) ↔ 다양한 실패 경로 | §5.4 **실패 모드 매트릭스**로 모든 경로에서 불변식 유지 검증 |

미해결/추적 항목(v2에서 결정):
- CE 도입 시 React 19 이전 버전의 prop/event 상호운용 디테일.
- 3D 청크의 트리셰이킹 후 실제 용량 측정(목표 대비).
- iframe 콘텐츠의 출처/심사 정책.

---

## 19. 요약

> **"Tiny Core + Lazy Experiences + Fallback-first"**.
> 코어는 **인라인 가능한 극경량 로더**로 어떤 환경에서도 즉시 에러 폴백을 보장하고(500에도 강함), 무거운 콘텐츠(게임·3D)는 **동적 청크**로 필요할 때만 로드한다.
> v1은 **`mount()` + Canvas 러너**로 얇게 검증하고, Custom Element·3D·iframe·플러그인 SDK는 수요 확인 후 일반화한다.
> 발견된 8개 논리 충돌은 모두 해소(§18), 불변식 "에러 정보는 항상 보인다"가 설계 전반을 관통한다.
