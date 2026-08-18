/**
 * 검증에 걸린 첫 칸으로 화면을 옮긴다. `focus()` 만으로는 보일 만큼만 스크롤해
 * 그 칸이 화면 끝에 걸치거나 고정 헤더 아래로 들어간다.
 */
export function focusInvalidField(id: string) {
  const field = document.getElementById(id);
  if (!field) return;

  const prefersReducedMotion = window.matchMedia(
    '(prefers-reduced-motion: reduce)',
  ).matches;

  field.scrollIntoView({
    block: 'center',
    behavior: prefersReducedMotion ? 'auto' : 'smooth',
  });

  // 자리는 위에서 옮겼다 — focus 가 한 번 더 튀지 않게 막는다
  field.focus({ preventScroll: true });
}
