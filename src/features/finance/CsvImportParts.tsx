'use client';

import { useState } from 'react';

import DataTable, { type DataTableColumn } from '@/components/DataTable';
import { SelectField, TextField } from '@/features/bidding/FormFields';

/**
 * CSV 수집 화면의 공용 부품. 입출금과 세금계산서가 같은 세 단계를 걷는다.
 * 도메인 문구는 각 화면에 두고 여기에는 껍데기만 모은다.
 */

/** 셀렉트의 특별한 두 값. 컬럼명과 겹치지 않게 화살괄호를 쓴다 */
export const NONE = '';
export const CUSTOM = '<직접 입력>';

/** 받을 수 있는 파일. 백엔드가 CSV · 엑셀 둘 다 파싱한다 */
export const CSV_ACCEPT = '.csv,.xlsx,.xls';

/** 지금 어느 단계인지 보여주는 표시 */
export function StepBar({
  steps,
  current,
}: {
  steps: readonly string[];
  current: number;
}) {
  return (
    <ol className="flex flex-wrap items-center gap-2">
      {steps.map((label, index) => (
        /* 색과 굵기만으로는 보조기술에 전달되지 않아 상태를 함께 준다 */
        <li
          key={label}
          aria-current={index === current ? 'step' : undefined}
          className="flex items-center gap-2"
        >
          <span
            className={`flex size-5 items-center justify-center rounded-pill text-detail font-bold ${
              index <= current
                ? 'bg-btn-primary text-text-white'
                : 'bg-bg-hover text-text-muted'
            }`}
          >
            {index + 1}
          </span>
          <span
            className={`text-caption ${
              index === current
                ? 'font-semibold text-text-primary'
                : 'text-text-secondary'
            }`}
          >
            {label}
          </span>
          {index < steps.length - 1 && (
            <span aria-hidden className="mx-1 text-text-muted">
              ›
            </span>
          )}
        </li>
      ))}
    </ol>
  );
}

/**
 * 파일 선택. 클릭과 드래그 앤 드롭을 함께 받는다.
 * 키보드 접근이 끊기지 않도록 라벨로 감싸 영역 전체를 선택 버튼으로 둔다.
 */
export function FilePicker({
  file,
  isLoading,
  onPick,
}: {
  file: File | null;
  isLoading: boolean;
  onPick: (file: File | null) => void;
}) {
  const [isOver, setIsOver] = useState(false);

  return (
    <label
      onDragOver={(event) => {
        event.preventDefault();
        setIsOver(true);
      }}
      onDragLeave={() => setIsOver(false)}
      onDrop={(event) => {
        event.preventDefault();
        setIsOver(false);
        onPick(event.dataTransfer.files[0] ?? null);
      }}
      /* 입력이 감춰져 있어 포커스를 라벨에서 드러낸다 */
      className={`flex cursor-pointer flex-col items-center justify-center rounded-lg border border-dashed px-5 py-10 text-center transition-colors focus-within:outline-2 focus-within:outline-offset-2 focus-within:outline-border-primary ${
        isOver
          ? 'border-border-primary bg-blue-bg-soft'
          : 'border-border-default hover:bg-bg-surface'
      }`}
    >
      <input
        type="file"
        accept={CSV_ACCEPT}
        disabled={isLoading}
        onChange={(event) => onPick(event.target.files?.[0] ?? null)}
        className="sr-only"
      />

      <span className="text-label font-semibold text-text-primary">
        {file ? file.name : '파일을 끌어다 놓거나 눌러서 선택하세요'}
      </span>
      <span className="mt-1 text-caption text-text-secondary">
        {isLoading ? '파일을 읽는 중입니다…' : 'CSV · 엑셀(.xlsx · .xls)'}
      </span>
    </label>
  );
}

/** 결과 요약 카드의 수치 한 칸 */
export function Figure({
  label,
  value,
  isStrong = false,
}: {
  label: string;
  value: number;
  isStrong?: boolean;
}) {
  return (
    <div>
      <dt className="text-caption text-text-secondary">{label}</dt>
      <dd
        className={`mt-0.5 text-heading-m font-bold ${
          isStrong ? 'text-text-primary-blue' : 'text-text-primary'
        }`}
      >
        {value.toLocaleString('ko-KR')}건
      </dd>
    </div>
  );
}

