'use client';

import { useEffect, useState } from 'react';

import Modal from '@/components/Modal';
import LoadingSpinner from '@/components/Spinner';
import { messageOf } from '@/lib/api';

import { downloadVersion, getFileVersions } from './api';
import { FILE_CODES } from './errorCodes';
import { extensionLabel, extensionStyle, formatFileSize } from './format';
import PdfPages from './PdfPages';
import { loadPreview } from './previewCache';
import type { FileVersion, FileVersionsResponse, ViewerFile } from './types';

/** 미리보기 상태 — 로딩 · 지원 안 함 · 실패를 화면에서 구분해야 한다 */
type Preview =
  | { kind: 'loading' }
  | { kind: 'ready'; blob: Blob; shown: number | null; total: number | null }
  | { kind: 'unsupported' }
  | { kind: 'failed'; message: string };

/**
 * 문서 뷰어 모달.
 *
 * 시안의 `문서 보기` 와 `문서 버전 조회` 는 같은 모달의 두 상태라
 * `버전 이력` 버튼으로 좌측 패널을 토글한다.
 *
 * PDF 만 미리보기가 되고(서버가 앞 5페이지를 잘라 준다), 그 외 형식은
 * 다운로드로 안내한다.
 */
export default function FileViewerModal({
  file,
  onClose,
}: {
  /**
   * 블록 문서 목록 · 프로젝트 문서함이 함께 넘긴다.
   * 문서함 응답에는 업로더 부서 · 직급이 없어 `ViewerFile` 에서 선택 필드다.
   */
  file: ViewerFile;
  onClose: () => void;
}) {
  const [versionId, setVersionId] = useState(file.latestVersionId);
  /** 버전 패널은 접힌 상태로 시작하고 헤더 버튼으로 펼친다 */
  const [showVersions, setShowVersions] = useState(false);
  const [versions, setVersions] = useState<FileVersionsResponse | null>(null);
  /** 버전 이력 실패는 로딩과 구분해야 한다 — null 로 두면 스켈레톤이 계속 돈다 */
  const [versionsError, setVersionsError] = useState('');
  /** 값이 바뀌면 버전 이력을 다시 불러온다 */
  const [versionsRetry, setVersionsRetry] = useState(0);
  /**
   * 어느 버전의 미리보기인지 함께 담는다 — 버전을 바꾸면 즉시 무효가 된다.
   * effect 본문에서 로딩 상태로 되돌리면 `react-hooks/set-state-in-effect` 에 걸린다.
   */
  const [previewOf, setPreviewOf] = useState<{
    versionId: number;
    preview: Preview;
  } | null>(null);
  const [errorMessage, setErrorMessage] = useState('');

  const preview: Preview =
    previewOf?.versionId === versionId
      ? previewOf.preview
      : { kind: 'loading' };

  // 보고 있는 버전. 이력을 아직 못 받았으면 목록이 준 최신 값으로 채운다
  const current: Pick<
    FileVersion,
    | 'versionNo'
    | 'latest'
    | 'originalFileName'
    | 'extension'
    | 'sizeBytes'
    | 'uploaderName'
    | 'uploaderDepartment'
    | 'uploaderPosition'
    | 'completedAt'
  > = versions?.content.find((item) => item.fileVersionId === versionId) ?? {
    versionNo: file.latestVersionNo,
    latest: true,
    originalFileName: file.originalFileName,
    extension: file.extension,
    sizeBytes: file.sizeBytes,
    uploaderName: file.uploaderName,
    // 문서함에서 열면 비어 있다 — 버전 이력이 도착하면 채워진다
    uploaderDepartment: file.uploaderDepartment ?? '',
    uploaderPosition: file.uploaderPosition ?? '',
    completedAt: file.updatedAt,
  };

  /**
   * 업로더 한 줄 — `부서 / 직급 이름`.
   * 부서 · 직급이 비어 있을 때 구분자만 남으면 (` / 김용준`) 값이 깨진 것처럼 보인다.
   */
  const uploaderLine = [
    [current.uploaderDepartment, current.uploaderPosition]
      .filter(Boolean)
      .join(' / '),
    current.uploaderName,
  ]
    .filter(Boolean)
    .join(' ');

  const style = extensionStyle(current.extension);

  useEffect(() => {
    /**
     * hover 프리페치가 시작해 둔 요청을 이어받는다.
     * 중단(`abort`)하지 않고 **결과만 무시**한다 — 끊어 버리면 캐시가 비어
     * 다시 열 때 처음부터 받아야 하고, 프리페치가 무의미해진다.
     */
    let isStale = false;

    loadPreview(versionId)
      .then(({ blob, previewPageCount, totalPageCount }) => {
        if (isStale) return;
        // react-pdf 가 Blob 을 그대로 받는다 — object URL 을 만들지 않아 해제도 필요 없다
        setPreviewOf({
          versionId,
          preview: {
            kind: 'ready',
            blob,
            shown: previewPageCount,
            total: totalPageCount,
          },
        });
      })
      .catch((caught) => {
        if (isStale) return;

        const code =
          caught && typeof caught === 'object' && 'code' in caught
            ? (caught as { code?: string }).code
            : undefined;

        setPreviewOf({
          versionId,
          preview:
            code === FILE_CODES.previewNotSupported
              ? { kind: 'unsupported' }
              : {
                  kind: 'failed',
                  message: messageOf(caught, '미리보기를 불러오지 못했습니다.'),
                },
        });
      });

    return () => {
      isStale = true;
    };
  }, [versionId]);

  // 패널을 처음 펼칠 때만 이력을 불러온다 (재시도 시에도 다시 탄다)
  useEffect(() => {
    if (!showVersions || versions) return;

    const controller = new AbortController();
    const { signal } = controller;

    getFileVersions(file.fileId, signal)
      .then((loadedVersions) => {
        setVersions(loadedVersions);
        setVersionsError('');
      })
      .catch((caught) => {
        if (!signal.aborted) {
          setVersionsError(
            messageOf(caught, '버전 이력을 불러오지 못했습니다.'),
          );
        }
      });

    return () => controller.abort();
  }, [showVersions, versions, file.fileId, versionsRetry]);

  const versionCount = versions?.versionCount ?? file.versionCount;

  return (
    <Modal
      title={`${file.name} 문서 보기`}
      onClose={onClose}
      /**
       * 창 크기 — **화면을 다 먹지 않는다.** 넓은 모니터에서 `85vh` · `860px` 로 두면
       * 뒤 화면이 거의 가려져 창이 아니라 페이지처럼 보였다. 미리보기는 내용을 확인하는
       * 자리이지 작업하는 자리가 아니라, 뒤가 비쳐 보이는 편이 낫다.
       */
      className="flex h-[min(72vh,680px)] w-full max-w-[720px] flex-col overflow-hidden rounded-base border border-border-default shadow-2xl"
      header={
        <div className="flex shrink-0 items-center gap-3 border-b border-border-default px-5 py-3">
          <span
            style={{ color: style.text, backgroundColor: style.background }}
            className="shrink-0 rounded-button-sm border px-2 py-0.5 font-mono text-caption font-bold"
          >
            {extensionLabel(current.extension)}
          </span>

          <div className="min-w-0 flex-1">
            <h2 className="truncate text-detail font-semibold text-text-primary">
              {current.originalFileName}
            </h2>
            <p className="mt-0.5 flex flex-wrap items-center gap-x-2 text-caption text-text-secondary">
              <span className="font-mono text-text-primary-blue">
                v{current.versionNo}
                {current.latest && ' (최신)'}
              </span>
              <span aria-hidden>·</span>
              <span>{uploaderLine}</span>
              <span aria-hidden>·</span>
              <span>
                {current.completedAt.slice(0, 10).replaceAll('-', '.')}
              </span>
              <span aria-hidden>·</span>
              <span>{formatFileSize(current.sizeBytes)}</span>
            </p>
          </div>

          <div className="flex shrink-0 items-center gap-1.5">
            <button
              type="button"
              aria-pressed={showVersions}
              onClick={() => setShowVersions((wasOpen) => !wasOpen)}
              className={`flex cursor-pointer items-center gap-1.5 rounded-button-md px-2.5 py-1.5 text-detail font-medium ${
                showVersions
                  ? 'bg-blue-bg-soft text-text-primary-blue'
                  : 'text-text-secondary hover:bg-bg-hover'
              }`}
            >
              <HistoryIcon />
              버전 이력 ({versionCount})
            </button>
            <button
              type="button"
              onClick={() =>
                downloadVersion(versionId).catch((caught) =>
                  setErrorMessage(
                    messageOf(caught, '다운로드에 실패했습니다.'),
                  ),
                )
              }
              className="flex cursor-pointer items-center gap-1.5 rounded-button-md px-2.5 py-1.5 text-detail font-medium text-text-secondary hover:bg-bg-hover"
            >
              <DownloadIcon />
              다운로드
            </button>
            <button
              type="button"
              onClick={onClose}
              aria-label="닫기"
              className="flex size-7 cursor-pointer items-center justify-center rounded-button-md text-text-secondary hover:bg-bg-hover"
            >
              <CloseIcon />
            </button>
          </div>
        </div>
      }
    >
      <div className="flex min-h-0 flex-1">
        {showVersions && (
          <aside className="flex w-60 shrink-0 flex-col border-r border-border-default">
            <p className="shrink-0 border-b border-border-default px-4 py-2.5 font-mono text-caption font-bold tracking-[1px] text-text-secondary uppercase">
              버전 이력
            </p>
            <div className="min-h-0 flex-1 overflow-y-auto p-3">
              {versionsError ? (
                <div className="flex flex-col items-center gap-2 py-6">
                  <p
                    role="alert"
                    className="text-center text-caption break-keep text-text-secondary"
                  >
                    {versionsError}
                  </p>
                  <button
                    type="button"
                    onClick={() => {
                      setVersionsError('');
                      setVersionsRetry((count) => count + 1);
                    }}
                    className="cursor-pointer rounded-button-md border border-border-default px-2.5 py-1 text-caption font-medium text-text-primary-blue hover:bg-blue-bg-soft"
                  >
                    다시 시도
                  </button>
                </div>
              ) : !versions ? (
                <LoadingSpinner
                  label="버전 이력을 불러오는 중입니다"
                  className="py-16"
                />
              ) : (
                <ul className="flex flex-col gap-2">
                  {versions.content.map((version) => (
                    <VersionCard
                      key={version.fileVersionId}
                      version={version}
                      isSelected={version.fileVersionId === versionId}
                      onSelect={() => setVersionId(version.fileVersionId)}
                      onDownload={() =>
                        downloadVersion(version.fileVersionId).catch((caught) =>
                          setErrorMessage(
                            messageOf(caught, '다운로드에 실패했습니다.'),
                          ),
                        )
                      }
                    />
                  ))}
                </ul>
              )}
            </div>
          </aside>
        )}

        {/*
          `scrollbar-gutter: stable` — PDF 페이지를 그리는 순간 스크롤바가 생기며 폭이 줄면
          `PdfPages` 의 ResizeObserver 가 다시 돌아 캔버스 전체를 한 번 더 그린다.
          자리를 미리 비워 두면 그 왕복이 없다.
        */}
        <div className="flex min-w-0 flex-1 [scrollbar-gutter:stable] flex-col items-center gap-4 overflow-y-auto bg-bg-surface p-6">
          <PreviewPane
            preview={preview}
            onDownload={() =>
              downloadVersion(versionId).catch((caught) =>
                setErrorMessage(messageOf(caught, '다운로드에 실패했습니다.')),
              )
            }
            onFailed={(message) =>
              setPreviewOf({ versionId, preview: { kind: 'failed', message } })
            }
          />

          {preview.kind === 'ready' && (
            <div className="w-full max-w-[576px] rounded-button-sm border border-border-default bg-bg-surface p-3">
              <p className="font-mono text-micro text-text-secondary">
                미리보기 제한 안내
              </p>
              <p className="mt-1 text-caption text-text-secondary">
                전체 문서는 다운로드 후 확인하세요.
                {preview.total !== null && ` (총 ${preview.total}페이지`}
                {preview.total !== null &&
                  preview.shown !== null &&
                  ` 중 ${preview.shown}페이지 표시`}
                {preview.total !== null && ')'}
              </p>
            </div>
          )}

          {errorMessage && (
            <p
              role="alert"
              className="w-full max-w-[576px] rounded-button-sm bg-red-bg-soft px-3 py-2 text-caption break-keep text-text-danger"
            >
              {errorMessage}
            </p>
          )}
        </div>
      </div>
    </Modal>
  );
}

