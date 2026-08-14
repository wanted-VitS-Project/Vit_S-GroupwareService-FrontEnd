'use client';

import { useEffect, useRef, useState } from 'react';

import {
  AlertDialogTwoButton,
  DialogIcons,
} from '@/components/AlertDialog';
import DataTable from '@/components/DataTable';
import Pagination from '@/components/Pagination';
import { notifyToast } from '@/components/Toast';
import { messageOf } from '@/lib/api';
import { formatDate } from '@/lib/format';
import { useModalTarget } from '@/lib/useModal';

import { extensionLabel, extensionStyle, formatFileSize } from '../file/format';
import type { FilePage } from '../file/types';
import {
  deleteCompanyDocument,
  downloadCompanyVersion,
  getCompanyDocuments,
  restoreCompanyDocument,
} from './api';
import CompanyDocumentViewerModal from './CompanyDocumentViewerModal';
import EditCompanyDocumentModal from './EditCompanyDocumentModal';
import {
  COMPANY_DOCUMENT_CATEGORIES,
  COMPANY_DOCUMENT_CATEGORY_LABELS,
  COMPANY_DOCUMENT_EXTENSIONS,
  type CompanyDocument,
  type CompanyDocumentCategory,
} from './types';
import { uploadCompanyDocument, type CompanyUploadStage } from './upload';

/** 한 페이지 20행 — 명세 기본값이다 (최대 100) */
const PAGE_SIZE = 20;

/**
 * 업로드가 끊긴 지점별 안내 — 사용자가 다음에 뭘 할지 알 수 있게 나눈다.
 * (문서 블록 `FileBlock` 과 같은 문구다 — 같은 3단계 흐름이다)
 */
const STAGE_HINT: Record<CompanyUploadStage, string> = {
  start: '',
  transfer: ' 저장소 전송 중 끊겼습니다.',
  complete: ' 파일은 올라갔지만 마무리에 실패했습니다. 다시 시도해주세요.',
};

/**
 * 잡힌 값에서 안내 문구를 꺼낸다.
 * `'stage' in caught` 는 속성 존재만 보장하므로 **값이 실제 키인지 확인**한다 —
 * 단언으로 넘기면 모르는 값이 왔을 때 화면에 `undefined` 가 그대로 붙는다.
 */
function stageHintOf(caught: unknown) {
  if (typeof caught !== 'object' || caught === null || !('stage' in caught)) {
    return '';
  }

  const { stage } = caught as { stage: unknown };

  return typeof stage === 'string' && stage in STAGE_HINT
    ? STAGE_HINT[stage as CompanyUploadStage]
    : '';
}

/** 분류 배지 색. `globals.css` 의 `.tag-*` 를 그대로 쓴다 */
const CATEGORY_TAG: Record<CompanyDocumentCategory, string> = {
  FINANCE: 'tag-blue',
  COMPANY_INTRO: 'tag-purple',
  PERFORMANCE: 'tag-green',
  CERTIFICATE: 'tag-yellow',
  ETC: 'tag-gray',
};

/**
 * 사내 문서함 — `전사 파일 관리 › 사내 문서함` 탭. (`.ai/API.md` 143~150 · ADMIN 전용)
 *
 * 프로젝트 파일과 **별도 저장소**다. 회사 재정 · 소개 · 실적 자료로 AI 공고 검토의
 * 비교 기준이 되므로, 업로드 · 조회 · 삭제가 모두 이 화면 안에서 끝난다.
 *
 * 미리보기 · 버전 이력은 **행을 눌러 뷰어 모달**에서 본다 (문서 블록 `FileBlock` 과 같은 자리).
 * 업로드는 숨긴 파일 입력 하나를 `새 문서 추가` 와 행의 `새 버전 올리기` 가 함께 쓴다.
 */
