'use client';

import { useState } from 'react';

import { AlertDialogTwoButton, DialogIcons } from '@/components/AlertDialog';
import PanelModal, { ModalFooter } from '@/components/PanelModal';
import EmployeeSearchInput from '@/features/employee/EmployeeSearchInput';
import { ApiError, messageOf } from '@/lib/api';

import { grantPagePermissions } from './api';
import { grantSummary, PERMISSION_LABEL } from './display';
import { PAGE_CODES } from './errorCodes';
import type { GrantablePermission, PageAccessor, PageSummary } from './types';

/** 고른 사람 한 줄 — 검색 결과에는 부서 · 직급이 한 문자열로 온다 */
interface PickedEmployee {
  userId: string;
  name: string;
  belongs: string;
  permission: GrantablePermission;
}

interface GrantPermissionModalProps {
  page: PageSummary;
  /** 있으면 **등급 변경** 모드 — 사람은 고정이고 등급만 고른다 */
  target?: PageAccessor;
  /** 이미 접근 가능한 사람 — 검색 목록에서 `이미 추가됨` 으로 막는다 */
  accessorIds?: string[];
  onClose: () => void;
  onGranted: (summary: string) => void;
}

const OPTIONS: GrantablePermission[] = ['VIEWER', 'EDITOR'];

/**
 * 페이지 권한 부여 · 등급 변경 모달. (.ai/API.md 101)
 *
 * 부여와 변경이 같은 API 라 화면도 하나로 둔다 — `target` 유무로만 갈린다.
 * 요청에 없는 사람은 건드리지 않으므로(전체 교체가 아니다) 고른 사람만 보내면 된다.
 */