/**
 * 미리보기 본문.
 * 브라우저 내장 뷰어를 쓰지 않고 페이지를 직접 그린다 — 툴바가 없고
 * 스크롤도 만들지 않아 모달 본문이 그대로 스크롤된다.
 */
function PreviewPane({
  preview,
  onDownload,
  onFailed,
}: {
  preview: Preview;
  onDownload: () => void;
  onFailed: (message: string) => void;
}) {
  if (preview.kind === 'loading') {
    return (
      <LoadingSpinner
        label="미리보기를 불러오는 중입니다"
        className="h-[600px] w-full max-w-[576px]"
      />
    );
  }

  if (preview.kind === 'ready') {
    return (
      <div className="w-full max-w-[576px]">
        <PdfPages file={preview.blob} onFailed={onFailed} />
      </div>
    );
  }

  return (
    <div className="flex h-[600px] w-full max-w-[576px] flex-col items-center justify-center gap-3 rounded-button-sm border border-border-default bg-bg-card px-8 text-center shadow-sm">
      <p className="text-label break-keep text-text-secondary">
        {preview.kind === 'unsupported'
          ? 'PDF 만 미리보기를 지원합니다. 다운로드해서 확인해주세요.'
          : preview.message}
      </p>
      <button
        type="button"
        onClick={onDownload}
        className="btn btn-md btn-primary min-w-[104px]"
      >
        다운로드
      </button>
    </div>
  );
}

