/**
 * 참여 불가(퇴사 · 이탈)로 결재가 멈춘 상황을 판정한다.
 * 기안자 불가는 스텝 EDITOR 가 재상신하고, 결재자 불가는 기안자가 교체 · 제외한다.
 */

import type { ApprovalDetailLine, ApprovalRevision } from './types';

/** 대행 기안자를 아직 아무도 맡지 않았는지. 참이면 재상신 버튼을 연다 */
export function needsActingDrafter(revision: ApprovalRevision) {
  return revision.drafterUnavailable === true && !revision.actingDrafterId;
}

/**
 * 교체 · 제외 대상 결재선.
 * 이미 처리된 결재선은 이력이라 건드리지 않고 대기 · 진행 중인 사람만 고른다.
 */
export function unavailableLines(lines: ApprovalDetailLine[]) {
  return lines.filter(
    (line) =>
      line.approverUnavailable === true &&
      (line.status === 'ACTIVE' || line.status === 'WAITING'),
  );
}

/**
 * 교체 · 제외를 반영한 결재선 요청 본문을 만든다.
 * 순번에 구멍이 생기지 않도록 order 를 1부터 다시 매긴다.
 */
export function toLinesRequest(
  lines: ApprovalDetailLine[],
  replacements: Map<number, string | null>,
) {
  return {
    lines: lines
      .map((line) => {
        const replaced = replacements.has(line.lineId)
          ? replacements.get(line.lineId)
          : line.approverId;

        return replaced ?? null;
      })
      .filter((approverId): approverId is string => approverId !== null)
      .map((approverId, index) => ({ approverId, order: index + 1 })),
  };
}
