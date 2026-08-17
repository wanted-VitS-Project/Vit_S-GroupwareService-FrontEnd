/**
 * 활동 — 심전도 모양 선. (초안의 `Activity` 아이콘)
 * 블록 카드 메뉴 · 활동 기록 팝업 헤더 · 빈 상태가 같은 모양을 쓴다.
 */
export default function ActivityIcon({
  className = 'size-3',
}: {
  className?: string;
}) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
      className={className}
    >
      <path d="M3 12h4l3 8 4-16 3 8h4" />
    </svg>
  );
}
