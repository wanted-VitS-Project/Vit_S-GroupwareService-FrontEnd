'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';

import { ROLE_LABELS } from '@/constants/status';
import { EmployeeFormSkeleton } from '@/components/settings/SettingsSkeletons';
import { getDepartments } from '@/features/department/api';
import {
  type DepartmentOption,
  toDepartmentOptions,
} from '@/features/department/options';
import { getJobPositions } from '@/features/jobPosition/api';
import type { JobPosition } from '@/features/jobPosition/types';
import { ApiError, messageOf } from '@/lib/api';

import { getEmployee, updateEmployee } from './api';
import { ACCOUNT_CODES, EMPLOYEE_CODES } from './errorCodes';
import { SelectField, TextField } from './FormFields';
import { EMPLOYEE_ROUTES } from './routes';
import type { EmployeeDetail, UpdateEmployeeRequest } from './types';

/** 셀렉트 값이 문자열이라 폼은 전부 문자열로 다룬다 — `''` 는 미지정 */
interface FormValues {
  name: string;
  phone: string;
  email: string;
  departmentId: string;
  jobPositionId: string;
  hiredAt: string;
}

type FieldName = keyof FormValues;

function toFormValues(employee: EmployeeDetail): FormValues {
  return {
    name: employee.name,
    phone: employee.phone ?? '',
    email: employee.email ?? '',
    departmentId: employee.departmentId ? String(employee.departmentId) : '',
    jobPositionId: employee.jobPositionId ? String(employee.jobPositionId) : '',
    hiredAt: employee.hiredAt ?? '',
  };
}

/**
 * 바뀐 필드만 담는다. 이게 이 화면의 핵심이다 (.ai/API.md 33)
 *
 * ⚠️ 키를 빼면 "변경 안 함", `null` 을 보내면 "미지정으로 지움" —
 * 손대지 않은 부서 · 직급에 `null` 이 실려 나가면 배정이 통째로 날아간다.
 */
function buildPatch(
  initial: FormValues,
  values: FormValues,
): UpdateEmployeeRequest {
  const patch: UpdateEmployeeRequest = {};

  if (values.name.trim() !== initial.name) patch.name = values.name.trim();
  if (values.phone.trim() !== initial.phone) patch.phone = values.phone.trim();
  if (values.email.trim() !== initial.email) patch.email = values.email.trim();
  if (values.hiredAt !== initial.hiredAt) patch.hiredAt = values.hiredAt;

  if (values.departmentId !== initial.departmentId) {
    patch.departmentId = values.departmentId
      ? Number(values.departmentId)
      : null;
  }
  if (values.jobPositionId !== initial.jobPositionId) {
    patch.jobPositionId = values.jobPositionId
      ? Number(values.jobPositionId)
      : null;
  }

  return patch;
}

/**
 * 사원 정보 수정 화면. (ADMIN 전용, .ai/API.md 33)
 *
 * 사번 · 전역 권한은 이 API 로 못 바꾼다 — 읽기 전용으로 보여주고 권한은 상세로 안내한다.
 */