/** 두 방식 중 하나를 고르는 라디오 묶음 */
export function ModeGroup<T extends string>({
  name,
  label,
  value,
  options,
  onChange,
}: {
  /** 같은 그룹의 라디오는 name 이 같아야 방향키로 옮겨 다닐 수 있다 */
  name: string;
  label: string;
  value: T;
  options: { value: T; label: string }[];
  onChange: (value: T) => void;
}) {
  return (
    <fieldset>
      <legend className="pb-1.5 text-caption font-semibold text-text-primary">
        {label}
      </legend>
      <div className="flex flex-wrap gap-2">
        {options.map((option) => (
          <label
            key={option.value}
            className={`flex flex-1 cursor-pointer items-center gap-2 rounded-lg border px-3 py-2 text-caption ${
              option.value === value
                ? 'border-border-primary bg-blue-bg-soft font-semibold text-text-primary'
                : 'border-border-default text-text-secondary hover:bg-bg-surface'
            }`}
          >
            <input
              type="radio"
              name={name}
              checked={option.value === value}
              onChange={() => onChange(option.value)}
              className="size-3.5 cursor-pointer accent-btn-primary"
            />
            {option.label}
          </label>
        ))}
      </div>
    </fieldset>
  );
}

/**
 * 컬럼 한 칸. 직접 입력을 고르면 셀렉트가 글자 칸으로 바뀐다.
 * 매핑 타입이 화면마다 달라 키를 제네릭으로 받는다.
 */
export function ColumnField<F extends string>({
  field,
  label,
  hint,
  required,
  columns,
  customFields,
  mapping,
  onChange,
  onCustomChange,
}: {
  field: F;
  label: string;
  hint?: string;
  required?: boolean;
  columns: string[];
  customFields: F[];
  mapping: Record<F, string | null>;
  onChange: (field: F, value: string | null) => void;
  onCustomChange: (field: F, isCustom: boolean) => void;
}) {
  const id = `csv-${field}`;
  const value = mapping[field] ?? '';

  if (customFields.includes(field)) {
    return (
      <div>
        <TextField
          id={id}
          label={label}
          required={required}
          value={value}
          placeholder="파일의 컬럼명과 동일하게 입력"
          hint={hint}
          onChange={(next) => onChange(field, next)}
        />
        {/* 되돌릴 길이 없으면 잘못 골랐을 때 파일부터 다시 올려야 한다 */}
        <button
          type="button"
          onClick={() => onCustomChange(field, false)}
          className="mt-1 cursor-pointer text-micro text-text-primary-blue hover:underline"
        >
          목록에서 고르기
        </button>
      </div>
    );
  }

  return (
    <SelectField
      id={id}
      label={label}
      required={required}
      value={value}
      hint={hint}
      emptyLabel={required ? '선택해주세요' : '선택 안 함'}
      options={[
        ...columns.map((column) => ({ value: column, label: column })),
        { value: CUSTOM, label: '직접 입력' },
      ]}
      onChange={(next) => {
        if (next === CUSTOM) {
          onCustomChange(field, true);
          return;
        }
        onChange(field, next === NONE ? null : next);
      }}
    />
  );
}

/** 상위 5행 미리보기 */
export function SamplePreview({
  columns,
  rows,
}: {
  columns: string[];
  rows: Record<string, string>[];
}) {
  /* 컬럼 수가 파일마다 달라 여기서는 가로 스크롤을 허용한다 */
  const tableColumns: DataTableColumn<Record<string, string>>[] = columns.map(
    (column) => ({
      key: column,
      header: column,
      width: '8rem',
      cell: (row) => (
        <span className="block [overflow-wrap:anywhere] break-keep text-text-secondary">
          {row[column] || '-'}
        </span>
      ),
    }),
  );

  return (
    <div className="rounded-base border border-border-default bg-bg-card p-6">
      <p className="mb-4 text-label font-bold text-text-primary">
        파일 미리보기{' '}
        <span className="text-caption font-medium text-text-secondary">
          (상위 {rows.length}행)
        </span>
      </p>

      <DataTable
        caption="업로드한 파일의 상위 행"
        columns={tableColumns}
        rows={rows}
        minWidth={columns.length * 128}
        dense
      />
    </div>
  );
}
