# 404 Playground — 기획서 (v3, SSOT 정합화)

> 에러 페이지(404 / 500)를 "막다른 길"이 아니라 "잠깐 머물 수 있는 작은 놀이터"로 바꾸는 경량 임베드 라이브러리

**문서 상태:** 설계 확정 + 코드 정합화. 이 문서는 `ruler/vision.md`(SSOT, WHAT)를 기술적으로 구체화한 **HOW 문서**다.
**문서 위계:** `ruler/vision.md`(범위·SSOT) ▸ **`docs/PLAN.md`(설계·이 문서)** ▸ `ruler/*.md`(코드 규칙). 충돌 시 vision.md 우선.

변경 이력:
- v1 초안 → v2 — v1 스코프 분리, 500 장애 대응, Public API 스펙, 빌드 텐션 해소.
- **v2 → v3 (2026-07-16) — 현재 In Scope(vision.md §4) 정합화.** Custom Element·iframe·7개 경험(러너·큐브·플래피·스태커·오빗·리듬 + noop)·공통 콘솔(`gameMachine`)·`canvas.ts`를 본문에 반영하고, 누락돼 있던 4개 계약(**게임 콘솔/카트리지 §5.5**, **iframe 보안 경계 §5.6**, **Public API 실체 §6**, **Custom Element 라이프사이클 §6.4**)을 문서화. v1-only 잔재(러너 1종·CE/iframe v2 표기) 제거.
- **v3 → v3.1 (2026-07-16) — ARCHITECTURE_REVIEW 블로커/메이저 해소.** ① 불변식 **적용 범위 명시**(§5.4) — 모드 A 한계("코어 JS 실패 시 빈 화면")와의 모순 제거, vision.md §3("경험 청크 로드 실패") 스코프와 정합. ② iframe 보안 정책 **확정/에스컬레이션 분리**(§5.6) — D1–D6은 `security.md`·불변식이 강제하는 안전 기본값으로 **확정**, 제품 결정인 D7(콘텐츠 출처 정책)만 유저 승인. ③ **이름↔청크 매핑·청크별 예산·로드 실패 유지 정책** 명문화(§6.2/§6.3/§11). ④ **CE Shadow DOM 미사용** 확정(§6.4). ⑤ **`canvas.ts` 소유권 경계** 명시(§5.5).

---

## 1. 배경 & 문제 정의

- 사용자가 잘못된 URL, 삭제된 페이지, 서버 장애 등으로 에러 페이지에 도달한다.
- 대부분의 에러 페이지는 **"404 Not Found"** 메시지 + 홈 버튼이 전부 → 사용자는 이탈한다.
- 대표 성공 사례: **Chrome 오프라인 공룡 게임(T-Rex Runner)**. 부정적 감정을 가벼운 인터랙션으로 전환.

**우리가 만들 것:** 어떤 프론트엔드 프로젝트에든 `div` 하나(또는 태그 하나)만 꽂으면 동작하는, 에러 페이지용 인터랙티브 경험 라이브러리.

---

## 2. 목표 (Goals) & 비목표 (Non-Goals)

### Goals
- ✅ **경량**: 초기 로드 부담 최소화. 에러 페이지 본연의 가벼움 유지 (코어 ESM ≤ 8KB gzip).
- ✅ **프레임워크 독립적**: React / Vue / Svelte / Angular / 순수 HTML 어디서든 동일 동작 — 명령형 `mount()`와 선언적 `<error-playground>` 태그 둘 다.
- ✅ **정적 배포**: 산출물은 정적 JS/CSS. CDN `<script>`(IIFE 인라인)와 npm import(ESM) 둘 다 지원.
- ✅ **확장 가능**: CSS → Canvas → iframe까지 단계적으로 끼울 수 있는 플러그인 구조. 게임은 공통 콘솔(`gameMachine`)에 꽂는 카트리지로 교체.
- ✅ **장애에 강함(Resilient)**: JS·청크 로드가 실패해도 에러 정보는 **항상** 보인다. (500 대응의 핵심, 불변식)

### Non-Goals
- ❌ 무거운 풀스택 게임 엔진 (에러 페이지 성격과 충돌)
- ❌ 라우팅·서버 에러 핸들링 자체 대체 (우리는 "표시 레이어"만)
- ❌ 특정 프레임워크 종속 컴포넌트 (코어는 순수 바닐라 TS, 프레임워크는 examples/에서만)
- ❌ WebGL/3D(Three.js), 공개 플러그인 등록 레지스트리, 네트워크 기반 auto Tier — vision.md §5 Out of Scope

---

## 3. 설계 원칙 (Principles)

| 원칙 | 의미 | 구현 방향 |
| --- | --- | --- |
| **Tiny Core** | 코어 로더는 극단적으로 작게 | 코어 ESM < 8KB(gzip) 하드 게이트. 무거운 경험은 동적 import |
| **Lazy by default** | 무거운 건 필요할 때만 | 게임/iframe은 code-split 후 on-demand 청크 |
| **Fallback-first** | 에러 메시지가 1순위 | 정적 폴백을 **네트워크 0회**로 먼저 보장, 그 위에 경험을 얹음 |
| **Degrade gracefully** | 실패는 조용히 폴백 | 청크 로드 실패·미지원 환경은 폴백 유지 + `error` 이벤트(throw 안 함) |
| **Framework-agnostic** | DOM만 있으면 동작 | 명령형 `mount(el,config)` + 표준 Custom Element `<error-playground>` → 모든 프레임워크 커버. 스타일 격리는 `attachShadow`(선택) |
| **One console, many cartridges** | 게임은 교체 가능한 카트리지 | 공통 콘솔 `gameMachine`이 루프·입력·이벤트·정리를 담당, 게임은 순수 로직만 (§5.5) |
| **Respect the user** | 과하지 않게 | `prefers-reduced-motion` 존중(첫 입력 opt-in), 키보드 접근성, 소리 기본 off |

---

## 4. 범위 (Scope) — vision.md §4/§5 정합 ⭐

> vision.md가 SSOT다. 아래는 그 범위를 설계 관점에서 정리한 것이며, 항목 추가/삭제는 **Guardian 제안 → 유저 승인**으로만 vision.md에 반영된다.

