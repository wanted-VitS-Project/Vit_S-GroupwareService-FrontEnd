'use client';

import Link from 'next/link';
import { memo, useCallback, useEffect, useMemo, useState } from 'react';

import Breadcrumb from '@/components/Breadcrumb';
import { messageOf } from '@/lib/api';
import { formatDate } from '@/lib/format';
import { useModalTarget } from '@/lib/useModal';

import { downloadVersion, getMyFiles } from './api';
import { extensionLabel, extensionStyle, formatFileSize } from './format';
import {
  groupMyFilesByProject,
  toFilterOptions,
  type FilterOption,
} from './groupMyFiles';
import { LazyFileViewerModal, preloadViewer } from './LazyFileViewer';
import { cancelPreviewPrefetch, schedulePreviewPrefetch } from './previewCache';
import type { MyFile } from './types';

/**
 * 내 프로젝트 파일 모아보기. (.ai/API.md `내 파일` · FILE-Q-03)
 *
 * 내가 멤버인 **모든 프로젝트**를 가로질러 문서를 모아 프로젝트별로 보여준다.
 * 권한은 스텝을 따르므로 볼 수 없는 파일은 애초에 응답에 오지 않는다 —
 * 화면에서 다시 거르지 않는다.
 *
 * ⚠️ **조회 전용이다.** 업로드 · 이름 수정 · 삭제는 문서가 붙은 스텝 화면에서 한다.
 * ⚠️ 페이징이 없어 전체를 받는다 — 검색 · 필터는 **서버 쿼리**로 넘긴다.
 */
