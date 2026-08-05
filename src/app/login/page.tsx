'use client';

import { useRouter } from 'next/navigation';
import { useState } from 'react';

import { login } from '@/features/auth/api';
import { ApiError, messageOf } from '@/lib/api';

/** 401 은 사번 존재 여부가 드러나지 않도록 한 문장으로만 안내한다. */
const ERROR_MESSAGES: Record<number, string> = {
  400: '아이디와 비밀번호를 모두 입력해주세요.',
  401: '아이디 또는 비밀번호가 올바르지 않습니다.',
  403: '비활성화된 계정입니다. 시스템 관리자에게 문의해주세요.',
  429: '요청이 너무 많습니다. 잠시 후 다시 시도해주세요.',
  503: '서버가 혼잡합니다. 잠시 후 다시 시도해주세요.',
};

/** 423(계정 잠금)처럼 목록에 없는 상태는 해제 시각이 담긴 백엔드 문구를 쓴다. */
function loginErrorOf(error: unknown) {
  const known = error instanceof ApiError && ERROR_MESSAGES[error.status];

  return (
    known ||
    messageOf(
      error,
      '알 수 없는 오류가 발생했습니다. 잠시 후 다시 시도해주세요.',
    )
  );
}

/** 비밀번호 보기 토글 아이콘. 아이콘 라이브러리 도입 전까지 인라인 SVG 로 둔다. */
function EyeIcon({ off }: { off?: boolean }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.6"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
      className="size-5"
    >
      <path d="M2 12s3.6-6 10-6 10 6 10 6-3.6 6-10 6-10-6-10-6Z" />
      <circle cx="12" cy="12" r="3" />
      {off && <path d="m4 4 16 16" />}
    </svg>
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
          <button
            type="button"
            onClick={() => setIsVisible((visible) => !visible)}
            aria-label={isVisible ? '비밀번호 숨기기' : '비밀번호 보기'}
            aria-pressed={isVisible}
            className="absolute top-1/2 right-0 -translate-y-1/2 cursor-pointer rounded p-1 text-slate-400 transition-colors hover:bg-slate-100 hover:text-slate-900"
          >
            <EyeIcon off={isVisible} />
          </button>
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
