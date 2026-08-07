/**
 * 이슈가 바뀌었음을 화면 전체에 알린다.
 *
 * 스텝 진척률(`ProjectStep.doneIssueCount` 등)과 프로젝트 전체 진척률은
 * 이슈 개수 · 상태에서 나오므로, 보드에서 바뀌면 사이드바도 다시 읽어야 한다.
 * 보드와 사이드바는 부모-자식이 아니라(레이아웃이 따로 그린다) 전역 이벤트로 잇는다.
 *
 * 블록 도메인의 `block:changed` 와 같은 방식이다.
 */
export const ISSUE_CHANGED_EVENT = 'issue:changed';

export function notifyIssueChanged() {
  window.dispatchEvent(new Event(ISSUE_CHANGED_EVENT));
}
