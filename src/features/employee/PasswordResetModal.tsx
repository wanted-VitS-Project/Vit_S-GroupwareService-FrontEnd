'use client';

import { useState } from 'react';

import PanelModal, { ModalFooter } from '@/components/PanelModal';
import { messageOf } from '@/lib/api';

import { resetPasswords } from './api';
import { PASSWORD_RESET_FAILURE_LABELS } from './errorCodes';
import type { PasswordResetResult, PasswordResetTarget } from './types';

interface PasswordResetModalProps {
  /** 1명이든 여러 명이든 같은 흐름이다 */
  targets: PasswordResetTarget[];
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
      // 재발송 응답은 재발송 대상만 담고 온다 — 그대로 갈아치우면 나머지 실패가 사라진다
      setResult((prev) => (prev ? merge(prev, next, userIds) : next));
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
                    className="rounded-lg border border-border-default px-3 py-2"
                  >
                    <p className="text-detail font-semibold text-text-primary">
                      {failure.name}{' '}
                      <span className="font-normal text-text-secondary">
                        {failure.userId}
                      </span>
                    </p>
                    <p className="mt-0.5 text-caption break-keep text-text-danger">
                      {PASSWORD_RESET_FAILURE_LABELS[failure.reason]}
                    </p>
                  </li>
                ))}
              </ul>
            )}

            {resendTargets.length > 0 && (
              <p className="rounded-lg bg-yellow-bg-soft px-3 py-2.5 text-detail leading-relaxed break-keep text-yellow-text">
                {resendTargets.length}명은 비밀번호가 이미 바뀌었지만 메일이
                가지 않았습니다. 재발송하지 않으면 로그인할 수 없습니다.
              </p>
            )}
          </>
        ) : (
          <>
            <div className="rounded-lg border border-border-default bg-bg-surface px-3 py-2.5">
              <span className="block text-caption text-text-secondary">
                대상
              </span>
              <span className="mt-0.5 block text-label font-semibold text-text-primary">
                {targets.length === 1
                  ? `${targets[0].name} (${targets[0].userId})`
                  : `${targets.length}명`}
              </span>
            </div>

            <p className="rounded-lg bg-yellow-bg-soft px-3 py-2.5 text-detail leading-relaxed break-keep text-yellow-text">
              임시 비밀번호를 발급해 사번과 함께 각자의 이메일로 보냅니다.
              <br />
              대상 사원은 다음 로그인 때 비밀번호를 반드시 변경해야 합니다.
            </p>

            {missingEmailCount > 0 && (
              <p className="text-caption break-keep text-text-danger">
                이메일이 등록되지 않은 사원 {missingEmailCount}명은 실패로
                처리됩니다.
              </p>
            )}
          </>
        )}

        {/* 요소를 먼저 두고 내용만 바꿔야 스크린리더가 읽는다 */}
        <p
          role="alert"
          className="text-caption break-keep text-text-danger empty:hidden"
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
                  className="btn btn-sm btn-gray-outlined"
                >
                  {isSubmitting ? '재발송 중…' : '메일 재발송'}
                </button>
              )}
              <button
                type="button"
                onClick={requestClose}
                disabled={isSubmitting}
                className="btn btn-sm btn-primary"
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
                className="btn btn-md btn-gray-outlined"
              >
                취소
              </button>
              <button
                type="button"
                onClick={() => submit(targets.map((target) => target.userId))}
                disabled={isSubmitting}
                className="btn btn-sm btn-primary"
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

/**
 * 재발송 결과를 최초 결과 위에 덮어쓴다.
 * 다시 시도한 사원만 최신 상태로 갈고, 손대지 않은 실패(이메일 미등록 등)는 그대로 남긴다 —
 * 집계는 최초 요청 건수를 기준으로 다시 센다.
 */
function merge(
  previous: PasswordResetResult,
  retried: PasswordResetResult,
  retriedIds: string[],
): PasswordResetResult {
  const ids = new Set(retriedIds);
  const failures = [
    ...previous.failures.filter((failure) => !ids.has(failure.userId)),
    ...retried.failures,
  ];

  return {
    requestedCount: previous.requestedCount,
    successCount: previous.requestedCount - failures.length,
    failedCount: failures.length,
    failures,
  };
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
      ? 'text-green-text'
      : tone === 'danger'
        ? 'text-text-danger'
        : 'text-text-primary';

  return (
    <div className="flex-1 rounded-lg border border-border-default px-3 py-2 text-center">
      <span className="block text-caption text-text-secondary">{label}</span>
      <span className={`mt-0.5 block text-body-m font-bold ${toneClass}`}>
        {count}
      </span>
    </div>
  );
}
