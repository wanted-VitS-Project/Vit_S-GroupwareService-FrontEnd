'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';

import { ROLE_LABELS } from '@/constants/status';
import { getDepartments } from '@/features/department/api';
import {
  type DepartmentOption,
  toDepartmentOptions,
} from '@/features/department/options';
import { getJobPositions } from '@/features/jobPosition/api';
import type { JobPosition } from '@/features/jobPosition/types';
import { ApiError, messageOf } from '@/lib/api';

import { createEmployee } from './api';
import { EMPLOYEE_CODES } from './errorCodes';
import { SelectField, TextField } from './FormFields';
import PasswordResetModal from './PasswordResetModal';
import { EMPLOYEE_ROUTES } from './routes';
import type { CreateEmployeeResult, ManagedRole } from './types';

/**
 * 사번 최대 길이.
 * ⚠️ 명세(.ai/API.md 32)에 길이가 없어 ERD 의 `block.owner VARCHAR(20)` 을 근거로 뒀다.
 * 백엔드 확인 후 값이 다르면 여기만 고친다.
 */
const USER_ID_MAX_LENGTH = 20;

/** ADMIN 은 부여할 수 없다 — 선택지에 아예 넣지 않는다 (.ai/API.md 32) */
const ROLE_OPTIONS: ManagedRole[] = ['MASTER', 'MEMBER'];

/** 셀렉트 값이 문자열이라 폼은 전부 문자열로 다룬다 */
interface FormValues {
  userId: string;
  name: string;
  departmentId: string;
  hiredAt: string;
  role: string;
  jobPositionId: string;
  email: string;
  phone: string;
}

type FieldName = keyof FormValues;

const EMPTY_VALUES: FormValues = {
  userId: '',
  name: '',
  departmentId: '',
  hiredAt: '',
  // 대부분이 일반 사원이라 기본값을 준다. 올리려면 의식적으로 바꾸게 된다
  role: 'MEMBER',
  jobPositionId: '',
  email: '',
  phone: '',
};

/** 필수 항목 — 값이 비면 제출 전에 막는다 (400 `EMP_INVALID_REQUEST` 사전 차단) */
const REQUIRED_MESSAGES: Partial<Record<FieldName, string>> = {
  userId: '사번을 입력해주세요.',
  name: '이름을 입력해주세요.',
  departmentId: '부서를 선택해주세요.',
  hiredAt: '입사일을 선택해주세요.',
  role: '권한을 선택해주세요.',
};

/**
 * 사원 등록 화면. (ADMIN 전용, .ai/API.md 32)
 *
 * 계정이 항상 함께 발급된다 — 사원만 등록하는 경로는 없다.
 * 초기 비밀번호는 입력한 이메일로 가고, **메일 발송이 실패해도 201** 이라 응답을 반드시 확인한다.
 */
