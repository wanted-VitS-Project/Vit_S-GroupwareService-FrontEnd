'use client';

// CSR - 프로젝트 직접 생성 폼: 공고와 연결되지 않은 프로젝트만 만든다.
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';

import MemberAvatar from '@/components/MemberAvatar';
import PageTitle from '@/components/PageTitle';
import { notifyToast } from '@/components/Toast';
import { getCategories } from '@/features/businessCategory/api';
import type { BusinessCategory as MasterCategory } from '@/features/businessCategory/types';
import EmployeeSearchInput from '@/features/employee/EmployeeSearchInput';
import { ApiError, messageOf } from '@/lib/api';

import { addProjectMember, createProject } from './api';
import { PROJECT_CATEGORY_CODES, PROJECT_CODES } from './errorCodes';
import {
  AlertBanner,
  AmountField,
  FormCard,
  TextareaField,
  TextField,
} from './FormFields';
import { MEMBER_PERMISSION_LABELS, MEMBER_PERMISSIONS } from './labels';
import { PROJECT_ROUTES } from './routes';
import type { CreateProjectRequest, ProjectPermission } from './types';
import { CLIENT_NAME_MAX_LENGTH, PROJECT_NAME_MAX_LENGTH } from './types';

/** 폼은 전부 문자열로 다룬다 — 날짜·금액 입력이 문자열이라 변환 지점을 한 곳에 모은다 */
interface FormValues {
  name: string;
  clientName: string;
  startedOn: string;
  endedOn: string;
  contractAmount: string;
  description: string;
}

type FieldName = keyof FormValues;

const EMPTY_VALUES: FormValues = {
  name: '',
  clientName: '',
  startedOn: '',
  endedOn: '',
  contractAmount: '',
  description: '',
};

/** 생성 후 추가할 참여자 한 명 — 생성 요청 본문에는 실을 수 없다 (아래 주석 참고) */
interface PendingMember {
  /** 사번 */
  userId: string;
  name: string;
  department: string | null;
  permission: ProjectPermission;
}

/** 빈 문자열은 보내지 않는다 — 선택 필드라 생략이 곧 "값 없음" 이다 */
function orUndefined(value: string) {
  const trimmed = value.trim();
  return trimmed === '' ? undefined : trimmed;
}

