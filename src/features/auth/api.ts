import { ENDPOINTS } from '@/constants/endpoints';
import { api, putForm } from '@/lib/api';

import type {
  ChangePasswordRequest,
  CurrentUser,
  LoginRequest,
  LoginResponse,
  ProfileImageResponse,
} from './types';

/** 비밀번호 해시 연산 때문에 응답이 1초 내외로 걸리는 것이 정상이다. */
export function login(body: LoginRequest) {
  return api.post<LoginResponse>(ENDPOINTS.auth.login, body);
}

export function logout() {
  return api.post<void>(ENDPOINTS.auth.logout);
}

export function getMe() {
  return api.get<CurrentUser>(ENDPOINTS.auth.me);
}

/** 변경 후에도 세션은 유지된다. 재로그인이 필요 없다. */
export function changePassword(body: ChangePasswordRequest) {
  return api.patch<void>(ENDPOINTS.auth.password, body);
}

/**
 * 약관 동의. 최초 로그인에서만 1회 받는다 (요청 본문 없음).
 * ADMIN 은 대상이 아니다.
 */
export function agreeToTerms() {
  return api.post<void>(ENDPOINTS.auth.termsAgreements);
}

/**
 * 프로필 사진 등록 · 변경. 이미 있으면 덮어쓴다.
 * 파트 이름은 file 이며 Content-Type 은 putForm 이 붙인다.
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

/** 프로필 사진 삭제. 기본 아바타로 돌아가며 사진이 없어도 성공한다. */
export function deleteProfileImage(signal?: AbortSignal) {
  return api.delete<void>(ENDPOINTS.auth.profileImage, signal);
}
