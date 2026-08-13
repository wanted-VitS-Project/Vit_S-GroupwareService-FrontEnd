export type Role = 'ADMIN' | 'MASTER' | 'MEMBER';

export interface LoginRequest {
  /** 사번 (화면에는 '아이디'로 노출) — 예: EMP001 */
  userId: string;
  password: string;
}

/** REQUIRED 면 약관 동의를 먼저 받아야 한다. ADMIN 은 항상 AGREED */
export type TermsStatus = 'AGREED' | 'REQUIRED';

/** RESET_REQUIRED 면 비밀번호를 먼저 변경해야 한다 */
export type PasswordStatus = 'NORMAL' | 'RESET_REQUIRED';

export interface LoginResponse {
  userId: string;
  name: string;
  role: Role;
  /**
   * 약관 · 비밀번호는 서로 독립된 게이트다.
   * 관리자 재설정 계정은 AGREED + RESET_REQUIRED 로 온다.
   */
  termsStatus: TermsStatus;
  passwordStatus: PasswordStatus;
  /** 소속이 없는 계정이 있어 부서 · 직급은 null 로 올 수 있다 */
  departmentName: string | null;
  /** 상위 조직까지 포함한 경로 — 예: '기술본부 / 개발팀' */
  departmentPath: string | null;
  jobPositionName: string | null;
}

export interface ChangePasswordRequest {
  /** 최초 변경(passwordStatus=RESET_REQUIRED)이면 생략한다 */
  currentPassword?: string;
  newPassword: string;
  newPasswordConfirm: string;
}

/**
 * GET /auth/me — 로그인 응답에 마이페이지용 필드가 더 붙는다.
 * 명세상 전부 nullable 이라 화면에서 빈 값을 처리한다.
 */
export interface CurrentUser extends LoginResponse {
  email: string | null;
  phone: string | null;
  /** yyyy-MM-dd */
  hiredAt: string | null;
  /** yyyy-MM-dd HH:mm:ss */
  lastLoginAt: string | null;
  /**
   * 아바타 서빙 경로 (`/employees/{userId}/profile-image`). 사진이 없으면 `null` 이다.
   *
   * ⚠️ presigned URL 이 **아니다** — 만료되지 않는 우리 경로이고 서명은 서빙 API 가
   *    매 요청 안에서 처리한다. 프론트에 캐싱 · 재발급 로직을 두지 않는다.
   */
  profileImageUrl: string | null;
}

/** 프로필 사진 등록 · 변경 응답 — 교체돼도 경로는 그대로다 */
export interface ProfileImageResponse {
  profileImageUrl: string;
}

/**
 * 업로드 제약. 서버가 다시 검증하지만 5MB 를 올려놓고 거절당하는 왕복을 막으려
 * 화면에서 먼저 거른다.
 *
 * ⚠️ `webp` 는 제외다 — JDK 내장 디코더가 없어 서버가 픽셀 수 상한을 검사할 수 없다.
 */
export const PROFILE_IMAGE_EXTENSIONS: readonly string[] = [
  'jpg',
  'jpeg',
  'png',
  'gif',
];
export const PROFILE_IMAGE_ACCEPT = '.jpg,.jpeg,.png,.gif';
export const PROFILE_IMAGE_MAX_BYTES = 5 * 1024 * 1024;
