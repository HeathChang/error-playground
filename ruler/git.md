---
title: Git 워크플로우
stack: frontend
category: 워크플로우
extends: [base.md]
---

# Git & PR Workflow

> `base.md`를 상속한다. 브랜치 전략, 커밋 메시지, PR 프로세스 규칙이다.

## 브랜치 전략

| 브랜치 | 용도 | 머지 대상 |
|--------|------|-----------|
| `main` / `master` | 프로덕션 배포 | — |
| `develop` | 개발 통합 | `main` |
| `feature/*` | 기능 개발 | `develop` |
| `fix/*` | 버그 수정 | `develop` |
| `hotfix/*` | 긴급 수정 | `main` + `develop` |

- 브랜치명은 **소문자 kebab-case**: `feature/login-redesign`
  - 근거: 대소문자 혼용 시 macOS(case-insensitive FS)는 동작하지만 Linux CI는 실패. kebab-case는 모든 환경 호환.
- `main`, `develop`에 직접 push 금지 — 반드시 PR.
  - 근거: 리뷰·CI 검증·rollback 추적을 PR 단위로 가두기 위함. 직접 push는 이력에서 *왜 이 변경이 들어갔는지* 컨텍스트가 사라진다.

## 커밋 메시지 (Conventional Commits)

```
<type>: <subject>

[optional body]
```

| type | 용도 |
|------|------|
| feat | 새 기능 |
| fix | 버그 수정 |
| refactor | 리팩토링 |
| style | 코드 스타일 |
| test | 테스트 |
| docs | 문서 |
| chore | 빌드/설정/의존성 |

- subject는 **50자 이내**, 마침표 없이.
- body는 **왜(why)** 이 변경이 필요한지 설명.

## PR 규칙

- PR 하나는 **하나의 관심사**만 다룬다.
- PR 설명에 포함:
  - 변경 사항 요약 (무엇을, 왜)
  - 테스트 방법
  - 스크린샷 또는 화면 녹화 (UI 변경이 있을 때만)

## AI 행동 규칙

- 커밋 메시지 작성 시 위 컨벤션을 따른다.
- PR 생성 시 변경 파일 전체를 분석하여 요약한다 — 최근 1커밋이 아닌 *PR의 모든 커밋 합본*을 기준으로.
- `main` / `develop`에 직접 push 금지.
- **force push는 사용자 명시 요청 시에만** — 그 외엔 절대 금지. 공유 브랜치에 force push 발견 시 즉시 멈추고 사용자에게 확인.
- 사용자가 명시적으로 "커밋해 / 푸시해" 라고 말하기 전엔 `git commit` / `git push` 호출 금지.

## 패턴 (DO / DON'T)

### 커밋 메시지

```
# DON'T
wip
fix
update code

# DO
feat: 로그인 페이지에 OAuth 버튼 추가
fix: 빈 email 입력 시 400 대신 422 반환
```

### 기타 금지/권장

| DON'T | DO |
|-------|-----|
| 하나의 커밋에 여러 관심사 혼합 | 관심사별 분할 커밋 |
| PR 설명 없이 리뷰 요청 | 요약 + 테스트 방법 + (UI 변경 시) 스크린샷 |
| `main`에 직접 push | PR + 리뷰 후 머지 |
