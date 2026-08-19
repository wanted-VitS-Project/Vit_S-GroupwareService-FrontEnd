'use client';
import { dateInputProps } from '@/lib/dateInput';

/**
 * 공고 직접 등록 · 수정 폼이 함께 쓰는 입력 컴포넌트.
 * 사원 폼과 라벨 · 에러 · 간격 규칙이 같지만 도메인끼리 import 하지 않아 따로 둔다.
 */

/**
 * 입력에 연결할 설명 요소.
 * 에러가 있으면 에러를, 없으면 안내 문구를 읽어준다.
 */
function describedBy(id: string, error?: string, hint?: string) {
  if (error) return `${id}-error`;
  return hint ? `${id}-hint` : undefined;
}

function FieldShell({
  id,
  label,
  required,
  error,
  hint,
  children,
}: {
  id: string;
  label: string;
  required?: boolean;
  error?: string;
  /** 에러가 없을 때만 보인다. 둘이 동시에 뜨면 시선이 갈린다 */
  hint?: string;
  children: React.ReactNode;
}) {
  return (
    <div>
      <label
        htmlFor={id}
        className="block pb-1.5 text-caption font-semibold text-text-primary"
      >
        {label} {required && <span className="text-text-danger">*</span>}
      </label>
      {children}
      {error ? (
        <p
          id={`${id}-error`}
          role="alert"
          className="mt-1 text-micro break-keep text-text-danger"
        >
          {error}
        </p>
      ) : (
        hint && (
          <p
            id={`${id}-hint`}
            /**
             * break-keep 만 두면 띄어쓰기 없는 긴 값이 칸 밖으로 넘친다.
             * 한글은 단어 단위로 끊되 끊을 곳이 없으면 아무 데서나 끊게 한다.
             */
            className="mt-1 text-micro [overflow-wrap:anywhere] break-keep text-text-secondary"
          >
            {hint}
          </p>
        )
      )}
    </div>
  );
}

/**
 * 입력 스타일은 globals.css 의 공용 .input 을 쓴다.
 * 글자만 text-label(14px)로 덮는다. 항목이 많은 폼이라 기본 16px 는 과하다.
 */
function controlClass(hasError: boolean) {
  return `input text-label ${hasError ? 'input-error' : ''}`;
}

interface BaseProps {
  id: string;
  label: string;
  required?: boolean;
  value: string;
  error?: string;
  hint?: string;
  disabled?: boolean;
  onChange: (value: string) => void;
}

/**
 * 한 줄 입력. type 으로 일시(datetime-local) · URL 까지 겸한다.
 * datetime-local 값은 초가 없어 전송 직전에 :00 을 붙인다.
 */
export function TextField({
  type = 'text',
  placeholder,
  maxLength,
  ...props
}: BaseProps & { type?: string; placeholder?: string; maxLength?: number }) {
  const { id, label, required, value, error, hint, disabled, onChange } = props;

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
        {...dateInputProps(type)}
        value={value}
        placeholder={placeholder}
        maxLength={maxLength}
        disabled={disabled}
        onChange={(event) => onChange(event.target.value)}
        aria-required={required || undefined}
        aria-invalid={error ? true : undefined}
        aria-describedby={describedBy(id, error, hint)}
        className={controlClass(error !== undefined)}
      />
    </FieldShell>
  );
}

/** 금액 입력의 최대 자릿수. 15자리면 계약금액에 충분하다 */
export const AMOUNT_MAX_DIGITS = 15;

/**
 * 문자열 그대로 천 단위 구분을 넣는다.
 * toLocaleString() 은 숫자가 아닌 값에 NaN 을 띄우고 큰 수의 정밀도를 깎는다.
 */
function groupDigits(value: string) {
  const digits = value.replace(/\D/g, '');
  return digits.replace(/\B(?=(\d{3})+(?!\d))/g, ',');
}

/**
 * 금액 입력. 값은 문자열로 다루고 화면에만 콤마를 넣는다.
 * input type=number 는 자릿수가 큰 금액에서 읽기 어렵다.
 */
export function AmountField({
  placeholder,
  ...props
}: BaseProps & { placeholder?: string }) {
  const { id, label, required, value, error, hint, disabled, onChange } = props;
  const display = groupDigits(value);

  return (
    <FieldShell
      id={id}
      label={label}
      required={required}
      error={error}
      hint={hint}
    >
      <div className="relative">
        <input
          id={id}
          type="text"
          inputMode="numeric"
          value={display}
          placeholder={placeholder}
          disabled={disabled}
          // 숫자만 남긴다. 콤마를 지우고 다시 넣는 편이 커서 튐이 적다
          // 자릿수를 막지 않으면 Number() 가 Infinity 가 되어 null 로 전송된다
          onChange={(event) =>
            onChange(
              event.target.value.replace(/\D/g, '').slice(0, AMOUNT_MAX_DIGITS),
            )
          }
          aria-required={required || undefined}
          aria-invalid={error ? true : undefined}
          aria-describedby={describedBy(id, error, hint)}
          className={`${controlClass(error !== undefined)} pr-8`}
        />
        <span className="pointer-events-none absolute top-1/2 right-3 -translate-y-1/2 text-micro text-text-secondary">
          원
        </span>
      </div>
    </FieldShell>
  );
}

