'use client';

import { useRouter } from 'next/navigation';
import { useState } from 'react';

import PasswordVisibilityToggle from '@/components/PasswordVisibilityToggle';
import { login } from '@/features/auth/api';
import { isGateCode, LOGIN_ERROR_MESSAGES } from '@/features/auth/errorCodes';
import { ApiError, messageOf } from '@/lib/api';

/**
 * status 는 같은 값에 여러 의미가 실려서(403 = 비활성 · 잠금 아님) code 로 분기한다.
 * 목록에 없는 코드는 해제 시각이 담긴 423 처럼 백엔드 문구가 더 정확하다.
 */
function loginErrorOf(error: unknown) {
  const known =
    error instanceof ApiError && LOGIN_ERROR_MESSAGES[error.code ?? ''];

  return (
    known ||
    messageOf(
      error,
      '알 수 없는 오류가 발생했습니다. 잠시 후 다시 시도해주세요.',
    )
  );
}

interface FieldProps {
  id: string;
  label: string;
  value: string;
  onChange: (value: string) => void;
  secret?: boolean;
}

function Field({ id, label, value, onChange, secret }: FieldProps) {
  const [isVisible, setIsVisible] = useState(false);
  const type = secret && !isVisible ? 'password' : 'text';

  return (
    <div className="space-y-2">
      <label htmlFor={id} className="block text-sm font-bold">
        {label}
      </label>
      <div className="relative">
        <input
          id={id}
          type={type}
          value={value}
          onChange={(event) => onChange(event.target.value)}
          placeholder={`${label} 입력`}
          autoComplete={secret ? 'current-password' : 'username'}
          className="w-full border-b border-slate-200 py-2 pr-12 text-sm outline-none placeholder:text-slate-400 focus:border-slate-900"
        />
        {secret && (
          <PasswordVisibilityToggle
            isVisible={isVisible}
            onToggle={() => setIsVisible((visible) => !visible)}
            className="right-0"
          />
        )}
      </div>
    </div>
  );
}

export default function LoginPage() {
  const router = useRouter();
  const [userId, setUserId] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [isPending, setIsPending] = useState(false);

  const canSubmit = userId.trim() !== '' && password !== '' && !isPending;

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    if (!canSubmit) return;

    setError('');
    setIsPending(true);

    try {
      await login({ userId: userId.trim(), password });
      // 최초 로그인(RESET_REQUIRED)은 CurrentUserProvider 가 약관·비밀번호 변경으로 가둔다
      router.push('/');
    } catch (caught) {
      // 게이트 코드로 로그인이 거부되면(예: '초기 비밀번호를 먼저 변경해 주세요')
      // 에러로 막아버리면 변경할 방법이 없어진다 — 게이트 화면으로 보낸다
      if (caught instanceof ApiError && isGateCode(caught.code)) {
        router.push('/');
        return;
      }

      setError(loginErrorOf(caught));
      setIsPending(false);
    }
  }

  return (
    <main className="flex min-h-screen items-center justify-center p-6">
      <div className="w-full max-w-md rounded-2xl border border-slate-200 px-10 py-12">
        <h1 className="text-center text-xl font-bold">VitaS</h1>

        <form onSubmit={handleSubmit} className="mt-10 space-y-6">
          <Field
            id="userId"
            label="아이디"
            value={userId}
            onChange={setUserId}
          />
          <Field
            id="password"
            label="비밀번호"
            value={password}
            onChange={setPassword}
            secret
          />

          {/* min-h-10 — 에러가 떠도 버튼 위치가 흔들리지 않게 자리를 잡아둔다 */}
          <p role="alert" className="min-h-10 text-sm text-rose-600">
            {error}
          </p>

          <button
            type="submit"
            disabled={!canSubmit}
            className="w-full cursor-pointer rounded-lg bg-slate-900 py-3.5 text-sm font-bold text-white transition-colors hover:bg-slate-800 disabled:cursor-not-allowed disabled:bg-slate-300"
          >
            {isPending ? '로그인 중…' : '로그인'}
          </button>
        </form>

        <p className="mt-6 text-center text-xs text-slate-500">
          계정 문의는 시스템 관리자에게 연락하세요.
        </p>
      </div>
    </main>
  );
}