export default function MyFileList() {
  const [keyword, setKeyword] = useState('');
  /** 실제 요청에 쓰는 검색어 — 돋보기 버튼 · 엔터로만 반영한다 */
  const [search, setSearch] = useState('');
  /** 빈 문자열이면 전체 */
  const [projectId, setProjectId] = useState('');
  const [extension, setExtension] = useState('');
  const [reloadCount, setReloadCount] = useState(0);

  /**
   * 어떤 요청의 결과인지 `key` 로 들고 있는다.
   * 조건이 바뀌면 key 가 어긋나 자동으로 로딩 상태가 되므로,
   * 효과 본문에서 상태를 되돌릴 필요가 없다 (`react-hooks/set-state-in-effect`).
   */
  const [result, setResult] = useState<{
    key: string;
    list?: MyFile[];
    hasFailed?: boolean;
  } | null>(null);
  /**
   * 필터 선택지의 원본 — **필터가 하나도 없을 때의 응답**만 담는다.
   * 걸러진 목록으로 만들면 고른 프로젝트 하나만 남아 되돌아갈 수 없다.
   */
  const [optionSource, setOptionSource] = useState<MyFile[] | null>(null);
  /** 다운로드 실패처럼 화면을 막지 않는 오류 */
  const [errorMessage, setErrorMessage] = useState('');
  /** 접어 둔 프로젝트. 기본이 펼침이라 **닫은 것만** 담는다 */
  const [closedProjectIds, setClosedProjectIds] = useState<Set<number>>(
    new Set(),
  );
  const viewerModal = useModalTarget<MyFile>();

  function changeKeyword(value: string) {
    setKeyword(value);
    // 입력을 비우면 검색을 실행하지 않아도 전체 목록으로 돌아온다
    if (value.trim() === '') setSearch('');
  }

  const hasFilter = search !== '' || projectId !== '' || extension !== '';
  const requestKey = `${reloadCount} ${search} ${projectId} ${extension}`;
  /** 지금 조건의 결과만 화면에 쓴다 — 이전 요청 결과는 로딩으로 본다 */
  const current = result?.key === requestKey ? result : null;
  const files = current?.list ?? null;
  const hasFailed = current?.hasFailed ?? false;

  useEffect(() => {
    const controller = new AbortController();
    const { signal } = controller;

    getMyFiles(
      {
        keyword: search || undefined,
        projectId: projectId ? Number(projectId) : undefined,
        extension: extension || undefined,
      },
      signal,
    )
      .then((list) => {
        setResult({ key: requestKey, list });
        // 조건이 없는 응답만 선택지의 근거가 된다
        if (!hasFilter) setOptionSource(list);
      })
      .catch(() => {
        // 취소는 실패가 아니다
        if (!signal.aborted) setResult({ key: requestKey, hasFailed: true });
      });

    return () => controller.abort();
  }, [requestKey, search, projectId, extension, hasFilter]);

  const groups = useMemo(
    () => (files ? groupMyFilesByProject(files) : []),
    [files],
  );
  const options = useMemo(
    () => toFilterOptions(optionSource ?? []),
    [optionSource],
  );

  /** 행마다 새 화살표 함수를 넘기면 `memo(FileRow)` 가 무력해진다 */
  const download = useCallback((file: MyFile) => {
    downloadVersion(file.latestVersionId)
      // 성공하면 지난 실패 문구를 지운다 — 남겨 두면 방금 성공한 동작을 실패로 오해한다
      .then(() => setErrorMessage(''))
      .catch((caught) =>
        setErrorMessage(messageOf(caught, '다운로드에 실패했습니다.')),
      );
  }, []);

  const toggleProject = useCallback((id: number) => {
    setClosedProjectIds((prev) => {
      const next = new Set(prev);
      if (!next.delete(id)) next.add(id);
      return next;
    });
  }, []);

  function reload() {
    setReloadCount((count) => count + 1);
  }

  function resetFilters() {
    setKeyword('');
    setSearch('');
    setProjectId('');
    setExtension('');
  }

  return (
    <div onPointerEnter={preloadViewer}>
      <Breadcrumb items={[{ label: '내 파일' }]} />

      <div className="mt-2 mb-6">
        <h2 className="text-heading-m font-bold">내 프로젝트 파일</h2>
        <p className="mt-1.5 text-label break-keep text-text-secondary">
          내가 속한 모든 프로젝트의 파일을 프로젝트별로 모아 봅니다. 업로드 ·
          수정은 각 스텝 화면에서 할 수 있어요.
        </p>
      </div>

      <div className="mb-4 flex flex-wrap items-center gap-2">
        <form
          onSubmit={(event) => {
            event.preventDefault();
            setSearch(keyword.trim());
          }}
          className="relative min-w-0 flex-1"
        >
          <label htmlFor="myFileSearch" className="sr-only">
            내 파일 검색
          </label>
          <input
            id="myFileSearch"
            type="search"
            value={keyword}
            onChange={(event) => changeKeyword(event.target.value)}
            placeholder="내 파일 검색"
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

        <FilterSelect
          id="myFileProject"
          label="프로젝트"
          allLabel="프로젝트 전체"
          value={projectId}
          onChange={setProjectId}
          options={options.projects}
        />
        <FilterSelect
          id="myFileExtension"
          label="파일 유형"
          allLabel="유형 전체"
          value={extension}
          onChange={setExtension}
          options={options.extensions}
        />
      </div>

      {errorMessage && (
        <p
          role="alert"
          className="mb-3 rounded-lg border border-red-border bg-red-bg-soft px-3 py-2 text-caption text-text-danger"
        >
          {errorMessage}
        </p>
      )}

      {hasFailed ? (
        <EmptyBox>
          <p className="text-label text-text-secondary">
            파일을 불러오지 못했습니다.
          </p>
          <button
            type="button"
            onClick={reload}
            className="cursor-pointer rounded-button-sm px-2 py-1 text-detail font-medium text-text-primary-blue hover:bg-blue-bg-soft"
          >
            다시 시도
          </button>
        </EmptyBox>
      ) : !files ? (
        <MyFileSkeleton />
      ) : groups.length === 0 ? (
        <EmptyBox>
          <FolderIcon />
          <p className="text-body-m font-bold text-text-primary">
            {hasFilter ? '조건에 맞는 파일이 없습니다' : '파일이 없습니다'}
          </p>
          <p className="text-label break-keep text-text-secondary">
            {hasFilter
              ? '검색어나 필터를 바꿔보세요'
              : '참여 중인 프로젝트의 스텝에 문서를 올리면 여기에 모입니다'}
          </p>
          {hasFilter && (
            <button
              type="button"
              onClick={resetFilters}
              className="cursor-pointer rounded-button-sm px-2 py-1 text-detail font-medium text-text-primary-blue hover:bg-blue-bg-soft"
            >
              필터 초기화
            </button>
          )}
        </EmptyBox>
      ) : (
        <div className="flex flex-col gap-4">
          {groups.map((group) => (
            <ProjectGroup
              key={group.projectId}
              projectId={group.projectId}
              projectName={group.projectName}
              files={group.files}
              isOpen={!closedProjectIds.has(group.projectId)}
              onToggle={toggleProject}
              onOpen={viewerModal.open}
              onDownload={download}
            />
          ))}
        </div>
      )}

      {viewerModal.target && (
        <LazyFileViewerModal
          file={viewerModal.target}
          onClose={viewerModal.close}
        />
      )}
    </div>
  );
}

