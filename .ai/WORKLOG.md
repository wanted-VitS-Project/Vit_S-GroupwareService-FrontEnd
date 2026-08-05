# 개발 완료 기록

> 📌 이 파일은 **끝낸 작업의 일지**예요.
> 작업(이슈)을 하나 완료할 때마다 AI에게 "완료" 또는 "WORKLOG에 기록해줘" 라고 하면 아래 양식으로 정리해줘요.
> 최신 기록이 위로 오도록 **위에 쌓아** 가세요.

---

## [2026-08-05] #28 마이페이지 구현 ✅

브랜치: `feat/mypage`

### 변경 파일

| 파일                           | 변경                            |
| ------------------------------ | ------------------------------- |
| `src/app/mypage/page.tsx`      | 인사 정보 · 계정 정보 화면 구현 |
| `src/constants/status.ts`      | `ROLE_LABELS` 권한 라벨 매핑    |
| `src/lib/format.ts`            | `formatDate` · `formatDateTime` |
| `.gitignore` · `.ai/README.md` | `STATE.md` 개인 노트 처리       |
| `.env.example`                 | 생성 — 로컬 환경변수 예시       |

### 주요 작업 내용

- 인사 정보(사번 · 이름 · 이메일 · 연락처 · 부서 · 직급 · 입사일)와 계정 정보(권한 · 마지막 로그인)를 카드 두 개로 구성
- `ChangePasswordButton` 을 `PageTitle` 이 아닌 **계정 정보 카드 액션 영역**에 연결 (디자인 기준)
- 권한 라벨 · 날짜 표기를 `constants` · `lib` 으로 분리해 다른 화면과 표기가 갈리지 않게 함

### 트러블슈팅

- **문제**: 팀원 PC 에서 로그인 시 `POST /api/v1/auth/login` 404
- **원인**: `.env.local` 이 gitignore 대상이라 클론 후 `NEXT_PUBLIC_API_BASE_URL` 이 빈 문자열 → 요청이 프론트 서버(`:3000`)로 감
- **해결**: `.env.example` 을 커밋 대상으로 추가(`.gitignore` 에 `!.env.example`), 복사 안내 주석 포함

- **문제**: '마지막 로그인' 라벨이 두 줄로 접힘
- **원인**: 라벨 폭 `w-20`(80px)이 6글자를 못 담음
- **해결**: `w-24` + `whitespace-nowrap`. 폭을 고정하는 이유는 값의 시작선을 세로로 맞추기 위함

### 부수 결정

- `/me` 를 화면에서 다시 부르지 않는다 — `CurrentUserProvider` 가 이미 불러둔 컨텍스트 값을 쓴다
- 날짜는 `Date` 로 파싱하지 않고 문자열을 자른다 — `YYYY-MM-DD` 를 `Date` 로 바꾸면 **타임존 때문에 하루 밀릴 수 있다**
- `ROLE_LABELS` 는 `Record<Role, string>` — 역할이 추가되면 컴파일 단계에서 누락이 잡힌다
- 이메일 · 연락처가 비어 오면 `-` 로 표시하고, 포맷터도 빈 값을 받으면 빈 문자열을 돌려준다
- `Card` · `Field` 는 이 화면 전용이라 `components/` 로 빼지 않는다
- **`.ai/STATE.md` 는 개인 작업 노트라 gitignore 처리한다** — 팀원마다 진행 상황이 달라 공유하면 충돌만 난다. 초기값은 `template/STATE.template.md`

### 검증

| 명령               | 결과               |
| ------------------ | ------------------ |
| `npm run build`    | ✅ 성공            |
| `npx tsc --noEmit` | ✅ 에러 0          |
| `npx eslint .`     | ✅ 에러 0 · 경고 0 |

### 남은 일

- 프로필 이미지 — `/me` 응답에 필드가 없어 제외
- 인사 정보 수정 — 관리자(사원 관리) 화면에서 처리

---

## [2026-08-05] #3 비밀번호 변경 모달 구현 ✅

브랜치: `feat/change-password-modal`

### 변경 파일

