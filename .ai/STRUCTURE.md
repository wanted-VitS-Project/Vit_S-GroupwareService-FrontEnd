# 📁 폴더 구조 — Next.js App Router

**최종 업데이트**: 2026-08-05 (이슈 #22 — 사업 카테고리 · 설정 허브 반영)

> 📖 관련: [CONVENTION.md](CONVENTION.md) · [LIBRARIES.md](LIBRARIES.md) · [API.md](API.md) · [STATE.md](STATE.md)

> 🎯 이 문서는 **"파일을 어디에 어떤 이름으로 둘지"** 를 정한다.
> 화면 구현·API 연동에 필요한 라이브러리는 **실제로 쓰는 이슈에서** 설치한다. (지금은 Next·React·Tailwind만)

---

## 0. 스택

| 구분        | 값                                                          | 위치                                |
| ----------- | ----------------------------------------------------------- | ----------------------------------- |
| 프레임워크  | **Next.js 16** (App Router, Turbopack)                      | `src/app/**`                        |
| 런타임      | **React 19** · TypeScript 5 (`strict`)                      | 전체                                |
| 스타일      | **Tailwind CSS 4**                                          | `globals.css` · `className`         |
| 포맷 · 린트 | **Prettier**(+`prettier-plugin-tailwindcss`) · **ESLint 9** | `.prettierrc` · `eslint.config.mjs` |
| 경로 별칭   | `@/*` → `src/*`                                             | `tsconfig.json`                     |
| 줄바꿈      | LF 고정                                                     | `.gitattributes`                    |

> 📌 UI 라이브러리 · 서버 상태 · 폼 검증 라이브러리는 **아직 미도입**이다. 도입 시 [LIBRARIES.md](LIBRARIES.md) 를 먼저 갱신한다.

---

## 1. 한눈에 보는 전체 구조

```
루트/
├── .ai/                  # 운영 문서 (이 문서 포함)
├── .gitattributes        # 줄바꿈 LF 고정
├── .prettierrc           # 포맷 규칙 (tailwind 클래스 자동 정렬)
├── .prettierignore
├── .env.example          # 복사해서 .env.local 로 쓴다
├── eslint.config.mjs
├── tsconfig.json         # 경로 별칭 @/* → src/*
├── public/               # 정적 파일 (현재 비어 있음)
└── src/
    ├── app/              # 라우팅 + 페이지 (App Router)
    │   ├── layout.tsx    # 루트 레이아웃 (서버 컴포넌트)
    │   ├── globals.css   # 전역 스타일 / Tailwind 진입점
    │   ├── page.tsx      # / 대시보드
    │   ├── error.tsx     # 런타임 에러 화면
    │   ├── not-found.tsx # 404
    │   ├── login/        # 로그인
    │   ├── forbidden/    # 403 (권한 없음)
    │   ├── notices/      # 공고
    │   ├── projects/     # 프로젝트
    │   ├── finance/      # 계산서 · 입금 · 정산
    │   ├── notifications/# 알림
    │   └── settings/     # 설정 (사원 · 부서 · 카테고리)
    │
    ├── components/       # 도메인 무관 공용 UI
    ├── features/         # 도메인별 로직 (api · queries · types · 전용 컴포넌트)
    ├── constants/        # 하드코딩 방지용 단일 소스
    └── lib/              # 순수 유틸 (fetch 래퍼 · 포맷터)
```

**핵심 원칙** — `app` 은 **화면 조립만**, 로직은 `features`, 재사용 UI는 `components`, 값은 `constants`, 도구는 `lib`.

---

## 2. `src/app` — 라우팅 계층

폴더 = URL. 폴더 안의 `page.tsx` 가 실제 화면이다. `[id]` 는 동적 세그먼트.
구현된 화면은 `/login` · `/mypage` 이고, 나머지는 **경로 확인용 스텁**이다.

### 공통 · 인증

| 경로         | 파일                     | 설명                                |
| ------------ | ------------------------ | ----------------------------------- |
| `/`          | `app/page.tsx`           | 대시보드 (홈)                       |
| `/login`     | `app/login/page.tsx`     | 로그인                              |
| `/forbidden` | `app/forbidden/page.tsx` | 권한 없음(403) 안내                 |
| —            | `app/not-found.tsx`      | 존재하지 않는 경로(404)             |
| —            | `app/error.tsx`          | 렌더링 중 예외 발생 시 fallback     |
| —            | `app/layout.tsx`         | 전 페이지 공통 뼈대 (서버 컴포넌트) |

> 클라이언트 전용 Provider(테마 · 서버 상태 · 토스트)가 필요해지면 `app/providers.tsx` 를 만들어 `layout.tsx` 에서 감싼다. **지금은 없다.**

### 공통 레이아웃

`layout.tsx` → `AppShell` → (`Sidebar` + `Header` + `main`) 구조다.
`AppShell` 이 경로를 보고 레이아웃을 씌울지 정하므로, 라우트 그룹으로 폴더를 나누지 않는다.

| 항목          | 값                                          |
| ------------- | ------------------------------------------- |
| 사이드바 가로 | `280px` (`w-70`)                            |
| 헤더 높이     | `52px` (`h-13`)                             |
| 레이아웃 제외 | `BARE_LAYOUT_PATHS` — `/login` `/forbidden` |

### 공고 (notices)

| 경로            | 설명      |
| --------------- | --------- |
| `/notices`      | 공고 목록 |
| `/notices/[id]` | 공고 상세 |

### 프로젝트 (projects)

| 경로                            | 설명            |
| ------------------------------- | --------------- |
| `/projects`                     | 프로젝트 목록   |
| `/projects/new`                 | 프로젝트 등록   |
| `/projects/[id]`                | 프로젝트 상세   |
| `/projects/[id]/steps/[stepId]` | 단계(스텝) 상세 |
| `/projects/[id]/settlement`     | 프로젝트 정산   |
| `/projects/[id]/settings`       | 프로젝트 설정   |

> `projects/[id]/layout.tsx` 덕분에 상세 하위 화면들은 **좌측 프로젝트 사이드바를 공유**한다. (`ProjectSidebar` 연결 지점)

### 재무 (finance)

| 경로                       | 설명               |
| -------------------------- | ------------------ |
| `/finance/invoices`        | 계산서 목록        |
| `/finance/invoices/import` | 계산서 일괄 업로드 |
| `/finance/payments`        | 입금 목록          |
| `/finance/payments/import` | 입금 내역 업로드   |
| `/finance/payments/match`  | 입금 ↔ 계산서 매칭 |
| `/finance/settlements`     | 정산 현황          |

### 알림 · 설정

| 경로                               | 설명           |
| ---------------------------------- | -------------- |
| `/notifications`                   | 알림함         |
| `/mypage`                          | 마이페이지     |
| `/approvals`                       | 결재 관리      |
| `/settings`                        | 설정 홈        |
| `/settings/employees`              | 사원 목록      |
| `/settings/employees/new`          | 사원 등록      |
| `/settings/employees/[id]`         | 사원 상세      |
| `/settings/employees/[id]/account` | 사원 계정 관리 |
| `/settings/departments`            | 부서 관리      |
| `/settings/categories`             | 카테고리 관리  |

**총 27개 라우트** (동적 세그먼트 6개 포함)

---

## 3. `src/components` — 공용 UI

특정 도메인을 모르는, **어디서나 재사용 가능한 컴포넌트**만 둔다.

| 컴포넌트         | 역할                                                        |
| ---------------- | ----------------------------------------------------------- |
| `AppShell`       | 경로에 따라 공통 레이아웃을 씌울지 결정                     |
| `Header`         | 상단 바 (현재 화면 제목 · 알림 · 내 정보)                   |
| `Sidebar`        | 전역 좌측 내비게이션 (역할별 메뉴)                          |
| `ProfileMenu`    | 헤더 프로필 드롭다운 (마이페이지 · 로그아웃)                |
| `MenuIcon`       | 사이드바 메뉴 아이콘 (인라인 SVG)                           |
| `Modal`          | 공용 모달 (네이티브 `<dialog>`, `onClose` 유무로 닫기 가능) |
| `PanelModal`     | 설정 화면용 모달 껍데기 (`Modal` 위에 얹은 폼 레이아웃)     |
| `AlertDialog`    | 안내 · 확인 다이얼로그 (버튼 1개 / 2개 + 아이콘 4종)        |
| `ErrorState`     | 화면 전체를 채우는 오류 안내 (버튼 1개 / 2개)               |
| `RowMenu`        | 목록 행의 케밥 메뉴                                         |
| `ProjectSidebar` | 프로젝트 상세 전용 서브 내비                                |
| `PageTitle`      | 페이지 제목 + 액션 영역                                     |
| `DataTable`      | 목록 테이블 공통 래퍼 (공고·프로젝트·재무·사원 공용). `renderExpanded` 로 행 아래 펼침 줄을 둘 수 있다 (정산 현황) |

> 판단 기준: **"다른 도메인 화면에 그대로 옮겨도 말이 되나?"** → 예면 `components`, 아니면 `features`.
>
> `FilterBar` · `SummaryCard` · `Loading` · `Empty` 등은 **화면 요구사항이 정해진 뒤** 추가한다. 미리 빈 파일을 만들지 않는다.

---

## 3-1. 모달 · 다이얼로그 · 오류 화면 고르기

껍데기가 비슷해 헷갈리기 쉽다. **무엇을 하려는지**로 고른다.

| 상황                                        | 쓸 것                    | 예시                              |
| ------------------------------------------- | ------------------------ | --------------------------------- |
| 폼을 받는다 (입력 · 선택이 여러 개)        | `Modal`                  | 비밀번호 변경, 부서 등록          |
| 설정 화면의 폼 모달                         | `PanelModal`             | 카테고리 · 직급 등록/수정         |
| **알리기만** 한다                           | `AlertDialogOneButton`   | "저장했습니다."                   |
| **고르게** 한다 (예/아니오)                 | `AlertDialogTwoButton`   | "정말 삭제할까요?"                |
| 보여줄 콘텐츠가 없다 — **다시 해볼 여지 X** | `ErrorStateOneButton`    | 404, 403                          |
| 보여줄 콘텐츠가 없다 — **다시 해볼 여지 O** | `ErrorStateTwoButton`    | 조회 실패 (`error.tsx`)           |

> `AlertDialog` 는 화면 위에 **덮어서** 확인을 받고, `ErrorState` 는 보여줄 게 없어 그 자리에 **대신 놓인다.** 껍데기가 닮았어도 쓰임이 달라 합치지 않는다.

### 여닫기

두 컴포넌트 모두 `isOpen` 이 **없다.** 조건부로 그렸다 지우는 것이 곧 여닫기다.

```tsx
{isConfirming && (
  <AlertDialogTwoButton
    icon={DialogIcons.danger}
    title="정말 삭제할까요?"
    description="삭제한 내용은 되돌릴 수 없습니다."
    confirmLabel="삭제"
    isDanger
    isBusy={isPending}
    onConfirm={remove}
    onCancel={() => setIsConfirming(false)}
  />
)}
```

### 아이콘 고르기 (`DialogIcons`)

| 아이콘    | 언제                          | 모양          |
| --------- | ----------------------------- | ------------- |
| `info`    | 물어볼 때 (저장할까요?)       | 원 + 느낌표   |
| `success` | 끝났다고 알릴 때              | 원 + 체크     |
| `warning` | 주의. **되돌릴 수는 있다**    | 삼각형 (파랑) |
| `danger`  | **되돌릴 수 없다** (삭제)     | 삼각형 (빨강) |

> 색만 다르면 색을 구별하지 못하는 사용자에게는 전부 같아 보인다 — **모양도 함께** 다르게 뒀다.

### 규칙

- 되돌릴 수 없는 동작은 `isDanger` 로 확인 버튼을 빨갛게 한다 (`.btn-danger`)
- 처리 중에는 `isBusy` 로 **두 버튼을 함께** 막는다 — 취소로 빠지면 결과를 알 수 없다
- 색 · 버튼 · 글자 크기는 새로 만들지 않고 `globals.css` 의 토큰과 `.btn` 계열을 쓴다

---

## 4. `src/features` — 도메인 로직

도메인 단위로 API 호출 · 훅 · 타입 · 전용 컴포넌트를 묶는다. `auth` · `businessCategory` 외에는 **폴더만 선점**한 상태.

| 폴더               | 담당 도메인                   |
| ------------------ | ----------------------------- |
| `auth`             | 로그인 · 세션 · 권한          |
| `businessCategory` | 사업 카테고리 (마스터 데이터) |
| `employee`         | 사원 · 부서 · 계정            |
| `notice`           | 공고                          |
| `project`          | 프로젝트 · 단계               |
| `block`            | 프로젝트 단계 내 블록         |
| `invoice`          | 계산서                        |
| `payment`          | 입금 · 매칭                   |
| `settlement`       | 정산                          |
| `notification`     | 알림                          |

**권장 내부 구조**

```
features/project/
├── api.ts        # ENDPOINTS 사용해 서버 호출
├── queries.ts    # 서버 상태 훅 (라이브러리 도입 후)
├── types.ts      # 요청 · 응답 타입
└── components/   # 이 도메인에서만 쓰는 UI
```

> 📌 git 은 빈 폴더를 추적하지 않아 각 폴더에 `.gitkeep` 을 두었다. **실제 파일을 만들면 `.gitkeep` 은 삭제**한다.
> ⚠️ `features/` 는 라우팅 계층이 아니다. `page.tsx` 를 두지 않는다. (App Router 예약어와 혼동 방지)

**`features/auth` — 참고용 예시**

| 파일                       | 역할                                         |
| -------------------------- | -------------------------------------------- |
| `api.ts` · `types.ts`      | 인증 API 호출과 요청 · 응답 타입             |
| `errorCodes.ts`            | 게이트 · 권한 부족 403 코드 단일 소스        |
| `CurrentUserProvider.tsx`  | `/me` 를 한 번만 불러 컨텍스트로 공급        |
| `useCurrentUser.ts`        | 컨텍스트 조회 훅                             |
| `AuthGates.tsx`            | 최초 로그인 게이트를 단계로 노출 (이전/다음) |
| `TermsGate.tsx`            | 약관 동의 단계                               |
| `ChangePasswordModal.tsx`  | 비밀번호 변경 (강제 · 일반 모드)             |
| `ChangePasswordButton.tsx` | 마이페이지 진입점                            |
| `password.ts`              | 비밀번호 정책 (체크리스트 · 검증 공용)       |

**`features/businessCategory` — 화면까지 갖춘 도메인 예시**

| 파일                      | 역할                                          |
| ------------------------- | --------------------------------------------- |
| `api.ts` · `types.ts`     | 카테고리 CRUD 호출과 요청 · 응답 타입         |
| `errorCodes.ts`           | 중복(409) · 미존재(404) 코드 단일 소스        |
| `CategoryList.tsx`        | 목록 · 검색 · 삭제분 토글 · 행 케밥 메뉴      |
| `CategoryModal.tsx`       | 카테고리 모달 공통 껍데기 (`Modal` 위에 얹음) |
| `CategoryFormModal.tsx`   | 추가 · 수정 폼 (수정은 바뀐 필드만 전송)      |
| `DeleteCategoryModal.tsx` | 삭제 확인 · 사용 중이면 차단 안내             |

> 화면 컴포넌트는 `features/<도메인>/` 바로 아래 두고, `page.tsx` 는 이를 불러 쓰기만 한다.

### 인증 흐름

```
proxy.ts (서버)      세션 쿠키 없으면 → /login
   └─ CurrentUserProvider (클라이언트)
        ├─ /me 401                      → /login
        ├─ 게이트 403 (약관 · 비밀번호) → AuthGates 로 가둠
        ├─ 권한 부족 403                → /forbidden
        └─ 정상                         → children
```

> 쿠키가 HttpOnly 라 JS 로 못 읽는다. **가드는 서버에서**, 만료 세션 판별은 `/me` 응답으로 한다.

---

## 5. `src/constants` — 단일 소스

| 파일           | 역할                           | 규칙                                                                                           |
| -------------- | ------------------------------ | ---------------------------------------------------------------------------------------------- |
| `endpoints.ts` | API 경로 모음 (`/api/v1` 기준) | 경로 문자열을 컴포넌트 · `features` 에 직접 쓰지 않는다. [API.md](API.md) 확정된 도메인만 추가 |
| `menu.ts`      | 역할별 사이드바 메뉴 정의      | 메뉴를 컴포넌트에 하드코딩하지 않는다                                                          |
| `status.ts`    | 백엔드 enum → 화면 라벨 매핑   | 키는 **백엔드 enum 값과 동일**해야 한다. 현재 `ROLE_LABELS`                                    |

---

## 6. `src/lib` — 공용 도구

| 파일                | 역할                                                                                                        |
| ------------------- | ----------------------------------------------------------------------------------------------------------- |
| `api.ts`            | `fetch` 래퍼. 공통 헤더 · 인증 · 에러(400/403/409) 처리를 한 곳에서. 컴포넌트에서 `fetch` 직접 호출 금지    |
| `format.ts`         | 날짜 표기 포맷터 (`formatDate` · `formatDateTime`). `Date` 로 파싱하지 않는다 — 타임존 때문에 날짜가 밀린다 |
| `useFlipReorder.ts` | 순서 변경 FLIP 애니메이션 (capture 방식). 이미지 편집 · 업로드 모달이 쓴다                                  |
| `useModal.ts`       | 모달 여닫이 상태 (`useModal` · `useModalRouter` · `useModalTarget`)                                          |

> 훅도 여기 둘 수 있다 — **도메인을 모르는 훅만** 이다. 판단 기준은 §3 과 같다:
> "다른 도메인 화면에 그대로 옮겨도 말이 되나?" → 예면 `lib/useXxx.ts`, 아니면 `features/<도메인>/useXxx.ts`
> (`useLayoutSaver` · `useCurrentUser` 처럼 도메인 타입 · API 를 아는 훅은 `features` 쪽이다.)

---

## 7. 네이밍 규칙

2인 이상이 같은 폴더에 파일을 만들 때 이름이 갈리지 않도록 아래로 통일한다.

### 파일 · 폴더

| 대상                     | 규칙                      | 예시                                      |
| ------------------------ | ------------------------- | ----------------------------------------- |
| 라우트 폴더 (`app/`)     | `kebab-case` (URL 그대로) | `finance/payments/match/`                 |
| 동적 세그먼트            | `[camelCase]`             | `[id]` · `[stepId]`                       |
| 컴포넌트 파일            | `PascalCase.tsx`          | `DataTable.tsx` · `ProjectSidebar.tsx`    |
| 훅 파일                  | `useXxx.ts`               | `useProjectList.ts`                       |
| 그 외 모듈 (`lib`·`api`) | `camelCase.ts`            | `api.ts` · `format.ts` · `queries.ts`     |
| `features` 도메인 폴더   | 단수 `camelCase`          | `project` (⭕) · `projects` (❌)          |
| Next 예약 파일           | 소문자 고정               | `page` · `layout` · `error` · `not-found` |

### 코드 심볼

| 대상              | 규칙                            | 예시                                  |
| ----------------- | ------------------------------- | ------------------------------------- |
| 컴포넌트          | `PascalCase` + `default` export | `export default function DataTable()` |
| 훅                | `use` 접두사                    | `useProjectList`                      |
| 상수              | `SCREAMING_SNAKE_CASE`          | `MAIN_MENU` · `ENDPOINTS` · `STATUS`  |
| 타입 · 인터페이스 | `PascalCase` (접두사 `I` 금지)  | `Project` · `ProjectListResponse`     |
| API 함수          | 동사 + 대상                     | `getProjects` · `createProject`       |
| 이벤트 핸들러     | `handleXxx` (prop 은 `onXxx`)   | `handleSubmit` / `onSubmit`           |
| boolean           | `is` · `has` · `can` 접두사     | `isLoading` · `hasNextPage`           |

### import 순서

경로 별칭 `@/*` → `src/*` 를 쓰고, 상대 경로는 같은 폴더 안에서만 쓴다.

```ts
import { useState } from 'react'; // 1. 외부 라이브러리

import DataTable from '@/components/DataTable'; // 2. 내부 절대 경로(@/)

import { getProjects } from './api'; // 3. 같은 폴더 상대 경로
```

### 포맷 · 줄바꿈

| 파일             | 내용                                                                    |
| ---------------- | ----------------------------------------------------------------------- |
| `.prettierrc`    | 작은따옴표 · 세미콜론 · trailing comma `all` · 80자 · 들여쓰기 2칸      |
| 플러그인         | `prettier-plugin-tailwindcss` 가 `className` 의 클래스 순서를 자동 정렬 |
| `.gitattributes` | 줄바꿈을 **LF 로 고정** (OS가 섞여도 diff 오염 없음)                    |

```bash
npx prettier --write .
```

> ⚠️ 전체 경로(`.`)로 돌리면 `.github/**` · `AGENTS.md` 같은 팀 공용 파일까지 재포맷된다. 작업 범위 폴더만 지정하거나, 일괄 포맷은 별도 `[CHORE]` PR로 분리한다.

---

## 8. 데이터 흐름 (목표 구조)

```
page.tsx (app)
   └─ features/<도메인>/queries.ts   ← 서버 상태 훅
         └─ features/<도메인>/api.ts
               └─ lib/api.ts  +  constants/endpoints.ts
                     └─ 백엔드
```

화면은 `components` + `features/*/components` 를 조립하고, 표기는 `lib/format.ts`, 상태 배지는 `constants/status.ts` 를 거친다.

---

## 9. 현재 상태

| 영역                        | 상태                                                                                                                                    |
| --------------------------- | --------------------------------------------------------------------------------------------------------------------------------------- |
| 라우트 스캐폴딩             | ✅ `page.tsx` 25개 + 중첩 레이아웃 · 예약 파일                                                                                          |
| 폴더 골격                   | ✅ app · components · features · constants · lib                                                                                        |
| 네이밍 · 포맷 규칙          | ✅ 이 문서 7번 + `.prettierrc` · `.gitattributes`                                                                                       |
| 공용 컴포넌트               | ✅ `AppShell` · `Header` · `Sidebar` · `Modal` · `DataTable` · `PageTitle` · `ProjectSidebar` · `MenuIcon` · `PasswordVisibilityToggle` |
| `features/auth`             | ✅ 로그인 · 게이트 · 비밀번호 변경                                                                                                      |
| `features/businessCategory` | ✅ 사업 카테고리 CRUD 화면                                                                                                              |
| `features/pagePermission`   | ✅ 사이드바 메뉴 근거(`/my/pages`) · 접근 가드 · 권한 부여/회수 화면                                                                    |
| 그 외 `features/*`          | 🚧 빈 폴더 (`.gitkeep` 으로 구조만 선점)                                                                                                |
| `constants` · `lib`         | ✅ `endpoints` · `menu` · `status` · `api` · `format`                                                                                   |

**검증 기준** (2026-08-04)

| 명령               | 결과                       |
| ------------------ | -------------------------- |
| `npm run build`    | ✅ 성공 · 라우트 25개 등록 |
| `npx tsc --noEmit` | ✅ 에러 0                  |
| `npx eslint .`     | ✅ 에러 0 · 경고 0         |
| `npx prettier`     | ✅ `src` 전체 규칙 준수    |

---

## 10. 다음 할 일

1. `.ai/API.md` 확정 → `constants/endpoints.ts` · `lib/api.ts` 채우기
2. UI 라이브러리 선정 후 도입 ([LIBRARIES.md](LIBRARIES.md) 갱신) → 공용 컴포넌트 구현
3. 서버 상태 라이브러리 도입 → `app/providers.tsx` 신설, `features/*/queries.ts` 작성
4. 백엔드 enum 확정 → `constants/status.ts` 배지 매핑
5. `constants/menu.ts` 작성 후 `Sidebar` · `Header` 구현
