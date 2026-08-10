'use client';

import { useEffect, useState } from 'react';

import { ApiError, messageOf } from '@/lib/api';

import { getSettlementDraft, saveSettlement } from './api';
import {
  findBlocker,
  SETTLEMENT_TYPE_LABELS,
  traderLabel,
  type SaveSettlementRequest,
  type SettlementDraft,
  type SettlementFormValues,
  type SettlementItem,
  type SettlementType,
} from './types';

const FIELD_CLASS =
  'w-full rounded-lg border border-border-default bg-bg-surface px-2.5 py-1.5 text-[10px] text-text-primary placeholder:text-text-placeholder focus:outline-2 focus:outline-offset-2 focus:outline-border-primary';

const TYPES: SettlementType[] = ['INCOME', 'OUTCOME'];

/** 숫자 칸도 문자열로 둔다 — 지웠을 때 0 이 되면 안 된다 (모양·검증은 `types.ts`) */
const EMPTY_FORM: SettlementFormValues = {
  roundNo: '',
  totalAmount: '',
  plannedAmount: '',
  plannedTaxAmount: '',
  plannedDate: '',
  traderName: '',
  bankName: '',
  accountNumber: '',
  accountHolder: '',
};

/**
 * 정산 항목 작성 · 수정 폼. (.ai/API.md 85 · 86)
 *
 * 타입을 고르면 그때 추천 회차 · 총액을 받아온다 — **타입마다 다른 값**이라 미리 받을 수 없다.
 * `OUTCOME` 이면 계좌 3종이 함께 필수고, 수정 화면에서만 **원본 계좌번호**를 받는다.
 */
