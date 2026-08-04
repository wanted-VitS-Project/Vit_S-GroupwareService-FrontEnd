/**
 * fetch 래퍼. 공통 헤더 · 인증 · 에러 처리를 여기서 한 번만 한다.
 * 컴포넌트에서 fetch 를 직접 호출하지 않는다.
 */

const BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL ?? '';

/** 백엔드 공통 응답 봉투. httpStatus 는 Response.status 와 같은 값이라 쓰지 않는다. */
interface ApiEnvelope<T> {
  httpStatus: number;
  message: string;
  data: T;
}

export class ApiError extends Error {
  constructor(
    readonly status: number,
    message: string,
  ) {
    super(message);
    this.name = 'ApiError';
  }
}

async function request<T>(path: string, method: string, body?: unknown) {
  let response: Response;

  try {
    response = await fetch(`${BASE_URL}${path}`, {
      method,
      // 인증 수단이 HttpOnly 세션 쿠키라 요청마다 쿠키를 싣는다
      credentials: 'include',
      headers: { 'Content-Type': 'application/json' },
      body: body === undefined ? undefined : JSON.stringify(body),
    });
  } catch {
    // status 0 = 네트워크 단절 · CORS 차단 등 응답 자체가 오지 않은 경우
    throw new ApiError(
      0,
      '서버에 연결할 수 없습니다. 네트워크를 확인해주세요.',
    );
  }

  const envelope = (await response
    .json()
    .catch(() => null)) as ApiEnvelope<T> | null;

  if (!response.ok) {
    throw new ApiError(
      response.status,
      envelope?.message ?? '요청을 처리하지 못했습니다.',
    );
  }

  return envelope?.data as T;
}

export const api = {
  get: <T>(path: string) => request<T>(path, 'GET'),
  post: <T>(path: string, body?: unknown) => request<T>(path, 'POST', body),
  patch: <T>(path: string, body?: unknown) => request<T>(path, 'PATCH', body),
};
