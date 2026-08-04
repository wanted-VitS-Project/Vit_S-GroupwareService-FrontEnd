import type { Role } from '@/constants/menu';

export interface CurrentUser {
  name: string;
  rank: string;
  team: string;
  role: Role;
}

/**
 * 로그인 사용자.
 * TODO: GET /api/v1/auth/me 연동. 지금은 화면 확인용 임시 값이다.
 *       역할별 사이드바를 보려면 아래 role 을 ADMIN · MASTER · MEMBER 로 바꾼다.
 */
const MOCK_USER: CurrentUser = {
  name: '김민수',
  rank: '대리',
  team: '마케팅부 웹디자인팀',
  role: 'MASTER',
};

export function useCurrentUser() {
  return MOCK_USER;
}
