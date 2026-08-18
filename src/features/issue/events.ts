// 이슈가 바뀌었음을 화면 전체에 알린다. 스텝·프로젝트 진척률이 이슈 개수·상태에서 나오므로
// 보드에서 바뀌면 사이드바도 다시 읽어야 하는데, 둘은 부모-자식이 아니라 전역 이벤트로 잇는다.
// 블록 도메인의 block:changed 와 같은 방식이다.
export const ISSUE_CHANGED_EVENT = 'issue:changed';

// 서버에서 부르면 아무 일도 하지 않는다 — components/Toast 의 notifyToast 와 같은 방침.
export function notifyIssueChanged() {
  if (typeof window === 'undefined') return;

  window.dispatchEvent(new Event(ISSUE_CHANGED_EVENT));
}
