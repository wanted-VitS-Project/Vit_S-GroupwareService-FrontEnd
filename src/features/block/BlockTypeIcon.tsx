import type { BlockTypeCode } from './types';

/** 블록 유형 아이콘. 아이콘 라이브러리 도입 전까지 인라인 SVG 로 둔다. */
const PATHS: Record<BlockTypeCode, React.ReactNode> = {
  /** 정사각 판 + 체크. 예전엔 세로로 긴 판에 체크가 판 밖(x=21)까지 삐져나가 찌그러져 보였다 */
  CHECKLIST: (
    <>
      <rect x="3" y="3" width="18" height="18" rx="3" />
      <path d="m8 12 2.8 2.8L16.5 9" />
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
  /**
   * 문서 업로드 — 받침 + 위로 향한 화살표.
   * 화살촉이 너무 넓고 얕아(가로 8 · 세로 4) 화살대에서 떨어져 나온 것처럼 보였다.
   * 좁고 가파르게(가로 7 · 세로 4) 줄이고 화살대도 짧게 잡아 한 덩어리로 붙인다.
   */
  FILE: (
    <>
      <path d="M3 15v4a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-4" />
      <path d="M12 4v9.5" />
      <path d="m8.5 8 3.5-4 3.5 4" />
    </>
  ),
  APPROVAL: (
    <>
      <path d="M5 21h14" />
      <path d="M4 17h16l-1.5-3.5a2 2 0 0 0-1.8-1.2H7.3a2 2 0 0 0-1.8 1.2z" />
      <path d="M9 12V6a3 3 0 0 1 6 0v6" />
    </>
  ),
  /** 정산 — 회차별 금액을 표로 늘어놓는 블록이라 계산서 모양으로 둔다 */
  SETTLEMENT: (
    <>
      <rect x="4" y="3" width="16" height="18" rx="2" />
      <path d="M8 7h8M8 11h8" />
      <path d="M8 15h4" />
      <path d="M16 15v4" />
    </>
  ),
  /**
   * 확성기 — '공고'다.
   * 예전엔 의사봉(gavel)이었는데 16px 에서 머리 · 자루 · 받침이 뭉쳐 뭔지 알 수 없었다.
   */
  BID_NOTICE: (
    <>
      <path d="M3 11.5 20 6v12L3 12.5z" />
      <path d="M11 16.2a3 3 0 1 1-5.6-1.6" />
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
      // 탭바 · 공통 메뉴 아이콘과 같은 굵기다 — 나란히 놓였을 때 한쪽만 두꺼워 보이면 안 된다
      strokeWidth="1.6"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
      className="size-4 shrink-0"
    >
      {PATHS[code]}
    </svg>
  );
}
