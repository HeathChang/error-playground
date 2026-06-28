---
title: 에이전트 핸드오프 규약
category: 하네스
---

# Workflow — 에이전트 간 핸드오프 규약

> 각 에이전트는 **자신의 역할만 수행**하고, 다음 에이전트에게 **명시적 핸드오프**로 넘긴다.
> 자의적으로 다른 역할을 겸하는 순간 하네스는 무너진다.

## 핸드오프 매트릭스

| From | To | 조건 | 넘기는 것 |
|------|----|----|--------|
| 유저 | Planner | ruler/vision.md 작성/갱신 완료 | ruler/vision.md |
| Planner | Researcher | 기존 코드/제약 확인 필요 | 구체적 질문 |
| Researcher | Planner | 리서치 완료 | 리서치 리포트 (파일 경로 + 라인 번호 포함) |
| Planner | Implementer | sub-goal 확정 | sub-goal 1개 + 완료 기준 |
| Implementer | Planner | 범위 벗어난 변경 필요 | 변경 요청 이유 |
| Implementer | Reviewer | 완료 기준 만족 + 타입/빌드 통과 | diff + sub-goal |
| Reviewer | Implementer | 재작업 요청 | 구체적 피드백 |
| Reviewer | Security Auditor | 리뷰 통과 | diff |
| Security Auditor | Implementer | 보안 이슈 발견 | 이슈 목록 |
| Security Auditor | QA | 보안 통과 | diff |
| QA | Implementer | 테스트 실패 | 실패 케이스 |
| QA | Guardian | 모든 검증 통과 | 완료된 sub-goal + 변경 요약 |
| Guardian | 유저 | ruler/vision.md 변경 필요 감지 | 변경 제안 + 이유 |
| Guardian | Reporter | sub-goal 종결 | 최종 결과 |
| Reporter | 유저 | 상태 변화 발생 | 1줄 보고 |

## Guardian의 개입 규칙

Guardian은 **모든 핸드오프 지점**에서 자동으로 호출된다 (단일 체크포인트 아님).

Guardian이 판정하는 3가지 상태:

- **PASS** — ruler/vision.md 의도와 일치. 통과시킨다.
- **DRIFT** — 의도에서 미묘하게 벗어남. 해당 에이전트에게 반송, 이유 명시.
- **VIOLATION** — 명시적 제약(in-scope/out-of-scope)을 어김. 즉시 차단, 유저에게 에스컬레이션.

Guardian은 **코드 품질을 판단하지 않는다** (그건 Reviewer 책임).
**기능 동작을 검증하지 않는다** (그건 QA 책임).
오직 **"이게 유저가 원했던 것인가"** 만 본다.

## Reporter 개요

매 핸드오프마다 Reporter가 **1줄**로 유저에게 보고한다.
포맷·금지사항·유저 질문 처리·quiet/verbose 모드 등 상세 규약은 `ruler/harness/agents/08-reporter.md` 참조.

요약만:
```
[에이전트명] 무엇을 했는지 · 다음 단계
```

## 블로커 프로토콜

에이전트가 진행할 수 없는 상황에 부딪히면:

1. **추측하지 않는다.**
2. Reporter를 통해 유저에게 질문한다 — 구체적으로, 2~3개 선택지를 제시.
3. 유저 응답 전까지 다음 에이전트에게 넘기지 않는다.
4. ruler/vision.md가 모호한 게 원인이면 Guardian이 유저에게 ruler/vision.md 보강을 요청한다.

## 에스컬레이션

다음 경우 즉시 유저에게 에스컬레이션:

| 상황 | 에스컬레이트 주체 | 이유 |
|------|----------------|------|
| ruler/vision.md와 현재 코드베이스 모순 | Guardian | 설계 결정 필요 |
| 보안 이슈 (Critical/High) | Security Auditor | 기술적 판단 한계 |
| 외부 API/인프라 의존성 발견 | Researcher | 권한·계정 필요 |
| 되돌리기 어려운 변경 (DB 마이그레이션, force push 등) | 해당 에이전트 | 승인 필요 |
| 3회 이상 같은 에이전트로 반송 루프 | Guardian | 구조적 문제 시사 |