export default function CompanyDocumentList() {
  const [keyword, setKeyword] = useState('');
  /** 실제 요청에 쓰는 검색어 — 돋보기 버튼 · 엔터로만 반영한다 */
  const [search, setSearch] = useState('');
  /** 빈 문자열이면 전체 */
  const [category, setCategory] = useState<CompanyDocumentCategory | ''>('');
  const [page, setPage] = useState(0);
  const [reloadCount, setReloadCount] = useState(0);

  /**
   * 어떤 요청의 결과인지 `key` 로 들고 있는다.
   * 조건이 바뀌면 key 가 어긋나 자동으로 로딩 상태가 된다.
   */
  const [result, setResult] = useState<{
    key: string;
    page?: FilePage<CompanyDocument>;
    errorMessage?: string;
  } | null>(null);
  /** 다운로드 실패처럼 화면을 막지 않는 오류 */
  const [errorMessage, setErrorMessage] = useState('');
  /**
   * 방금 지운 문서 — soft delete 라 되돌릴 수 있는데,
   * **목록에 삭제분을 부르는 조건이 없어** 여기서 id 를 들고 있어야만 복구할 수 있다.
   */
  const [justDeleted, setJustDeleted] = useState<CompanyDocument | null>(null);
  const deleteDialog = useModalTarget<CompanyDocument>();
  const editModal = useModalTarget<CompanyDocument>();
  /** 문서 뷰어 — 미리보기 + 버전 이력. 문서 블록이 뷰어 모달에서 보여주는 것과 같다 */
  const viewerModal = useModalTarget<CompanyDocument>();
  const [isDeleting, setIsDeleting] = useState(false);

  /** 새 문서를 올릴 때 쓰는 분류. 새 버전은 기존 문서의 분류를 따른다 */
  const [uploadCategory, setUploadCategory] =
    useState<CompanyDocumentCategory>('FINANCE');
  const [isUploading, setIsUploading] = useState(false);
  const [uploadError, setUploadError] = useState('');
  const pickerRef = useRef<HTMLInputElement>(null);
  /** 새 버전을 올릴 대상. 비어 있으면 새 문서 (`FileBlock` 과 같은 방식) */
  const versionTargetId = useRef<number | undefined>(undefined);

  const hasFilter = search !== '' || category !== '';
  const requestKey = `${reloadCount} ${search} ${category} ${page}`;
  const current = result?.key === requestKey ? result : null;
  const documentPage = current?.page ?? null;
  const documents = documentPage?.content ?? null;
  /** 지역 상수로 받아야 JSX 안에서 `null` 이 아님이 좁혀진다 (단언을 쓰지 않는다) */
  const deletePending = deleteDialog.target;

  useEffect(() => {
    const controller = new AbortController();
    const { signal } = controller;

    getCompanyDocuments(
      {
        category: category || undefined,
        keyword: search || undefined,
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
          // 403(`ACC_ADMIN_REQUIRED`)이 여기로 온다
          errorMessage: messageOf(caught, '문서를 불러오지 못했습니다.'),
        });
      });

    return () => controller.abort();
  }, [requestKey, search, category, page]);

  function reload() {
    setReloadCount((count) => count + 1);
  }

  /** 조건이 바뀌면 첫 페이지로 돌아간다 — 3페이지에서 거르면 빈 화면이 나온다 */
  function applyFilter(change: () => void) {
    change();
    setPage(0);
  }

  /** 파일 선택 창을 연다. `documentId` 를 주면 그 문서의 **새 버전**이다 */
  function pickFile(documentId?: number) {
    versionTargetId.current = documentId;
    setUploadError('');
    pickerRef.current?.click();
  }

  async function upload(file: File) {
    const documentId = versionTargetId.current;

    setIsUploading(true);
    setUploadError('');

    try {
      await uploadCompanyDocument({
        file,
        companyDocumentId: documentId,
        // 새 버전은 기존 문서의 분류를 따른다 — 보내면 안 된다
        category: documentId === undefined ? uploadCategory : undefined,
      });
      // 새 문서는 최신 순 맨 앞에 오므로 첫 페이지로 돌아간다 (검색 · 분류는 그대로 둔다)
      if (documentId === undefined) setPage(0);
      reload();
      notifyToast(
        documentId === undefined
          ? `${file.name} 을(를) 올렸습니다.`
          : `${file.name} 을(를) 새 버전으로 올렸습니다.`,
      );
    } catch (caught) {
      const message =
        caught instanceof Error
          ? caught.message + stageHintOf(caught)
          : '업로드에 실패했습니다.';

      setUploadError(message);
      // 목록을 보는 중에 끝나는 일이라 화면 어디를 보고 있든 결과가 닿아야 한다
      notifyToast(message, 'error');
    } finally {
      setIsUploading(false);
      // 같은 파일을 다시 고를 수 있게 값을 비운다
      if (pickerRef.current) pickerRef.current.value = '';
    }
  }

  function download(versionId: number) {
    downloadCompanyVersion(versionId)
      // 성공하면 지난 실패 문구를 지운다
      .then(() => setErrorMessage(''))
      .catch((caught) =>
        setErrorMessage(messageOf(caught, '다운로드에 실패했습니다.')),
      );
  }

  async function remove(target: CompanyDocument) {
    setIsDeleting(true);

    try {
      await deleteCompanyDocument(target.companyDocumentId);
      deleteDialog.close();
      setJustDeleted(target);
      setErrorMessage('');
      reload();
    } catch (caught) {
      setErrorMessage(messageOf(caught, '삭제하지 못했습니다.'));
      deleteDialog.close();
    } finally {
      setIsDeleting(false);
    }
  }

  function restore(target: CompanyDocument) {
    restoreCompanyDocument(target.companyDocumentId)
      .then(() => {
        setJustDeleted(null);
        reload();
      })
      .catch((caught) =>
        setErrorMessage(messageOf(caught, '복구하지 못했습니다.')),
      );
  }

  return (
    <div>
      {/*
        파일 입력은 감춰 두고 버튼이 대신 연다 — 문서 블록(`FileBlock`)과 같은 방식이다.
        새 문서 · 새 버전이 **같은 입력 하나**를 쓰고, 대상은 `versionTargetId` 가 정한다.
      */}
      <input
        ref={pickerRef}
        type="file"
        aria-label="사내 문서 파일 선택"
        accept={COMPANY_DOCUMENT_EXTENSIONS.map((value) => `.${value}`).join(
          ',',
        )}
        className="hidden"
        onChange={(event) => {
          const file = event.target.files?.[0];
          if (file) void upload(file);
        }}
      />

      <div className="mb-4 flex flex-wrap items-center gap-2">
        <form
          onSubmit={(event) => {
            event.preventDefault();
            applyFilter(() => setSearch(keyword.trim()));
          }}
          className="relative min-w-0 flex-1"
        >
          <label htmlFor="companyDocumentSearch" className="sr-only">
            문서명 검색
          </label>
          <input
            id="companyDocumentSearch"
            type="search"
            value={keyword}
            onChange={(event) => {
              setKeyword(event.target.value);
              // 입력을 비우면 검색을 실행하지 않아도 전체 목록으로 돌아온다
              if (event.target.value.trim() === '') {
                applyFilter(() => setSearch(''));
              }
            }}
            placeholder="문서명 검색"
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

        <div className="shrink-0">
          <label htmlFor="companyDocumentCategoryFilter" className="sr-only">
            분류
          </label>
          <select
            id="companyDocumentCategoryFilter"
            value={category}
            onChange={(event) =>
              applyFilter(() =>
                setCategory(event.target.value as CompanyDocumentCategory | ''),
              )
            }
            className="cursor-pointer rounded-lg border border-border-default bg-bg-surface px-3 py-2 text-label text-text-primary focus:outline-2 focus:outline-offset-2 focus:outline-border-primary"
          >
            <option value="">분류 전체</option>
            {COMPANY_DOCUMENT_CATEGORIES.map((value) => (
              <option key={value} value={value}>
                {COMPANY_DOCUMENT_CATEGORY_LABELS[value]}
              </option>
            ))}
          </select>
        </div>

        {/*
          업로드 분류는 **파일을 고르기 전에** 정해 둔다 — 시작 요청(①)에 분류가 필요하고,
          올린 뒤 고르게 하면 잘못 분류된 문서가 목록에 먼저 나타났다 고쳐진다.
          (새 버전은 기존 문서의 분류를 따르므로 이 값을 쓰지 않는다)
        */}
        <div className="flex shrink-0 items-center gap-2">
          <label htmlFor="companyDocumentUploadCategory" className="sr-only">
            올릴 문서의 분류
          </label>
          <select
            id="companyDocumentUploadCategory"
            value={uploadCategory}
            onChange={(event) =>
              setUploadCategory(event.target.value as CompanyDocumentCategory)
            }
            disabled={isUploading}
            className="cursor-pointer rounded-lg border border-border-default bg-bg-surface px-3 py-2 text-label text-text-primary focus:outline-2 focus:outline-offset-2 focus:outline-border-primary"
          >
            {COMPANY_DOCUMENT_CATEGORIES.map((value) => (
              <option key={value} value={value}>
                {COMPANY_DOCUMENT_CATEGORY_LABELS[value]} 으로 올리기
              </option>
            ))}
          </select>

          <button
            type="button"
            onClick={() => pickFile()}
            disabled={isUploading}
            className="flex shrink-0 cursor-pointer items-center gap-1 rounded-lg bg-btn-primary px-3 py-2 text-label font-semibold text-text-white hover:bg-btn-primary-hover disabled:cursor-not-allowed disabled:bg-bg-hover disabled:text-text-secondary"
          >
            <PlusIcon />
            {isUploading ? '올리는 중…' : '새 문서 추가'}
          </button>
        </div>
      </div>

      <p className="mb-3 text-caption text-text-secondary">
        {COMPANY_DOCUMENT_EXTENSIONS.map((value) => value.toUpperCase()).join(
          ' · ',
        )}{' '}
        · 최대 50MB
      </p>

      {uploadError && (
        <p
          role="alert"
          className="mb-3 rounded-lg border border-red-border bg-red-bg-soft px-3 py-2 text-caption break-keep text-text-danger"
        >
          {uploadError}
        </p>
      )}

      {errorMessage && (
        <p
          role="alert"
          className="mb-3 rounded-lg border border-red-border bg-red-bg-soft px-3 py-2 text-caption text-text-danger"
        >
          {errorMessage}
        </p>
      )}

      {/* 삭제는 soft delete 다 — 되돌릴 길을 이 자리에서만 줄 수 있다 */}
      {justDeleted && (
        <div
          role="status"
          className="mb-3 flex items-center justify-between gap-3 rounded-lg border border-border-default bg-bg-surface px-3 py-2"
        >
          <p className="min-w-0 truncate text-caption text-text-secondary">
            <b className="text-text-primary">{justDeleted.name}</b> 을(를)
            삭제했습니다.
          </p>
          <div className="flex shrink-0 items-center gap-1">
            <button
              type="button"
              onClick={() => restore(justDeleted)}
              className="btn btn-sm btn-gray-outlined"
            >
              되돌리기
            </button>
            <button
              type="button"
              onClick={() => setJustDeleted(null)}
              className="cursor-pointer px-2 py-1 text-caption text-text-secondary hover:text-text-primary"
            >
              닫기
            </button>
          </div>
        </div>
      )}

      <div>
        <div className="min-w-0">
          <DataTable
            caption="사내 문서 목록"
            dense
            minWidth={880}
            rows={documents}
            rowKey={(item) => item.companyDocumentId}
            errorMessage={current?.errorMessage}
            onRetry={reload}
            // 행을 누르면 뷰어(미리보기 + 버전 이력)가 열린다 — 액션 칸만 예외다
            onRowClick={(item) => viewerModal.open(item)}
            emptyState={
              <>
                <p className="text-body-m font-bold text-text-primary">
                  {hasFilter
                    ? '조건에 맞는 문서가 없습니다'
                    : '사내 문서가 없습니다'}
                </p>
                <p className="text-label break-keep text-text-secondary">
                  {hasFilter
                    ? '검색어나 분류를 바꿔보세요'
                    : '위 새 문서 추가 버튼으로 파일을 올려 시작하세요'}
                </p>
              </>
            }
            columns={[
              {
                key: 'name',
                header: '문서명',
                width: '30%',
                cell: (item) => <NameCell item={item} />,
              },
              {
                key: 'category',
                header: '분류',
                width: '10%',
                cell: (item) => (
                  <span className={`tag ${CATEGORY_TAG[item.category]}`}>
                    {COMPANY_DOCUMENT_CATEGORY_LABELS[item.category]}
                  </span>
                ),
              },
              {
                key: 'version',
                header: '버전',
                width: '7%',
                cell: (item) => (
                  <span
                    // 이력은 행을 눌러 뷰어에서 본다 — 배지는 최신 차수 표시다
                    title={`버전 ${item.versionCount}개`}
                    className="rounded-button-sm bg-blue-bg-soft px-1.5 py-0.5 font-mono text-caption font-semibold text-text-primary-blue"
                  >
                    v{item.latestVersionNo}
                  </span>
                ),
              },
              {
                key: 'size',
                header: '크기',
                width: '8%',
                align: 'right',
                cell: (item) => (
                  <span className="whitespace-nowrap text-caption text-text-secondary">
                    {formatFileSize(item.sizeBytes)}
                  </span>
                ),
              },
              {
                key: 'uploader',
                header: '업로더',
                width: '10%',
                cell: (item) => (
                  <span className="block truncate text-caption text-text-secondary">
                    {/* ADMIN 은 사원 레코드가 없어 이름이 오지 않는다 */}
                    {item.uploaderName ?? '—'}
                  </span>
                ),
              },
              {
                key: 'updatedAt',
                header: '수정일',
                width: '13%',
                cell: (item) => (
                  <span className="whitespace-nowrap text-caption text-text-secondary">
                    {formatDate(item.updatedAt)}
                  </span>
                ),
              },
              {
                key: 'actions',
                header: '',
                width: '22%',
                align: 'right',
                // 칸 자체에 동작이 있어 행 클릭으로 새면 안 된다
                stopRowClick: true,
                cell: (item) => (
                  // 순서: 보기 → 고치기 → 새 버전 → 받기 → 지우기 (왼쪽일수록 가벼운 동작)
                  <div className="flex items-center justify-end gap-1.5">
                    <IconButton
                      label={`${item.name} 미리보기`}
                      onClick={() => viewerModal.open(item)}
                    >
                      <EyeIcon />
                    </IconButton>
                    <IconButton
                      label={`${item.name} 표시명 · 분류 수정`}
                      onClick={() => editModal.open(item)}
                    >
                      <PencilIcon />
                    </IconButton>
                    {/* 새 버전은 기존 문서를 덮지 않고 이력에 쌓인다 (append-only) */}
                    <IconButton
                      label={`${item.name} 새 버전 올리기`}
                      onClick={() => pickFile(item.companyDocumentId)}
                      // 업로드 중에 누르면 대상이 덮여 두 요청이 겹친다
                      disabled={isUploading}
                    >
                      <UploadIcon />
                    </IconButton>
                    <IconButton
                      label={`${item.name} 다운로드`}
                      onClick={() => download(item.latestVersionId)}
                    >
                      <DownloadIcon />
                    </IconButton>
                    <IconButton
                      label={`${item.name} 삭제`}
                      onClick={() => deleteDialog.open(item)}
                    >
                      <TrashIcon />
                    </IconButton>
                  </div>
                ),
              },
            ]}
          />

          {/* 표 바깥에 둔다 — 실패 · 빈 상태에서는 넘길 페이지가 없다 */}
          {documentPage && documentPage.totalElements > 0 && (
            <div className="mt-3 overflow-hidden rounded-base border border-border-default bg-bg-card">
              <Pagination
                page={documentPage.page}
                totalPages={documentPage.totalPages}
                totalElements={documentPage.totalElements}
                unit="개"
                onChange={setPage}
              />
            </div>
          )}
        </div>
      </div>

      {deletePending && (
        <AlertDialogTwoButton
          icon={DialogIcons.warning}
          title="이 문서를 삭제할까요?"
          description={`${deletePending.name} 을(를) 목록에서 감춥니다. 삭제 직후 되돌릴 수 있습니다.`}
          confirmLabel="삭제"
          isDanger
          isBusy={isDeleting}
          onConfirm={() => {
            void remove(deletePending);
          }}
          onCancel={deleteDialog.close}
        />
      )}

      {editModal.target && (
        <EditCompanyDocumentModal
          item={editModal.target}
          onClose={editModal.close}
          onSaved={reload}
        />
      )}

      {viewerModal.target && (
        <CompanyDocumentViewerModal
          item={viewerModal.target}
          onClose={viewerModal.close}
          onDownload={download}
        />
      )}
    </div>
  );
}

