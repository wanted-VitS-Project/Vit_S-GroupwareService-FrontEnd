'use client';

import { useEffect, useState } from 'react';

import { messageOf } from '@/lib/api';

import { getSettlementDraft, saveSettlement } from './api';
import {
  findAccountBlocker,
  SETTLEMENT_TYPE_LABELS,
  type SaveSettlementRequest,
  type SettlementDraft,
  type SettlementItem,
  type SettlementType,
} from './types';

const FIELD_CLASS =
  'w-full rounded-lg border border-[#1C1F2A]/10 bg-[#ECEEF4]/40 px-2.5 py-1.5 text-[10px] text-[#1C1F2A] placeholder:text-[#6C7389] focus:outline-2 focus:outline-offset-2 focus:outline-[#3B5BDB]';

const TYPES: SettlementType[] = ['INCOME', 'OUTCOME'];

/** 폼이 들고 있는 값. 숫자 칸도 **문자열로** 둔다 — 지웠을 때 0 이 되면 안 된다 */
interface FormState {
  roundNo: string;
  totalAmount: string;
  plannedAmount: string;
  plannedTaxAmount: string;
  plannedDate: string;
  traderName: string;
  bankName: string;
  accountNumber: string;
  accountHolder: string;
}

const EMPTY_FORM: FormState = {
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
 * 정산 항목 작성 · 수정 폼. (.ai/API.md 84 · 85)
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
  onSaved: (next: SettlementItem) => void;
}) {
  const [type, setType] = useState<SettlementType | null>(initialType);
  const [form, setForm] = useState<FormState>(() => toForm(item));
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
        if (received.originalAccountNumber) {
          setForm((prev) => ({
            ...prev,
            accountNumber: received.originalAccountNumber ?? '',
          }));
        }
      })
      .catch(() => {
        // 취소는 실패가 아니다. 추천값은 곁다리라 못 받아도 폼은 그대로 쓴다
        if (!signal.aborted) setDraft(null);
      });

    return () => controller.abort();
  }, [settleId, type]);

  function change(field: keyof FormState, value: string) {
    setForm((prev) => ({ ...prev, [field]: value }));
  }

  async function submit() {
    if (isBusy) return;

    if (type === null) {
      setError('입금 · 출금을 먼저 골라주세요.');
      return;
    }

    // 출금인데 계좌가 비면 서버가 400 으로 막는다 — 눌러보고 알게 하지 않는다
    const missing = findAccountBlocker(type, form);
    if (missing) {
      setError(`출금은 ${missing}이(가) 필요합니다.`);
      return;
    }

    setIsBusy(true);
    setError('');

    try {
      const saved = await saveSettlement(settleId, type, toRequest(type, form));
      onSaved(saved);
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
                ? 'border-[#4F39F6] bg-[#4F39F6]/5 text-[#4F39F6]'
                : 'border-[#1C1F2A]/10 text-[#6C7389] hover:bg-[#ECEEF4]'
            }`}
          >
            {SETTLEMENT_TYPE_LABELS[value]}
          </button>
        ))}
      </div>

      {type === null && (
        <p className="text-[10px] break-keep text-[#6C7389]">
          입금 · 출금을 고르면 추천 회차와 금액을 불러옵니다.
        </p>
      )}

      <Field
        label="정산 회차"
        hint={hint && `추천: ${hint.recommendRoundNo}`}
        value={form.roundNo}
        onChange={(value) => change('roundNo', value)}
      />
      <Field
        label="총금액"
        hint={
          hint && `추천: ${hint.recommendTotalAmount.toLocaleString('ko-KR')}`
        }
        value={form.totalAmount}
        onChange={(value) => change('totalAmount', value)}
      />
      <Field
        label="이번 정산 금액"
        value={form.plannedAmount}
        onChange={(value) => change('plannedAmount', value)}
      />
      <Field
        label="정산 예정 세금"
        value={form.plannedTaxAmount}
        onChange={(value) => change('plannedTaxAmount', value)}
      />
      <Field
        label="마감일"
        type="date"
        value={form.plannedDate}
        onChange={(value) => change('plannedDate', value)}
      />
      <Field
        label={type === 'OUTCOME' ? '거래처명' : '보낸 사람'}
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
        <p role="alert" className="text-[10px] break-keep text-[#E7000B]">
          {error}
        </p>
      )}

      <div className="flex gap-1.5">
        <button
          type="button"
          onClick={submit}
          disabled={isBusy}
          className="flex-1 cursor-pointer rounded-lg bg-[#4F39F6] py-2 text-[11px] font-semibold text-white hover:bg-[#4430d6] disabled:cursor-not-allowed disabled:bg-[#ECEEF4] disabled:text-[#6C7389]"
        >
          {isBusy ? '저장 중…' : '저장하기'}
        </button>
        <button
          type="button"
          onClick={onClose}
          disabled={isBusy}
          className="shrink-0 cursor-pointer rounded-lg border border-[#1C1F2A]/10 px-3 py-2 text-[11px] font-semibold text-[#1C1F2A] hover:bg-[#ECEEF4] disabled:cursor-not-allowed"
        >
          취소
        </button>
      </div>
    </div>
  );
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
      <span className="w-20 shrink-0 text-[10px] text-[#6C7389]">{label}</span>
      <span className="min-w-0 flex-1">
        <input
          type={type}
          value={value}
          placeholder={placeholder}
          onChange={(event) => onChange(event.target.value)}
          className={FIELD_CLASS}
        />
        {/* 값이 없을 때만 접힌다 */}
        <span className="mt-0.5 block text-[9px] text-[#7F22FE] empty:hidden">
          {hint ?? ''}
        </span>
      </span>
    </label>
  );
}

function toForm(item: SettlementItem | null): FormState {
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
     * 원본은 수정 화면 조회(84번)로 받아 덮어쓴다.
     */
    accountNumber: '',
    accountHolder: item.accountHolder ?? '',
  };
}

function toRequest(
  type: SettlementType,
  form: FormState,
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
