'use client';

import { useEffect, useState } from 'react';

import { AlertDialogTwoButton, DialogIcons } from '@/components/AlertDialog';
import { ApiError, messageOf } from '@/lib/api';
import { dateInputProps } from '@/lib/dateInput';

import { getSettlementDraft, saveSettlement } from './api';
import {
  isSettlementGone,
  isSettlementLocked,
  isSettlementVersionConflict,
  SETTLEMENT_CODES,
  SETTLEMENT_NO_VERSION_MESSAGE,
} from './errorCodes';
import {
  findBlocker,
  SETTLEMENT_TYPE_LABELS,
  TRADER_LABEL,
  type SettlementFields,
  type SettlementFormValues,
  type SettlementItem,
  type SettlementType,
} from './types';

const FIELD_CLASS =
  'w-full rounded-lg border border-border-default bg-bg-surface px-2.5 py-1.5 text-caption text-text-primary placeholder:text-text-placeholder focus:outline-2 focus:outline-offset-2 focus:outline-border-primary';

const TYPES: SettlementType[] = ['INCOME', 'OUTCOME'];

/** 숫자 칸도 문자열로 둔다. 지웠을 때 0 이 되면 안 된다 */
const EMPTY_FORM: SettlementFormValues = {
  roundNo: '',
  totalAmount: '',
  plannedAmount: '',
  plannedTaxAmount: '',
  plannedDate: '',
  taxInvoiceDueDate: '',
  traderName: '',
  bankName: '',
  accountNumber: '',
  accountHolder: '',
};

/**
 * 정산 항목 작성 · 수정 폼. 타입을 고르면 그때 추천값을 받아온다.
 * 낙관적 락을 쓰며 충돌하면 새로고침 · 덮어쓰기를 묻는다.
 */
