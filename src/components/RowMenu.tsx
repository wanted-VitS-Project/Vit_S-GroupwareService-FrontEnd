'use client';

import { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';

export interface RowMenuItem {
  label: string;
  /** 삭제처럼 되돌리기 어려운 항목은 빨갛게 */
  danger?: boolean;
  onSelect: () => void;
}

interface RowMenuProps {
  /** 스크린리더용 — '{label} 관리' 로 읽힌다 */
  label: string;
  items: RowMenuItem[];
  /** 항목 문구가 길면 넓힌다 (px) */
  width?: number;
}

/** 펼침 방향을 계산하려면 높이를 미리 알아야 한다 */
const ITEM_HEIGHT = 27;
const MENU_PADDING = 8;
const DEFAULT_WIDTH = 96;

/**
 * 표 행별 케밥 메뉴. 바깥 클릭 · ESC 로 닫는다.
 *
 * 스크롤 영역 안에서 잘리지 않도록 body 에 `fixed` 로 띄운다.
 * 좌표는 열 때 한 번 계산해 굳으므로 스크롤 · 리사이즈가 생기면 닫는다.
 */
export default function RowMenu({
  label,
  items,
  width = DEFAULT_WIDTH,
}: RowMenuProps) {
  const [position, setPosition] = useState<{
    top: number;
    left: number;
  } | null>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);

  const isOpen = position !== null;
  const height = items.length * ITEM_HEIGHT + MENU_PADDING;

  function toggle() {
    if (isOpen) {
      setPosition(null);
      return;
    }

    const rect = buttonRef.current?.getBoundingClientRect();
    if (!rect) return;

    // 화면 아래쪽이면 위로 펼친다
    const opensUp = window.innerHeight - rect.bottom < height + 8;

    setPosition({
      top: opensUp ? rect.top - height - 4 : rect.bottom + 4,
      left: rect.right - width,
    });
  }

  useEffect(() => {
    if (!isOpen) return;

    function close() {
      setPosition(null);
    }
    function handlePointerDown(event: MouseEvent) {
      const target = event.target as Node;

      if (
        !buttonRef.current?.contains(target) &&
        !menuRef.current?.contains(target)
      ) {
        close();
      }
    }
    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === 'Escape') close();
    }

    document.addEventListener('mousedown', handlePointerDown);
    document.addEventListener('keydown', handleKeyDown);
    // 스크롤은 표 안쪽에서도 일어나므로 캡처 단계에서 받는다
    document.addEventListener('scroll', close, true);
    window.addEventListener('resize', close);

    return () => {
      document.removeEventListener('mousedown', handlePointerDown);
      document.removeEventListener('keydown', handleKeyDown);
      document.removeEventListener('scroll', close, true);
      window.removeEventListener('resize', close);
    };
  }, [isOpen]);

  return (
    <>
      <button
        ref={buttonRef}
        type="button"
        onClick={toggle}
        aria-label={`${label} 관리`}
        aria-expanded={isOpen}
        className="cursor-pointer rounded px-2 py-1 text-[#6C7389] hover:bg-[#ECEEF4]"
      >
        ⋯
      </button>

      {position &&
        createPortal(
          <div
            ref={menuRef}
            style={{ top: position.top, left: position.left, width }}
            className="fixed z-50 overflow-hidden rounded-lg border border-[#1C1F2A]/10 bg-white py-1 shadow-lg"
          >
            {items.map((item) => (
              <button
                key={item.label}
                type="button"
                onClick={() => {
                  setPosition(null);
                  item.onSelect();
                }}
                className={`block w-full cursor-pointer px-3 py-1.5 text-left text-[11px] hover:bg-[#ECEEF4] ${
                  item.danger ? 'text-[#E7000B]' : 'text-[#1C1F2A]'
                }`}
              >
                {item.label}
              </button>
            ))}
          </div>,
          document.body,
        )}
    </>
  );
}
