'use client';

import { useState } from 'react';

import Modal from '@/components/Modal';
import { ApiError, messageOf } from '@/lib/api';

import { approveLine, rejectLine } from './api';
import ErrorText from './ErrorText';
import { LINE_PROCESS_LABELS } from './errorCodes';
import type { ApproveLineResponse, RejectLineResponse } from './types';

export type ProcessKind = 'approve' | 'reject';

const COPY = {
  approve: {
    title: '결재 승인',
    description: '승인하면 다음 결재자에게 넘어갑니다.',
    submit: '승인',
    busy: '승인 중…',
    placeholder: '의견을 남길 수 있어요 (선택)',
    className: 'btn-primary',
    failure: '승인하지 못했습니다.',
  },
  reject: {
    title: '결재 반려',
    description:
      '반려하면 이후 결재 단계가 모두 취소되고 기안자에게 알림이 갑니다.',
    submit: '반려',
    busy: '반려 중…',
    placeholder: '반려 사유를 입력해주세요',
    className: 'btn-danger',
    failure: '반려하지 못했습니다.',
  },
} as const;

/**
 * 승인 · 반려 처리 모달. 승인 의견은 선택, 반려 사유는 필수다.
 * 대상은 결재가 아니라 결재선이며 결과는 상위가 화면에 반영한다.
 */
export default function ApprovalProcessModal({
  kind,
  lineId,
  onClose,
  onProcessed,
}: {
  kind: ProcessKind;
  lineId: number;
  onClose: () => void;
  onProcessed: (
    kind: ProcessKind,
    result: ApproveLineResponse | RejectLineResponse,
    opinion: string,
  ) => void;
}) {
  const copy = COPY[kind];
  const [opinion, setOpinion] = useState('');
  const [isBusy, setIsBusy] = useState(false);
  const [error, setError] = useState('');

  /** 서버는 선택으로 받지만 기안자가 사유를 알아야 해서 화면에서는 필수로 막는다 */
  const isOpinionRequired = kind === 'reject';
  const isEmpty = opinion.trim() === '';

  async function submit() {
    if (isBusy) return;

    setIsBusy(true);
    setError('');

    const trimmed = opinion.trim();

    try {
      // 빈 문자열이 의견으로 저장되지 않도록 키 자체를 빼서 보낸다
      const body = trimmed ? { opinion: trimmed } : {};
      const result =
        kind === 'approve'
          ? await approveLine(lineId, body)
          : await rejectLine(lineId, body);

      onProcessed(kind, result, trimmed);
    } catch (caught) {
      const code = caught instanceof ApiError ? caught.code : undefined;
      // 아는 코드만 문구를 정하고 나머지는 백엔드 문구를 쓴다
      setError(
        (code && LINE_PROCESS_LABELS[code]) ?? messageOf(caught, copy.failure),
      );
      setIsBusy(false);
    }
  }

  return (
    <Modal title={copy.title} onClose={isBusy ? undefined : onClose}>
      <p className="text-label break-keep text-text-secondary">
        {copy.description}
      </p>

      <label className="mt-4 block">
        <span className="mb-1 block text-label font-semibold text-text-primary">
          결재 의견
          {/* 별표는 시각 표시일 뿐이라 보조기술에는 aria-required 로 전한다 */}
          {isOpinionRequired && (
            <span aria-hidden className="ml-0.5 text-text-danger">
              *
            </span>
          )}
        </span>
        <textarea
          value={opinion}
          onChange={(event) => setOpinion(event.target.value)}
          placeholder={copy.placeholder}
          aria-required={isOpinionRequired}
          rows={4}
          className="w-full resize-y rounded-lg border border-border-default bg-bg-surface px-3 py-2 text-label text-text-primary placeholder:text-text-secondary focus:outline-2 focus:outline-offset-2 focus:outline-border-primary"
        />
      </label>

      <ErrorText message={error} className="mt-2" />

      <div className="mt-5 flex gap-2">
        <button
          type="button"
          onClick={onClose}
          disabled={isBusy}
          className="flex-1 cursor-pointer rounded-lg border border-border-default py-2 text-label font-semibold text-text-primary hover:bg-bg-hover disabled:cursor-not-allowed disabled:text-text-muted"
        >
          취소
        </button>
        <button
          type="button"
          onClick={submit}
          disabled={isBusy || (isOpinionRequired && isEmpty)}
          /* 색 · 비활성 처리는 공용 버튼 스타일이 갖고 있다 */
          className={`btn btn-md flex-1 ${copy.className}`}
        >
          {isBusy ? copy.busy : copy.submit}
        </button>
      </div>
    </Modal>
  );
}