| 영역 | In Scope (구현 완료/대상) | Out of Scope (vision.md §5) | 근거 |
| --- | --- | --- | --- |
| 통합 API | 명령형 `mount(el, config)` + **Custom Element `<error-playground>`** | — | `mount()`=범용 명령형, CE=모든 프레임워크용 선언적 태그 (vision §4, CE v1 승격 2026-07-01) |
| 폴백 | Tier 0 정적 폴백 (인라인, 모드 A/B) | — | 장애 대응의 근간, 필수 |
| 경험(게임) | **러너·큐브·플래피·스태커·오빗·리듬·중력반전·타이밍스톱·지그재그·로터·벽점프** + contract 검증용 `noop` | 다수 게임 무한 확장(장르 중복) | 공통 콘솔로 카트리지처럼 구동 (vision §4, 2026-07-08~07-20) |
| 게임 배관 | 공통 콘솔 **`gameMachine`** + Canvas 공통 헬퍼 **`canvas.ts`** | — | 6종 canvas/CSS-3D 게임 중복 제거 (vision §4, 2026-07-14) |
| iframe | **sandbox iframe 임베드** (Tier 4) | — | 외부 콘텐츠 오프로드 (vision §4, v2 승격 2026-07-04). 보안 경계 §5.6 |
| 3D | ❌ | **WebGL(Three.js)** | 용량(~150KB)이 경량 정신과 충돌 (vision §5) |
| 확장성 | `experience`에 **객체 직접 주입**(experimental) | 공개 플러그인 **등록 레지스트리** API | 수요 검증 전 공개 API 고정은 하위호환 부채 (vision §5) |
| Tier 선택 | 명시적 지정 + `isSupported()` 정적 체크 | 네트워크/디바이스 기반 **auto 휴리스틱** | 에러 페이지는 네트워크 불안정 (vision §5) |
| 빌드 | ESM + IIFE 둘 다 | UMD 등 추가 포맷 | 두 포맷이면 대부분 커버 |
| 예제 | vanilla + React | Vue/Svelte/Angular | 패턴 검증 후 확장 |
| i18n | `messages`/`locale` 주입(문자열 외부화) | 번들 i18n 풀세트 | 외부 주입이면 충분 |

**성공 기준(vision.md §3):** 코어 ESM ≤ 8KB gzip / `div`+`mount()` 한 줄 동작(프레임워크 무관) / 경험 청크 로드 실패해도 에러 정보 항상 노출(불변식) / 폴백은 네트워크 0회 즉시 렌더.

---

## 5. 아키텍처

### 5.1 전체 구조

```
┌─────────────────────────────────────────────┐
│  Host Page (어떤 프레임워크든)                  │
│   <div id="playground"> …정적 폴백 HTML… </div>│  ← 모드 B: 폴백을 미리 박아둠
│   또는 <error-playground status="404" …>       │  ← 선언적 태그(자동 등록)
│   <script> /* 인라인 코어 IIFE */ </script>     │  ← 네트워크 0회로 동작
└───────────────────┬─────────────────────────┘
                    │ mount(el, config)  /  CE connectedCallback
                    ▼
┌─────────────────────────────────────────────┐
│  CORE (인라인 가능, 항상 동작)                  │
│   • config 파싱 / 기본값                       │
│   • 폴백 보장(기존 DOM 유지 또는 Tier0 렌더)    │
│   • theme / reduced-motion / locale 확정        │
│   • Experience 동적 import (assetBase 기준)     │
│   • generation(loadToken)으로 경험 전환 경쟁 차단│
│   • 실패 시 폴백 유지(에러 삼킴) — graceful      │
│   • 마운트/언마운트 라이프사이클                 │
└───────────────────┬─────────────────────────┘
                    │ dynamic import()  (ESM 청크, CDN)
        ┌───────────┼─────────────┬───────────────┐
        ▼           ▼             ▼               ▼
   ┌─────────┐ ┌───────────────────────┐   ┌──────────┐
   │  noop   │ │  gameMachine (콘솔)     │   │  iframe  │
   │(contract│ │  ┌──────────────────┐  │   │  Embed   │
   │  검증)  │ │  │ 카트리지(Game)     │  │   │ (Tier 4) │
   └─────────┘ │  │ runner/cube/flappy│  │   └──────────┘
               │  │ /stacker/orbit    │  │
               │  │ /rhythm           │  │
               │  └──────────────────┘  │
               └───────────────────────┘
               Canvas 2D(canvas.ts) + CSS-3D(cube)
```

### 5.2 통합 모델: 두 가지 마운트 방식 + 두 가지 API

**API 두 가지 (동일 코어 위):**
- **명령형 `mount(el, config)`** — ref/DOM만 있으면 모든 프레임워크에서 동작.
- **선언적 `<error-playground>`** — 표준 Custom Element. import(또는 IIFE 로드)만 하면 자동 등록. 속성/`config` property로 설정. (계약 §6.4)

**마운트 두 모드 (장애 내성):**
- **모드 A — 빈 div 렌더**: `<div id="ep"></div>`만 두고 JS가 폴백·경험을 전부 렌더.
  - 장점: 가장 간단. 정적 호스팅(404.html)처럼 JS가 안정적으로 로드되는 환경에 적합.
  - 약점: **JS가 안 뜨면 빈 화면.** 500처럼 자산 로드가 불확실한 상황엔 부적합.
- **모드 B — 기존 DOM 향상(Progressive Enhancement)**: 컨테이너 안에 **진짜 폴백 HTML**(상태코드·메시지·홈 링크)을 미리 넣어두면, JS는 그것을 유지하다가 경험이 준비되면 그 위에 얹는다(오버레이).
  - 장점: **JS가 실패해도 정적 에러가 그대로 보인다.** → 500 대응의 정답.
  - **권장: 에러 페이지에는 모드 B + 코어 인라인.**

코어 판별 규칙(`detectMode`): 컨테이너에 자식 노드가 있으면 → 폴백으로 간주(모드 B). 비어 있으면 → Tier 0을 렌더(모드 A). 경험은 `position:absolute; inset:0` 호스트에 얹혀 폴백 위를 덮되, 폴백 DOM은 **제거하지 않고 유지**한다(경험 언마운트 시 그대로 노출).

### 5.3 코어 ↔ Experience 인터페이스 (`src/core/types.ts`)

각 경험 모듈은 동일 계약을 구현 → 코어는 무엇을 로드하든 동일하게 다룸.

