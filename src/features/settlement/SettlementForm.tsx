'use client';

import { useEffect, useState } from 'react';

import { AlertDialogTwoButton, DialogIcons } from '@/components/AlertDialog';
import { ApiError, messageOf } from '@/lib/api';

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
  traderLabel,
  type SettlementFields,
  type SettlementFormValues,
  type SettlementItem,
  type SettlementType,
} from './types';

const FIELD_CLASS =
  'w-full rounded-lg border border-border-default bg-bg-surface px-2.5 py-1.5 text-caption text-text-primary placeholder:text-text-placeholder focus:outline-2 focus:outline-offset-2 focus:outline-border-primary';

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
 *
 * ⚠️ **낙관적 락** (2026-08-12) — 받은 `version` 을 실어 보내고, 버전 충돌 409 면
 *    **새로고침 / 덮어쓰기**를 묻는다. 그 사이 블록이 삭제(`SETL-002`)되거나 세금계산서 ·
 *    입출금이 연결(`SETL-007`)됐다면 덮어쓰기로도 못 뚫으므로 **폼을 닫고 목록을 다시 읽는다.**
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
  /** 낙관적 락 버전 — 없으면 저장을 막고 새로고침을 안내한다 */
  version?: number;
  onClose: () => void;
  /**
   * 저장된 항목과 **그때 고른 타입**을 함께 넘긴다 —
   * 86번 응답에 `type` 이 없어 항목만으로는 입금인지 출금인지 알 수 없다.
   */
  onSaved: (next: SettlementItem, type: SettlementType) => void;
  /**
   * 화면이 든 값이 더 이상 맞지 않아 **목록을 다시 읽어야** 할 때.
   * (남이 먼저 저장 → 새로고침 선택 · 블록 삭제됨 · 연결돼 잠김)
   *
   * `isLocked` 는 **연결돼 잠긴 경우**(`SETL-007`)다 — 블록이 그대로 남으므로
   * 요약 화면이 `수정하기` 를 막아야 한다. 삭제는 목록에서 사라져 그럴 필요가 없다.
   */
  onStale: (reason: string, isLocked: boolean) => void;
}) {
  /** 이미 작성된 블록인지 — 추천값을 채울지 가르는 기준이다 */
  const isWritten = item !== null;

  const [type, setType] = useState<SettlementType | null>(initialType);
  const [form, setForm] = useState<SettlementFormValues>(() => toForm(item));
  const [isBusy, setIsBusy] = useState(false);
  const [error, setError] = useState('');
  /**
   * 409 로 탭이 저절로 되돌아갔다는 안내.
   *
   * `error` 와 나눠 둔다 — 되돌린 직후 **원래 타입 조회가 성공**하면서 성공 분기의
   * `setError('')` 가 안내를 지워버린다. 그러면 탭이 왜 튕겼는지 알 수 없다.
   */
  const [revertNotice, setRevertNotice] = useState('');
  /** 버전 충돌 — 새로고침할지 덮어쓸지 묻는다 */
  const [isConflicting, setIsConflicting] = useState(false);

  /**
   * 타입을 고르면 추천값과 원본 계좌번호를 받는다.
   *
   * 받은 값은 **안내가 아니라 폼에 그대로 채운다** (명세: 추천값은 블록 생성 직후에 입력된다).
   * 칸마다 보라색 안내를 띄우면 정작 봐야 할 것이 묻히고, 사용자는 어차피 그 값을 옮겨 적는다.
   *
   * ⚠️ **이미 작성된 블록에는 채우지 않는다** (`item !== null`) — 저장된 값 위에 추천을 덮으면
   *    수정하러 들어온 사람의 값이 사라진다.
   * ⚠️ **사용자가 이미 친 칸도 건드리지 않는다** — 타입 탭을 다시 눌러 응답이 늦게 와도
   *    입력 중이던 값이 튀지 않아야 한다.
   * ⚠️ 응답의 계좌번호는 마스킹된 값(`100******444`)이라 폼에 쓸 수 없다.
   *    여기서 받는 `originalAccountNumber` 만 폼에 채운다.
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
        // 취소는 실패가 아니다 — 새 요청이 이미 떠 있다는 뜻이다
        if (signal.aborted) return;

        /**
         * 409 는 **출금 → 입금으로 바꿀 수 없다**는 뜻이다 (`SETL-006`).
         * 고른 탭을 되돌리지 않으면 화면은 `입금`, 서버는 `출금` 인 채로 어긋난다 —
         * 그 상태로 저장하면 같은 이유로 또 막힌다.
         *
         * ⚠️ 안내를 `error` 가 아니라 `revertNotice` 에 넣는다. 되돌린 타입으로 조회가
         * 곧 **성공**하면서 성공 분기의 `setError('')` 가 안내를 지워버리기 때문이다.
         */
        if (
          caught instanceof ApiError &&
          (caught.code === SETTLEMENT_CODES.typeDowngrade ||
            // 코드를 못 읽어도 이 조회의 409 는 이것뿐이다 (저장은 넷이라 다르다)
            (caught.code === undefined && caught.status === 409))
        ) {
          setType(initialType);
          setRevertNotice(
            messageOf(caught, '이미 저장된 타입이라 되돌렸습니다.'),
          );
          return;
        }

        /**
         * 조용히 넘기지 않는다. 이 조회도 **편집 권한이 필요해서**(명세 85),
         * 실패는 대개 권한이 없다는 뜻이다 — 그대로 두면 다 채우고 저장을 눌러야 알게 된다.
         * 출금 수정이라면 **원본 계좌번호도 못 받은 상태**라 더더욱 알려야 한다.
         */
        setError(messageOf(caught, '정산 정보를 불러오지 못했습니다.'));
      });

    return () => controller.abort();
    // `initialType` · `isWritten` 은 폼이 열릴 때 정해지고 그대로다 — 재조회가 늘지 않는다
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

    /**
     * 빈 칸을 그대로 보내면 `Number('')` 가 **0** 이라 0원짜리 정산이 저장된다 —
     * 서버 400 으로 걸리지도 않는다. 필수값 · 계좌 3종을 여기서 먼저 막는다.
     */
    const blocker = findBlocker(type, form);
    if (blocker) {
      setError(blocker);
      return;
    }

    // 버전 없이 보내면 400 이다 — 요청하지 않고 새로고침을 안내한다
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
      // 남이 먼저 저장했다 — 새로고침할지 덮어쓸지 묻는다
      if (isSettlementVersionConflict(caught)) {
        setIsConflicting(true);
        return;
      }

      /*
       * 덮어쓰기로도 못 뚫는 두 가지 — 그 사이 블록이 삭제됐거나(`SETL-002`),
       * 세금계산서 · 입출금이 연결돼 잠겼다(`SETL-007`).
       * 폼을 열어 둔 채 두면 사용자가 같은 저장을 계속 시도한다.
       */
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
            /**
             * `aria-current` 가 아니라 `aria-pressed` 다 — 목록 속 '현재 항목'이 아니라
             * 입금 · 출금을 켜고 끄는 **토글**이라 '선택됨 / 선택 안 됨'으로 읽혀야 한다.
             */
            aria-pressed={value === type}
            onClick={() => {
              // 직접 다시 고르는 순간 되돌림 안내는 역할을 다했다
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

      {/* 탭이 저절로 되돌아간 이유 — 조회가 성공해도 지우지 않는다 */}
      {revertNotice !== '' && (
        <p role="status" className="text-caption break-keep text-yellow-text">
          {revertNotice}
        </p>
      )}

      {/**
       * 회차에는 추천 안내를 붙이지 않는다 — 다음 회차 번호는 사람이 이미 알고,
       * 안내가 칸마다 붙으면 정작 봐야 할 `맞출 금액` 이 묻힌다.
       */}
      <Field
        label="정산 회차"
        value={form.roundNo}
        onChange={(value) => change('roundNo', value)}
      />
      {/**
       * ⚠️ 이 값은 **같은 프로젝트의 다른 정산 블록과 일치해야 한다** — 어긋나면 저장이
       * 409(`SETL-008`)로 막힌다. 그래서 추천값을 안내로 띄우는 대신 **미리 채워** 둔다.
       */}
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
        /*
         * 409 를 조용히 삼키면 사용자는 저장된 줄 안다.
         * 취소(= Esc · 배경 클릭)를 **새로고침**에 두어, 잘못 눌러도 남의 값이 지워지지 않게 한다.
         */
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
            // 버전 충돌은 잠긴 것이 아니다 — 최신 값으로 다시 열면 저장할 수 있다
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

/**
 * 컬럼 옆 안내 문구. **값이 없으면 줄 자체를 접는다.**
 *
 * ⚠️ 첫 정산 블록이면 기준 삼을 다른 블록이 없어 `null` 로 온다 —
 * 그대로 `toLocaleString()` 을 부르면 화면이 통째로 죽는다.
 */
function Field({
  label,
  type = 'number',
  placeholder,
  value,
  onChange,
}: {
  label: string;
  type?: 'number' | 'text' | 'date';
  placeholder?: string;
  value: string;
  onChange: (value: string) => void;
}) {
  return (
    <label className="flex items-center gap-2">
      {/**
       * ⚠️ 라벨 자리를 넉넉하게 잡는다 — `w-20`(80px) 이던 때는 `예정 총 금액` 이
       * 두 줄로 접혀 입력 칸과 어긋났다. 블록은 1칸이라 입력 칸을 줄이는 편이 낫다.
       */}
      <span className="w-24 shrink-0 text-caption break-keep text-text-secondary">
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
      </span>
    </label>
  );
}

/** 추천값을 입력 칸 문자열로. 값이 없으면 빈 칸을 유지한다 */
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
