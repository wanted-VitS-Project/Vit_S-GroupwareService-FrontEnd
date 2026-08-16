'use client';

import dynamic from 'next/dynamic';
import { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';

import { AlertDialogTwoButton, DialogIcons } from '@/components/AlertDialog';
import Modal from '@/components/Modal';
import ModalLoadingFallback from '@/components/ModalLoadingFallback';
import { notifyToast } from '@/components/Toast';
import {
  downloadVersion,
  getBlockFiles,
  renameFile,
} from '@/features/file/api';
import { isFileVersionConflict } from '@/features/file/errorCodes';
import { preloadPdfViewer } from '@/features/file/pdfViewer';
import {
  cancelPreviewPrefetch,
  schedulePreviewPrefetch,
} from '@/features/file/previewCache';
import {
  extensionLabel,
  extensionStyle,
  formatFileSize,
} from '@/features/file/format';
import type { BlockFile, BlockFilesResponse } from '@/features/file/types';
import { FILE_NAME_MAX_LENGTH } from '@/features/file/types';
import {
  DuplicateNameError,
  uploadFile,
  type UploadStage,
} from '@/features/file/upload';
import { messageOf } from '@/lib/api';
import { useModalTarget } from '@/lib/useModal';

import BlockCard from './BlockCard';
import { FileListSkeleton } from './BlockSkeletons';
import type { StepBlock } from './types';

/**
 * 뷰어는 pdfjs 를 끌고 오므로 초기 번들에서 분리한다.
 * 문서 목록에 마우스를 올리는 순간 `preloadPdfViewer` 가 먼저 받아 두기 때문에
 * 실제로 열 때는 이미 캐시에 있다.
 */
const FileViewerModal = dynamic(
  () => import('@/features/file/FileViewerModal'),
  { ssr: false, loading: () => <FileViewerFallback /> },
);
const loadDuplicateNameModal = () =>
  import('@/features/file/DuplicateNameModal');
const loadTrashFileModal = () => import('@/features/file/TrashFileModal');
const DuplicateNameModal = dynamic(loadDuplicateNameModal, {
  loading: () => <ModalLoadingFallback title="같은 이름의 문서 확인" />,
});
const TrashFileModal = dynamic(loadTrashFileModal, {
  loading: () => <ModalLoadingFallback title="휴지통으로 이동" />,
});

function preloadFileModals() {
  preloadViewer();
  void loadTrashFileModal();
}

/**
 * 청크가 아직 도착하지 않았을 때의 자리.
 *
 * `loading` 을 넘기지 않으면 `next/dynamic` 이 `null` 을 그려서, 문서를 눌러도
 * **아무 반응이 없는 것처럼** 보인다. hover 프리로드가 대부분 앞서 끝내지만
 * 바로 클릭했거나 회선이 느리면 이 화면이 잠깐 뜬다.
 */
function FileViewerFallback() {
  return (
    <Modal
      title="문서 보기"
      className="flex h-[85vh] w-full max-w-[820px] flex-col overflow-hidden rounded-base border border-border-default shadow-2xl"
    >
      <div
        role="status"
        aria-label="문서 뷰어를 불러오는 중입니다"
        className="flex min-h-0 flex-1 justify-center bg-bg-surface p-6"
      >
        <div
          aria-hidden
          className="h-[600px] w-full max-w-[576px] animate-pulse rounded-button-sm border border-border-default bg-bg-card shadow-sm"
        />
      </div>
    </Modal>
  );
}

/** 프리로드는 한 번이면 된다 */
let isViewerPreloaded = false;

/** 문서 목록에 마우스가 닿는 순간 뷰어 청크 · pdf.js 워커를 미리 받는다 */
function preloadViewer() {
  if (isViewerPreloaded) return;
  isViewerPreloaded = true;

  void import('@/features/file/FileViewerModal').catch(() => {});
  preloadPdfViewer();
}

/** 업로드가 끊긴 지점별 안내 — 사용자가 다음에 뭘 할지 알 수 있게 나눈다 */
const STAGE_HINT: Record<UploadStage, string> = {
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
    ? STAGE_HINT[stage as UploadStage]
    : '';
}

/**
 * 문서 업로드 블록.
 *
 * 목록은 `blockId` 로 바로 조회한다 — 체크리스트 · 텍스트와 달리 `detail` 의
 * 상세 ID 가 필요하지 않다. 편집 버튼 노출은 응답의 `canEdit` 을 따른다.
 *
 * ⚠️ **휴지통 복구 · 영구 삭제**는 다음 작업 범위다 (휴지통 화면 목업 대기).
 *    휴지통으로 보내는 것과 뷰어 · 미리보기는 이 컴포넌트에서 이미 지원한다.
 */
export default function FileBlock({ block }: { block: StepBlock }) {
  const [loaded, setLoaded] = useState<BlockFilesResponse | null>(null);
  const [hasFailed, setHasFailed] = useState(false);
  const [reloadCount, setReloadCount] = useState(0);

  const [isUploading, setIsUploading] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [editingFileId, setEditingFileId] = useState<number | null>(null);
  const [editingName, setEditingName] = useState('');
  /** 뷰어로 열어둔 문서 */
  const viewerModal = useModalTarget<BlockFile>();
  const trashModal = useModalTarget<BlockFile>();
  /**
   * 동명 문서 확인 대기 — 고른 대로 같은 파일을 다시 올린다.
   * `sameNameFileId` 가 있으면 그 문서의 **새 버전**으로 올리는 길도 함께 연다.
   */
  const duplicateModal = useModalTarget<{
    file: File;
    message: string;
    sameNameFileId?: number;
  }>();
  /** 이름 저장이 409 로 막힘 — 덮어쓸지 다시 불러올지 묻는다 */
  const renameConflictModal = useModalTarget<{
    file: BlockFile;
    name: string;
  }>();

  const pickerRef = useRef<HTMLInputElement>(null);
  /** 새 버전을 올릴 대상. 비어 있으면 새 문서 */
  const versionTargetId = useRef<number | undefined>(undefined);

  useEffect(() => {
    const controller = new AbortController();
    const { signal } = controller;

    getBlockFiles(block.blockId, { signal })
      .then((data) => {
        setLoaded(data);
        setHasFailed(false);
      })
      .catch(() => {
        if (!signal.aborted) setHasFailed(true);
      });

    return () => controller.abort();
  }, [block.blockId, reloadCount]);

  const files = loaded?.content ?? null;
  const canEdit = loaded?.canEdit ?? false;
  // 지역 상수로 받아야 JSX 안에서 `null` 이 아님이 좁혀진다
  const duplicatePending = duplicateModal.target;
  const renamePending = renameConflictModal.target;

  function reload() {
    setReloadCount((count) => count + 1);
  }

  function pickFile(fileId?: number) {
    void loadDuplicateNameModal();
    versionTargetId.current = fileId;
    setErrorMessage('');
    pickerRef.current?.click();
  }

  /**
   * 이름이 겹치는 문서를 **하나로 특정**되면 그 `fileId`, 아니면 `undefined`.
   *
   * 표시명(`name`)은 확장자를 뗀 원본명이 기본값이라 그것부터 맞춰 보고,
   * 이름을 바꾼 문서까지 잡으려고 원본 파일명도 함께 본다.
   * ⚠️ 후보가 둘 이상이면 **어디에 얹을지 고를 수 없다** — 그때는 새 버전 길을 열지 않는다.
   */
  function sameNameFileIdOf(uploaded: File) {
    const baseName = uploaded.name.replace(/\.[^.]+$/, '');
    const matched = (files ?? []).filter(
      (item) =>
        item.name === baseName || item.originalFileName === uploaded.name,
    );

    return matched.length === 1 ? matched[0].fileId : undefined;
  }

  async function upload(file: File, allowDuplicateName?: boolean) {
    /**
     * ⚠️ 대상은 **시작할 때 고정한다.** `await` 뒤에 `versionTargetId.current` 를 다시 읽으면,
     *    업로드 중 다른 문서의 `새 버전` 을 누른 경우 요청과 안내가 서로 다른 것을 가리킨다.
     */
    const targetFileId = versionTargetId.current;

    setIsUploading(true);
    setErrorMessage('');

    try {
      await uploadFile({
        blockId: block.blockId,
        file,
        fileId: targetFileId,
        allowDuplicateName,
      });
      reload();
      notifyToast(
        targetFileId === undefined
          ? `${file.name} 을(를) 올렸습니다.`
          : `${file.name} 을(를) 새 버전으로 올렸습니다.`,
      );
    } catch (caught) {
      if (caught instanceof DuplicateNameError) {
        // 확인을 받은 뒤 같은 파일로 한 번만 다시 올린다. 아직 실패가 아니라 토스트를 띄우지 않는다
        duplicateModal.open({
          file,
          message: caught.message,
          /*
           * 새 버전은 **새 문서로 올리려다 막힌 경우**에만 권한다.
           * 이미 특정 문서의 새 버전을 올리는 중이었다면 409 의 원인이 다른 데 있다 —
           * 여기서 또 새 버전을 권하면 같은 실패를 반복시킨다.
           */
          sameNameFileId:
            targetFileId === undefined ? sameNameFileIdOf(file) : undefined,
        });
      } else {
        const message =
          caught instanceof Error
            ? caught.message + stageHintOf(caught)
            : '업로드에 실패했습니다.';

        setErrorMessage(message);
        /*
          업로드는 오래 걸려 그 사이 다른 블록을 보고 있을 수 있다 —
          카드 안 문구만으로는 결과가 닿지 않는다.
        */
        notifyToast(message, 'error');
      }
    } finally {
      setIsUploading(false);
      // 같은 파일을 다시 고를 수 있게 값을 비운다
      if (pickerRef.current) pickerRef.current.value = '';
    }
  }

  /**
   * 문서명 저장. **낙관적 락**이라 `version` 을 실어 보낸다 (2026-08-11).
   *
   * 409 면 조용히 삼키지 않고 **재조회 / 덮어쓰기**를 묻는다 — 이름은 짧아도
   * 남이 방금 고친 이름을 되돌려 놓으면 원인을 찾기 어렵다.
   */
  async function saveName(
    file: BlockFile,
    name: string,
    overwrite = false,
  ): Promise<void> {
    // 버전 없이 보내면 400 이다 — 요청하지 않고 재조회를 안내한다
    if (file.version === undefined) {
      setErrorMessage(
        '문서의 버전 정보를 받지 못해 이름을 바꿀 수 없습니다. 새로고침해주세요.',
      );
      return;
    }

    try {
      await renameFile(file.fileId, {
        name,
        version: file.version,
        ...(overwrite ? { overwrite: true } : {}),
      });
      reload();
    } catch (caught) {
      if (isFileVersionConflict(caught)) {
        renameConflictModal.open({ file, name });
        return;
      }
      setErrorMessage(messageOf(caught, '문서명을 바꾸지 못했습니다.'));
    }
  }

  function requestSaveName(file: BlockFile) {
    const name = editingName.trim();
    setEditingFileId(null);

    if (!name || name === file.name) return;

    void saveName(file, name);
  }

  return (
    <BlockCard block={block}>
      <div className="flex h-full flex-col gap-2">
        <input
          ref={pickerRef}
          type="file"
          aria-label="문서 파일 선택"
          className="hidden"
          onChange={(event) => {
            const file = event.target.files?.[0];
            if (file) upload(file);
          }}
        />

        <div className="min-h-0 flex-1 overflow-y-auto">
          {hasFailed ? (
            <div className="flex flex-col items-center gap-2 py-6">
              <p className="text-caption text-text-secondary">
                문서를 불러오지 못했습니다.
              </p>
              <button
                type="button"
                onClick={reload}
                className="cursor-pointer rounded-button-md border border-border-default px-2.5 py-1 text-caption font-medium text-text-primary-blue hover:bg-blue-bg-soft"
              >
                다시 시도
              </button>
            </div>
          ) : !files ? (
            <FileListSkeleton />
          ) : files.length === 0 ? (
            <p className="py-6 text-center text-caption text-text-muted">
              등록된 문서가 없습니다.
            </p>
          ) : (
            // 열기 직전 신호 — 여기서 뷰어 청크·pdf.js 워커를 미리 받아 둔다
            <ul
              onPointerEnter={preloadFileModals}
              className="flex flex-col gap-1"
            >
              {files.map((file) => (
                <FileRow
                  key={file.fileId}
                  file={file}
                  canEdit={canEdit}
                  isEditing={editingFileId === file.fileId}
                  editingName={editingName}
                  onEditingNameChange={setEditingName}
                  onStartRename={() => {
                    setEditingFileId(file.fileId);
                    setEditingName(file.name);
                  }}
                  onCancelRename={() => setEditingFileId(null)}
                  onSaveName={() => requestSaveName(file)}
                  onOpen={() => viewerModal.open(file)}
                  onDownload={() =>
                    downloadVersion(file.latestVersionId).catch((caught) =>
                      setErrorMessage(
                        messageOf(caught, '다운로드에 실패했습니다.'),
                      ),
                    )
                  }
                  onAddVersion={() => pickFile(file.fileId)}
                  isUploading={isUploading}
                  onTrash={() => trashModal.open(file)}
                />
              ))}
            </ul>
          )}
        </div>

        {errorMessage && (
          <p role="alert" className="text-micro break-keep text-text-danger">
            {errorMessage}
          </p>
        )}

        <div className="flex items-center justify-between gap-2 border-t border-border-default pt-1">
          <span className="min-w-0 truncate text-micro text-text-secondary">
            {files ? `${files.length}개 문서` : '—'}
          </span>

          {canEdit && (
            <button
              type="button"
              onClick={() => pickFile()}
              disabled={isUploading}
              className="flex shrink-0 cursor-pointer items-center gap-1 rounded-button-md px-2 py-0.5 text-caption font-medium text-text-primary-blue hover:bg-blue-bg-soft disabled:cursor-not-allowed disabled:opacity-40"
            >
              <PlusIcon />
              {isUploading ? '올리는 중…' : '새 문서 추가'}
            </button>
          )}
        </div>
      </div>

      {viewerModal.target && (
        <FileViewerModal
          file={viewerModal.target}
          onClose={viewerModal.close}
        />
      )}

      {trashModal.target && (
        <TrashFileModal
          fileId={trashModal.target.fileId}
          fileName={trashModal.target.name}
          onClose={trashModal.close}
          onTrashed={reload}
        />
      )}

      {duplicatePending && (
        <DuplicateNameModal
          fileName={duplicatePending.file.name}
          message={duplicatePending.message}
          canAddVersion={duplicatePending.sameNameFileId !== undefined}
          onCancel={duplicateModal.close}
          onAddVersion={() => {
            const { file, sameNameFileId } = duplicatePending;
            duplicateModal.close();
            // 대상을 그 문서로 바꿔 다시 올린다 — 새 버전이라 동명 확인은 필요 없다
            versionTargetId.current = sameNameFileId;
            void upload(file);
          }}
          onConfirm={() => {
            duplicateModal.close();
            // 모달이 떠 있는 사이 다른 행의 `새 버전` 이 눌렸을 수 있다 — 새 문서로 못 박는다
            versionTargetId.current = undefined;
            void upload(duplicatePending.file, true);
          }}
        />
      )}

      {renamePending && (
        /* 취소(= Esc · 배경 클릭)를 **다시 불러오기**에 둔다 — 잘못 눌러도 남의 이름이 안 지워진다 */
        <AlertDialogTwoButton
          icon={DialogIcons.warning}
          title="다른 사람이 먼저 저장했습니다"
          description={`그 사이 이 문서가 수정됐습니다. '${renamePending.name}' 로 덮어쓰거나, 최신 내용을 다시 불러올 수 있습니다.`}
          confirmLabel="덮어쓰기"
          cancelLabel="다시 불러오기"
          isDanger
          onConfirm={() => {
            renameConflictModal.close();
            void saveName(renamePending.file, renamePending.name, true);
          }}
          onCancel={() => {
            renameConflictModal.close();
            reload();
          }}
        />
      )}
    </BlockCard>
  );
}

interface FileRowProps {
  file: BlockFile;
  canEdit: boolean;
  isEditing: boolean;
  editingName: string;
  onEditingNameChange: (name: string) => void;
  onStartRename: () => void;
  onCancelRename: () => void;
  onSaveName: () => void;
  /** 문서 뷰어 열기 — 버전 이력은 뷰어 안에서 토글한다 */
  onOpen: () => void;
  onDownload: () => void;
  onAddVersion: () => void;
  /** 업로드가 도는 동안은 새 버전 올리기를 막는다 — 대상이 덮여 두 요청이 겹친다 */
  isUploading: boolean;
  onTrash: () => void;
}

function FileRow({
  file,
  canEdit,
  isEditing,
  editingName,
  onEditingNameChange,
  onStartRename,
  onCancelRename,
  onSaveName,
  onOpen,
  onDownload,
  onAddVersion,
  isUploading,
  onTrash,
}: FileRowProps) {
  const style = extensionStyle(file.extension);

  return (
    <li
      /*
        미리보기 fetch 는 서버가 원본을 잘라 주느라 느리다. 행에 머무는 동안
        미리 시작해 두면 클릭이 그 요청을 이어받는다.
        뷰어가 여는 버전과 같은 `latestVersionId` 를 미리 받아야 의미가 있다.
      */
      onPointerEnter={() => schedulePreviewPrefetch(file.latestVersionId)}
      onPointerLeave={cancelPreviewPrefetch}
      className="group/file relative flex items-start gap-2 rounded-lg p-1.5 hover:bg-bg-surface"
    >
      {/* 셀 전체가 뷰어 진입점. 버튼만 위로 올려 클릭을 가로챈다 */}
      {!isEditing && (
        <button
          type="button"
          aria-label={`${file.name} 문서 보기`}
          onClick={onOpen}
          className="absolute inset-0 cursor-pointer rounded-lg"
        />
      )}

      <span
        aria-hidden
        style={{ color: style.text, backgroundColor: style.background }}
        className="pointer-events-none relative flex size-7 shrink-0 items-center justify-center rounded-button-sm"
      >
        <DocumentIcon />
      </span>

      <div className="pointer-events-none relative min-w-0 flex-1">
        <div className="flex items-center gap-1">
          {isEditing ? (
            <input
              autoFocus
              aria-label={`${file.name} 문서명 수정`}
              value={editingName}
              maxLength={FILE_NAME_MAX_LENGTH}
              onChange={(event) => onEditingNameChange(event.target.value)}
              onBlur={onSaveName}
              onKeyDown={(event) => {
                if (event.key === 'Enter') onSaveName();
                if (event.key === 'Escape') onCancelRename();
              }}
              className="pointer-events-auto min-w-0 flex-1 rounded-button-sm border border-border-primary px-1 text-detail text-text-primary outline-none"
            />
          ) : (
            <span className="min-w-0 truncate text-detail font-semibold text-text-primary">
              {file.name}
            </span>
          )}

          <span
            style={{ color: style.text, backgroundColor: style.background }}
            className="shrink-0 rounded-button-sm px-1 py-0.5 font-mono text-[8px] font-semibold"
          >
            {extensionLabel(file.extension)}
          </span>

          {/* v1 도 표기한다 — 버전이 하나뿐인 문서도 차수가 보여야 한다 */}
          <span
            title={`버전 ${file.versionCount}개`}
            className="shrink-0 rounded-button-sm bg-blue-bg-soft px-1 py-0.5 font-mono text-[8px] font-semibold text-text-primary-blue"
          >
            v{file.latestVersionNo}
          </span>
        </div>

        <p className="mt-0.5 truncate text-micro text-text-secondary">
          {file.uploaderDepartment} · {file.uploaderPosition}{' '}
          {file.uploaderName}
        </p>
        <p className="font-mono text-micro text-text-secondary">
          {file.updatedAt.slice(0, 10).replaceAll('-', '.')} ·{' '}
          {formatFileSize(file.sizeBytes)}
        </p>
      </div>

      {/* 호버 · 포커스 전에는 자리만 차지한다 — 나타날 때 레이아웃이 밀리지 않는다 */}
      <div className="pointer-events-auto relative flex shrink-0 items-center gap-0.5 opacity-0 group-focus-within/file:opacity-100 group-hover/file:opacity-100">
        <IconButton label={`${file.name} 다운로드`} onClick={onDownload}>
          <DownloadIcon />
        </IconButton>
        {canEdit && (
          <>
            <IconButton
              label={`${file.name} 새 버전 올리기`}
              onClick={onAddVersion}
              disabled={isUploading}
            >
              <UploadIcon />
            </IconButton>
            <FileRowMenu
              fileName={file.name}
              onStartRename={onStartRename}
              onTrash={onTrash}
            />
          </>
        )}
      </div>
    </li>
  );
}

/**
 * 문서 행의 아이콘 버튼.
 * 기본색은 모두 같고, 자기 위에 마우스를 올렸을 때만 강조색이 된다.
 *
 * ⚠️ 크기는 **셋이 함께 움직인다** (다운로드 · 새 버전 · `⋯`) — 하나만 키우면 줄이 어긋난다.
 *    24px 은 겨냥하기 좁아 28px 로 둔다 (행 높이는 문서명 · 메타 3줄이 정해 그대로다).
 */
const ICON_BUTTON_CLASS =
  'flex size-7 cursor-pointer items-center justify-center rounded-button-md text-text-secondary hover:bg-bg-card hover:text-text-primary-blue';

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
      className={`${ICON_BUTTON_CLASS} disabled:cursor-not-allowed disabled:opacity-40`}
    >
      {children}
    </button>
  );
}

