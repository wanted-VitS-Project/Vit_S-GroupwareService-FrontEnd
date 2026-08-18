'use client';

import { useState } from 'react';

import ChangePasswordModal from './ChangePasswordModal';

export default function ChangePasswordButton() {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <>
      <button
        type="button"
        onClick={() => setIsOpen(true)}
        className="cursor-pointer rounded-lg border border-border-default px-4 py-2 text-body-m hover:bg-bg-surface"
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
