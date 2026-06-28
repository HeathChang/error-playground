# 시작하기 — 이 폴더를 프로젝트에 적용하기

압축을 풀어 나온 내용을 **프로젝트 루트에 그대로 복사**하면 끝입니다.
별도로 폴더를 만들거나 설정 파일을 직접 작성할 필요가 없습니다 — 모두 포함되어 있습니다.

이 룰셋에는 **하네스 엔지니어링(8역할 협업 모델)** 이 포함되어 있다 — `ruler/vision.md` 를 먼저 채운 뒤 시작한다.

## 이 ZIP에 들어있는 것

```
(압축 푼 폴더)/
├── AGENTS.md              ← 범용 표준 진입점 (AGENTS.md 지원 도구 전부)
├── CLAUDE.md          ← Claude Code 전용 진입점
├── START-HERE.md          ← 이 안내
└── ruler/                 ← 규칙 본문 (AI가 읽는 실제 룰)
    ├── base.md
    ├── git.md
    ├── security.md
    ├── vision.md
    ├── harness/README.md
    ├── harness/workflow.md
    ├── harness/walkthrough.md
    ├── harness/agents/01-planner.md
    ├── harness/agents/02-researcher.md
    ├── harness/agents/03-implementer.md
    ├── harness/agents/04-reviewer.md
    ├── harness/agents/05-security-auditor.md
    ├── harness/agents/06-qa.md
    ├── harness/agents/07-guardian.md
    ├── harness/agents/08-reporter.md
    ├── testing.md
    ├── a11y.md
    ├── styling.md
```

## 프로젝트에 넣기

폴더 내용 전체를 프로젝트 루트로 복사합니다.

### 방법 A. 터미널 (가장 확실)

압축 푼 폴더 안에서 실행 (끝의 `/.` 가 숨김 항목까지 빠짐없이 복사):

```bash
cp -R . /내/프로젝트/경로/
```

### 방법 B. Finder / 탐색기

보이는 항목(`AGENTS.md`, `ruler/`, `CLAUDE.md` 등)을 프로젝트 루트로 드래그.

## 적용 확인 — 끝내지 말고 검증

AI 도구에 아래를 그대로 물어본다:

```
ruler/ 디렉토리의 어떤 파일을 자동으로 읽었는지 알려줘. 읽지 않은 파일이 있다면 이유는?
```

AI가 실제 파일 목록을 답하면 연동 성공. 일반론으로 답하면 `CLAUDE.md` 가
프로젝트 루트에 있는지, 도구가 그 파일을 자동 로드하도록 설정됐는지 재확인한다.

## Git 공유

`ruler/` 와 `CLAUDE.md` 는 팀이 공유하도록 커밋한다.
규칙은 한 곳(`ruler/`)에만 두고, 루트 부트스트랩 파일이 그걸 가리키므로 중복이 없다.
