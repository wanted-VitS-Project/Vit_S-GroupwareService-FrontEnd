'use client';

import { useState } from 'react';

import Modal from '@/components/Modal';
import {
  AlertBanner,
  AmountField,
  SelectField,
  TextField,
} from '@/features/bidding/FormFields';
import { messageOf } from '@/lib/api';

import { createCashFlow, updateCashFlow } from './api';
import { bankNameFromTxnId } from './display';
import {
  CASH_FLOW_SOURCE_LABELS,
  CASH_FLOW_TYPE_LABELS,
  type CashFlowItem,
  type CashFlowType,
  type CreateCashFlowRequest,
} from './types';

/** 폼 대상 — `'create'` 는 직접 등록, 객체는 그 건 수정 */
export type CashFlowFormTarget = 'create' | CashFlowItem;

const TYPE_OPTIONS = (['INCOME', 'OUTCOME'] as CashFlowType[]).map((value) => ({
  value,
  label: CASH_FLOW_TYPE_LABELS[value],
}));

interface FormState {
  bankName: string;
  /** `yyyy-MM-ddTHH:mm` (datetime-local 값) */
  tradedAt: string;
  type: CashFlowType;
  /** 문자열로 다룬다 — 빈 칸이 `0` 이 되면 0원짜리 거래가 저장된다 */
  amount: string;
  depositorName: string;
  memo: string;
}

const EMPTY_STATE: FormState = {
  bankName: '',
  tradedAt: '',
  type: 'INCOME',
  amount: '',
  depositorName: '',
  memo: '',
};

/**
 * 적요 말고 **다른 항목까지 고칠 수 있는지**.
 *
 * 서버 규칙과 같다 — 직접 등록(`MANUAL`)이면서 아직 정산 블록에 연결되지 않은 건만
 * 전체 수정이 된다. CSV · 외부 API 건은 원본이 은행 자료라 고치면 대사가 어긋나고,
 * 연결된 건은 금액을 바꾸면 이미 맞춰 둔 정산이 틀어진다.
 */
export function canEditAll(row: CashFlowItem) {
  return row.sourceType === 'MANUAL' && row.linkStatus === 'UNLINKED';
}

/**
 * 왜 적요만 고칠 수 있는지.
 *
 * ⚠️ 두 사유를 뭉뚱그리지 않는다 — 직접 등록한 건이 연결돼서 잠긴 것과,
 *    CSV · 외부 API 로 들어와서 잠긴 것은 사용자가 할 수 있는 일이 다르다
 *    (앞은 연결을 해제하면 풀리고, 뒤는 원본이 은행 자료라 풀 수 없다).
 */
function lockReason(row: CashFlowItem) {
  if (row.linkStatus !== 'UNLINKED') {
    return '정산 블록에 연결된 내역이라';
  }

  return `${CASH_FLOW_SOURCE_LABELS[row.sourceType]} 로 수집된 내역이라`;
}

/** 응답의 `2026-07-15T10:30:00` 을 datetime-local 이 읽는 `yyyy-MM-ddTHH:mm` 으로 자른다 */
function toInputDateTime(value: string) {
  return value.slice(0, 16);
}

/** datetime-local 값(`yyyy-MM-ddTHH:mm`)에 초를 붙인다 — 백엔드는 초까지 받는다 */
function toApiDateTime(value: string) {
  return value.length === 16 ? `${value}:00` : value;
}

function toFormState(row: CashFlowItem): FormState {
  return {
    /**
     * ⚠️ 목록 응답에 `bankName` 이 없어 **거래고유번호에서 되읽는다**.
     * 형식이 다르면 빈 값이 오고, 그때는 사용자가 직접 채운다.
     */
    bankName: bankNameFromTxnId(row.bankTxnId),
    tradedAt: toInputDateTime(row.tradedAt),
    type: row.type,
    amount: String(row.amount),
    depositorName: row.depositorName,
    memo: row.bankMemo ?? '',
  };
}

/**
 * 입출금 내역 직접 등록 · 수정 모달. (#12)
 *
 * ⚠️ 수정은 **부분 수정**이다. 잠긴 건은 적요만 보내고 나머지는 아예 싣지 않는다 —
 *    서버가 무시하긴 하지만, 보내지 않는 편이 의도가 분명하고 로그도 깨끗하다.
 */