export default function EmployeeCreateForm() {
  const router = useRouter();

  const [values, setValues] = useState<FormValues>(EMPTY_VALUES);
  const [fieldErrors, setFieldErrors] = useState<
    Partial<Record<FieldName, string>>
  >({});
  const [error, setError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  /** 등록에 성공하면 폼 대신 결과를 보여준다 */
  const [result, setResult] = useState<CreateEmployeeResult | null>(null);

  const [departmentOptions, setDepartmentOptions] = useState<
    DepartmentOption[]
  >([]);
  const [jobPositions, setJobPositions] = useState<JobPosition[]>([]);
  const [hasOptionsFailed, setHasOptionsFailed] = useState(false);
  const [areOptionsLoading, setAreOptionsLoading] = useState(true);
  const [optionsReloadCount, setOptionsReloadCount] = useState(0);

  useEffect(() => {
    const controller = new AbortController();
    const { signal } = controller;

    Promise.all([getDepartments(signal), getJobPositions(signal)])
      .then(([departments, positions]) => {
        setDepartmentOptions(toDepartmentOptions(departments));
        setJobPositions(positions);
        setHasOptionsFailed(false);
        setAreOptionsLoading(false);
      })
      .catch(() => {
        // 부서는 필수라 옵션이 없으면 등록 자체를 못 한다
        if (!signal.aborted) {
          setHasOptionsFailed(true);
          setAreOptionsLoading(false);
        }
      });

    return () => controller.abort();
  }, [optionsReloadCount]);

  function reloadOptions() {
    setAreOptionsLoading(true);
    setHasOptionsFailed(false);
    setOptionsReloadCount((count) => count + 1);
  }

  const isDirty =
    result === null &&
    (Object.keys(values) as FieldName[]).some(
      (field) => values[field] !== EMPTY_VALUES[field],
    );

  /** 새로고침 · 탭 닫기로 빠져나갈 때만 브라우저가 막아준다 */
  useEffect(() => {
    if (!isDirty || isSubmitting) return;

    function warn(event: BeforeUnloadEvent) {
      event.preventDefault();
    }

    window.addEventListener('beforeunload', warn);
    return () => window.removeEventListener('beforeunload', warn);
  }, [isDirty, isSubmitting]);

  function change(field: FieldName, value: string) {
    setValues((prev) => ({ ...prev, [field]: value }));
    // 값을 고치면 직전 서버 오류는 더 이상 맞지 않는다
    setFieldErrors((prev) => ({ ...prev, [field]: undefined }));
    setError('');
  }

  function leave() {
    if (isDirty && !window.confirm('저장하지 않은 입력이 사라집니다.')) return;
    router.push(EMPLOYEE_ROUTES.list);
  }

  /** 비어 있는 필수 항목을 한 번에 모아 표시한다 — 하나씩 알려주면 왕복이 길다 */
  function missingRequired() {
    const missing: Partial<Record<FieldName, string>> = {};

    for (const [field, message] of Object.entries(REQUIRED_MESSAGES)) {
      if (values[field as FieldName].trim() === '') {
        missing[field as FieldName] = message;
      }
    }
    return missing;
  }

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    if (isSubmitting) return;

    const missing = missingRequired();

    if (Object.keys(missing).length > 0) {
      setFieldErrors(missing);
      return;
    }

    // 셀렉트 값은 문자열이라 여기서 좁힌다 — 캐스팅하면 ADMIN 이 실려도 통과한다
    const role = ROLE_OPTIONS.find((option) => option === values.role);

    if (!role) {
      setFieldErrors({ role: '권한을 다시 선택해주세요.' });
      return;
    }

    setFieldErrors({});
    setError('');
    setIsSubmitting(true);

    try {
      const created = await createEmployee({
        userId: values.userId.trim(),
        name: values.name.trim(),
        departmentId: Number(values.departmentId),
        hiredAt: values.hiredAt,
        role,
        // 선택 항목은 값이 있을 때만 싣는다 — 빈 문자열을 보내면 그 값으로 등록된다
        ...(values.jobPositionId && {
          jobPositionId: Number(values.jobPositionId),
        }),
        ...(values.email.trim() && { email: values.email.trim() }),
        ...(values.phone.trim() && { phone: values.phone.trim() }),
      });

      setResult(created);
    } catch (caught) {
      const code = caught instanceof ApiError ? caught.code : undefined;
      const message = messageOf(caught, '등록하지 못했습니다.');

      if (code === EMPLOYEE_CODES.userIdDuplicated) {
        setFieldErrors({ userId: message });
      } else if (code === EMPLOYEE_CODES.departmentNotFound) {
        // 고르는 사이 부서 · 직급이 삭제됐다. 옵션을 다시 받아 고쳐 고르게 한다
        setFieldErrors({ departmentId: message });
        reloadOptions();
      } else if (code === EMPLOYEE_CODES.jobPositionNotFound) {
        setFieldErrors({ jobPositionId: message });
        reloadOptions();
      } else if (code === EMPLOYEE_CODES.adminRoleNotAllowed) {
        setFieldErrors({ role: message });
      } else {
        setError(message);
      }
    } finally {
      // 성공 경로에서도 반드시 풀어야 한다 —
      // `계속 등록` 으로 폼이 다시 나오면 제출 버튼이 잠긴 채로 남는다
      setIsSubmitting(false);
    }
  }

  return (
    <>
      <p className="text-xs text-slate-500">
        <Link href="/settings" className="hover:text-[#1C1F2A] hover:underline">
          설정
        </Link>{' '}
        &gt;{' '}
        <Link
          href={EMPLOYEE_ROUTES.list}
          className="hover:text-[#1C1F2A] hover:underline"
        >
          사원 관리
        </Link>{' '}
        &gt; 사원 등록
      </p>

      <div className="mt-2 mb-6">
        <h2 className="text-lg font-bold">사원 등록</h2>
        <p className="mt-1.5 text-xs break-keep text-[#6C7389]">
          로그인 계정이 함께 발급됩니다. 초기 비밀번호는 입력한 이메일로
          발송됩니다.
        </p>
      </div>

      {result ? (
        <CreatedResult
          result={result}
          onResent={() => setResult({ ...result, emailSent: true })}
          onCreateAnother={() => {
            setValues(EMPTY_VALUES);
            setResult(null);
          }}
        />
      ) : (
        <form onSubmit={handleSubmit} className="space-y-4">
          <section className="rounded-xl border border-[#1C1F2A]/10 bg-white p-5">
            <h3 className="text-xs font-semibold text-[#1C1F2A]">계정</h3>

            <div className="mt-4 space-y-4">
              <TextField
                id="userId"
                label="사번"
                required
                placeholder="EMP001"
                maxLength={USER_ID_MAX_LENGTH}
                value={values.userId}
                error={fieldErrors.userId}
                hint="로그인 아이디로 쓰입니다. 등록 후에는 변경할 수 없습니다."
                onChange={(value) => change('userId', value)}
              />
              <SelectField
                id="role"
                label="권한"
                required
                emptyLabel="선택해주세요"
                value={values.role}
                error={fieldErrors.role}
                hint="관리자 권한은 이 화면에서 부여할 수 없습니다."
                options={ROLE_OPTIONS.map((role) => ({
                  value: role,
                  label: ROLE_LABELS[role],
                }))}
                onChange={(value) => change('role', value)}
              />
            </div>
          </section>

          <section className="rounded-xl border border-[#1C1F2A]/10 bg-white p-5">
            <h3 className="text-xs font-semibold text-[#1C1F2A]">인사 정보</h3>

            <div className="mt-4 space-y-4">
              <TextField
                id="name"
                label="이름"
                required
                value={values.name}
                error={fieldErrors.name}
                onChange={(value) => change('name', value)}
              />
              <SelectField
                id="departmentId"
                label="부서"
                required
                emptyLabel="선택해주세요"
                value={values.departmentId}
                error={fieldErrors.departmentId}
                options={departmentOptions.map((option) => ({
                  value: String(option.id),
                  label: option.label,
                }))}
                isLoading={areOptionsLoading}
                onChange={(value) => change('departmentId', value)}
              />
              <SelectField
                id="jobPositionId"
                label="직급"
                emptyLabel="미지정"
                value={values.jobPositionId}
                error={fieldErrors.jobPositionId}
                options={jobPositions.map((position) => ({
                  value: String(position.jobPositionId),
                  label: position.name,
                }))}
                isLoading={areOptionsLoading}
                onChange={(value) => change('jobPositionId', value)}
              />

              {hasOptionsFailed && (
                <p role="alert" className="text-[10px] text-[#E7000B]">
                  부서 · 직급 목록을 불러오지 못했습니다. 부서는 필수라 등록할
                  수 없습니다.{' '}
                  <button
                    type="button"
                    onClick={reloadOptions}
                    className="cursor-pointer font-semibold underline"
                  >
                    다시 시도
                  </button>
                </p>
              )}

              <TextField
                id="hiredAt"
                label="입사일"
                type="date"
                required
                value={values.hiredAt}
                error={fieldErrors.hiredAt}
                onChange={(value) => change('hiredAt', value)}
              />
              <TextField
                id="email"
                label="이메일"
                type="email"
                placeholder="name@example.com"
                value={values.email}
                error={fieldErrors.email}
                hint={
                  values.email.trim() === ''
                    ? '⚠ 비워두면 초기 비밀번호를 보낼 수 없어 로그인 불가 계정으로 등록됩니다.'
                    : '이 주소로 초기 비밀번호를 보냅니다.'
                }
                onChange={(value) => change('email', value)}
              />
              <TextField
                id="phone"
                label="연락처"
                type="tel"
                placeholder="010-0000-0000"
                value={values.phone}
                error={fieldErrors.phone}
                onChange={(value) => change('phone', value)}
              />
            </div>
          </section>

          <div className="flex items-center justify-end gap-2">
            {/* 요소를 먼저 두고 내용만 바꿔야 스크린리더가 읽는다 */}
            <p
              role="alert"
              className="mr-auto text-[10px] break-keep text-[#E7000B]"
            >
              {error}
            </p>
            <button
              type="button"
              onClick={leave}
              disabled={isSubmitting}
              className="cursor-pointer rounded-lg px-4 py-2 text-[11px] font-medium text-[#6C7389] hover:bg-[#ECEEF4] disabled:cursor-not-allowed disabled:text-[#C7CCD9]"
            >
              취소
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="cursor-pointer rounded-lg bg-[#2B3A67] px-5 py-2 text-[11px] font-semibold text-white hover:bg-[#22305a] disabled:cursor-not-allowed disabled:bg-[#ECEEF4] disabled:text-[#6C7389]"
            >
              {isSubmitting ? '등록 중…' : '등록'}
            </button>
          </div>
        </form>
      )}
    </>
  );
}

