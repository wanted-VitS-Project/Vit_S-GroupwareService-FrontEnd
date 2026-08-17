'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';

import { ROLE_LABELS } from '@/constants/status';
import { EmployeeDetailSkeleton } from '@/components/settings/SettingsSkeletons';
import { useCurrentUser } from '@/features/auth/useCurrentUser';
import { ApiError } from '@/lib/api';
import { formatDate, formatDateTime } from '@/lib/format';
import { useModalRouter } from '@/lib/useModal';

import AccountStatusModal from './AccountStatusModal';
import { getEmployee } from './api';
import EmployeeStatusBadge, { employeeStatusOf } from './EmployeeStatusBadge';
import PasswordResetModal from './PasswordResetModal';
import { ACCOUNT_CODES, EMPLOYEE_CODES } from './errorCodes';
import ResignationModal from './ResignationModal';
import RoleChangeModal from './RoleChangeModal';
import { EMPLOYEE_ROUTES } from './routes';
import type { EmployeeDetail as Employee } from './types';

type OpenModal = 'role' | 'status' | 'passwordReset' | 'resignation';

/** 다시 시도해도 결과가 같은 실패는 문구도 버튼도 달라야 한다 */
type FailureKind = 'notFound' | 'systemAccount' | 'unknown';

const FAILURE_MESSAGES: Record<FailureKind, string> = {
  notFound: '사원을 찾을 수 없습니다. 삭제되었거나 접근할 수 없는 계정입니다.',
  systemAccount: '시스템 계정은 조회할 수 없습니다.',
  unknown: '사원 정보를 불러오지 못했습니다.',
};

function failureKindOf(caught: unknown): FailureKind {
  if (!(caught instanceof ApiError)) return 'unknown';
  if (caught.code === EMPLOYEE_CODES.notFound) return 'notFound';
  if (caught.code === ACCOUNT_CODES.systemAccountNotAllowed) {
    return 'systemAccount';
  }
  return 'unknown';
}

/**
 * 사원 상세 화면. (ADMIN 전용, .ai/API.md 31)
 *
 * 인사 정보는 읽기 전용이고, 계정 관련 동작(권한 · 상태 · 비밀번호 · 퇴사)만 여기서 한다.
 * 인사 정보 수정은 별도 화면이다. (`EmployeeEditForm`)
 */
export default function EmployeeDetail({ userId }: { userId: string }) {
  const currentUser = useCurrentUser();

  const [reloadCount, setReloadCount] = useState(0);
  /** 어떤 요청의 결과인지 `key` 로 들고 있는다 — 대상이 바뀌면 자동으로 로딩 상태가 된다 */
  const [result, setResult] = useState<{
    key: string;
    data?: Employee;
    failure?: FailureKind;
  } | null>(null);

  const requestKey = `${reloadCount} ${userId}`;
  const current = result?.key === requestKey ? result : null;
  /** 재조회 중에는 직전 결과를 유지한다 — 카드가 통째로 사라지면 화면이 튄다 */
  const employee = current?.data ?? result?.data ?? null;
  const failure = current?.failure ?? null;

  useEffect(() => {
    const controller = new AbortController();
    const { signal } = controller;

    getEmployee(userId, signal)
      .then((data) => setResult({ key: requestKey, data }))
      .catch((caught: unknown) => {
        // 취소는 실패가 아니다
        if (signal.aborted) return;

        setResult({ key: requestKey, failure: failureKindOf(caught) });
      });

    return () => controller.abort();
  }, [requestKey, userId]);

  /** 동작이 성공한 뒤에도 이걸 부른다 — 응답 일부만 반영하면 배지가 어긋난다 */
  function reload() {
    setReloadCount((count) => count + 1);
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
        &gt; {employee?.name ?? userId}
      </p>

      {failure && !employee ? (
        <Centered>
          <p className="text-label break-keep text-text-secondary">
            {FAILURE_MESSAGES[failure]}
          </p>
          {/* 없는 사원 · 시스템 계정은 다시 불러도 결과가 같다 */}
          {failure === 'unknown' ? (
            <button
              type="button"
              onClick={reload}
              className="btn btn-sm btn-primary"
            >
              다시 시도
            </button>
          ) : (
            <Link
              href={EMPLOYEE_ROUTES.list}
              className="btn btn-sm btn-primary"
            >
              목록으로
            </Link>
          )}
        </Centered>
      ) : !employee ? (
        <EmployeeDetailSkeleton />
      ) : (
        <Loaded
          employee={employee}
          isSelf={employee.userId === currentUser.userId}
          onSaved={reload}
        />
      )}
    </>
  );
}

