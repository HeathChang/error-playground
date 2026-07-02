# 🎮 error-playground

> **밋밋한 404·500 에러 페이지를, 유저가 잠깐 놀다 갈 수 있는 화면으로.**
> 태그 하나(또는 코드 한 줄)와 설정만 주면 끝나는 **프레임워크 독립 경량 라이브러리**예요.

```
    Before (그냥 에러)              After (error-playground)
  ┌─────────────────────┐        ┌─────────────────────┐
  │                     │        │   404               │
  │   404 Not Found     │   →    │   페이지를 찾을 수    │
  │                     │        │   없어요             │
  │                     │        │   [ 홈으로 ]         │
  │                     │        │  ▂▁ ▂  🦖  ▂ ▁▂▁   │ ← 미니 게임
  └─────────────────────┘        └─────────────────────┘
    유저: 바로 나감                 유저: 잠깐 놀다 감 🙂
```

**한 줄 요약:** `<error-playground status="404" experience="runner">` 이거 하나면 위 오른쪽 화면이 됩니다.

---

## 📖 목차

1. [이런 분을 위해 만들었어요 (페르소나)](#-이런-분을-위해-만들었어요-페르소나)
2. [30초 만에 눈으로 확인하기](#-30초-만에-눈으로-확인하기)
3. [설치](#-설치)
4. [프레임워크별 사용법 (복붙용 완성 코드)](#-프레임워크별-사용법-복붙용-완성-코드)
5. [설정(config)으로 원하는 화면 만들기](#️-설정config으로-원하는-화면-만들기)
6. [게임/경험 고르기](#️-게임경험-고르기)
7. [내부에서 무슨 일이 일어나나](#-내부에서-무슨-일이-일어나나)
8. [자주 묻는 질문 (FAQ)](#-자주-묻는-질문-faq)
9. [현재 상태 / 로드맵](#-현재-상태--로드맵)

---

## 🙋 이런 분을 위해 만들었어요 (페르소나)

**지훈 · 프론트엔드 개발자 (3년차, 스타트업)**

> "우리 서비스 404 페이지가 그냥 `Not Found` 한 줄이라 유저가 바로 나가요.
> Chrome 공룡게임처럼 놀 거리를 주고 싶은데 **직접 만들 시간은 없고**,
> 무겁게 만들면 그것도 에러 페이지랑 안 어울리고...
> **그냥 div 하나 꽂고 설정만 주면 되는 게 있으면 좋겠다.**"

**지훈이 하는 일은 딱 이거예요:**

```html
<error-playground status="404" home="/" experience="runner"></error-playground>
```

- ✅ 게임을 직접 만들 필요 없음 (`experience="runner"`가 미니 러너 게임)
- ✅ 에러 페이지가 무거워질 걱정 없음 (게임은 필요할 때만 불러옴, 코어는 ~3KB)
- ✅ 혹시 게임이 안 불러와져도 **"404 · 홈으로"는 그대로** 보임 (유저가 갇히지 않음)

> 이 README는 지훈이 처음부터 끝까지 따라 할 수 있게 쓰여 있어요.

---

## ⚡ 30초 만에 눈으로 확인하기

빌드 도구도, 설치도 필요 없어요. 아래를 `demo.html`로 저장하고 브라우저로 열어보세요.

```html
<!doctype html>
<html lang="ko">
  <body>
    <!-- ① 이 태그 하나 -->
    <error-playground status="404" home="/" experience="runner"></error-playground>

    <!-- ② 스크립트 한 줄 (배포 후 unpkg 기준) -->
    <script src="https://unpkg.com/error-playground"></script>
  </body>
</html>
```

- 화면에 **"404 · 홈으로"** 와 함께 미니 게임이 뜹니다.
- 게임 영역을 **클릭하거나 스페이스바**를 누르면 캐릭터가 점프해요.

> ⚠️ 아직 npm/unpkg에 배포 전이에요. 지금 당장 돌려보려면 [설치](#-설치)의 "로컬에서 바로" 방법을 쓰세요.

---

## 📦 설치

### 배포 후 (예정)

```bash
npm install error-playground
```

### 지금 바로 써보려면 (아직 npm 미배포)

**방법 A — 이 저장소를 직접 설치**
```bash
npm install github:HeathChang/error-playground
```

**방법 B — 로컬에서 개발하며 확인 (이 저장소를 클론한 경우)**
```bash
git clone https://github.com/HeathChang/error-playground.git
cd error-playground
npm install
npm run dev        # 브라우저가 열리며 데모가 뜸
```

---

## 🚀 프레임워크별 사용법 (복붙용 완성 코드)

> 핵심 개념 딱 2개만 기억하세요:
> 1. **한 번 `import 'error-playground'`** 하면 `<error-playground>` 태그가 어디서든 쓸 수 있게 됩니다(자동 등록).
> 2. 태그에 **속성으로 설정**을 줍니다: `status`, `home`, `experience` ...

### 🟦 순수 HTML

```html
<!doctype html>
<html lang="ko">
  <body>
    <error-playground
      status="404"
      home="/"
      message-title="페이지를 찾을 수 없어요"
      message-description="주소가 바뀌었거나 삭제된 것 같아요."
      experience="runner"
    ></error-playground>

    <script src="https://unpkg.com/error-playground"></script>
  </body>
</html>
```

### ⚛️ React

```tsx
// NotFound.tsx
import 'error-playground'; // 태그 등록 (한 번만 하면 됨)

export default function NotFound() {
  return (
    <error-playground
      status="404"
      home="/"
      message-title="페이지를 찾을 수 없어요"
      experience="runner"
    />
  );
}
```

### ▲ Next.js (App Router)

```tsx
// app/not-found.tsx
'use client'; // 커스텀 엘리먼트는 브라우저에서 등록되므로 클라이언트 컴포넌트로
import 'error-playground';

export default function NotFound() {
  return <error-playground status="404" home="/" experience="runner" />;
}
```

### 🟩 Vue 3

```ts
// vite.config.ts — error-playground를 커스텀 엘리먼트로 인식시키기
export default defineConfig({
  plugins: [vue({ template: { compilerOptions: { isCustomElement: (tag) => tag === 'error-playground' } } })],
});
```

```vue
<!-- NotFound.vue -->
<script setup lang="ts">
import 'error-playground';
</script>

<template>
  <error-playground status="404" home="/" experience="runner" />
</template>
```

### 🧰 명령형 `mount()` — 태그 대신 코드로 제어하고 싶을 때

```ts
import { mount } from 'error-playground';

const handle = mount('#error-root', {
  status: 404,
  messages: { title: '페이지를 찾을 수 없어요', description: '주소를 확인해 주세요.' },
  links: { home: '/', back: true },
  experience: 'runner',
  onEvent: (e) => console.log('[ep]', e), // ready / start / score / gameover / error
});

// 나중에 정리 (React useEffect의 cleanup 등에서)
handle.unmount();

// 경험 교체도 가능
handle.setExperience('noop');
```

---

## ⚙️ 설정(config)으로 원하는 화면 만들기

**"폴백 때 무엇을 보여줄지"는 전부 config로 정합니다.** 태그에서는 속성으로, `mount()`에서는 객체로 주면 돼요.

| 하고 싶은 것 | 태그 속성 | `mount()` config |
|---|---|---|
| 상태 코드 | `status="500"` | `status: 500` |
| 제목 문구 | `message-title="..."` | `messages: { title: '...' }` |
| 설명 문구 | `message-description="..."` | `messages: { description: '...' }` |
| 홈 버튼 링크 | `home="/"` | `links: { home: '/' }` |
| 뒤로가기 버튼 | `back` | `links: { back: true }` |
| 게임/경험 | `experience="runner"` | `experience: 'runner'` |
| 테마 | `theme="dark"` | `theme: 'dark'` (기본 `auto`) |
| 언어 | `locale="ko"` | `locale: 'ko'` |
| 모션 최소화 | `reduced-motion="off"` | `reducedMotion: 'off'` (기본 `auto`) |
| 이벤트 콜백 | (속성 불가) | `onEvent: (e) => {}` |

**예시 — 500 에러 + 다크 테마 + 문구 커스터마이즈:**

```html
<error-playground
  status="500"
  theme="dark"
  message-title="잠시 문제가 생겼어요"
  message-description="잠시 후 다시 시도해 주세요."
  home="/"
  back
></error-playground>
```

### 내가 만든 화면을 폴백으로 쓰기 (모드 B)

태그 **안에 직접 내용을 넣어두면**, 라이브러리는 그걸 폴백으로 **그대로 유지**합니다.
→ **스크립트가 아예 안 떠도 이 내용은 보입니다.** (500 상황에 특히 안전)

```html
<error-playground status="500">
  <!-- ↓ 이건 JS가 실패해도 보이는 나만의 폴백 -->
  <h1>서버에 문제가 생겼어요 😢</h1>
  <p>엔지니어에게 알림이 갔어요. 잠시 후 다시 시도해 주세요.</p>
  <a href="/">홈으로</a>
</error-playground>
```

---

## 🕹️ 게임/경험 고르기

`experience`에 넣는 값이에요.

| 값 | 설명 | 조작 |
|----|------|------|
| `"runner"` | Canvas 2D 엔드리스 러너(공룡게임류) | 스페이스 / ↑ / 탭 / 클릭 → 점프·시작 |
| `"noop"` | 아주 단순한 확인용 경험 | 없음 |
| (생략) | 게임 없이 폴백 화면만 | — |

### 나만의 경험 직접 만들기

`mount`/`unmount` 두 개만 구현하면 뭐든 끼울 수 있어요 (애니메이션, 나만의 게임 등).

```ts
import { mount } from 'error-playground';

mount('#error-root', {
  status: 404,
  experience: {
    // host: 내가 그림을 그릴 빈 div. ctx: 상태코드/테마/이벤트 등
    mount(host, ctx) {
      host.textContent = `${ctx.status} 에러가 났지만 곧 괜찮아질 거예요!`;
      host.style.textAlign = 'center';
      // ctx.emit({ type: 'start' }) 처럼 이벤트도 보낼 수 있어요
    },
    unmount() {
      // 타이머·이벤트 정리 (필요하면)
    },
  },
});
```

---

## 🧠 내부에서 무슨 일이 일어나나

**"폴백 먼저, 게임은 나중에, 실패하면 조용히"** 3원칙으로 동작해요.

```
        mount / <error-playground>
                  │
                  ▼
   ┌───────────────────────────────┐
   │ 1. 폴백을 먼저 보여준다          │  ← 상태코드·문구·홈 링크 (항상)
   └───────────────────────────────┘
                  │
                  ▼
   ┌───────────────────────────────┐
   │ 2. 게임(경험)을 그때 불러온다     │  ← import() 로 필요할 때만 (가벼움)
   └───────────────────────────────┘
                  │
        ┌─────────┴──────────┐
        ▼                    ▼
   ✅ 성공                ❌ 실패 (네트워크 끊김 등)
   폴백 위에 게임 올림      폴백 그대로 유지 + onEvent('error')
                          (화면 안 깨짐!)
```

**왜 이렇게 만들었냐면** — 우리는 *에러 페이지를 돕는* 도구잖아요. 그 도구가 에러 나서 페이지를 또 깨뜨리면 안 되니까요. 그래서 **"무슨 일이 있어도 상태코드·문구·홈 링크는 항상 보인다"** 를 철칙으로 삼았습니다.

---

## ♿ 접근성 (기본으로 챙겨져요)

- 상태코드·문구·홈/뒤로 링크는 **항상** 키보드로 접근 가능 (게임이 이걸 가리지 않음)
- 게임은 **키보드로도** 조작 가능 (스페이스/↑)
- `prefers-reduced-motion`(모션 최소화) 설정이면 게임이 **자동 시작하지 않고** 사용자가 누를 때만 시작
- 소리 기본 off

---

## ❓ 자주 묻는 질문 (FAQ)

**Q. `<error-playground>` 태그가 그냥 빈 채로 안 떠요.**
A. 어딘가에서 `import 'error-playground'`(또는 `<script src>`)를 **한 번** 실행했는지 확인하세요. 그래야 태그가 등록됩니다.

**Q. React/TypeScript에서 `<error-playground>` 태그에 빨간 줄(타입 에러)이 떠요.**
A. 아래 선언을 프로젝트 어딘가(예: `global.d.ts`)에 추가하세요.
```ts
declare namespace JSX {
  interface IntrinsicElements {
    'error-playground': React.DetailedHTMLProps<
      React.HTMLAttributes<HTMLElement> & {
        status?: string | number; home?: string; experience?: string;
        theme?: string; 'message-title'?: string; 'message-description'?: string;
      },
      HTMLElement
    >;
  }
}
```

**Q. Vue에서 "Unknown custom element" 경고가 떠요.**
A. `vite.config`에서 `isCustomElement`로 `error-playground`를 등록하세요 ([Vue 예시](#-vue-3) 참고).

**Q. 객체(중첩된 config)를 태그에 어떻게 넘기죠?**
A. 속성은 문자열만 되니, 복잡한 값은 DOM property로 주세요.
```js
const el = document.querySelector('error-playground');
el.config = { status: 404, messages: { title: '없어요' }, experience: 'runner' };
```

**Q. 게임이 무거워서 에러 페이지가 느려지지 않나요?**
A. 코어(~3KB)만 먼저 로드되고 게임 코드는 **필요할 때 따로** 불러와요. 폴백은 즉시 보입니다.

**Q. 500 에러라 서버가 불안정해서 스크립트가 안 뜨면요?**
A. [모드 B](#내가-만든-화면을-폴백으로-쓰기-모드-b)로 태그 안에 폴백을 넣어두면, 스크립트가 실패해도 그 내용은 그대로 보입니다.

---

## 📍 현재 상태 / 로드맵

**✅ 지금 되는 것 (v1)**
- 태그 `<error-playground>` + 코드 `mount()` 둘 다
- 폴백(자동/커스텀) + 게임 실패 시에도 폴백 유지
- 내장 게임 `runner`(러너) · `noop`, 커스텀 경험 주입
- React·Vue·순수 HTML 어디서든, 코어 ~3KB, 테스트 43종 통과

**🔜 다음**
- npm 배포 (그러면 `npm i error-playground` / unpkg가 실제 동작)
- 통합 예제 확장

**🗺️ 나중에 (v2)**
- 3D·iframe 경험, 외부 CDN 청크 호스팅, 자동 게임 선택

---

## 🛠️ 개발 (이 저장소에서)

```bash
npm run dev        # 로컬 데모
npm test           # 테스트 (Vitest)
npm run build      # ESM + IIFE 빌드 + 타입 생성
npm run size       # gzip 용량 체크
```

설계 상세: [`docs/PLAN.md`](docs/PLAN.md) · 범위/비전: [`ruler/vision.md`](ruler/vision.md)

## 📄 라이선스

MIT
