/** 비밀번호 보기 토글 아이콘. 아이콘 라이브러리 도입 전까지 인라인 SVG 로 둔다. */
function EyeIcon({ off, small }: { off?: boolean; small?: boolean }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.6"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
      className={small ? 'size-4' : 'size-5'}
    >
      <path d="M2 12s3.6-6 10-6 10 6 10 6-3.6 6-10 6-10-6-10-6Z" />
      <circle cx="12" cy="12" r="3" />
      {off && <path d="m4 4 16 16" />}
    </svg>
  );
}

interface PasswordVisibilityToggleProps {
  isVisible: boolean;
  onToggle: () => void;
  /** 입력 크기에 맞춘 작은 아이콘 (모달 폼) */
  small?: boolean;
  /** 가로 위치만 감싸는 쪽에서 정한다 — 예: 'right-0' */
  className?: string;
}

/**
 * 비밀번호 입력 안에 겹쳐 놓는 보기/숨기기 버튼.
 * `relative` 인 부모 안에서 세로 중앙에 붙는다.
 */
export default function PasswordVisibilityToggle({
  isVisible,
  onToggle,
  small,
  className = '',
}: PasswordVisibilityToggleProps) {
  return (
    <button
      type="button"
      onClick={onToggle}
      aria-label={isVisible ? '비밀번호 숨기기' : '비밀번호 보기'}
      aria-pressed={isVisible}
      className={`absolute top-1/2 -translate-y-1/2 cursor-pointer rounded-button-sm p-1 text-text-muted transition-colors hover:bg-bg-hover hover:text-text-primary ${className}`}
    >
      <EyeIcon off={isVisible} small={small} />
    </button>
  );
}
