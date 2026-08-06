# 연동 API 명세서

**최종 업데이트**: 2026-08-06 (부서 · 사원 목록 · 비밀번호 재설정 연동 — 목차 갱신)
**최종 업데이트**: 2026-08-06 (인사 API 추가 — 계정 · 부서 · 직급 · 사원 19~~35)
**최종 업데이트**: 2026-08-05 (사업 카테고리 API 추가 — 15~~18)

> 📌 이 파일은 **프론트가 연동하는 백엔드 API**를 정리하는 곳이에요. (내가 만드는 게 아니라 **호출하는** 입장)
> AI는 API 연동 코드를 작성하기 전에 이 파일을 먼저 읽어요. (잘못된 경로/필드/타입으로 fetch 짜는 실수 방지)
>
> ⚠️ **`최종 업데이트` 줄은 최근 3건까지만 유지**한다. 그 이전 것은 삭제. (무한 누적 방지)

---

## 목차

| #                                         | API              | Method · Path                                | 연동                                  |
| ----------------------------------------- | ---------------- | -------------------------------------------- | ------------------------------------- |
| [1](#1-로그인)                            | 로그인           | `POST /auth/login`                           | ✅ `features/auth/api.ts`             |
| [2](#2-로그아웃)                          | 로그아웃         | `POST /auth/logout`                          | ✅ `features/auth/api.ts`             |
| [3](#3-내-정보-조회)                      | 내 정보 조회     | `GET /auth/me`                               | ✅ `features/auth/api.ts`             |
| [4](#4-약관-동의)                         | 약관 동의        | `POST /auth/terms-agreements`                | ✅ `features/auth/api.ts`             |
| [5](#5-비밀번호-변경)                     | 비밀번호 변경    | `PATCH /auth/password`                       | ✅ `features/auth/api.ts`             |
| [6](#6-프로젝트-상세-조회)                | 프로젝트 상세    | `GET /projects/{projectId}`                  | ✅ `features/project/api.ts`          |
| [7](#7-프로젝트-스테이지-목록)            | 스테이지 목록    | `GET /projects/{projectId}/stages`           | ✅ `features/project/api.ts`          |
| [8](#8-프로젝트-스텝-목록)                | 스텝 목록        | `GET /projects/{projectId}/steps`            | ✅ `features/project/api.ts`          |
| [9](#9-블록-생성)                         | 블록 생성        | `POST /steps/{stepId}/blocks`                | ✅ `features/block/api.ts`            |
| [10](#10-스텝-블록-일괄-조회)             | 블록 일괄 조회   | `GET /steps/{stepId}/blocks`                 | ✅ `features/block/api.ts`            |
| [11](#11-텍스트-본문-수정)                | 텍스트 본문 수정 | `PATCH /blocks/texts/{txtId}`                | ✅ `features/block/api.ts`            |
| [12](#12-체크리스트-항목-생성)            | 체크리스트 생성  | `POST /blocks/checklists/{chkBlockId}/items` | ✅ `features/block/api.ts`            |
| [13](#13-체크리스트-항목-수정)            | 체크리스트 수정  | `PATCH /blocks/checklists/items/{chkId}`     | ✅ `features/block/api.ts`            |
| [14](#14-체크리스트-항목-삭제)            | 체크리스트 삭제  | `DELETE /blocks/checklists/items/{chkId}`    | ✅ `features/block/api.ts`            |
| [15](#15-사업-카테고리-목록-조회)         | 카테고리 목록    | `GET /business-categories`                   | ✅ `features/businessCategory/api.ts` |
| [16](#16-사업-카테고리-생성)              | 카테고리 생성    | `POST /business-categories`                  | ✅ `features/businessCategory/api.ts` |
| [17](#17-사업-카테고리-수정)              | 카테고리 수정    | `PATCH /business-categories/{categoryId}`    | ✅ `features/businessCategory/api.ts` |
| [18](#18-사업-카테고리-삭제)              | 카테고리 삭제    | `DELETE /business-categories/{categoryId}`   | ✅ `features/businessCategory/api.ts` |
| [19](#19-전역-권한-변경)                  | 권한 변경        | `PATCH /accounts/{userId}/role`              | ⬜ 사원 상세 (#5)                     |
| [20](#20-계정-상태-변경)                  | 계정 상태 변경   | `PATCH /accounts/{userId}/status`            | ⬜ 사원 상세 (#5)                     |
| [21](#21-비밀번호-재설정-개인--다중-공용) | 비밀번호 재설정  | `POST /accounts/password-resets`             | ✅ `features/employee/api.ts`         |
| [22](#22-부서-목록-조회)                  | 부서 목록        | `GET /departments`                           | ✅ `features/department/api.ts`       |
| [23](#23-부서-생성-최상위--하위-공용)     | 부서 생성        | `POST /departments`                          | ✅ `features/department/api.ts`       |
| [24](#24-부서명-수정)                     | 부서명 수정      | `PATCH /departments/{departmentId}`          | ✅ `features/department/api.ts`       |
| [25](#25-부서-삭제)                       | 부서 삭제        | `DELETE /departments/{departmentId}`         | ✅ `features/department/api.ts`       |
| [26](#26-직급-목록-조회)                  | 직급 목록        | `GET /job-positions`                         | ✅ `features/jobPosition/api.ts`      |
| [27](#27-직급-생성)                       | 직급 생성        | `POST /job-positions`                        | ✅ `features/jobPosition/api.ts`      |
| [28](#28-직급-수정-직급명--순서)          | 직급 수정        | `PATCH /job-positions/{jobPositionId}`       | ✅ `features/jobPosition/api.ts`      |
| [29](#29-직급-삭제)                       | 직급 삭제        | `DELETE /job-positions/{jobPositionId}`      | ✅ `features/jobPosition/api.ts`      |
| [30](#30-사원-목록-조회-인사관리)         | 사원 목록        | `GET /employees`                             | ✅ `features/employee/api.ts`         |
| [31](#31-사원-상세-조회)                  | 사원 상세        | `GET /employees/{userId}`                    | ⬜ 사원 상세 (#5)                     |
| [32](#32-사원-등록-계정-동시-발급)        | 사원 등록        | `POST /employees`                            | ⬜ 사원 등록 (#38)                    |
| [33](#33-사원-정보-수정)                  | 사원 수정        | `PATCH /employees/{userId}`                  | ⬜ 사원 정보 수정 (#39)               |
| [34](#34-퇴사-처리)                       | 퇴사 처리        | `PATCH /employees/{userId}/resignation`      | ⬜ 사원 상세 (#5)                     |
| [35](#35-사원-이름-검색-결재선-지정용)    | 사원 이름 검색   | `GET /employees/search`                      | ⬜ 결재선 검색 (#41)                  |

> `Base URL` 과 `/api/v1` 접두사는 생략했다. 실제 경로는 각 섹션 참고.
> 번호 없는 절 — [공통 규약](#공통-규약) · [공통 403 — 게이트 · 권한](#공통-403--게이트--권한)

### ❗ 백엔드 확인 대기

| 항목                                              | 막힌 기능                        | 섹션 |
| ------------------------------------------------- | -------------------------------- | ---- |
| `block.type` enum 이 "10값" 인데 정리된 값은 9개  | 모르는 유형은 껍데기로 표시      | 9    |
| 블록 생성 응답 `data` 스키마                      | 생성 직후 해당 블록 지정         | 9    |
| `detail.chkBlockId` · `detail.items`              | 체크리스트 항목 추가 · 목록      | 10   |
| `detail.txtId` · `detail.content`                 | 텍스트 본문 편집                 | 10   |
| 블록 수정 · 삭제 · 순서 변경 API                  | `⋯` 메뉴 · 드래그 핸들           | —    |
| 프로젝트 참여자 목록 API                          | 사이드바 참여자 (`MOCK_MEMBERS`) | —    |
| 사원 엑셀 템플릿 다운로드 · 일괄 등록 (구현 중)   | 화면은 "준비 중" 안내만          | —    |
| 사원 목록에 **직급 필터** 없음                    | 직급별 사원 조회                 | 30   |
| 부서명 중복 검사 범위 (전체 → 형제) — 변경 요청함 | 본부마다 같은 팀 이름 사용       | 23   |

---

## 공통 규약

| 항목        | 내용                                                                         |
| ----------- | ---------------------------------------------------------------------------- |
| Base URL    | `NEXT_PUBLIC_API_BASE_URL` 환경변수 (`.env.local`)                           |
| 인증 방식   | **HttpOnly 세션 쿠키** `SESSION`. 응답 본문에 토큰이 없고 재발급 API 도 없다 |
| 프론트 처리 | 모든 요청에 `credentials: 'include'` — `src/lib/api.ts` 에서 일괄 처리       |
| 성공 봉투   | `{ httpStatus, message, data }` — 래퍼가 `data` 만 꺼내 반환한다             |
| 실패 봉투   | `{ httpStatus, message, code }` — **`data` 가 아니라 `code` 가 온다**        |
| 에러 처리   | `ApiError(status, message, code)` 로 던진다. 안내 문구는 `message` 우선      |

**실패 응답 예시** (실행으로 확인)

```json
{
  "httpStatus": 400,
  "message": "새 비밀번호가 현재 비밀번호와 같습니다.",
  "code": "AUTH_PASSWORD_UNCHANGED"
}
```

> ℹ️ `message` 는 **사용자에게 그대로 노출해도 되는 한국어 문구**다. 프론트가 상수로 덮는 것은 401 처럼 정보 노출을 막아야 할 때만 한다.

> ⚠️ 토큰을 localStorage 등에 저장하지 않는다. 쿠키는 브라우저가 알아서 싣는다.
> ℹ️ 쿠키 속성: `HttpOnly` · `SameSite=Lax` · 운영은 `Secure` · 만료 `Session`(브라우저 종료 시 소멸) — 로그인 유지 체크박스는 없다.
> ℹ️ 세션(Redis)은 **4시간 유휴 슬라이딩**(요청 시 자동 연장)이고 **단일 세션**이다 — 다른 기기에서 로그인하면 기존 세션이 끊겨 `/me` 가 401 로 떨어진다.
> ℹ️ 로그인 여부 판단은 서버(`src/proxy.ts`)에서만 가능하다. HttpOnly 라 JS 로 읽을 수 없다.
> ℹ️ 백엔드가 `deviceId` 쿠키(HttpOnly, 장기 만료)도 함께 내려준다. 프론트가 다루지 않는다.
> ⚠️ 백엔드 CORS 에 프론트 오리진 허용 + `allowCredentials=true` 가 설정돼 있어야 한다.

---

## 공통 403 — 게이트 · 권한

각 API 표에서는 생략한다. **status 가 아니라 `code` 로 구분**한다 (403 하나에 세 가지 의미가 실린다).

| code                            | 뜻                                          | 화면 처리                              |
| ------------------------------- | ------------------------------------------- | -------------------------------------- |
| `AUTH_TERMS_AGREEMENT_REQUIRED` | 약관 게이트 미통과 상태로 다른 API 호출     | 약관 동의 화면으로 유도 (`/me` 재조회) |
| `AUTH_PASSWORD_RESET_REQUIRED`  | 비밀번호 게이트 미통과 상태로 다른 API 호출 | 비밀번호 변경 화면으로 유도            |
| `ACC_ADMIN_REQUIRED`            | ADMIN 전용 API 에 MASTER · MEMBER 가 접근   | `/forbidden` 이동 (재조회 무의미)      |
| `BUSINESS_CATEGORY_ADMIN_ONLY`  | 사업 카테고리 쓰기 · 삭제분 조회에 비ADMIN  | `/forbidden` 이동                      |
| `AUTH_ACCOUNT_INACTIVE`         | 비활성 계정 (로그인 단계)                   | 관리자 문의 안내 — **423 잠금과 별개** |

> 처리 위치: `src/lib/api.ts` 가 403 을 `FORBIDDEN_EVENT` 로 흘리고 `src/features/auth/CurrentUserProvider.tsx` 한 곳에서 받는다.
> 코드 상수는 `src/features/auth/errorCodes.ts`. (2026-08-05 백엔드 정리본으로 철자 확인)

---

## 1. 로그인

| 항목          | 내용                                   |
| ------------- | -------------------------------------- |
| **Method**    | `POST`                                 |
| **Path**      | `/api/v1/auth/login`                   |
| **인증 필요** | ❌                                     |
| **사용 위치** | `src/features/auth/api.ts` → `login()` |

**Request Body**

```ts
interface LoginRequest {
  userId: string; // 사번 (화면에는 '아이디'로 노출)
  password: string;
}
```

**Response (200 OK)** — Swagger 실행으로 확인

```ts
{
  httpStatus: 200,
  message: '로그인 성공',
  data: {
    userId: string;           // 'EMP001'
    name: string;             // '김민준'
    role: 'ADMIN' | 'MASTER' | 'MEMBER';
    termsStatus: 'AGREED' | 'REQUIRED';        // ADMIN 은 항상 AGREED
    passwordStatus: 'NORMAL' | 'RESET_REQUIRED';
    departmentName?: string;  // '개발팀'
    departmentPath?: string;  // '기술본부 / 개발팀'
    jobPositionName?: string; // '대리'
  }
}
```

> ℹ️ 응답 본문에 **토큰이 없다.** 인증은 HttpOnly 세션 쿠키이며, Swagger UI 에 `Set-Cookie` 가 보이지 않는 것은 브라우저가 JS 에 노출하지 않기 때문이다.
> ℹ️ `passwordStatus === 'RESET_REQUIRED'` 면 비밀번호 변경 화면으로 보낸다.
> ℹ️ 비밀번호 해시(Argon2id) 때문에 응답에 **0.3~1.1초**가 걸리는 것이 정상이다. 로딩 상태를 반드시 표시한다.

**에러 응답**

| status | code                     | 화면 처리                                                                      |
| ------ | ------------------------ | ------------------------------------------------------------------------------ |
| 400    | `AUTH_INVALID_REQUEST`   | "아이디와 비밀번호를 모두 입력해주세요."                                       |
| 401    | `AUTH_LOGIN_FAILED`      | "아이디 또는 비밀번호가 올바르지 않습니다." (사번 존재 여부를 구분하지 않는다) |
| 403    | `AUTH_ACCOUNT_INACTIVE`  | "비활성화된 계정입니다. 관리자에게 문의해주세요."                              |
| 423    | `AUTH_ACCOUNT_LOCKED`    | `message` 그대로 노출 (해제 시각 포함)                                         |
| 429    | `AUTH_TOO_MANY_REQUESTS` | "요청이 너무 많습니다. 잠시 후 다시 시도해주세요."                             |
| 503    | `AUTH_HASHING_BUSY`      | "서버가 혼잡합니다. 잠시 후 다시 시도해주세요."                                |

---

## 2. 로그아웃

| 항목          | 내용                                    |
| ------------- | --------------------------------------- |
| **Method**    | `POST`                                  |
| **Path**      | `/api/v1/auth/logout`                   |
| **인증 필요** | ✅                                      |
| **사용 위치** | `src/features/auth/api.ts` → `logout()` |

세션을 종료하고 쿠키를 만료시킨다. 응답 `data` 없음.

| status | code                   | 화면 처리            |
| ------ | ---------------------- | -------------------- |
| 401    | `AUTH_UNAUTHENTICATED` | 로그인 화면으로 이동 |

---

## 3. 내 정보 조회

| 항목          | 내용                                   |
| ------------- | -------------------------------------- |
| **Method**    | `GET`                                  |
| **Path**      | `/api/v1/auth/me`                      |
| **인증 필요** | ✅                                     |
| **사용 위치** | `src/features/auth/api.ts` → `getMe()` |

**Response (200 OK)** — Swagger 스키마로 확인

```ts
{
  httpStatus: 200,
  message: '조회 성공',
  data: {
    userId: string;          // 'EMP001'
    name: string;            // '김민준'
    role: 'ADMIN' | 'MASTER' | 'MEMBER';
    termsStatus: 'AGREED' | 'REQUIRED';        // 로그인 응답과 동일
    passwordStatus: 'NORMAL' | 'RESET_REQUIRED';
    email: string;           // 'minjun@example.com'
    phone: string;           // '010-0000-0000'
    departmentName: string;  // '개발팀'
    departmentPath: string;  // '기술본부 / 개발팀'
    jobPositionName: string; // '대리'
    hiredAt: string;         // '2024-03-04'
    lastLoginAt: string;     // '2026-08-03 09:12:44'
  }
}
```

> ℹ️ **로그인 응답 + `email` · `phone` · `hiredAt` · `lastLoginAt` 4개** 구조다. (`termsStatus` 포함 — 백엔드 `MyInfoResponse` 로 2026-08-05 확인)
> ℹ️ 게이트 판단(`termsStatus` · `passwordStatus`)은 **`/me` 기준**으로 한다. 로그인 응답은 라우팅에 쓰지 않는다 — 새로고침·직접 진입에도 막아야 하기 때문.
> 타입도 `CurrentUser extends LoginResponse` 로 같은 관계를 유지한다. (`src/features/auth/types.ts`)
> ℹ️ 날짜는 문자열 그대로 온다 — 표시할 때 `src/lib/format.ts` 를 거친다.

| status | code                   | 화면 처리            |
| ------ | ---------------------- | -------------------- |
| 401    | `AUTH_UNAUTHENTICATED` | 로그인 화면으로 이동 |

---

## 4. 약관 동의

| 항목          | 내용                                          |
| ------------- | --------------------------------------------- |
| **Method**    | `POST`                                        |
| **Path**      | `/api/v1/auth/terms-agreements`               |
| **인증 필요** | ✅                                            |
| **요청 본문** | 없음                                          |
| **사용 위치** | `src/features/auth/api.ts` → `agreeToTerms()` |

이용약관 · 개인정보처리방침을 **하나로 묶어** 동의받는다. POST 호출 자체가 동의이며 응답 `data` 는 `null`. **재호출해도 무해(멱등)**.

- **최초 로그인 1회만** 받는다. 동의 후 비밀번호 변경 단계로 넘어간다.
- 비밀번호 재설정 후 로그인에서는 다시 받지 않는다.
- **ADMIN 은 대상이 아니다.**

| status | code                   | 화면 처리            |
| ------ | ---------------------- | -------------------- |
| 401    | `AUTH_UNAUTHENTICATED` | 로그인 화면으로 이동 |

> 화면 흐름: 로그인 → (`passwordStatus === 'RESET_REQUIRED'`) → 약관 동의 → 비밀번호 변경 → 서비스 진입

---

## 5. 비밀번호 변경

| 항목          | 내용                    |
| ------------- | ----------------------- |
| **Method**    | `PATCH`                 |
| **Path**      | `/api/v1/auth/password` |
| **인증 필요** | ✅                      |
| **사용 위치** | 미구현                  |

**Request Body**

```ts
interface ChangePasswordRequest {
  currentPassword?: string; // 최초 변경(passwordStatus=RESET_REQUIRED)이면 생략
  newPassword: string;
  newPasswordConfirm: string;
}
```

- 비밀번호 정책: **8자 이상 + 영문 · 숫자 · 특수문자 모두 포함**
- 변경 후에도 세션은 유지되고 `passwordStatus` 가 `NORMAL` 로 바뀐다 (재로그인 불필요)
- ⚠️ **현재 비밀번호 불일치는 401 이 아니라 400** (`AUTH_CURRENT_PASSWORD_INVALID`) — 401 로 오면 공통 인터셉터가 로그아웃시켜 버리기 때문
- 남의 비밀번호는 이 API 로 못 바꾼다. 관리자 재설정은 `POST /accounts/password-resets`

| status | code                                                                                                                                                                                          | 화면 처리            |
| ------ | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------- |
| 400    | `AUTH_INVALID_REQUEST` · `AUTH_CURRENT_PASSWORD_REQUIRED` · `AUTH_CURRENT_PASSWORD_INVALID` · `AUTH_PASSWORD_CONFIRM_MISMATCH` · `AUTH_PASSWORD_POLICY_VIOLATION` · `AUTH_PASSWORD_UNCHANGED` | 폼 필드 에러 표시    |
| 401    | `AUTH_UNAUTHENTICATED`                                                                                                                                                                        | 로그인 화면으로 이동 |

---

## 6. 프로젝트 상세 조회

| 항목          | 내용                                           |
| ------------- | ---------------------------------------------- |
| **Method**    | `GET`                                          |
| **Path**      | `/api/v1/projects/{projectId}`                 |
| **인증 필요** | ✅                                             |
| **사용 위치** | `src/features/project/api.ts` → `getProject()` |

**Response (200 OK)**

```ts
{
  httpStatus: 200,
  message: '요청이 성공적으로 처리되었습니다.',
  data: {
    projectId: number;
    name: string;              // 과업명
    description: string | null;
    clientName: string;        // 발주처
    status: string;            // 'IN_PROGRESS' 등 — enum 미확정
    startedOn: string;         // '2026-03-01'
    endedOn: string;           // '2026-12-31'
    contractAmount: number;    // 계약금액
    progressRate?: number;     // 진척률(%) — 스텝 0개면 응답에 없다
    stepCount: number;
    doneStepCount: number;
    businessCategories: { categoryId: number; name: string; code: string }[];
    bidNoticeId: number | null;
    closeReasonCode: string | null;  // 종결 건만
    closeReasonNote: string | null;
    myPermission: 'VIEWER' | 'EDITOR';
    createdAt: string;         // '2026-08-05T03:39:08'
  }
}
```

> ⚠️ `progressRate` 는 **선택 필드**다. 스텝이 0개면 아예 오지 않으므로 `?? 0` 로 받는다.
> ⚠️ `myPermission === 'VIEWER'` 면 수정·추가 버튼을 숨긴다. (실제 차단은 백엔드가 한다)
> ❗ **참여자 목록 API 가 아직 없다.** `ProjectSidebar` 의 참여자 영역은 `MOCK_MEMBERS` 로 그리고 있다.

---

## 7. 프로젝트 스테이지 목록

| 항목          | 내용                                                 |
| ------------- | ---------------------------------------------------- |
| **Method**    | `GET`                                                |
| **Path**      | `/api/v1/projects/{projectId}/stages`                |
| **인증 필요** | ✅                                                   |
| **사용 위치** | `src/features/project/api.ts` → `getProjectStages()` |

**Response (200 OK)**

```ts
{
  httpStatus: 200,
  message: '요청이 성공적으로 처리되었습니다.',
  data: {
    stages: {
      stageId: number;
      name: string;      // '요구분석'
      sortOrder: number; // 정렬 순서
      stepCount: number; // 소속 스텝 수
    }[];
  }
}
```

> ℹ️ `data` 안에 `stages` 로 한 겹 더 감싸져 있다. `getProjectStages()` 가 벗겨서 배열만 반환한다.
> ℹ️ **`sortOrder` 오름차순으로 정렬되어 온다** — 프론트에서 다시 정렬하지 않는다.

---

## 8. 프로젝트 스텝 목록

| 항목          | 내용                                                |
| ------------- | --------------------------------------------------- |
| **Method**    | `GET`                                               |
| **Path**      | `/api/v1/projects/{projectId}/steps`                |
| **인증 필요** | ✅                                                  |
| **사용 위치** | `src/features/project/api.ts` → `getProjectSteps()` |

**Response (200 OK)**

```ts
{
  httpStatus: 200,
  message: '요청이 성공적으로 처리되었습니다.',
  data: {
    steps: {
      stepId: number;
      stageId: number | null;   // null = 스테이지 미배정
      name: string;
      status: 'NOT_STARTED' | 'IN_PROGRESS' | 'DONE';
      sortOrder: number;
      startedOn: string;        // '2026-03-01'
      endedOn: string;          // '2026-03-15'
      owner: { userId: string; name: string } | null;
      totalIssueCount: number;
      doneIssueCount: number;
      inProgressIssueCount: number;
      progressRate?: number;    // 이슈 0개면 응답에 없다
      myPermission: 'VIEWER' | 'EDITOR';
    }[];
  }
}
```

> ⚠️ **`stageId` 가 `null` 인 스텝이 있다.** 어느 스테이지에도 안 붙은 스텝이라, 사이드바는 `미분류` 묶음으로 따로 보여준다.
> ⚠️ `progressRate` 는 **선택 필드**다. 이슈가 0개면 오지 않으므로 `?? 0` 로 받는다.
> ℹ️ 스텝 진척률 바는 `inProgressIssueCount`(노랑) · `doneIssueCount`(파랑) · 나머지(회색) 비율로 그린다.
> ℹ️ 명세 표에는 없지만 실제 응답에 **`inProgressIssueCount`** 가 포함된다.

---

## 9. 블록 생성

| 항목          | 내용                                          |
| ------------- | --------------------------------------------- |
| **Method**    | `POST`                                        |
| **Path**      | `/api/v1/steps/{stepId}/blocks`               |
| **인증 필요** | ✅ (스텝 `EDITOR`)                            |
| **사용 위치** | `src/features/block/api.ts` → `createBlock()` |
| **요구사항**  | BLK-001 · BLK-002 · BLK-003                   |

> ⚠️ 경로가 `/projects/{id}/...` 아래가 아니라 **`/steps/{stepId}`** 최상위다.

**Request Body**

```ts
interface CreateBlockRequest {
  type: BlockTypeCode; // 필수 — 아래 enum 9값만
  title?: string; // 최대 200자. PAYMENT_CONFIRM 에서는 회차명
  owner?: string; // 담당자 사번 (VARCHAR(20)) — 선택 (BLK-012)
  rowIndex?: number; // 미지정 시 맨 아래
  sortOrder?: number; // 행 내 순서
  colSpan?: number; // 열 병합 수 1~3, 기본 1
}
```

**`type` 허용값 (ERD `block.type` enum 9값)**

| 값                 | 상세 테이블             | 카디널리티 | 화면 라벨       |
| ------------------ | ----------------------- | ---------- | --------------- |
| `TEXT`             | `text`                  | 1:1        | 텍스트          |
| `IMAGE`            | `image`                 | 1:N        | 이미지          |
| `CHECKLIST`        | `checklist`             | 1:N        | 체크리스트      |
| `FILE`             | `block_file`            | 1:N        | 문서 업로드     |
| `PAYMENT_CONFIRM`  | `block_payment_confirm` | 1:1        | 입금 확인       |
| `TAX_INVOICE_VIEW` | `tax_invoice_confirm`   | 1:1        | 세금계산서 조회 |
| `APPROVAL`         | `approval`              | 1:1        | 결재            |
| `AI`               | `vitamate_block`        | 1:1        | AI Block        |
| `BID_NOTICE`       | `bid_notice_block`      | 1:1        | 입찰 공고       |

> ⚠️ ERD Cloud 상 테이블명이 다른 항목이 있다 — `IMAGE` → `img_block`, `CHECKLIST` → `chk_block`.
> ℹ️ 화면 라벨 · 아이콘 색은 `src/features/block/types.ts` 의 `BLOCK_TYPES` 가 단일 소스다.
> ❗ **응답 `data` 스키마는 확인 필요.** 현재 프론트는 응답 본문을 쓰지 않는다.
> ❗ **에러 코드 목록도 확인 필요.** 지금은 백엔드 `message` 를 그대로 노출한다.

---

## 10. 스텝 블록 일괄 조회

| 항목          | 내용                                            |
| ------------- | ----------------------------------------------- |
| **Method**    | `GET`                                           |
| **Path**      | `/api/v1/steps/{stepId}/blocks`                 |
| **인증 필요** | ✅                                              |
| **사용 위치** | `src/features/block/api.ts` → `getStepBlocks()` |

**Response (200 OK)**

```ts
data: {
  blocks: {
    blockId: number;
    type: BlockTypeCode;
    title: string | null;
    owner: { userId: string; name: string } | null; // 미지정이면 null (BLK-012)
    rowIndex: number;   // 같은 값끼리 한 행
    sortOrder: number;  // 행 내 순서
    colSpan: number;    // 1~3
    detail: unknown;    // 타입별 상세 — 구조가 타입마다 다르다
    linkedIssueTotal: number;
    linkedIssueDone: number;
  }[];
}
```

> ℹ️ `data` 안에 `blocks` 로 한 겹 더 감싸져 있다. `getStepBlocks()` 가 벗겨서 배열만 반환한다.
> ℹ️ **`rowIndex` · `sortOrder` 순으로 정렬되어 온다.** 보드는 그래도 한 번 더 묶고 정렬해 행 경계를 확실히 한다.
> ⚠️ **`colSpan` 이 1~3 이다.** 블록 생성 명세와 같지만, 화면 기획상 1·2칸만 쓰이더라도 3까지 들어올 수 있어 보드는 3칸까지 그린다.
> ⚠️ **`type` 이 "ERD enum 10값" 으로 적혀 있다.** 9번에 정리된 enum 은 9값 — **나머지 1값 확인 필요.** 프론트는 모르는 값이 오면 `준비 중인 블록입니다.` 껍데기로 그린다.
> ℹ️ **`detail` 은 블록의 내용을 담는 하위 계층이다.** `blockId` 로 관리하는 것은 위 공통 필드까지고, 내용은 타입별 상세 ID(예: `CHECKLIST` 의 `chkBlockId`)로 관리한다.
> ❗ **`detail` 스키마는 `FILE` 의 `{ fileCount: 3 }` 만 확인됐다.**
> `CHECKLIST` 는 **`chkBlockId`(필수) 와 항목 배열**이 필요하다. 프론트는 `detail.chkBlockId` · `detail.items` 를 런타임 검증해서 읽고, 없거나 형태가 다르면 항목 추가를 막고 빈 목록으로 떨어뜨린다. **키 이름 확인 필요.**

---

## 11. 텍스트 본문 수정

| 항목          | 내용                                              |
| ------------- | ------------------------------------------------- |
| **Method**    | `PATCH`                                           |
| **Path**      | `/api/v1/blocks/texts/{txtId}`                    |
| **인증 필요** | ✅                                                |
| **사용 위치** | `src/features/block/api.ts` → `updateTextBlock()` |

**Request Body**

```ts
{
  content: string; // 필수 — 마크다운 원문 전체
}
```

**Response (200 OK)**

```ts
data: {
  txtId: number;
  content: string;
  updatedAt: string;
}
```

> ⚠️ **`txtId` 는 `blockId` 와 다른 값이다.** `chkBlockId` 와 마찬가지로 **블록(`blockId`) > 블록의 내용(`txtId`)** 구조다.
> → 10번 블록 목록 응답의 **`detail.txtId`** 로 받는다. 값이 없으면 프론트는 편집 버튼을 막는다.
> ⚠️ `content` 는 부분 수정이 아니라 **전체 내용**을 보낸다.
> ℹ️ 본문은 **마크다운 원문**으로 주고받는다. 화면에는 WYSIWYG 로만 보이고 원문이 노출되지 않는다 (TipTap + `tiptap-markdown`).
> ❗ **`detail` 에 `txtId` 와 `content` 가 포함돼야 한다.** 키 이름 확인 필요 — 프론트는 `readTextBlockDetail()` 로 런타임 검증한다.

---

## 12. 체크리스트 항목 생성

| 항목          | 내용                                                  |
| ------------- | ----------------------------------------------------- |
| **Method**    | `POST`                                                |
| **Path**      | `/api/v1/blocks/checklists/{chkBlockId}/items`        |
| **인증 필요** | ✅                                                    |
| **사용 위치** | `src/features/block/api.ts` → `createChecklistItem()` |

**Request Body**

```ts
{
  content: string; // 필수
}
```

**Response (201 Created)**

```ts
data: {
  chkBlockId: number;
  chkId: number;
  content: string;
  completedCount: number;
  totalCount: number;
  createdAt: string; // '2026-07-31T15:20:00'
}
```

> ℹ️ 응답에 `isCompleted` 가 없다. 새 항목은 항상 미완료로 시작한다.
> ⚠️ **`chkBlockId` 는 `blockId` 와 다른 값이다.** 구성이 **블록(`blockId`) > 블록의 내용(`chkBlockId`)** 이라
> 항목 생성에는 `chkBlockId` 만 쓴다. `blockId` 로 대체하면 다른 체크리스트에 항목이 붙을 수 있다.
> → 이 값은 10번 블록 목록 응답의 **`detail.chkBlockId`** 로 받는다. 값이 없으면 프론트는 항목 추가를 막는다.

---

## 13. 체크리스트 항목 수정

| 항목          | 내용                                                  |
| ------------- | ----------------------------------------------------- |
| **Method**    | `PATCH`                                               |
| **Path**      | `/api/v1/blocks/checklists/items/{chkId}`             |
| **인증 필요** | ✅                                                    |
| **사용 위치** | `src/features/block/api.ts` → `updateChecklistItem()` |

**Request Body** — 두 필드 모두 nullable. 내용만 · 완료 여부만 · 둘 다 보낼 수 있다.

```ts
{
  content?: string;        // 수정한 부분을 포함한 전체 내용
  changeStatusTo?: boolean; // 목표 완료 여부
}
```

**Response (200 OK)**

```ts
data: {
  chkId: number;
  content: string;
  isCompleted: boolean;
  completedCount: number;
  totalCount: number;
  updatedAt: string;
}
```

> ⚠️ `content` 는 **부분 수정이 아니라 전체 내용**을 보낸다.

---

## 14. 체크리스트 항목 삭제

| 항목          | 내용                                                  |
| ------------- | ----------------------------------------------------- |
| **Method**    | `DELETE`                                              |
| **Path**      | `/api/v1/blocks/checklists/items/{chkId}`             |
| **인증 필요** | ✅                                                    |
| **사용 위치** | `src/features/block/api.ts` → `deleteChecklistItem()` |

**Response (200 OK)**

```ts
data: {
  completedCount: number;
  totalCount: number;
}
```

> ℹ️ 세 API 모두 `completedCount` · `totalCount` 를 돌려주지만, `ChecklistBlock` 은 **화면의 항목 목록에서 진척률을 계산**한다. 서버 카운트를 그대로 쓰면 목록과 숫자가 어긋나 보일 수 있다.
> ❗ **블록 수정 · 블록 삭제 · 순서 변경(`rowIndex`/`sortOrder`) API 가 없다.** 블록 헤더 `⋯` 메뉴와 드래그 핸들은 UI 만 있다.

---

## 15. 사업 카테고리 목록 조회

| 항목          | 내용                                                       |
| ------------- | ---------------------------------------------------------- |
| **Method**    | `GET`                                                      |
| **Path**      | `/api/v1/business-categories`                              |
| **인증 필요** | ✅                                                         |
| **사용 위치** | `src/features/businessCategory/api.ts` → `getCategories()` |

**Query**

| 이름             | 타입      | 내용                                                |
| ---------------- | --------- | --------------------------------------------------- |
| `keyword`        | `string`  | 이름 · 업무코드 **부분 일치** 검색 (선택)           |
| `includeDeleted` | `boolean` | 삭제분 포함. 기본 `false`, **ADMIN 만 `true` 가능** |

**Response (200 OK)**

```ts
data: {
  categories: {
    categoryId: number;
    name: string;
    code: string | null; // 업무코드 — 없을 수 있다
    description: string | null;
    deletable: boolean; // 연결된 프로젝트가 없으면 true
    deletedAt: string | null; // ISO — 논리 삭제 시각
  }
  [];
}
```

> ℹ️ **이름 오름차순 고정**이고 **페이징 · 정렬 파라미터가 없다** — 화면은 전체를 받아 스크롤로 보여준다.
> ℹ️ 0건이면 빈 배열. `data.categories` 로 한 겹 감싸져 있어 `api.ts` 에서 벗겨 반환한다.

| status | code                           | 화면 처리         |
| ------ | ------------------------------ | ----------------- |
| 403    | `BUSINESS_CATEGORY_ADMIN_ONLY` | `/forbidden` 이동 |

---

## 16. 사업 카테고리 생성

| 항목          | 내용                                                        |
| ------------- | ----------------------------------------------------------- |
| **Method**    | `POST`                                                      |
| **Path**      | `/api/v1/business-categories`                               |
| **인증 필요** | ✅ (ADMIN)                                                  |
| **사용 위치** | `src/features/businessCategory/api.ts` → `createCategory()` |

**Request Body**

```ts
{
  name: string;         // 필수 · 중복 불가 (최대 100자)
  code?: string;        // 선택 · 입력한 경우에만 중복 검사 (최대 30자)
  description?: string; // 선택
}
```

**Response (201 Created)** — `categoryId` · `name` · `code` · `description` · `deletable` · `createdAt`

| status | code                                                                      | 화면 처리         |
| ------ | ------------------------------------------------------------------------- | ----------------- |
| 400    | `BUSINESS_CATEGORY_NAME_REQUIRED` · `_FIELD_TOO_LONG` · `_CODE_INVALID`   | 폼 필드 에러      |
| 403    | `BUSINESS_CATEGORY_ADMIN_ONLY`                                            | `/forbidden` 이동 |
| 409    | `BUSINESS_CATEGORY_NAME_DUPLICATED` · `BUSINESS_CATEGORY_CODE_DUPLICATED` | 해당 입력에 표시  |

---

## 17. 사업 카테고리 수정

| 항목          | 내용                                                        |
| ------------- | ----------------------------------------------------------- |
| **Method**    | `PATCH`                                                     |
| **Path**      | `/api/v1/business-categories/{categoryId}`                  |
| **인증 필요** | ✅ (ADMIN)                                                  |
| **사용 위치** | `src/features/businessCategory/api.ts` → `updateCategory()` |

**Request Body** — 보낸 필드만 바뀐다

```ts
{
  name?: string;
  code?: string | null;  // null 을 보내면 업무코드를 지운다
  description?: string;
}
```

- ⚠️ `name` · `code` · `description` 이 **하나도 없으면 400** (`BUSINESS_CATEGORY_NO_FIELD_TO_UPDATE`)
- 응답은 생성과 같은 형태 (`createdAt` 포함)

| status | code                                                                                            | 화면 처리         |
| ------ | ----------------------------------------------------------------------------------------------- | ----------------- |
| 400    | `BUSINESS_CATEGORY_NO_FIELD_TO_UPDATE` · `_FIELD_TOO_LONG` · `_NAME_REQUIRED` · `_CODE_INVALID` | 폼 필드 에러      |
| 403    | `BUSINESS_CATEGORY_ADMIN_ONLY`                                                                  | `/forbidden` 이동 |
| 404    | `BUSINESS_CATEGORY_NOT_FOUND`                                                                   | 목록 재조회       |
| 409    | `BUSINESS_CATEGORY_NAME_DUPLICATED` · `BUSINESS_CATEGORY_CODE_DUPLICATED`                       | 해당 입력에 표시  |

---

## 18. 사업 카테고리 삭제

| 항목          | 내용                                                        |
| ------------- | ----------------------------------------------------------- |
| **Method**    | `DELETE`                                                    |
| **Path**      | `/api/v1/business-categories/{categoryId}`                  |
| **인증 필요** | ✅ (ADMIN)                                                  |
| **사용 위치** | `src/features/businessCategory/api.ts` → `deleteCategory()` |

**논리 삭제**다. 하드 삭제하지 않고, **이미 걸린 연결은 끊지 않는다** — 연결 해제는 프로젝트 쪽 API 소관.

| status | code                           | 화면 처리                                           |
| ------ | ------------------------------ | --------------------------------------------------- |
| 403    | `BUSINESS_CATEGORY_ADMIN_ONLY` | `/forbidden` 이동                                   |
| 404    | `BUSINESS_CATEGORY_NOT_FOUND`  | 이미 삭제됨 — 목록 재조회                           |
| 409    | `BUSINESS_CATEGORY_IN_USE`     | **삭제 차단 안내** — 건수가 `message` 문구에 포함됨 |

> ℹ️ 목록의 `deletable` 로 미리 걸러도 **경합(다른 사람이 그 사이 프로젝트를 연결)** 은 막을 수 없다. 409 를 반드시 처리한다.

---

## 19. 전역 권한 변경

| 항목          | 내용                                      |
| ------------- | ----------------------------------------- |
| **Method**    | `PATCH`                                   |
| **Path**      | `/api/v1/accounts/{userId}/role`          |
| **인증 필요** | ✅ (ADMIN)                                |
| **사용 위치** | 미연동 — 사원 상세 화면(#5)에서 연결 예정 |

**요청 Body**

| 필드   | 타입     | 필수 | 설명                             |
| ------ | -------- | ---- | -------------------------------- |
| `role` | `string` | ✅   | `MASTER` · `MEMBER` — ADMIN 불가 |

**응답 data** — `userId` · `role`

| status | code                                | 화면 처리                         |
| ------ | ----------------------------------- | --------------------------------- |
| 400    | `ACC_INVALID_ROLE`                  | 허용되지 않는 값                  |
| 400    | `ACC_ADMIN_ROLE_NOT_ALLOWED`        | ADMIN 부여 시도 — 셀렉트에서 제외 |
| 400    | `ACC_SELF_MODIFICATION_NOT_ALLOWED` | 자기 자신 변경 — 미리 비활성화    |
| 403    | `ACC_SYSTEM_ACCOUNT_NOT_ALLOWED`    | 시스템 계정 대상 불가             |
| 404    | `ACC_NOT_FOUND`                     | 계정 없음 — 목록 재조회           |

---

## 20. 계정 상태 변경

| 항목          | 내용                                      |
| ------------- | ----------------------------------------- |
| **Method**    | `PATCH`                                   |
| **Path**      | `/api/v1/accounts/{userId}/status`        |
| **인증 필요** | ✅ (ADMIN)                                |
| **사용 위치** | 미연동 — 사원 상세 화면(#5)에서 연결 예정 |

**요청 Body**

| 필드     | 타입     | 필수 | 설명                  |
| -------- | -------- | ---- | --------------------- |
| `status` | `string` | ✅   | `ACTIVE` · `INACTIVE` |

**응답 data** — `userId` · `status`

| status | code                             | 화면 처리                      |
| ------ | -------------------------------- | ------------------------------ |
| 400    | `ACC_INVALID_STATUS`             | 허용되지 않는 값               |
| 400    | `ACC_STATUS_UNCHANGED`           | 이미 같은 상태 — 토글 비활성화 |
| 403    | `ACC_SYSTEM_ACCOUNT_NOT_ALLOWED` | 시스템 계정 대상 불가          |
| 404    | `ACC_NOT_FOUND`                  | 계정 없음                      |

> ⚠️ **퇴사 처리와 다른 API 다.** 퇴사는 [34](#34-퇴사-처리) 하나로 퇴사일 기록 + 계정 비활성을 함께 처리한다.

---

## 21. 비밀번호 재설정 (개인 · 다중 공용)

| 항목          | 내용                                                |
| ------------- | --------------------------------------------------- |
| **Method**    | `POST`                                              |
| **Path**      | `/api/v1/accounts/password-resets`                  |
| **인증 필요** | ✅ (ADMIN)                                          |
| **사용 위치** | `src/features/employee/api.ts` → `resetPasswords()` |

**요청 Body**

| 필드      | 타입       | 필수 | 설명                            |
| --------- | ---------- | ---- | ------------------------------- |
| `userIds` | `string[]` | ✅   | 대상 사번 목록 (1명이면 길이 1) |

**응답 data**

| 필드                         | 타입       | 설명                                             |
| ---------------------------- | ---------- | ------------------------------------------------ |
| `requestedCount`             | `int`      | 요청 건수                                        |
| `successCount`               | `int`      | 성공 건수                                        |
| `failedCount`                | `int`      | 실패 건수                                        |
| `failures[]`                 | `Object[]` | `userId` · `name` · `reason` · `passwordChanged` |
| `failures[].reason`          | `string`   | `EMAIL_NOT_REGISTERED` · `MAIL_SEND_FAILED`      |
| `failures[].passwordChanged` | `boolean`  | 메일 미등록 = `false` · 메일 실패 = `true`       |

| status | code                            | 화면 처리                      |
| ------ | ------------------------------- | ------------------------------ |
| 400    | `ACC_INVALID_REQUEST`           | `userIds` 비어 있음            |
| 403    | `ACC_ADMIN_ACCOUNT_NOT_ALLOWED` | 대상에 ADMIN 포함 — 전체 거부  |
| 404    | `ACC_NOT_FOUND`                 | 없는 사번 포함 — **전체 거부** |

> ⚠️ **실패가 섞여도 200** 이다. 집계를 결과 모달에 그려야 한다.
> ⚠️ `passwordChanged: true` 인 사원은 새 비밀번호를 모르는 상태 — **재발송(같은 API 재호출) 필수**.

---

## 22. 부서 목록 조회

| 항목          | 내용                                                                                           |
| ------------- | ---------------------------------------------------------------------------------------------- |
| **Method**    | `GET`                                                                                          |
| **Path**      | `/api/v1/departments`                                                                          |
| **인증 필요** | ✅ (전체 사용자 — 사원 등록 · 필터에 쓰임)                                                     |
| **사용 위치** | `src/features/department/api.ts` → `getDepartments()` (사원 목록 필터 셀렉트도 이 API 를 쓴다) |

**응답 data.content[]**

| 필드                  | 타입       | 설명                              |
| --------------------- | ---------- | --------------------------------- |
| `departmentId`        | `Long`     | 부서 번호                         |
| `name`                | `string`   | 부서명                            |
| `directEmployeeCount` | `int`      | 직속 인원 — **삭제 차단 판정용**  |
| `totalEmployeeCount`  | `int`      | 하위 포함 인원 — **화면 표시값**  |
| `children[]`          | `Object[]` | 하위 부서(같은 구성). 없으면 `[]` |

> ℹ️ 페이징 없음 · 생성 순 정렬 · **최대 2단** (`children` 안에 `children` 없음).
> ℹ️ 인원 수는 시스템 계정 · 퇴사자를 제외한 값이다.

---

## 23. 부서 생성 (최상위 · 하위 공용)

| 항목          | 내용                  |
| ------------- | --------------------- |
| **Method**    | `POST`                |
| **Path**      | `/api/v1/departments` |
| **인증 필요** | ✅ (ADMIN)            |

**요청 Body**

| 필드       | 타입     | 필수 | 설명                                        |
| ---------- | -------- | ---- | ------------------------------------------- |
| `name`     | `string` | ✅   | 최대 50자, 전체 중복 불가 (⚠️ 변경 요청 중) |
| `parentId` | `Long`   | —    | 생략하면 최상위. 하위 추가 시 고정 전송     |

**응답 data** — `departmentId` · `name` · `parentId` · `parentName` · `directEmployeeCount`(0) · `totalEmployeeCount`(0)

| status | code                      | 화면 처리                             |
| ------ | ------------------------- | ------------------------------------- |
| 400    | `DEPT_INVALID_REQUEST`    | 부서명 빈값 · 50자 초과               |
| 404    | `DEPT_PARENT_NOT_FOUND`   | 상위 부서 없음 — 목록 재조회          |
| 409    | `DEPT_NAME_DUPLICATED`    | 이름 입력 아래 인라인 에러            |
| 409    | `DEPT_MAX_DEPTH_EXCEEDED` | 2단 초과 — 하위 추가 메뉴를 미리 숨김 |

> ⚠️ **부서명 중복 범위 변경 요청함 (2026-08-06).** 전체 유니크면 `기술본부 > 개발팀` 과 `SI본부 > 개발팀` 을 함께 만들 수 없다.
> **같은 상위 부서(형제) 범위**로 완화해 달라고 백엔드에 요청한 상태다. 반영되면 폼 안내 문구 한 줄만 바꾸면 된다
> (`DepartmentFormModal` — "부서명은 전체에서 중복될 수 없습니다."). 409 문구는 백엔드 `message` 를 그대로 쓰므로 코드 변경이 없다.

| 항목          | 내용                                 |
| ------------- | ------------------------------------ |
| **Method**    | `PATCH`                              |
| **Path**      | `/api/v1/departments/{departmentId}` |
| **인증 필요** | ✅ (ADMIN)                           |

**요청 Body** — `name` (✅, 최대 50자)

**응답 data** — `departmentId` · `name` · `parentId` · `parentName`

| status | code                   | 화면 처리                  |
| ------ | ---------------------- | -------------------------- |
| 400    | `DEPT_INVALID_REQUEST` | 부서명 빈값 · 50자 초과    |
| 404    | `DEPT_NOT_FOUND`       | 부서 없음 — 목록 재조회    |
| 409    | `DEPT_NAME_DUPLICATED` | 이름 입력 아래 인라인 에러 |

> ⚠️ **상위 부서(`parentId`)는 바꿀 수 없다** — 부서 이동 기능이 없다. 메뉴에 넣지 않는다.
> ℹ️ 부서명을 바꿔도 소속 사원 배정은 그대로다.

---

## 25. 부서 삭제

| 항목          | 내용                                 |
| ------------- | ------------------------------------ |
| **Method**    | `DELETE`                             |
| **Path**      | `/api/v1/departments/{departmentId}` |
| **인증 필요** | ✅ (ADMIN)                           |

**하드 삭제**다 (논리 삭제 아님). 하위 부서를 함께 지우지 않는다.

| status | code                 | 화면 처리                                 |
| ------ | -------------------- | ----------------------------------------- |
| 404    | `DEPT_NOT_FOUND`     | 이미 삭제됨 — 목록 재조회                 |
| 409    | `DEPT_HAS_EMPLOYEES` | 삭제 차단 — 인원 수가 `message` 에 포함됨 |
| 409    | `DEPT_HAS_CHILDREN`  | 삭제 차단 — 부서 수가 `message` 에 포함됨 |

---

## 26. 직급 목록 조회

| 항목          | 내용                                                    |
| ------------- | ------------------------------------------------------- |
| **Method**    | `GET`                                                   |
| **Path**      | `/api/v1/job-positions`                                 |
| **인증 필요** | ✅ (ADMIN)                                              |
| **사용 위치** | `src/features/jobPosition/api.ts` → `getJobPositions()` |

**응답 data.content[]**

| 필드            | 타입     | 설명                                      |
| --------------- | -------- | ----------------------------------------- |
| `jobPositionId` | `Long`   | 직급 번호                                 |
| `name`          | `string` | 직급명                                    |
| `sortOrder`     | `int`    | 정렬 순서 — **UNIQUE 아님, 겹칠 수 있다** |
| `employeeCount` | `int`    | 사용 인원 (시스템 계정 · 퇴사자 제외)     |

> ℹ️ 페이징 없음 · `sortOrder` 오름차순, 같으면 직급명 오름차순으로 내려온다 — 화면에서 다시 정렬하지 않는다.

---

## 27. 직급 생성

| 항목          | 내용                                                      |
| ------------- | --------------------------------------------------------- |
| **Method**    | `POST`                                                    |
| **Path**      | `/api/v1/job-positions`                                   |
| **인증 필요** | ✅ (ADMIN)                                                |
| **사용 위치** | `src/features/jobPosition/api.ts` → `createJobPosition()` |

**요청 Body**

| 필드        | 타입     | 필수 | 설명                         |
| ----------- | -------- | ---- | ---------------------------- |
| `name`      | `string` | ✅   | 최대 30자, 중복 불가         |
| `sortOrder` | `int`    | —    | 생략하면 **마지막 순서 + 1** |

**응답 data** (201) — `jobPositionId` · `name` · `sortOrder` · `employeeCount`(0)

| status | code                  | 화면 처리                  |
| ------ | --------------------- | -------------------------- |
| 400    | `POS_INVALID_REQUEST` | 직급명 빈값 · 30자 초과    |
| 409    | `POS_NAME_DUPLICATED` | 이름 입력 아래 인라인 에러 |

---

## 28. 직급 수정 (직급명 · 순서)

| 항목          | 내용                                                      |
| ------------- | --------------------------------------------------------- |
| **Method**    | `PATCH`                                                   |
| **Path**      | `/api/v1/job-positions/{jobPositionId}`                   |
| **인증 필요** | ✅ (ADMIN)                                                |
| **사용 위치** | `src/features/jobPosition/api.ts` → `updateJobPosition()` |

**요청 Body** — 전달한 필드만 수정된다

| 필드        | 타입     | 필수 | 설명      |
| ----------- | -------- | ---- | --------- |
| `name`      | `string` | —    | 최대 30자 |
| `sortOrder` | `int`    | —    | 정렬 순서 |

**응답 data** — 목록과 같은 구조

| status | code                  | 화면 처리                    |
| ------ | --------------------- | ---------------------------- |
| 400    | `POS_INVALID_REQUEST` | 수정할 필드 없음 · 형식 오류 |
| 404    | `POS_NOT_FOUND`       | 이미 삭제됨 — 목록 재조회    |
| 409    | `POS_NAME_DUPLICATED` | 이름 입력 아래 인라인 에러   |

> ℹ️ 직급명 수정과 순서 변경이 **같은 API** 다 (화면 메뉴는 둘로 나뉘어도).
> ℹ️ 순서 맞바꿈은 두 번 호출한다. `sortOrder` 가 UNIQUE 가 아니라 겹쳐도 오류가 나지 않으므로, 값이 같을 때는 `이웃값 ± 1` 로 넘긴다.

---

## 29. 직급 삭제

| 항목          | 내용                                                      |
| ------------- | --------------------------------------------------------- |
| **Method**    | `DELETE`                                                  |
| **Path**      | `/api/v1/job-positions/{jobPositionId}`                   |
| **인증 필요** | ✅ (ADMIN)                                                |
| **사용 위치** | `src/features/jobPosition/api.ts` → `deleteJobPosition()` |

**하드 삭제**다. 사용 인원이 있으면 먼저 사원의 직급을 바꾸거나 비워야 한다.

| status | code            | 화면 처리                                 |
| ------ | --------------- | ----------------------------------------- |
| 404    | `POS_NOT_FOUND` | 이미 삭제됨 — 목록 재조회                 |
| 409    | `POS_IN_USE`    | 삭제 차단 — 인원 수가 `message` 에 포함됨 |

> ℹ️ 목록의 `employeeCount` 로 미리 걸러도 **경합(그 사이 사원에게 배정)** 은 막을 수 없다. 409 를 반드시 처리한다.

---

## 30. 사원 목록 조회 (인사관리)

| 항목          | 내용                                              |
| ------------- | ------------------------------------------------- |
| **Method**    | `GET`                                             |
| **Path**      | `/api/v1/employees`                               |
| **인증 필요** | ✅ (ADMIN)                                        |
| **사용 위치** | `src/features/employee/api.ts` → `getEmployees()` |

**요청 Query**

| 파라미터        | 타입      | 설명                                       |
| --------------- | --------- | ------------------------------------------ |
| `keyword`       | `string`  | **이름 또는 사번** 부분 검색 (하나로 통합) |
| `departmentId`  | `Long`    | 부서 필터                                  |
| `role`          | `string`  | `MASTER` · `MEMBER`                        |
| `status`        | `string`  | `ACTIVE` · `RESET_REQUIRED` · `INACTIVE`   |
| `resigned`      | `boolean` | 미지정이면 **재직자만**                    |
| `page` / `size` | `int`     | 기본 0 / 20 (`size` 최대 200)              |

**응답 data** — 페이징

| 필드                                             | 타입      | 설명                                   |
| ------------------------------------------------ | --------- | -------------------------------------- |
| `content[].userId` / `.name`                     | `string`  | 사번 · 이름                            |
| `content[].email`                                | `string?` | 이메일 주소                            |
| `content[].emailRegistered`                      | `boolean` | `false` 면 로그인 불가 → ⚠ 미등록 배지 |
| `content[].departmentName` / `.departmentPath`   | `string?` | 부서명 · 2단 경로                      |
| `content[].jobPositionName`                      | `string?` | 직급명                                 |
| `content[].role`                                 | `string`  | `MASTER` · `MEMBER`                    |
| `content[].accountStatus`                        | `string`  | `ACTIVE` · `INACTIVE`                  |
| `content[].passwordStatus`                       | `string`  | `NORMAL` · `RESET_REQUIRED`            |
| `content[].resignedAt`                           | `string?` | 퇴사일 (`null` = 재직중)               |
| `page` / `size` / `totalElements` / `totalPages` | `int`     | 페이징 메타                            |

| status | code                    | 화면 처리             |
| ------ | ----------------------- | --------------------- |
| 400    | `EMP_INVALID_PARAMETER` | 허용되지 않는 필터 값 |

> ⚠️ 결재선 검색([35](#35-사원-이름-검색-결재선-지정용))과 **다른 API** 다 — 이건 ADMIN 전용 인사관리용.
> ℹ️ 상태 배지는 `accountStatus` + `passwordStatus` **두 원본을 프론트가 조합**한다.
> ℹ️ 시스템 계정은 어떤 조건으로도 나오지 않는다.
> ⚠️ 이름 정렬은 프론트에서 `localeCompare('ko')` 로 한다 — DB 콜레이션이 가나다 순이 아니다.

---

## 31. 사원 상세 조회

| 항목          | 내용                                 |
| ------------- | ------------------------------------ |
| **Method**    | `GET`                                |
| **Path**      | `/api/v1/employees/{userId}`         |
| **인증 필요** | ✅ (ADMIN)                           |
| **사용 위치** | 미연동 — 사원 상세(#5)에서 연결 예정 |

**응답 data** — 목록 필드 + 아래

| 필드                             | 타입       | 설명                           |
| -------------------------------- | ---------- | ------------------------------ |
| `departmentId` / `jobPositionId` | `Long?`    | 수정 폼 초기값                 |
| `phone`                          | `string?`  | 연락처                         |
| `hiredAt`                        | `string?`  | 입사일 `yyyy-MM-dd`            |
| `lastLoginAt`                    | `string?`  | 마지막 로그인                  |
| `groups[]`                       | `Object[]` | 소속 그룹 — `groupId` · `name` |

| status | code                             | 화면 처리                 |
| ------ | -------------------------------- | ------------------------- |
| 403    | `ACC_SYSTEM_ACCOUNT_NOT_ALLOWED` | 시스템 계정 대상          |
| 404    | `EMP_NOT_FOUND`                  | 사원 없음(삭제 사원 포함) |

---

## 32. 사원 등록 (계정 동시 발급)

| 항목          | 내용                                  |
| ------------- | ------------------------------------- |
| **Method**    | `POST`                                |
| **Path**      | `/api/v1/employees`                   |
| **인증 필요** | ✅ (ADMIN)                            |
| **사용 위치** | 미연동 — 사원 등록(#38)에서 연결 예정 |

**요청 Body**

| 필드            | 타입     | 필수 | 설명                             |
| --------------- | -------- | ---- | -------------------------------- |
| `userId`        | `string` | ✅   | 사번 = 로그인 아이디 (불변)      |
| `name`          | `string` | ✅   | 이름                             |
| `departmentId`  | `Long`   | ✅   | 부서 ID                          |
| `hiredAt`       | `string` | ✅   | 입사일 `yyyy-MM-dd`              |
| `role`          | `string` | ✅   | `MASTER` · `MEMBER` (ADMIN 불가) |
| `jobPositionId` | `Long`   | —    | 직급 ID                          |
| `email`         | `string` | —    | 초기 비밀번호를 이 주소로 발송   |
| `phone`         | `string` | —    | 연락처                           |

**응답 data** (201) — `userId` · `name` · `emailRegistered` · `emailSent`

| status | code                         | 화면 처리                         |
| ------ | ---------------------------- | --------------------------------- |
| 400    | `EMP_INVALID_REQUEST`        | 필수값 누락 · 형식 오류           |
| 400    | `EMP_ADMIN_ROLE_NOT_ALLOWED` | `role` 에 ADMIN — 셀렉트에서 제외 |
| 404    | `EMP_DEPARTMENT_NOT_FOUND`   | 부서 없음 — 셀렉트 재조회         |
| 404    | `EMP_JOB_POSITION_NOT_FOUND` | 직급 없음 — 셀렉트 재조회         |
| 409    | `EMP_USER_ID_DUPLICATED`     | 사번 입력 아래 인라인 에러        |

> ℹ️ 계정이 **항상 함께** 발급된다 — 사원만 등록하는 경로가 없다.
> ⚠️ 메일 발송이 실패해도 201 이며 `emailSent: false` 로 온다 — 재설정([21](#21-비밀번호-재설정-개인--다중-공용))으로 재발송해야 한다.
> ℹ️ 이메일이 없어도 등록되지만 그 계정은 로그인할 수 없다.

---

## 33. 사원 정보 수정

| 항목          | 내용                                       |
| ------------- | ------------------------------------------ |
| **Method**    | `PATCH`                                    |
| **Path**      | `/api/v1/employees/{userId}`               |
| **인증 필요** | ✅ (ADMIN)                                 |
| **사용 위치** | 미연동 — 사원 정보 수정(#39)에서 연결 예정 |

**요청 Body** — 전달한 필드만 수정된다

| 필드                             | 타입     | 설명                                  |
| -------------------------------- | -------- | ------------------------------------- |
| `name` · `phone` · `email`       | `string` | `name` 은 빈값 불가                   |
| `departmentId` · `jobPositionId` | `Long`   | **명시적 `null` = 미지정으로 클리어** |
| `hiredAt`                        | `string` | `yyyy-MM-dd`                          |

**응답 data** — 사원 상세와 같은 구조

| status | code                                                                        | 화면 처리                    |
| ------ | --------------------------------------------------------------------------- | ---------------------------- |
| 400    | `EMP_INVALID_REQUEST`                                                       | 형식 오류 · 수정할 필드 없음 |
| 403    | `ACC_SYSTEM_ACCOUNT_NOT_ALLOWED`                                            | 시스템 계정 대상             |
| 404    | `EMP_NOT_FOUND` · `EMP_DEPARTMENT_NOT_FOUND` · `EMP_JOB_POSITION_NOT_FOUND` | 대상 재조회                  |

> ⚠️ **사번 · 전역 권한은 이 API 로 못 바꾼다** — 사번은 불변(PK), 권한은 [19](#19-전역-권한-변경).
> ℹ️ 부서 배정은 별도 API 가 아니라 `departmentId` 전송으로 처리한다.
> ℹ️ `jobPositionId: null` = 직급 삭제, **필드 생략 = 변경 안 함**. 둘을 구분해야 한다.

---

## 34. 퇴사 처리

| 항목          | 내용                                     |
| ------------- | ---------------------------------------- |
| **Method**    | `PATCH`                                  |
| **Path**      | `/api/v1/employees/{userId}/resignation` |
| **인증 필요** | ✅ (ADMIN)                               |
| **사용 위치** | 미연동 — 사원 상세(#5)에서 연결 예정     |

**요청 Body** — `resignedAt` (✅, 퇴사일 `yyyy-MM-dd`)

**응답 data** — `userId` · `resignedAt` · `accountStatus`(`INACTIVE`)

| status | code                             | 화면 처리        |
| ------ | -------------------------------- | ---------------- |
| 400    | `EMP_INVALID_REQUEST`            | 형식 오류        |
| 400    | `EMP_ALREADY_RESIGNED`           | 이미 퇴사 처리됨 |
| 403    | `ACC_SYSTEM_ACCOUNT_NOT_ALLOWED` | 시스템 계정 대상 |
| 404    | `EMP_NOT_FOUND`                  | 사원 없음        |

> ⚠️ 퇴사일 기록 + 계정 `INACTIVE` 를 **한 번에** 처리한다 — 계정 상태 변경 API([20](#20-계정-상태-변경))를 따로 부르지 않는다.
> ℹ️ 사원 정보는 삭제되지 않는다. 과거 프로젝트 · 파일 이력에 이름이 남는다.

---

## 35. 사원 이름 검색 (결재선 지정용)

| 항목          | 내용                                          |
| ------------- | --------------------------------------------- |
| **Method**    | `GET`                                         |
| **Path**      | `/api/v1/employees/search`                    |
| **인증 필요** | ✅ (로그인 사용자 전체 — **ADMIN 전용 아님**) |
| **사용 위치** | 미연동 — 결재선 사원 검색(#41)에서 연결 예정  |

**요청 Query** — `name` (✅, 이름 부분 일치)

**응답 data[]** — **배열** (`content` 래퍼 없음)

| 필드         | 타입      | 설명                     |
| ------------ | --------- | ------------------------ |
| `userId`     | `string`  | 사번                     |
| `name`       | `string`  | 이름                     |
| `department` | `string?` | 부서명 (동명이인 구분용) |
| `position`   | `string?` | 직급명 (동명이인 구분용) |

| status | code                    | 화면 처리                            |
| ------ | ----------------------- | ------------------------------------ |
| 400    | `EMP_INVALID_PARAMETER` | `name` 누락 — 빈 입력이면 호출 안 함 |

> ℹ️ 시스템 계정 · 퇴사자는 후보에 나오지 않으며, 결과가 없으면 빈 배열(`[]`).
> ℹ️ 급여 등 민감 정보 없이 위 4개 필드만 반환한다.

---

> ✏️ 새 API를 연동할 때 위 양식대로 계속 추가하세요.
> 핵심은 **백엔드 응답 타입을 정확히** 적어두는 것 — AI가 타입 안전하게 연동 코드를 짜줘요.