```ts
interface Experience {
  /** 마운트: 컨테이너와 컨텍스트를 받아 렌더 시작 */
  mount(container: HTMLElement, ctx: ExperienceContext): void | Promise<void>;
  /** 정리: 이벤트/rAF/타이머/자식 노드 해제 (누수 방지 필수) */
  unmount(): void;
  /** (선택) 현재 환경에서 동작 가능한가? false면 코어가 폴백 유지 */
  isSupported?(): boolean;
}

interface ExperienceContext {
  status: number;                 // 404 | 500 | ...
  reducedMotion: boolean;         // 코어가 'auto'/'force'/'off'를 확정한 값
  theme: 'light' | 'dark';        // 'auto'는 코어가 해석해 확정값 전달
  locale: string;
  emit: (event: PlaygroundEvent) => void; // ready/start/score/gameover/error
  root: HTMLElement | ShadowRoot; // 스타일 격리 시 ShadowRoot 전달
  options?: Record<string, unknown>; // config.options 패스스루 (경험별 파라미터, 예: iframe src)
}
```

경험 모듈은 `export function create(): Experience` 팩토리(또는 `default`)를 노출한다. 코어 로더가 이를 호출해 인스턴스를 얻는다. v1에선 이 객체를 `mount()`의 `experience`로 **직접** 넘길 수도 있다(experimental). 공개 레지스트리는 Out of Scope.

### 5.4 장애 시 동작 (Graceful Degradation) — 실패 모드 매트릭스 ⭐

에러 페이지, 특히 **500은 서버/CDN이 부분적으로 죽은 상황**일 수 있다. "우리 자산이 안 불러와질 수 있다"를 1급 시나리오로 다룬다.

| 시나리오 | 동작 | 설계 장치 |
| --- | --- | --- |
| 코어 JS 자체가 로드 실패 | 모드 B면 **정적 폴백 그대로 노출** / 모드 A면 빈 화면 | → **모드 B + 코어 인라인** 권장 (인라인이면 외부 fetch 0회) |
| 코어는 떴으나 경험 청크 import 실패 | 폴백 유지, throw 안 함, `onEvent('error')` 통지 | `load()`의 `try/catch` → `emit({type:'error'})` |
| 알 수 없는 경험 이름 / 계약 위반 객체 | `resolveExperience`가 throw → 코어가 삼켜 폴백 유지 + `error` 이벤트 | 로더가 이름을 BUILTINS에서 못 찾으면 throw |
| `isSupported()=false` (canvas/CSS-3D 미지원 등) | 경험 미마운트, **폴백 유지** (에러 아님) | 정적 capability 체크 (`canvasSupported`/`cubeSupported`) |
| JS 비활성(noscript) | 정적 폴백(모드 B) | `<noscript>`도 폴백과 동일 마크업 |
| `prefers-reduced-motion` | 게임 루프는 **첫 입력(opt-in) 후에만** 시작 | 컨텍스트로 전달 → 콘솔이 opt-in 처리 (§5.5) |
| CSP가 inline script 차단 | 외부 코어 파일 로드로 폴백(인라인 불가 시) | hash/nonce 안내(§13) |

**불변식(Invariant) — 적용 범위 명시 ⭐:** 사용자는 최소한 "상태코드 + 핵심 메시지 + 홈/뒤로 링크"를 본다. 이 불변식은 **정확히 두 범위**에서 성립한다:

1. **정적 모드 B (코어 로드 전 포함):** 폴백 HTML이 마크업에 직접 박혀 있으므로 **코어 JS가 아예 안 떠도** 보인다. → 코어 로드 자체를 담보하는 유일한 경로.
2. **코어 실행 이후 (모드 A·B 공통):** 경험 청크 import 실패·계약 위반·미지원·언마운트 등 **코어 실행 후의 어떤 실패 경로에서도** 폴백은 유지된다. 폴백 DOM은 경험이 성공적으로 마운트돼도 **제거되지 않고** 뒤에 남아, 경험 언마운트/실패 시 즉시 다시 보인다.

> **알려진 한계(모드 A):** 모드 A는 **코어 JS 자체가 로드 실패**하면 빈 화면이다(위 매트릭스 1행). 이는 불변식 위반이 아니라 모드 A의 정의상 한계이며, 바로 이 때문에 500 등 **자산 로드가 불확실한 상황엔 모드 B + 코어 인라인을 권장**한다. vision.md §3의 불변식도 *"경험 청크 로드가 실패해도"* 로 스코프되어 있다(코어 로드 자체는 모드 B가 담보). **위 1·2 범위 안에서 폴백이 사라지면** 그때가 설계 실패다.

### 5.5 게임 콘솔 ↔ 카트리지 계약 (`src/experiences/machine.ts`) ⭐ (신규)

게임은 공통 콘솔 **`gameMachine`** 에 꽂는 **카트리지(`Game`)** 다. 콘솔이 배관을 전담하므로 게임은 순수 로직만 작성한다 → 러너·큐브·플래피·스태커·오빗·리듬·중력반전·타이밍스톱·지그재그·로터·벽점프가 동일 lifecycle을 공유한다.

**카트리지 계약(`Game`):**
```ts
type GameStatus = 'ready' | 'running' | 'over';
interface GameEnv { host: HTMLElement; theme: 'light'|'dark'; reducedMotion: boolean; width: number; height: number; }
interface Game {
  readonly status: GameStatus;   // 콘솔이 이벤트 발화를 위해 읽음
  readonly score: number;        // 콘솔이 마일스톤 이벤트를 위해 읽음
  input(): void;                 // 단일(원버튼) 입력 — 좌표 없음
  step(dt: number): void;        // 순수 로직 갱신 (고정 timestep)
  render(): void;                // 그리기 (Canvas 또는 DOM/CSS 갱신)
  destroy(): void;               // 카트리지 소유 노드/리소스 해제
}
type GameFactory = (env: GameEnv) => Game;
function gameMachine(factory: GameFactory, isSupported?: () => boolean): Experience;
```

**소유권 경계 (콘솔이 담당 / 카트리지가 담당):**

