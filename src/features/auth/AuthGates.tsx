'use client';

import { useState } from 'react';

import ChangePasswordModal from './ChangePasswordModal';
import TermsGate from './TermsGate';

interface AuthGatesProps {
  /** termsStatus === 'REQUIRED' */
  needsTerms: boolean;
  /** passwordStatus === 'RESET_REQUIRED' */
  needsPassword: boolean;
  onDone: () => void;
}

/**
 * 통과하지 못한 게이트를 단계로 보여준다 (1 약관 → 2 비밀번호).
 * 단계 이동은 로컬 상태로 처리하고 /me 재조회는 마지막에 한 번만 한다.
 */
export default function AuthGates({
  needsTerms,
  needsPassword,
  onDone,
}: AuthGatesProps) {
  const [hasAgreed, setHasAgreed] = useState(!needsTerms);
  // 이미 동의한 약관은 건너뛰고 남은 단계에서 시작한다
  const [isOnTerms, setIsOnTerms] = useState(needsTerms);

  // 약관 하나뿐이면 진행 표시를 두지 않는다
  const stepLabelOf = (current: number) =>
    needsPassword ? `${current} / 2` : undefined;

  if (isOnTerms) {
    return (
      <TermsGate
        stepLabel={stepLabelOf(1)}
        hasAgreed={hasAgreed}
        onDone={() => {
          setHasAgreed(true);
          // 비밀번호까지 남았으면 재조회 없이 다음 단계로 넘어간다
          if (needsPassword) setIsOnTerms(false);
          else onDone();
        }}
      />
    );
  }

  return (
    <ChangePasswordModal
      forced
      stepLabel={stepLabelOf(2)}
      onBack={() => setIsOnTerms(true)}
      onDone={onDone}
    />
  );
}
