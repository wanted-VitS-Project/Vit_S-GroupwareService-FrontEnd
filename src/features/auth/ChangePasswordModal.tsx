'use client';

import { useState } from 'react';

import Modal, { ModalButton } from '@/components/Modal';
import PasswordVisibilityToggle from '@/components/PasswordVisibilityToggle';
import { messageOf } from '@/lib/api';

import { changePassword } from './api';
import { isValidPassword, PASSWORD_RULES } from './password';

interface ChangePasswordModalProps {
  /** 강제 변경(RESET_REQUIRED) — 현재 비밀번호를 묻지 않고 닫을 수도 없다 */
  forced?: boolean;
  /** 약관 동의에서 이어질 때 '2 / 2' 처럼 남은 단계를 알려준다 */
  stepLabel?: string;
  /** 있으면 약관 단계로 돌아가는 '이전' 버튼을 보여준다 */
  onBack?: () => void;
  onClose?: () => void;
  onDone: () => void;
}

export default function ChangePasswordModal({
  forced,
  stepLabel,
  onBack,
  onClose,
  onDone,
}: ChangePasswordModalProps) {
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [passwordConfirm, setPasswordConfirm] = useState('');
  const [error, setError] = useState('');
  const [isPending, setIsPending] = useState(false);
  const [isDone, setIsDone] = useState(false);

  // 입력 중에 바로 알려준다 — 제출해야 알 수 있으면 늦다
  const isMismatched =
    passwordConfirm !== '' && newPassword !== passwordConfirm;

  const canSubmit =
    (forced || currentPassword !== '') &&
    isValidPassword(newPassword) &&
    passwordConfirm !== '' &&
    !isMismatched &&
    !isPending;

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    if (!canSubmit) return;

    setError('');
    setIsPending(true);

    try {
      await changePassword({
        // 강제 변경은 currentPassword 를 보내지 않는다
        ...(forced ? {} : { currentPassword }),
        newPassword,
        newPasswordConfirm: passwordConfirm,
      });

      // 완료 화면을 어떻게 닫든 재조회가 유실되지 않게 성공 시점에 부른다
      onDone();
      if (!forced) setIsDone(true);
    } catch (caught) {
      // 현재 비밀번호 불일치 · 정책 위반은 백엔드 문구가 가장 정확하다
      setError(
        messageOf(
          caught,
          '비밀번호를 변경하지 못했습니다. 잠시 후 다시 시도해주세요.',
        ),
      );
    } finally {
      setIsPending(false);
    }
  }

  if (isDone) {
    return (
      <Modal title="비밀번호 변경" onClose={onClose}>
        <p className="mt-4 text-body-m text-text-secondary">
          비밀번호를 변경했습니다.
          <br />
          다음 로그인부터 새 비밀번호를 사용해주세요.
        </p>
        <ModalButton onClick={onClose}>확인</ModalButton>
      </Modal>
    );
  }

  return (
    <Modal
      title="비밀번호 변경"
      stepLabel={stepLabel}
      onClose={forced ? undefined : onClose}
    >
      <form onSubmit={handleSubmit}>
        <p className="mt-2 text-body-m text-text-secondary">
          {forced
            ? '최초 로그인입니다. 안전한 사용을 위해 비밀번호를 변경해주세요.'
            : '새 비밀번호를 입력해주세요.'}
        </p>

        <div className="mt-6 space-y-4">
          {!forced && (
            <PasswordField
              id="currentPassword"
              label="현재 비밀번호"
              value={currentPassword}
              onChange={setCurrentPassword}
              autoComplete="current-password"
            />
          )}
          <PasswordField
            id="newPassword"
            label="새 비밀번호"
            value={newPassword}
            onChange={setNewPassword}
          />
          <PasswordField
            id="newPasswordConfirm"
            label="새 비밀번호 확인"
            value={passwordConfirm}
            onChange={setPasswordConfirm}
            invalid={isMismatched}
            description={isMismatched ? '비밀번호가 서로 다릅니다.' : undefined}
          />
        </div>

        <ul className="mt-6 space-y-1.5 rounded-button-sm bg-bg-hover p-4">
          {PASSWORD_RULES.map((rule) => {
            const isMet = rule.test(newPassword);

            return (
              <li
                key={rule.label}
                className={`flex items-center gap-2 text-label ${
                  isMet ? 'text-green-text' : 'text-text-muted'
                }`}
              >
                <CheckIcon filled={isMet} />
                {rule.label}
              </li>
            );
          })}
        </ul>

        {/* 에러가 떠도 버튼 위치가 흔들리지 않게 자리를 잡아둔다 */}
        <p role="alert" className="mt-4 min-h-5 text-label text-text-danger">
          {error}
        </p>

        <ModalButton type="submit" disabled={!canSubmit}>
          {isPending ? '변경 중…' : forced ? '변경하고 시작하기' : '변경하기'}
        </ModalButton>

        {onBack && (
          <button
            type="button"
            onClick={onBack}
            className="mt-2 w-full cursor-pointer rounded-lg py-2.5 text-body-m font-bold text-text-secondary transition-colors hover:bg-bg-hover"
          >
            이전
          </button>
        )}
      </form>
    </Modal>
  );
}

interface PasswordFieldProps {
  id: string;
  label: string;
  value: string;
  onChange: (value: string) => void;
  autoComplete?: string;
  invalid?: boolean;
  /** 입력 아래에 붙는 안내. invalid 와 함께 스크린리더에 전달된다 */
  description?: string;
}

function PasswordField({
  id,
  label,
  value,
  onChange,
  autoComplete = 'new-password',
  invalid,
  description,
}: PasswordFieldProps) {
  const descriptionId = `${id}-description`;
  const [isVisible, setIsVisible] = useState(false);

  return (
    <div className="space-y-1.5">
      <label htmlFor={id} className="block text-label text-text-secondary">
        {label}
      </label>
      <div className="relative">
        <input
          id={id}
          type={isVisible ? 'text' : 'password'}
          value={value}
          onChange={(event) => onChange(event.target.value)}
          autoComplete={autoComplete}
          aria-invalid={invalid}
          aria-describedby={description ? descriptionId : undefined}
          // pr-10 — 토글 버튼과 입력 글자가 겹치지 않게 자리를 비운다
          className={`w-full rounded-button-sm border py-2 pr-10 pl-3 text-body-m outline-none ${
            invalid
              ? 'border-red-border'
              : 'border-border-default focus:border-text-primary'
          }`}
        />
        <PasswordVisibilityToggle
          isVisible={isVisible}
          onToggle={() => setIsVisible((visible) => !visible)}
          small
          className="right-1.5"
        />
      </div>
      {description && (
        <p id={descriptionId} className="text-label text-text-danger">
          {description}
        </p>
      )}
    </div>
  );
}

function CheckIcon({ filled }: { filled: boolean }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
      className="size-3.5 shrink-0"
    >
      {filled ? <path d="m4 12 5 5L20 6" /> : <circle cx="12" cy="12" r="8" />}
    </svg>
  );
}
