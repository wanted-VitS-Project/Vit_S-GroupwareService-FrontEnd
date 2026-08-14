'use client';

import { useState } from 'react';

import { AlertBanner, SelectField, TextField } from '@/features/bidding/FormFields';
import { messageOf } from '@/lib/api';

import { uploadCashFlowCsv } from './api';
import {
  ColumnField,
  CUSTOM,
  ModeGroup,
  SamplePreview,
} from './CsvImportParts';
import type {
  CsvAmountMode,
  CsvColumnMapping,
  CsvDateTimeMode,
  CsvPreview,
  CsvUploadResult,
} from './types';

type MappingField = keyof CsvColumnMapping;

const DATE_TIME_MODES: { value: CsvDateTimeMode; label: string }[] = [
  { value: 'SINGLE', label: '통합 일시' },
  { value: 'SEPARATE', label: '일자 · 시간 분리' },
];

const AMOUNT_MODES: { value: CsvAmountMode; label: string }[] = [
  { value: 'SINGLE_WITH_TYPE', label: '단일 금액 + 구분' },
  { value: 'SEPARATE', label: '입금액 · 출금액 분리' },
];

/**
 * 컬럼 맞추기 (2단계).
 *
 * 추천값을 받아 채워 두고 사람이 고친다 — **은행마다 컬럼 이름이 달라** 추천이 빗나갈 수 있다.
 * 파일에 없는 이름을 써야 하는 경우가 있어 모든 칸에 `직접 입력` 을, 필수가 아닌 칸에는
 * `선택 안 함` 을 둔다.
 *
 * ⚠️ **거래 고유번호는 매핑하지 않는다** — 은행명 + 거래일시로 서버가 만든다.
 */