| 파일                                               | 변경                              |
| -------------------------------------------------- | --------------------------------- |
| `src/components/Modal.tsx`                         | 생성 — 공용 모달 껍데기           |
| `src/features/auth/ChangePasswordModal.tsx`        | 생성 — 강제 · 일반 두 모드        |
| `src/features/auth/ChangePasswordButton.tsx`       | 생성 — 마이페이지 진입점          |
| `src/features/auth/FirstLoginFlow.tsx`             | 생성 — 약관 동의 → 비밀번호 변경  |
| `src/features/auth/password.ts`                    | 생성 — 비밀번호 정책 3종          |
| `src/features/auth/api.ts`                         | `agreeToTerms` · `changePassword` |
| `src/constants/endpoints.ts`                       | `termsAgreements` 경로 추가       |
| `src/features/auth/CurrentUserProvider.tsx`        | 최초 로그인 차단 · `refetch` 추가 |
| `src/app/mypage/page.tsx`                          | 비밀번호 변경 버튼 연결           |
| `src/lib/api.ts`                                   | `messageOf` 추가                  |
| `src/features/auth/types.ts` · `constants/menu.ts` | `Role` 타입 위치 이동             |
| `.ai/API.md`                                       | 약관 동의 API 추가                |

### 주요 작업 내용

- `ChangePasswordModal` — 강제 · 일반 모드를 한 컴포넌트로. 강제면 현재 비밀번호를 묻지 않고 닫을 수도 없다
- `Modal` — 네이티브 `<dialog>` 기반 공용 껍데기. `onClose` 유무로 닫기 버튼 · 백드롭 클릭 · ESC 동작이 갈린다
- `FirstLoginFlow` — 최초 로그인 시 약관 동의(`POST /auth/terms-agreements`) 후 비밀번호 변경으로 넘어간다
- `password.ts` — 정책 3종(8자 이상 · 영문+숫자 · 특수문자)을 배열 한 곳에 두고 **화면 체크리스트와 제출 검증에 함께** 사용
- 마이페이지 `PageTitle` 액션 슬롯에 일반 모드 진입점 연결

### 부수 결정

- 강제 · 일반을 **한 컴포넌트로** 둔다 — 폼 본체가 같아 분리하면 규칙 체크리스트가 두 벌이 된다
- 강제 상태 차단은 라우팅이 아니라 `CurrentUserProvider` 에서 한다 — 어느 경로로 들어와도 막아야 하고, 라우팅이면 우회 경로가 생긴다
- 변경 성공 후 `refetch()` 로 `/me` 를 다시 부른다 — `passwordStatus` 가 갱신돼야 모달이 닫힌다
- 모달은 **네이티브 `<dialog>` + `showModal()`** 로 만든다 — 포커스 트랩 · 초기 포커스 · 닫힐 때 트리거 복귀 · 배경 비활성화를 브라우저가 처리한다. 직접 구현하면 강제 모드에서 Tab 으로 배경에 접근할 수 있다
- 강제 모드는 `onCancel` 에서 `preventDefault()` 로 ESC 를 막는다
- 백드롭 클릭은 `event.target === dialogRef.current` 일 때만 닫는다 — 내용 영역 클릭으로 닫히면 안 된다
- 변경 성공 시 **`onDone()` 을 즉시** 부른다 — 완료 화면을 X · ESC · 백드롭으로 닫아도 상위 재조회가 유실되지 않아야 한다
- 새 비밀번호 확인 불일치는 **입력 중에** 알린다 (`aria-invalid` · `aria-describedby`). 제출해야 알 수 있으면 늦다
- 현재 비밀번호 불일치 · 정책 위반 문구는 백엔드 `message` 를 그대로 쓴다. 어떤 정책에 걸렸는지 프론트가 판단하지 않는다
- 에러 문구 추출은 `lib/api.ts` 의 `messageOf(error, fallback)` 하나로 모았다
- `Role` 타입은 백엔드 응답에서 오는 값이라 `features/auth/types.ts` 가 자리다. `constants/menu.ts` 가 가져다 쓴다
- **토스트는 범위에서 제외** — 토스트 시스템이 없어 성공 안내는 모달 내 문구로 처리했다

### 검증

| 명령               | 결과               |
| ------------------ | ------------------ |
| `npx tsc --noEmit` | ✅ 에러 0          |
| `npx eslint .`     | ✅ 에러 0 · 경고 0 |
| `npx prettier`     | ✅ 포맷 일치       |

