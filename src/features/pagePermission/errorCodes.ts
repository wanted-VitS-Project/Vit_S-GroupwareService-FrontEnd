/** 페이지 권한 응답 코드 단일 소스 */

export const PAGE_CODES = {
  /** 400 — permissions 가 비었거나 형식이 틀림 */
  invalidRequest: 'PAGE_INVALID_REQUEST',
  /** 400 — VIEWER · EDITOR 가 아닌 등급 */
  invalidPermission: 'PAGE_INVALID_PERMISSION',
  /** 404 — 카탈로그에 없는 pageCode */
  notFound: 'PAGE_NOT_FOUND',
  /** 404 — 부여 기록이 없어 회수할 것이 없음 */
  permissionNotFound: 'PAGE_PERMISSION_NOT_FOUND',
} as const;
