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
    className: 'bg-[#4F39F6] hover:bg-[#4430d6]',
    failure: '승인하지 못했습니다.',
  },
  reject: {
    title: '결재 반려',
    description:
      '반려하면 이후 결재 단계가 모두 취소되고 기안자에게 알림이 갑니다.',
    submit: '반려',
    busy: '반려 중…',
    placeholder: '반려 사유를 남겨주세요 (선택)',
    className: 'bg-[#E7000B] hover:bg-[#c60009]',
    failure: '반려하지 못했습니다.',
  },
} as const;

/**
 * 승인 · 반려 처리 모달. (AP-041·042·053·054)
 *
 * 의견은 **선택**이라 비워도 보낼 수 있다.
 * 대상은 결재가 아니라 결재선(`lineId`)이고, 처리 결과를 상위가 그대로 화면에 반영한다.
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

  async function submit() {
    if (isBusy) return;

    setIsBusy(true);
    setError('');

    const trimmed = opinion.trim();

    try {
      // 빈 의견은 키 자체를 빼서 보낸다 — 빈 문자열이 의견으로 저장되면 말풍선이 빈 채로 뜬다
      const body = trimmed ? { opinion: trimmed } : {};
      const result =
        kind === 'approve'
          ? await approveLine(lineId, body)
          : await rejectLine(lineId, body);

      onProcessed(kind, result, trimmed);
    } catch (caught) {
      const code = caught instanceof ApiError ? caught.code : undefined;
      // 이미 처리됨(409) · 권한 없음(403)은 문구를 우리가 정한다 — 나머지는 백엔드 문구가 정확하다
      setError(
        (code && LINE_PROCESS_LABELS[code]) ?? messageOf(caught, copy.failure),
      );
      setIsBusy(false);
    }
  }

  return (
    <Modal title={copy.title} onClose={isBusy ? undefined : onClose}>
      <p className="text-xs break-keep text-[#6C7389]">{copy.description}</p>

      <label className="mt-4 block">
        <span className="mb-1 block text-xs font-semibold text-[#1C1F2A]">
          결재 의견
        </span>
        <textarea
          value={opinion}
          onChange={(event) => setOpinion(event.target.value)}
          placeholder={copy.placeholder}
          rows={4}
          className="w-full resize-y rounded-lg border border-[#1C1F2A]/10 bg-[#ECEEF4]/40 px-3 py-2 text-xs text-[#1C1F2A] placeholder:text-[#6C7389] focus:outline-2 focus:outline-offset-2 focus:outline-[#3B5BDB]"
        />
      </label>

      <ErrorText message={error} className="mt-2" />

      <div className="mt-5 flex gap-2">
        <button
          type="button"
          onClick={onClose}
          disabled={isBusy}
          className="flex-1 cursor-pointer rounded-lg border border-[#1C1F2A]/10 py-2 text-xs font-semibold text-[#1C1F2A] hover:bg-[#ECEEF4] disabled:cursor-not-allowed disabled:text-[#C7CCD9]"
        >
          취소
        </button>
        <button
          type="button"
          onClick={submit}
          disabled={isBusy}
          className={`flex-1 cursor-pointer rounded-lg py-2 text-xs font-semibold text-white disabled:cursor-not-allowed disabled:bg-[#ECEEF4] disabled:text-[#6C7389] ${copy.className}`}
        >
          {isBusy ? copy.busy : copy.submit}
        </button>
      </div>
    </Modal>
  );
}