/** 프로젝트 하나 — 머리줄 + 파일 표 */
const ProjectGroup = memo(function ProjectGroup({
  projectId,
  projectName,
  files,
  isOpen,
  onToggle,
  onOpen,
  onDownload,
}: {
  projectId: number;
  projectName: string;
  files: MyFile[];
  isOpen: boolean;
  onToggle: (projectId: number) => void;
  onOpen: (file: MyFile) => void;
  onDownload: (file: MyFile) => void;
}) {
  return (
    <section className="overflow-hidden rounded-base border border-border-default bg-bg-card">
      <div className="flex items-center gap-3 px-4 py-3">
        <button
          type="button"
          aria-expanded={isOpen}
          onClick={() => onToggle(projectId)}
          className="flex min-w-0 flex-1 cursor-pointer items-center gap-2 text-left"
        >
          <ChevronIcon isOpen={isOpen} />
          <FolderBadgeIcon />
          <span
            className={`min-w-0 truncate text-detail font-semibold ${
              isOpen ? 'text-text-primary-blue' : 'text-text-primary'
            }`}
          >
            {projectName}
          </span>
          <span className="shrink-0 rounded-pill bg-bg-hover px-2 py-0.5 text-caption text-text-secondary">
            파일 {files.length}
          </span>
        </button>

        <Link
          href={`/projects/${projectId}`}
          className="shrink-0 rounded-button-sm px-2 py-1 text-detail font-medium text-text-secondary hover:bg-bg-surface hover:text-text-primary-blue"
        >
          프로젝트 열기
        </Link>
      </div>

      {isOpen && (
        <div className="overflow-x-auto border-t border-border-default">
          <table className="w-full min-w-[720px] border-collapse">
            <caption className="sr-only">{projectName} 파일 목록</caption>
            <thead>
              <tr className="bg-bg-surface/60 text-left text-caption text-text-secondary">
                <Th className="w-auto">파일명</Th>
                <Th className="w-32">스텝</Th>
                <Th className="w-16">버전</Th>
                <Th className="w-20">크기</Th>
                <Th className="w-24">업로더</Th>
                <Th className="w-20">수정일</Th>
                <Th className="w-20 text-right">
                  <span className="sr-only">동작</span>
                </Th>
              </tr>
            </thead>
            <tbody>
              {files.map((file) => (
                <FileRow
                  key={file.fileId}
                  file={file}
                  onOpen={onOpen}
                  onDownload={onDownload}
                />
              ))}
            </tbody>
          </table>
        </div>
      )}
    </section>
  );
});

function Th({
  className,
  children,
}: {
  className?: string;
  children: React.ReactNode;
}) {
  return (
    <th
      scope="col"
      className={`border-b border-border-default px-3 py-2 font-medium ${className ?? ''}`}
    >
      {children}
    </th>
  );
}

/**
 * 문서 한 줄. `memo` 라서 콜백은 **대상을 인자로 받는** 고정 함수를 받는다.
 *
 * 미리보기가 안 되는 파일(`previewable: false`)은 뷰어 버튼을 숨긴다 —
 * 눌러도 빈 화면만 뜨기 때문이다. 다운로드는 종류와 무관하게 열어 둔다.
 */
const FileRow = memo(function FileRow({
  file,
  onOpen,
  onDownload,
}: {
  file: MyFile;
  onOpen: (file: MyFile) => void;
  onDownload: (file: MyFile) => void;
}) {
  const style = extensionStyle(file.extension);

  return (
    <tr
      /*
        미리보기 fetch 는 서버가 원본을 잘라 주느라 느리다. 행에 머무는 동안
        미리 시작해 두면 클릭이 그 요청을 이어받는다.
      */
      onPointerEnter={
        file.previewable
          ? () => schedulePreviewPrefetch(file.latestVersionId)
          : undefined
      }
      onPointerLeave={file.previewable ? cancelPreviewPrefetch : undefined}
      className="group/file border-b border-border-default last:border-b-0 hover:bg-bg-surface"
    >
      <td className="px-3 py-2.5">
        <div className="flex min-w-0 items-center gap-2">
          <span
            aria-hidden
            style={{ color: style.text, backgroundColor: style.background }}
            className="flex size-7 shrink-0 items-center justify-center rounded-button-sm"
          >
            <DocumentIcon />
          </span>
          <span className="min-w-0 truncate text-detail font-semibold text-text-primary">
            {file.name}
          </span>
          <span
            style={{ color: style.text, backgroundColor: style.background }}
            className="shrink-0 rounded-button-sm px-1 py-0.5 font-mono text-[8px] font-semibold"
          >
            {extensionLabel(file.extension)}
          </span>
        </div>
      </td>

      <td className="px-3 py-2.5">
        <span className="inline-block max-w-full truncate rounded-button-sm bg-bg-hover px-1.5 py-0.5 text-caption text-text-secondary">
          {file.stepName}
        </span>
      </td>

      <td className="px-3 py-2.5">
        {/* v1 도 표기한다 — 버전이 하나뿐인 문서도 차수가 보여야 한다 */}
        <span
          title={`버전 ${file.versionCount}개`}
          className="rounded-button-sm bg-blue-bg-soft px-1.5 py-0.5 font-mono text-caption font-semibold text-text-primary-blue"
        >
          v{file.latestVersionNo}
        </span>
      </td>

      <td className="px-3 py-2.5 text-caption whitespace-nowrap text-text-secondary">
        {formatFileSize(file.sizeBytes)}
      </td>

      <td className="px-3 py-2.5">
        <span
          title={
            file.uploaderDepartment
              ? `${file.uploaderDepartment} ${file.uploaderPosition ?? ''}`.trim()
              : undefined
          }
          className="block truncate text-caption text-text-secondary"
        >
          {file.uploaderName}
        </span>
      </td>

      <td className="px-3 py-2.5 text-caption whitespace-nowrap text-text-secondary">
        {formatDate(file.updatedAt)}
      </td>

      <td className="px-3 py-2.5">
        {/* 호버 · 포커스 전에는 자리만 차지한다 — 나타날 때 레이아웃이 밀리지 않는다 */}
        <div className="flex items-center justify-end gap-0.5 opacity-0 group-focus-within/file:opacity-100 group-hover/file:opacity-100">
          {file.previewable && (
            <button
              type="button"
              title={`${file.name} 미리보기`}
              aria-label={`${file.name} 미리보기`}
              onClick={() => onOpen(file)}
              className="flex size-6 cursor-pointer items-center justify-center rounded-button-md text-text-secondary hover:bg-bg-card hover:text-text-primary-blue"
            >
              <EyeIcon />
            </button>
          )}
          <button
            type="button"
            title={`${file.name} 다운로드`}
            aria-label={`${file.name} 다운로드`}
            onClick={() => onDownload(file)}
            className="flex size-6 cursor-pointer items-center justify-center rounded-button-md text-text-secondary hover:bg-bg-card hover:text-text-primary-blue"
          >
            <DownloadIcon />
          </button>
        </div>
      </td>
    </tr>
  );
});

