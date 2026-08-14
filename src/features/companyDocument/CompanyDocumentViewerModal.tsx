'use client';

import { lazy, Suspense, useEffect, useState } from 'react';

import Modal from '@/components/Modal';
import { messageOf } from '@/lib/api';
import { formatDate } from '@/lib/format';

import { extensionLabel, extensionStyle, formatFileSize } from '../file/format';
import { getCompanyDocumentVersions, getCompanyPreview } from './api';
import type { CompanyDocument, CompanyDocumentVersionsResponse } from './types';

/** PDF 뷰어는 pdfjs 를 끌고 온다 — 문서를 열지 않는 사용자에게 내려보내지 않는다 */
const PdfPages = lazy(() => import('../file/PdfPages'));

/** 미리보기 상태 — 로딩 · 지원 안 함 · 실패를 화면에서 구분해야 한다 */
type Preview =
  | { kind: 'loading' }
  | { kind: 'ready'; blob: Blob; shown: number | null; total: number | null }
  | { kind: 'unsupported' }
  | { kind: 'failed'; message: string };

/**
 * 사내 문서 뷰어. **버전 이력 + 미리보기**를 한 모달에서 본다.
 * (프로젝트 파일의 `FileViewerModal` 과 같은 구성이다 — 도메인만 다르다)
 *
 * 미리보기는 서버가 앞 5페이지만 잘라 PDF 로 준다 (`.ai/API.md` 148).
 * 이력은 **append-only** 라 버전을 고르면 미리보기 · 내려받기 대상만 바뀐다.
 */