/** ⚠️ prop 이름을 `document` 로 두지 않는다 — 브라우저 전역 `document` 를 가린다 */
function NameCell({ item }: { item: CompanyDocument }) {
  const style = extensionStyle(item.extension);

  return (
    <div className="flex min-w-0 items-center gap-2.5">
      <span
        aria-hidden
        style={{ color: style.text, backgroundColor: style.background }}
        className="flex size-7 shrink-0 items-center justify-center rounded-button-sm"
      >
        <DocumentIcon />
      </span>
      <span
        title={item.originalFileName}
        className="min-w-0 truncate text-label font-semibold text-text-primary"
      >
        {item.name}
      </span>
      <span
        style={{ color: style.text, backgroundColor: style.background }}
        className="shrink-0 rounded-button-sm px-1 py-0.5 font-mono text-micro font-semibold"
      >
        {extensionLabel(item.extension)}
      </span>
    </div>
  );
}

/** 미리보기 · 다운로드 · 삭제처럼 칸 안에 놓이는 아이콘 버튼 */
function IconButton({
  label,
  onClick,
  disabled = false,
  children,
}: {
  label: string;
  onClick: () => void;
  disabled?: boolean;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      title={label}
      aria-label={label}
      onClick={onClick}
      disabled={disabled}
      className="flex size-7 cursor-pointer items-center justify-center rounded-button-md text-text-secondary hover:bg-bg-surface hover:text-text-primary-blue disabled:cursor-not-allowed disabled:opacity-40"
    >
      {children}
    </button>
  );
}

/** 아이콘 라이브러리 도입 전까지 인라인 SVG 로 둔다 */
function IconBase({ children }: { children: React.ReactNode }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
      className="size-4"
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

function DocumentIcon() {
  return (
    <IconBase>
      <path d="M14 3H7a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V8z" />
      <path d="M14 3v5h5" />
    </IconBase>
  );
}

function UploadIcon() {
  return (
    <IconBase>
      <path d="M12 20V8m0 0-4 4m4-4 4 4" />
      <path d="M4 5h16" />
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

function PencilIcon() {
  return (
    <IconBase>
      <path d="M4 20h4l10-10-4-4L4 16z" />
      <path d="m14 6 4 4" />
    </IconBase>
  );
}

function PlusIcon() {
  return (
    <IconBase>
      <path d="M12 5v14M5 12h14" />
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

function TrashIcon() {
  return (
    <IconBase>
      <path d="M3 6h18M8 6V4h8v2M6 6l1 14h10l1-14" />
      <path d="M10 11v5M14 11v5" />
    </IconBase>
  );
}
