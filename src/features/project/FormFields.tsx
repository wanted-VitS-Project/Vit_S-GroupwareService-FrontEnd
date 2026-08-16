'use client';

/**
 * 프로젝트 생성 폼이 쓰는 입력 컴포넌트.
 *
 * 공고 폼(`features/bidding/FormFields.tsx`) · 사원 폼과 라벨 · 에러 · 간격 규칙이 같다.
 * 도메인끼리 import 하지 않기로 해 모양만 맞추고, 이 화면이 쓰는 종류만 둔다.
 */

/**
 * 입력에 연결할 설명 요소.
 * 에러가 있으면 에러를, 없으면 안내 문구를 읽어준다 — 화면에 보이는 것과 같은 것을 가리킨다.
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
  /** 에러가 없을 때만 보인다 — 둘이 동시에 뜨면 시선이 갈린다 */
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
 * 입력 스타일은 `globals.css` 의 공용 `.input` 을 쓴다 —
 * 테두리 · 높이 · 포커스 색을 화면마다 다시 정하지 않는다.
 * 글자만 `text-label`(14px)로 덮어 표 본문(`DataTable`)과 크기를 맞춘다.
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

/** 한 줄 입력. `type` 으로 날짜(`date`)까지 겸한다 */
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
        value={value}
        placeholder={placeholder}
        maxLength={maxLength}
        disabled={disabled}
        onChange={(event) => onChange(event.target.value)}
        aria-required={required || undefined}
        aria-invalid={error ? true : undefined}
        aria-describedby={describedBy(id, error, hint)}
        className={controlClass(Boolean(error))}
      />
    </FieldShell>
  );
}

/** 금액 입력의 최대 자릿수 — 15자리(약 999조)면 계약금액에 충분하다 */
export const AMOUNT_MAX_DIGITS = 15;

/**
 * 문자열 그대로 천 단위 구분을 넣는다.
 *
 * ⚠️ `Number(value).toLocaleString()` 을 쓰지 않는다 —
 *    숫자가 아닌 값이 오면 화면에 `NaN` 이 뜨고, 큰 수는 정밀도가 조용히 깎인다.
 */
export function groupDigits(value: string) {
  const digits = value.replace(/\D/g, '');
  return digits.replace(/\B(?=(\d{3})+(?!\d))/g, ',');
}

/**
 * 금액 입력. 값은 문자열로 다루고 화면에만 콤마를 넣는다 —
 * `<input type="number">` 는 자릿수가 큰 계약금액에서 읽기 어렵다.
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
          // 숫자만 남긴다 — 자릿수를 막지 않으면 `Number()` 가 `Infinity` 가 된다
          onChange={(event) =>
            onChange(
              event.target.value.replace(/\D/g, '').slice(0, AMOUNT_MAX_DIGITS),
            )
          }
          aria-required={required || undefined}
          aria-invalid={error ? true : undefined}
          aria-describedby={describedBy(id, error, hint)}
          className={`${controlClass(Boolean(error))} pr-8`}
        />
        <span className="pointer-events-none absolute top-1/2 right-3 -translate-y-1/2 text-micro text-text-secondary">
          원
        </span>
      </div>
    </FieldShell>
  );
}

/** 여러 줄 입력 — 과업 설명처럼 긴 글을 담는 항목에 쓴다 */
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
        className={`${controlClass(Boolean(error))} textarea`}
      />
    </FieldShell>
  );
}

/**
 * 폼 위에 뜨는 안내 띠.
 *
 * `danger` 는 사용자가 고쳐야 하는 것(검증 실패 · 저장 실패),
 * `warning` 은 고칠 게 없는 상황 안내에 쓴다.
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

/**
 * 폼 안의 카드 한 장 — 항목을 묶어주지 않으면 어디까지가 한 덩어리인지 읽기 어렵다.
 *
 * 기본은 **2열**이다 (좁은 화면에서는 1열로 접힌다). 참여자처럼 한 줄짜리 요소가
 * 세로로 쌓이는 카드는 `columns={1}` 로 열을 없애고 세로 간격만 준다.
 */
export function FormCard({
  title,
  description,
  columns = 2,
  children,
}: {
  title: string;
  description?: string;
  columns?: 1 | 2;
  children: React.ReactNode;
}) {
  return (
    <section className="rounded-base border border-border-default bg-bg-card p-6">
      <h3 className="text-label font-semibold text-text-primary">{title}</h3>
      {description && (
        <p className="mt-1 text-micro break-keep text-text-secondary">
          {description}
        </p>
      )}
      <div
        className={`mt-5 grid gap-4 ${columns === 2 ? 'sm:grid-cols-2' : ''}`}
      >
        {children}
      </div>
    </section>
  );
}