/** 여러 줄 입력. 참가 자격처럼 원문을 그대로 담는 항목에 쓴다 */
export function TextareaField({
  placeholder,
  rows = 3,
  ...props
}: BaseProps & { placeholder?: string; rows?: number }) {
  const { id, label, required, value, error, hint, disabled, onChange } = props;

  return (
    <FieldShell
      id={id}
      label={label}
      required={required}
      error={error}
      hint={hint}
    >
      <textarea
        id={id}
        rows={rows}
        value={value}
        placeholder={placeholder}
        disabled={disabled}
        onChange={(event) => onChange(event.target.value)}
        aria-required={required || undefined}
        aria-invalid={error ? true : undefined}
        aria-describedby={describedBy(id, error, hint)}
        className={`${controlClass(error !== undefined)} textarea`}
      />
    </FieldShell>
  );
}

export function SelectField({
  options,
  emptyLabel,
  ...props
}: BaseProps & {
  options: { value: string; label: string }[];
  /** 빈 값 선택지 문구. 필수 항목은 선택해주세요 */
  emptyLabel?: string;
}) {
  const { id, label, required, value, error, hint, disabled, onChange } = props;

  return (
    <FieldShell
      id={id}
      label={label}
      required={required}
      error={error}
      hint={hint}
    >
      <select
        id={id}
        value={value}
        disabled={disabled}
        onChange={(event) => onChange(event.target.value)}
        aria-required={required || undefined}
        aria-invalid={error ? true : undefined}
        aria-describedby={describedBy(id, error, hint)}
        className={`${controlClass(error !== undefined)} cursor-pointer`}
      >
        {emptyLabel && <option value="">{emptyLabel}</option>}
        {options.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
    </FieldShell>
  );
}

/** 체크박스. 라벨이 오른쪽이라 FieldShell 을 쓰지 않는다 */
export function CheckboxField({
  id,
  label,
  hint,
  checked,
  disabled,
  onChange,
}: {
  id: string;
  label: string;
  hint?: string;
  checked: boolean;
  disabled?: boolean;
  onChange: (checked: boolean) => void;
}) {
  return (
    <div>
      <label
        htmlFor={id}
        className="flex cursor-pointer items-center gap-2 text-caption font-semibold text-text-primary"
      >
        <input
          id={id}
          type="checkbox"
          checked={checked}
          disabled={disabled}
          onChange={(event) => onChange(event.target.checked)}
          className="size-3.5 cursor-pointer accent-btn-primary"
        />
        {label}
      </label>
      {hint && (
        <p className="mt-1 text-micro break-keep text-text-secondary">{hint}</p>
      )}
    </div>
  );
}

/**
 * 폼 · 카드 위에 뜨는 안내 띠.
 * danger 는 사용자가 고쳐야 하는 것, warning 은 고칠 게 없는 상황 안내에 쓴다.
 */
export function AlertBanner({
  tone,
  className = '',
  children,
}: {
  tone: 'danger' | 'warning';
  className?: string;
  children: React.ReactNode;
}) {
  const toneClass =
    tone === 'danger'
      ? 'border-red-border bg-red-bg-soft text-red-text'
      : 'border-yellow-border bg-yellow-bg-soft text-yellow-text';

  return (
    <p
      role={tone === 'danger' ? 'alert' : 'status'}
      className={`rounded-lg border px-4 py-3 text-caption break-keep ${toneClass} ${className}`}
    >
      {children}
    </p>
  );
}

/** 폼 안의 구획. 항목이 20개 가까워 묶어주지 않으면 읽기 어렵다 */
export function FormSection({
  title,
  description,
  children,
}: {
  title: string;
  description?: string;
  children: React.ReactNode;
}) {
  return (
    <section className="rounded-base border border-border-default bg-bg-card p-5">
      <h3 className="text-label font-bold text-text-primary">{title}</h3>
      {description && (
        <p className="mt-1 text-micro break-keep text-text-secondary">
          {description}
        </p>
      )}
      <div className="mt-4 grid gap-4 sm:grid-cols-2">{children}</div>
    </section>
  );
}