export default function CompanyDocumentViewerModal({
  // ⚠️ prop 이름을 `document` 로 두지 않는다 — 브라우저 전역 `document` 를 가린다
  item,
  onClose,
  onDownload,
}: {
  item: CompanyDocument;
  onClose: () => void;
  onDownload: (versionId: number) => void;
}) {
  const [versionId, setVersionId] = useState(item.latestVersionId);
  const [versions, setVersions] =
    useState<CompanyDocumentVersionsResponse | null>(null);
  /** 이력 실패는 로딩과 구분해야 한다 — null 로 두면 스켈레톤이 계속 돈다 */
  const [versionsError, setVersionsError] = useState('');
  /**
   * 어느 버전의 미리보기인지 함께 담는다 — 버전을 바꾸면 즉시 무효가 된다.
   * effect 본문에서 로딩으로 되돌리면 `react-hooks/set-state-in-effect` 에 걸린다.
   */
  const [previewOf, setPreviewOf] = useState<{
    versionId: number;
    preview: Preview;
  } | null>(null);

  useEffect(() => {
    const controller = new AbortController();
    const { signal } = controller;

    getCompanyDocumentVersions(item.companyDocumentId, signal)
      .then(setVersions)
      .catch((caught) => {
        if (signal.aborted) return;
        setVersionsError(messageOf(caught, '버전 이력을 불러오지 못했습니다.'));
      });

    return () => controller.abort();
  }, [item.companyDocumentId]);

  useEffect(() => {
    const controller = new AbortController();
    const { signal } = controller;

    getCompanyPreview(versionId, signal)
      .then(({ blob, previewPageCount, totalPageCount }) =>
        setPreviewOf({
          versionId,
          preview: {
            kind: 'ready',
            blob,
            shown: previewPageCount,
            total: totalPageCount,
          },
        }),
      )
      .catch((caught) => {
        if (signal.aborted) return;

        const code =
          caught && typeof caught === 'object' && 'code' in caught
            ? (caught as { code?: string }).code
            : undefined;

        setPreviewOf({
          versionId,
          preview:
            // 409 `CDOC_PREVIEW_NOT_SUPPORTED` — 형식 문제라 다시 시도할 것이 없다
            code === 'CDOC_PREVIEW_NOT_SUPPORTED'
              ? { kind: 'unsupported' }
              : {
                  kind: 'failed',
                  message: messageOf(caught, '미리보기를 불러오지 못했습니다.'),
                },
        });
      });

    return () => controller.abort();
  }, [versionId]);

  /** 목록이 준 값으로 시작하고, 이력이 도착하면 고른 버전의 값으로 바뀐다 */
  const current = versions?.content.find(
    (version) => version.versionId === versionId,
  );
  const extension = current?.extension ?? item.extension;
  const style = extensionStyle(extension);
  const preview: Preview =
    previewOf?.versionId === versionId
      ? previewOf.preview
      : { kind: 'loading' };

  return (
    <Modal
      title={`${item.name} 문서 보기`}
      onClose={onClose}
      className="flex h-[85vh] w-full max-w-[860px] flex-col overflow-hidden rounded-base border border-border-default shadow-2xl"
      header={
        <div className="flex shrink-0 items-center gap-3 border-b border-border-default px-5 py-3">
          <span
            style={{ color: style.text, backgroundColor: style.background }}
            className="shrink-0 rounded-button-sm px-2 py-0.5 font-mono text-caption font-bold"
          >
            {extensionLabel(extension)}
          </span>

          <div className="min-w-0 flex-1">
            <h2 className="truncate text-detail font-semibold text-text-primary">
              {item.name}
            </h2>
            <p className="mt-0.5 flex flex-wrap items-center gap-x-2 text-caption text-text-secondary">
              <span className="font-mono text-text-primary-blue">
                v{current?.versionNo ?? item.latestVersionNo}
                {(current?.latest ?? true) && ' (최신)'}
              </span>
              <span aria-hidden>·</span>
              {/* 업로더가 ADMIN 이면 이름이 오지 않는다 */}
              <span>{current?.uploaderName ?? item.uploaderName ?? '—'}</span>
              <span aria-hidden>·</span>
              <span>
                {formatDate(current?.completedAt ?? item.updatedAt)}
              </span>
              <span aria-hidden>·</span>
              <span>
                {formatFileSize(current?.sizeBytes ?? item.sizeBytes)}
              </span>
            </p>
          </div>

          {/* 문서 뷰어(`FileViewerModal`)와 같은 모양 — 아이콘 + `다운로드` */}
          <button
            type="button"
            onClick={() => onDownload(versionId)}
            className="flex shrink-0 cursor-pointer items-center gap-1.5 rounded-button-md px-2.5 py-1.5 text-detail font-medium text-text-secondary hover:bg-bg-hover"
          >
            <DownloadIcon />
            다운로드
          </button>
          <button
            type="button"
            aria-label="닫기"
            onClick={onClose}
            className="shrink-0 cursor-pointer text-text-secondary hover:text-text-primary"
          >
            ✕
          </button>
        </div>
      }
    >
      <div className="flex min-h-0 flex-1">
        {/* 버전 이력 — 고르면 오른쪽 미리보기가 그 버전으로 바뀐다 */}
        <div className="no-scrollbar w-60 shrink-0 overflow-y-auto border-r border-border-default p-3">
          <p className="mb-2 px-1 text-caption font-semibold text-text-secondary">
            버전 이력 ({versions?.versionCount ?? item.versionCount})
          </p>

          {versionsError && (
            <p className="px-1 text-caption text-text-secondary">
              {versionsError}
            </p>
          )}

          {!versions && !versionsError && (
            <div aria-hidden className="flex flex-col gap-1.5">
              {[0, 1].map((index) => (
                <span
                  key={index}
                  className="h-12 animate-pulse rounded-button-md bg-bg-hover"
                />
              ))}
            </div>
          )}

          <ul className="flex flex-col gap-1.5">
            {versions?.content.map((version) => {
              const isSelected = version.versionId === versionId;

              return (
                <li key={version.versionId}>
                  <button
                    type="button"
                    onClick={() => setVersionId(version.versionId)}
                    aria-current={isSelected ? 'true' : undefined}
                    className={`flex w-full cursor-pointer items-start gap-2 rounded-button-md border px-2 py-1.5 text-left ${
                      isSelected
                        ? 'border-border-primary bg-blue-bg-soft'
                        : 'border-border-default hover:bg-bg-surface'
                    }`}
                  >
                    <span className="shrink-0 rounded-button-sm bg-bg-hover px-1.5 py-0.5 font-mono text-micro font-semibold text-text-primary">
                      v{version.versionNo}
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="flex items-center gap-1">
                        <span className="min-w-0 truncate text-caption font-semibold text-text-primary">
                          {version.comment || version.originalFileName}
                        </span>
                        {version.latest && (
                          <span className="shrink-0 rounded-button-sm bg-btn-primary px-1 py-0.5 text-micro font-semibold text-text-white">
                            최신
                          </span>
                        )}
                      </span>
                      <span className="mt-0.5 block text-micro text-text-secondary">
                        {formatDate(version.completedAt)} ·{' '}
                        {formatFileSize(version.sizeBytes)}
                      </span>
                    </span>
                  </button>
                </li>
              );
            })}
          </ul>
        </div>

        {/* 미리보기 — 서버가 앞 5페이지만 잘라 준다 */}
        <div className="min-w-0 flex-1 overflow-y-auto bg-bg-surface p-4">
          {preview.kind === 'loading' && (
            <div
              role="status"
              aria-label="미리보기를 불러오는 중입니다"
              className="mx-auto h-[560px] w-full max-w-[560px] animate-pulse rounded-button-sm bg-bg-hover"
            />
          )}

          {preview.kind === 'ready' && (
            <Suspense
              fallback={
                <div
                  aria-hidden
                  className="mx-auto h-[560px] w-full max-w-[560px] animate-pulse rounded-button-sm bg-bg-hover"
                />
              }
            >
              <PdfPages
                file={preview.blob}
                onFailed={(message) =>
                  setPreviewOf({
                    versionId,
                    preview: { kind: 'failed', message },
                  })
                }
              />
              {preview.shown !== null && (
                <p className="mt-2 text-center text-micro text-text-secondary">
                  미리보기 {preview.shown}
                  {preview.total !== null && ` / ${preview.total}`}페이지 —
                  전체는 내려받아 확인해주세요.
                </p>
              )}
            </Suspense>
          )}

          {preview.kind === 'unsupported' && (
            <Notice text="이 형식은 미리보기를 지원하지 않아요. 내려받아 확인해주세요." />
          )}
          {preview.kind === 'failed' && <Notice text={preview.message} />}
        </div>
      </div>
    </Modal>
  );
}

/** 문서 뷰어(`FileViewerModal`)와 같은 벡터 · 크기다 */
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

function Notice({ text }: { text: string }) {
  return (
    <div className="flex h-full items-center justify-center px-4">
      <p className="text-center text-caption break-keep text-text-secondary">
        {text}
      </p>
    </div>
  );
}
