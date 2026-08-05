/**
 * 백엔드 enum → 화면 라벨 매핑.
 * 라벨을 컴포넌트에 하드코딩하지 않는다. 키는 백엔드 값과 같아야 한다.
 */

import type { Role } from '@/features/auth/types';

export const ROLE_LABELS: Record<Role, string> = {
  ADMIN: '관리자',
  MASTER: '중간관리자',
  MEMBER: '사원',
};