### 남은 일

- ⚠️ **약관 실제 문구 — 배포 전 필수.** 현재 자리표시(`약관 내용 추가 예정입니다.`) 상태로는 유효한 동의 기록이 아니다
- 변경 성공 토스트 — UI 라이브러리 도입 후

---

## [2026-08-04] #2 로그인 화면 구현 ✅

브랜치: `feat/login`

### 변경 파일

| 파일                                        | 변경                             |
| ------------------------------------------- | -------------------------------- |
| `src/lib/api.ts`                            | fetch 래퍼 구현                  |
| `src/constants/endpoints.ts`                | `auth` 경로 4종 등록             |
| `src/features/auth/types.ts`                | 생성                             |
| `src/features/auth/api.ts`                  | 생성                             |
| `src/features/auth/CurrentUserProvider.tsx` | 생성 — `/me` 조회 컨텍스트       |
| `src/features/auth/useCurrentUser.ts`       | 임시 값 → 컨텍스트 기반 교체     |
| `src/app/login/page.tsx`                    | 로그인 폼 구현                   |
| `src/proxy.ts`                              | 생성 — 인증 가드                 |
| `src/components/Header.tsx`                 | 로그아웃 버튼 · `/me` 연동       |
| `src/components/Sidebar.tsx`                | 프로필 · 메뉴를 실제 응답으로    |
| `src/components/AppShell.tsx`               | Provider 연결                    |
| `src/app/page.tsx`                          | 주석 수정                        |
| `src/features/auth/FirstLoginFlow.tsx`      | 생성 — 약관 동의 · 비밀번호 변경 |
| `src/features/auth/password.ts`             | 생성 — 비밀번호 정책             |
| `src/features/auth/.gitkeep`                | 삭제 (실제 파일 생겨 역할 종료)  |
| `.ai/API.md`                                | 인증 API 5종 명세 작성           |

### 주요 작업 내용

- `src/lib/api.ts` — `get` · `post` · `patch` 래퍼. 공통 응답 봉투에서 `data` 만 꺼내 반환하고, 실패는 `ApiError(status, message)` 로 통일
- `src/features/auth` — `login()` · `logout()` · `getMe()` 와 타입 정의. `CurrentUser extends LoginResponse` 로 `/me` 추가 필드(`email` · `phone` · `hiredAt` · `lastLoginAt`) 표현
- 로그인 화면 — 아이디(사번) · 비밀번호 폼, 비밀번호 보기 토글 아이콘, 상태코드별 안내 문구, 로딩 중 버튼 비활성
- `passwordStatus === 'RESET_REQUIRED'` 면 대시보드 대신 비밀번호 변경 경로로 분기 (현재 `/mypage` 임시)
- `src/proxy.ts` 인증 가드 — 세션 쿠키 없으면 `/login`, 있는 채로 `/login` 진입 시 대시보드로
- `CurrentUserProvider` 로 `/me` 를 한 번만 불러 사이드바 프로필 · 역할별 메뉴 · 헤더 제목에 공급

### 부수 결정

