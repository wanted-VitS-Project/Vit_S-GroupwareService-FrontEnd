'use client';

import { useState } from 'react';

import Modal, { ModalButton } from '@/components/Modal';
import { messageOf } from '@/lib/api';

import { agreeToTerms } from './api';
import ChangePasswordModal from './ChangePasswordModal';

/**
 * 최초 로그인(passwordStatus=RESET_REQUIRED) 사용자를 막는 흐름.
 * 약관 동의 → 비밀번호 변경 순서로 진행하며, 끝나기 전에는 서비스로 못 들어간다.
 */
export default function FirstLoginFlow({ onDone }: { onDone: () => void }) {
  const [hasAgreed, setHasAgreed] = useState(false);

  return hasAgreed ? (
    <ChangePasswordModal forced onDone={onDone} />
  ) : (
    <TermsStep onAgree={() => setHasAgreed(true)} />
  );
}

function TermsStep({ onAgree }: { onAgree: () => void }) {
  const [error, setError] = useState('');
  const [isPending, setIsPending] = useState(false);

  async function handleAgree() {
    setError('');
    setIsPending(true);

    try {
      await agreeToTerms();
      onAgree();
    } catch (caught) {
      setError(
        messageOf(
          caught,
          '동의를 처리하지 못했습니다. 잠시 후 다시 시도해주세요.',
        ),
      );
      setIsPending(false);
    }
  }

  return (
    <Modal title="약관 동의">
      <p className="mt-2 text-sm text-slate-500">
        최초 로그인입니다.
        <br />
        약관 동의 후 비밀번호를 변경해주세요.
      </p>

      {/* TODO: 실제 약관 문구로 교체 */}
      <div className="mt-6 h-56 overflow-y-auto rounded bg-slate-100 p-4 text-xs whitespace-pre-line text-slate-600">
        약관 내용 추가 예정입니다.
      </div>

      {/* 에러가 떠도 버튼 위치가 흔들리지 않게 자리를 잡아둔다 */}
      <p role="alert" className="mt-4 min-h-5 text-xs text-rose-600">
        {error}
      </p>

      <ModalButton onClick={handleAgree} disabled={isPending}>
        {isPending ? '처리 중…' : '동의하고 계속하기'}
      </ModalButton>
    </Modal>
  );
}