interface LoadedProps {
  employee: Employee;
  /** 자기 자신은 권한 · 계정 상태를 바꿀 수 없다 (.ai/API.md 19) */
  isSelf: boolean;
  onSaved: () => void;
}

function Loaded({ employee, isSelf, onSaved }: LoadedProps) {
  const modal = useModalRouter<OpenModal>();

  const isResigned = employee.resignedAt !== null;
  const isSuspended = employee.accountStatus === 'INACTIVE';

  return (
    <>
      <div className="mt-2 mb-6 flex items-start justify-between gap-4">
        <div className="min-w-0">
          <div className="flex items-center gap-2">
            <h2 className="truncate text-heading-m font-bold">
              {employee.name}
            </h2>
            <EmployeeStatusBadge status={employeeStatusOf(employee)} />
          </div>
          <p className="mt-1.5 text-label text-text-secondary">
            {employee.userId} · {employee.departmentPath ?? '부서 미지정'}
          </p>
        </div>
        <Link
          href={EMPLOYEE_ROUTES.edit(employee.userId)}
          className="btn btn-md btn-gray-outlined shrink-0"
        >
          정보 수정
        </Link>
      </div>

      {/* 이메일이 없으면 로그인도 비밀번호 재설정도 못 한다 — 조치가 필요해 위로 올린다 */}
      {!employee.emailRegistered && (
        <p className="mb-4 rounded-lg border border-yellow-border/30 bg-yellow-bg-soft px-4 py-3 text-detail leading-relaxed break-keep text-yellow-text">
          ⚠ 이메일이 등록되지 않아 이 사원은 <b>로그인할 수 없습니다.</b>{' '}
          비밀번호 초기화도 실패합니다 — 먼저{' '}
          <Link
            href={EMPLOYEE_ROUTES.edit(employee.userId)}
            className="font-semibold underline"
          >
            정보 수정
          </Link>{' '}
          에서 이메일을 등록해주세요.
        </p>
      )}

      <div className="space-y-4">
        <Card title="인사 정보">
          <FieldList columns={2}>
            <Field label="사번" value={employee.userId} />
            <Field label="이름" value={employee.name} />
            <Field
              label="이메일"
              value={employee.email}
              warning={
                employee.emailRegistered
                  ? undefined
                  : '미등록 — 로그인 · 비밀번호 재설정 불가'
              }
            />
            <Field label="연락처" value={employee.phone} />
            <Field label="부서" value={employee.departmentPath} />
            <Field label="직급" value={employee.jobPositionName} />
            <Field label="입사일" value={formatDate(employee.hiredAt)} />
            {isResigned && (
              <Field label="퇴사일" value={formatDate(employee.resignedAt)} />
            )}
          </FieldList>
        </Card>

        <Card title="계정 정보">
          <FieldList>
            <Field
              label="권한"
              value={ROLE_LABELS[employee.role]}
              action={
                <CardButton
                  onClick={() => modal.open('role')}
                  disabled={isSelf || isResigned}
                  title={
                    isSelf
                      ? '자기 자신의 권한은 바꿀 수 없습니다'
                      : isResigned
                        ? '퇴사한 사원입니다'
                        : undefined
                  }
                >
                  변경
                </CardButton>
              }
            />
            <Field
              label="계정 상태"
              value={isSuspended ? '정지' : '활성'}
              action={
                <CardButton
                  onClick={() => modal.open('status')}
                  disabled={isSelf || isResigned}
                  danger={!isSuspended}
                  title={
                    isSelf
                      ? '자기 자신의 계정 상태는 바꿀 수 없습니다'
                      : isResigned
                        ? '퇴사 처리로 이미 정지된 계정입니다'
                        : undefined
                  }
                >
                  {isSuspended ? '활성화' : '정지'}
                </CardButton>
              }
            />
            <Field
              label="비밀번호"
              value={
                employee.passwordStatus === 'RESET_REQUIRED'
                  ? '재설정 필요'
                  : '정상'
              }
              action={
                <CardButton
                  onClick={() => modal.open('passwordReset')}
                  // 메일로 임시 비밀번호를 보내는 기능이라 주소가 없으면 반드시 실패한다
                  disabled={!employee.emailRegistered}
                  title={
                    employee.emailRegistered
                      ? undefined
                      : '이메일이 등록되지 않아 초기화할 수 없습니다'
                  }
                >
                  초기화
                </CardButton>
              }
            />
            <Field
              label="마지막 로그인"
              value={formatDateTime(employee.lastLoginAt) || '기록 없음'}
            />
          </FieldList>
        </Card>

        <section className="rounded-base border border-border-danger/20 bg-bg-card p-5">
          <h3 className="text-label font-semibold text-text-danger">
            퇴사 처리
          </h3>
          {isResigned ? (
            <p className="mt-2 text-detail break-keep text-text-secondary">
              {formatDate(employee.resignedAt)} 에 퇴사 처리되었습니다. 사원
              정보는 과거 이력에 그대로 남습니다.
            </p>
          ) : (
            <div className="mt-2 flex items-end justify-between gap-4">
              <p className="text-detail break-keep text-text-secondary">
                퇴사일을 기록하고 계정을 즉시 정지합니다. 사원 정보는 삭제되지
                않습니다.
              </p>
              <button
                type="button"
                onClick={() => modal.open('resignation')}
                className="btn btn-md btn-danger shrink-0"
              >
                퇴사 처리
              </button>
            </div>
          )}
        </section>
      </div>

      {modal.isOpen('role') && (
        <RoleChangeModal
          employee={employee}
          onClose={modal.close}
          onSaved={onSaved}
        />
      )}
      {modal.isOpen('status') && (
        <AccountStatusModal
          employee={employee}
          onClose={modal.close}
          onSaved={onSaved}
        />
      )}
      {modal.isOpen('passwordReset') && (
        <PasswordResetModal
          targets={[employee]}
          onClose={modal.close}
          onDone={onSaved}
        />
      )}
      {modal.isOpen('resignation') && (
        <ResignationModal
          employee={employee}
          onClose={modal.close}
          onSaved={onSaved}
        />
      )}
    </>
  );
}

