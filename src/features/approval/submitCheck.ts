import { APPROVAL_CODES, SUBMIT_BLOCKER_LABELS } from './errorCodes';
import type { ApprovalRevision } from './types';

/**
 * 상신을 막는 첫 번째 사유를 찾는다. 없으면 `null` — 상신할 수 있다. (AP-022~024)
 *
 * 서버가 상신 시점에 같은 항목을 전부 재검증하므로 **이 검증은 왕복을 줄이는 용도**다.
 * 그래서 서버와 같은 코드를 돌려준다 — 화면은 사전 차단이든 400 응답이든 같은 문구를 쓴다.
 *
 * ⚠️ 프론트가 판정할 수 없는 두 가지는 여기서 다루지 않는다.
 * - AP-025 결재자가 프로젝트 member 인지 — 참여자 목록 API 가 없다
 * - AP-026 마지막 결재자가 MASTER 인지 — `lines[].approverRole` 이 아직 없다
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

  // 순서는 1부터 빠짐없이 이어져야 한다 — 중복이든 빈 번호든 정렬하면 어긋난다
  const orders = revision.lines.map((line) => line.order).sort((a, b) => a - b);
  if (orders.some((order, index) => order !== index + 1)) {
    return APPROVAL_CODES.lineOrderInvalid;
  }

  return null;
}

/** 검증 코드를 화면 문구로. 모르는 코드면 `null` 이라 호출 측이 백엔드 문구를 쓴다 */
export function submitBlockerLabel(code: string | undefined) {
  return code ? (SUBMIT_BLOCKER_LABELS[code] ?? null) : null;
}
