'use client';

import { useEffect, useState } from 'react';

import Modal from '@/components/Modal';
import {
  downloadVersion,
  getFileVersion,
  getPreview,
} from '@/features/file/api';
import { FILE_CODES } from '@/features/file/errorCodes';
import { formatFileSize } from '@/features/file/format';
import PdfPages from '@/features/file/PdfPages';
import type { FileVersionDetail } from '@/features/file/types';
import { ApiError, messageOf } from '@/lib/api';

import type { ApprovalDocument } from './types';

/** 미리보기 상태 — 로딩 · 지원 안 함 · 실패를 화면에서 구분해야 한다 */
type Preview =
  | { kind: 'loading' }
  | { kind: 'ready'; blob: Blob; shown: number | null; total: number | null }
  | { kind: 'unsupported' }
  | { kind: 'denied' }
  | { kind: 'failed'; message: string };

/**
 * 결재 문서 뷰어. 문서 블록의 `FileViewerModal` 과 같은 방식으로 그리되
 * **버전 전환 패널이 없다** — 결재 대상은 상신 시점에 확정된 **한 버전**이라
 * 다른 버전을 열 수 있으면 무엇을 결재하는지 흐려진다 (AP-013·014).
 *
 * 미리보기는 PDF 만 되고(서버가 앞 5페이지를 잘라 준다) 그 외는 다운로드로 안내한다.
 */
