# ⚙️ CI/CD 파이프라인 (프론트)

**최종 업데이트**: 2026-07-29 (현행 워크플로우 기준 정리)

> `.github/workflows/` 를 수정하기 전에 이 문서를 먼저 읽는다.
> 워크플로우를 추가·변경하면 이 문서도 **같이** 갱신한다.
>
> 📖 관련: [CONVENTION.md](CONVENTION.md) · [LIBRARIES.md](LIBRARIES.md)

---

## 1. 전체 흐름

```
PR → develop/main       :  CodeRabbit AI 리뷰
push → main (Release PR 머지) :  release.yml — 태그 생성 + GitHub Release 발행
빌드/린트 CI            :  ⬜ 미구축 (아래 §4)
배포                     :  ⬜ 미구축
```

---

## 2. 워크플로우 목록

| 파일          | 트리거        | 하는 일                                       | 상태      |
| ------------- | ------------- | --------------------------------------------- | --------- |
| `release.yml` | push → `main` | `[Release] vX.Y.Z` PR 감지 → 태그·릴리즈 생성 | ✅        |
| 빌드·린트 CI  | —             | `next build` + `eslint`                       | ⬜ 미구축 |
| 배포          | —             | —                                             | ⬜ 미구축 |

---

## 3. `release.yml` — 릴리즈 자동화

`develop → main` Release PR이 병합되면 자동으로 **Git 태그 + GitHub Release**를 만든다.

| 항목        | 내용                                                                         |
| ----------- | ---------------------------------------------------------------------------- |
| 트리거      | `push` → `main`                                                              |
| 러너        | `ubuntu-latest`                                                              |
| 권한        | `contents: write`, `pull-requests: read`                                     |
| PR 탐지     | 커밋에 연결된 `develop → main` PR을 찾음 (없으면 merge commit 메시지로 폴백) |
| 버전 추출   | PR 제목 `[Release] vX.Y.Z` 에서 `vX.Y.Z` 파싱                                |
| 릴리즈 노트 | PR 본문에서 추출 (아래 ⚠️ 헤더 규칙)                                         |

### ⚠️ Release PR 제목 규칙 (필수)

```text
[Release] vX.Y.Z      (예: [Release] v1.0.0)
```

형식이 다르면 워크플로우가 **실패**한다. `main` 은 `[Release]` PR로만 병합한다.

### ⚠️ 본문 헤더 고정

release.yml는 Release PR 본문의 **H1 헤더 문구로** 릴리즈 노트를 추출한다.
`.github/PULL_REQUEST_TEMPLATE/RELEASE_PR_TEMPLATE.md` 의 아래 헤더를 바꾸면 추출이 깨진다.

| 추출 대상          | 범위                                               |
| ------------------ | -------------------------------------------------- |
| 릴리즈 요약 + 노트 | `# 📖 릴리즈 요약` ~ `# 🧪 릴리즈 체크리스트` 직전 |
| 기타 사항          | `# 💬 기타 사항` ~ 문서 끝                         |

→ Release에는 **요약·릴리즈 노트·기타 사항**만 포함된다. (체크리스트·버전 정보·Git Tag 섹션 제외)

---

## 4. 아직 없는 것 (권장 백로그)

프론트는 아직 **빌드/린트 CI가 없다.** 다음을 추가하면 "깨진 PR 머지 불가"를 강제할 수 있다.

- [ ] `ci.yml` — PR·push(`develop`/`main`)에서 `npm ci && npm run build && npm run lint`
- [ ] 위 CI를 `develop`/`main` 브랜치 보호의 **required status checks** 로 등록
- [ ] (선택) 시크릿 스캔(Gitleaks 등) — 프론트 번들에 키가 섞여 들어가는 것 방지

> ⚠️ 프론트 환경변수 주의: `NEXT_PUBLIC_*` 는 **브라우저 번들에 그대로 노출**된다. 비밀키를 넣지 말 것.

---

## 5. CodeRabbit

| 항목      | 내용                                                       |
| --------- | ---------------------------------------------------------- |
| 설정      | `.coderabbit.yaml`                                         |
| 언어      | 한국어 (`ko-KR`)                                           |
| 프로필    | `assertive` (적극 지적)                                    |
| 자동 리뷰 | 활성 (draft PR 제외, 제목에 `WIP`/`draft` 있으면 건너뜀)   |
| 우선 검사 | 사용자 경험, 접근성, 타입 안정성, 보안, 런타임 오류 가능성 |

---

## 6. 변경 이력

| 날짜       | 변경 내용                               | 담당   |
| ---------- | --------------------------------------- | ------ |
| 2026-07-29 | 현행 release.yml · CodeRabbit 기준 정리 | 손윤서 |
