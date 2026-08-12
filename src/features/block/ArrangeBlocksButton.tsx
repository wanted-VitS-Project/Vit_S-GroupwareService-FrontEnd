'use client';

/**
 * 스텝 화면 헤더의 `배치 편집` 버튼 — `Block 추가` 왼쪽에 선다.
 *
 * 평소에는 블록을 끌 수 없다. 이 버튼으로 편집 모드에 들어간 동안에만
 * 드래그 핸들이 살아나고, 끝낼 때 바뀐 게 있으면 저장 여부를 묻는다.
 */
export default function ArrangeBlocksButton({
  isArranging,
  isDisabled = false,
  onToggle,
}: {
  isArranging: boolean;
  /** 목록을 아직 못 불러왔을 때 */
  isDisabled?: boolean;
  onToggle: () => void;
}) {
  return (
    <button
      type="button"
      aria-pressed={isArranging}
      disabled={isDisabled}
      onClick={onToggle}
      className={`flex shrink-0 cursor-pointer items-center gap-1.5 rounded-lg border px-3 py-1.5 text-detail font-semibold disabled:cursor-not-allowed disabled:opacity-50 ${
        isArranging
          ? 'border-border-primary bg-blue-bg-soft text-text-primary-blue'
          : 'border-border-default bg-bg-card text-text-primary hover:bg-bg-hover'
      }`}
    >
      {isArranging ? <CheckIcon /> : <ArrangeIcon />}
      {isArranging ? '배치 완료' : '배치 편집'}
    </button>
  );
}

/** 칸이 나뉜 판 — 자리를 바꾸는 화면이라는 뜻 */
function ArrangeIcon() {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinejoin="round"
      aria-hidden
      className="size-3 shrink-0"
    >
      <rect x="3" y="3" width="7" height="7" rx="1.5" />
      <rect x="14" y="3" width="7" height="7" rx="1.5" />
      <rect x="3" y="14" width="7" height="7" rx="1.5" />
      <rect x="14" y="14" width="7" height="7" rx="1.5" />
    </svg>
  );
}

function CheckIcon() {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2.5"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
      className="size-3 shrink-0"
    >
      <path d="m5 13 4.5 4.5L19 7" />
    </svg>
  );
}
