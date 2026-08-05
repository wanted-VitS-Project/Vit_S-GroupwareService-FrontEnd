# 연동 API 명세서

**최종 업데이트**: 2026-08-04 (Swagger 실행 결과로 로그인 응답 확정)

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
    userId: string;          // 'EMP001'
    name: string;            // '김민준'
    role: 'ADMIN' | 'MASTER' | 'MEMBER';
    passwordStatus: 'NORMAL' | 'RESET_REQUIRED';
    departmentName: string;  // '개발팀'
    departmentPath: string;  // '기술본부 / 개발팀'
    jobPositionName: string; // '대리'
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

이용약관 · 개인정보처리방침 동의를 기록한다. 응답 `data` 는 `null`.

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
- 변경 후에도 세션은 유지된다 (재로그인 불필요)

| status | code                                                                                                                                                                                          | 화면 처리            |
| ------ | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------- |
| 400    | `AUTH_INVALID_REQUEST` · `AUTH_CURRENT_PASSWORD_REQUIRED` · `AUTH_CURRENT_PASSWORD_INVALID` · `AUTH_PASSWORD_CONFIRM_MISMATCH` · `AUTH_PASSWORD_POLICY_VIOLATION` · `AUTH_PASSWORD_UNCHANGED` | 폼 필드 에러 표시    |
| 401    | `AUTH_UNAUTHENTICATED`                                                                                                                                                                        | 로그인 화면으로 이동 |

---

> ✏️ 새 API를 연동할 때 위 양식대로 계속 추가하세요.
> 핵심은 **백엔드 응답 타입을 정확히** 적어두는 것 — AI가 타입 안전하게 연동 코드를 짜줘요.
