'use client';

import { useState } from 'react';

import ChangePasswordModal from './ChangePasswordModal';

/** 마이페이지에서 일반 모드 비밀번호 변경 모달을 여는 버튼. */
export default function ChangePasswordButton() {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <>
      <button
        type="button"
        onClick={() => setIsOpen(true)}
        className="cursor-pointer rounded-lg border border-slate-200 px-4 py-2 text-sm hover:bg-slate-50"
      >
        비밀번호 변경
      </button>

      {isOpen && (
        <ChangePasswordModal
          onClose={() => setIsOpen(false)}
          onDone={() => setIsOpen(false)}
        />
      )}
    </>
  );
}
