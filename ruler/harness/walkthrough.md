---
title: 전 사이클 데모 워크스루
category: 하네스
---

# Walkthrough — 한 개의 sub-goal이 8명을 통과하는 전 과정

> 이 문서는 **실제 sub-goal 하나**가 유저 → Planner → Researcher → Implementer → Reviewer → Security Auditor → QA → Guardian → Reporter 를 지나는 전 사이클을 보여준다.
> 에이전트 규칙이 어떻게 **실전에서 맞물리는지** 확인하는 용도.
> ruler/vision.md 예시(카페 재고 SaaS)를 기준으로 작성되었다.

---

## 상황

- ruler/vision.md 작성 완료 (§1~§9 채워짐)
- 오늘의 대상: **Sub-Goal #1 — POST /api/items 엔드포인트로 재고 아이템 1개 생성**
- 스택: backend (Node 20 + Fastify + Postgres)

---

## 0. 유저 → Reporter

유저: "ruler/vision.md 첫 번째 목표부터 진행해줘."

**[Reporter]** `세션 시작 · ruler/vision.md §4 in-scope "재고 아이템 CRUD"를 대상 · Planner 호출`

---

## 1. Planner

**입력:** ruler/vision.md

**출력:**

```
Sub-Goal #1 — POST /api/items 구현
근거: ruler/vision.md §4 "재고 아이템 CRUD"
기여하는 성공 기준: §3-[ ] "셋업 5분 이내"
완료 기준:
  - POST /api/items 가 name/unit/quantity 받아 201 반환
  - DB 테이블 items 생성 + 레코드 insert
  - 필수 필드 누락 시 422 반환
영향 범위:
  - 신규: src/api/items/create.ts, src/db/migrations/0001_items.sql
  - 수정: src/app.ts (라우트 등록)
의존 sub-goal: 없음
리스크: DTO 검증 라이브러리 미정 — Researcher 확인 필요
```

**[Reporter]** `[Planner] Sub-Goal #1 초안 생성 · Researcher에 DTO 검증 라이브러리 조사 요청`

---

## 2. Researcher

**Planner 질의:** "Fastify 프로젝트에 DTO 검증 패턴이 이미 있나? 없으면 주요 옵션은?"

**출력 (리서치 리포트):**

```
## 답변
현재 프로젝트에 DTO 검증 구현은 없음. Fastify는 기본적으로 ajv 기반 스키마를 지원한다.

## 근거
- ripgrep "zod|yup|joi|ajv" in src/**/*.ts → 0 hits
- package.json: 해당 의존성 없음
- fastify 4.x 공식 문서: schema 프로퍼티로 ajv 검증 내장 지원

## 추천
- 옵션 A: Fastify 내장 schema (의존성 추가 없음, JSON Schema 문법)
- 옵션 B: zod (TS 타입과 연동 강력, 의존성 +1)
트레이드오프: A는 가볍고 표준적, B는 타입 추론 유리하나 ruler/base.md "외부 라이브러리 불가피한 경우만" 관점에서 보수적 선택이 A.

**결정은 Planner가.**
```

**[Reporter]** `[Researcher] DTO 검증 조사 완료 (옵션 A/B) · Planner 복귀`

---

## 3. Planner (수정)

Planner가 옵션 A를 채택하고 sub-goal을 확정:

```
Sub-Goal #1 — POST /api/items 구현
(수정) 완료 기준:
  - Fastify 내장 schema 사용 (JSON Schema)
  - POST /api/items 가 name(string), unit(enum), quantity(int ≥ 0) 검증 후 201
  - 검증 실패 시 422 + 실패 필드 목록
...
```

**[Guardian]** (자동 호출)
판정: PASS
`근거: ruler/vision.md §4 in-scope, §6 기술제약(Fastify) 준수, §5 out-of-scope 침범 없음`

**[Reporter]** `[Planner] Sub-Goal #1 확정 (옵션 A 채택) · Guardian PASS · Implementer 대기`

---

## 4. Implementer

**입력:** 확정된 Sub-Goal #1

