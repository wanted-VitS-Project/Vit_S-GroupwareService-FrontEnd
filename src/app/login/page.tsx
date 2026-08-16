'use client';

import { useRouter } from 'next/navigation';
import { useState } from 'react';

import Logo from '@/components/Logo';
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
      <label htmlFor={id} className="block text-body-m font-bold">
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
          className="w-full border-b border-border-default py-2 pr-12 text-body-m outline-none placeholder:text-text-muted focus:border-text-primary"
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
  /** 로고가 자리를 잡았는지 — 아래 폼은 그 뒤에 편다 */
  const [isLogoReady, setIsLogoReady] = useState(false);

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
      <div className="w-full max-w-md rounded-base border border-border-default px-10 py-12">
        {/**
         * ⚠️ 로고는 **어두운 바탕 전용**이다 (글자가 흰색). 로그인 화면은 밝아서
         *    사이드바와 같은 어두운 판 위에 올린다 — 자산을 한 벌로 유지한다.
         */}
        <h1 className="flex justify-center">
          <span className="sr-only">VitaS</span>
          <span className="flex h-13 items-center rounded-base bg-bg-sidebar px-6">
            <Logo onReady={() => setIsLogoReady(true)} />
          </span>
        </h1>

        {/**
         * ⭐ **로고가 자리를 잡은 뒤 폼을 편다.**
         *
         * 셋이 동시에 뜨면 로고 · 입력칸 · 버튼이 제각기 다른 시점에 나타나 화면이 어수선하다.
         * 로고를 먼저 세우고 나머지를 한 번에 올리면 들어오는 순서가 하나로 읽힌다.
         * ⚠️ 자리는 처음부터 차지한다(`opacity`) — `display` 로 감추면 폼이 뜰 때 창이 늘어난다.
         */}
        <form
          onSubmit={handleSubmit}
          className={`mt-10 space-y-6 transition-opacity duration-300 ${
            isLogoReady ? 'opacity-100' : 'opacity-0'
          }`}
        >
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
          <p role="alert" className="min-h-10 text-body-m text-text-danger">
            {error}
          </p>

          <button
            type="submit"
            disabled={!canSubmit}
            className="w-full cursor-pointer rounded-lg bg-text-primary py-3.5 text-body-m font-bold text-text-white transition-colors hover:bg-bg-sidebar-hover disabled:cursor-not-allowed disabled:bg-bg-hover-secondary"
          >
            {isPending ? '로그인 중…' : '로그인'}
          </button>
        </form>

        <p
          className={`mt-6 text-center text-label text-text-secondary transition-opacity duration-300 ${
            isLogoReady ? 'opacity-100' : 'opacity-0'
          }`}
        >
          계정 문의는 시스템 관리자에게 연락하세요.
        </p>
      </div>
    </main>
  );
}