export default function SettlementForm({
  settleId,
  initialType,
  item,
  onClose,
  onSaved,
}: {
  settleId: number;
  /** 블록이 이미 타입을 알고 있으면 그 값으로 열린다 */
  initialType: SettlementType | null;
  /** 이미 작성된 값. 없으면 빈 폼이다 */
  item: SettlementItem | null;
  onClose: () => void;
  /**
   * 저장된 항목과 **그때 고른 타입**을 함께 넘긴다 —
   * 86번 응답에 `type` 이 없어 항목만으로는 입금인지 출금인지 알 수 없다.
   */
  onSaved: (next: SettlementItem, type: SettlementType) => void;
}) {
  const [type, setType] = useState<SettlementType | null>(initialType);
  const [form, setForm] = useState<SettlementFormValues>(() => toForm(item));
  const [draft, setDraft] = useState<SettlementDraft | null>(null);
  const [isBusy, setIsBusy] = useState(false);
  const [error, setError] = useState('');

  /**
   * 타입을 고르면 추천값과 원본 계좌번호를 받는다.
   *
   * ⚠️ 응답의 계좌번호는 마스킹된 값(`100******444`)이라 폼에 쓸 수 없다.
   * 여기서 받는 `originalAccountNumber` 만 폼에 채운다.
   */
  useEffect(() => {
    if (type === null) return;

    const controller = new AbortController();
    const { signal } = controller;

    getSettlementDraft(settleId, type, signal)
      .then((received) => {
        setDraft(received);
        setError('');
        if (received.originalAccountNumber) {
          setForm((prev) => ({
            ...prev,
            accountNumber: received.originalAccountNumber ?? '',
          }));
        }
      })
      .catch((caught: unknown) => {
        // 취소는 실패가 아니다 — 새 요청이 이미 떠 있다는 뜻이다
        if (signal.aborted) return;

        setDraft(null);
        /**
         * 409 는 **출금 → 입금으로 바꿀 수 없다**는 뜻이다 (`SETL-006`).
         * 고른 탭을 되돌리지 않으면 화면은 `입금`, 서버는 `출금` 인 채로 어긋난다 —
         * 그 상태로 저장하면 같은 이유로 또 막힌다.
         */
        if (caught instanceof ApiError && caught.status === 409) {
          setType(initialType);
        }

        /**
         * 조용히 넘기지 않는다. 이 조회도 **편집 권한이 필요해서**(명세 85),
         * 실패는 대개 권한이 없다는 뜻이다 — 그대로 두면 다 채우고 저장을 눌러야 알게 된다.
         * 출금 수정이라면 **원본 계좌번호도 못 받은 상태**라 더더욱 알려야 한다.
         */
        setError(messageOf(caught, '정산 정보를 불러오지 못했습니다.'));
      });

    return () => controller.abort();
    // `initialType` 은 폼이 열릴 때 정해지고 그대로다 — 넣어도 재조회가 늘지 않는다
  }, [settleId, type, initialType]);

  function change(field: keyof SettlementFormValues, value: string) {
    setForm((prev) => ({ ...prev, [field]: value }));
  }

  async function submit() {
    if (isBusy) return;

    if (type === null) {
      setError('입금 · 출금을 먼저 골라주세요.');
      return;
    }

    /**
     * 빈 칸을 그대로 보내면 `Number('')` 가 **0** 이라 0원짜리 정산이 저장된다 —
     * 서버 400 으로 걸리지도 않는다. 필수값 · 계좌 3종을 여기서 먼저 막는다.
     */
    const blocker = findBlocker(type, form);
    if (blocker) {
      setError(blocker);
      return;
    }

    setIsBusy(true);
    setError('');

    try {
      const saved = await saveSettlement(settleId, type, toRequest(type, form));
      onSaved(saved, type);
    } catch (caught) {
      setError(messageOf(caught, '저장하지 못했습니다.'));
    } finally {
      setIsBusy(false);
    }
  }

  /** 추천값은 아직 작성 전일 때만 뜻이 있다 — 이미 쓴 값 위에 다른 수를 권하면 헷갈린다 */
  const hint = item === null ? draft : null;

  return (
    <div className="flex flex-col gap-3">
      <div className="flex gap-1.5">
        {TYPES.map((value) => (
          <button
            key={value}
            type="button"
            aria-current={value === type}
            onClick={() => setType(value)}
            className={`flex-1 cursor-pointer rounded-lg border py-1.5 text-[10px] font-semibold ${
              value === type
                ? 'border-border-primary bg-btn-primary/5 text-text-primary-blue'
                : 'border-border-default text-text-secondary hover:bg-bg-hover'
            }`}
          >
            {SETTLEMENT_TYPE_LABELS[value]}
          </button>
        ))}
      </div>

      {type === null && (
        <p className="text-[10px] break-keep text-text-secondary">
          입금 · 출금을 고르면 추천 회차와 금액을 불러옵니다.
        </p>
      )}

      <Field
        label="정산 회차"
        hint={hintOf(hint?.recommendRoundNo, '추천')}
        value={form.roundNo}
        onChange={(value) => change('roundNo', value)}
      />
      <Field
        label="정산 예정 총 금액"
        /**
         * '추천'이라 부르지만 **다른 정산 블록과 같아야 하는 값**이다 —
         * 어긋나면 저장이 409(`SETL-008`)로 막힌다.
         *
         * 첫 블록이면 기준 삼을 블록이 없어 `null` 이다. 그때 줄을 그냥 접으면
         * **왜 안 뜨는지 알 수 없어** 안내 문구로 바꿔 둔다.
         */
        hint={
          hint &&
          (hintOf(hint.recommendTotalAmount, '맞출 금액') ??
            '첫 정산이에요 — 여기 넣는 금액이 다음 회차의 기준이 됩니다')
        }
        value={form.totalAmount}
        onChange={(value) => change('totalAmount', value)}
      />
      <Field
        label="이번 회차 예정 금액"
        value={form.plannedAmount}
        onChange={(value) => change('plannedAmount', value)}
      />
      <Field
        label="예정 세금"
        value={form.plannedTaxAmount}
        onChange={(value) => change('plannedTaxAmount', value)}
      />
      <Field
        label="정산 예정일"
        type="date"
        value={form.plannedDate}
        onChange={(value) => change('plannedDate', value)}
      />
      <Field
        label={traderLabel(type)}
        type="text"
        value={form.traderName}
        onChange={(value) => change('traderName', value)}
      />

      {/* 계좌 정보는 출금일 때만 쓴다 — 입금에 보내면 서버가 무시하거나 400 이다 */}
      {type === 'OUTCOME' && (
        <>
          <Field
            label="은행명"
            type="text"
            value={form.bankName}
            onChange={(value) => change('bankName', value)}
          />
          <Field
            label="계좌번호"
            type="text"
            placeholder="하이픈 없이"
            value={form.accountNumber}
            onChange={(value) => change('accountNumber', value)}
          />
          <Field
            label="예금주"
            type="text"
            value={form.accountHolder}
            onChange={(value) => change('accountHolder', value)}
          />
        </>
      )}

      {error !== '' && (
        <p role="alert" className="text-[10px] break-keep text-text-danger">
          {error}
        </p>
      )}

      <div className="flex gap-1.5">
        <button
          type="button"
          onClick={submit}
          disabled={isBusy}
          className="flex-1 cursor-pointer rounded-lg bg-btn-primary py-2 text-[11px] font-semibold text-text-white hover:bg-btn-primary-hover disabled:cursor-not-allowed disabled:bg-btn-gray-disabled-bg disabled:text-btn-gray-disabled-text"
        >
          {isBusy ? '저장 중…' : '저장하기'}
        </button>
        <button
          type="button"
          onClick={onClose}
          disabled={isBusy}
          className="shrink-0 cursor-pointer rounded-lg border border-border-default px-3 py-2 text-[11px] font-semibold text-text-primary hover:bg-bg-hover disabled:cursor-not-allowed"
        >
          취소
        </button>
      </div>
    </div>
  );
}

