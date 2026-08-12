# 🔀 협업 규칙 — 브랜치 · 커밋 · PR · 이슈

**최종 업데이트**: 2026-07-29 (프론트 협업 규칙 정리)

> 📖 관련: [PIPELINE.md](PIPELINE.md) · [LIBRARIES.md](LIBRARIES.md) · 공개 규칙 원문은 루트 [README.md](../README.md), 양식은 `.ai/template/`
>
> ⚠️ 타입 체계는 **이슈·PR·커밋 전부 `[FEAT] [FIX] [REF] [STYLE] [DOCS] [TEST] [CHORE]`** (대괄호+대문자)로 통일한다.

---

## 1. 브랜치 전략

`main` + `develop` 2단계. 기능 브랜치는 항상 `develop` 에서 딴다.

| 브랜치        | 역할                                | 보호               |
| ------------- | ----------------------------------- | ------------------ |
| `main`        | 배포 기준. 릴리즈 PR로만 병합       | ✅ 직접 push 금지  |
| `develop`     | 통합 개발. 기능 브랜치의 머지 대상  | ✅ 직접 push 금지  |
| `feat/*`      | 기능 개발                           | —                  |
| `fix/*`       | 버그 수정                           | —                  |
| `ref/*`       | 리팩토링                            | —                  |
| `chore/*`     | 설정·빌드·문서                      | —                  |

**흐름**: `feat/*` → PR → `develop` → (검증) → **Release PR** → `main` → 배포

### 브랜치 이름 규칙

```
<타입>/<간단한-설명>
```

- 소문자 + 하이픈(`-`). 한글·공백·언더스코어 금지.
- 예: `feat/login-page`, `fix/token-refresh`, `ref/api-layer`, `chore/eslint-config`

---

## 2. 커밋 메시지

상세 양식: [template/COMMIT.md](template/COMMIT.md)

```
[TYPE] 한 줄 요약 (#이슈번호)

- 변경 사항 1
- 변경 사항 2
```

| 타입          | 사용 시점                |
| ------------- | ------------------------ |
| `[FEAT]`      | 신규 기능 추가           |
| `[FIX]`       | 버그·오류 수정           |
| `[REF]`       | 리팩토링 (동작 변화 없음) |
| `[STYLE]`     | UI·CSS 수정              |
| `[DOCS]`      | 문서 작성·수정           |
| `[TEST]`      | 테스트 추가·수정         |
| `[CHORE]`     | 빌드·설정·의존성         |

---

## 3. PR 규칙

상세 양식: [template/PR.md](template/PR.md)

- **제목**: `[TYPE] 작업 내용` — 예: `[FEAT] 로그인 페이지 구현`
- **본문**: 템플릿 준수, `Closes #N` 으로 이슈 연결
- **일반 PR**은 `develop` 대상, **Release PR**(`develop → main`)은 `[Release] vX.Y.Z` 형식 ([PIPELINE.md](PIPELINE.md) 참고)
- 타입은 위 커밋 타입 표와 **동일한 7종**을 사용한다.

---

## 4. 이슈 규칙

상세 양식: [template/ISSUE.md](template/ISSUE.md)

- **제목**: Feature 이슈는 기능명 간결하게, Task 이슈는 `[TASK] 작업명` (템플릿 기본값)
- **템플릿**: `.github/ISSUE_TEMPLATE/` 의 `new-issue.yml`(✨ Feature) · `task.yml`(📒 Task)
- 라벨은 템플릿이 자동 부여 (`feature` / `Type: Task`)
- 작업 내용은 체크박스로 최대한 세분화

---

## 5. 코드 리뷰

- PR은 **CodeRabbit 자동 리뷰**(한국어, assertive)를 거친다. ([PIPELINE.md §CodeRabbit](PIPELINE.md))
- 리뷰 코멘트는 해결(resolve) 후 머지.
- 접근성·타입 안정성·런타임 오류 가능성을 우선 점검한다.

---

## 6. 체크리스트 — 작업 시작 전

- [ ] 이슈가 있는가? 없으면 먼저 생성
- [ ] 최신 `develop` 에서 브랜치를 땄는가?
- [ ] 브랜치 이름이 규칙에 맞는가?
- [ ] API 연동이면 [API.md](API.md) 를 먼저 읽었는가?
- [ ] 새 라이브러리를 쓴다면 [LIBRARIES.md](LIBRARIES.md) 에 반영했는가?