/**
 * 등록 결과. 다음 할 일이 세 갈래로 갈려 자동 이동하지 않고 고르게 한다.
 * 특히 메일이 실패한 경우엔 여기서 바로 재발송할 수 있어야 한다.
 */
function CreatedResult({
  result,
  onResent,
  onCreateAnother,
}: {
  result: CreateEmployeeResult;
  /** 재발송에 성공하면 경고를 거둔다 — 그대로 두면 아직 실패 상태로 읽힌다 */
  onResent: () => void;
  onCreateAnother: () => void;
}) {
  const [isResendOpen, setIsResendOpen] = useState(false);

  /** 주소는 등록됐는데 메일만 실패한 경우 — 재발송하지 않으면 로그인할 수 없다 */
  const hasMailFailed = result.emailRegistered && !result.emailSent;

  return (
    <>
      <section className="rounded-xl border border-[#1C1F2A]/10 bg-white p-6">
        <p className="text-sm font-bold text-[#087443]">✅ 등록되었습니다</p>
        <p className="mt-2 text-xs text-[#1C1F2A]">
          <b>{result.name}</b>{' '}
          <span className="text-[#6C7389]">({result.userId})</span>
        </p>

        {!result.emailRegistered ? (
          <p className="mt-4 rounded-lg bg-[#F59E0B]/10 px-3 py-2.5 text-[11px] leading-relaxed break-keep text-[#92400E]">
            이메일을 입력하지 않아 <b>로그인할 수 없는 계정</b>입니다. 정보
            수정에서 이메일을 등록한 뒤 비밀번호를 초기화해주세요.
          </p>
        ) : hasMailFailed ? (
          <p className="mt-4 rounded-lg bg-[#E7000B]/5 px-3 py-2.5 text-[11px] leading-relaxed break-keep text-[#E7000B]">
            계정은 만들어졌지만 <b>초기 비밀번호 메일이 발송되지 않았습니다.</b>{' '}
            재발송하지 않으면 이 사원은 로그인할 수 없습니다.
          </p>
        ) : (
          <p className="mt-4 rounded-lg bg-[#ECEEF4]/50 px-3 py-2.5 text-[11px] leading-relaxed break-keep text-[#6C7389]">
            초기 비밀번호를 등록한 이메일로 보냈습니다. 첫 로그인 때 비밀번호를
            변경하게 됩니다.
          </p>
        )}

        <div className="mt-5 flex flex-wrap items-center gap-2">
          {hasMailFailed && (
            <button
              type="button"
              onClick={() => setIsResendOpen(true)}
              className="cursor-pointer rounded-lg bg-[#E7000B] px-4 py-2 text-[11px] font-semibold text-white hover:bg-[#c50009]"
            >
              메일 재발송
            </button>
          )}
          <button
            type="button"
            onClick={onCreateAnother}
            className="cursor-pointer rounded-lg bg-[#2B3A67] px-4 py-2 text-[11px] font-semibold text-white hover:bg-[#22305a]"
          >
            계속 등록
          </button>
          <Link
            href={EMPLOYEE_ROUTES.detail(result.userId)}
            className="rounded-lg border border-[#1C1F2A]/10 px-4 py-2 text-[11px] font-semibold text-[#1C1F2A] hover:bg-[#ECEEF4]"
          >
            상세 보기
          </Link>
          <Link
            href={EMPLOYEE_ROUTES.list}
            className="rounded-lg px-4 py-2 text-[11px] font-medium text-[#6C7389] hover:bg-[#ECEEF4]"
          >
            목록으로
          </Link>
        </div>
      </section>

      {isResendOpen && (
        <PasswordResetModal
          targets={[result]}
          onClose={() => setIsResendOpen(false)}
          onDone={onResent}
        />
      )}
    </>
  );
}