export default function EmployeeEditForm({ userId }: { userId: string }) {
  const router = useRouter();
  const detailHref = EMPLOYEE_ROUTES.detail(userId);

  const [employee, setEmployee] = useState<EmployeeDetail | null>(null);
  /** 404 는 다시 시도해도 소용없어 안내 문구가 다르다 */
  const [failure, setFailure] = useState<{ isNotFound: boolean } | null>(null);
  const [values, setValues] = useState<FormValues | null>(null);

  const [departmentOptions, setDepartmentOptions] = useState<
    DepartmentOption[]
  >([]);
  const [jobPositions, setJobPositions] = useState<JobPosition[]>([]);
  const [hasOptionsFailed, setHasOptionsFailed] = useState(false);
  const [optionsReloadCount, setOptionsReloadCount] = useState(0);

  const [fieldErrors, setFieldErrors] = useState<
    Partial<Record<FieldName, string>>
  >({});
  const [error, setError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    const controller = new AbortController();
    const { signal } = controller;

    getEmployee(userId, signal)
      .then((data) => {
        setEmployee(data);
        setValues(toFormValues(data));
      })
      .catch((caught: unknown) => {
        // 취소는 실패가 아니다
        if (signal.aborted) return;

        const isNotFound =
          caught instanceof ApiError && caught.code === EMPLOYEE_CODES.notFound;

        setFailure({ isNotFound });
      });

    return () => controller.abort();
  }, [userId]);

  /** 셀렉트 옵션은 사원과 따로 받는다 — 다시 받아도 입력 중인 값이 날아가지 않는다 */
  useEffect(() => {
    const controller = new AbortController();
    const { signal } = controller;

    Promise.all([getDepartments(signal), getJobPositions(signal)])
      .then(([departments, positions]) => {
        setDepartmentOptions(toDepartmentOptions(departments));
        setJobPositions(positions);
        setHasOptionsFailed(false);
      })
      .catch(() => {
        if (!signal.aborted) setHasOptionsFailed(true);
      });

    return () => controller.abort();
  }, [optionsReloadCount]);

  const initial = employee ? toFormValues(employee) : null;
  const patch = initial && values ? buildPatch(initial, values) : {};
  const isDirty = Object.keys(patch).length > 0;

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
    setValues((prev) => (prev ? { ...prev, [field]: value } : prev));
    // 값을 고치면 직전 서버 오류는 더 이상 맞지 않는다
    setFieldErrors((prev) => ({ ...prev, [field]: undefined }));
    setError('');
  }

  function leave() {
    if (isDirty && !window.confirm('저장하지 않은 변경사항이 사라집니다.')) {
      return;
    }
    router.push(detailHref);
  }

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    if (!values || !isDirty || isSubmitting) return;

    // 400 이 되기 전에 여기서 막는다
    if (values.name.trim() === '') {
      setFieldErrors({ name: '이름을 입력해주세요.' });
      return;
    }
    // 바뀐 값이 빈 문자열 = 지우려는 것. 입사일은 명세에 지우는 방법이 없다
    if (patch.hiredAt === '') {
      setFieldErrors({ hiredAt: '입사일은 비울 수 없습니다.' });
      return;
    }

    setFieldErrors({});
    setError('');
    setIsSubmitting(true);

    try {
      await updateEmployee(userId, patch);
      // 상세가 다시 조회하므로 여기서 값을 들고 갈 필요가 없다
      router.push(detailHref);
    } catch (caught) {
      const code = caught instanceof ApiError ? caught.code : undefined;
      const message = messageOf(caught, '저장하지 못했습니다.');

      // 사원이 사라졌다 — 상세로 보내면 '찾을 수 없습니다' 안내가 나온다
      if (code === EMPLOYEE_CODES.notFound) {
        router.replace(detailHref);
        return;
      }
      // 고르는 사이 부서 · 직급이 삭제됐다. 옵션을 다시 받아 고쳐 고르게 한다
      if (code === EMPLOYEE_CODES.departmentNotFound) {
        setFieldErrors({ departmentId: message });
        setOptionsReloadCount((count) => count + 1);
      } else if (code === EMPLOYEE_CODES.jobPositionNotFound) {
        setFieldErrors({ jobPositionId: message });
        setOptionsReloadCount((count) => count + 1);
      } else if (code === ACCOUNT_CODES.systemAccountNotAllowed) {
        setError('시스템 계정은 수정할 수 없습니다.');
      } else {
        setError(message);
      }

      setIsSubmitting(false);
    }
  }

  return (
    <>
      <p className="text-label text-text-secondary">
        <Link
          href="/settings"
          className="hover:text-text-primary hover:underline"
        >
          전사 관리
        </Link>{' '}
        &gt;{' '}
        <Link
          href={EMPLOYEE_ROUTES.list}
          className="hover:text-text-primary hover:underline"
        >
          사원 관리
        </Link>{' '}
        &gt;{' '}
        <Link
          href={detailHref}
          className="hover:text-text-primary hover:underline"
        >
          {employee?.name ?? userId}
        </Link>{' '}
        &gt; 정보 수정
      </p>

      {failure && !employee ? (
        <Centered>
          <p className="text-label break-keep text-text-secondary">
            {failure.isNotFound
              ? '사원을 찾을 수 없습니다. 삭제되었거나 접근할 수 없는 계정입니다.'
              : '사원 정보를 불러오지 못했습니다.'}
          </p>
          <Link href={EMPLOYEE_ROUTES.list} className="btn btn-sm btn-primary">
            목록으로
          </Link>
        </Centered>
      ) : !employee || !values ? (
        <EmployeeFormSkeleton />
      ) : (
        <>
          <div className="mt-2 mb-6">
            <h2 className="text-heading-m font-bold">정보 수정</h2>
            <p className="mt-1.5 text-label break-keep text-text-secondary">
              인사 정보를 수정합니다. 바꾼 항목만 저장됩니다.
            </p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            <section className="rounded-base border border-border-default bg-bg-card p-5">
              <h3 className="text-label font-semibold text-text-primary">
                변경할 수 없는 항목
              </h3>
              <dl className="mt-4 space-y-3">
                <ReadOnlyField label="사번" value={employee.userId} />
                <ReadOnlyField
                  label="권한"
                  value={ROLE_LABELS[employee.role]}
                  note={
                    <>
                      권한은{' '}
                      <Link
                        href={detailHref}
                        className="font-semibold underline"
                      >
                        상세 화면
                      </Link>{' '}
                      에서 변경합니다.
                    </>
                  }
                />
              </dl>
            </section>

            <section className="rounded-base border border-border-default bg-bg-card p-5">
              <h3 className="text-label font-semibold text-text-primary">
                인사 정보
              </h3>

              <div className="mt-4 space-y-4">
                <TextField
                  id="name"
                  label="이름"
                  required
                  value={values.name}
                  error={fieldErrors.name}
                  onChange={(value) => change('name', value)}
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
                <TextField
                  id="email"
                  label="이메일"
                  type="email"
                  placeholder="name@example.com"
                  value={values.email}
                  error={fieldErrors.email}
                  hint={
                    employee.emailRegistered && values.email.trim() === ''
                      ? '⚠ 이메일을 지우면 이 사원은 로그인 · 비밀번호 재설정을 할 수 없습니다.'
                      : '초기 비밀번호 · 재설정 메일이 이 주소로 갑니다.'
                  }
                  onChange={(value) => change('email', value)}
                />

                {/* 빈 값을 고르면 `null` 이 실려 배정이 지워진다 */}
                <SelectField
                  id="departmentId"
                  label="부서"
                  emptyLabel="미지정"
                  value={values.departmentId}
                  error={fieldErrors.departmentId}
                  onChange={(value) => change('departmentId', value)}
                  options={departmentOptions.map((option) => ({
                    value: String(option.id),
                    label: option.label,
                  }))}
                />
                <SelectField
                  id="jobPositionId"
                  label="직급"
                  emptyLabel="미지정"
                  value={values.jobPositionId}
                  error={fieldErrors.jobPositionId}
                  onChange={(value) => change('jobPositionId', value)}
                  options={jobPositions.map((position) => ({
                    value: String(position.jobPositionId),
                    label: position.name,
                  }))}
                />

                {hasOptionsFailed && (
                  <p role="alert" className="text-caption text-text-danger">
                    부서 · 직급 목록을 불러오지 못했습니다.{' '}
                    <button
                      type="button"
                      onClick={() =>
                        setOptionsReloadCount((count) => count + 1)
                      }
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
                  value={values.hiredAt}
                  error={fieldErrors.hiredAt}
                  onChange={(value) => change('hiredAt', value)}
                />
              </div>
            </section>

            <div className="flex items-center justify-end gap-2">
              {/* 요소를 먼저 두고 내용만 바꿔야 스크린리더가 읽는다 */}
              <p
                role="alert"
                className="mr-auto text-caption break-keep text-text-danger"
              >
                {error}
              </p>
              <button
                type="button"
                onClick={leave}
                disabled={isSubmitting}
                className="cursor-pointer rounded-lg px-4 py-2 text-detail font-medium text-text-secondary hover:bg-bg-hover disabled:cursor-not-allowed disabled:text-text-muted"
              >
                취소
              </button>
              <button
                type="submit"
                disabled={!isDirty || isSubmitting}
                title={isDirty ? undefined : '변경한 항목이 없습니다'}
                className="btn btn-sm btn-primary"
              >
                {isSubmitting ? '저장 중…' : '저장'}
              </button>
            </div>
          </form>
        </>
      )}
    </>
  );
}

function ReadOnlyField({
  label,
  value,
  note,
}: {
  label: string;
  value: string;
  note?: React.ReactNode;
}) {
  return (
    <div className="flex items-center gap-4 text-label">
      <dt className="w-20 shrink-0 text-text-secondary">{label}</dt>
      <dd className="m-0 min-w-0 flex-1">
        <span className="block truncate font-medium text-text-primary">
          {value}
        </span>
        {note && (
          <span className="mt-0.5 block text-caption break-keep text-text-secondary">
            {note}
          </span>
        )}
      </dd>
    </div>
  );
}

function Centered({ children }: { children: React.ReactNode }) {
  return (
    <div className="mt-4 flex flex-col items-center justify-center gap-3 rounded-base border border-border-default bg-bg-card px-5 py-20 text-center">
      {children}
    </div>
  );
}