export default function CashFlowFormModal({
  target,
  onClose,
  onSaved,
}: {
  target: CashFlowFormTarget;
  onClose: () => void;
  onSaved: () => void;
}) {
  const isCreate = target === 'create';
  /** 등록은 언제나 전체 입력이고, 수정은 출처 · 연결 상태가 정한다 */
  const isFullEdit = isCreate || canEditAll(target);

  const [form, setForm] = useState<FormState>(
    isCreate ? EMPTY_STATE : toFormState(target),
  );
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  function patch(next: Partial<FormState>) {
    setForm((prev) => ({ ...prev, ...next }));
    setError(null);
  }

  function validate() {
    // 잠긴 건은 적요만 보내므로 나머지를 검사할 이유가 없다
    if (!isFullEdit) return null;

    if (form.bankName.trim() === '') return '은행명을 입력해주세요.';
    if (form.tradedAt === '') return '거래일시를 입력해주세요.';
    if (form.depositorName.trim() === '') return '입금자명을 입력해주세요.';

    const amount = Number(form.amount);
    if (form.amount === '' || amount <= 0) {
      return '거래금액을 1원 이상 입력해주세요.';
    }
    // 자릿수가 지나치면 `Number()` 가 `Infinity` 가 되고 JSON 에서 `null` 로 바뀐다
    if (!Number.isFinite(amount)) return '거래금액이 너무 큽니다.';

    return null;
  }

  function toPayload(): CreateCashFlowRequest {
    return {
      bankName: form.bankName.trim(),
      tradedAt: toApiDateTime(form.tradedAt),
      type: form.type,
      amount: Number(form.amount),
      depositorName: form.depositorName.trim(),
      memo: form.memo.trim() || null,
    };
  }

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    if (isSubmitting) return;

    const message = validate();
    if (message) {
      setError(message);
      return;
    }

    setIsSubmitting(true);

    try {
      if (isCreate) {
        await createCashFlow(toPayload());
      } else if (isFullEdit) {
        await updateCashFlow(target.cashFlowId, toPayload());
      } else {
        // 잠긴 건 — 적요만 간다
        await updateCashFlow(target.cashFlowId, {
          memo: form.memo.trim() || null,
        });
      }

      onSaved();
    } catch (caught) {
      setError(messageOf(caught, '저장하지 못했습니다.'));
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <Modal
      title={isCreate ? '입출금 내역 등록' : '입출금 내역 수정'}
      onClose={onClose}
      // 입력이 쌓이는 폼이라 바깥을 잘못 눌러 날아가지 않게 한다 (닫기 · Esc 는 그대로)
      dismissOnBackdrop={false}
      /**
       * ⚠️ `max-w-md`(448px) 로는 거래고유번호 안내가 잘렸다.
       *    좌우 여백도 `p-8` → `p-6` 으로 줄여 글자 자리를 넓힌다.
       */
      className="w-full max-w-lg rounded-base p-6 shadow-2xl"
    >
      <form onSubmit={submit} className="mt-6">
        {!isCreate && !isFullEdit && (
          <AlertBanner tone="warning" className="mb-4">
            {lockReason(target)} <b>적요만 수정</b>할 수 있습니다.
          </AlertBanner>
        )}

        <div className="flex flex-col gap-4">
          <TextField
            id="cashFlowBankName"
            label="은행명"
            required={isFullEdit}
            disabled={!isFullEdit}
            value={form.bankName}
            placeholder="신한은행"
            /**
             * 거래고유번호를 그대로 보여준다 — 목록 응답에 은행명이 없어 이 값에서
             * 되읽는데, 형식이 예상과 다르면 칸이 비어 이유를 알 수 없다.
             * 원본을 함께 보여주면 사용자가 보고 바로 채울 수 있다.
             */
            hint={isCreate ? undefined : `거래고유번호: ${target.bankTxnId}`}
            onChange={(value) => patch({ bankName: value })}
          />

          <TextField
            id="cashFlowTradedAt"
            label="거래일시"
            type="datetime-local"
            required={isFullEdit}
            disabled={!isFullEdit}
            value={form.tradedAt}
            onChange={(value) => patch({ tradedAt: value })}
          />

          <SelectField
            id="cashFlowType"
            label="구분"
            required={isFullEdit}
            disabled={!isFullEdit}
            value={form.type}
            options={TYPE_OPTIONS}
            onChange={(value) => patch({ type: value as CashFlowType })}
          />

          <AmountField
            id="cashFlowAmount"
            label="거래금액"
            required={isFullEdit}
            disabled={!isFullEdit}
            value={form.amount}
            onChange={(value) => patch({ amount: value })}
          />

          <TextField
            id="cashFlowDepositorName"
            label="입금자명"
            required={isFullEdit}
            disabled={!isFullEdit}
            value={form.depositorName}
            placeholder="(주)한국기술공사"
            onChange={(value) => patch({ depositorName: value })}
          />

          {/* 적요만은 어떤 건이든 고칠 수 있다 — 담당자가 메모를 남기는 자리다 */}
          <TextField
            id="cashFlowMemo"
            label="적요"
            value={form.memo}
            placeholder="선급금"
            maxLength={100}
            onChange={(value) => patch({ memo: value })}
          />
        </div>

        {error && (
          <p className="mt-4 text-caption text-red-text" role="alert">
            {error}
          </p>
        )}

        <div className="mt-6 flex justify-end gap-2">
          <button
            type="button"
            onClick={onClose}
            className="btn btn-md btn-gray-outlined"
          >
            취소
          </button>
          <button
            type="submit"
            disabled={isSubmitting}
            className="btn btn-md btn-primary min-w-[104px]"
          >
            {isSubmitting ? '저장 중…' : '저장'}
          </button>
        </div>
      </form>
    </Modal>
  );
}