- **인증은 HttpOnly 세션 쿠키.** 응답 본문에 토큰이 없어 프론트가 저장·갱신할 것이 없다 → 모든 요청에 `credentials: 'include'` 만 붙인다
- 401 문구는 "아이디 또는 비밀번호가 올바르지 않습니다." 한 문장으로 고정 — **사번 존재 여부를 노출하지 않기 위해**
- 423(계정 잠금)은 해제 시각이 담긴 백엔드 `message` 를 그대로 노출 — 프론트 상수로 덮지 않는다
- 에러 문구 자리를 `min-h-10` 으로 미리 잡아 에러 발생 시 버튼이 밀리지 않게 함
- 응답이 오지 않은 경우(네트워크 단절 · CORS 차단)는 `status: 0` 의 `ApiError` 로 감싼다
- **실패 봉투는 `data` 가 아니라 `code` 를 준다** — `ApiError(status, message, code)` 로 함께 담는다
- 백엔드 `message` 가 사용자에게 보여줄 한국어 문구라 그대로 노출한다. 상수로 덮는 것은 401 처럼 정보 노출을 막을 때만
- 초기 비밀번호와 같은 값으로 변경하는 것은 **백엔드가 막는다**(`AUTH_PASSWORD_UNCHANGED`). 막자고 평문 비밀번호를 메모리에 들고 있지 않는다
- **인증 가드는 서버(`src/proxy.ts`)에서 한다.** HttpOnly 쿠키는 JS 로 못 읽어 클라이언트 분기가 불가능하다
- **Next 16 부터 `middleware.ts` 규약이 deprecated** — `proxy.ts` + `export default function proxy` 로 작성한다
- 가드는 쿠키 **존재 여부만** 본다 — 유효성은 백엔드 몫, 만료 쿠키는 API 401 로 걸러진다
- `/` 를 `/login` 으로 무조건 리다이렉트하지 않는다 — 로그인 성공 후 `/` 로 돌아와 **무한루프**가 된다
- 로그아웃은 **성공 · 401 일 때만** 로그인 화면으로 보낸다. 그 외 실패는 쿠키가 살아 있어 이동해도 되돌아온다
- 로그아웃 후 `router.refresh()` 를 함께 호출한다 — 라우터 캐시를 비워야 프록시가 쿠키를 다시 판단한다
- **프록시는 쿠키가 있어도 `/login` 진입을 막지 않는다.** 만료 여부를 알 수 없어 막으면 `/login` ↔ `/` 루프가 된다
  → 로그인 상태로 `/login` 에 직접 들어가면 로그인 폼이 그대로 보인다. **의도된 동작이니 프록시에 분기를 되살리지 말 것.**
  막으려면 쿠키 존재가 아니라 `getMe()` 로 **세션 유효성**을 확인해야 한다
- `CurrentUserProvider` 는 `/me` **401 일 때만** `/login` 으로 보낸다. 네트워크 오류는 재시도 화면을 띄운다
- 프로바이더가 확인을 마치기 전에는 `children` 을 그리지 않는다 — 만료 쿠키는 프록시를 통과해 보호 화면이 잠깐 노출된다
- 로그인 사용자는 **컨텍스트로 한 번만** 불러온다 — 서버 상태 라이브러리 도입 전 임시 방식. Sidebar · Header 가 각자 부르면 요청이 2번이다
- `CurrentUserProvider` 는 사이드바 있는 레이아웃에만 붙인다 — 로그인 화면에서 `/me` 를 부르지 않게
- `/me` 가 401 이면 프로바이더가 `/login` 으로 보낸다 — **쿠키는 남았는데 세션만 만료된 구간**은 미들웨어가 못 잡는다

### 검증

| 명령               | 결과                    |
| ------------------ | ----------------------- |
| `npm run build`    | ✅ 성공 · 미들웨어 등록 |
| `npx tsc --noEmit` | ✅ 에러 0               |
| `npx eslint src`   | ✅ 에러 0 · 경고 0      |
| `npx prettier`     | ✅ 포맷 일치            |

### 남은 일

- 비밀번호 변경 모달 · 최초 로그인 흐름 → #3
- 403 응답 시 `/forbidden` 이동 처리

---

## [2026-08-04] #1 공통 레이아웃 구성 ✅

브랜치: `feat/login-page`

### 변경 파일

| 파일                                              | 변경             |
| ------------------------------------------------- | ---------------- |
| `src/components/AppShell.tsx`                     | 생성             |
| `src/components/MenuIcon.tsx`                     | 생성             |
| `src/components/Sidebar.tsx`                      | 구현             |
| `src/components/Header.tsx`                       | 구현             |
| `src/components/PageTitle.tsx`                    | 구현             |
| `src/features/auth/useCurrentUser.ts`             | 생성             |
| `src/constants/menu.ts`                           | 역할별 메뉴 정의 |
| `src/app/approvals/page.tsx` · `mypage/page.tsx`  | 생성             |
| `src/app/layout.tsx` · `page.tsx` · `globals.css` | 수정             |

### 주요 작업 내용

