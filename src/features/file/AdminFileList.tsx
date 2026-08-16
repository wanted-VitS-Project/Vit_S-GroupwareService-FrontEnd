'use client';

import { useEffect, useState } from 'react';

import DataTable from '@/components/DataTable';
import Pagination from '@/components/Pagination';
import { messageOf } from '@/lib/api';
import { formatDate } from '@/lib/format';
import { useModalTarget } from '@/lib/useModal';
import { getProjects } from '@/features/project/api';

import { downloadVersion, getAdminFiles } from './api';
import { extensionLabel, extensionStyle, formatFileSize } from './format';
import { LazyFileViewerModal, preloadViewer } from './LazyFileViewer';
import { cancelPreviewPrefetch, schedulePreviewPrefetch } from './previewCache';
import type { AdminFile, FilePage, ViewerFile } from './types';

/** 한 페이지 20행 — 명세 기본값이다 (최대 100) */
const PAGE_SIZE = 20;

/**
 * 필터에 세울 프로젝트 선택지 상한.
 * 목록 API 가 페이징이라 한 번에 받을 수 있는 최대치(100)를 쓴다 —
 * ⚠️ 프로젝트가 100개를 넘으면 **뒤쪽 프로젝트는 선택지에 없다.** 그때는 검색어로 찾는다.
 */
const PROJECT_OPTION_LIMIT = 100;

/**
 * 확장자 필터 선택지.
 *
 * 목록이 페이지 단위라 **응답에서 뽑을 수 없다** (지금 페이지에 있는 확장자만 나온다).
 * 그래서 배지 색을 정해 둔 확장자와 같은 목록을 고정으로 세운다 —
 * 여기 없는 확장자는 파일명 검색으로 찾는다.
 */
const EXTENSION_OPTIONS = [
  'pdf',
  'hwp',
  'hwpx',
  'doc',
  'docx',
  'xls',
  'xlsx',
  'csv',
  'ppt',
  'pptx',
  'txt',
  'zip',
  'png',
  'jpg',
];

/**
 * 전사 파일 목록 — `전사 파일 관리 › 프로젝트 파일` 탭. (`.ai/API.md` FILE-Q-01 · ADMIN 전용)
 *
 * 문서 단위 **최신 완료 버전 1행**이라 버전 이력은 행을 열어야 보인다.
 * 내 파일(140번)과 달리 페이징이 있어 프로젝트별로 묶지 않고 **평면 표**로 둔다 —
 * 페이지 경계에서 묶음이 잘리면 같은 프로젝트가 두 번 나온 것처럼 보인다.
 *
 * ⛔ **조회 전용이다.** 이름 수정 · 삭제는 문서가 붙은 스텝 화면에서 한다.
 */
