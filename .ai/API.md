# 연동 API 명세서

**최종 업데이트**: 2026-08-05 (백엔드 명세 확정본 반영 — termsStatus · code 기반 분기)

> 📌 이 파일은 **프론트가 연동하는 백엔드 API**를 정리하는 곳이에요. (내가 만드는 게 아니라 **호출하는** 입장)
> AI는 API 연동 코드를 작성하기 전에 이 파일을 먼저 읽어요. (잘못된 경로/필드/타입으로 fetch 짜는 실수 방지)

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
> ℹ️ 쿠키 속성: `HttpOnly` · `SameSite=Lax` · 만료 `Session`(브라우저 종료 시 소멸) — 로그인 유지 체크박스는 없다.
> ℹ️ 로그인 여부 판단은 서버(`src/proxy.ts`)에서만 가능하다. HttpOnly 라 JS 로 읽을 수 없다.
> ℹ️ 백엔드가 `deviceId` 쿠키(HttpOnly, 장기 만료)도 함께 내려준다. 프론트가 다루지 않는다.
> ⚠️ 백엔드 CORS 에 프론트 오리진 허용 + `allowCredentials=true` 가 설정돼 있어야 한다.

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

> ℹ️ **로그인 응답 + `email` · `phone` · `hiredAt` · `lastLoginAt` 4개** 구조다.
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

## 9-1. 스텝 블록 일괄 조회

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
> ❗ **`detail` 스키마는 `FILE` 의 `{ fileCount: 3 }` 만 확인됐다.** `CHECKLIST` 의 항목 배열 키 이름이 확정되면 `readChecklistItems()` 를 맞춰야 한다. 지금은 `detail.items` 를 런타임 검증해서 읽고, 형태가 다르면 빈 목록으로 떨어뜨린다.

---

## 10. 체크리스트 항목 생성

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

---

## 11. 체크리스트 항목 수정

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

## 12. 체크리스트 항목 삭제

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

> ✏️ 새 API를 연동할 때 위 양식대로 계속 추가하세요.
> 핵심은 **백엔드 응답 타입을 정확히** 적어두는 것 — AI가 타입 안전하게 연동 코드를 짜줘요.