- `AppShell` 로 공통 레이아웃 분기 — 사이드바 280px · 헤더 72px, `/login` `/forbidden` 은 레이아웃 제외
- 사이드바에 프로필 영역(이미지 자리 · 이름 · 직급 · 부서)과 역할별 메뉴, 현재 화면 활성 표시 구현
- 헤더가 경로로 현재 화면 제목을 판단하도록 구성, 알림 · 내 정보 진입점 배치
- `MENU_BY_ROLE` 로 ADMIN / MASTER · MEMBER 메뉴 분기, `/approvals` `/mypage` 라우트 추가

### 트러블슈팅

- **문제**: 루트 `layout.tsx` 에 사이드바를 넣으면 로그인 화면에도 사이드바가 표시됨
- **원인**: App Router 의 `layout.tsx` 는 하위 전체에 적용된다
- **해결**: 라우트 그룹 분리 대신 `AppShell` 에서 `usePathname` 으로 분기 — 기존 폴더를 옮기지 않아 diff 를 줄였다

- **문제**: 본문 폰트가 Geist 로 적용되지 않음
- **원인**: `globals.css` 의 `body { font-family: Arial, ... }` (Next 기본 템플릿 잔재)가 덮어씀
- **해결**: `var(--font-sans)` 로 교체. 함께 남아 있던 다크모드 블록도 제거 (현재 디자인이 라이트 기준)

- **문제**: 헤더 경계선이 진한 색으로 보임
- **원인**: Tailwind v4 는 `border` 기본색이 `currentColor` 다 (v3 의 gray-200 아님)
- **해결**: `border-slate-200` 명시

### 부수 결정

- 메뉴 노출은 화면 편의일 뿐 **권한 통제가 아니다.** 실제 차단은 백엔드 403 → `/forbidden`
- MASTER · MEMBER 는 메뉴가 동일해 `STAFF_MENU` 하나로 공유
- 로그인 사용자는 `useCurrentUser` 임시 값 — `GET /api/v1/auth/me` 연동 시 이 파일만 교체
- 내 정보는 `/settings`(조직 설정)와 분리해 `/mypage` 신설
- `/` 는 `/login` 리다이렉트를 걷어내고 대시보드로 전환 (인증 가드는 인증 방식 확정 후)
- CSS 는 크기·구분에 필요한 최소만 작성 — 디자인 확정 후 다시 입힌다

---

## [2026-08-04] #21 프로젝트 폴더 구조 · 라우트 골격 구성 ✅

브랜치: `feat/project-structure`

### 변경 파일

| 파일                                                                       | 변경 |
| -------------------------------------------------------------------------- | ---- |
| `src/app/**/page.tsx` (라우트 25개)                                        | 생성 |
| `src/app/error.tsx` · `not-found.tsx`                                      | 생성 |
| `src/app/projects/[id]/layout.tsx`                                         | 생성 |
| `src/app/layout.tsx` · `page.tsx` · `globals.css`                          | 수정 |
| `src/components/*.tsx` (Header·Sidebar·ProjectSidebar·PageTitle·DataTable) | 생성 |
| `src/features/*/.gitkeep` (도메인 9개)                                     | 생성 |
| `src/constants/{endpoints,menu,status}.ts`                                 | 생성 |
| `src/lib/{api,format}.ts`                                                  | 생성 |
| `src/app/favicon.ico` · `public/*.svg` (Next 샘플 5개)                     | 삭제 |
| `.prettierrc` · `.prettierignore` · `.gitattributes`                       | 생성 |
| `.ai/STRUCTURE.md`                                                         | 생성 |
| `.ai/README.md` · `LIBRARIES.md` · `STATE.md` · `.gitignore`               | 수정 |
| `package.json` (의존성 9종 제거)                                           | 수정 |

### 주요 작업 내용

- App Router 기준 라우트 25개 스캐폴딩 (공고 · 프로젝트 · 재무 · 알림 · 설정) + Next 예약 파일 배치
- `projects/[id]/layout.tsx` 로 프로젝트 상세 하위 화면의 사이드바 공유 구조 확보
- `components` · `features` · `constants` · `lib` 4개 레이어 신설 — 어디에 무엇을 둘지 경계 확정
- 포맷 규칙 확정 — `.prettierrc`(작은따옴표 · tailwind 클래스 자동 정렬), `.gitattributes`(줄바꿈 LF 고정)
- 폴더 구조 · 네이밍 규칙 문서 `.ai/STRUCTURE.md` 작성, 문서 인덱스 · 라이브러리 인벤토리 반영

