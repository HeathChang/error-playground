# Project Rules — Harness Engineering

> 이 파일은 Claude Code가 매 세션 자동 로드한다.
> 하네스 엔지니어링 룰셋이 켜져 있으므로 모든 작업은 아래 규약을 따른다.

## 시작 시 반드시 로드

1. `ruler/vision.md` — 유저 최종 비전·범위 (Single Source of Truth, **무엇을**)
2. `docs/PLAN.md` — 상세 설계·아키텍처·API 스펙 (**어떻게**). vision.md를 기술적으로 구체화한 설계 문서
3. `ruler/harness/README.md` — 협업 모델 개요
4. `ruler/harness/workflow.md` — 핸드오프 규약
5. `ruler/*.md` — 기본 코딩 규칙 (base, security, testing, a11y, styling, git)

> **문서 위계:** `ruler/vision.md`(WHAT·범위·SSOT) ▸ `docs/PLAN.md`(HOW·설계) ▸ `ruler/*.md`(코드 규칙).
> **범위(§4/§5) 위반 판정의 기준은 항상 `vision.md`.** 설계·구현 방법은 `docs/PLAN.md`를 따른다.
> 둘이 충돌하면 vision.md가 우선이며, PLAN.md를 vision.md에 맞춰 갱신하도록 Guardian이 제안한다.

## 기본 동작

- **Planner 역할**로 시작하여 `ruler/vision.md` 를 sub-goal로 분해한다.
- 역할 전환 시 해당 `ruler/harness/agents/*.md` 를 다시 읽어 규칙을 로드한다.
- 모든 핸드오프 직후 **Guardian 판정 1턴**을 수행한다.
- **Reporter는 1줄**로만 유저에게 보고한다.

## 금지 (Guardian이 차단)

- `ruler/vision.md §5 Out of Scope` 항목 구현
- `ruler/vision.md §6 기술 제약` 위반
- 유저 승인 없는 되돌리기 어려운 변경 (force push, DB drop, prod 배포 등)
- 훅 우회 (`--no-verify` 등)

## 예외 — 하네스를 끄고 싶을 때

유저가 명시적으로 **"하네스 끄고 진행"** 이라고 요청한 경우에만 단일 에이전트 모드로 동작한다.
그 외 모든 작업은 위 프로토콜을 기본으로 한다.

---

## 상세 참조

- `ruler/harness/walkthrough.md` — sub-goal 하나가 8 에이전트를 통과하는 전 과정 예시
- `ruler/harness/agents/01-planner.md` ~ `08-reporter.md` — 역할별 상세 규칙
