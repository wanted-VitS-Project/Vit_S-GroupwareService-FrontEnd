'use client';

import { useState } from 'react';

import PanelModal, { ModalFooter } from '@/components/PanelModal';
import { messageOf } from '@/lib/api';

import { resetPasswords } from './api';
import { PASSWORD_RESET_FAILURE_LABELS } from './errorCodes';
import type { EmployeeSummary, PasswordResetResult } from './types';

interface PasswordResetModalProps {
  /** 1명이든 여러 명이든 같은 흐름이다 */
  targets: EmployeeSummary[];
  onClose: () => void;
  /** 성공분이 있으면 목록의 상태 배지가 바뀐다 */
  onDone: () => void;
}

/**
 * 비밀번호 재설정 확인 · 결과 모달. (.ai/API.md 21)
 *
 * 실패가 섞여도 200 이라 집계를 반드시 보여준다.
 * `passwordChanged: true` 는 비밀번호만 바뀌고 메일이 안 간 상태다 — 재발송하지 않으면 로그인할 수 없다.
 */
export default function PasswordResetModal({
  targets,
  onClose,
  onDone,
}: PasswordResetModalProps) {
  const [result, setResult] = useState<PasswordResetResult | null>(null);
  const [error, setError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  /** 이메일이 없으면 서버가 실패로 돌려주므로 미리 알려준다 */
  const missingEmailCount = targets.filter(
    (target) => !target.emailRegistered,
  ).length;

  async function submit(userIds: string[]) {
    if (isSubmitting || userIds.length === 0) return;

    setError('');
    setIsSubmitting(true);

    try {
      const next = await resetPasswords(userIds);
      setResult(next);
      // 성공분이 있으면 목록을 갱신한다. 실패만 있으면 바뀐 게 없다
      if (next.successCount > 0) onDone();
    } catch (caught) {
      setError(messageOf(caught, '비밀번호를 재설정하지 못했습니다.'));
    } finally {
      setIsSubmitting(false);
    }
  }

  /** 재설정 중에는 닫지 않는다 */
  function requestClose() {
    if (!isSubmitting) onClose();
  }

  /** 메일만 실패한 사원 — 이들만 다시 보내면 된다 */
  const resendTargets =
    result?.failures.filter((failure) => failure.passwordChanged) ?? [];

  return (
    <PanelModal
      title={result ? '비밀번호 재설정 결과' : '비밀번호 재설정'}
      onClose={requestClose}
    >
      <div className="space-y-4 p-5">
        {result ? (
          <>
            <div className="flex gap-2">
              <Summary label="요청" count={result.requestedCount} />
              <Summary
                label="성공"
                count={result.successCount}
                tone="success"
              />
              <Summary
                label="실패"
                count={result.failedCount}
                tone={result.failedCount > 0 ? 'danger' : undefined}
              />
            </div>

            {result.failures.length > 0 && (
              <ul className="max-h-52 space-y-1.5 overflow-y-auto">
                {result.failures.map((failure) => (
                  <li
                    key={failure.userId}
                    className="rounded-lg border border-[#1C1F2A]/10 px-3 py-2"
                  >
                    <p className="text-[11px] font-semibold text-[#1C1F2A]">
                      {failure.name}{' '}
                      <span className="font-normal text-[#6C7389]">
                        {failure.userId}
                      </span>
                    </p>
                    <p className="mt-0.5 text-[10px] break-keep text-[#E7000B]">
                      {PASSWORD_RESET_FAILURE_LABELS[failure.reason]}
                    </p>
                  </li>
                ))}
              </ul>
            )}

            {resendTargets.length > 0 && (
              <p className="rounded-lg bg-[#F59E0B]/10 px-3 py-2.5 text-[11px] leading-relaxed break-keep text-[#92400E]">
                {resendTargets.length}명은 비밀번호가 이미 바뀌었지만 메일이
                가지 않았습니다. 재발송하지 않으면 로그인할 수 없습니다.
              </p>
            )}
          </>
        ) : (
          <>
            <div className="rounded-lg border border-[#1C1F2A]/10 bg-[#ECEEF4]/50 px-3 py-2.5">
              <span className="block text-[10px] text-[#6C7389]">대상</span>
              <span className="mt-0.5 block text-xs font-semibold text-[#1C1F2A]">
                {targets.length === 1
                  ? `${targets[0].name} (${targets[0].userId})`
                  : `${targets.length}명`}
              </span>
            </div>

            <p className="rounded-lg bg-[#F59E0B]/10 px-3 py-2.5 text-[11px] leading-relaxed break-keep text-[#92400E]">
              임시 비밀번호를 발급해 각자의 이메일로 보냅니다.
              <br />
              대상 사원은 다음 로그인 때 비밀번호를 반드시 변경해야 합니다.
            </p>

            {missingEmailCount > 0 && (
              <p className="text-[10px] break-keep text-[#E7000B]">
                이메일이 등록되지 않은 사원 {missingEmailCount}명은 실패로
                처리됩니다.
              </p>
            )}
          </>
        )}

        {/* 요소를 먼저 두고 내용만 바꿔야 스크린리더가 읽는다 */}
        <p
          role="alert"
          className="text-[10px] break-keep text-[#E7000B] empty:hidden"
        >
          {error}
        </p>
      </div>

      <ModalFooter>
        <div className="flex shrink-0 items-center gap-2">
          {result ? (
            <>
              {resendTargets.length > 0 && (
                <button
                  type="button"
                  onClick={() =>
                    submit(resendTargets.map((failure) => failure.userId))
                  }
                  disabled={isSubmitting}
                  className="cursor-pointer rounded-lg border border-[#1C1F2A]/10 px-4 py-1.5 text-[11px] font-semibold text-[#1C1F2A] hover:bg-[#ECEEF4] disabled:cursor-not-allowed disabled:text-[#C7CCD9]"
                >
                  {isSubmitting ? '재발송 중…' : '메일 재발송'}
                </button>
              )}
              <button
                type="button"
                onClick={onClose}
                className="cursor-pointer rounded-lg bg-[#2B3A67] px-4 py-1.5 text-[11px] font-semibold text-white hover:bg-[#22305a]"
              >
                확인
              </button>
            </>
          ) : (
            <>
              <button
                type="button"
                onClick={onClose}
                disabled={isSubmitting}
                className="cursor-pointer rounded-lg px-4 py-1.5 text-[11px] font-medium text-[#6C7389] hover:bg-[#ECEEF4] disabled:cursor-not-allowed disabled:text-[#C7CCD9]"
              >
                취소
              </button>
              <button
                type="button"
                onClick={() => submit(targets.map((target) => target.userId))}
                disabled={isSubmitting}
                className="cursor-pointer rounded-lg bg-[#2B3A67] px-4 py-1.5 text-[11px] font-semibold text-white hover:bg-[#22305a] disabled:cursor-not-allowed disabled:bg-[#ECEEF4] disabled:text-[#6C7389]"
              >
                {isSubmitting ? '재설정 중…' : '재설정'}
              </button>
            </>
          )}
        </div>
      </ModalFooter>
    </PanelModal>
  );
}

function Summary({
  label,
  count,
  tone,
}: {
  label: string;
  count: number;
  tone?: 'success' | 'danger';
}) {
  const toneClass =
    tone === 'success'
      ? 'text-[#087443]'
      : tone === 'danger'
        ? 'text-[#E7000B]'
        : 'text-[#1C1F2A]';

  return (
    <div className="flex-1 rounded-lg border border-[#1C1F2A]/10 px-3 py-2 text-center">
      <span className="block text-[10px] text-[#6C7389]">{label}</span>
      <span className={`mt-0.5 block text-sm font-bold ${toneClass}`}>
        {count}
      </span>
    </div>
  );
}
