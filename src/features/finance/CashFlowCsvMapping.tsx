'use client';

import { useState } from 'react';

import { notifyToast } from '@/components/Toast';
import {
  AlertBanner,
  SelectField,
  TextField,
} from '@/features/bidding/FormFields';
import { messageOf } from '@/lib/api';
import { focusInvalidField } from '@/lib/focusField';

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
 * 컬럼 맞추기(2단계). 추천값을 채워 두고 사람이 고친다.
 * 거래 고유번호는 서버가 만들어 매핑하지 않는다.
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
  /** 자동으로 잡지 않는다 — 파일에서 추론한 은행이 틀려도 사람이 눈치채지 못한다 */
  const [bankName, setBankName] = useState('');
  const [isBankCustom, setIsBankCustom] = useState(
    preview.bankOptions.length === 0,
  );
  /** 제출을 눌러 본 뒤에만 빈 칸을 빨갛게 칠한다 (열자마자 붉은 화면이 되지 않게) */
  const [hasTriedSubmit, setHasTriedSubmit] = useState(false);
  const [dateTimeMode, setDateTimeMode] = useState<CsvDateTimeMode>(
    preview.recommendedDateTimeMode,
  );
  const [amountMode, setAmountMode] = useState<CsvAmountMode>(
    preview.recommendedAmountMode,
  );
  const [mapping, setMapping] = useState<CsvColumnMapping>(
    preview.recommendedMapping,
  );
  /** 직접 입력으로 바꾼 칸. 셀렉트 대신 글자 칸을 그린다 */
  const [customFields, setCustomFields] = useState<MappingField[]>([]);

  const [error, setError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  /** 제출을 눌러 본 뒤 비어 있을 때만 나온다 */
  const bankError =
    hasTriedSubmit && bankName.trim() === ''
      ? '은행명을 입력해주세요.'
      : undefined;

  function setColumn(field: MappingField, value: string | null) {
    setMapping((prev) => ({ ...prev, [field]: value }));
    setError('');
  }

  function toggleCustom(field: MappingField, isCustom: boolean) {
    setCustomFields((prev) =>
      isCustom ? [...prev, field] : prev.filter((item) => item !== field),
    );
    // 남은 값이 딸려 가지 않도록 방식을 바꾸면 값도 비운다
    setColumn(field, isCustom ? '' : null);
  }

  /** 방식에 따라 꼭 채워야 하는 칸 */
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

    setHasTriedSubmit(true);

    const message = validate();
    if (message) {
      setError(message);
      if (bankName.trim() === '') focusInvalidField('csvBankName');
      return;
    }

    setIsSubmitting(true);

    try {
      // 쓰지 않는 칸은 null 로 정리해 보낸다
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

      const uploaded = await uploadCashFlowCsv(file, {
        ...cleaned,
        bankName: bankName.trim(),
        dateTimeMode,
        amountMode,
        ...(password ? { password } : {}),
      });

      onUploaded(uploaded);
      notifyToast('CSV 업로드를 마쳤습니다.');
    } catch (caught) {
      const message = messageOf(caught, '업로드하지 못했습니다.');

      setError(message);
      // 처리가 오래 걸려 그 사이 화면을 옮겼을 수 있다
      notifyToast(message, 'error');
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
      {/* 파일을 먼저 보고 컬럼을 고르는 순서라 미리보기를 위에 둔다 */}
      <div className="mt-4 flex flex-col gap-4">
        <SamplePreview columns={preview.columns} rows={preview.sampleRows} />

        <div className="rounded-base border border-border-default bg-bg-card p-6">
          <p className="mb-4 text-label font-bold text-text-primary">
            컬럼 매핑
          </p>

          <div className="flex flex-col gap-5">
            {/* 은행명은 파일에 없어 사람이 고르거나 적는다 */}
            {isBankCustom ? (
              <div>
                <TextField
                  id="csvBankName"
                  label="은행명"
                  required
                  value={bankName}
                  placeholder="은행명을 입력하세요"
                  error={bankError}
                  onChange={setBankName}
                />
                {preview.bankOptions.length > 0 && (
                  <button
                    type="button"
                    onClick={() => {
                      setIsBankCustom(false);
                      setBankName('');
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
                emptyLabel="은행을 선택하세요"
                error={bankError}
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
        {/* 필수 칸이 비면 누를 수 없게 한다 */}
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