/**
 * 컬럼 옆 안내 문구. **값이 없으면 줄 자체를 접는다.**
 *
 * ⚠️ 첫 정산 블록이면 기준 삼을 다른 블록이 없어 `null` 로 온다 —
 * 그대로 `toLocaleString()` 을 부르면 화면이 통째로 죽는다.
 */
function hintOf(value: number | null | undefined, label: string) {
  if (typeof value !== 'number') return null;

  return `${label}: ${value.toLocaleString('ko-KR')}`;
}

function Field({
  label,
  hint,
  type = 'number',
  placeholder,
  value,
  onChange,
}: {
  label: string;
  /** 컬럼 옆 안내 — `추천: 2` 처럼 **입력값이 아니라 참고**다 */
  hint?: string | null;
  type?: 'number' | 'text' | 'date';
  placeholder?: string;
  value: string;
  onChange: (value: string) => void;
}) {
  return (
    <label className="flex items-center gap-2">
      <span className="w-20 shrink-0 text-[10px] text-text-secondary">
        {label}
      </span>
      <span className="min-w-0 flex-1">
        <input
          type={type}
          value={value}
          placeholder={placeholder}
          onChange={(event) => onChange(event.target.value)}
          className={FIELD_CLASS}
        />
        {/* 값이 없을 때만 접힌다 */}
        <span className="mt-0.5 block text-[9px] text-purple-text empty:hidden">
          {hint ?? ''}
        </span>
      </span>
    </label>
  );
}

function toForm(item: SettlementItem | null): SettlementFormValues {
  if (!item) return EMPTY_FORM;

  return {
    roundNo: String(item.roundNo),
    totalAmount: String(item.totalAmount),
    plannedAmount: String(item.plannedAmount),
    plannedTaxAmount: String(item.plannedTaxAmount),
    plannedDate: item.plannedDate,
    traderName: item.traderName,
    bankName: item.bankName ?? '',
    /**
     * ⚠️ 마스킹된 값(`100******444`)은 채우지 않는다. 그대로 저장하면 `*` 가 계좌번호가 된다.
     * 원본은 수정 화면 조회(85번)로 받아 덮어쓴다.
     */
    accountNumber: '',
    accountHolder: item.accountHolder ?? '',
  };
}

function toRequest(
  type: SettlementType,
  form: SettlementFormValues,
): SaveSettlementRequest {
  const base: SaveSettlementRequest = {
    roundNo: Number(form.roundNo),
    totalAmount: Number(form.totalAmount),
    plannedAmount: Number(form.plannedAmount),
    plannedTaxAmount: Number(form.plannedTaxAmount),
    plannedDate: form.plannedDate,
    traderName: form.traderName.trim(),
  };

  if (type !== 'OUTCOME') return base;

  return {
    ...base,
    bankName: form.bankName.trim(),
    // 하이픈 · 공백을 넣고 보내면 서버가 받지 않는다
    accountNumber: form.accountNumber.replace(/[\s-]/g, ''),
    accountHolder: form.accountHolder.trim(),
  };
}