export default function GrantPermissionModal({
  page,
  target,
  accessorIds = [],
  onClose,
  onGranted,
}: GrantPermissionModalProps) {
  const isEditing = target !== undefined;

  const [picked, setPicked] = useState<PickedEmployee[]>(
    target
      ? [
          {
            userId: target.userId,
            name: target.name,
            belongs: [target.jobPositionName, target.departmentPath]
              .filter(Boolean)
              .join(' · '),
            // 회수 불가 사용자는 등급이 NONE 일 수 있어 기본값을 뷰어로 둔다
            permission: target.permission === 'EDITOR' ? 'EDITOR' : 'VIEWER',
          },
        ]
      : [],
  );
  const [error, setError] = useState('');
  const [isConfirming, setIsConfirming] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  /** 저장 중에는 닫지 않는다 — 결과를 못 보고 닫히면 뭐가 반영됐는지 알 수 없다 */
  function requestClose() {
    if (!isSubmitting) onClose();
  }

  function setPermission(userId: string, permission: GrantablePermission) {
    setPicked((list) =>
      list.map((item) =>
        item.userId === userId ? { ...item, permission } : item,
      ),
    );
  }

  const canSubmit = picked.length > 0 && !isSubmitting;

  /** 저장 전에 한 번 더 묻는다 — 권한은 눌러서 바로 바뀌면 안 되는 값이다 */
  function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    if (!canSubmit) return;

    setError('');
    setIsConfirming(true);
  }

  async function grant() {
    setError('');
    setIsSubmitting(true);

    try {
      const result = await grantPagePermissions(
        page.pageCode,
        picked.map(({ userId, permission }) => ({ userId, permission })),
      );

      onGranted(grantSummary(result));
      onClose();
    } catch (caught) {
      const code = caught instanceof ApiError ? caught.code : undefined;

      // 없는 사번이 섞이면 전체가 거부된다 — 누가 문제인지는 message 에만 있다
      setError(
        code === PAGE_CODES.notFound
          ? '페이지를 찾을 수 없습니다. 목록을 새로고침해주세요.'
          : messageOf(caught, '권한을 저장하지 못했습니다.'),
      );
      // 확인 창을 닫아 폼으로 돌려보낸다 — 고칠 곳이 폼에 있다
      setIsConfirming(false);
      setIsSubmitting(false);
    }
  }

  /** 확인 문구 — 몇 명에게 어떤 등급인지 한 줄로 보여준다 */
  const confirmTarget =
    picked.length === 1
      ? `${picked[0].name} 님에게 ${PERMISSION_LABEL[picked[0].permission]}`
      : `${picked.length}명에게`;

  // 확인 창은 폼 위에 덮어 띄운다 — 뒤 화면이 그대로 보여야 뭘 저장하는지 확인된다
  if (isConfirming) {
    return (
      <AlertDialogTwoButton
        icon={DialogIcons.info}
        title={isEditing ? '등급을 변경할까요?' : '권한을 부여할까요?'}
        description={
          <>
            {confirmTarget} <b>{page.name}</b> 페이지 권한을{' '}
            {isEditing ? '변경합니다' : '부여합니다'}.
            <br />
            나중에 회수하거나 등급을 다시 바꿀 수 있습니다.
          </>
        }
        errorMessage={error || undefined}
        confirmLabel={isEditing ? '변경' : '부여'}
        isBusy={isSubmitting}
        onConfirm={grant}
        onCancel={() => setIsConfirming(false)}
      />
    );
  }

  return (
    <PanelModal
      title={isEditing ? '등급 변경' : `${page.name} 권한 부여`}
      onClose={requestClose}
    >
      <form onSubmit={handleSubmit}>
        <div className="space-y-4 p-5">
          {!isEditing && (
            <div>
              <label className="block pb-1.5 text-detail font-semibold text-text-primary">
                사원 검색
              </label>
              <EmployeeSearchInput
                placeholder="이름 검색 (예: 김)"
                disabled={isSubmitting}
                excludedIds={[
                  ...accessorIds,
                  ...picked.map((item) => item.userId),
                ]}
                onSelect={(employee) =>
                  setPicked((list) => [
                    ...list,
                    {
                      userId: employee.userId,
                      name: employee.name,
                      belongs: [employee.position, employee.department]
                        .filter(Boolean)
                        .join(' · '),
                      permission: 'VIEWER',
                    },
                  ])
                }
              />
              <p className="mt-1 text-caption break-keep text-text-secondary"></p>
            </div>
          )}

          {picked.length === 0 ? (
            <p className="rounded-lg border border-dashed border-border-default px-3 py-6 text-center text-detail text-text-secondary">
              권한을 줄 사원을 검색해 추가해주세요.
            </p>
          ) : (
            <ul className="space-y-2">
              {picked.map((item) => (
                <li
                  key={item.userId}
                  className="flex items-center gap-2 rounded-lg border border-border-default bg-bg-surface px-3 py-2.5"
                >
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-label font-semibold text-text-primary">
                      {item.name}
                      <span className="ml-1 font-normal text-text-secondary">
                        {item.userId}
                      </span>
                    </span>
                    {item.belongs && (
                      <span className="mt-0.5 block truncate text-caption text-text-secondary">
                        {item.belongs}
                      </span>
                    )}
                  </span>

                  {/* 3지선다 중 X(NONE)는 부여가 아니라 회수라 여기 없다 */}
                  <span className="flex shrink-0 items-center gap-1">
                    {OPTIONS.map((option) => (
                      <button
                        key={option}
                        type="button"
                        aria-pressed={item.permission === option}
                        onClick={() => setPermission(item.userId, option)}
                        className={`btn btn-sm ${
                          item.permission === option
                            ? 'btn-primary'
                            : 'btn-gray-outlined'
                        }`}
                      >
                        {PERMISSION_LABEL[option]}
                      </button>
                    ))}
                  </span>

                  {!isEditing && (
                    <button
                      type="button"
                      onClick={() =>
                        setPicked((list) =>
                          list.filter((row) => row.userId !== item.userId),
                        )
                      }
                      aria-label={`${item.name} 제외`}
                      className="shrink-0 cursor-pointer px-1 text-text-muted hover:text-text-primary"
                    >
                      ✕
                    </button>
                  )}
                </li>
              ))}
            </ul>
          )}
        </div>

        <ModalFooter>
          {/* 요소를 먼저 두고 내용만 바꿔야 스크린리더가 읽는다 */}
          <p
            role="alert"
            className="mr-auto text-caption break-keep text-text-danger"
          >
            {error}
          </p>
          <div className="flex shrink-0 items-center gap-2">
            <button
              type="button"
              onClick={requestClose}
              disabled={isSubmitting}
              className="btn btn-md btn-gray-outlined"
            >
              취소
            </button>
            <button
              type="submit"
              disabled={!canSubmit}
              className="btn btn-md btn-primary"
            >
              {isSubmitting ? '저장 중…' : isEditing ? '변경' : '부여'}
            </button>
          </div>
        </ModalFooter>
      </form>
    </PanelModal>
  );
}
