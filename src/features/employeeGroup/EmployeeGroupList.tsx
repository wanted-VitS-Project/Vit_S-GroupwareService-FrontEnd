'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';

import PageTitle from '@/components/PageTitle';
import RowMenu from '@/components/RowMenu';
import { isAbortError } from '@/lib/api';
import { formatDate } from '@/lib/format';
import { useModalTarget } from '@/lib/useModal';

import { getEmployeeGroups } from './api';
import DeleteEmployeeGroupModal from './DeleteEmployeeGroupModal';
import EmployeeGroupFormModal from './EmployeeGroupFormModal';
import GroupMembersModal from './GroupMembersModal';
import type { EmployeeGroup } from './types';

/** 폼 모달 대상 — 'create' 는 추가, 객체는 그 그룹 수정 (`JobPositionList` 와 같은 규약) */
type FormTarget = 'create' | EmployeeGroup;

/**
 * 사원 그룹 관리 화면. (.ai/API.md 91~97)
 *
 * 조회는 전체 사용자지만 변경은 ADMIN 이라 전사 관리 아래에 둔다.
 * 그룹은 **권한이 아니라 선택용 인덱스**다 — 화면 문구가 이 사실을 흐리지 않아야 한다.
 */
export default function EmployeeGroupList() {
  /** 입력 중인 검색어 — 제출해야 조회한다 */
  const [keywordInput, setKeywordInput] = useState('');
  const [keyword, setKeyword] = useState('');
  const [reloadCount, setReloadCount] = useState(0);

  /** 어떤 요청의 결과인지 `key` 로 들고 있는다 — 조건이 바뀌면 자동으로 로딩 상태가 된다 */
  const [result, setResult] = useState<{
    key: string;
    data?: EmployeeGroup[];
    hasFailed?: boolean;
  } | null>(null);

  const formModal = useModalTarget<FormTarget>();
  const deleteModal = useModalTarget<EmployeeGroup>();
  const membersModal = useModalTarget<EmployeeGroup>();

  const requestKey = `${reloadCount} ${keyword}`;
  const current = result?.key === requestKey ? result : null;
  /** 재조회 중에는 직전 목록을 유지한다 — 표가 사라지면 화면이 출렁인다 */
  const groups = current?.data ?? result?.data ?? null;
  const hasFailed = current?.hasFailed ?? false;

  useEffect(() => {
    const controller = new AbortController();
    const { signal } = controller;

    getEmployeeGroups(keyword || undefined, signal)
      .then((data) => setResult({ key: requestKey, data }))
      .catch((caught) => {
        // 취소는 실패가 아니다
        if (!isAbortError(caught)) {
          setResult({ key: requestKey, hasFailed: true });
        }
      });

    return () => controller.abort();
  }, [requestKey, keyword]);

  function reload() {
    setReloadCount((count) => count + 1);
  }

  return (
    <>
      <p className="text-xs text-text-secondary">
        <Link href="/settings" className="hover:text-text-primary">
          전사 관리
        </Link>{' '}
        &gt; 그룹 관리
      </p>

      <div className="mt-2 mb-6 flex items-start justify-between gap-4">
        <div className="min-w-0">
          <PageTitle title="그룹 관리" />
          <p className="mt-1.5 text-xs break-keep text-text-secondary">
            사원을 묶어두면 결재선 · 페이지 권한에서 한 번에 고를 수 있습니다.
            그룹 자체는 권한이 아닙니다.
          </p>
        </div>
        <button
          type="button"
          onClick={() => formModal.open('create')}
          className="btn btn-sm btn-primary shrink-0"
        >
          + 그룹 추가
        </button>
      </div>

      <form
        onSubmit={(event) => {
          event.preventDefault();
          setKeyword(keywordInput.trim());
        }}
        className="mb-4 flex gap-2"
      >
        <input
          type="search"
          value={keywordInput}
          onChange={(event) => setKeywordInput(event.target.value)}
          placeholder="그룹명 검색"
          aria-label="그룹명 검색"
          className="w-64 rounded-lg border border-border-default px-3 py-2 text-xs text-text-primary placeholder:text-text-secondary focus:outline-2 focus:outline-offset-2 focus:outline-border-primary"
        />
        <button type="submit" className="btn btn-sm btn-gray-outlined">
          검색
        </button>
      </form>

      <div className="overflow-hidden rounded-xl border border-border-default bg-white">
        {hasFailed ? (
          <Centered>
            <p className="text-xs text-text-secondary">
              그룹을 불러오지 못했습니다.
            </p>
            <button
              type="button"
              onClick={reload}
              className="btn btn-sm btn-gray-outlined mt-2"
            >
              다시 시도
            </button>
          </Centered>
        ) : groups === null ? (
          <Centered>
            <p className="text-xs text-text-secondary">불러오는 중…</p>
          </Centered>
        ) : groups.length === 0 ? (
          <Centered>
            <p className="text-xs break-keep text-text-secondary">
              {keyword
                ? `'${keyword}' 와 일치하는 그룹이 없습니다.`
                : '아직 만든 그룹이 없습니다.'}
            </p>
          </Centered>
        ) : (
          <table className="w-full text-left text-xs">
            <thead className="border-b border-border-default bg-bg-surface">
              <tr className="text-text-secondary">
                <th scope="col" className="px-5 py-3 font-medium">
                  그룹명
                </th>
                <th scope="col" className="px-5 py-3 font-medium">
                  설명
                </th>
                <th scope="col" className="px-5 py-3 font-medium">
                  구성원
                </th>
                <th scope="col" className="px-5 py-3 font-medium">
                  생성
                </th>
                <th scope="col" className="w-12 px-5 py-3" />
              </tr>
            </thead>
            <tbody>
              {groups.map((group) => (
                <tr
                  key={group.groupId}
                  className="border-b border-border-default last:border-b-0"
                >
                  <td className="px-5 py-3.5 font-semibold text-text-primary">
                    {group.name}
                  </td>
                  <td className="max-w-xs px-5 py-3.5 break-keep text-text-secondary">
                    {group.description || '—'}
                  </td>
                  <td className="px-5 py-3.5 whitespace-nowrap">
                    <button
                      type="button"
                      onClick={() => membersModal.open(group)}
                      className="cursor-pointer font-medium text-text-primary-blue underline underline-offset-2"
                    >
                      {group.memberCount}명
                    </button>
                  </td>
                  <td className="px-5 py-3.5 whitespace-nowrap text-text-secondary">
                    {group.createdByName}
                    <span className="ml-1.5 text-text-muted">
                      {formatDate(group.createdAt)}
                    </span>
                  </td>
                  <td className="px-5 py-3.5 text-right">
                    <RowMenu
                      label={group.name}
                      items={[
                        {
                          label: '구성원 관리',
                          onSelect: () => membersModal.open(group),
                        },
                        {
                          label: '수정',
                          onSelect: () => formModal.open(group),
                        },
                        {
                          label: '삭제',
                          danger: true,
                          onSelect: () => deleteModal.open(group),
                        },
                      ]}
                    />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {formModal.target && (
        <EmployeeGroupFormModal
          group={formModal.target === 'create' ? undefined : formModal.target}
          onClose={formModal.close}
          onSaved={reload}
        />
      )}

      {deleteModal.target && (
        <DeleteEmployeeGroupModal
          group={deleteModal.target}
          onClose={deleteModal.close}
          onDeleted={reload}
        />
      )}

      {membersModal.target && (
        <GroupMembersModal
          group={membersModal.target}
          onClose={membersModal.close}
          // 인원수가 바뀌면 목록의 `memberCount` 도 틀린 값이 된다
          onChanged={reload}
        />
      )}
    </>
  );
}

function Centered({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex flex-col items-center justify-center px-5 py-20 text-center">
      {children}
    </div>
  );
}
