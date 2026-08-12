/**
 * 이슈 도메인 응답 코드 단일 소스.
 * 분기는 **status 가 아니라 `code`** 로 한다 — 400 하나에 여러 의미가 실린다.
 */

import { ApiError } from '@/lib/api';

/**
 * ⚠️ 이슈 도메인 코드는 접두어가 **`ISS_`** 다.
 *    예외가 하나 있다 — 낙관적 락 충돌만 팀 표준(`{도메인}_VERSION_CONFLICT`)을 따라 **`ISSUE_`** 다.
 *    (백엔드 `.ai/api/issue.md` · `.ai/docs/global/CONCURRENCY.md` §5-3)
 */
export const ISSUE_CODES = {
  /** 409 — 그 사이 남이 먼저 저장했다 (2026-08-12 낙관적 락 신설) */
  versionConflict: 'ISSUE_VERSION_CONFLICT',
  notFound: 'ISS_NOT_FOUND',
  /** 400 — `version` 누락 · 1 미만. 수정할 필드 없음 등 다른 형식 오류와 코드를 공유한다 */
  invalidRequest: 'ISS_INVALID_REQUEST',
} as const;

/**
 * 낙관적 락 충돌인지.
 *
 * ⚠️ `code` 가 비어 있어도 **409 면 충돌로 본다** — 이슈 도메인의 다른 409 는 없고,
 *    코드 하나 못 읽었다고 저장을 조용히 버리면 사용자는 저장된 줄 안다.
 *    (블록 도메인이 `status === 409` 로 판정하는 것과 같은 이유다)
 */
export function isIssueVersionConflict(error: unknown) {
  if (!(error instanceof ApiError)) return false;

  return error.code === ISSUE_CODES.versionConflict || error.status === 409;
}

/** 자동 병합에 성공했을 때 — 사용자가 모르고 지나가면 안 된다 */
export const ISSUE_MERGED_MESSAGE =
  '다른 사람이 함께 수정해, 겹치지 않는 내용을 합쳐 저장했습니다.';
