import { ENDPOINTS } from '@/constants/endpoints';
import { api } from '@/lib/api';

import type {
  ChangePasswordRequest,
  CurrentUser,
  LoginRequest,
  LoginResponse,
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
