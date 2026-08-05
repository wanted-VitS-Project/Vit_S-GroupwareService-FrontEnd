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
 * 통과하지 못한 게이트를 단계로 보여준다. (1 약관 → 2 비밀번호)
 *
 * 비밀번호 단계가 남아 있으면 약관은 **이미 동의했어도 확인 단계로 함께 둔다** —
 * 그래서 동의 직후 새로고침해도 `2 / 2` 가 유지되고, 이전/다음으로 약관을 다시 읽을 수 있다.
 * 단계 이동은 로컬 상태라 /me 재조회가 끼어들지 않고, 재조회는 마지막에 한 번만 한다.
 */
export default function AuthGates({
  needsTerms,
  needsPassword,
  onDone,
}: AuthGatesProps) {
  const [hasAgreed, setHasAgreed] = useState(!needsTerms);
  // 이미 동의한 약관을 다시 읽게 강요하지 않는다 — 남은 단계에서 시작한다
  const [isOnTerms, setIsOnTerms] = useState(needsTerms);

  // 약관 하나뿐이면 진행 표시가 군더더기다
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
