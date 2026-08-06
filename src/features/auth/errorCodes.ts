/**
 * 인증 응답 코드 단일 소스. (.ai/API.md)
 * status 는 같은 값이 여러 의미로 쓰여서(400·403) 분기는 항상 code 로 한다.
 */

/**
 * 세션이 없거나 만료됐다 — 어느 API 에서 와도 로그인 화면으로 보내야 한다.
 * ⚠️ 같은 401 이어도 `AUTH_LOGIN_FAILED`(로그인 실패)는 **전역 처리하면 안 된다.**
 *    로그인 화면이 직접 문구를 띄워야 하는데 화면이 전환돼 버린다.
 */
export const UNAUTHENTICATED_CODE = 'AUTH_UNAUTHENTICATED';

export function isUnauthenticatedCode(code?: string) {
  return code === UNAUTHENTICATED_CODE;
}

/** 게이트를 통과하지 않고 다른 API 를 부르면 403 으로 돌아온다 */
export const GATE_CODES = {
  terms: 'AUTH_TERMS_AGREEMENT_REQUIRED',
  password: 'AUTH_PASSWORD_RESET_REQUIRED',
} as const;

/** 게이트가 아니라 권한이 모자란 403 — 다시 불러도 결과가 같다 */
const PERMISSION_CODES: string[] = [
  'ACC_ADMIN_REQUIRED',
  'BUSINESS_CATEGORY_ADMIN_ONLY',
];

/** 권한 부족 403 인지. 도메인마다 코드가 달라 목록으로 둔다 */
export function isPermissionCode(code?: string) {
  return code !== undefined && PERMISSION_CODES.includes(code);
}

const GATES: string[] = Object.values(GATE_CODES);

/**
 * 게이트 미통과 403 인지. (권한 부족 403 과 구분해야 한다)
 * 이 코드가 왔다는 것은 **세션은 살아 있다**는 뜻이기도 하다.
 */
export function isGateCode(code?: string): code is string {
  return code !== undefined && GATES.includes(code);
}

/** 로그인 실패 문구. 없는 코드는 백엔드 message 를 그대로 쓴다. */
export const LOGIN_ERROR_MESSAGES: Record<string, string> = {
  AUTH_INVALID_REQUEST: '아이디와 비밀번호를 모두 입력해주세요.',
  // 사번 존재 여부가 드러나지 않도록 한 문장으로만 안내한다
  AUTH_LOGIN_FAILED: '아이디 또는 비밀번호가 올바르지 않습니다.',
  AUTH_ACCOUNT_INACTIVE:
    '비활성화된 계정입니다. 시스템 관리자에게 문의해주세요.',
  AUTH_TOO_MANY_REQUESTS: '요청이 너무 많습니다. 잠시 후 다시 시도해주세요.',
  AUTH_HASHING_BUSY: '서버가 혼잡합니다. 잠시 후 다시 시도해주세요.',
  // AUTH_ACCOUNT_LOCKED(423) 은 해제 시각이 담긴 백엔드 문구가 더 정확해서 덮지 않는다
};