| 관심사 | 콘솔(`gameMachine`) | 카트리지(`game.ts`/`index.ts`) |
| --- | --- | --- |
| 게임 루프 | 고정 timestep `STEP=1/60`, `MAX_FRAME=0.25`(스파이럴 방지) rAF 누적 | `step(dt)`만 구현 |
| 입력 | `keydown`(Space/↑, `preventDefault`) + `pointerdown` → `game.input()` 라우팅 | `input()`에서 상태 전이(ready→running, over→재시작, running→플레이 동작) |
| 시작 | 첫 입력 전까지 루프 미가동(reduced-motion opt-in), 초기 `render()`로 ready 화면만 | — |
| 이벤트 emit | `start`(ready→running), `score`(점수 100 단위 마일스톤), `gameover`(running→over) | 이벤트를 직접 emit하지 않음. **상태·점수만 노출** |
| 리사이즈 | `ResizeObserver`(200ms 디바운스, >4px 변화 시 `destroy()`+재생성) | 재생성 시 새 `GameEnv`로 다시 만들어짐(상태 비영속) |
| 사이징 | 컨테이너 채우고 캡(가로 240–560 / 세로 160–340, 높이 0이면 220) 적용, 가운데 정렬 | `env.width/height`를 논리 캔버스 크기로 사용 |
| RNG/clock 주입 | clock = rAF 타임스탬프 → `dt`(고정 timestep으로 프레임률과 분리) | RNG = `makeSeed(salt)` 런타임 시드. **테스트는 game.ts에 고정 seed 직접 주입** → 결정성은 game.ts의 속성 |
| 정리(`unmount`) | `cancelAnimationFrame`, 리스너 제거, `ResizeObserver.disconnect()`+`clearTimeout`, `game.destroy()`, host 노드 제거 | `destroy()`에서 자신이 만든 canvas/뷰 노드만 제거 |

**렌더링 계약 (Canvas ↔ CSS-3D 경계):** 콘솔은 **렌더 방식에 무관**하다 — `render()`가 무엇을 그리든 상관 안 함.
- **Canvas 게임**(러너·플래피·스태커·오빗·리듬·중력반전·타이밍스톱·지그재그·로터·벽점프): `canvas.ts`의 `mountCanvas(env)`로 `<canvas>` 부착, `render.ts`가 2D 컨텍스트에 그린다. 지원 체크 = `canvasSupported()`.
- **CSS-3D 게임**(큐브): `canvas.ts`를 쓰지 않고 `createCubeView(host,theme)`로 DOM/CSS 3D 뷰를 만들며 `render()`는 `view.update(game)`로 DOM을 갱신한다. 지원 체크 = `cubeSupported()`(`CSS.supports('transform-style','preserve-3d')`).
- 따라서 **같은 콘솔**이 두 렌더 방식을 모두 구동하고, 카트리지별 `isSupported`만 다르다. 새 게임은 `game.ts`(순수)+`render.ts`+`index.ts`(어댑터)만 추가하면 된다.

**`canvas.ts`의 소유권 경계 ⭐:** `canvas.ts`는 **무상태 헬퍼**다(`canvasSupported()` 지원 체크 · `makeSeed(salt)` 런타임 시드 · `mountCanvas(env)` `<canvas>` 부착 후 2D 컨텍스트 반환). 콘솔(`gameMachine`)은 **canvas를 직접 만지지 않는다** — 카트리지 어댑터(`index.ts`)가 `mountCanvas`를 호출해 얻은 컨텍스트에 `render.ts`로 그린다. 즉 책임은 **루프·입력·이벤트·정리 = 콘솔 / canvas 픽셀·시드 = 카트리지+`canvas.ts` / 순수 상태·전이 = `game.ts`** 로 3분할된다. `canvas.ts`는 콘솔이 아니라 **카트리지 쪽 공용 배관**이다(그래서 CSS-3D 큐브는 이를 쓰지 않고 `createCubeView`를 쓴다).

**카트리지 lifecycle(상태 전이):** `ready` --`input()`--> `running` --(게임오버 조건)--> `over` --`input()`--> `running`(리셋 후 재시작). `step()`은 `ready`에서 무동작이어야 한다(첫 입력 전 정지).

### 5.6 iframe 보안 경계 (`src/experiences/iframe/index.ts`) ⭐ (신규)

iframe 경험은 **외부 콘텐츠를 실행**하므로 명시적 보안 계약이 필요하다. 아래는 현재 구현된 계약과 **미결정(유저 승인 필요)** 항목이다.

**현재 구현된 계약 (테스트로 고정):**

| 항목 | 정책 | 근거/테스트 |
| --- | --- | --- |
| URL/스킴 검증(`safeSrc`) | `^https?://` 또는 `/`로 시작(상대경로)만 허용. `javascript:`·`data:` 등 차단 | `ruler/security.md` (XSS 차단). `index.test.ts` "rejects unsafe src" |
| src 없음/차단 | iframe 미생성, `error` 이벤트 발화, **폴백 유지**(불변식) | `index.test.ts` "emits error when src is missing" |
| `sandbox` 기본값 | `'allow-scripts'` — 스크립트만 허용, 오리진/폼/팝업/top-navigation 등 격리 | 안전 기본값. `index.test.ts` |
| `sandbox` 커스텀 | `options.sandbox`로 **전체 대체** 가능(신뢰 콘텐츠 확장용) | `index.test.ts` "honors custom sandbox" |
| `allow`(Permissions-Policy) | `options.allow` 지정 시에만 설정, 기본 없음 | `index.test.ts` |
| `title` | `options.title` ?? 기본 '에러 페이지 콘텐츠' (a11y) | — |
| `loading` | `'lazy'` | — |
| 성공 신호 | iframe `load` → `start` 이벤트 | `index.test.ts` E2E |
| 언마운트 | `frame.remove()` + 참조 null | `index.test.ts` "unmount removes the iframe" |
| 옵션 전달 | `config.options`(명령형) / CE `src` 속성 → `ctx.options` | `types.ts`, `element.ts` |

**확정 보안 정책 (Planner 결정 — `ruler/security.md`·불변식 근거. 콘텐츠 *출처* 정책이 아니므로 유저 승인 불요) ⭐:**

vision.md §9의 열린 질문은 **"콘텐츠 출처/심사 정책"(= 아래 D7) 하나**다. 그 외 sandbox·referrer·타임아웃 등은 제품 결정이 아니라 `ruler/security.md`와 불변식이 강제하는 **안전 기본값**이므로 여기서 **확정**한다(임의 추측이 아니라 룰셋 적용). 일부는 아직 코드에 없어 **Implementer 서브골(iframe 하드닝)** 로 추적한다 — 이 하드닝은 "게임 추가" 요청과 **별개 트랙**이며, 신규 게임 착수를 막지 않는다.