export default function CashFlowCsvMapping({
  file,
  preview,
  password,
  onUploaded,
  onBack,
}: {
  file: File;
  preview: CsvPreview;
  /** 비밀번호가 걸린 엑셀이면 업로드에도 함께 보낸다 */
  password?: string;
  onUploaded: (result: CsvUploadResult) => void;
  onBack: () => void;
}) {
  const [bankName, setBankName] = useState(preview.bankOptions[0] ?? '');
  const [isBankCustom, setIsBankCustom] = useState(
    preview.bankOptions.length === 0,
  );
  const [dateTimeMode, setDateTimeMode] = useState<CsvDateTimeMode>(
    preview.recommendedDateTimeMode,
  );
  const [amountMode, setAmountMode] = useState<CsvAmountMode>(
    preview.recommendedAmountMode,
  );
  const [mapping, setMapping] = useState<CsvColumnMapping>(
    preview.recommendedMapping,
  );
  /** 어느 칸이 `직접 입력` 인지 — 셀렉트 대신 글자 칸을 그린다 */
  const [customFields, setCustomFields] = useState<MappingField[]>([]);

  const [error, setError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  function setColumn(field: MappingField, value: string | null) {
    setMapping((prev) => ({ ...prev, [field]: value }));
    setError('');
  }

  function toggleCustom(field: MappingField, isCustom: boolean) {
    setCustomFields((prev) =>
      isCustom ? [...prev, field] : prev.filter((item) => item !== field),
    );
    // 방식을 바꾸면 값도 비운다 — 남은 값이 다음 칸에 딸려 가면 엉뚱한 컬럼이 저장된다
    setColumn(field, isCustom ? '' : null);
  }

  /** 방식에 따라 **꼭 채워야 하는 칸**. 여기 없는 칸은 비워도 된다 */
  function requiredFields(): MappingField[] {
    return [
      ...(dateTimeMode === 'SINGLE'
        ? (['tradedDateTimeColumn'] as MappingField[])
        : (['tradedDateColumn', 'tradedTimeColumn'] as MappingField[])),
      ...(amountMode === 'SINGLE_WITH_TYPE'
        ? (['amountColumn', 'typeColumn'] as MappingField[])
        : (['incomeAmountColumn', 'outcomeAmountColumn'] as MappingField[])),
      'depositorColumn',
    ];
  }

  function validate() {
    if (bankName.trim() === '') return '은행명을 입력해주세요.';

    const missing = requiredFields().some(
      (field) => (mapping[field] ?? '').trim() === '',
    );

    return missing ? '필수 컬럼을 모두 지정해주세요.' : null;
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
      /**
       * 쓰지 않는 칸은 **`null` 로 정리해서** 보낸다 — 방식을 바꾸며 남은 값이 그대로
       * 실려 가면 서버가 다른 컬럼을 읽는다.
       */
      const required = requiredFields();
      const keep = (field: MappingField) =>
        required.includes(field) || isOptional(field)
          ? (mapping[field] ?? '').trim() || null
          : null;

      const cleaned: CsvColumnMapping = {
        tradedDateTimeColumn: keep('tradedDateTimeColumn'),
        tradedDateColumn: keep('tradedDateColumn'),
        tradedTimeColumn: keep('tradedTimeColumn'),
        amountColumn: keep('amountColumn'),
        typeColumn: keep('typeColumn'),
        incomeAmountColumn: keep('incomeAmountColumn'),
        outcomeAmountColumn: keep('outcomeAmountColumn'),
        memoColumn: keep('memoColumn'),
        depositorColumn: keep('depositorColumn'),
        balanceColumn: keep('balanceColumn'),
      };

      onUploaded(
        await uploadCashFlowCsv(file, {
          ...cleaned,
          bankName: bankName.trim(),
          dateTimeMode,
          amountMode,
          ...(password ? { password } : {}),
        }),
      );
    } catch (caught) {
      setError(messageOf(caught, '업로드하지 못했습니다.'));
    } finally {
      setIsSubmitting(false);
    }
  }

  const columnProps = {
    columns: preview.columns,
    customFields,
    mapping,
    onChange: setColumn,
    onCustomChange: toggleCustom,
  };

  return (
    <form onSubmit={submit}>
      {/**
       * 미리보기를 **위**에, 매핑을 아래에 둔다 — 파일을 먼저 보고 컬럼을 고르는 순서다.
       * 좌우로 나누면 표가 화면 절반으로 좁아져 값이 잘려 읽힌다.
       */}
      <div className="mt-4 flex flex-col gap-4">
        <SamplePreview columns={preview.columns} rows={preview.sampleRows} />

        <div className="rounded-base border border-border-default bg-bg-card p-6">
          <p className="mb-4 text-label font-bold text-text-primary">
            컬럼 매핑
          </p>

          <div className="flex flex-col gap-5">
            {/* 은행명은 파일에 없는 정보다 — 사람이 고르거나 적는다 */}
            {isBankCustom ? (
              <div>
                <TextField
                  id="csvBankName"
                  label="은행명"
                  required
                  value={bankName}
                  placeholder="신한은행"
                  onChange={setBankName}
                />
                {preview.bankOptions.length > 0 && (
                  <button
                    type="button"
                    onClick={() => {
                      setIsBankCustom(false);
                      setBankName(preview.bankOptions[0] ?? '');
                    }}
                    className="mt-1 cursor-pointer text-micro text-text-primary-blue hover:underline"
                  >
                    목록에서 고르기
                  </button>
                )}
              </div>
            ) : (
              <SelectField
                id="csvBankName"
                label="은행명"
                required
                value={bankName}
                options={[
                  ...preview.bankOptions.map((bank) => ({
                    value: bank,
                    label: bank,
                  })),
                  { value: CUSTOM, label: '직접 입력' },
                ]}
                onChange={(value) => {
                  if (value === CUSTOM) {
                    setIsBankCustom(true);
                    setBankName('');
                    return;
                  }
                  setBankName(value);
                }}
              />
            )}

            <ModeGroup
              name="csvDateTimeMode"
              label="일시 입력 방식"
              value={dateTimeMode}
              options={DATE_TIME_MODES}
              onChange={setDateTimeMode}
            />

            {dateTimeMode === 'SINGLE' ? (
              <ColumnField
                {...columnProps}
                field="tradedDateTimeColumn"
                label="거래일시"
                required
              />
            ) : (
              <>
                <ColumnField
                  {...columnProps}
                  field="tradedDateColumn"
                  label="거래일자"
                  required
                />
                <ColumnField
                  {...columnProps}
                  field="tradedTimeColumn"
                  label="거래시간"
                  required
                />
              </>
            )}

            <ModeGroup
              name="csvAmountMode"
              label="금액 입력 방식"
              value={amountMode}
              options={AMOUNT_MODES}
              onChange={setAmountMode}
            />

            {amountMode === 'SINGLE_WITH_TYPE' ? (
              <>
                <ColumnField
                  {...columnProps}
                  field="amountColumn"
                  label="금액"
                  required
                />
                <ColumnField
                  {...columnProps}
                  field="typeColumn"
                  label="구분(입금 · 출금)"
                  required
                />
              </>
            ) : (
              <>
                <ColumnField
                  {...columnProps}
                  field="incomeAmountColumn"
                  label="입금액"
                  required
                />
                <ColumnField
                  {...columnProps}
                  field="outcomeAmountColumn"
                  label="출금액"
                  required
                />
              </>
            )}

            <ColumnField
              {...columnProps}
              field="depositorColumn"
              label="입금자명"
              hint="입금자명 · 수취인명 · 거래처명이 담긴 컬럼"
              required
            />
            <ColumnField
              {...columnProps}
              field="memoColumn"
              label="적요"
              hint="적요 · 비고 · 메모"
            />
            <ColumnField
              {...columnProps}
              field="balanceColumn"
              label="거래 후 잔액"
              hint="넣어 두면 나중에 대사할 때 도움이 됩니다"
            />
          </div>

          {error && (
            <AlertBanner tone="danger" className="mt-4">
              {error}
            </AlertBanner>
          )}

          <p className="mt-4 rounded-lg bg-bg-surface px-4 py-3 text-caption break-keep text-text-secondary">
            은행마다 파일 형식이 달라 컬럼을 맞춰야 합니다. 파일에 없는 이름은
            <b> 직접 입력</b>으로 적을 수 있고, 적요 · 거래 후 잔액은 비워 둬도
            됩니다.
          </p>
        </div>
      </div>

      <div className="mt-4 flex justify-between">
        <button
          type="button"
          onClick={onBack}
          className="btn btn-md btn-gray-outlined"
        >
          이전
        </button>
        {/* 필수 칸이 비면 **누를 수 없게** 한다 — 눌러서 오류를 보는 것보다 낫다 */}
        <button
          type="submit"
          disabled={isSubmitting || validate() !== null}
          title={validate() ?? undefined}
          className="btn btn-md btn-primary"
        >
          {isSubmitting ? '등록 중…' : '등록하기'}
        </button>
      </div>
    </form>
  );
}

/** 선택하지 않아도 되는 칸 */
function isOptional(field: MappingField) {
  return field === 'memoColumn' || field === 'balanceColumn';
}
