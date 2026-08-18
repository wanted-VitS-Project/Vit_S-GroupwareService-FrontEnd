'use client';

import { Skeleton } from '@/components/Skeleton';

/**
 * 사원 등록 · 수정 폼이 함께 쓰는 입력 컴포넌트.
 * 라벨 · 에러 · 안내 문구의 위치와 간격을 한 곳에서 잡는다.
 */

/**
 * 입력에 연결할 설명 요소.
 * 에러가 있으면 에러를, 없으면 안내 문구를 읽어준다.
 */
function describedBy(id: string, error?: string, hint?: string) {
  if (error) return `${id}-error`;
  return hint ? `${id}-hint` : undefined;
}

interface FieldShellProps {
  id: string;
  label: string;
  required?: boolean;
  error?: string;
  /** 에러가 없을 때만 보인다. 둘이 동시에 뜨면 시선이 갈린다 */
  hint?: string;
  children: React.ReactNode;
}

function FieldShell({
  id,
  label,
  required,
  error,
  hint,
  children,
}: FieldShellProps) {
  return (
    <div>
      <label
        htmlFor={id}
        className="block pb-1.5 text-detail font-semibold text-text-primary"
      >
        {label} {required && <span className="text-text-danger">*</span>}
      </label>
      {children}
      {error ? (
        <p
          id={`${id}-error`}
          role="alert"
          className="mt-1 text-caption break-keep text-text-danger"
        >
          {error}
        </p>
      ) : (
        hint && (
          <p
            id={`${id}-hint`}
            className="mt-1 text-caption break-keep text-text-secondary"
          >
            {hint}
          </p>
        )
      )}
    </div>
  );
}

/** 에러가 있을 때만 테두리를 빨갛게 한다. 입력 · 셀렉트가 같은 규칙을 쓴다 */
function controlClass(hasError: boolean) {
  return `w-full rounded-lg border bg-bg-surface px-3 py-2 text-detail text-text-primary placeholder:text-text-secondary focus:outline-2 focus:outline-offset-2 ${
    hasError
      ? 'border-border-danger focus:outline-border-danger'
      : 'border-border-default focus:outline-border-primary'
  }`;
}

export function TextField({
  id,
  label,
  type = 'text',
  required,
  placeholder,
  maxLength,
  min,
  max,
  value,
  error,
  hint,
  onChange,
}: {
  id: string;
  label: string;
  type?: string;
  required?: boolean;
  placeholder?: string;
  maxLength?: number;
  /**
   * 날짜 입력의 상 · 하한.
   * 상한이 없으면 브라우저가 연도를 6자리까지 받아 서버에서 400 이 된다.
   */
  min?: string;
  max?: string;
  value: string;
  error?: string;
  hint?: string;
  onChange: (value: string) => void;
}) {
  return (
    <FieldShell
      id={id}
      label={label}
      required={required}
      error={error}
      hint={hint}
    >
      <input
        id={id}
        type={type}
        value={value}
        placeholder={placeholder}
        maxLength={maxLength}
        min={min}
        max={max}
        onChange={(event) => onChange(event.target.value)}
        aria-required={required || undefined}
        aria-invalid={error ? true : undefined}
        aria-describedby={describedBy(id, error, hint)}
        className={controlClass(error !== undefined)}
      />
    </FieldShell>
  );
}

export function SelectField({
  id,
  label,
  required,
  emptyLabel,
  value,
  error,
  hint,
  options,
  isLoading = false,
  onChange,
}: {
  id: string;
  label: string;
  required?: boolean;
  /**
   * 빈 값 선택지 문구.
   * 수정 폼은 미지정(고르면 배정을 지운다), 등록 폼 필수 항목은 선택해주세요 다.
   */
  emptyLabel: string;
  value: string;
  error?: string;
  hint?: string;
  options: { value: string; label: string }[];
  isLoading?: boolean;
  onChange: (value: string) => void;
}) {
  return (
    <FieldShell
      id={id}
      label={label}
      required={required}
      error={error}
      hint={hint}
    >
      {isLoading ? (
        <Skeleton className="h-[34px] w-full" />
      ) : (
        <select
          id={id}
          value={value}
          onChange={(event) => onChange(event.target.value)}
          aria-required={required || undefined}
          aria-invalid={error ? true : undefined}
          aria-describedby={describedBy(id, error, hint)}
          className={`${controlClass(error !== undefined)} cursor-pointer`}
        >
          <option value="">{emptyLabel}</option>
          {options.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>
      )}
    </FieldShell>
  );
}