| # | 확정 정책 | 코드 상태 | 근거 |
| --- | --- | --- | --- |
| D1 | `safeSrc`를 좁혀 **프로토콜-상대 URL(`//host`) 거부**. 절대 URL은 `https?://`만, 그 외는 `/`(단 `//` 아님)로 시작하는 상대경로만 허용 | ⚠️ **미구현 → Implementer 서브골** (현 `startsWith('/')`가 `//`를 통과) | 의도치 않은 외부 오리진 로드 차단 |
| D2 | 커스텀 `sandbox`에 **`allow-scripts`+`allow-same-origin` 동시 지정 거부**(둘 다면 sandbox 무력화) → `error` 이벤트 + 폴백 유지 | ⚠️ **미구현 → Implementer 서브골** (현 커스텀 sandbox 무검증) | sandbox 탈출 방지 |
| D3 | `referrerpolicy` 기본 **`no-referrer`** 설정 | ⚠️ **미구현 → Implementer 서브골** | referrer 유출 차단 |
| D4 | 로드 **타임아웃 8s + `onerror`**: 초과·실패 시 **언마운트 + `error` 이벤트 → 폴백 복귀** | ⚠️ **미구현 → Implementer 서브골** (현 `load` 성공만 처리) | **불변식 필수** — 실패한 빈 iframe이 폴백을 덮으면 §5.4 범위 2 위반 |
| D5 | host↔iframe **`postMessage` 통신 없음**(v2 범위 확정). 향후 도입 시 `event.origin` 화이트리스트 필수 | ✅ 현재도 리스너 없음 | 오리진 미검증 메시지 수신 표면 제거 |
| D6 | 성공한 iframe 오버레이가 폴백 링크를 덮는 문제 → 실패 경로는 D4로 폴백 복귀해 불변식 유지, 성공 시 링크 접근은 §14 | ✅ D4 구현 시 커버 | 불변식/접근성 |

**미결정 — 유저 승인 필요 (vision.md §9 Open Question · Guardian 에스컬레이션):**

| # | 미결정 사항 | 리스크 | Planner 추천안 |
| --- | --- | --- | --- |
| D7 | **iframe 콘텐츠의 출처 화이트리스트/심사 정책** — 어떤 오리진의 콘텐츠 임베드를 허용할지 | 임의 외부 콘텐츠 임베드 | 기본은 "호스트가 `assetBase`/명시 URL만 넘기는 계약 + 문서 경고", 필요 시 오리진 화이트리스트 옵션 추가. 공개 레지스트리는 Out of Scope. **← 이 항목만 유저 승인 대기** |

---

## 6. Public API & Config 스펙 (`src/core/*`) ⭐ (실체 반영)

### 6.1 명령형 API

```ts
// 단일 진입점
function mount(target: string | HTMLElement, config?: PlaygroundConfig): PlaygroundHandle;

interface PlaygroundConfig {
  status?: number;                         // 기본 404
  experience?: string | Experience;        // 내장 이름 | 커스텀 객체(experimental). 미지정 시 경험 없이 폴백만
  messages?: { title?: string; description?: string };
  links?: { home?: string; back?: boolean };
  theme?: 'light' | 'dark' | 'auto';       // 기본 'auto'
  locale?: string;                         // 기본 navigator.language
  reducedMotion?: 'auto' | 'force' | 'off';// 기본 'auto'
  minHeight?: number;                      // 컨테이너 높이 미제공 시 최소 높이(px). 기본 240
  assetBase?: string;                      // 경험 청크 로드 기준 URL (인라인/타 오리진 대응)
  onEvent?: (e: PlaygroundEvent) => void;
  options?: Record<string, unknown>;       // 경험별 파라미터(예: iframe src/title/sandbox/allow) → ctx.options
}

interface PlaygroundHandle {
  unmount(): void;                         // 모든 리소스 정리 + 진행 중 로드 무효화
  setExperience(experience: string | Experience): Promise<void>;
}

type PlaygroundEvent =
  | { type: 'ready' }        // 코어가 마운트 직후 발화
  | { type: 'start' }        // 콘솔: 게임 시작(ready→running) / iframe: load
  | { type: 'score'; value: number }   // 콘솔: 100점 단위 마일스톤
  | { type: 'gameover'; score: number } // 콘솔: running→over
  | { type: 'error'; cause: unknown };  // 로드/마운트 실패 (throw 대신)
```

### 6.2 내장 경험 이름 (BUILTINS 레지스트리, `src/core/loader.ts`)

`experience`에 넘길 수 있는 내장 이름(각각 별도 lazy 청크로 동적 import):

`'noop'`(contract 검증) · `'runner'` · `'iframe'` · `'cube'` · `'flappy'` · `'stacker'` · `'orbit'` · `'rhythm'` · `'gravity'` · `'timing'` · `'zigzag'` · `'rotor'` · `'walljump'`.

> `BuiltinName`을 **좁은 union으로 고정하지 않는다**(`experience?: string | Experience`). 새 게임 추가 = `BUILTINS`에 1줄 등록이면 되고, 타입 변경이 불필요하다. 잘못된 이름은 런타임에서 `error` 이벤트로 처리(§6.3).

**이름 ↔ 청크 매핑 & 로딩 경계 ⭐:** `BUILTINS[name]`은 `() => import('../experiences/<name>/index')` 썽크다. 따라서
- **이름마다 독립 ESM 청크**로 코드 스플릿된다(Vite가 동적 `import()` 지점을 청크 경계로 삼음). 8개 게임이 한 번들로 뭉치지 않는다.
- **on-demand lazy 로드**: 선택된 1종만 네트워크 요청. 미선택 게임은 다운로드되지 않는다.
- **청크 경로**는 `config.assetBase`로 해석(§8) → 코어를 인라인하거나 다른 오리진에 둬도 청크가 올바로 로드됨.
- **청크별 크기 예산: 각 경험 청크 ≤ 20KB gzip**(§11). 코어 예산(ESM ≤ 8KB)과 독립이며, 게임이 늘어도 코어·다른 청크 예산에 영향 없음.

### 6.3 경험 해석·전환 계약 (`resolveExperience` / `load` / 경쟁 상태) ⭐

