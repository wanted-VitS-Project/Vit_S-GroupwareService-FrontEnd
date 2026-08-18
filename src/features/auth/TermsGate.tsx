'use client';

import { useState } from 'react';

import Modal, { ModalButton } from '@/components/Modal';
import { messageOf } from '@/lib/api';

import { agreeToTerms } from './api';

interface TermsGateProps {
  /** '1 / 2' 처럼 남은 단계를 알려주는 문구 */
  stepLabel?: string;
  /** 이미 동의한 경우. 확인만 하고 넘어간다 */
  hasAgreed?: boolean;
  onDone: () => void;
}

/**
 * 약관 동의 게이트.
 * 다음 동작은 여기서 정하지 않고 onDone 을 받은 쪽이 정한다.
 */
export default function TermsGate({
  stepLabel,
  hasAgreed,
  onDone,
}: TermsGateProps) {
  const [error, setError] = useState('');
  const [isPending, setIsPending] = useState(false);

  async function handleAgree() {
    // 확인만 한 경우. 불필요한 호출을 피한다
    if (hasAgreed) {
      onDone();
      return;
    }

    setError('');
    setIsPending(true);

    try {
      await agreeToTerms();
      onDone();
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
    <Modal title={hasAgreed ? '약관 확인' : '약관 동의'} stepLabel={stepLabel}>
      <p className="mt-2 text-body-m text-text-secondary">
        {hasAgreed
          ? '이미 동의한 약관입니다.'
          : '서비스 이용을 위해 약관 동의가 필요합니다.'}
      </p>

      {/* TODO: 실제 약관 문구로 교체 (배포 전 필수) */}
      <div className="mt-6 h-56 overflow-y-auto rounded-button-sm bg-bg-hover p-4 text-label whitespace-pre-line text-text-secondary">
        약관 내용 추가 예정입니다.
      </div>

      {/* 에러가 떠도 버튼 위치가 흔들리지 않게 자리를 잡아둔다 */}
      <p role="alert" className="mt-4 min-h-5 text-label text-text-danger">
        {error}
      </p>

      <ModalButton onClick={handleAgree} disabled={isPending}>
        {isPending ? '처리 중…' : hasAgreed ? '다음' : '동의하고 계속하기'}
      </ModalButton>
    </Modal>
  );
}
