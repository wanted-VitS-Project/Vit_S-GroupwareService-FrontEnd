'use client';

import { useState } from 'react';

import { AlertBanner } from '@/features/bidding/FormFields';
import { messageOf } from '@/lib/api';

import { uploadTaxInvoiceCsv } from './api';
import { ColumnField, ModeGroup, SamplePreview } from './CsvImportParts';
import type {
  TaxInvoiceCsvMapping as Mapping,
  TaxInvoiceCsvPreview,
  TaxInvoiceCsvUploadResult,
  TaxInvoiceType,
} from './types';

type MappingField = keyof Mapping;

const TYPES: { value: TaxInvoiceType; label: string }[] = [
  { value: 'INCOME', label: '매출 (우리가 발행)' },
  { value: 'OUTCOME', label: '매입 (우리가 수취)' },
];

/**
 * 꼭 채워야 하는 여덟 칸.
 *
 * ⚠️ 입출금과 달리 **방식에 따라 갈리지 않는다** — 홈택스 파일은 형식이 하나라
 *    필수 목록이 고정이다. 그래서 상수로 둔다.
 */
const REQUIRED_FIELDS: MappingField[] = [
  'approvalNoColumn',
  'issuedDateColumn',
  'supplierBizNoColumn',
  'buyerBizNoColumn',
  'buyerNameColumn',
  'supplyAmountColumn',
  'taxAmountColumn',
  'totalAmountColumn',
];

/**
 * 컬럼 맞추기 (2단계). (#16)
 *
 * 추천값을 받아 채워 두고 사람이 고친다 — 홈택스에서 내려받는 방식에 따라 컬럼 이름이
 * 달라 추천이 빗나갈 수 있다. 파일에 없는 이름을 써야 하는 경우가 있어 모든 칸에
 * `직접 입력` 을, 필수가 아닌 칸에는 `선택 안 함` 을 둔다.
 *
 * ⚠️ **구분(매출 · 매입)은 파일에 없을 수 있다** — 서버 추천(`recommendedType`)이
 *    `null` 로 오면 매출로 단정하지 않고 사람이 고르게 둔다.
 */
export default function TaxInvoiceCsvMapping({
  file,
  preview,
  password,
  onUploaded,
  onBack,
}: {
  file: File;
  preview: TaxInvoiceCsvPreview;
  /** 비밀번호가 걸린 엑셀이면 업로드에도 함께 보낸다 */
  password?: string;
  onUploaded: (result: TaxInvoiceCsvUploadResult) => void;
  onBack: () => void;
}) {
  const [type, setType] = useState<TaxInvoiceType>(
    preview.recommendedType ?? 'INCOME',
  );
  const [mapping, setMapping] = useState<Mapping>(preview.recommendedMapping);
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

  function validate() {
    const missing = REQUIRED_FIELDS.some(
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
      // 빈 문자열은 `null` 로 정리해 보낸다 — 서버가 빈 이름의 컬럼을 찾지 않게 한다
      const trimmed = (field: MappingField) =>
        (mapping[field] ?? '').trim() || null;

      const cleaned: Mapping = {
        approvalNoColumn: trimmed('approvalNoColumn'),
        issuedDateColumn: trimmed('issuedDateColumn'),
        supplierBizNoColumn: trimmed('supplierBizNoColumn'),
        buyerBizNoColumn: trimmed('buyerBizNoColumn'),
        buyerNameColumn: trimmed('buyerNameColumn'),
        supplyAmountColumn: trimmed('supplyAmountColumn'),
        taxAmountColumn: trimmed('taxAmountColumn'),
        totalAmountColumn: trimmed('totalAmountColumn'),
        itemNameColumn: trimmed('itemNameColumn'),
        ceoNameColumn: trimmed('ceoNameColumn'),
        subBizNoColumn: trimmed('subBizNoColumn'),
        memoColumn: trimmed('memoColumn'),
      };

      onUploaded(
        await uploadTaxInvoiceCsv(file, {
          ...cleaned,
          type,
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
      {/* 미리보기를 **위**에, 매핑을 아래에 둔다 — 파일을 먼저 보고 컬럼을 고르는 순서다 */}
      <div className="mt-4 flex flex-col gap-4">
        <SamplePreview columns={preview.columns} rows={preview.sampleRows} />

        <div className="rounded-base border border-border-default bg-bg-card p-6">
          <p className="mb-4 text-label font-bold text-text-primary">
            컬럼 매핑
          </p>

          <div className="flex flex-col gap-5">
            <ModeGroup
              name="taxInvoiceType"
              label="구분"
              value={type}
              options={TYPES}
              onChange={setType}
            />

            <ColumnField
              {...columnProps}
              field="approvalNoColumn"
              label="승인번호"
              hint="같은 승인번호는 다시 등록되지 않습니다"
              required
            />
            <ColumnField
              {...columnProps}
              field="issuedDateColumn"
              label="작성일자"
              required
            />
            <ColumnField
              {...columnProps}
              field="supplierBizNoColumn"
              label="공급자 사업자번호"
              required
            />
            <ColumnField
              {...columnProps}
              field="buyerBizNoColumn"
              label="공급받는자 사업자번호"
              required
            />
            <ColumnField
              {...columnProps}
              field="buyerNameColumn"
              label="공급받는자 상호"
              required
            />
            <ColumnField
              {...columnProps}
              field="supplyAmountColumn"
              label="공급가액"
              required
            />
            <ColumnField
              {...columnProps}
              field="taxAmountColumn"
              label="세액"
              required
            />
            <ColumnField
              {...columnProps}
              field="totalAmountColumn"
              label="합계"
              required
            />

            <ColumnField
              {...columnProps}
              field="itemNameColumn"
              label="품목명"
              hint="비워 둬도 됩니다"
            />
            <ColumnField
              {...columnProps}
              field="ceoNameColumn"
              label="대표자명"
              hint="비워 둬도 됩니다"
            />
            <ColumnField
              {...columnProps}
              field="subBizNoColumn"
              label="종사업장번호"
              hint="비워 둬도 됩니다"
            />
            <ColumnField
              {...columnProps}
              field="memoColumn"
              label="비고 · 메모"
              hint="비워 둬도 됩니다"
            />
          </div>

          {error && (
            <AlertBanner tone="danger" className="mt-4">
              {error}
            </AlertBanner>
          )}

          <p className="mt-4 rounded-lg bg-bg-surface px-4 py-3 text-caption break-keep text-text-secondary">
            내려받은 방식에 따라 컬럼 이름이 달라 맞춰야 합니다. 파일에 없는
            이름은 <b>직접 입력</b>으로 적을 수 있고, 품목명 · 대표자명 ·
            종사업장번호 · 비고는 비워 둬도 됩니다.
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