export default function ApprovalDocumentModal({
  document,
  onClose,
}: {
  document: ApprovalDocument;
  onClose: () => void;
}) {
  const [preview, setPreview] = useState<Preview>({ kind: 'loading' });
  const [version, setVersion] = useState<FileVersionDetail | null>(null);
  const [downloadError, setDownloadError] = useState('');
  /** 목록과 같은 값을 먼저 쓴다 — 헤더만 다른 이름이면 다른 문서로 오해한다 */
  const fileName =
    document.fileName ??
    version?.originalFileName ??
    `파일 버전 #${document.fileVersionId}`;

  // 결재가 고정한 버전의 정보. 휴지통에 있어도 오므로 미리보기와 따로 받는다
  useEffect(() => {
    const controller = new AbortController();
    const { signal } = controller;

    getFileVersion(document.fileVersionId, signal)
      .then(setVersion)
      // 버전 정보는 보조 표기라 실패해도 미리보기까지 막지 않는다
      .catch(() => undefined);

    return () => controller.abort();
  }, [document.fileVersionId]);

  useEffect(() => {
    const controller = new AbortController();
    const { signal } = controller;

    getPreview(document.fileVersionId, signal)
      .then(({ blob, previewPageCount, totalPageCount }) =>
        setPreview({
          kind: 'ready',
          blob,
          shown: previewPageCount,
          total: totalPageCount,
        }),
      )
      .catch((caught: unknown) => {
        if (signal.aborted) return;

        const code = caught instanceof ApiError ? caught.code : undefined;

        if (code === FILE_CODES.previewNotSupported) {
          setPreview({ kind: 'unsupported' });
          return;
        }
        /**
         * ❗ 파일 API 는 **스텝 권한**을 본다. 결재자가 그 프로젝트 참여자가 아니면
         * 자기가 결재할 문서를 못 연다 — MASTER 는 참여자가 아니어도 최종 결재자가
         * 될 수 있어(AP-019) 정상 흐름에서도 걸린다. 백엔드 확인 대기 항목이다.
         */
        if (code === FILE_CODES.accessPermissionRequired) {
          setPreview({ kind: 'denied' });
          return;
        }
        setPreview({
          kind: 'failed',
          message: messageOf(caught, '미리보기를 불러오지 못했습니다.'),
        });
      });

    return () => controller.abort();
  }, [document.fileVersionId]);

  async function download() {
    setDownloadError('');
    try {
      await downloadVersion(document.fileVersionId);
    } catch (caught) {
      setDownloadError(messageOf(caught, '다운로드하지 못했습니다.'));
    }
  }

  return (
    <Modal
      title={`${fileName} 문서 보기`}
      onClose={onClose}
      className="m-auto flex h-[85vh] w-full max-w-3xl flex-col overflow-hidden rounded-xl border border-[#1C1F2A]/10 shadow-2xl"
      // 기본 제목 줄을 대신한다 — 넘기지 않으면 파일명이 두 번 나온다
      header={
        <div className="flex shrink-0 items-center gap-3 border-b border-[#1C1F2A]/10 px-5 py-3">
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-semibold text-[#1C1F2A]">
              {fileName}
            </p>
            <p className="mt-0.5 flex flex-wrap items-center gap-x-2 text-[11px] text-[#6C7389]">
              {version && (
                <span className="font-mono text-[#3B5BDB]">
                  v{version.versionNo}
                </span>
              )}
              <span>
                {document.fileSize !== undefined &&
                  formatFileSize(document.fileSize)}
              </span>
              {document.uploadedAt && (
                <span>{document.uploadedAt.slice(0, 10)}</span>
              )}
              {version?.uploaderName && <span>{version.uploaderName}</span>}
            </p>
          </div>

          <button
            type="button"
            onClick={download}
            className="shrink-0 cursor-pointer rounded-lg border border-[#1C1F2A]/10 px-3 py-1.5 text-xs font-semibold text-[#1C1F2A] hover:bg-[#ECEEF4]"
          >
            다운로드
          </button>
          <button
            type="button"
            onClick={onClose}
            aria-label="닫기"
            className="shrink-0 cursor-pointer rounded-md px-2 py-1 text-[#6C7389] hover:bg-[#ECEEF4]"
          >
            ✕
          </button>
        </div>
      }
    >
      {/* 고정된 버전을 그대로 보여주되, 최신이 아니라는 사실은 알려야 한다 (AP-013) */}
      {version && !version.latest && (
        <p className="shrink-0 bg-[#FFFBEB] px-5 py-2 text-[11px] break-keep text-[#BB4D00]">
          결재 이후 새 버전(v{version.latestVersionNo})이 올라왔습니다. 결재
          대상은 v{version.versionNo} 입니다.
        </p>
      )}
      {version?.fileDeleted && (
        <p className="shrink-0 bg-[#ECEEF4] px-5 py-2 text-[11px] break-keep text-[#6C7389]">
          원본 문서는 휴지통에 있습니다. 결재 이력 보존을 위해 이 버전은 계속
          조회됩니다.
        </p>
      )}

      {/* 스크롤은 이 영역이 갖는다 — PdfPages 는 페이지를 쌓기만 한다 */}
      <div className="min-h-0 flex-1 overflow-y-auto bg-[#ECEEF4]/40 p-5">
        {preview.kind === 'loading' && (
          <p className="text-center text-xs text-[#6C7389]">
            미리보기를 불러오는 중…
          </p>
        )}

        {preview.kind === 'ready' && (
          <>
            <PdfPages
              file={preview.blob}
              onFailed={(message) => setPreview({ kind: 'failed', message })}
            />
            {preview.total !== null && preview.shown !== null && (
              <p className="mt-4 rounded-lg bg-white px-3 py-2 text-center text-[11px] break-keep text-[#6C7389]">
                미리보기는 {preview.shown}페이지까지만 보여줍니다. 전체 문서는
                다운로드 후 확인하세요. (총 {preview.total}페이지)
              </p>
            )}
          </>
        )}

        {preview.kind === 'denied' && (
          <div className="text-center">
            <p className="text-xs font-semibold text-[#1C1F2A]">
              이 문서를 열람할 권한이 없습니다
            </p>
            <p className="mt-1.5 text-xs break-keep text-[#6C7389]">
              결재 문서는 원본 프로젝트의 스텝 열람 권한을 따릅니다. 해당
              프로젝트 참여자로 초대되어야 볼 수 있어요.
            </p>
          </div>
        )}

        {preview.kind === 'unsupported' && (
          <p className="text-center text-xs break-keep text-[#6C7389]">
            이 형식은 미리보기를 지원하지 않습니다. 다운로드해서 확인해주세요.
          </p>
        )}

        {preview.kind === 'failed' && (
          <p
            role="alert"
            className="text-center text-xs break-keep text-[#E7000B]"
          >
            {preview.message}
          </p>
        )}
      </div>

      <p
        role="alert"
        className="shrink-0 px-5 pb-3 text-xs break-keep text-[#E7000B] empty:hidden"
      >
        {downloadError}
      </p>
    </Modal>
  );
}
