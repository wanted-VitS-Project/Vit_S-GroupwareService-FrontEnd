import type { Role } from '@/features/auth/types';

/**
 * 프로젝트 화면의 권한 판정 단일 소스.
 *
 * 화면마다 조건을 직접 적으면 규칙이 하나 늘 때 어디를 고쳐야 하는지 알 수 없다 —
 * 판정은 전부 여기를 거친다.
 */

/**
 * **참여자를 추가할 수 있는지.**
 *
 * - 프로젝트 `EDITOR` → 가능 (`VIEWER` 에게만 감춘다)
 * - 전사 `ADMIN` → **프로젝트 권한과 무관하게** 언제나 가능 (2026-08-16 · 사용자 요청)
 *
 * ℹ️ 한때 "소유자만" 으로 잡았다가 되돌린 규칙이다 (2026-08-16). 소유자(`createdBy`)는
 *    **생성 응답에만** 있고 상세(6) · 참여자 목록(45)에는 없어 판정할 수도 없었다 —
 *    다시 소유자 기준으로 갈 일이 생기면 백엔드에 그 필드부터 요청해야 한다.
 */
export function canManageMembers({
  role,
  canEdit,
}: {
  /** 로그인 사용자의 전사 역할 */
  role: Role;
  /** 이 프로젝트의 편집 권한 (`myPermission === 'EDITOR'`) */
  canEdit: boolean;
}) {
  return role === 'ADMIN' || canEdit;
}