function Card({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <section className="rounded-base border border-border-default bg-bg-card p-5">
      <h3 className="text-label font-semibold text-text-primary">{title}</h3>
      <div className="mt-4">{children}</div>
    </section>
  );
}

/**
 * `Field` 는 `dt`/`dd` 라 반드시 `dl` 안에 있어야 한다.
 * 값만 있는 인사 정보는 2열, 우측에 버튼이 붙는 계정 정보는 1열로 둔다.
 */
function FieldList({
  columns = 1,
  children,
}: {
  columns?: 1 | 2;
  children: React.ReactNode;
}) {
  return (
    <dl
      className={
        columns === 2 ? 'grid gap-x-10 gap-y-3 sm:grid-cols-2' : 'space-y-3'
      }
    >
      {children}
    </dl>
  );
}

interface FieldProps {
  label: string;
  value?: string | null;
  /** 값 아래 붙는 주의 문구 — 이메일 미등록처럼 조치가 필요한 경우 */
  warning?: string;
  /** 우측 동작 버튼 */
  action?: React.ReactNode;
}

function Field({ label, value, warning, action }: FieldProps) {
  return (
    <div className="flex items-center gap-4 text-label">
      {/* 라벨 폭을 고정해 값의 시작선을 맞춘다 — '마지막 로그인' 이 들어가는 너비 */}
      <dt className="w-24 shrink-0 text-text-secondary">{label}</dt>
      <dd className="m-0 min-w-0 flex-1">
        <span className="block truncate font-medium text-text-primary">
          {value || '-'}
        </span>
        {warning && (
          <span className="mt-0.5 block text-caption break-keep text-yellow-text">
            ⚠ {warning}
          </span>
        )}
      </dd>
      {action && <div className="shrink-0">{action}</div>}
    </div>
  );
}

function CardButton({
  onClick,
  disabled,
  danger,
  title,
  children,
}: {
  onClick: () => void;
  disabled?: boolean;
  danger?: boolean;
  /** 비활성 이유를 툴팁으로 알려준다 */
  title?: string;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      title={title}
      className={`cursor-pointer rounded-lg border px-3 py-1 text-detail font-semibold disabled:cursor-not-allowed disabled:border-border-default disabled:text-text-muted ${
        danger
          ? 'border-border-danger/30 text-text-danger hover:bg-red-bg-soft'
          : 'border-border-default text-text-primary hover:bg-bg-hover'
      }`}
    >
      {children}
    </button>
  );
}

function Centered({ children }: { children: React.ReactNode }) {
  return (
    <div className="mt-4 flex flex-col items-center justify-center gap-3 rounded-base border border-border-default bg-bg-card px-5 py-20 text-center">
      {children}
    </div>
  );
}
