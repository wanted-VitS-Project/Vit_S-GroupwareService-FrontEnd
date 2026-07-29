# [프로젝트명] 연동 API 명세서

> 📌 이 파일은 **프론트가 연동하는 백엔드 API**를 정리하는 곳이에요. (내가 만드는 게 아니라 **호출하는** 입장)
> AI는 API 연동 코드를 작성하기 전에 이 파일을 먼저 읽어요. (잘못된 경로/필드/타입으로 fetch 짜는 실수 방지)
> 백엔드 명세(노션·Swagger)에서 필요한 API를 아래 양식으로 옮겨 적으세요.

---

## API 목록

### 1. [기능명] — 예: 로그인

| 항목 | 내용 |
|------|------|
| **Method** | `POST` |
| **Path** | `/api/v1/auth/login` |
| **인증 필요** | ❌ |
| **사용 위치** | `src/api/auth.ts` / `useLogin` 훅 |

**Request Body**

```ts
interface LoginRequest {
  email: string;
  password: string;
}
```

**Response (200 OK)**

```ts
interface LoginResponse {
  status: number;
  message: string;
  data: {
    accessToken: string;
    nickname: string;
    role: string;
  };
}
```

**에러 응답**

| status | code | 처리 방법 |
|--------|------|----------|
| 401 | `AUT-001` | "이메일/비밀번호를 확인하세요" 토스트 |
| 400 | `USR-001` | 폼 필드 에러 표시 |

---

> ✏️ 위 양식을 복사해서 연동하는 API를 계속 추가하세요.
> 핵심은 **백엔드 응답 타입을 정확히** 적어두는 것 — AI가 타입 안전하게 연동 코드를 짜줘요.
