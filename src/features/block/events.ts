/**
 * 블록 목록을 다시 불러오라고 화면 전체에 알린다.
 *
 * 블록이 **없어지거나 생기는** 변화에만 쓴다. 이름 · 담당자처럼 그 블록 안에서 끝나는
 * 수정은 재조회하지 않고 응답을 곧바로 꽂는다 (`BlockActionsContext`) —
 * 왕복이 끝날 때까지 옛 값이 남거나, 새 배열로 갈리며 배치가 흔들리지 않게.
 *
 * 이슈 도메인의 `issue:changed` 와 같은 방식이다 (`features/issue/events.ts`).
 */
export const BLOCK_CHANGED_EVENT = 'block:changed';

export function notifyBlockChanged() {
  window.dispatchEvent(new Event(BLOCK_CHANGED_EVENT));
}
