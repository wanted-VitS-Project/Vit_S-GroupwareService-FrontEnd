/**
 * API 경로 단일 소스.
 *
 * 규칙
 *  - 컴포넌트나 features/<도메인>/api.ts 에 경로 문자열을 직접 쓰지 않는다.
 *    (features/<도메인>/api.ts = 도메인별 호출, src/lib/api.ts = 공통 fetch 래퍼)
 *  - 노션 API 명세가 ✅ 확정으로 바뀐 도메인만 여기에 추가한다.
 *  - 경로가 바뀌면 이 파일만 고친다.
 *
 * 추가 예시 (V1 = '/api/v1' 같은 접두사 상수를 함께 두고 쓴다)
 *   payment: {
 *     list: `${V1}/payments`,
 *     detail: (id: number) => `${V1}/payments/${id}`,
 *   },
 */

export const ENDPOINTS = {} as const;
