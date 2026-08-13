/**
 * 참여 불가(퇴사 · 프로젝트 이탈) 때문에 결재가 멈춘 상황을 판정한다.
 *
 * 두 가지가 있고 **처리 주체와 방법이 다르다.**
 *
 * | 상황            | 조건                                             | 처리                                  |
 * | --------------- | ------------------------------------------------ | ------------------------------------- |
 * | 기안자 불가     | `drafterUnavailable && actingDrafterId === null`  | 스텝 `EDITOR` 가 **재상신**            |
 * | 결재자 불가     | `requiresApproverReplacement`                     | 기안자가 **교체 · 제외**               |
 *
 * ⚠️ 판정에 쓰는 필드들은 **응답에서의 위치를 아직 실측하지 못했다** (2026-08-13).
 *    전부 선택 필드라 값이 안 오면 **아무 배너도 뜨지 않고** 기존 화면 그대로다.
 *    위치가 확인되면 `types.ts` 의 필드 선언과 이 파일만 고치면 된다 —
 *    화면(`ApprovalBlock` · 모달)은 여기 함수만 보므로 손대지 않는다.
 */

import type { ApprovalDetailLine, ApprovalRevision } from './types';

/**
 * 대행 기안자를 아직 아무도 맡지 않았는지.
 * 참이면 재상신 버튼을 열고, 거짓이면 이미 누가 맡았거나 기안자가 멀쩡한 것이다.
 */
export function needsActingDrafter(revision: ApprovalRevision) {
  return revision.drafterUnavailable === true && !revision.actingDrafterId;
}

/**
 * 교체 · 제외 대상 결재선.
 *
 * **아직 처리 순서가 오지 않았거나 지금 차례인 사람만** 고른다 —
 * 이미 승인 · 반려한 결재선은 지나간 이력이라 건드리면 결재가 왜곡된다.
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
 *
 * ⚠️ **`order` 를 1부터 다시 매긴다.** 제외로 빠진 자리를 그대로 두면 순번에 구멍이 생겨
 *    서버가 다음 결재자를 못 고른다. 남은 순서는 그대로 유지된다.
 *
 * @param lines 현재 결재선 (표시 순서대로)
 * @param replacements `lineId` → 새 결재자 사번. `null` 이면 **결재선에서 제외**한다
 */
export function toLinesRequest(
  lines: ApprovalDetailLine[],
  replacements: Map<number, string | null>,
) {
  return {
    lines: lines
      .map((line) => {
        // 손대지 않은 결재선은 원래 결재자 그대로
        const replaced = replacements.has(line.lineId)
          ? replacements.get(line.lineId)
          : line.approverId;

        return replaced ?? null;
      })
      .filter((approverId): approverId is string => approverId !== null)
      .map((approverId, index) => ({ approverId, order: index + 1 })),
  };
}
