# [TASK] 프로젝트 폴더 구조 · 라우트 골격 구성 — 전 화면 스캐폴딩

> 📌 이 파일은 **"지금 어디까지 했나"** 를 기록하는 현재 상태 노트예요.
> AI가 세션 시작 시 이 파일을 읽고 진행 상황을 파악해요.

---

## 담당자

- **이름**: 서민지
- **담당 영역**: 프론트엔드 구조 · 공통 레이어 (이슈 #21)

---

## ⚠️ 변경사항 (2026-08-04)

- **인증 방식 확정**: **HttpOnly 세션 쿠키**. 응답 본문에 토큰이 없고 재발급 API 도 없다 → 프론트는 토큰을 저장·관리하지 않고 모든 요청에 `credentials: 'include'` 만 붙인다 ([API.md](API.md))
- **로그인 ID 는 사번(`userId`)** — 이메일이 아니다. 화면 라벨만 '아이디'로 노출
- **`passwordStatus === 'RESET_REQUIRED'`** 면 로그인 직후 비밀번호 변경 화면으로 보낸다 (현재는 `/mypage` 로 임시 연결)
- **공통 응답 봉투 `{ httpStatus, message, data }`** — `src/lib/api.ts` 래퍼가 `data` 만 꺼내 반환, 실패 시 `ApiError(status, message)` 로 throw
- **라이브러리 도입 시점 원칙 확정**: 폴더 구조 단계에서는 설치하지 않고, **실제로 쓰는 이슈에서 설치**한다 → 미사용 9종 제거 ([LIBRARIES.md](LIBRARIES.md) 변경 이력)
- **UI 라이브러리 미정**: 이슈 원안 shadcn/ui 로 진행하지 않음. PrimeReact 를 시험 적용해봤으나 이번 범위에서 제외, 공용 컴포넌트 구현 이슈에서 다시 결정
- **HTTP 클라이언트**: axios 미도입. `fetch` + `src/lib/api.ts` 래퍼로 간다
- **포맷 규칙 신설**: `.prettierrc` (작은따옴표 · 세미콜론 · trailing comma · 80자 + tailwind 클래스 자동 정렬)
- **줄바꿈 규칙 신설**: `.gitattributes` 로 LF 고정 — OS 가 섞여도 diff 오염 없음

---

## 현재 진행 상황

- **작업 중**: 이슈 #2 로그인 화면 구현 (`feat/login`) — PR 생성 대기
- **마지막으로 한 일**: `lib/api.ts` fetch 래퍼 구현, `features/auth` 로그인/로그아웃 호출 · 타입 정의, 로그인 화면 폼 구현
- **직전 완료**: 이슈 #1 공통 레이아웃 (PR 대기)

---

## 목표 및 기대 결과

- 프론트 2인이 **같은 위치에 같은 이름으로** 파일을 두도록 골격과 규칙을 확정
- API 경로 · 상태 배지 · 포맷터를 단일 소스로 모아 화면별 하드코딩 방지
- 화면 단위 작업을 병렬로 시작할 수 있는 상태 만들기

---

## 액션 아이템

> 이슈 #21 기준. 끝나면 `[ ]` → `[x]` 로 바꿔요.

- [x] 폴더 골격 확정 (app / components / features / lib / constants)
- [x] 라우트 스텁 생성 (`page.tsx` 25개)
- [x] 프로젝트 상세 중첩 레이아웃 (`projects/[id]/layout.tsx`)
- [x] Next 예약 파일 배치 (layout / error / not-found)
- [x] 경로 별칭 `@/` 및 prettier + tailwind 정렬 플러그인 설정
- [x] 파일 · 폴더 네이밍 규칙 정리 ([STRUCTURE.md](STRUCTURE.md) 7번)
- [x] 폴더별 역할과 "어디에 넣을지" 판단 기준 정리
- [x] 타입체크 · 린트 · 프로덕션 빌드 확인
- [ ] 노션 문서화 후 팀 공유 (STRUCTURE.md 내용 붙여넣기)
- [ ] PR 생성 후 이슈 댓글에 링크 남기기

> ⏭️ 이슈 원안의 `providers.tsx` Provider 연결 · UI 라이브러리 설치 항목은 **구조 단계 범위를 넘어** 후속 이슈로 넘긴다. (아래 백로그)

### 이슈 #2 로그인 화면 구현 (`feat/login`)

- [x] `.ai/API.md` 인증 API 4종 명세 정리 (로그인 · 로그아웃 · 내 정보 · 비밀번호 변경)
- [x] `constants/endpoints.ts` 에 `auth` 경로 등록
- [x] `lib/api.ts` fetch 래퍼 구현 (`credentials: 'include'` · 봉투 언랩 · `ApiError`)
- [x] `features/auth/types.ts` · `api.ts` — 로그인/로그아웃 호출
- [x] 로그인 화면 폼 구현 (비밀번호 보기 토글 아이콘 · 상태코드별 에러 문구 · 로딩 표시)
- [x] `src/proxy.ts` 인증 가드 — 세션 쿠키 없으면 `/login`, 있으면 `/login` 진입 차단
- [x] 헤더 로그아웃 버튼 연결
- [x] 실제 백엔드 대상 로그인 동작 확인 — 세션 쿠키 `SESSION` 발급 확인
- [x] 타입체크 · 린트 · 포맷 · 프로덕션 빌드 확인
- [ ] PR 생성 후 이슈 댓글에 링크 남기기

---

## 🔖 백로그 / 나중에 할 일

- [ ] UI 라이브러리 선정 · 도입 → 공용 컴포넌트 구현 (2026-08-04 등록)
- [x] 인증 가드 — 비로그인 시 `/` 접근 차단 (2026-08-04 등록 / 2026-08-04 `src/proxy.ts` 로 처리)
- [ ] 403 응답 시 `/forbidden` 이동 처리 (2026-08-04 등록)
- [x] 백엔드 세션 쿠키 이름 확인 → `SESSION` (2026-08-04 등록 / 2026-08-04 확인 후 `src/proxy.ts` 반영)
- [x] `GET /api/v1/auth/me` 연동 → `useCurrentUser` 임시 값 교체 (2026-08-04 등록 / 2026-08-04 처리)
- [ ] 전사현황 화면 — 기획 확인 후 라우트 · 메뉴 추가 (2026-08-04 등록)
- [ ] 헤더 검색 인풋 · 브레드크럼 — 요구사항 확정 후 (2026-08-04 등록)
- [ ] 서버 상태 라이브러리 도입 → `app/providers.tsx` 신설, `features/*/queries.ts` (2026-08-04 등록)
- [ ] 전역 토스트 컴포넌트 도입 (2026-08-04 등록)
- [x] `constants/endpoints.ts` · `lib/api.ts` 채우기 — API.md 확정 후 (2026-08-04 등록 / 2026-08-04 처리)
- [ ] 비밀번호 변경 화면 — `PATCH /api/v1/auth/password` 연동, `RESET_REQUIRED` 진입 경로 정식 연결 (2026-08-04 등록)
- [x] 로그아웃 버튼 연결 — `logout()` 호출 후 `/login` 이동 (2026-08-04 등록 / 2026-08-04 `Header` 에 처리)
- [ ] `.env.local` 의 `NEXT_PUBLIC_API_BASE_URL` 팀 공유 · `.env.example` 추가 (2026-08-04 등록)
- [ ] `constants/status.ts` 배지 매핑 — 백엔드 enum 확정 후 (2026-08-04 등록)
- [ ] `constants/menu.ts` 작성 후 `Sidebar` · `Header` 구현 (2026-08-04 등록)
- [ ] `FilterBar` · `SummaryCard` · `Loading` · `Empty` · `ErrorBox` 추가 — 화면 요구사항 확정 후 (2026-08-04 등록)
- [ ] 파비콘 추가 (`src/app/favicon.ico` 현재 삭제 상태) (2026-08-04 등록)
- [ ] 팀 공용 파일(`.github/**`, `AGENTS.md` 등) prettier 일괄 포맷 — 별도 `[CHORE]` PR (2026-08-04 등록)
- [ ] 컴포넌트 미리보기 페이지(`/preview`) 재도입 검토 — 공용 컴포넌트 구현 시작할 때 (2026-08-04 등록)

---

## GitHub 이슈 목록

| 이슈      | 제목                                         | 상태       |
| --------- | -------------------------------------------- | ---------- |
| #21       | [FEAT] 프로젝트 폴더 구조 · 라우트 골격 구성 | 완료       |
| #1        | [FEAT] 공통 레이아웃 구성                    | PR 대기    |
| #2        | [FEAT] 로그인 화면 구현                      | PR 대기    |

---

## 참고 자료

- **폴더 구조 · 네이밍 규칙**: [STRUCTURE.md](STRUCTURE.md)
- **라이브러리 인벤토리**: [LIBRARIES.md](LIBRARIES.md)
- **연동 API 명세**: [API.md](API.md)
- **완료 기록**: [WORKLOG.md](WORKLOG.md)