**수행:**
1. `src/app.ts` 읽어 라우트 등록 패턴 파악
2. `src/db/migrations/` 폴더 구조 확인 (기존 마이그레이션 네이밍)
3. `ruler/backend.md` 레이어 규칙, `ruler/api-design.md` REST 규약 로드
4. 최소 변경으로 구현

**출력 (Reviewer 핸드오프 포맷):**

```
## 구현 요약
Sub-Goal: #1 POST /api/items 구현

## 변경 파일
- src/db/migrations/0001_items.sql (신규): items 테이블 스키마
- src/api/items/create.ts (신규): 핸들러 + schema
- src/api/items/index.ts (신규): barrel
- src/app.ts (수정): 라우트 등록 1줄

## 완료 기준 충족
- [x] 201 반환: 수동 테스트 curl 결과 OK
- [x] 422 반환: unit 없는 요청 → 422 확인
- [x] insert: psql로 레코드 존재 확인

## 자가 체크리스트
- [x] 영향 범위 외 미수정
- [x] 타입 체크 PASS
- [x] 린트 PASS
- [x] 하드코딩 시크릿/URL 없음

## 리뷰어에게
- schema를 create.ts에 인라인했는데 추후 분리가 더 좋을지 판단 필요
```

**[Reporter]** `[Implementer] Sub-Goal #1 완료 (파일 4개) · Reviewer 대기`

---

## 5. Reviewer

**출력:**

```
## 종합 판정: REQUEST_CHANGES

### [MAJOR] src/api/items/create.ts:12-40
문제: schema 객체가 핸들러 파일 내부에 40줄로 인라인. 향후 update/list 핸들러도 같은 schema 필요.
제안: src/api/items/schema.ts로 추출.
근거: ruler/base.md SRP, 후속 sub-goal과의 중복 방지.

### [MINOR] src/api/items/create.ts:50
문제: catch 블록이 그냥 throw. 에러 래핑 일관성 없음.
제안: 프로젝트 공통 ApiError 래퍼 사용 (있는지 Researcher에 재확인 요청).

### 잘한 점
- 마이그레이션 파일 네이밍이 기존 패턴(0001_xxx.sql)과 일치.
- 라우트 등록이 app.ts 기존 스타일 유지.
```

**[Reporter]** `[Reviewer] REQUEST_CHANGES — MAJOR 1건, MINOR 1건 · Implementer 재작업`

---

## 6. Implementer (재작업)

1. schema를 `src/api/items/schema.ts`로 분리
2. Researcher에 "ApiError 래퍼 존재?" 질의 → 존재하지 않음 확인
3. MINOR는 이번 sub-goal 범위 밖으로 판단, Planner에 별도 sub-goal 제안:
   "Sub-Goal #N — 공통 ApiError 래퍼 도입"
4. 현 sub-goal은 MAJOR만 수정 후 Reviewer로 재송부.

**[Reporter]** `[Implementer] 재작업 완료 (schema 분리) · MINOR는 별도 sub-goal 제안 · Reviewer 재검토`

---

## 7. Reviewer (재검토) → Security Auditor

**Reviewer:** PASS.

**Security Auditor 출력:**

```
## 종합 판정: FINDINGS (low)

## 이슈
### [LOW] src/db/migrations/0001_items.sql
- 유형: 정보성 — quantity 컬럼이 bigint 없이 integer
- 영향: 매우 큰 카페 체인 재고는 int 한계(~21억) 근처 가능성 낮음 — v1에 적합
- 조치: 필요 없음. v2 스케일 시 재검토.

### 그 외
- SQL: prepared statement 사용 확인 (parameterized query)
- 입력 검증: schema에서 완전 검증
- 인증: 이 sub-goal은 아직 인증 범위 아님 (Planner 확인 필요)

### Planner 확인 요청
- POST /api/items 가 인증 없이 열려 있음. ruler/vision.md §2 primary user는 "사장"이라 보호된 엔드포인트여야 할 것으로 추정.
- 이번 sub-goal이 아니면 Sub-Goal #<next>로 반드시 인증 추가 필요.
```

