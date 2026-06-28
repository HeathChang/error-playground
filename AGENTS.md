# AGENTS.md

> 이 프로젝트의 코딩 에이전트 지침이다. AGENTS.md 를 지원하는 모든 도구
> (Codex · Cursor · Copilot · Gemini CLI · Aider · Windsurf · Zed 등)가 자동으로 읽는다.

## 규칙

코드를 작성·수정·리뷰하기 전에 `ruler/` 의 규칙과 **`docs/PLAN.md`(상세 설계·아키텍처·API)** 를 읽고 준수한다.
규칙 간 충돌 시 더 구체적인 파일(a11y/styling/security 등)이 `ruler/base.md` 보다 우선한다.
규칙 위반이 불가피하면 `// reason: ...` 주석으로 사유를 남긴다.

> **이 프로젝트의 성격:** 프레임워크 독립 **경량 라이브러리**다. 코어는 런타임 의존성 없는 **순수 TypeScript**로 작성하며,
> 특정 프레임워크(React/Next/Tailwind 등) 전용 룰은 두지 않는다. 프레임워크는 `examples/` 에서만 등장한다.
>
> **문서 위계:** `ruler/vision.md`(무엇을·범위) ▸ `docs/PLAN.md`(어떻게·설계) ▸ `ruler/*.md`(코드 규칙).
> 설계 결정·아키텍처·API는 `docs/PLAN.md`를 따르고, 범위 위반 판정은 `ruler/vision.md` 기준이다.

## 규칙 파일 (적용 범위)

| 파일 | 내용 | 적용 경로 |
|------|------|-----------|
| `ruler/base.md` | 기본 코딩 규칙 | 항상 |
| `ruler/git.md` | Git 워크플로우 | 항상 |
| `ruler/security.md` | 보안 (XSS·CSP·공급망) | 항상 |
| `ruler/testing.md` | 테스트 (Vitest·Playwright) | **/*.test.*, **/*.spec.*, **/__tests__/** |
| `ruler/a11y.md` | 접근성 | `src/**/*.ts`, `examples/**/*.{ts,tsx,html}` (DOM 렌더 코드) |
| `ruler/styling.md` | 스타일링 (바닐라 CSS·CSS 변수) | `**/*.css`, `src/**/*.ts` (스타일 작성 코드) |

> "적용 경로"가 `항상` 이 아닌 규칙은 해당 glob 파일을 작업할 때만 적용한다.

## 협업 모델 (하네스 엔지니어링)

이 룰셋은 8역할 협업 모델을 포함한다. `ruler/vision.md` 를 먼저 채운 뒤,
`ruler/harness/README.md` · `ruler/harness/workflow.md` 의 규약대로 작동한다:
Planner → Researcher → Implementer → Reviewer → Security Auditor → QA → Guardian → Reporter.
역할 전환 시 해당 `ruler/harness/agents/*.md` 를 다시 읽는다.

## 빌드 · 테스트 (프로젝트에 맞게 채우기)

```bash
# 예) 설치 / 빌드 / 테스트 / 린트 명령을 여기에 적는다
```

## 완료 기준

- 변경 후 타입체크·린트·테스트가 통과해야 한다(가정하지 말고 실제 실행해 확인).
- `ruler/` 규칙을 위반하지 않는다.