// 프로젝트 직접 생성 화면. (.ai/API.md 138·PRJ-001)
// 이 화면은 공고와 연결되지 않은 프로젝트만 만든다 — bidNoticeId 를 보내지 않는다.
// 공고에서 시작하는 생성은 입찰 화면 소관이고, 같은 엔드포인트에 bidNoticeId 만 더 실린다.
// 상태는 시스템이 NOT_STARTED 로 정하고, 만든 사람은 자동으로 EDITOR 참여자가 된다.
// 회사도 로그인 사용자 것이 자동으로 박혀 화면이 고를 것이 없다.
// 참여자는 생성 요청 본문에 없다 (138) — 화면은 시안대로 한 화면에서 받되,
// 저장은 생성(138) → 참여자 추가(125) 한 명씩 두 단계로 나눠 보낸다.
// 프로젝트는 이미 만들어졌으므로, 참여자 추가가 실패해도 상세로 넘겨 다시 시도하게 한다
// (폼에 머물면 같은 프로젝트를 또 만들게 된다).
// 시안에서 발주처·사업 카테고리 에 붙은 필수 표시(*)는 따르지 않는다 —
// 명세상 선택 필드라 화면만 막으면 만들 수 있는 프로젝트를 못 만들게 된다.
export default function ProjectCreateForm() {
  const router = useRouter();
  const [values, setValues] = useState<FormValues>(EMPTY_VALUES);
  const [errors, setErrors] = useState<Partial<Record<FieldName, string>>>({});
  const [formError, setFormError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  /** 아직 안 왔으면 null — 불러오지 못했으면 hasCategoryFailed 로 구분한다 */
  const [categories, setCategories] = useState<MasterCategory[] | null>(null);
  const [hasCategoryFailed, setHasCategoryFailed] = useState(false);
  const [selectedCategoryIds, setSelectedCategoryIds] = useState<number[]>([]);
  const [members, setMembers] = useState<PendingMember[]>([]);

  useEffect(() => {
    const controller = new AbortController();
    const { signal } = controller;

    // 삭제분(includeDeleted)은 애초에 요청하지 않는다 — 연결하면 404 다
    getCategories({}, signal)
      .then(setCategories)
      .catch(() => {
        if (!signal.aborted) setHasCategoryFailed(true);
      });

    return () => controller.abort();
  }, []);

  function change(name: FieldName) {
    return (value: string) => {
      setValues((prev) => ({ ...prev, [name]: value }));
      // 고치는 중에 빨간 글씨가 남아 있으면 이미 해결한 것도 문제처럼 보인다
      setErrors((prev) => ({ ...prev, [name]: undefined }));
    };
  }

  function toggleCategory(categoryId: number) {
    setFormError(null);
    setSelectedCategoryIds((prev) =>
      prev.includes(categoryId)
        ? prev.filter((id) => id !== categoryId)
        : [...prev, categoryId],
    );
  }

  function changeMemberPermission(
    userId: string,
    permission: ProjectPermission,
  ) {
    setMembers((prev) =>
      prev.map((member) =>
        member.userId === userId ? { ...member, permission } : member,
      ),
    );
  }

  /** 백엔드가 400 으로 돌려줄 것을 미리 잡는다 — 왕복 한 번을 줄인다 */
  function validate() {
    const next: Partial<Record<FieldName, string>> = {};
    const name = values.name.trim();

    if (name === '') next.name = '과업명을 입력해주세요.';
    else if (name.length > PROJECT_NAME_MAX_LENGTH) {
      next.name = `과업명은 ${PROJECT_NAME_MAX_LENGTH}자를 넘을 수 없습니다.`;
    }

    if (values.clientName.trim().length > CLIENT_NAME_MAX_LENGTH) {
      next.clientName = `발주처는 ${CLIENT_NAME_MAX_LENGTH}자를 넘을 수 없습니다.`;
    }

    if (
      values.startedOn &&
      values.endedOn &&
      values.startedOn > values.endedOn
    ) {
      next.endedOn = '종료일이 시작일보다 앞설 수 없습니다.';
    }

    setErrors(next);

    const firstInvalid = Object.keys(next)[0];
    // 오류 항목으로 포커스를 옮기면 스크롤과 스크린리더 안내가 함께 처리된다
    if (firstInvalid) document.getElementById(firstInvalid)?.focus();

    return Object.keys(next).length === 0;
  }

  function toPayload(): CreateProjectRequest {
    const body: CreateProjectRequest = { name: values.name.trim() };

    body.description = orUndefined(values.description);
    body.clientName = orUndefined(values.clientName);
    body.startedOn = orUndefined(values.startedOn);
    body.endedOn = orUndefined(values.endedOn);

    if (values.contractAmount !== '') {
      body.contractAmount = Number(values.contractAmount);
    }
    // 빈 배열을 보내지 않는다 — 고른 게 없다는 뜻은 생략과 같다
    if (selectedCategoryIds.length > 0) {
      body.businessCategoryIds = selectedCategoryIds;
    }

    return body;
  }

  // 참여자 추가(125). 일괄 API 가 없어 한 명씩 부른다 (PRJ-009·INV-07).
  // 실패해도 프로젝트는 이미 생겼으므로 몇 명까지 됐는지만 돌려주고 이동은 막지 않는다.
  async function addMembers(projectId: number) {
    let addedCount = 0;
    let failedCount = 0;

    for (const member of members) {
      try {
        await addProjectMember(projectId, {
          userId: member.userId,
          permission: member.permission,
        });
        addedCount += 1;
      } catch {
        failedCount += 1;
      }
    }

    return { addedCount, failedCount };
  }

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    setFormError(null);

    if (!validate()) return;

    setIsSubmitting(true);

    let created;

    try {
      created = await createProject(toPayload());
    } catch (caught) {
      const code = caught instanceof ApiError ? caught.code : undefined;

      setFormError(
        code === PROJECT_CATEGORY_CODES.notFound
          ? '고른 사업 카테고리 중에 지금은 없는 것이 있습니다. 새로고침 후 다시 골라주세요.'
          : code === PROJECT_CODES.dateRangeInvalid
            ? '시작일이 종료일보다 늦습니다.'
            : messageOf(
                caught,
                '프로젝트를 생성하지 못했습니다. 잠시 후 다시 시도해주세요.',
              ),
      );
      setIsSubmitting(false);
      return;
    }

    const { addedCount, failedCount } = await addMembers(created.projectId);

    notifyToast(
      failedCount > 0
        ? `프로젝트를 생성하고 참여자 ${addedCount}명을 추가했습니다. ${failedCount}명은 추가하지 못했으니 설정 화면에서 다시 추가해주세요.`
        : addedCount > 0
          ? `프로젝트를 생성하고 참여자 ${addedCount}명을 추가했습니다.`
          : '프로젝트를 생성했습니다.',
    );

    // 뒤로 가기로 빈 폼에 돌아오지 않게 replace 로 상세를 연다
    router.replace(PROJECT_ROUTES.detail(created.projectId));
  }

  const selectable = categories?.filter((category) => !category.deletedAt);

  return (
    <div className="mx-auto w-full max-w-[820px]">
      {/*
        ⚠️ 공용 `Breadcrumb` 이 아니라 직접 그린 경로다 — 이 화면만 남았다.
        `Breadcrumb` 으로 옮기면 아래 간격(`mb-2`)까지 함께 따라온다.
      */}
      <p className="mb-2 text-caption text-text-secondary">
        <Link
          href={PROJECT_ROUTES.list}
          className="hover:text-text-primary hover:underline"
        >
          내 프로젝트
        </Link>
        {' › 프로젝트 생성'}
      </p>

      <PageTitle
        title="프로젝트 생성"
        description="공고 연결 없이 직접 생성하는 경로입니다."
      />

      <form onSubmit={submit} className="space-y-5 pb-10">
        <FormCard title="기본 정보">
          <div className="sm:col-span-2">
            <TextField
              id="name"
              label="과업명"
              required
              maxLength={PROJECT_NAME_MAX_LENGTH}
              placeholder="과업명을 입력하세요"
              value={values.name}
              error={errors.name}
              onChange={change('name')}
            />
          </div>

          <TextField
            id="clientName"
            label="발주처"
            maxLength={CLIENT_NAME_MAX_LENGTH}
            placeholder="발주처를 입력하세요"
            value={values.clientName}
            error={errors.clientName}
            onChange={change('clientName')}
          />

          <fieldset>
            <legend className="pb-1.5 text-caption font-semibold text-text-primary">
              사업 카테고리
            </legend>
            {hasCategoryFailed ? (
              <p className="text-caption break-keep text-text-secondary">
                카테고리를 불러오지 못했습니다. 생성 후 설정 화면에서 연결할 수
                있습니다.
              </p>
            ) : !selectable ? (
              <p className="text-caption text-text-secondary">불러오는 중…</p>
            ) : selectable.length === 0 ? (
              <p className="text-caption break-keep text-text-secondary">
                고를 수 있는 카테고리가 없습니다. 전사 관리에서 먼저
                등록해주세요.
              </p>
            ) : (
              <div className="flex flex-wrap gap-2">
                {selectable.map((category) => {
                  const isSelected = selectedCategoryIds.includes(
                    category.categoryId,
                  );

                  return (
                    <button
                      key={category.categoryId}
                      type="button"
                      // 여러 개를 켜고 끄는 버튼이라 누름 상태를 함께 알린다
                      aria-pressed={isSelected}
                      disabled={isSubmitting}
                      onClick={() => toggleCategory(category.categoryId)}
                      title={category.code ?? undefined}
                      className={`cursor-pointer rounded-button-md border px-3 py-1.5 text-caption transition-colors disabled:cursor-not-allowed disabled:opacity-40 ${
                        isSelected
                          ? 'border-btn-primary bg-btn-primary text-text-white'
                          : 'border-border-default bg-bg-card text-text-secondary hover:bg-bg-hover'
                      }`}
                    >
                      {category.name}
                    </button>
                  );
                })}
              </div>
            )}
          </fieldset>

          <TextField
            id="startedOn"
            label="시작일"
            type="date"
            value={values.startedOn}
            onChange={change('startedOn')}
          />
          <TextField
            id="endedOn"
            label="종료일"
            type="date"
            value={values.endedOn}
            error={errors.endedOn}
            onChange={change('endedOn')}
          />

          <div className="sm:col-span-2">
            <AmountField
              id="contractAmount"
              label="계약금액"
              placeholder="계약 확정 후 입력"
              value={values.contractAmount}
              onChange={change('contractAmount')}
            />
          </div>

          <div className="sm:col-span-2">
            <TextareaField
              id="description"
              label="설명"
              placeholder="과업 설명을 입력하세요"
              value={values.description}
              onChange={change('description')}
            />
          </div>
        </FormCard>

        <FormCard title="참여자" columns={1}>
          <EmployeeSearchInput
            // 이미 고른 사람은 목록에 남되 이미 추가됨 으로 선택만 막힌다
            excludedIds={members.map((member) => member.userId)}
            placeholder="사원 검색 (이름 · 부서)"
            disabled={isSubmitting}
            onSelect={(employee) =>
              setMembers((prev) => [
                ...prev,
                {
                  userId: employee.userId,
                  name: employee.name,
                  department: employee.department,
                  // 기본은 열람 — 편집은 고른 사람에게만 준다
                  permission: 'VIEWER',
                },
              ])
            }
          />

          {members.length > 0 && (
            <ul className="space-y-2">
              {members.map((member) => (
                <li
                  key={member.userId}
                  className="flex items-center gap-3 rounded-lg bg-bg-surface p-3"
                >
                  <MemberAvatar
                    userId={member.userId}
                    name={member.name}
                    size="sm"
                    decorative
                  />
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-detail font-medium text-text-primary">
                      {member.name}
                    </p>
                    <p className="truncate text-caption text-text-muted">
                      {member.department ?? '부서 미지정'}
                    </p>
                  </div>
                  <label
                    className="sr-only"
                    htmlFor={`permission-${member.userId}`}
                  >
                    {`${member.name} 권한`}
                  </label>
                  <select
                    id={`permission-${member.userId}`}
                    value={member.permission}
                    disabled={isSubmitting}
                    onChange={(event) =>
                      changeMemberPermission(
                        member.userId,
                        event.target.value as ProjectPermission,
                      )
                    }
                    className="input w-24 cursor-pointer py-1 text-caption"
                  >
                    {MEMBER_PERMISSIONS.map((permission) => (
                      <option key={permission} value={permission}>
                        {MEMBER_PERMISSION_LABELS[permission]}
                      </option>
                    ))}
                  </select>
                  <button
                    type="button"
                    aria-label={`${member.name} 제외`}
                    disabled={isSubmitting}
                    onClick={() =>
                      setMembers((prev) =>
                        prev.filter((item) => item.userId !== member.userId),
                      )
                    }
                    className="cursor-pointer px-1 text-text-muted hover:text-text-primary disabled:cursor-not-allowed disabled:opacity-40"
                  >
                    ✕
                  </button>
                </li>
              ))}
            </ul>
          )}

          <p className="rounded-lg border border-border-default bg-bg-surface px-4 py-3 text-caption break-keep text-text-secondary">
            참여자는 한 명씩 추가합니다. 부서 · 팀 단위 일괄 추가는 지원하지
            않습니다. 만든 사람은 자동으로 편집 권한 참여자가 됩니다.
          </p>
        </FormCard>

        {formError && <AlertBanner tone="danger">{formError}</AlertBanner>}

        <div className="flex gap-3">
          <button
            type="submit"
            disabled={isSubmitting}
            className="btn btn-md btn-primary min-w-[104px] px-8"
          >
            {isSubmitting ? '생성 중…' : '생성'}
          </button>
          <Link href={PROJECT_ROUTES.list} className="btn btn-md btn-gray px-8">
            취소
          </Link>
        </div>
      </form>
    </div>
  );
}