## 병렬 실행 가능 조합

다음은 순서 없이 동시에 실행해도 안전하다 (독립적인 sub-goal 여럿이 있을 때):

- Researcher 조사 ↔ 이전 sub-goal의 Reviewer/QA
- Reporter 보고 ↔ 다음 sub-goal의 Planner 준비

**Implementer는 항상 직렬.** 동시에 두 sub-goal을 손대면 diff가 엉킨다.

### 병렬 실행 프로토콜

여러 독립 sub-goal을 병렬로 진행하는 경우:

1. **독립성 검증:** Planner가 각 sub-goal의 `의존 sub-goal` 필드로 DAG를 구성. 공통 파일을 수정하는 sub-goal은 병렬 금지.
2. **격리:** 각 트랙(병렬 실행 단위)마다 고유 ID 부여 (T1, T2...). 모든 로그·Reporter 출력에 트랙 ID 프리픽스.
   예: `[T2][Implementer] Sub-Goal #5 구현 시작`
3. **Guardian 통합 판정:** 병렬 트랙이 끝나면 Guardian이 **모든 트랙의 diff를 한 번에** 검토 — 트랙 간 충돌 확인.
4. **Reviewer/Security Auditor/QA는 트랙별 개별 실행 가능**, 단 **머지 시점은 직렬화**.
5. **충돌 감지 시** 먼저 통과한 트랙을 기준으로 나머지는 rebase 후 재검증.

트랙 수는 에이전트 안정성을 고려해 **최대 3개** 권장. 초과 시 복잡성이 이득을 넘어선다.

## 긴 세션 / 컨텍스트 손실 프로토콜

LLM 세션이 길어지면 컨텍스트 압축·역할 혼동·ruler/vision.md 기억 소실이 발생한다.

### 감지 신호

- 에이전트가 자신의 역할 규칙을 위반하기 시작 (Planner가 코드를 쓰는 등)
- sub-goal의 ruler/vision.md 인용 근거가 사라짐
- 같은 질문을 반복
- Reporter 출력이 여러 줄로 길어짐 (1줄 규칙 망각)

### 방어 루틴

1. **매 3~5턴마다 Reporter가 상태 요약 출력** (ruler/vision.md § 번호, 현재 sub-goal, 완료 목록, 현재 에이전트).
2. **역할 전환 시 해당 에이전트의 md 파일을 다시 읽는다** — 기억에 의존하지 않음.
3. **Guardian이 매 핸드오프에서 ruler/vision.md 섹션 인용을 강제.** 인용 실패 = DRIFT.
4. **sub-goal 완료 시마다 ruler/vision.md 성공 기준 체크리스트 갱신** — 이게 세션의 "저장 지점".

### 세션 재시작

컨텍스트가 한계에 가까워지면 **새 세션으로 인계**:

1. Reporter가 인계용 요약 생성 (ruler/vision.md 상태 + 완료 sub-goal + 진행 중 sub-goal + 다음 에이전트).
2. 새 세션에서 ruler/vision.md + 요약 + 현재 에이전트 md만 읽고 재개.
3. Guardian이 "인계 직후 판정"으로 정합성 재확인.

인계는 **진행 중 sub-goal을 중단하지 않는 지점**(에이전트 경계)에서만 수행.

### AI 툴별 특이사항

- **Claude Code:** `/compact` 후 ruler/vision.md + 현재 에이전트 md 재로드.
- **Cursor Agent:** 새 chat + `.cursorrules`에 이 harness 규칙 영구 포함.
- **Copilot Chat:** 워크스페이스 context가 매 쿼리 재로드되므로 ruler/vision.md 위치를 고정.

## 세션 종료 조건

