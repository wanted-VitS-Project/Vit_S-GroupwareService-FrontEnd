'use client';

import Breadcrumb from '@/components/Breadcrumb';
import { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';

import DataTable from '@/components/DataTable';
import PageTitle from '@/components/PageTitle';
import { useModalTarget } from '@/lib/useModal';

import { getCategories } from './api';
import CategoryFormModal from './CategoryFormModal';
import DeleteCategoryModal from './DeleteCategoryModal';
import type { BusinessCategory } from './types';

/** 폼 모달 대상 — 'create' 는 추가, 객체는 그 카테고리 수정 */
type FormTarget = 'create' | BusinessCategory;

/**
 * 사업 카테고리 관리 화면. (ADMIN 전용, .ai/API.md 15~18)
 *
 * 목록 API 가 이름 오름차순 전체를 주고 페이징이 없어 스크롤로 보여준다.
 * 검색은 백엔드 `keyword` 를 쓰므로 화면에서 다시 걸러내지 않는다.
 */
export default function CategoryList() {
  const [keyword, setKeyword] = useState('');
  /** 실제 요청에 쓰는 검색어 — 돋보기 버튼 · 엔터로만 반영한다 */
  const [search, setSearch] = useState('');
  /** ADMIN 만 삭제분을 볼 수 있다 (BCT-008) */
  const [includeDeleted, setIncludeDeleted] = useState(false);
  const [reloadCount, setReloadCount] = useState(0);
  /**
   * 어떤 요청의 결과인지 `key` 로 들고 있는다.
   * 조건이 바뀌면 key 가 어긋나 자동으로 로딩 상태가 되므로,
   * 효과 본문에서 상태를 되돌릴 필요가 없다 (`react-hooks/set-state-in-effect`).
   */
  const [result, setResult] = useState<{
    key: string;
    list?: BusinessCategory[];
    hasFailed?: boolean;
  } | null>(null);
  const formModal = useModalTarget<FormTarget>();
  const deleteModal = useModalTarget<BusinessCategory>();

  function changeKeyword(value: string) {
    setKeyword(value);
    // 입력을 비우면 검색을 실행하지 않아도 전체 목록으로 돌아온다
    if (value.trim() === '') setSearch('');
  }

  const requestKey = `${reloadCount} ${includeDeleted} ${search}`;
  /** 지금 조건의 결과만 화면에 쓴다 — 이전 요청 결과는 로딩으로 본다 */
  const current = result?.key === requestKey ? result : null;
  /**
   * 🗑️ 삭제분은 이력일 뿐이라 활성 행 아래로 내린다 — 삭제한 이름을 다시 등록할 수 있어
   * 같은 이름이 두 줄 보일 수 있고, 그때 위쪽이 지금 쓰는 행이어야 한다.
   * `sort` 는 안정 정렬이라 백엔드의 이름 오름차순은 각 묶음 안에서 유지된다.
   */
  const categories = current?.list
    ? [...current.list].sort(
        (a, b) => Number(Boolean(a.deletedAt)) - Number(Boolean(b.deletedAt)),
      )
    : null;
  const hasFailed = current?.hasFailed ?? false;

  useEffect(() => {
    const controller = new AbortController();
    const { signal } = controller;

    getCategories({ keyword: search || undefined, includeDeleted }, signal)
      .then((list) => setResult({ key: requestKey, list }))
      .catch(() => {
        // 취소는 실패가 아니다
        if (!signal.aborted) setResult({ key: requestKey, hasFailed: true });
      });

    return () => controller.abort();
  }, [requestKey, search, includeDeleted]);

  function reload() {
    setReloadCount((count) => count + 1);
  }

  return (
    <>
      <Breadcrumb
        items={[
          { label: '전사 관리', href: '/settings' },
          { label: '사업 카테고리' },
        ]}
      />

      <PageTitle
        title="사업 카테고리"
        description="프로젝트에 지정할 사업 분류를 관리합니다."
      >
        <AddButton onClick={() => formModal.open('create')} />
      </PageTitle>

      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <form
          onSubmit={(event) => {
            event.preventDefault();
            setSearch(keyword.trim());
          }}
          className="relative w-72"
        >
          <label htmlFor="categorySearch" className="sr-only">
            카테고리 검색
          </label>
          <input
            id="categorySearch"
            type="search"
            value={keyword}
            onChange={(event) => changeKeyword(event.target.value)}
            placeholder="카테고리 이름 · 업무코드 검색"
            className="w-full rounded-lg border border-border-default py-2 pr-10 pl-3 text-label text-text-primary placeholder:text-text-secondary focus:outline-2 focus:outline-offset-2 focus:outline-border-primary"
          />
          <button
            type="submit"
            aria-label="검색"
            className="absolute top-1/2 right-1 flex size-7 -translate-y-1/2 cursor-pointer items-center justify-center rounded-button-md text-text-secondary hover:bg-bg-hover hover:text-text-primary"
          >
            <SearchIcon />
          </button>
        </form>

        <button
          type="button"
          role="switch"
          aria-checked={includeDeleted}
          onClick={() => setIncludeDeleted((current) => !current)}
          className="flex cursor-pointer items-center gap-2 text-label text-text-secondary"
        >
          <span
            className={`flex h-5 w-9 shrink-0 items-center rounded-pill p-0.5 transition-colors ${
              includeDeleted ? 'bg-btn-primary' : 'bg-bg-hover'
            }`}
          >
            <span
              className={`size-4 rounded-pill bg-bg-card shadow transition-transform ${
                includeDeleted ? 'translate-x-4' : ''
              }`}
            />
          </span>
          삭제된 항목 보기
        </button>
      </div>

      <DataTable
        caption="사업 카테고리 목록"
        columns={[
          {
            key: 'name',
            header: '카테고리 이름',
            width: '13rem',
            skeletonWidth: 'w-28',
            cell: (category) => (
              <span className="flex items-center gap-2">
                <span className="min-w-0 truncate font-bold text-text-primary">
                  {category.name}
                </span>
                {category.deletedAt && (
                  <span className="badge badge-gray shrink-0">삭제됨</span>
                )}
              </span>
            ),
          },
          {
            key: 'code',
            header: '업무코드',
            // 업무코드는 최대 30자라 넉넉히 잡고 줄바꿈을 막는다
            width: '14rem',
            skeletonWidth: 'w-24',
            cell: (category) =>
              category.code ? (
                <span
                  title={category.code}
                  className="inline-block max-w-full truncate rounded-button-sm border border-border-default bg-bg-surface px-1.5 py-0.5 font-mono text-caption whitespace-nowrap text-text-secondary"
                >
                  {category.code}
                </span>
              ) : (
                <span className="text-text-secondary">—</span>
              ),
          },
          {
            key: 'description',
            header: '설명',
            skeletonWidth: 'w-48',
            cell: (category) => (
              <p className="truncate text-text-secondary">
                {category.description || '—'}
              </p>
            ),
          },
          {
            key: 'menu',
            header: <span className="sr-only">관리</span>,
            width: '3.5rem',
            align: 'right',
            skeletonWidth: 'w-6',
            // 삭제된 항목은 수정 · 삭제가 모두 404 라 메뉴를 숨긴다
            cell: (category) =>
              category.deletedAt ? null : (
                <RowMenu
                  name={category.name}
                  onEdit={() => formModal.open(category)}
                  onDelete={() => deleteModal.open(category)}
                />
              ),
          },
        ]}
        rows={hasFailed ? [] : categories}
        rowKey={(category) => category.categoryId}
        // 삭제 행은 흐리게 — 이름이 겹치면 배지만으론 덜 띈다
        rowClassName={(category) => (category.deletedAt ? 'opacity-60' : '')}
        // 목록이 길어지면 표 영역만 스크롤된다
        maxHeight="60vh"
        errorMessage={hasFailed ? '카테고리를 불러오지 못했습니다.' : undefined}
        onRetry={reload}
        emptyState={
          <>
            <FolderIcon />
            <p className="text-body-m font-bold text-text-primary">
              {search
                ? '검색 결과가 없습니다'
                : '등록된 사업 카테고리가 없습니다'}
            </p>
            <p className="text-label break-keep text-text-secondary">
              {search
                ? '다른 이름이나 업무코드로 검색해 주세요'
                : '카테고리를 추가하면 프로젝트 생성 시 선택할 수 있습니다'}
            </p>
            {!search && (
              <AddButton subtle onClick={() => formModal.open('create')} />
            )}
          </>
        }
      />

      {formModal.target && (
        <CategoryFormModal
          category={
            formModal.target === 'create' ? undefined : formModal.target
          }
          onClose={formModal.close}
          onSaved={reload}
        />
      )}

      {deleteModal.target && (
        <DeleteCategoryModal
          category={deleteModal.target}
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
      className={`shrink-0 cursor-pointer rounded-lg px-4 py-2 text-label font-semibold ${
        subtle
          ? 'border border-border-default text-text-primary hover:bg-bg-hover'
          : 'bg-btn-primary text-text-white hover:bg-btn-primary-hover'
      }`}
    >
      + 카테고리 추가
    </button>
  );
}

/** 열 위치를 미리 계산해야 해서 크기를 값으로 갖고 있는다 (w-24 · 항목 2개) */
const MENU_WIDTH = 96;
const MENU_HEIGHT = 72;

/**
 * 행별 수정 · 삭제 메뉴. 바깥 클릭 · ESC 로 닫는다.
 *
 * 표가 스크롤 영역 안이라 `absolute` 로 띄우면 아래쪽 행에서 잘린다.
 * body 로 빼서 `fixed` 로 띄우고 좌표는 열 때 버튼 위치에서 계산한다 —
 * 좌표가 굳으므로 스크롤 · 리사이즈가 생기면 닫는다.
 */
function RowMenu({
  name,
  onEdit,
  onDelete,
}: {
  name: string;
  onEdit: () => void;
  onDelete: () => void;
}) {
  const [position, setPosition] = useState<{
    top: number;
    left: number;
  } | null>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);

  const isOpen = position !== null;

  function toggle() {
    if (isOpen) {
      setPosition(null);
      return;
    }

    const rect = buttonRef.current?.getBoundingClientRect();
    if (!rect) return;

    // 화면 아래쪽이면 위로 펼친다
    const opensUp = window.innerHeight - rect.bottom < MENU_HEIGHT + 8;

    setPosition({
      top: opensUp ? rect.top - MENU_HEIGHT - 4 : rect.bottom + 4,
      left: rect.right - MENU_WIDTH,
    });
  }

  useEffect(() => {
    if (!isOpen) return;

    function close() {
      setPosition(null);
    }
    function handlePointerDown(event: MouseEvent) {
      const target = event.target as Node;

      if (
        !buttonRef.current?.contains(target) &&
        !menuRef.current?.contains(target)
      ) {
        close();
      }
    }
    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === 'Escape') close();
    }

    document.addEventListener('mousedown', handlePointerDown);
    document.addEventListener('keydown', handleKeyDown);
    // 스크롤은 표 안쪽에서도 일어나므로 캡처 단계에서 받는다
    document.addEventListener('scroll', close, true);
    window.addEventListener('resize', close);

    return () => {
      document.removeEventListener('mousedown', handlePointerDown);
      document.removeEventListener('keydown', handleKeyDown);
      document.removeEventListener('scroll', close, true);
      window.removeEventListener('resize', close);
    };
  }, [isOpen]);

  return (
    <>
      <button
        ref={buttonRef}
        type="button"
        onClick={toggle}
        aria-label={`${name} 관리`}
        aria-expanded={isOpen}
        className="cursor-pointer rounded-button-sm px-2 py-1 text-text-secondary hover:bg-bg-hover"
      >
        ⋯
      </button>

      {position &&
        createPortal(
          <div
            ref={menuRef}
            style={{ top: position.top, left: position.left }}
            className="fixed z-50 w-24 overflow-hidden rounded-lg border border-border-default bg-bg-card py-1 shadow-lg"
          >
            <MenuItem
              onClick={() => {
                setPosition(null);
                onEdit();
              }}
            >
              수정
            </MenuItem>
            <MenuItem
              danger
              onClick={() => {
                setPosition(null);
                onDelete();
              }}
            >
              삭제
            </MenuItem>
          </div>,
          document.body,
        )}
    </>
  );
}

function MenuItem({
  danger,
  onClick,
  children,
}: {
  danger?: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`block w-full cursor-pointer px-3 py-1.5 text-left text-micro hover:bg-bg-hover ${
        danger ? 'text-text-danger' : 'text-text-primary'
      }`}
    >
      {children}
    </button>
  );
}

function SearchIcon() {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      aria-hidden
      className="size-4"
    >
      <circle cx="11" cy="11" r="7" />
      <path d="m20 20-3.5-3.5" />
    </svg>
  );
}

function FolderIcon() {
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
      <path d="M3 7a2 2 0 0 1 2-2h4l2 2h8a2 2 0 0 1 2 2v8a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2Z" />
    </svg>
  );
}
