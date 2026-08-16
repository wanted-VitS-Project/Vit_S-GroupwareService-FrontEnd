'use client';

import { useEffect, useRef, type RefObject } from 'react';

import { mobileSidebarClasses } from '@/components/mobileSidebarClasses';
import { useNarrowScreen } from '@/components/useNarrowScreen';

/** 초점을 받을 수 있는 것들 — 판 안에서 Tab 이 돌 범위를 정한다 */
const FOCUSABLE =
  'a[href],button:not([disabled]),input:not([disabled]),select:not([disabled]),textarea:not([disabled]),[tabindex]:not([tabindex="-1"])';

function focusablesIn(panel: HTMLElement) {
  return [...panel.querySelectorAll<HTMLElement>(FOCUSABLE)].filter(
    // `display:none` 인 것은 못 받는다 (닫힌 판 · 접힌 영역)
    (element) =>
      element.offsetParent !== null || element === document.activeElement,
  );
}

/**
 * 좁은 화면(1024px 미만)에서 사이드바를 여닫는 **화면 고정 버튼**과 뒤를 덮는 판.
 *
 * 공통 사이드바(`Sidebar`)와 프로젝트 사이드바(`ProjectSidebar`)가 함께 쓴다 —
 * 둘은 화면이 갈려 동시에 뜨지 않으므로 버튼이 겹칠 일은 없다.
 *
 * ⚠️ 버튼은 사이드바 **바깥**에 두어야 한다 — 안에 두면 닫혔을 때(`hidden`)
 *    버튼까지 함께 사라져 다시 열 수 없다. 그래서 이 컴포넌트가 판과 형제로 선다.
 *
 * ⭐ **열린 판은 모달이다** (2026-08-16). 뒤를 덮개로 가려 놓고 초점은 그대로 두면,
 *    키보드 사용자는 Tab 으로 **가려진 화면의 링크 · 버튼에 그대로 닿는다** — 눈에는
 *    안 보이는 곳을 조작하게 된다. 그래서 여기서 네 가지를 함께 맡는다.
 *      ① 열 때 판 안으로 초점을 옮기고 ② Tab 을 판 안에 가두며
 *      ③ Esc 로 닫고 ④ 닫으면 버튼으로 초점을 되돌린다.
 *    판 쪽 `role="dialog"` · `aria-modal` 은 쓰는 쪽이 붙인다 (`isModal` 참고).
 */
export default function MobileSidebarToggle({
  isOpen,
  onToggle,
  onClose,
  /** 보조기술이 읽을 이름 — 화면마다 여는 것이 다르다 (`메뉴` · `프로젝트 메뉴`) */
  label,
  /** 떠 있는 판(`<aside>`) — 초점을 옮기고 가둘 대상이다 */
  panelRef,
}: {
  isOpen: boolean;
  onToggle: () => void;
  onClose: () => void;
  label: string;
  panelRef: RefObject<HTMLElement | null>;
}) {
  const triggerRef = useRef<HTMLButtonElement>(null);
  const isNarrow = useNarrowScreen();
  /** 판이 실제로 모달로 떠 있는 상태 — 넓은 화면에서는 클래스가 꺼져 있어 판이 아니다 */
  const isModal = isOpen && isNarrow;

  /*
    화면이 넓어지면 **연 기억을 지운다.** 좁은 화면에서 열어 둔 채 창을 키우면
    판은 CSS 로 제자리 사이드바가 되는데 `isOpen` 만 참으로 남아, 다음에 좁혀졌을 때
    누르지도 않은 판이 떠 있다.
  */
  useEffect(() => {
    if (!isNarrow && isOpen) onClose();
  }, [isNarrow, isOpen, onClose]);

  // 열리면 판 안으로 초점을 옮기고, 닫히면 버튼으로 되돌린다
  useEffect(() => {
    if (!isModal) return;

    const panel = panelRef.current;
    // 정리 시점에는 ref 가 이미 비었을 수 있다 — 효과가 돌 때의 버튼을 붙잡아 둔다
    const trigger = triggerRef.current;
    focusablesIn(panel ?? document.body)[0]?.focus();

    return () => {
      /*
        판이 닫히면 그 안에 있던 초점은 `body` 로 떨어진다 — 키보드 사용자는
        문서 처음부터 다시 훑어야 한다. 판 안에 있었을 때만 버튼으로 돌려준다
        (그 사이 사용자가 다른 곳을 눌렀다면 그 자리를 빼앗지 않는다).
      */
      const active = document.activeElement;
      const wasInside = panel?.contains(active) ?? false;
      if (wasInside || active === document.body) trigger?.focus();
    };
  }, [isModal, panelRef]);

  // Esc 로 닫고, Tab 은 판 안에서만 돌게 한다
  useEffect(() => {
    if (!isModal) return;

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === 'Escape') {
        event.preventDefault();
        onClose();
        return;
      }
      if (event.key !== 'Tab') return;

      const panel = panelRef.current;
      if (!panel) return;

      const items = focusablesIn(panel);
      // 판에 초점 받을 것이 없으면 밖으로 나가지 못하게 막기만 한다
      if (items.length === 0) {
        event.preventDefault();
        return;
      }

      const first = items[0];
      const last = items[items.length - 1];
      const active = document.activeElement;

      // 초점이 판 밖에 있으면(덮개를 눌렀을 때 등) 안으로 데려온다
      if (!panel.contains(active)) {
        event.preventDefault();
        (event.shiftKey ? last : first).focus();
        return;
      }
      if (event.shiftKey && active === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && active === last) {
        event.preventDefault();
        first.focus();
      }
    }

    // 캡처 단계 — 안쪽 요소가 Tab 을 먼저 삼켜도 가두기가 빠지지 않게
    document.addEventListener('keydown', handleKeyDown, true);
    return () => document.removeEventListener('keydown', handleKeyDown, true);
  }, [isModal, onClose, panelRef]);

  return (
    <>
      <button
        ref={triggerRef}
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
          // 초점 순서에서 뺀다 — 가두기가 이미 판 안에서 돌고, Esc 로 닫을 수 있다
          tabIndex={-1}
          aria-hidden
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