function FilterSelect({
  id,
  label,
  allLabel,
  value,
  onChange,
  options,
}: {
  id: string;
  label: string;
  allLabel: string;
  value: string;
  onChange: (value: string) => void;
  options: FilterOption[];
}) {
  return (
    <div className="shrink-0">
      <label htmlFor={id} className="sr-only">
        {label}
      </label>
      <select
        id={id}
        value={value}
        onChange={(event) => onChange(event.target.value)}
        className="cursor-pointer rounded-lg border border-border-default bg-bg-surface px-3 py-2 text-label text-text-primary focus:outline-2 focus:outline-offset-2 focus:outline-border-primary"
      >
        <option value="">{allLabel}</option>
        {options.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
    </div>
  );
}

function EmptyBox({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex flex-col items-center gap-2 rounded-base border border-dashed border-border-default px-4 py-16">
      {children}
    </div>
  );
}

/** 프로젝트 묶음 2개를 흉내 낸다 — 실제 개수를 모르니 과하지 않게 둔다 */
function MyFileSkeleton() {
  return (
    <div aria-hidden className="flex animate-pulse flex-col gap-4">
      {[0, 1].map((index) => (
        <div
          key={index}
          className="overflow-hidden rounded-base border border-border-default bg-bg-card"
        >
          <div className="flex items-center gap-2 px-4 py-3">
            <div className="size-4 rounded-button-sm bg-bg-hover" />
            <div className="h-4 w-48 rounded-button-sm bg-bg-hover" />
          </div>
          <div className="flex flex-col gap-2 border-t border-border-default p-3">
            {[0, 1, 2].map((row) => (
              <div key={row} className="h-8 rounded-button-sm bg-bg-hover" />
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}

function ChevronIcon({ isOpen }: { isOpen: boolean }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
      className={`size-4 shrink-0 text-text-muted transition-transform ${
        isOpen ? 'rotate-90' : ''
      }`}
    >
      <path d="m9 5 7 7-7 7" />
    </svg>
  );
}

function FolderBadgeIcon() {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
      className="size-4 shrink-0 text-text-secondary"
    >
      <path d="M3 7a2 2 0 0 1 2-2h4l2 2h8a2 2 0 0 1 2 2v8a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" />
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

function DocumentIcon() {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
      className="size-3.5"
    >
      <path d="M14 3H7a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V8z" />
      <path d="M14 3v5h5" />
    </svg>
  );
}

function EyeIcon() {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
      className="size-3.5 shrink-0"
    >
      <path d="M2 12s3.5-6 10-6 10 6 10 6-3.5 6-10 6-10-6-10-6z" />
      <circle cx="12" cy="12" r="2.5" />
    </svg>
  );
}

function DownloadIcon() {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
      className="size-3.5 shrink-0"
    >
      <path d="M4 20h16" />
      <path d="M12 4v11" />
      <path d="m7.5 10.5 4.5 4.5 4.5-4.5" />
    </svg>
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
