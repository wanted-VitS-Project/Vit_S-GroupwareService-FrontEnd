import { ENDPOINTS } from '@/constants/endpoints';
import { api } from '@/lib/api';

import type { CurrentUser, LoginRequest, LoginResponse } from './types';

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
