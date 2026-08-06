/**
 * 블록 도메인 응답 코드 단일 소스.
 * 분기는 **status 가 아니라 `code`** 로 한다 — 400 하나에 여러 의미가 실린다.
 */

export const BLOCK_CODES = {
  /** `colSpan` 이 1~3 범위 밖 */
  colSpanInvalid: 'BLOCK_COL_SPAN_INVALID',
  /** 배치 목록이 비었거나 다른 스텝의 블록이 섞임 */
  layoutInvalid: 'BLOCK_LAYOUT_INVALID',
  notFound: 'BLOCK_NOT_FOUND',
  /** 스텝 편집 권한 없음 — 전역 403 이 아니라 이 화면에서 안내한다 */
  stepEditDenied: 'STEP_EDIT_DENIED',
} as const;

/**
 * 배치 저장 실패 문구.
 *
 * 백엔드 `message` 를 그대로 쓰면 "다른 스텝의 블록이 섞임" 같은 내부 사정이 그대로 나온다.
 * 사용자가 **다음에 뭘 해야 하는지**가 갈리는 코드만 우리 문구로 덮는다.
 */
export function layoutErrorMessage(code: string | undefined) {
  if (code === BLOCK_CODES.stepEditDenied) {
    return '이 스텝을 편집할 권한이 없어 배치가 저장되지 않았습니다.';
  }
  if (code === BLOCK_CODES.notFound) {
    return '삭제된 블록이 있어 배치를 저장하지 못했습니다. 새로고침해주세요.';
  }
  // 아래 둘은 사용자가 고칠 수 있는 게 아니라 우리 요청이 잘못된 경우다.
  // 백엔드 문구("다른 스텝의 블록이 섞임" 등)를 그대로 보여주면 내부 사정이 새어 나간다
  if (
    code === BLOCK_CODES.layoutInvalid ||
    code === BLOCK_CODES.colSpanInvalid
  ) {
    return '배치를 저장하지 못했습니다. 새로고침 후 다시 시도해주세요.';
  }
  return null;
}