- 모든 sub-goal이 Guardian PASS를 받았다.
- 유저가 "종료" 또는 "여기까지"를 명시했다.
- Critical 보안 이슈가 미해결 상태이면 종료 불가 — 유저 판단 요청.

## 사후 이슈 복구 (Post-Release Recovery)

QA PASS → Guardian PASS → 머지된 sub-goal에서 **나중에** 결함이 발견되는 경우.

### 1. 접수

- 유저가 Reporter에게 이슈 전달 (슬랙·이슈 트래커·직접 프롬프트).
- Reporter가 **즉시** 다음 정보를 유저에게 재확인 후 기록:
  - 재현 스텝
  - 영향 범위 (몇 명? 어느 기능?)
  - 심각도 (데이터 손실/보안/기능 저하/UI)
- 정보 불완전하면 Researcher에게 재현 증거 수집 의뢰.

### 2. 분류 — Guardian 주관

Guardian이 다음 3가지 중 하나로 판정:

| 분류 | 조건 | 처리 |
|------|------|------|
| **기획 결함** | ruler/vision.md §3 성공 기준 또는 §9 Open Questions에서 **놓친 케이스** | ruler/vision.md 갱신 요청 → Planner 재기획 |
| **구현 결함** | sub-goal 완료 기준은 맞았으나 엣지 케이스 미커버 | Planner가 hotfix sub-goal 생성 |
| **회귀** | 이후 sub-goal이 이전 기능을 깨뜨림 | 원인 sub-goal 역추적 → Reviewer/QA 루프 강화 |

### 3. Hotfix vs 정식 복구

**Hotfix 조건 (모두 충족 시):**
- 프로덕션에서 영향 진행 중 (데이터 손상, 접근 불가, 보안 유출)
- 30분 ~ 2시간 내 완화 가능
- 범위 최소 (1~2 파일)
- Rollback 가능

Hotfix 경로: Implementer 즉시 구현 → Security Auditor 빠른 체크 → QA 최소 재현 테스트 → 머지. Reviewer 생략 가능(대신 사후 24시간 내 리뷰 필수).

**정식 복구 조건:**
- 구조적 원인, 재발 방지 필요
- 여러 파일·모듈에 영향
- 시간 여유 있음

정식 경로: 일반 sub-goal 사이클을 그대로 따른다 (Planner → ... → Guardian → Reporter).

### 4. 학습 루프 (필수)

복구 완료 후 반드시:

1. **회귀 테스트 추가** — QA가 해당 케이스를 영구 테스트로 등재.
2. **ruler/vision.md §9 Open Questions 갱신** — "같은 유형의 누락이 있을 가능성"을 추적 질문으로 추가.
3. **같은 카테고리 sub-goal 감사** — Planner가 다른 sub-goal 중 같은 맹점을 가진 것들을 목록화.
4. **에이전트 규칙 수정 검토** — 이 유형이 반복되면 해당 에이전트 md에 체크 항목 추가 제안 (예: Security Auditor 체크리스트에 새 항목).

### 5. 에스컬레이션 기준

다음은 **유저 판단 필수**:

- 데이터 손실 또는 유출 의심
- Critical/High 보안 이슈
- 롤백이 다른 사용자 데이터에 영향
- 수정 범위가 ruler/vision.md §5 out-of-scope로 확장될 가능성

### 6. Reporter 출력 (사후 복구 중)

평소보다 **빈도 증가** — 유저가 상황을 실시간 인지해야 함:

```
[Reporter] 이슈 접수: <요약> · Researcher 재현 시작
[Researcher] 재현 확인 (스텝 3단계) · Guardian 분류 대기
[Guardian] 분류: 구현 결함 · hotfix 경로 선택 · Implementer 즉시 복구
[Implementer] hotfix 구현 완료 (1파일) · Security 빠른 체크
[Security Auditor] PASS · QA 재현 테스트
[QA] 재현 테스트 PASS · 머지 준비
[Reporter] 복구 머지 완료. 학습 루프: 회귀 테스트 1건 추가, ruler/vision.md §9 갱신 제안
```
