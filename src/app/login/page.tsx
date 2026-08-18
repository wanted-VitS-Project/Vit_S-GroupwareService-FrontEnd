'use client';

import { useRouter } from 'next/navigation';
import { useState } from 'react';

import Logo from '@/components/Logo';
import { Spinner } from '@/components/Spinner';
import PasswordVisibilityToggle from '@/components/PasswordVisibilityToggle';
import { login } from '@/features/auth/api';
import { isGateCode, LOGIN_ERROR_MESSAGES } from '@/features/auth/errorCodes';
import { ApiError, messageOf } from '@/lib/api';

/**
 * 같은 status 에 여러 의미가 실려 있어 code 로 분기한다.
 * 목록에 없는 코드는 백엔드 문구를 그대로 쓴다.
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
  /** 로고가 뜬 뒤에 폼을 보여주기 위한 플래그 */
  const [isLogoReady, setIsLogoReady] = useState(false);

  const canSubmit = userId.trim() !== '' && password !== '' && !isPending;

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    if (!canSubmit) return;

    setError('');
    setIsPending(true);

    try {
      await login({ userId: userId.trim(), password });
      // 최초 로그인 처리는 CurrentUserProvider 가 맡는다
      router.push('/');
    } catch (caught) {
      // 게이트 코드는 에러로 막지 않고 처리 화면으로 보낸다
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
        {/* 배경이 밝아 어두운 톤 로고를 쓴다 */}
        <h1 className="flex justify-center">
          <span className="sr-only">VitaS</span>
          <Logo tone="onLight" onReady={() => setIsLogoReady(true)} />
        </h1>

        {/*
          로고가 뜬 뒤 폼을 함께 보여준다.
          display 대신 opacity 로 감춰 레이아웃이 흔들리지 않게 한다.
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

          {/* 에러 문구가 떠도 버튼이 밀리지 않도록 높이를 잡아둔다 */}
          <p role="alert" className="min-h-10 text-body-m text-text-danger">
            {error}
          </p>

          <button
            type="submit"
            disabled={!canSubmit}
            /* 비활성일 때 배경색은 두고 투명도만 낮춘다 (흰 글씨 대비 확보) */
            className="w-full cursor-pointer rounded-lg bg-text-primary py-3.5 text-body-m font-bold text-text-white transition-colors hover:bg-bg-sidebar-hover disabled:cursor-not-allowed disabled:opacity-60 disabled:hover:bg-text-primary"
          >
            {isPending ? (
              <span className="flex items-center justify-center gap-2">
                <Spinner className="size-4 border-white/40 border-t-white" />
                로그인 중
              </span>
            ) : (
              '로그인'
            )}
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