### 트러블슈팅

- **문제**: `src/features/` 9개 폴더가 `git status` 에 잡히지 않음
- **원인**: git 은 폴더가 아니라 파일 경로를 추적한다. 빈 폴더는 추적 대상이 아님
- **해결**: 각 폴더에 `.gitkeep` 추가 — 실제 파일이 생기면 제거

- **문제**: `src/lib/format.ts` 타입 체크 실패 (`Cannot find name 'l'`)
- **원인**: 파일 첫 줄에 오타 `l;` 가 남아 있었음
- **해결**: 해당 문자 제거, `npx tsc --noEmit` 통과 확인

- **문제**: `git status` 마다 `LF will be replaced by CRLF` 경고가 대량 출력
- **원인**: Git for Windows 기본값 `core.autocrlf=true` 가 LF 파일을 CRLF 로 변환하려 함
- **해결**: `.gitattributes` 에 `* text=auto eol=lf` 지정 후 `git add --renormalize .` — 개인 설정과 무관하게 팀 전체 LF 고정

- **문제**: `npx prettier --write .` 이 이번 작업과 무관한 팀 공용 파일 15개(145줄)까지 재포맷
- **원인**: 경로를 `.` 으로 줘서 저장소 전체가 대상이 됨
- **해결**: 해당 변경 전부 되돌리고, 일괄 포맷은 별도 `[CHORE]` PR 로 분리 (백로그 등록)

### 부수 결정

- **폴더 구조 단계에서는 라이브러리를 미리 설치하지 않는다.** 실제로 쓰는 이슈에서 설치한다
  → `primereact` · `@primeuix/themes` · `primeicons` · `@tanstack/react-query` · `zustand` · `react-hook-form` · `@hookform/resolvers` · `zod` · `date-fns` 9종 제거
- 같은 이유로 `providers.tsx` · `Toaster` · 컴포넌트 미리보기 페이지(`/preview`)도 이번 범위에서 제외
- 공용 컴포넌트는 **확정된 5개만** 생성 — `FilterBar` · `SummaryCard` · `Loading` · `Empty` · `ErrorBox` 는 화면 요구사항 확정 후
- `features/` 는 라우팅이 아닌 도메인 로직 계층 — `page.tsx` 를 두지 않는다 (App Router 예약어와 혼동 방지)
- 공용/도메인 컴포넌트 판단 기준: "다른 도메인 화면에 그대로 옮겨도 말이 되나" → 예면 `components`
- HTTP 클라이언트는 axios 미도입, `fetch` + `src/lib/api.ts` 래퍼로 간다
- `.claude/` 는 전체 gitignore 처리 (로컬 전용)
- 파비콘은 추후 추가 예정 (현재 삭제 상태 유지)

### 검증

| 명령               | 결과                       |
| ------------------ | -------------------------- |
| `npm run build`    | ✅ 성공 · 라우트 25개 등록 |
| `npx tsc --noEmit` | ✅ 에러 0                  |
| `npx eslint .`     | ✅ 에러 0 · 경고 0         |

---

## [YYYY-MM-DD] #이슈번호 [작업 제목] ✅

### 변경 파일

| 파일                      | 변경 |
| ------------------------- | ---- |
| `src/pages/LoginPage.tsx` | 생성 |
| `src/api/auth.ts`         | 수정 |
| `src/hooks/useLogin.ts`   | 생성 |

### 주요 작업 내용

- [구현한 화면/기능 요약 1]
- [구현한 화면/기능 요약 2]

### 트러블슈팅

> 발생한 문제 + 원인 + 해결방법 (있을 때만)

- **문제**: [예: 토큰 갱신 후 화면이 안 바뀜]
- **원인**: [예: 쿼리 캐시 무효화 누락]
- **해결**: [예: `queryClient.invalidateQueries` 호출]

### 부수 결정

> 작업 중 내린 판단·컨벤션 (있을 때만)

- [예: 서버 상태는 react-query, 클라 상태는 zustand로 분리]

---

> ✏️ 위 양식을 복사해서 작업마다 새 블록을 **맨 위에** 추가하세요.
> 트러블슈팅·부수 결정은 없으면 생략해도 돼요.