export default function AdminFileList() {
  const [keyword, setKeyword] = useState('');
  /** 실제 요청에 쓰는 검색어 — 돋보기 버튼 · 엔터로만 반영한다 */
  const [search, setSearch] = useState('');
  /** 빈 문자열이면 전체 */
  const [projectId, setProjectId] = useState('');
  const [extension, setExtension] = useState('');
  const [page, setPage] = useState(0);
  const [reloadCount, setReloadCount] = useState(0);

  /**
   * 어떤 요청의 결과인지 `key` 로 들고 있는다.
   * 조건이 바뀌면 key 가 어긋나 자동으로 로딩 상태가 되므로,
   * 효과 본문에서 상태를 되돌릴 필요가 없다 (`react-hooks/set-state-in-effect`).
   */
  const [result, setResult] = useState<{
    key: string;
    page?: FilePage<AdminFile>;
    errorMessage?: string;
  } | null>(null);
  /** 프로젝트 필터 선택지 + 전사 프로젝트 수 — 목록 조건과 무관하게 한 번만 받는다 */
  const [projects, setProjects] = useState<{
    options: { value: string; label: string }[];
    totalCount: number;
  } | null>(null);
  /** 다운로드 실패처럼 화면을 막지 않는 오류 */
  const [errorMessage, setErrorMessage] = useState('');
  const viewerModal = useModalTarget<ViewerFile>();

  const hasFilter = search !== '' || projectId !== '' || extension !== '';
  const requestKey = `${reloadCount} ${search} ${projectId} ${extension} ${page}`;
  /** 지금 조건의 결과만 화면에 쓴다 — 이전 요청 결과는 로딩으로 본다 */
  const current = result?.key === requestKey ? result : null;
  const filePage = current?.page ?? null;
  const files = filePage?.content ?? null;

  useEffect(() => {
    const controller = new AbortController();
    const { signal } = controller;

    getAdminFiles(
      {
        keyword: search || undefined,
        projectId: projectId ? Number(projectId) : undefined,
        extension: extension || undefined,
        page,
        size: PAGE_SIZE,
      },
      signal,
    )
      .then((data) => setResult({ key: requestKey, page: data }))
      .catch((caught) => {
        // 취소는 실패가 아니다
        if (signal.aborted) return;
        setResult({
          key: requestKey,
          // 403(`ACC_ADMIN_REQUIRED`)이 여기로 온다 — 서버 문구를 그대로 보여준다
          errorMessage: messageOf(caught, '파일 목록을 불러오지 못했습니다.'),
        });
      });

    return () => controller.abort();
  }, [requestKey, search, projectId, extension, page]);

  useEffect(() => {
    const controller = new AbortController();

    getProjects({ page: 0, size: PROJECT_OPTION_LIMIT }, controller.signal)
      .then((data) =>
        setProjects({
          options: data.content.map((project) => ({
            value: String(project.projectId),
            label: project.name,
          })),
          totalCount: data.totalElements,
        }),
      )
      // 선택지를 못 받아도 목록은 그대로 쓴다 — 필터 하나 때문에 화면을 막지 않는다
      .catch(() => {});

    return () => controller.abort();
  }, []);

  /** 조건이 바뀌면 첫 페이지로 돌아간다 — 3페이지에서 거르면 빈 화면이 나온다 */
  function applyFilter(change: () => void) {
    change();
    setPage(0);
  }

  function resetFilters() {
    applyFilter(() => {
      setKeyword('');
      setSearch('');
      setProjectId('');
      setExtension('');
    });
  }

  function download(file: AdminFile) {
    downloadVersion(file.latestVersionId)
      // 성공하면 지난 실패 문구를 지운다 — 남겨 두면 방금 성공한 동작을 실패로 오해한다
      .then(() => setErrorMessage(''))
      .catch((caught) =>
        setErrorMessage(messageOf(caught, '다운로드에 실패했습니다.')),
      );
  }

  return (
    <div onPointerEnter={preloadViewer}>
      {/*
        요약은 **응답으로 확인되는 두 가지만** 둔다.
        총 용량 · 기간별 업로드 수는 집계 API 가 없어 지금 페이지 20행으로는 셀 수 없다.
      */}
      <section
        aria-label="전사 파일 요약"
        aria-busy={filePage === null}
        className="mb-4 grid grid-cols-2 gap-4"
      >
        <SummaryCard
          label={hasFilter ? '조건에 맞는 파일' : '전체 파일'}
          value={filePage?.totalElements ?? null}
          iconStyle="bg-blue-bg-soft text-blue-text"
          icon={<DocumentIcon className="size-5" />}
        />
        <SummaryCard
          label="프로젝트"
          value={projects?.totalCount ?? null}
          iconStyle="bg-purple-bg-soft text-purple-text"
          icon={<FolderIcon />}
        />
      </section>

      <div className="mb-4 flex flex-wrap items-center gap-2">
        <form
          onSubmit={(event) => {
            event.preventDefault();
            applyFilter(() => setSearch(keyword.trim()));
          }}
          className="relative min-w-0 flex-1"
        >
          <label htmlFor="adminFileSearch" className="sr-only">
            파일명 · 업로더 검색
          </label>
          <input
            id="adminFileSearch"
            type="search"
            value={keyword}
            onChange={(event) => {
              setKeyword(event.target.value);
              // 입력을 비우면 검색을 실행하지 않아도 전체 목록으로 돌아온다
              if (event.target.value.trim() === '') {
                applyFilter(() => setSearch(''));
              }
            }}
            placeholder="파일명 · 업로더 검색"
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
          id="adminFileProject"
          label="프로젝트"
          allLabel="프로젝트 전체"
          value={projectId}
          onChange={(value) => applyFilter(() => setProjectId(value))}
          options={projects?.options ?? []}
        />
        <FilterSelect
          id="adminFileExtension"
          label="파일 유형"
          allLabel="유형 전체"
          value={extension}
          onChange={(value) => applyFilter(() => setExtension(value))}
          options={EXTENSION_OPTIONS.map((value) => ({
            value,
            label: value.toUpperCase(),
          }))}
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

      <DataTable
        caption="전사 파일 목록"
        dense
        minWidth={1000}
        rows={files}
        rowKey={(file) => file.fileId}
        errorMessage={current?.errorMessage}
        onRetry={() => setReloadCount((count) => count + 1)}
        // 행을 누르면 뷰어가 열린다 (액션 칸만 예외) — 사내 문서함 탭과 같은 규칙이다
        onRowClick={(file) => viewerModal.open(toViewerFile(file))}
        emptyState={
          <>
            <p className="text-body-m font-bold text-text-primary">
              {hasFilter ? '조건에 맞는 파일이 없습니다' : '파일이 없습니다'}
            </p>
            <p className="text-label break-keep text-text-secondary">
              {hasFilter
                ? '검색어나 필터를 바꾸세요'
                : '프로젝트 스텝에 문서를 올리면 여기에 모입니다'}
            </p>
          </>
        }
        emptyAction={
          hasFilter ? (
            <button
              type="button"
              onClick={resetFilters}
              className="btn btn-sm btn-gray-outlined"
            >
              필터 초기화
            </button>
          ) : undefined
        }
        columns={[
          {
            key: 'name',
            header: '파일명',
            width: '28%',
            cell: (file) => <FileNameCell file={file} />,
          },
          {
            key: 'project',
            header: '프로젝트',
            width: '19%',
            cell: (file) => (
              <span className="block truncate text-label text-text-primary">
                {file.projectName}
              </span>
            ),
          },
          {
            key: 'step',
            header: '스텝',
            width: '11%',
            cell: (file) => (
              <span
                // 블록명은 스텝 안의 위치라 스텝 칸에서 함께 읽히는 편이 낫다
                title={file.blockTitle ?? undefined}
                className="inline-block max-w-full truncate rounded-button-sm bg-bg-hover px-1.5 py-0.5 text-caption text-text-secondary"
              >
                {file.stepName}
              </span>
            ),
          },
          {
            key: 'version',
            header: '버전',
            width: '6%',
            cell: (file) => (
              <span
                title={`버전 ${file.versionCount}개`}
                className="rounded-button-sm bg-blue-bg-soft px-1.5 py-0.5 font-mono text-caption font-semibold text-text-primary-blue"
              >
                v{file.latestVersionNo}
              </span>
            ),
          },
          {
            key: 'size',
            header: '크기',
            width: '8%',
            align: 'right',
            cell: (file) => (
              <span className="text-caption whitespace-nowrap text-text-secondary">
                {formatFileSize(file.sizeBytes)}
              </span>
            ),
          },
          {
            key: 'uploader',
            header: '업로더',
            width: '8%',
            cell: (file) => (
              <span className="block truncate text-caption text-text-secondary">
                {/* 시스템 계정이 올린 문서는 업로더가 오지 않는다 */}
                {file.uploaderName ?? '—'}
              </span>
            ),
          },
          {
            key: 'updatedAt',
            header: '수정일',
            width: '10%',
            cell: (file) => (
              <span className="text-caption whitespace-nowrap text-text-secondary">
                {formatDate(file.updatedAt)}
              </span>
            ),
          },
          {
            key: 'actions',
            header: '',
            width: '10%',
            align: 'right',
            // 칸 자체에 동작이 있어 행 클릭으로 새면 안 된다
            stopRowClick: true,
            cell: (file) => (
              <div className="flex items-center justify-end gap-1.5">
                {file.previewable && (
                  <IconButton
                    label={`${file.name} 미리보기`}
                    onClick={() => viewerModal.open(toViewerFile(file))}
                  >
                    <EyeIcon />
                  </IconButton>
                )}
                <IconButton
                  label={`${file.name} 다운로드`}
                  onClick={() => download(file)}
                >
                  <DownloadIcon />
                </IconButton>
              </div>
            ),
          },
        ]}
      />

      {/* 표 바깥에 둔다 — 실패 · 빈 상태에서는 넘길 페이지가 없다 */}
      {filePage && filePage.totalElements > 0 && (
        <div className="mt-3 overflow-hidden rounded-base border border-border-default bg-bg-card">
          <Pagination
            page={filePage.page}
            totalPages={filePage.totalPages}
            totalElements={filePage.totalElements}
            unit="개"
            // 위 요약 카드에 같은 수가 이미 있다
            showTotal={false}
            onChange={setPage}
          />
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

/**
 * 뷰어가 받는 모양으로 맞춘다.
 * 업로더 이름이 없을 수 있어(시스템 계정) 빈 문자열로 채운다 —
 * 뷰어는 버전 이력(41번)을 받으면 그 값으로 덮어쓴다.
 */
function toViewerFile(file: AdminFile): ViewerFile {
  return { ...file, uploaderName: file.uploaderName ?? '' };
}

function FileNameCell({ file }: { file: AdminFile }) {
  const style = extensionStyle(file.extension);

  return (
    <div
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
      className="flex min-w-0 items-center gap-2.5"
    >
      <span
        aria-hidden
        style={{ color: style.text, backgroundColor: style.background }}
        className="flex size-7 shrink-0 items-center justify-center rounded-button-sm"
      >
        <DocumentIcon />
      </span>
      <span
        title={file.originalFileName}
        className="min-w-0 truncate text-label font-semibold text-text-primary"
      >
        {file.name}
      </span>
      <span
        style={{ color: style.text, backgroundColor: style.background }}
        className="shrink-0 rounded-button-sm px-1 py-0.5 font-mono text-micro font-semibold"
      >
        {extensionLabel(file.extension)}
      </span>
    </div>
  );
}

/**
 * 수치 한 칸. **`ProjectSummaryCards` 와 같은 모양**이다 (높이 · 아이콘 자리 · 글자 크기).
 * 화면이 달라도 같은 성격의 카드가 다르게 보이면 다른 지표로 읽힌다.
 */
function SummaryCard({
  label,
  value,
  iconStyle,
  icon,
}: {
  label: string;
  value: number | null;
  iconStyle: string;
  icon: React.ReactNode;
}) {
  return (
    <div className="flex h-24 items-center gap-4 rounded-base border border-border-default bg-bg-card px-5 shadow-[0_1px_3px_rgba(0,0,0,0.04)]">
      <span
        aria-hidden
        className={`flex size-10 shrink-0 items-center justify-center rounded-lg ${iconStyle}`}
      >
        {icon}
      </span>
      <div className="min-w-0">
        <p className="truncate text-detail text-text-secondary">{label}</p>
        <p className="mt-0.5 truncate text-logo leading-8 font-semibold text-text-primary">
          {/* 아직 세는 중이면 자리만 잡는다 — 0 을 먼저 보이면 잘못된 값을 읽힌다 */}
          {value === null ? '–' : value.toLocaleString('ko-KR')}
          <span className="ml-1 text-detail font-medium text-text-secondary">
            개
          </span>
        </p>
      </div>
    </div>
  );
}

/** 요약 카드용 폴더 그림 (`ProjectSummaryCards` 와 같은 벡터) */
function FolderIcon() {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
      className="size-5"
    >
      <path d="M3 7a2 2 0 0 1 2-2h4l2 2h8a2 2 0 0 1 2 2v8a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V7Z" />
    </svg>
  );
}

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
  options: { value: string; label: string }[];
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

/** 미리보기 · 다운로드처럼 칸 안에 놓이는 아이콘 버튼 */
function IconButton({
  label,
  onClick,
  children,
}: {
  label: string;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      title={label}
      aria-label={label}
      onClick={onClick}
      className="flex size-7 cursor-pointer items-center justify-center rounded-button-md text-text-secondary hover:bg-bg-surface hover:text-text-primary-blue"
    >
      {children}
    </button>
  );
}

/** 아이콘 라이브러리 도입 전까지 인라인 SVG 로 둔다 (`MyFileList` 와 같은 방침) */
function IconBase({
  children,
  /** 요약 카드 아이콘만 한 단계 크다 (`ProjectSummaryCards` 와 같은 20px) */
  className = 'size-4',
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
      className={className}
    >
      {children}
    </svg>
  );
}

function SearchIcon() {
  return (
    <IconBase>
      <circle cx="11" cy="11" r="7" />
      <path d="m20 20-3.5-3.5" />
    </IconBase>
  );
}

function DocumentIcon({ className }: { className?: string }) {
  return (
    <IconBase className={className}>
      <path d="M14 3H7a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V8z" />
      <path d="M14 3v5h5" />
    </IconBase>
  );
}

function EyeIcon() {
  return (
    <IconBase>
      <path d="M2 12s3.6-6 10-6 10 6 10 6-3.6 6-10 6-10-6-10-6Z" />
      <circle cx="12" cy="12" r="2.5" />
    </IconBase>
  );
}

function DownloadIcon() {
  return (
    <IconBase>
      <path d="M12 4v10m0 0 4-4m-4 4-4-4" />
      <path d="M4 18h16" />
    </IconBase>
  );
}
