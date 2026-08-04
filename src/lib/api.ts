/**
 * fetch 래퍼.
 * 공통 헤더 · 인증 · 에러(400/403/409) 처리를 여기서 한 번만 한다.
 * 컴포넌트에서 fetch 를 직접 호출하지 않는다.
 *
 * 작성 예시
 *   export const api = {
 *     get:  <T>(path: string) => request<T>(path, { method: 'GET' }),
 *     post: <T>(path: string, body?: unknown) => request<T>(path, { method: 'POST', body }),
 *   };
 */

export {};
