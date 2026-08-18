import { APPROVAL_CODES, SUBMIT_BLOCKER_LABELS } from './errorCodes';
import type { ApprovalRevision } from './types';

/**
 * 상신을 막는 첫 번째 사유를 찾는다. 없으면 null 이다.
 * 서버가 다시 검증하므로 왕복을 줄이는 용도이며 같은 코드를 돌려준다.
 */
export function findSubmitBlocker(revision: ApprovalRevision): string | null {
  if (!revision.title?.trim() || !revision.content?.trim()) {
    return APPROVAL_CODES.contentRequired;
  }
  if (revision.documents.length === 0) {
    return APPROVAL_CODES.documentRequired;
  }
  if (revision.lines.length === 0) {
    return APPROVAL_CODES.lineEmpty;
  }

  // 순서는 1부터 빠짐없이 이어져야 한다
  const orders = revision.lines.map((line) => line.order).sort((a, b) => a - b);
  if (orders.some((order, index) => order !== index + 1)) {
    return APPROVAL_CODES.lineOrderInvalid;
  }

  return null;
}

/** 검증 코드를 화면 문구로 바꾼다. 모르는 코드면 null 이다 */
export function submitBlockerLabel(code: string | undefined) {
  return code ? (SUBMIT_BLOCKER_LABELS[code] ?? null) : null;
}
