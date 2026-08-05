import type { BlockTypeCode } from './types';

/** 블록 유형 아이콘. 아이콘 라이브러리 도입 전까지 인라인 SVG 로 둔다. */
const PATHS: Record<BlockTypeCode, React.ReactNode> = {
  CHECKLIST: (
    <>
      <path d="M3 5.5A2.5 2.5 0 0 1 5.5 3h9A2.5 2.5 0 0 1 17 5.5v13A2.5 2.5 0 0 1 14.5 21h-9A2.5 2.5 0 0 1 3 18.5z" />
      <path d="m9 11 2.5 2.5L21 4" />
    </>
  ),
  TEXT: (
    <>
      <path d="M5 3h14a1 1 0 0 1 1 1v16a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1V4a1 1 0 0 1 1-1" />
      <path d="M8 9h8M8 13h8M8 17h5" />
    </>
  ),
  IMAGE: (
    <>
      <rect x="3" y="3" width="18" height="18" rx="2" />
      <circle cx="9" cy="9" r="1.5" />
      <path d="m6 18 5-5 8 8" />
    </>
  ),
  FILE: (
    <>
      <path d="M3 15v4a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-4" />
      <path d="M12 3v11" />
      <path d="m8 7 4-4 4 4" />
    </>
  ),
  APPROVAL: (
    <>
      <path d="M5 21h14" />
      <path d="M4 17h16l-1.5-3.5a2 2 0 0 0-1.8-1.2H7.3a2 2 0 0 0-1.8 1.2z" />
      <path d="M9 12V6a3 3 0 0 1 6 0v6" />
    </>
  ),
  PAYMENT_CONFIRM: (
    <>
      <rect x="2" y="5" width="20" height="14" rx="2" />
      <path d="M2 10h20" />
      <path d="m9 15.5 1.8 1.8L14.5 13" />
    </>
  ),
  TAX_INVOICE_VIEW: (
    <>
      <path d="M14 3H7a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h6" />
      <path d="M14 3v5h5V8z" />
      <path d="M8 9h4M8 13h3" />
      <circle cx="17" cy="16" r="3" />
      <path d="m19.5 18.5 2 2" />
    </>
  ),
  BID_NOTICE: (
    <>
      <path d="M3 21h8" />
      <path d="m4 15 6-6 4 4-6 6z" />
      <path d="m13 3 8 8" />
      <path d="m10.5 5.5 3-3 5 5-3 3z" />
    </>
  ),
  AI: (
    <>
      <rect x="6" y="6" width="12" height="12" rx="2" />
      <path d="M10 2v3M14 2v3M10 19v3M14 19v3M2 10h3M2 14h3M19 10h3M19 14h3" />
    </>
  ),
};

export default function BlockTypeIcon({ code }: { code: BlockTypeCode }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
      className="size-4 shrink-0"
    >
      {PATHS[code]}
    </svg>
  );
}
