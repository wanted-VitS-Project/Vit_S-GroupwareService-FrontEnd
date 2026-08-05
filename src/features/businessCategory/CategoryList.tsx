'use client';

import Link from 'next/link';
import { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';

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
  const [categories, setCategories] = useState<BusinessCategory[] | null>(null);
  const [hasFailed, setHasFailed] = useState(false);
  const [reloadCount, setReloadCount] = useState(0);
  const [formTarget, setFormTarget] = useState<FormTarget | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<BusinessCategory | null>(
    null,
  );

  function changeKeyword(value: string) {
    setKeyword(value);
    // 입력을 비우면 검색을 실행하지 않아도 전체 목록으로 돌아온다
    if (value.trim() === '') setSearch('');
  }

  useEffect(() => {
    const controller = new AbortController();
    const { signal } = controller;

    getCategories({ keyword: search || undefined, includeDeleted }, signal)
      .then((list) => {
        setCategories(list);
        setHasFailed(false);
      })
      .catch(() => {
        // 취소는 실패가 아니다
        if (!signal.aborted) setHasFailed(true);
      });

    return () => controller.abort();
  }, [search, includeDeleted, reloadCount]);

  function reload() {
    setReloadCount((count) => count + 1);
  }

  return (
    <>
      <p className="text-xs text-slate-500">
        <Link href="/settings" className="hover:text-[#1C1F2A] hover:underline">
          설정
        </Link>{' '}
        &gt; 사업 카테고리
      </p>

      <div className="mt-2 mb-6 flex items-start justify-between gap-4">
        <div className="min-w-0">
          <h2 className="text-lg font-bold">사업 카테고리</h2>
          <p className="mt-1.5 text-xs break-keep text-[#6C7389]">
            프로젝트에 지정할 사업 분류를 관리합니다. 프로젝트 화면에서는 추가할
            수 없습니다.
          </p>
        </div>
        <AddButton onClick={() => setFormTarget('create')} />
      </div>

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
            className="w-full rounded-lg border border-[#1C1F2A]/10 py-2 pr-10 pl-3 text-xs text-[#1C1F2A] placeholder:text-[#6C7389] focus:outline-2 focus:outline-offset-2 focus:outline-[#3B5BDB]"
          />
          <button
            type="submit"
            aria-label="검색"
            className="absolute top-1/2 right-1 flex size-7 -translate-y-1/2 cursor-pointer items-center justify-center rounded-md text-[#6C7389] hover:bg-[#ECEEF4] hover:text-[#1C1F2A]"
          >
            <SearchIcon />
          </button>
        </form>

        <button
          type="button"
          role="switch"
          aria-checked={includeDeleted}
          onClick={() => setIncludeDeleted((current) => !current)}
          className="flex cursor-pointer items-center gap-2 text-xs text-[#6C7389]"
        >
          <span
            className={`flex h-5 w-9 shrink-0 items-center rounded-full p-0.5 transition-colors ${
              includeDeleted ? 'bg-[#2B3A67]' : 'bg-[#ECEEF4]'
            }`}
          >
            <span
              className={`size-4 rounded-full bg-white shadow transition-transform ${
                includeDeleted ? 'translate-x-4' : ''
              }`}
            />
          </span>
          삭제된 항목 보기
        </button>
      </div>

      <div className="rounded-xl border border-[#1C1F2A]/10 bg-white">
        {hasFailed ? (
          <Centered>
            <p className="text-xs text-[#6C7389]">
              카테고리를 불러오지 못했습니다.
            </p>
            <button
              type="button"
              onClick={reload}
              className="cursor-pointer rounded-lg bg-[#2B3A67] px-4 py-1.5 text-[11px] font-semibold text-white hover:bg-[#22305a]"
            >
              다시 시도
            </button>
          </Centered>
        ) : !categories ? (
          <Centered>
            <p className="text-xs text-[#6C7389]">불러오는 중…</p>
          </Centered>
        ) : categories.length === 0 ? (
          <Centered>
            <FolderIcon />
            <p className="text-sm font-bold text-[#1C1F2A]">
              {search
                ? '검색 결과가 없습니다'
                : '등록된 사업 카테고리가 없습니다'}
            </p>
            <p className="text-xs break-keep text-[#6C7389]">
              {search
                ? '다른 이름이나 업무코드로 검색해보세요'
                : '카테고리를 추가하면 프로젝트 생성 시 선택할 수 있어요'}
            </p>
            {!search && (
              <AddButton subtle onClick={() => setFormTarget('create')} />
            )}
          </Centered>
        ) : (
          // 목록이 길어지면 이 영역만 스크롤된다
          <div className="max-h-[60vh] overflow-y-auto">
            <table className="w-full table-fixed border-collapse text-left">
              <thead className="sticky top-0 bg-white">
                <tr className="border-b border-[#1C1F2A]/10 text-[11px] text-[#6C7389]">
                  <th className="w-52 px-5 py-3 font-medium">카테고리 이름</th>
                  {/* 업무코드는 최대 30자라 넉넉히 잡고 줄바꿈을 막는다 */}
                  <th className="w-56 px-5 py-3 font-medium">업무코드</th>
                  <th className="px-5 py-3 font-medium">설명</th>
                  <th className="w-14 px-5 py-3">
                    <span className="sr-only">관리</span>
                  </th>
                </tr>
              </thead>
              <tbody>
                {categories.map((category) => (
                  <tr
                    key={category.categoryId}
                    className="border-b border-[#1C1F2A]/5 last:border-b-0"
                  >
                    <td className="px-5 py-3.5">
                      <span className="flex items-center gap-2">
                        <span className="min-w-0 truncate text-xs font-bold text-[#1C1F2A]">
                          {category.name}
                        </span>
                        {category.deletedAt && (
                          <span className="shrink-0 rounded bg-[#ECEEF4] px-1.5 py-0.5 text-[10px] text-[#6C7389]">
                            삭제됨
                          </span>
                        )}
                      </span>
                    </td>
                    <td className="px-5 py-3.5">
                      {category.code ? (
                        <span
                          title={category.code}
                          className="inline-block max-w-full truncate rounded border border-[#1C1F2A]/10 bg-[#ECEEF4]/50 px-1.5 py-0.5 font-mono text-[10px] whitespace-nowrap text-[#6C7389]"
                        >
                          {category.code}
                        </span>
                      ) : (
                        <span className="text-xs text-[#6C7389]">—</span>
                      )}
                    </td>
                    <td className="px-5 py-3.5">
                      <p className="truncate text-xs text-[#6C7389]">
                        {category.description || '—'}
                      </p>
                    </td>
                    <td className="px-5 py-3.5 text-right">
                      {/* 삭제된 항목은 수정 · 삭제가 모두 404 라 메뉴를 숨긴다 */}
                      {!category.deletedAt && (
                        <RowMenu
                          name={category.name}
                          onEdit={() => setFormTarget(category)}
                          onDelete={() => setDeleteTarget(category)}
                        />
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {formTarget && (
        <CategoryFormModal
          category={formTarget === 'create' ? undefined : formTarget}
          onClose={() => setFormTarget(null)}
          onSaved={reload}
        />
      )}

      {deleteTarget && (
        <DeleteCategoryModal
          category={deleteTarget}
          onClose={() => setDeleteTarget(null)}
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
          ? 'border border-[#1C1F2A]/10 text-[#1C1F2A] hover:bg-[#ECEEF4]'
          : 'bg-[#2B3A67] text-white hover:bg-[#22305a]'
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
        className="cursor-pointer rounded px-2 py-1 text-[#6C7389] hover:bg-[#ECEEF4]"
      >
        ⋯
      </button>

      {position &&
        createPortal(
          <div
            ref={menuRef}
            style={{ top: position.top, left: position.left }}
            className="fixed z-50 w-24 overflow-hidden rounded-lg border border-[#1C1F2A]/10 bg-white py-1 shadow-lg"
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
      className={`block w-full cursor-pointer px-3 py-1.5 text-left text-[11px] hover:bg-[#ECEEF4] ${
        danger ? 'text-[#E7000B]' : 'text-[#1C1F2A]'
      }`}
    >
      {children}
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
      className="mb-2 size-10 text-[#C7CCD9]"
    >
      <path d="M3 7a2 2 0 0 1 2-2h4l2 2h8a2 2 0 0 1 2 2v8a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2Z" />
    </svg>
  );
}