/** 메뉴 크기 — 화면 밖으로 나가는지 판단할 때 쓴다 */
const MENU_WIDTH = 128;
const MENU_HEIGHT = 64;

/**
 * 문서 행의 `⋯` 메뉴.
 * 보기 · 다운로드 · 버전 이력 · 새 버전은 아이콘 버튼이 맡고,
 * 여기에는 버튼으로 노출하지 않는 편집 동작만 남긴다.
 *
 * ⚠️ 문서 목록이 `overflow-y-auto` 라 블록 안에서 그리면 메뉴가 잘린다.
 *    `document.body` 로 포털을 띄우고 트리거 위치를 재서 `fixed` 로 붙인다.
 */
function FileRowMenu({
  fileName,
  onStartRename,
  onTrash,
}: {
  fileName: string;
  onStartRename: () => void;
  onTrash: () => void;
}) {
  /** 열린 위치. null 이면 닫힌 상태다 */
  const [position, setPosition] = useState<{
    top: number;
    left: number;
  } | null>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const menuRef = useRef<HTMLSpanElement>(null);
  const isOpen = position !== null;

  function close() {
    setPosition(null);
    triggerRef.current?.focus();
  }

  /**
   * 포털이라 메뉴가 DOM 맨 뒤에 놓인다 — 트리거에서 Tab 을 눌러도 메뉴로 가지 않는다.
   * 열릴 때 첫 항목으로 직접 옮겨줘야 키보드로 도달할 수 있다.
   * (닫을 때 트리거로 되돌리는 것은 `close()` 가 한다)
   */
  useEffect(() => {
    if (!isOpen) return;
    menuRef.current?.querySelector('button')?.focus();
  }, [isOpen]);

  function toggle() {
    if (isOpen) {
      close();
      return;
    }

    const rect = triggerRef.current?.getBoundingClientRect();
    if (!rect) return;

    // 아래 공간이 부족하면 위로 뒤집는다
    const openUpward = rect.bottom + MENU_HEIGHT + 8 > window.innerHeight;

    setPosition({
      top: openUpward ? rect.top - MENU_HEIGHT - 4 : rect.bottom + 4,
      // 오른쪽 끝을 트리거에 맞추되 화면 왼쪽으로 넘어가지 않게 한다
      left: Math.max(8, rect.right - MENU_WIDTH),
    });
  }

  // 스크롤 · 리사이즈로 트리거가 움직이면 좌표가 어긋난다 — 따라가지 않고 닫는다
  useEffect(() => {
    if (!isOpen) return;

    function dismiss() {
      setPosition(null);
    }

    window.addEventListener('scroll', dismiss, true);
    window.addEventListener('resize', dismiss);

    return () => {
      window.removeEventListener('scroll', dismiss, true);
      window.removeEventListener('resize', dismiss);
    };
  }, [isOpen]);

  function run(action: () => void) {
    close();
    action();
  }

  return (
    <span
      className="relative shrink-0"
      onKeyDown={(event) => {
        if (event.key !== 'Escape' || !isOpen) return;
        event.stopPropagation();
        close();
      }}
    >
      <button
        ref={triggerRef}
        type="button"
        aria-label={`${fileName} 메뉴`}
        aria-haspopup="menu"
        aria-expanded={isOpen}
        onClick={toggle}
        className={ICON_BUTTON_CLASS}
      >
        <MoreIcon />
      </button>

      {position &&
        createPortal(
          <>
            <button
              type="button"
              tabIndex={-1}
              aria-label="메뉴 닫기"
              onClick={() => setPosition(null)}
              className="fixed inset-0 z-40 cursor-default"
            />
            <span
              ref={menuRef}
              role="menu"
              style={{ top: position.top, left: position.left }}
              className="fixed z-50 flex w-32 flex-col overflow-hidden rounded-lg border border-border-default bg-bg-card shadow-lg"
            >
              <MenuItem onClick={() => run(onStartRename)}>이름 수정</MenuItem>
              <MenuItem danger onClick={() => run(onTrash)}>
                휴지통으로 이동
              </MenuItem>
            </span>
          </>,
          document.body,
        )}
    </span>
  );
}

