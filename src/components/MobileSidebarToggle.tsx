'use client';

import { mobileSidebarClasses } from '@/components/mobileSidebarClasses';

/**
 * 좁은 화면(1024px 미만)에서 사이드바를 여닫는 **화면 고정 버튼**과 뒤를 덮는 판.
 *
 * 공통 사이드바(`Sidebar`)와 프로젝트 사이드바(`ProjectSidebar`)가 함께 쓴다 —
 * 둘은 화면이 갈려 동시에 뜨지 않으므로 버튼이 겹칠 일은 없다.
 * 한쪽에만 두면 다른 화면에서 사이드바를 여는 길이 사라진다.
 *
 * ⚠️ 버튼은 사이드바 **바깥**에 두어야 한다 — 안에 두면 닫혔을 때(`hidden`)
 *    버튼까지 함께 사라져 다시 열 수 없다. 그래서 이 컴포넌트가 판과 형제로 선다.
 */
export default function MobileSidebarToggle({
  isOpen,
  onToggle,
  onClose,
  /** 보조기술이 읽을 이름 — 화면마다 여는 것이 다르다 (`메뉴` · `프로젝트 메뉴`) */
  label,
}: {
  isOpen: boolean;
  onToggle: () => void;
  onClose: () => void;
  label: string;
}) {
  return (
    <>
      <button
        type="button"
        onClick={onToggle}
        aria-expanded={isOpen}
        aria-label={isOpen ? `${label} 닫기` : `${label} 열기`}
        className={mobileSidebarClasses.toggleButton}
      >
        {isOpen ? <CloseIcon /> : <MenuBarsIcon />}
      </button>

      {/* 뒤를 덮는 판 — 누르면 닫힌다. 넓은 화면에는 없다 */}
      {isOpen && (
        <button
          type="button"
          aria-label={`${label} 닫기`}
          onClick={onClose}
          className={mobileSidebarClasses.backdrop}
        />
      )}
    </>
  );
}

/** 메뉴 열기 */
function MenuBarsIcon() {
  return (
    <svg
      aria-hidden
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      className="size-5"
    >
      <path d="M4 7h16M4 12h16M4 17h16" />
    </svg>
  );
}

/** 메뉴 닫기 — 열려 있을 때 같은 자리에서 모양만 바뀐다 */
function CloseIcon() {
  return (
    <svg
      aria-hidden
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      className="size-5"
    >
      <path d="M6 6l12 12M18 6L6 18" />
    </svg>
  );
}