export default function SettlementForm({
  settleId,
  initialType,
  item,
  version,
  onClose,
  onSaved,
  onStale,
}: {
  settleId: number;
  /** 블록이 이미 타입을 알고 있으면 그 값으로 열린다 */
  initialType: SettlementType | null;
  /** 이미 작성된 값. 없으면 빈 폼이다 */
  item: SettlementItem | null;
  /** 낙관적 락 버전. 없으면 저장을 막고 새로고침을 안내한다 */
  version?: number;
  onClose: () => void;
  /** 저장 응답에 type 이 없어 그때 고른 타입도 함께 넘긴다 */
  onSaved: (next: SettlementItem, type: SettlementType) => void;
  /**
   * 화면 값이 낡아 목록을 다시 읽어야 할 때 부른다.
   * isLocked 면 블록이 남아 있으므로 요약 화면이 수정 버튼을 막는다.
   */
  onStale: (reason: string, isLocked: boolean) => void;
}) {
  /** 이미 작성된 블록인지. 추천값을 채울지 가르는 기준이다 */
  const isWritten = item !== null;

  const [type, setType] = useState<SettlementType | null>(initialType);
  const [form, setForm] = useState<SettlementFormValues>(() => toForm(item));
  const [isBusy, setIsBusy] = useState(false);
  const [error, setError] = useState('');
  /** 탭이 저절로 되돌아갔다는 안내. 조회 성공에 지워지지 않도록 따로 둔다 */
  const [revertNotice, setRevertNotice] = useState('');
  /** 버전 충돌. 새로고침할지 덮어쓸지 묻는다 */
  const [isConflicting, setIsConflicting] = useState(false);

  /**
   * 타입을 고르면 추천값과 원본 계좌번호를 받아 폼에 채운다.
   * 이미 작성된 블록과 사용자가 이미 친 칸은 덮지 않는다.
   */
  useEffect(() => {
    if (type === null) return;

    const controller = new AbortController();
    const { signal } = controller;

    getSettlementDraft(settleId, type, signal)
      .then((received) => {
        setError('');

        setForm((prev) => ({
          ...prev,
          ...(isWritten
            ? null
            : {
                roundNo: prev.roundNo || numberText(received.recommendRoundNo),
                totalAmount:
                  prev.totalAmount || numberText(received.recommendTotalAmount),
              }),
          accountNumber:
            received.originalAccountNumber ?? prev.accountNumber ?? '',
        }));
      })
      .catch((caught: unknown) => {
        // 취소는 실패가 아니다
        if (signal.aborted) return;

        /* 출금에서 입금으로 바꿀 수 없다는 뜻이라 고른 탭을 되돌린다 */
        if (
          caught instanceof ApiError &&
          (caught.code === SETTLEMENT_CODES.typeDowngrade ||
            // 이 조회에서 나올 수 있는 409 는 이것뿐이다
            (caught.code === undefined && caught.status === 409))
        ) {
          setType(initialType);
          setRevertNotice(
            messageOf(caught, '이미 저장된 타입이라 되돌렸습니다.'),
          );
          return;
        }

        // 이 조회도 편집 권한이 필요해 실패를 숨기지 않고 바로 알린다
        setError(messageOf(caught, '정산 정보를 불러오지 못했습니다.'));
      });

    return () => controller.abort();
    // initialType · isWritten 은 폼이 열릴 때 정해져 재조회가 늘지 않는다
  }, [settleId, type, initialType, isWritten]);

  function change(field: keyof SettlementFormValues, value: string) {
    setForm((prev) => ({ ...prev, [field]: value }));
  }

  async function submit(overwrite = false) {
    if (isBusy) return;

    if (type === null) {
      setError('입금 · 출금을 먼저 골라주세요.');
      return;
    }

    // 빈 칸이 0 으로 저장되지 않도록 필수값을 여기서 먼저 막는다
    const blocker = findBlocker(type, form);
    if (blocker) {
      setError(blocker);
      return;
    }

    // 버전 없이 보내면 400 이라 요청하지 않고 새로고침을 안내한다
    if (version === undefined) {
      setError(SETTLEMENT_NO_VERSION_MESSAGE);
      return;
    }

    setIsBusy(true);
    setError('');
    setIsConflicting(false);

    try {
      const saved = await saveSettlement(settleId, type, {
        ...toFields(type, form),
        version,
        ...(overwrite ? { overwrite: true } : {}),
      });
      onSaved(saved, type);
    } catch (caught) {
      // 남이 먼저 저장한 경우. 새로고침할지 덮어쓸지 묻는다
      if (isSettlementVersionConflict(caught)) {
        setIsConflicting(true);
        return;
      }

      /* 덮어쓰기로도 못 뚫는 경우. 폼을 닫아 같은 저장을 반복하지 않게 한다 */
      if (isSettlementGone(caught)) {
        onStale(
          messageOf(caught, '이 정산 블록은 더 이상 수정할 수 없습니다.'),
          isSettlementLocked(caught),
        );
        return;
      }

      setError(messageOf(caught, '저장하지 못했습니다.'));
    } finally {
      setIsBusy(false);
    }
  }

  return (
    <div className="flex flex-col gap-3">
      <div className="flex gap-1.5">
        {TYPES.map((value) => (
          <button
            key={value}
            type="button"
            /* 목록 항목이 아니라 토글이라 aria-pressed 를 쓴다 */
            aria-pressed={value === type}
            onClick={() => {
              // 직접 다시 고르면 되돌림 안내를 지운다
              setRevertNotice('');
              setType(value);
            }}
            className={`flex-1 cursor-pointer rounded-lg border py-1.5 text-caption font-semibold ${
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
        <p className="text-caption break-keep text-text-secondary">
          입금 · 출금을 고르면 추천 회차와 금액을 불러옵니다.
        </p>
      )}

      {/* 탭이 저절로 되돌아간 이유. 조회가 성공해도 지우지 않는다 */}
      {revertNotice !== '' && (
        <p role="status" className="text-caption break-keep text-yellow-text">
          {revertNotice}
        </p>
      )}

      {/* 회차에는 추천 안내를 붙이지 않는다 */}
      <Field
        label="정산 회차"
        value={form.roundNo}
        onChange={(value) => change('roundNo', value)}
      />
      {/* 다른 정산 블록과 일치해야 하는 값이라 추천값을 미리 채워 둔다 */}
      <Field
        label="예정 총 금액"
        value={form.totalAmount}
        onChange={(value) => change('totalAmount', value)}
      />
      <Field
        label="회차 예정 금액"
        value={form.plannedAmount}
        onChange={(value) => change('plannedAmount', value)}
      />
      <Field
        label="예정 세금"
        value={form.plannedTaxAmount}
        onChange={(value) => change('plannedTaxAmount', value)}
      />
      <Field
        label="입출금 기한"
        type="date"
        value={form.plannedDate}
        onChange={(value) => change('plannedDate', value)}
      />
      {/* 면세처럼 계산서를 받지 않는 회차가 있어 비워 둘 수 있다 */}
      <Field
        label="세금계산서 기한"
        type="date"
        hint="받지 않는 회차면 비워둡니다"
        value={form.taxInvoiceDueDate}
        onChange={(value) => change('taxInvoiceDueDate', value)}
      />
      <Field
        label={TRADER_LABEL}
        type="text"
        value={form.traderName}
        onChange={(value) => change('traderName', value)}
      />

      {/* 계좌 정보는 출금일 때만 쓴다 */}
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

      {version === undefined && (
        <p className="rounded-lg bg-yellow-bg-soft px-2.5 py-2 text-caption break-keep text-yellow-text">
          버전 정보를 받지 못해 저장할 수 없습니다. 새로고침 후 다시
          시도해주세요.
        </p>
      )}

      {error !== '' && (
        <p role="alert" className="text-caption break-keep text-text-danger">
          {error}
        </p>
      )}

      {isConflicting && (
        /* 잘못 닫아도 남의 값이 지워지지 않도록 취소를 새로고침 쪽에 둔다 */
        <AlertDialogTwoButton
          icon={DialogIcons.warning}
          title="다른 사람이 먼저 저장했어요"
          description="그 사이 이 정산 항목이 수정됐습니다. 지금 입력한 값으로 덮어쓰거나, 최신 값을 다시 불러올 수 있습니다."
          confirmLabel="덮어쓰기"
          cancelLabel="새로고침"
          isDanger
          isBusy={isBusy}
          onConfirm={() => void submit(true)}
          onCancel={() => {
            setIsConflicting(false);
            // 버전 충돌은 잠김이 아니라 최신 값으로 다시 열면 저장할 수 있다
            onStale(
              '다른 사람이 먼저 저장해 최신 값을 다시 불러왔습니다.',
              false,
            );
          }}
        />
      )}

      <div className="flex gap-1.5">
        <button
          type="button"
          onClick={() => void submit()}
          disabled={isBusy || version === undefined}
          className="flex-1 cursor-pointer rounded-lg bg-btn-primary py-2 text-detail font-semibold text-text-white hover:bg-btn-primary-hover disabled:cursor-not-allowed disabled:bg-btn-gray-disabled-bg disabled:text-btn-gray-disabled-text"
        >
          {isBusy ? '저장 중…' : '저장하기'}
        </button>
        <button
          type="button"
          onClick={onClose}
          disabled={isBusy}
          className="shrink-0 cursor-pointer rounded-lg border border-border-default px-3 py-2 text-detail font-semibold text-text-primary hover:bg-bg-hover disabled:cursor-not-allowed"
        >
          취소
        </button>
      </div>
    </div>
  );
}

/** 라벨 + 입력 한 줄. hint 는 값을 비워도 되는 칸에만 붙인다 */
function Field({
  label,
  type = 'number',
  placeholder,
  hint,
  value,
  onChange,
}: {
  label: string;
  type?: 'number' | 'text' | 'date';
  placeholder?: string;
  hint?: string;
  value: string;
  onChange: (value: string) => void;
}) {
  return (
    <label className="flex items-center gap-2">
      {/* 라벨이 두 줄로 접히지 않도록 자리를 넉넉히 잡는다 */}
      <span className="w-24 shrink-0 text-caption break-keep text-text-secondary">
        {label}
      </span>
      <span className="min-w-0 flex-1">
        <input
          type={type}
          {...dateInputProps(type)}
          value={value}
          placeholder={placeholder}
          onChange={(event) => onChange(event.target.value)}
          className={FIELD_CLASS}
        />
        {hint && (
          <span className="mt-0.5 block text-micro break-keep text-text-secondary">
            {hint}
          </span>
        )}
      </span>
    </label>
  );
}

/** 추천값을 입력 칸 문자열로 바꾼다. 값이 없으면 빈 칸을 유지한다 */
function numberText(value: number | null | undefined) {
  return typeof value === 'number' ? String(value) : '';
}

function toForm(item: SettlementItem | null): SettlementFormValues {
  if (!item) return EMPTY_FORM;

  return {
    roundNo: String(item.roundNo),
    totalAmount: String(item.totalAmount),
    plannedAmount: String(item.plannedAmount),
    plannedTaxAmount: String(item.plannedTaxAmount),
    plannedDate: item.plannedDate,
    taxInvoiceDueDate: item.taxInvoiceDueDate ?? '',
    traderName: item.traderName,
    bankName: item.bankName ?? '',
    // 마스킹된 값은 채우지 않는다. 원본은 수정 화면 조회로 받아 덮어쓴다
    accountNumber: '',
    accountHolder: item.accountHolder ?? '',
  };
}

function toFields(
  type: SettlementType,
  form: SettlementFormValues,
): SettlementFields {
  const base: SettlementFields = {
    roundNo: Number(form.roundNo),
    totalAmount: Number(form.totalAmount),
    plannedAmount: Number(form.plannedAmount),
    plannedTaxAmount: Number(form.plannedTaxAmount),
    plannedDate: form.plannedDate,
    // 빈 칸은 받지 않는 회차라는 뜻이라 null 로 보낸다
    taxInvoiceDueDate: form.taxInvoiceDueDate.trim() || null,
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