- **해석(`resolveExperience`)**: 문자열 → `BUILTINS[name]()` 동적 import → 모듈의 `create()`(또는 `default`) 호출. 객체 → `isExperience()` 검증 후 그대로 사용. **알 수 없는 이름 / 계약 위반 객체 → throw.**
- **잘못된 이름 처리**: `mount`/`setExperience`는 절대 호출자에게 throw하지 않는다. 내부 `load()`가 `try/catch`로 삼켜 `error` 이벤트 발화 + **폴백 유지**.
- **경험 전환 경쟁(generation 정책)**: 코어는 `loadToken` 세대 카운터를 둔다. `load()`는 진입 시 `token = ++loadToken`. `import`/`mount` await 이후 `token !== loadToken || disposed`이면 **자신을 취소**(늦게 끝난 이전 경험이 새 경험을 덮지 못함 — 마운트까지 됐으면 즉시 `unmount()`+호스트 제거). → `setExperience()` 연속 호출 시 마지막 것만 살아남는다.
- **정리 순서 (unmount↔mount 원자성)**: `teardownExperience()`(이전 경험 `unmount()` → 이전 호스트 제거)는 **새 경험의 `resolveExperience()`+지원 체크가 성공한 직후, 새 호스트 마운트 직전**에만 호출된다. 새 호스트(`position:absolute; inset:0`) 생성·부착·마운트가 이어진다. 즉 "이전 제거 → 새 마운트"가 한 동기 구간으로 이어져 **중간에 둘 다 없는 상태가 생기지 않는다**. `unmount()`는 `disposed=true` + `loadToken++`(진행 중 로드 무효화) → teardown → 폴백 노드 제거.
- **로드 실패 시 유지 정책 ⭐**: teardown이 성공 이후에만 일어나므로, `setExperience()` 로드가 실패하면(import 실패·미지원·계약 위반·마운트 throw) **이전 경험을 그대로 유지**한다(있으면). 이전 경험이 없으면 폴백을 유지한다. **어느 경우에도 화면이 비지 않으며, Tier 0로 강제 복귀시키지 않는다**(불필요한 경험 손실 방지). 통지는 `error` 이벤트로만.
- **미지원**: `experience.isSupported?.() === false`면 마운트하지 않고 폴백(또는 이전 경험) 유지(에러 아님).

### 6.4 Custom Element 라이프사이클 & 설정 계약 (`src/core/element.ts`) ⭐ (신규)

`<error-playground>`는 표준 Custom Element다 → React/Vue/Svelte/순수 HTML 어디서든 별도 래퍼 없이 태그 하나로 동작.

- **등록(`defineErrorPlayground(tag='error-playground')`)**: **멱등**(`customElements.get(tag)` 있으면 no-op) + **브라우저 전용**(`customElements` 없으면 no-op, SSR 안전). 코어 진입점(`index.ts`) import 시 자동 호출. 커스텀 태그명 지정 가능.
- **SSR/Node 안전**: `HTMLElement`가 없는 환경에선 더미 베이스 클래스를 상속 → import만으로 크래시하지 않음(등록은 브라우저에서만).
- **렌더 타깃 / Shadow DOM (확정) ⭐**: CE는 `mount(this, buildConfig())`로 **자기 자신(light DOM)에 렌더**하며 **`attachShadow`를 쓰지 않는다.** 이유: 모드 B 폴백 자식(`<h1>404</h1><a href="/">…`)이 **light DOM에 그대로 남아야** 불변식(폴백 항상 노출, §5.4)·SEO·접근성이 유지되기 때문. → **Shadow DOM 사용 주체: 없음(기본).** 스타일 격리는 CSS 변수/스코프 클래스로 처리하며, `attachShadow` 격리는 폴백 자식을 slot으로 투영해야 하므로 현재 범위 밖(향후 옵션). 속성 반영은 §6.4 `observedAttributes`+`buildConfig()`가, 생명주기·중복 등록은 아래가 담당한다.
- **설정 두 경로**:
  - **속성(단순값)**: `status` `home` `back` `theme` `locale` `experience` `reduced-motion` `asset-base` `message-title` `message-description` `src` — 모두 `observedAttributes`. `src`는 `options.src`로 매핑(iframe용).
  - **`config` property(리치 객체)**: `el.config = {...}` — 속성으로 표현 못 하는 값·프레임워크 바인딩용. `buildConfig()`가 **config property + 속성을 병합**하되, 위 개별 속성이 지정되면 해당 키를 덮어쓴다.
- **lifecycle**:
  - `connectedCallback` → `rerender()`(=이전 handle unmount 후 `mount(this, buildConfig())`).
  - `attributeChangedCallback` → 연결돼 있으면 `rerender()`.
  - `config` setter → 연결돼 있으면 `rerender()`.
  - `disconnectedCallback` → `handle.unmount()` + 참조 null (누수 방지).
- **중복 등록**: `defineErrorPlayground` 멱등 처리로 여러 번 import/호출해도 안전.

### 설계 메모
- `experience`에 **객체 직접 주입**이 v1의 확장 escape hatch(레지스트리 없이 커스텀 가능, `experimental`).
- `assetBase`는 §8의 "IIFE 인라인 코어 + ESM 청크" 텐션을 푸는 핵심 설정.
- `theme:'auto'`/`reducedMotion:'auto'`는 코어가 시스템 값을 읽어 **확정값**으로 바꿔 컨텍스트에 전달(경험은 분기 불필요).

---

## 7. 기술 스택

| 영역 | 선택 | 이유 |
| --- | --- | --- |
| 언어 | **TypeScript (`strict`)** | 플러그인 계약 안정성, DX. `any` 금지 |
| 빌드 | **Vite (library mode)** | code-splitting, 다중 포맷 출력 |
| 산출물 | **ESM + IIFE** | ESM=번들러/npm·청크, IIFE=CDN/인라인 코어 |
| 스타일 격리 | `attachShadow`(선택) + CSS 변수 | Custom Element 없이도 격리 가능 |
| 테스트 | Vitest(+ jsdom) / Playwright(스모크) | 유닛 + 크로스브라우저 |
| 패키지 | 단일 패키지 + code-split | 경험별 청크 |

> 3D(Three.js)는 vision.md §5 Out of Scope(경량 원칙). iframe으로 무게를 오프로드한다.

---

## 8. 빌드 & 배포 — "IIFE 단일 파일"과 "lazy load"의 텐션 해소 ⭐

- **ESM 빌드**: `error-playground.js` + 경험 청크(`runner-[hash].js` 등) 자동 code-split. `import()` 자연 동작. → npm/번들러용.
- **IIFE 빌드**: **코어만** `error-playground.iife.js`로. 극소 사이즈라 **HTML에 인라인 가능**. 경험은 런타임에 **동적 `import()`로 ESM 청크를 로드**(에버그린 브라우저는 classic script에서도 `import()` 지원).
  - 청크 경로는 `config.assetBase`(또는 전역)로 해석 → 코어를 인라인하거나 다른 오리진에 둬도 청크가 올바로 로드됨.
