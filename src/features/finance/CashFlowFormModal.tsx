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

/** 폼 대상. 'create' 는 직접 등록, 객체는 그 건 수정이다 */
export type CashFlowFormTarget = 'create' | CashFlowItem;

const TYPE_OPTIONS = (['INCOME', 'OUTCOME'] as CashFlowType[]).map((value) => ({
  value,
  label: CASH_FLOW_TYPE_LABELS[value],
}));

interface FormState {
  bankName: string;
  /** datetime-local 입력값 */
  tradedAt: string;
  type: CashFlowType;
  /** 빈 칸이 0 으로 저장되지 않도록 문자열로 다룬다 */
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
 * 적요 말고 다른 항목까지 고칠 수 있는지. 서버 규칙과 같다.
 * 직접 등록이면서 아직 연결되지 않은 건만 전체 수정이 된다.
 */
export function canEditAll(row: CashFlowItem) {
  return row.sourceType === 'MANUAL' && row.linkStatus === 'UNLINKED';
}

/**
 * 왜 적요만 고칠 수 있는지에 대한 사유.
 * 연결돼서 잠긴 것과 외부 자료라 잠긴 것은 할 수 있는 일이 달라 나눠 둔다.
 */
function lockReason(row: CashFlowItem) {
  if (row.linkStatus !== 'UNLINKED') {
    return '정산 블록에 연결된 내역이라';
  }

  return `${CASH_FLOW_SOURCE_LABELS[row.sourceType]} 로 수집된 내역이라`;
}

/** 응답 값을 datetime-local 이 읽는 형태로 자른다 */
function toInputDateTime(value: string) {
  return value.slice(0, 16);
}

/** datetime-local 값에 초를 붙인다. 백엔드는 초까지 받는다 */
function toApiDateTime(value: string) {
  return value.length === 16 ? `${value}:00` : value;
}

function toFormState(row: CashFlowItem): FormState {
  return {
    // 목록 응답에 은행명이 없어 거래고유번호에서 되읽는다
    bankName: bankNameFromTxnId(row.bankTxnId),
    tradedAt: toInputDateTime(row.tradedAt),
    type: row.type,
    amount: String(row.amount),
    depositorName: row.depositorName,
    memo: row.bankMemo ?? '',
  };
}

/**
 * 입출금 내역 직접 등록 · 수정 모달.
 * 수정은 부분 수정이라 잠긴 건은 적요만 보낸다.
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
  /** 등록은 늘 전체 입력이고 수정은 출처 · 연결 상태가 정한다 */
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
    // 잠긴 건은 적요만 보내므로 나머지를 검사하지 않는다
    if (!isFullEdit) return null;

    if (form.bankName.trim() === '') return '은행명을 입력해주세요.';
    if (form.tradedAt === '') return '거래일시를 입력해주세요.';
    if (form.depositorName.trim() === '') return '입금자명을 입력해주세요.';

    const amount = Number(form.amount);
    if (form.amount === '' || amount <= 0) {
      return '거래금액을 1원 이상 입력해주세요.';
    }
    // 자릿수가 지나치면 숫자로 바꿀 때 무한대가 되어 값이 사라진다
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
        // 잠긴 건은 적요만 보낸다
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
      // 입력이 쌓이는 폼이라 바깥 클릭으로 닫히지 않게 한다
      dismissOnBackdrop={false}
      /* 거래고유번호 안내가 잘리지 않도록 폭을 넓히고 여백을 줄인다 */
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
            /* 은행명을 되읽는 원본이라 함께 보여줘야 비었을 때 채울 수 있다 */
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

          {/* 적요는 어떤 건이든 고칠 수 있다 */}
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
