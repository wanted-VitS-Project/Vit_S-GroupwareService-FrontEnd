/**
 * 인증 응답 코드 단일 소스 (.ai/API.md).
 * 같은 status 가 여러 의미로 쓰여 분기는 항상 code 로 한다.
 */

/**
 * 세션 없음 · 만료. 어느 API 에서 와도 로그인 화면으로 보낸다.
 * 같은 401 이라도 로그인 실패는 전역 처리하지 않는다.
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

/**
 * 권한 부족 403 코드. 화면 자체를 볼 수 없는 경우만 넣는다.
 * 저장만 막히는 편집 권한 부족은 넣지 않는다.
 */
const PERMISSION_CODES: string[] = [
  'ACC_ADMIN_REQUIRED',
  'BUSINESS_CATEGORY_ADMIN_ONLY',
  // 재무 화면 접근 권한 없음
  'FINANCE_ACCESS_DENIED',
];

/** 권한 부족 403 인지. 도메인마다 코드가 달라 목록으로 둔다 */
export function isPermissionCode(code?: string) {
  return code !== undefined && PERMISSION_CODES.includes(code);
}

const GATES: string[] = Object.values(GATE_CODES);

/**
 * 게이트 미통과 403 인지. 권한 부족 403 과 구분한다.
 * 이 코드가 왔다면 세션은 살아 있다는 뜻이다.
 */
export function isGateCode(code?: string): code is string {
  return code !== undefined && GATES.includes(code);
}

/**
 * 프로필 사진 응답 코드. 데이터가 사원 속성이라 접두어가 EMP_ 다.
 * 404 는 img 서빙에서만 나므로 onError 로 기본 아바타 처리한다.
 */
export const PROFILE_IMAGE_ERROR_MESSAGES: Record<string, string> = {
  EMP_PROFILE_IMAGE_REQUIRED: '이미지 파일을 선택해주세요.',
  // 형식 · 위장 · 손상 · 픽셀 과다가 모두 이 코드로 온다
  EMP_PROFILE_IMAGE_TYPE_INVALID:
    'jpg · jpeg · png · gif 형식의 이미지만 올릴 수 있어요.',
  EMP_PROFILE_IMAGE_SIZE_EXCEEDED: '5MB 이하 이미지만 올릴 수 있어요.',
};

/** 로그인 실패 문구. 없는 코드는 백엔드 message 를 그대로 쓴다 */
export const LOGIN_ERROR_MESSAGES: Record<string, string> = {
  AUTH_INVALID_REQUEST: '아이디와 비밀번호를 모두 입력해주세요.',
  // 사번 존재 여부가 드러나지 않도록 한 문장으로만 안내한다
  AUTH_LOGIN_FAILED: '아이디 또는 비밀번호가 올바르지 않습니다.',
  AUTH_ACCOUNT_INACTIVE:
    '비활성화된 계정입니다. 시스템 관리자에게 문의해주세요.',
  AUTH_TOO_MANY_REQUESTS: '요청이 너무 많습니다. 잠시 후 다시 시도해주세요.',
  AUTH_HASHING_BUSY: '서버가 혼잡합니다. 잠시 후 다시 시도해주세요.',
  // 계정 잠금은 해제 시각이 담긴 백엔드 문구를 그대로 쓴다
};