- 결과: **코어는 한 줄 인라인(장애 내성), 경험은 lazy 청크(경량)** 가 동시에 성립.

CI 게이트:
- **코어 ESM gzip 예산(≤ 8KB) 하드 게이트.** (IIFE는 게임이 늘면 커지는 게 정상 — vision.md §4 2026-07-11: 진짜 코어(ESM)만 하드 게이트)
- 경험 청크는 별도 예산(러너 ≤ 20KB gzip).
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
  ErrorPlayground.mount('#ep', { status: 404, experience: 'runner', assetBase: 'https://cdn.example.com/ep/' });
</script>
```

### 9.2 React
```tsx
import { mount } from 'error-playground';
useEffect(() => {
  const h = mount(ref.current, { status: 404, experience: 'flappy' });
  return () => h.unmount();
}, []);
return <div ref={ref}><h1>404</h1><a href="/">홈</a></div>; // 폴백 동봉
```

### 9.3 선언적 태그 (모든 프레임워크 공통)
```html
<!-- import 'error-playground' 하면 자동 등록됨 -->
<error-playground status="404" experience="cube" home="/">
  <h1>404</h1><a href="/">홈으로</a> <!-- 폴백 동봉(모드 B) -->
</error-playground>
```
프레임워크 바인딩 시 리치 값은 `el.config = {...}`로 주입.

---

## 10. Experience 로드맵 — Tier 카탈로그

| Tier | 방식 | 예상 용량 | 예시 | 의존성 | 상태 |
| --- | --- | --- | --- | --- | --- |
| **0** | 정적 폴백 | ~1–2KB | 상태코드+메시지+홈 | 없음 | ✅ 코어 내장 |
| **1** | CSS/DOM | ~3–5KB | **CSS-3D 큐브 탭** / contract용 `noop` | 없음 | ✅ |
| **2** | Canvas 2D | ~10–20KB | **러너·플래피·스태커·오빗·리듬·중력반전·타이밍스톱·지그재그·로터·벽점프** | 없음 | ✅ |
| **3** | WebGL/3D | lazy ~150KB+ | 3D 씬 | Three.js | ❌ Out of Scope (vision §5) |
| **4** | iframe | 가변 | 외부 게임/콘텐츠 | sandbox | ✅ (보안 경계 §5.6) |

---

## 11. 번들 사이즈 예산

- 코어는 **블로킹 없이** 즉시 폴백 보장 → 사용자는 항상 0.1초 내 에러 정보를 본다.
- 무거운 경험(게임·iframe)은 분리 청크 → 에러 페이지 초기 로드에 미포함.
- 예산: **코어 ESM ≤ 8KB gzip (하드 게이트)**, **경험 청크는 각각 ≤ 20KB gzip**(러너 기준, 게임별 독립 청크 — §6.2). IIFE는 게임 수에 따라 증가하되 하드 게이트 아님(vision.md §4 2026-07-11). CI에서 강제.

---

## 12. 디렉토리 구조 (실제)

```
404-playground/
├── docs/PLAN.md
├── src/
│   ├── core/
│   │   ├── index.ts        # public: mount(), defineErrorPlayground(), 타입, 자동 등록
│   │   ├── mount.ts        # mount() — 폴백 보장 + 경험 로드 + generation 경쟁 차단
│   │   ├── element.ts      # <error-playground> Custom Element (§6.4)
│   │   ├── fallback.ts     # Tier 0 / 모드 A·B 판별(detectMode) + 렌더
│   │   ├── loader.ts       # BUILTINS 동적 import + assetBase + 실패 폴백
│   │   ├── context.ts      # theme/reduced-motion/locale 확정
│   │   └── types.ts        # Experience / Config / Event / Context
│   └── experiences/
│       ├── machine.ts      # gameMachine 공통 콘솔 (§5.5)
│       ├── canvas.ts       # Canvas 공통 헬퍼(canvasSupported/makeSeed/mountCanvas)
│       ├── runner|flappy|stacker|orbit|rhythm|gravity|timing|zigzag|rotor|walljump/  # Canvas 카트리지 (game/render/index/*.test)
│       ├── cube/           # CSS-3D 카트리지
│       ├── iframe/         # Tier 4 임베드 (§5.6)
│       └── _noop/          # contract 검증용 trivial
├── examples/               # vanilla / react
└── vite.config.ts          # ESM + IIFE 2-빌드
```

---

## 13. 보안 / CSP

- **인라인 코어**는 `script-src 'unsafe-inline'` 또는 **nonce/hash** 필요 → 빌드시 hash 제공, 안내 문서화. 불가 환경은 외부 코어 파일로 폴백.
- 동적 `import()`는 `script-src`에 청크 오리진(`assetBase`) 허용 필요.
- **iframe Tier**: `frame-src` + `sandbox` 속성으로 격리. URL 스킴 검증(`safeSrc`) + 미결정 보안 항목 §5.6.
- 외부 입력(`messages`)은 텍스트로만 삽입(XSS 방지, **`innerHTML` 금지**).

---

## 14. 접근성 & UX 가드레일

- **에러 정보 우선**: 어떤 경험이든 상태코드·핵심 메시지·홈/뒤로 링크는 폴백 DOM에 항상 존재(불변식, §5.4). 경험은 오버레이이며 폴백 노드를 제거하지 않는다.
- `prefers-reduced-motion: reduce` → 게임 루프는 **첫 입력 opt-in** 후 시작(콘솔이 처리, §5.5).
- 키보드 완전 조작(게임 host `tabIndex=0`, `role=application`), 포커스 트랩 금지.
- 소리 기본 OFF, 사용자 액션 후에만.
- 다국어: `messages`/`locale` 외부 주입.

---

## 15. 테스트 & 품질

- **유닛(Vitest)**: config 파싱/기본값, 모드 A·B 판별, `import()`·이름 오류 시 폴백 유지, 컨텍스트 확정, generation 경쟁(늦은 로드 취소), CE 라이프사이클, iframe 스킴 검증.
- **게임 로직**: 각 `game.ts`는 순수·결정적(고정 seed) → `game.test.ts`로 상태 전이·충돌·점수·재시작·결정성 검증(렌더/DOM 제외).
- **스모크(Playwright)**: vanilla·React·CE에서 마운트→폴백 노출→경험 로드→`unmount` 후 rAF/리스너 누수 0.
- **장애 주입**: 청크 요청 차단 → 폴백 유지·`error` 이벤트.
- **사이즈 예산**: 코어(ESM)/청크 gzip 한도 CI 게이트.

---

## 16. 개발 마일스톤

| 단계 | 산출물 | 상태 |
| --- | --- | --- |
| **M0 — 스캐폴딩** | Vite+TS, ESM+IIFE 2-빌드, 빈 코어, Tier 0 폴백 | ✅ |
| **M1 — 코어 엔진** | `Experience` 계약, loader(동적 import+assetBase), 모드 A·B, generation 경쟁 차단, graceful 폴백, `noop` | ✅ |
| **M2 — 플래그십: Canvas 러너** | 공룡게임류 러너 + 공통 콘솔(`gameMachine`) | ✅ |
| **M3 — 통합 API/예제** | Custom Element `<error-playground>`, vanilla/React 예제, CSP 안내 | ✅ (CE 승격 2026-07-01) |
| **v2 — 경험 확장** | iframe(§5.6) + 큐브·플래피·스태커·오빗·리듬 카트리지, `canvas.ts` 추출 | ✅ (vision §4 2026-07-04~07-14) |
| **진행 — 신규 게임 추가** | 요청 "게임 추가" → 카트리지 1종씩 신설 (중력반전 2026-07-16, 타이밍스톱 2026-07-17, 지그재그 2026-07-19, 로터 2026-07-19, 벽점프 2026-07-20) | ✅ (vision §4/§10 갱신) |
| **후속 — iframe 하드닝** | §5.6 D1–D4 확정 정책 구현(`//` 거부·sandbox 콤보 거부·referrerpolicy·타임아웃→폴백) + 테스트 | 📋 별개 트랙(게임 추가와 독립, 승인 불요) |

