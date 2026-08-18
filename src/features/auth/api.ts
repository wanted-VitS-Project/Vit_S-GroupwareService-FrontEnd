import { ENDPOINTS } from '@/constants/endpoints';
import { api, putForm } from '@/lib/api';

import type {
  ChangePasswordRequest,
  CurrentUser,
  LoginRequest,
  LoginResponse,
  ProfileImageResponse,
  SessionInfo,
} from './types';

/** 비밀번호 해시(Argon2id) 때문에 응답에 0.3~1.1초 걸리는 것이 정상이다. */
export function login(body: LoginRequest) {
  return api.post<LoginResponse>(ENDPOINTS.auth.login, body);
}

export function logout() {
  return api.post<void>(ENDPOINTS.auth.logout);
}

export function getMe() {
  return api.get<CurrentUser>(ENDPOINTS.auth.me);
}

/** 변경 후에도 세션은 유지된다 — 재로그인이 필요 없다. */
export function changePassword(body: ChangePasswordRequest) {
  return api.patch<void>(ENDPOINTS.auth.password, body);
}

/**
 * 이용약관 · 개인정보처리방침 동의 (1회성, 요청 본문 없음).
 * 최초 로그인에서만 받고 동의 후 비밀번호 변경으로 넘어간다.
 * 재설정 후 로그인은 다시 받지 않으며 ADMIN 은 대상이 아니다.
 */
export function agreeToTerms() {
  return api.post<void>(ENDPOINTS.auth.termsAgreements);
}

/**
 * 세션 남은 시간 조회 — **부르는 순간 세션도 함께 연장된다.**
 *
 * ⚠️ 주기 조회(폴링) 금지. 호출이 곧 연장이라 4시간 유휴 만료 정책이 무력화된다.
 *    부르는 자리는 두 곳뿐이다 — 화면 진입 시 **최초 시드 1회**, 그리고 **연장 버튼**.
 *    그 사이의 남은 시간은 `SessionTimer` 가 로컬로 센다.
 *
 * ℹ️ 약관 동의 · 초기 비밀번호 변경 게이트의 **예외 경로**다 — 두 게이트 화면에서도 403 이 아니다.
 */
export function getSession(signal?: AbortSignal) {
  return api.get<SessionInfo>(ENDPOINTS.auth.session, signal);
}

/**
 * 프로필 사진 등록 · 변경. 이미 있으면 덮어쓴다 (멱등).
 *
 * ⚠️ 파트 이름은 `file` 이다. `Content-Type` 을 직접 넣지 않는다 — `putForm` 참고.
 */
export function uploadProfileImage(file: File, signal?: AbortSignal) {
  const form = new FormData();
  form.append('file', file);

  return putForm<ProfileImageResponse>(
    ENDPOINTS.auth.profileImage,
    form,
    signal,
  );
}

/** 프로필 사진 삭제 — 기본(이니셜) 아바타로 돌아간다. 사진이 없어도 성공한다 (멱등). */
export function deleteProfileImage(signal?: AbortSignal) {
  return api.delete<void>(ENDPOINTS.auth.profileImage, signal);
}