function MenuItem({
  danger = false,
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
      role="menuitem"
      onClick={onClick}
      className={`cursor-pointer px-2.5 py-1.5 text-left text-caption font-medium ${
        danger
          ? 'text-text-danger hover:bg-red-bg-soft'
          : 'text-text-primary hover:bg-bg-surface'
      }`}
    >
      {children}
    </button>
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

function DownloadIcon() {
  return (
    <Glyph>
      <path d="M4 20h16" />
      <path d="M12 4v11" />
      <path d="m7.5 10.5 4.5 4.5 4.5-4.5" />
    </Glyph>
  );
}

function UploadIcon() {
  return (
    <Glyph>
      <path d="M4 20h16" />
      <path d="M12 15V4" />
      <path d="m7.5 8.5 4.5-4.5 4.5 4.5" />
    </Glyph>
  );
}

/** 행에서 쓰는 선 아이콘 공통 껍데기 (다운로드 · 새 버전) */
function Glyph({
  className = 'size-4 shrink-0',
  children,
}: {
  className?: string;
  children: React.ReactNode;
}) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
      className={className}
    >
      {children}
    </svg>
  );
}

function PlusIcon() {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      aria-hidden
      className="size-3 shrink-0"
    >
      <path d="M12 5v14M5 12h14" />
    </svg>
  );
}

function MoreIcon() {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="currentColor"
      aria-hidden
      // 점 세 개라 같은 크기여도 선 아이콘보다 작아 보인다 — 한 단계 덜 줄인다
      className="size-3.5"
    >
      <circle cx="5" cy="12" r="1.6" />
      <circle cx="12" cy="12" r="1.6" />
      <circle cx="19" cy="12" r="1.6" />
    </svg>
  );
}
