# 📚 문서 인덱스

그룹웨어 서비스 (3조) **프론트엔드** — AI 협업 & 운영 문서 모음.

> 이 폴더의 목적은 **AI에게 프로젝트의 기억을 파일로 만들어 주는 것**이다.
> AI는 세션마다 기억을 잃는다. 여기에 규칙과 상태를 남겨두면 매번 처음부터 설명하지 않아도 된다.
>
> 🔗 백엔드 협업 문서는 `back/.ai/` 에 별도로 있다. 이 폴더는 **프론트 관점**만 담는다.

---

## 🗺️ 전체 구조

```
루트/
├── AGENTS.md          ⭐ 메인 규칙 (AI가 가장 먼저 읽는 파일)
├── CLAUDE.md             Claude Code 진입점 (AGENTS.md 포인터)
├── README.md             PR·브랜치·버전·릴리즈 공개 규칙 (팀 공용)
└── .ai/
    ├── README.md         이 파일 — 문서 인덱스
    ├── API.md            연동할 백엔드 API 명세 사본 (프론트는 호출하는 입장)
    ├── LIBRARIES.md      사용 라이브러리 인벤토리 (무엇을·어디서·왜)
    ├── CONVENTION.md     브랜치·커밋·PR·이슈 규칙
    ├── PIPELINE.md       CI/CD 구조 (release.yml · CodeRabbit)
    ├── STATE.md          현재 진행 상황
    ├── WORKLOG.md        완료 작업 기록
    └── template/         PR·Issue·커밋·STATE·WORKLOG 양식
```

## 🔌 도구별 자동 인식

AI 도구마다 가장 먼저 읽는 파일 이름이 달라서 두 파일을 둔다.

| 도구            | 자동으로 읽는 파일             |
| --------------- | ------------------------------ |
| **Codex**       | `AGENTS.md` (바로 읽음)        |
| **Claude Code** | `CLAUDE.md` → `@AGENTS.md` 연결 |

규칙 본문은 **`AGENTS.md` 하나에만** 있다. 규칙을 고칠 땐 항상 `AGENTS.md` 만 수정한다.

---

## 📦 문서별 역할

| 문서                             | 역할                                       | 언제 읽나                         |
| -------------------------------- | ------------------------------------------ | --------------------------------- |
| [API.md](API.md)                 | 연동할 백엔드 API 명세 (경로·타입·에러코드) | API 연동 코드 작성 전 (필수)      |
| [LIBRARIES.md](LIBRARIES.md)     | 사용 라이브러리·용도·사용 위치             | 의존성 추가/변경 전, 스택 파악 시 |
| [CONVENTION.md](CONVENTION.md)   | 브랜치·커밋·PR·이슈 규칙                    | 브랜치 만들 때, 커밋·PR 쓸 때     |
| [PIPELINE.md](PIPELINE.md)       | CI/CD 워크플로우·릴리즈 자동화 구조         | `.github/workflows/` 수정 전      |
| [STATE.md](STATE.md)             | 현재 진행 상황·로드맵·백로그               | 세션 시작 시 ("이어서 하자")      |
| [WORKLOG.md](WORKLOG.md)         | 완료 작업 기록·트러블슈팅                  | 작업 완료 기록 시                 |

### 양식 (`template/`)

| 양식          | 파일                                            |
| ------------- | ----------------------------------------------- |
| PR 본문       | [template/PR.md](template/PR.md)                |
| Issue 본문    | [template/ISSUE.md](template/ISSUE.md)          |
| 커밋 메시지   | [template/COMMIT.md](template/COMMIT.md)        |
| STATE 초기값  | [template/STATE.template.md](template/STATE.template.md)     |
| WORKLOG 초기값 | [template/WORKLOG.template.md](template/WORKLOG.template.md) |

---

## 🚫 백엔드 문서 중 프론트에 두지 않은 것

백엔드 `.ai/` 를 그대로 복사하지 않았다. 프론트에서 **필요 없는 것은 의도적으로 제외**했다.

| 백엔드 문서              | 제외 이유 (프론트 관점)                                       | 프론트 대체            |
| ------------------------ | ------------------------------------------------------------- | ---------------------- |
| `INFRA.md` (EC2/RDS 등)  | 서버 인프라는 백엔드 소관. 프론트 배포는 정적 호스팅/Vercel 급 | `PIPELINE.md` 에 축약  |
| `API.md` (계약 보호 규칙) | "명세를 지어내지 마라"는 **생산자(백엔드)** 규칙              | 프론트는 **소비자용** `API.md` 로 대체 |
| `api/` (노션 명세 사본)  | 명세 원본 관리는 백엔드/노션 몫                               | 필요한 API만 `API.md` 에 옮겨 적음 |
| Swagger/JDK/Gradle CI    | 프론트 스택과 무관                                            | Next 빌드·lint 기준 CI |

---

## 💡 자주 쓰는 문구

| 하고 싶은 것      | AI에게 말하기                              |
| ----------------- | ------------------------------------------ |
| 지난 작업 이어서  | "이어서 하자" / "전에 어디까지 했지?"      |
| 작업 완료 기록    | "완료" / "WORKLOG에 기록해줘"              |
| 백로그 등록       | "이건 백로그에 넣어줘"                     |
| API 연동          | "로그인 붙여줘" (AI가 API.md 먼저 읽음)    |
| 라이브러리 추가   | "OO 라이브러리 추가하자" (LIBRARIES.md 갱신) |
