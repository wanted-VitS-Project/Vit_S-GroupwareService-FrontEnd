'use client';

import PageTitle from '@/components/PageTitle';
import { ROLE_LABELS } from '@/constants/status';
import ChangePasswordButton from '@/features/auth/ChangePasswordButton';
import { useCurrentUser } from '@/features/auth/useCurrentUser';
import { formatDate, formatDateTime } from '@/lib/format';

export default function MyPage() {
  const user = useCurrentUser();

  return (
    <>
      <p className="text-xs text-text-secondary">마이페이지</p>
      <PageTitle title="내 정보" />

      <div className="space-y-6">
        <Card title="인사 정보">
          <Field label="사번" value={user.userId} />
          <Field label="이름" value={user.name} />
          <Field label="이메일" value={user.email} />
          <Field label="연락처" value={user.phone} />
          <Field label="부서" value={user.departmentPath} />
          <Field label="직급" value={user.jobPositionName} />
          <Field label="입사일" value={formatDate(user.hiredAt)} />
        </Card>

        <Card title="계정 정보" action={<ChangePasswordButton />}>
          <Field label="권한" value={ROLE_LABELS[user.role]} />
          <Field
            label="마지막 로그인"
            value={formatDateTime(user.lastLoginAt)}
          />
        </Card>
      </div>

      <p className="mt-6 text-xs text-text-secondary">
        비밀번호를 분실한 경우 시스템 관리자에게 문의하세요.
      </p>
    </>
  );
}

interface CardProps {
  title: string;
  action?: React.ReactNode;
  children: React.ReactNode;
}

function Card({ title, action, children }: CardProps) {
  return (
    <section className="rounded-xl bg-white p-6">
      <div className="flex items-center justify-between gap-4">
        <h3 className="text-xs text-text-secondary">{title}</h3>
        {action}
      </div>

      <dl className="mt-6 grid gap-x-10 gap-y-5 sm:grid-cols-2">{children}</dl>
    </section>
  );
}

function Field({ label, value }: { label: string; value?: string | null }) {
  return (
    <div className="flex gap-6 text-sm">
      {/* 라벨 폭을 고정해 값의 시작선을 맞춘다 — '마지막 로그인' 이 들어가는 너비 */}
      <dt className="w-24 shrink-0 whitespace-nowrap text-text-secondary">
        {label}
      </dt>
      <dd className="font-medium">{value || '-'}</dd>
    </div>
  );
}