function VersionCard({
  version,
  isSelected,
  onSelect,
  onDownload,
}: {
  version: FileVersion;
  isSelected: boolean;
  onSelect: () => void;
  onDownload: () => void;
}) {
  return (
    <li
      className={`rounded-lg border p-3 ${
        isSelected
          ? 'border-border-primary/40 bg-blue-bg-soft'
          : 'border-border-default hover:bg-bg-surface'
      }`}
    >
      <button
        type="button"
        aria-current={isSelected ? 'true' : undefined}
        onClick={onSelect}
        className="w-full cursor-pointer text-left"
      >
        <span className="flex items-center gap-2">
          <span
            className={`rounded-button-sm px-1.5 py-0.5 font-mono text-caption font-bold ${
              isSelected
                ? 'bg-btn-primary text-text-white'
                : 'bg-bg-hover text-text-secondary'
            }`}
          >
            v{version.versionNo}
          </span>
          {version.latest && (
            <span className="font-mono text-micro font-bold text-text-primary-blue">
              최신
            </span>
          )}
        </span>

        <span className="mt-1.5 block text-micro text-text-secondary">
          {version.uploaderDepartment}
        </span>
        <span className="mt-1 block text-caption font-semibold text-text-primary">
          {version.uploaderPosition} {version.uploaderName}
        </span>
        {version.comment && (
          <span className="mt-1 block text-micro text-text-secondary italic">
            “{version.comment}”
          </span>
        )}
        <span className="mt-2 flex justify-between font-mono text-micro text-text-secondary">
          <span>{version.completedAt.slice(0, 10).replaceAll('-', '.')}</span>
          <span>{formatFileSize(version.sizeBytes)}</span>
        </span>
      </button>

      <button
        type="button"
        onClick={onDownload}
        className="mt-2 flex w-full cursor-pointer items-center justify-center gap-1 rounded-button-sm border border-dashed border-border-default px-2 py-1 text-micro font-medium text-text-secondary hover:bg-bg-hover"
      >
        <DownloadIcon />이 버전 다운로드
      </button>
    </li>
  );
}

function HistoryIcon() {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
      className="size-3 shrink-0"
    >
      <circle cx="12" cy="12" r="9" />
      <path d="M12 7.5V12l3 2" />
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
      className="size-3 shrink-0"
    >
      <path d="M4 20h16" />
      <path d="M12 4v11" />
      <path d="m7.5 10.5 4.5 4.5 4.5-4.5" />
    </svg>
  );
}

function CloseIcon() {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      aria-hidden
      className="size-3.5"
    >
      <path d="M6 6l12 12M18 6 6 18" />
    </svg>
  );
}