> WebGL/3D·공개 레지스트리·auto Tier는 **Out of Scope**(vision.md §5).

---

## 17. 확정된 결정 사항

| 항목 | 결정 |
| --- | --- |
| 플래그십 경험 | Canvas 2D 러너(공룡게임류) |
| 통합 API | 명령형 `mount()` + Custom Element `<error-playground>` |
| 게임 구동 모델 | 공통 콘솔 `gameMachine` + 교체 카트리지(`Game`) (§5.5) |
| 배포 형태 | CDN(IIFE/인라인) + npm(ESM) 둘 다 |
| 확장 방식 | `experience` 객체 직접 주입(experimental). 공개 레지스트리 Out of Scope |
| 경험 전환 경쟁 | `loadToken` generation — 마지막 호출만 생존 (§6.3) |
| iframe 보안 | 기본 `sandbox=allow-scripts` + 스킴 검증. 하드닝 정책(§5.6 D1–D6)은 `security.md`·불변식 근거로 **확정**(D1–D4는 Implementer 서브골), 콘텐츠 **출처 정책(D7)만** 유저 승인 대기 |
| 사이즈 하드 게이트 | 코어 **ESM만** ≤ 8KB gzip (IIFE는 게임 수 따라 증가 정상) |

---

## 18. 논리적 일관성 체크

| # | 충돌 | 해소 |
| --- | --- | --- |
| 1 | "폴백 먼저 보장" ↔ "`<script src>` 로드"(JS 안 뜨면 폴백도 없음) | **코어 인라인 + 모드 B**로 네트워크 0회 폴백 (§5.2/§5.4) |
| 2 | "lazy load" ↔ "IIFE 단일 파일" | **코어 IIFE + 동적 `import()` ESM 청크 + `assetBase`** (§8) |
| 3 | "프레임워크 독립" ↔ "얇게" | `mount()`가 모든 프레임워크 커버 + **표준 CE**로 선언적 사용까지 (§5.2/§6.4). 스타일 격리는 `attachShadow` |
| 4 | "auto Tier(네트워크 기반)" ↔ "에러 페이지 네트워크 불안정" | auto 휴리스틱 Out of Scope, 명시 지정 + 정적 `isSupported()`만 |
| 5 | "엔진+SDK" ↔ "수요 검증 전 공개 API 고정=부채" | 공개 레지스트리 Out of Scope, `experience` **객체 직접 주입**으로 흡수 (§6) |
| 6 | "코어 8KB" ↔ "게임 포함하면 초과?" | 게임은 별도 청크 → 코어 예산 독립. 하드 게이트는 **ESM 코어만** (§8/§11) |
| 7 | "게임마다 lifecycle 제각각?" ↔ "확장성·테스트성" | **공통 콘솔 `gameMachine`** 이 루프·입력·이벤트·정리 소유, 게임은 순수 로직만 (§5.5) |
| 8 | "외부 iframe 콘텐츠 실행" ↔ "XSS/오리진 안전" | 스킴 검증 + `sandbox=allow-scripts` 기본 + 실패 시 폴백. **미결정 항목 §5.6 유저 승인** |
| 9 | "경험 전환 연타" ↔ "늦은 import가 새 경험 덮음" | `loadToken` generation 정책 — stale 로드 자기취소 (§6.3) |

미해결/추적(vision.md §9 Open Questions):
- 인라인 코어 CSP nonce/hash 배포 자동화.
- iframe 콘텐츠 **출처/심사 정책 = §5.6 D7 (유저 승인 대기)**. 하드닝 D1–D4는 확정 정책이며 **Implementer 서브골(iframe 하드닝, 게임 추가와 별개 트랙)** 로 추적(승인 불요).

---

## 19. 요약

> **"Tiny Core + Lazy Experiences + Fallback-first + One Console, Many Cartridges"**.
> 코어는 **인라인 가능한 극경량 로더**로 어떤 환경에서도 즉시 에러 폴백을 보장하고(500에도 강함), 무거운 콘텐츠(게임·iframe)는 **동적 청크**로 필요할 때만 로드한다.
> 게임은 공통 콘솔 `gameMachine`에 꽂는 **카트리지**로, 러너·큐브·플래피·스태커·오빗·리듬·중력반전·타이밍스톱·지그재그·로터·벽점프가 동일 lifecycle·입력·이벤트를 공유한다(§5.5). 통합은 `mount()` + 표준 Custom Element `<error-playground>`로 모든 프레임워크를 커버한다(§6.4).
> 불변식 "에러 정보는 항상 보인다"가 설계 전반을 관통하며, iframe 보안 세부 정책(§5.6)은 유저 승인 대기 중이다.
