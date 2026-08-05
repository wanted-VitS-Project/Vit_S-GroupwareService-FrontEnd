'use client';

import { useState } from 'react';

import Modal, { ModalButton } from '@/components/Modal';
import { messageOf } from '@/lib/api';

import { changePassword } from './api';
import { isValidPassword, PASSWORD_RULES } from './password';

interface ChangePasswordModalProps {
  /**
   * 강제 변경(passwordStatus=RESET_REQUIRED) 여부.
   * 강제면 현재 비밀번호를 묻지 않고 닫을 수도 없다.
   */
  forced?: boolean;
  /** 일반 모드에서 닫을 때 */
  onClose?: () => void;
  /** 변경에 성공했을 때 */
  onDone: () => void;
}

export default function ChangePasswordModal({
  forced,
  onClose,
  onDone,
}: ChangePasswordModalProps) {
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [passwordConfirm, setPasswordConfirm] = useState('');
  const [error, setError] = useState('');
  const [isPending, setIsPending] = useState(false);
  const [isDone, setIsDone] = useState(false);

  const canSubmit =
    (forced || currentPassword !== '') &&
    isValidPassword(newPassword) &&
    passwordConfirm !== '' &&
    !isPending;

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    if (!canSubmit) return;

    if (newPassword !== passwordConfirm) {
      setError('비밀번호가 서로 다릅니다.');
      return;
    }

    setError('');
    setIsPending(true);

    try {
      await changePassword({
        // 강제 변경은 currentPassword 를 보내지 않는다
        ...(forced ? {} : { currentPassword }),
        newPassword,
        newPasswordConfirm: passwordConfirm,
      });

      // 강제 모드는 곧바로 흐름을 끝내고, 일반 모드는 결과를 보여준 뒤 사용자가 닫는다
      if (forced) {
        onDone();
        return;
      }
      setIsDone(true);
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
        <p className="mt-4 text-sm text-slate-500">
          비밀번호를 변경했습니다.
          <br />
          다음 로그인부터 새 비밀번호를 사용해주세요.
        </p>
        <ModalButton
          onClick={() => {
            onDone();
            onClose?.();
          }}
        >
          확인
        </ModalButton>
      </Modal>
    );
  }

  return (
    <Modal title="비밀번호 변경" onClose={forced ? undefined : onClose}>
      <form onSubmit={handleSubmit}>
        <p className="mt-2 text-sm text-slate-500">
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
          />
        </div>

        <ul className="mt-6 space-y-1.5 rounded bg-slate-100 p-4">
          {PASSWORD_RULES.map((rule) => {
            const isMet = rule.test(newPassword);

            return (
              <li
                key={rule.label}
                className={`flex items-center gap-2 text-xs ${
                  isMet ? 'text-emerald-600' : 'text-slate-400'
                }`}
              >
                <CheckIcon filled={isMet} />
                {rule.label}
              </li>
            );
          })}
        </ul>

        {/* 에러가 떠도 버튼 위치가 흔들리지 않게 자리를 잡아둔다 */}
        <p role="alert" className="mt-4 min-h-5 text-xs text-rose-600">
          {error}
        </p>

        <ModalButton type="submit" disabled={!canSubmit}>
          {isPending ? '변경 중…' : forced ? '변경하고 시작하기' : '변경하기'}
        </ModalButton>
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
}

function PasswordField({
  id,
  label,
  value,
  onChange,
  autoComplete = 'new-password',
}: PasswordFieldProps) {
  return (
    <div className="space-y-1.5">
      <label htmlFor={id} className="block text-xs text-slate-500">
        {label}
      </label>
      <input
        id={id}
        type="password"
        value={value}
        onChange={(event) => onChange(event.target.value)}
        autoComplete={autoComplete}
        className="w-full rounded border border-slate-200 px-3 py-2 text-sm outline-none focus:border-slate-900"
      />
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
