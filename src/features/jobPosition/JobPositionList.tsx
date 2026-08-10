'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';

import RowMenu from '@/components/RowMenu';
import { JobPositionTableSkeleton } from '@/components/settings/SettingsSkeletons';
import { useModalTarget } from '@/lib/useModal';

import { getJobPositions, updateJobPosition } from './api';
import DeleteJobPositionModal from './DeleteJobPositionModal';
import JobPositionFormModal from './JobPositionFormModal';
import type { JobPosition } from './types';

/** 폼 모달 대상 — 'create' 는 추가, 객체는 그 직급 수정 */
type FormTarget = 'create' | JobPosition;

/**
 * 직급 관리 화면. (ADMIN 전용, .ai/API.md 26~29)
 *
 * 백엔드가 `sortOrder` → 직급명 순으로 정렬해 주므로 화면에서 다시 정렬하지 않는다.
 */
export default function JobPositionList() {
  const [reloadCount, setReloadCount] = useState(0);
  /** 어떤 요청의 결과인지 `key` 로 들고 있는다 — 재조회하면 자동으로 로딩 상태가 된다 */
  const [result, setResult] = useState<{
    key: string;
    list?: JobPosition[];
    hasFailed?: boolean;
  } | null>(null);
  /** 순서 변경 중 — 연타로 순서가 꼬이지 않게 잠근다 */
  const [isMoving, setIsMoving] = useState(false);
  const [moveError, setMoveError] = useState('');
  const formModal = useModalTarget<FormTarget>();
  const deleteModal = useModalTarget<JobPosition>();

  const requestKey = String(reloadCount);
  const current = result?.key === requestKey ? result : null;
  /** 재조회 중에는 직전 목록을 유지한다 — 표가 통째로 사라지면 스크롤이 튄다 */
  const positions = current?.list ?? result?.list ?? null;
  const hasFailed = current?.hasFailed ?? false;

  useEffect(() => {
    const controller = new AbortController();
    const { signal } = controller;

    getJobPositions(signal)
      .then((list) => setResult({ key: requestKey, list }))
      .catch(() => {
        // 취소는 실패가 아니다
        if (!signal.aborted) setResult({ key: requestKey, hasFailed: true });
      });

    return () => controller.abort();
  }, [requestKey]);

  function reload() {
    setReloadCount((count) => count + 1);
  }

  /**
   * 이웃 직급과 자리를 바꾼다.
   *
   * 값만 맞바꾸면 동률(`sortOrder` 는 UNIQUE 가 아니다)일 때 한 칸이 아니라
   * 목록 끝까지 밀려난다. 그래서 옮긴 뒤의 화면 순서대로 1부터 다시 매기고,
   * 값이 달라진 직급만 보낸다 — 동률이 몇 개든 결과가 확정된다.
   */
  async function move(index: number, direction: -1 | 1) {
    if (!positions) return;

    const nextIndex = index + direction;
    if (nextIndex < 0 || nextIndex >= positions.length) return;

    const reordered = [...positions];
    const [moved] = reordered.splice(index, 1);
    reordered.splice(nextIndex, 0, moved);

    setIsMoving(true);
    setMoveError('');

    try {
      for (const [order, position] of reordered.entries()) {
        const sortOrder = order + 1;
        if (position.sortOrder === sortOrder) continue;

        await updateJobPosition(position.jobPositionId, { sortOrder });
      }
    } catch {
      // 중간에 끊기면 순서가 어긋난 채로 남는다 — 재조회 결과가 진실이다
      setMoveError('순서를 바꾸지 못했습니다. 잠시 후 다시 시도해주세요.');
    } finally {
      setIsMoving(false);
      reload();
    }
  }

  return (
    <>
      <p className="text-xs text-text-secondary">
        <Link
          href="/settings"
          className="hover:text-text-primary hover:underline"
        >
          전사 관리
        </Link>{' '}
        &gt; 직급 관리
      </p>

      <div className="mt-2 mb-6 flex items-start justify-between gap-4">
        <div className="min-w-0">
          <h2 className="text-lg font-bold">직급 관리</h2>
          <p className="mt-1.5 text-xs break-keep text-text-secondary">
            사원에게 지정할 직급과 노출 순서를 관리합니다. 사용 중인 직급은
            삭제할 수 없습니다.
          </p>
        </div>
        <AddButton onClick={() => formModal.open('create')} />
      </div>

      <p
        role="alert"
        className="mb-2 text-[11px] break-keep text-text-danger empty:hidden"
      >
        {moveError}
      </p>

      <div className="rounded-xl border border-border-default bg-white">
        {hasFailed ? (
          <Centered>
            <p className="text-xs text-text-secondary">
              직급을 불러오지 못했습니다.
            </p>
            <button
              type="button"
              onClick={reload}
              className="cursor-pointer rounded-lg bg-btn-primary px-4 py-1.5 text-[11px] font-semibold text-white hover:bg-btn-primary-hover"
            >
              다시 시도
            </button>
          </Centered>
        ) : !positions ? (
          <JobPositionTableSkeleton />
        ) : positions.length === 0 ? (
          <Centered>
            <BadgeIcon />
            <p className="text-sm font-bold text-text-primary">
              등록된 직급이 없습니다
            </p>
            <p className="text-xs break-keep text-text-secondary">
              직급을 추가하면 사원 등록 시 선택할 수 있어요
            </p>
            <AddButton subtle onClick={() => formModal.open('create')} />
          </Centered>
        ) : (
          // 목록이 길어지면 이 영역만 스크롤된다
          <div className="max-h-[60vh] overflow-y-auto">
            <table className="w-full table-fixed border-collapse text-left">
              <thead className="sticky top-0 bg-white">
                <tr className="border-b border-border-default text-[11px] text-text-secondary">
                  <th className="w-16 px-5 py-3 font-medium">순서</th>
                  <th className="px-5 py-3 font-medium">직급명</th>
                  <th className="w-28 px-5 py-3 font-medium">사용 인원</th>
                  <th className="w-24 px-5 py-3 font-medium">순서 변경</th>
                  <th className="w-14 px-5 py-3">
                    <span className="sr-only">관리</span>
                  </th>
                </tr>
              </thead>
              <tbody>
                {positions.map((position, index) => (
                  <tr
                    key={position.jobPositionId}
                    className="border-b border-border-default last:border-b-0"
                  >
                    <td className="px-5 py-3.5 text-xs text-text-secondary">
                      {index + 1}
                    </td>
                    <td className="px-5 py-3.5">
                      <span className="block truncate text-xs font-bold text-text-primary">
                        {position.name}
                      </span>
                    </td>
                    <td className="px-5 py-3.5">
                      {position.employeeCount > 0 ? (
                        <span className="text-xs text-text-secondary">
                          {position.employeeCount}명
                        </span>
                      ) : (
                        <span className="text-xs text-text-muted">미사용</span>
                      )}
                    </td>
                    <td className="px-5 py-3.5">
                      <span className="flex items-center gap-1">
                        <MoveButton
                          direction="up"
                          name={position.name}
                          disabled={index === 0 || isMoving}
                          onClick={() => move(index, -1)}
                        />
                        <MoveButton
                          direction="down"
                          name={position.name}
                          disabled={index === positions.length - 1 || isMoving}
                          onClick={() => move(index, 1)}
                        />
                      </span>
                    </td>
                    <td className="px-5 py-3.5 text-right">
                      <RowMenu
                        label={position.name}
                        items={[
                          {
                            label: '수정',
                            onSelect: () => formModal.open(position),
                          },
                          {
                            label: '삭제',
                            danger: true,
                            onSelect: () => deleteModal.open(position),
                          },
                        ]}
                      />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {formModal.target && (
        <JobPositionFormModal
          position={
            formModal.target === 'create' ? undefined : formModal.target
          }
          onClose={formModal.close}
          onSaved={reload}
        />
      )}

      {deleteModal.target && (
        <DeleteJobPositionModal
          position={deleteModal.target}
          onClose={deleteModal.close}
          onDeleted={reload}
        />
      )}
    </>
  );
}

function AddButton({
  subtle,
  onClick,
}: {
  subtle?: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`shrink-0 cursor-pointer rounded-lg px-4 py-2 text-xs font-semibold ${
        subtle
          ? 'border border-border-default text-text-primary hover:bg-bg-hover'
          : 'bg-btn-primary text-white hover:bg-btn-primary-hover'
      }`}
    >
      + 직급 추가
    </button>
  );
}

function MoveButton({
  direction,
  name,
  disabled,
  onClick,
}: {
  direction: 'up' | 'down';
  name: string;
  disabled: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      aria-label={`${name} ${direction === 'up' ? '위로' : '아래로'} 이동`}
      className="cursor-pointer rounded border border-border-default px-1.5 py-1 text-text-secondary hover:bg-bg-hover hover:text-text-primary disabled:cursor-not-allowed disabled:text-text-muted disabled:hover:bg-transparent"
    >
      <svg
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
        aria-hidden
        className="size-3"
      >
        <path d={direction === 'up' ? 'm6 15 6-6 6 6' : 'm6 9 6 6 6-6'} />
      </svg>
    </button>
  );
}

function Centered({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex flex-col items-center justify-center gap-2 px-5 py-20 text-center">
      {children}
    </div>
  );
}

function BadgeIcon() {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.5"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
      className="mb-2 size-10 text-text-muted"
    >
      <circle cx="12" cy="9" r="5" />
      <path d="m8.5 13.5-1 7 4.5-2.5 4.5 2.5-1-7" />
    </svg>
  );
}
