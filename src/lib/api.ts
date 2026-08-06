/**
 * fetch 래퍼. 공통 헤더 · 인증 · 에러 처리를 여기서 한 번만 한다.
 * 컴포넌트에서 fetch 를 직접 호출하지 않는다.
 */

const BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL ?? '';

/** 성공 봉투. httpStatus 는 Response.status 와 같은 값이라 쓰지 않는다. */
interface ApiEnvelope<T> {
  message: string;
  data: T;
}

/** 실패 봉투. data 대신 code 가 온다. */
interface ApiErrorEnvelope {
  message: string;
  code: string;
}

export class ApiError extends Error {
  constructor(
    readonly status: number,
    message: string,
    /** 네트워크 오류 등 응답이 없으면 비어 있다 */
    readonly code?: string,
  ) {
    super(message);
    this.name = 'ApiError';
  }
}

/**
 * 403 은 개별 화면이 아니라 앱 전체가 반응해야 한다 —
 * 게이트 미통과는 해당 게이트 화면으로, 권한 부족은 /forbidden 으로.
 * `detail` 에 응답 code 를 싣고, 구독은 CurrentUserProvider 한 곳에서만 한다.
 */
export const FORBIDDEN_EVENT = 'api:forbidden';

/**
 * 세션 만료도 개별 화면이 아니라 앱 전체가 반응해야 한다 —
 * 어느 API 에서 401 이 오든 로그인 화면으로 보낸다.
 * `detail` 에 응답 code 를 싣고, 구독은 CurrentUserProvider 한 곳에서만 한다.
 */
export const UNAUTHORIZED_EVENT = 'api:unauthorized';

/** 백엔드 문구가 가장 정확하다. 응답이 없을 때만 fallback 을 쓴다. */
export function messageOf(error: unknown, fallback: string) {
  return error instanceof ApiError ? error.message : fallback;
}

/** 요청 취소가 필요한 호출은 `AbortController.signal` 을 넘긴다 */
export function isAbortError(error: unknown) {
  return error instanceof DOMException && error.name === 'AbortError';
}

/** 응답이 오지 않은 경우(네트워크 단절 · CORS 차단)를 공통 문구로 바꾼다 */
function toNetworkError(caught: unknown) {
  // 취소는 호출 측이 의도한 것이라 네트워크 오류로 바꾸지 않고 그대로 던진다
  if (isAbortError(caught)) return caught;

  // status 0 = 응답 자체가 오지 않은 경우
  return new ApiError(0, '서버에 연결할 수 없습니다. 네트워크를 확인해주세요.');
}

/**
 * 실패 응답을 `ApiError` 로 바꿔 던진다.
 * 본문이 JSON 이든 바이너리든 **에러 응답은 항상 실패 봉투**라 여기서 같이 다룬다.
 */
async function throwFailure(response: Response): Promise<never> {
  const failure = (await response
    .json()
    .catch(() => null)) as ApiErrorEnvelope | null;

  if (typeof window !== 'undefined') {
    if (response.status === 403) {
      window.dispatchEvent(
        new CustomEvent(FORBIDDEN_EVENT, { detail: failure?.code }),
      );
    }
    // 401 은 code 로 갈린다 — 로그인 실패까지 전역 처리하면 로그인 화면이 깨진다
    if (response.status === 401) {
      window.dispatchEvent(
        new CustomEvent(UNAUTHORIZED_EVENT, { detail: failure?.code }),
      );
    }
  }

  throw new ApiError(
    response.status,
    failure?.message ?? '요청을 처리하지 못했습니다.',
    failure?.code,
  );
}

async function request<T>(
  path: string,
  method: string,
  body?: unknown,
  signal?: AbortSignal,
) {
  let response: Response;

  try {
    response = await fetch(`${BASE_URL}${path}`, {
      method,
      // 인증 수단이 HttpOnly 세션 쿠키라 요청마다 쿠키를 싣는다
      credentials: 'include',
      headers: { 'Content-Type': 'application/json' },
      body: body === undefined ? undefined : JSON.stringify(body),
      signal,
    });
  } catch (caught) {
    throw toNetworkError(caught);
  }

  if (!response.ok) await throwFailure(response);

  const envelope = (await response
    .json()
    .catch(() => null)) as ApiEnvelope<T> | null;

  return envelope?.data as T;
}

/**
 * 응답 본문이 우리 봉투가 아닌 API 용 (예: PDF 미리보기 바이너리).
 * 성공하면 `Response` 를 그대로 준다 — 헤더까지 봐야 하는 경우가 있다.
 * 실패는 JSON 실패 봉투로 오므로 `request` 와 동일하게 처리한다.
 */
export async function requestRaw(path: string, signal?: AbortSignal) {
  let response: Response;

  try {
    response = await fetch(`${BASE_URL}${path}`, {
      method: 'GET',
      credentials: 'include',
      signal,
    });
  } catch (caught) {
    throw toNetworkError(caught);
  }

  if (!response.ok) await throwFailure(response);

  return response;
}

export const api = {
  get: <T>(path: string, signal?: AbortSignal) =>
    request<T>(path, 'GET', undefined, signal),
  post: <T>(path: string, body?: unknown, signal?: AbortSignal) =>
    request<T>(path, 'POST', body, signal),
  patch: <T>(path: string, body?: unknown, signal?: AbortSignal) =>
    request<T>(path, 'PATCH', body, signal),
  /** 부분 수정이 아니라 **전체 치환**일 때만 쓴다 (예: 결재선) */
  put: <T>(path: string, body?: unknown, signal?: AbortSignal) =>
    request<T>(path, 'PUT', body, signal),
  delete: <T>(path: string, signal?: AbortSignal) =>
    request<T>(path, 'DELETE', undefined, signal),
};
