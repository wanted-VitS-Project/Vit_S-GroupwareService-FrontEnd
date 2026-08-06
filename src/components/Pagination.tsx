'use client';

interface PaginationProps {
  /** 0-based — 백엔드 페이징이 0부터 센다 */
  page: number;
  totalPages: number;
  totalElements: number;
  onChange: (page: number) => void;
}

/** 목록 하단 페이지 이동. 페이지가 1개뿐이면 화살표만 비활성으로 남는다 */
export default function Pagination({
  page,
  totalPages,
  totalElements,
  onChange,
}: PaginationProps) {
  const lastPage = totalPages || 1;
  /** 사람이 읽는 번호는 1부터 센다 */
  const currentPage = Math.min(page + 1, lastPage);

  return (
    <div className="flex items-center justify-between gap-4 border-t border-[#1C1F2A]/10 px-5 py-3">
      <p className="text-[11px] text-[#6C7389]">
        전체 {totalElements.toLocaleString('ko-KR')}명
      </p>

      <nav aria-label="페이지 이동" className="flex items-center gap-2">
        <PageButton
          label="이전 페이지"
          disabled={page <= 0}
          onClick={() => onChange(page - 1)}
        >
          ‹
        </PageButton>
        {/* 숫자만 있으면 무엇을 세는지 알 수 없어 대체 문구를 따로 읽힌다 */}
        <span
          aria-live="polite"
          aria-label={`${lastPage}페이지 중 ${currentPage}페이지`}
          className="text-[11px] text-[#6C7389]"
        >
          {currentPage} / {lastPage}
        </span>
        <PageButton
          label="다음 페이지"
          disabled={page >= totalPages - 1}
          onClick={() => onChange(page + 1)}
        >
          ›
        </PageButton>
      </nav>
    </div>
  );
}

function PageButton({
  label,
  disabled,
  onClick,
  children,
}: {
  label: string;
  disabled: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      aria-label={label}
      className="cursor-pointer rounded border border-[#1C1F2A]/10 px-2 py-1 text-xs text-[#6C7389] hover:bg-[#ECEEF4] hover:text-[#1C1F2A] disabled:cursor-not-allowed disabled:text-[#C7CCD9] disabled:hover:bg-transparent"
    >
      {children}
    </button>
  );
}
