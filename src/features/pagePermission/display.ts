/** 페이지 권한 화면의 표시 문구 · 배지 색 단일 소스. */

import type { PageAccessSource, PagePermission } from './types';

export const PERMISSION_LABEL: Record<PagePermission, string> = {
  NONE: '접근 불가',
  VIEWER: '뷰어',
  EDITOR: '편집',
};

/** `globals.css` 의 `.badge-*` 를 그대로 쓴다 */
export const PERMISSION_BADGE: Record<PagePermission, string> = {
  NONE: 'badge-gray',
  VIEWER: 'badge-blue',
  EDITOR: 'badge-purple',
};

export const SOURCE_LABEL: Record<PageAccessSource, string> = {
  GRANTED: '명시 부여',
  GLOBAL_ROLE: '전역 권한',
  ADMIN_ONLY: '관리자 전용',
  DEFAULT: '기본 제공',
};

/**
 * 왜 회수할 수 없는지 — 버튼을 그냥 없애면 "왜 안 되지" 로 남는다.
 * `GRANTED` 만 회수 대상이라 나머지는 이유를 문장으로 준다.
 */
export const NOT_REVOCABLE_REASON: Record<PageAccessSource, string> = {
  GRANTED: '',
  GLOBAL_ROLE: '전역 권한으로 열람 중이라 회수할 수 없습니다.',
  ADMIN_ONLY: '관리자 계정이라 회수할 수 없습니다.',
  DEFAULT: '기본 제공 페이지라 회수할 수 없습니다.',
};

/** 부여 · 회수 결과를 한 줄로 요약한다 */
export function grantSummary(result: {
  grantedCount: number;
  updatedCount: number;
  unchangedCount: number;
}) {
  const parts = [
    result.grantedCount > 0 ? `${result.grantedCount}명 부여` : '',
    result.updatedCount > 0 ? `${result.updatedCount}명 등급 변경` : '',
    result.unchangedCount > 0 ? `${result.unchangedCount}명 변화 없음` : '',
  ].filter(Boolean);

  return parts.length > 0 ? parts.join(' · ') : '변경된 권한이 없습니다.';
}