**[Guardian]** 자동 판정:
`DRIFT 가능성 — ruler/vision.md §7 보안에 "감사 로그" 명시 있으나 인증 자체는 §6 "argon2"만 언급. Planner에게 다음 sub-goal로 인증 추가 확인 요청.`

**[Reporter]** `[Security Auditor] FINDINGS(low) · 인증 누락은 별도 sub-goal로 Planner 확인 · QA 이동`

---

## 8. QA

**출력:**

```
## 종합 판정: PASS

## 완료 기준 체크
- [x] 201 반환: `curl -XPOST .../api/items -d '{...}' → 201 Created`
- [x] 422 반환: name 누락 시 422 + {errors:[{field:"name"}]}
- [x] DB insert: select count(*) from items → +1

## 골든 패스
- POST 201 → id 반환 → GET /items/:id는 아직 미구현이므로 DB 직접 확인

## 엣지 케이스
- 빈 body: 422 PASS
- quantity: -1: 422 PASS
- name 너무 길 때 (256자): 422 PASS (schema maxLength 확인)
- unit: 허용 외 값: 422 PASS
- 동일 name 중복 insert: 현재 성공 (unique 제약 없음) — ruler/vision.md에 언급 없어 추후 결정 필요

## 회귀
- 기존 헬스체크 엔드포인트 정상.

## 후속 제안
- name 중복 허용/거부 정책은 ruler/vision.md §9 Open Questions로 추가 제안.
```

**[Reporter]** `[QA] PASS (엣지 4/4) · 중복 정책은 ruler/vision.md §9로 · Guardian 최종 판정`

---

## 9. Guardian (최종)

**출력:**

```
[Guardian] PASS — Sub-Goal #1 ruler/vision.md §4 in-scope 충족, §5 out-of-scope 침범 없음

## 근거
- ruler/vision.md §4: "재고 아이템 CRUD" — C(Create) 부분 충족
- §3 성공 기준 "셋업 5분": 이 엔드포인트는 등록 플로우의 핵심 1단계
- §6 기술 제약(Fastify, Postgres): 준수
- §5 out-of-scope(멀티 매장 등): 침범 없음

## 부가 제안 (유저 승인 필요)
- ruler/vision.md §9 Open Questions 에 추가 제안:
  1. "재고 name 중복 허용 정책"
  2. "매장 인증 범위 — 언제 누구를 인증할 것인가"
- 위 두 항목은 다음 sub-goal 생성 전 유저 결정 필요.
```

**[Reporter]** `[Guardian] Sub-Goal #1 PASS · ruler/vision.md §9 추가 질문 2건 유저 확인 요청`

---

## 10. 유저 → 다음 반복

유저가 ruler/vision.md §9 갱신:
- "재고 name: 같은 매장 내 중복 불가"
- "모든 /api/items/* 는 세션 인증 필수"

갱신된 ruler/vision.md를 기반으로 Planner가 Sub-Goal #2, #3 생성 → 사이클 반복.

---

## 이 워크스루에서 확인할 것

| 관찰 포인트 | 어디서 |
|-------------|--------|
| Planner가 코드 쓰지 않음 | 1, 3단계 |
| Researcher가 결정하지 않음 | 2단계 (옵션만 제시, 선택은 Planner) |
| Implementer가 범위 외 수정 거부 | 6단계 (MINOR를 별도 sub-goal로) |
| Reviewer와 Security가 다른 층을 봄 | 5, 7단계 |
| Guardian이 모든 핸드오프에 개입 | 3, 7, 9단계 |
| Reporter 1줄 원칙 | 각 단계 말미 |
| ruler/vision.md가 질문의 답 + 새 질문의 원천 | 9~10단계 |

---

## 이 샘플이 긴 이유

실제 AI 에이전트 세션은 이보다 **짧다** — 각 에이전트 규칙이 로드되어 있으면 요약이 축약된다.
이 문서는 규칙 적용 여부를 **검증할 수 있도록** 모든 단계를 풀어 쓴 교육용.

실전에서는 Reporter가 1줄만 남기고, 중간 출력은 에이전트 내부에 머문다.
유저에게 보이는 건 10줄 내외의 Reporter 로그 + 최종 diff + 갱신된 ruler/vision.md.
