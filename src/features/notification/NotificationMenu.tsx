'use client';

import { useEffect, useRef, useState } from 'react';

/**
 * 알림 한 줄의 케밥 메뉴. `삭제` · `읽음` · `취소`.
 *
 * `취소` 는 **메뉴를 닫기만 한다** — 읽음을 되돌리는 API 는 없다.
 * 이미 읽은 알림에는 `읽음` 을 아예 그리지 않는다. 누를 수 없는 항목이 떠 있으면
 * 왜 안 되는지 알 수 없다.
 */
export default function NotificationMenu({
  canRead,
  disabled,
  onRead,
  onDelete,
}: {
  canRead: boolean;
  disabled: boolean;
  onRead: () => void;
  onDelete: () => void;
}) {
  const boxRef = useRef<HTMLDivElement>(null);
  const [isOpen, setIsOpen] = useState(false);

  useEffect(() => {
    if (!isOpen) return;

    const closeOnOutside = (event: MouseEvent) => {
      if (!boxRef.current?.contains(event.target as Node)) setIsOpen(false);
    };
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setIsOpen(false);
    };

    document.addEventListener('mousedown', closeOnOutside);
    document.addEventListener('keydown', closeOnEscape);
    return () => {
      document.removeEventListener('mousedown', closeOnOutside);
      document.removeEventListener('keydown', closeOnEscape);
    };
  }, [isOpen]);

  /** 고르면 메뉴를 먼저 닫는다 — 열린 채로 목록이 바뀌면 엉뚱한 줄 위에 떠 있게 된다 */
  function choose(run: () => void) {
    setIsOpen(false);
    run();
  }

  return (
    <div ref={boxRef} className="relative">
      <button
        type="button"
        onClick={() => setIsOpen((open) => !open)}
        disabled={disabled}
        aria-expanded={isOpen}
        aria-label="알림 메뉴"
        className="flex size-6 cursor-pointer items-center justify-center rounded text-[#6C7389] hover:bg-[#ECEEF4] hover:text-[#1C1F2A] disabled:cursor-not-allowed disabled:text-[#C7CCD9]"
      >
        ⋮
      </button>

      {isOpen && (
        <div className="absolute top-full right-0 z-30 mt-1 w-24 overflow-hidden rounded-lg border border-[#1C1F2A]/10 bg-white py-1 shadow-lg">
          <MenuItem onClick={() => choose(onDelete)} tone="danger">
            삭제
          </MenuItem>
          {canRead && <MenuItem onClick={() => choose(onRead)}>읽음</MenuItem>}
          <MenuItem onClick={() => setIsOpen(false)}>취소</MenuItem>
        </div>
      )}
    </div>
  );
}

function MenuItem({
  onClick,
  tone = 'normal',
  children,
}: {
  onClick: () => void;
  tone?: 'normal' | 'danger';
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`block w-full cursor-pointer px-3 py-1.5 text-left text-xs hover:bg-[#ECEEF4] ${
        tone === 'danger' ? 'text-[#E7000B]' : 'text-[#1C1F2A]'
      }`}
    >
      {children}
    </button>
  );
}
