'use client';

import dynamic from 'next/dynamic';
import { useParams } from 'next/navigation';
import { useEffect, useState } from 'react';

import ModalLoadingFallback from '@/components/ModalLoadingFallback';
import { notifyToast } from '@/components/Toast';
import {
  getProjectTrashFiles,
  permanentlyDeleteFile,
  restoreFile,
} from '@/features/file/api';
import {
  extensionLabel,
  extensionStyle,
  formatFileSize,
} from '@/features/file/format';
import type { ProjectTrashFile } from '@/features/file/types';
import { isAbortError, messageOf } from '@/lib/api';
import { formatDateTime } from '@/lib/format';
import { useModalTarget } from '@/lib/useModal';

import { ProjectFilesSkeleton } from './ProjectOverviewSkeletons';

const loadPermanentDeleteModal = () =>
  import('@/features/file/PermanentDeleteFileModal');
const PermanentDeleteFileModal = dynamic(loadPermanentDeleteModal, {
  loading: () => <ModalLoadingFallback title="영구 삭제" />,
});

/**
 * 휴지통 — 문서. (명세 106 · 103 · 104번)
 *
 * 문서함(105번)과 달리 **스텝 → 블록 트리로 묶지 않는다.**
 * 휴지통에서 찾는 기준은 위치가 아니라 "언제 지웠나" 라서 서버도 `deletedAt` 내림차순으로 준다 —
 * 위치는 각 행에 한 줄로 붙여 두면 충분하다.
 *
 * ⚠️ 복구는 **블록이 삭제됐어도** 된다. 그때는 문서만 살아나므로 그 사실을 알려야 한다.
 *
 * 복구 · 영구 삭제는 **낙관적으로 처리한다** — 목록에서 먼저 빼고 요청은 뒤에서 보낸다.
 * 되돌릴 수 없는 동작이지만 확인 모달(영구 삭제) · 명시적 버튼(복구)에서 이미 뜻을 물었고,
 * 여러 건을 잇달아 정리하는 화면이라 매번 응답을 기다리면 손이 멎는다.
 * 끝났는지는 토스트로 알리고, 실패하면 **목록의 원래 자리로 되돌린다.**
 */
export default function TrashFiles() {
  const params = useParams<{ id: string }>();
  const projectId = params.id;

  /** 어느 프로젝트의 응답인지 함께 담는다 — 경로가 바뀌면 즉시 무효가 된다 */
  const [loaded, setLoaded] = useState<{
    projectId: string;
    files: ProjectTrashFile[];
  } | null>(null);
  const [failedProjectId, setFailedProjectId] = useState<string | null>(null);
  const [reloadCount, setReloadCount] = useState(0);

  /** 되돌릴 자리를 알아야 해서 목록에서의 순번도 함께 든다 */
  const deleteModal = useModalTarget<{
    file: ProjectTrashFile;
    index: number;
  }>();

  useEffect(() => {
    const controller = new AbortController();
    const { signal } = controller;

    getProjectTrashFiles(projectId, signal)
      .then((files) => {
        setLoaded({ projectId, files });
        setFailedProjectId((failed) => (failed === projectId ? null : failed));
      })
      .catch((caught) => {
        if (!isAbortError(caught)) setFailedProjectId(projectId);
      });

    return () => controller.abort();
  }, [projectId, reloadCount]);

  const files = loaded?.projectId === projectId ? loaded.files : null;
  const hasFailed = failedProjectId === projectId;

  /**
   * 목록을 통째로 다시 읽지 않고 한 건만 뺀다 — 스크롤 자리를 지킨다.
   *
   * ⚠️ **어느 프로젝트의 목록인지 확인한다.** 낙관적 처리라 요청이 응답보다 먼저 끝나는데,
   *    그 사이 다른 프로젝트로 옮겨 갔으면 지금 화면은 남의 휴지통이다.
   *    `of` 는 **요청을 시작한 시점**의 `projectId` 다 (호출부가 클로저로 잡아 넘긴다).
   */
  function remove(of: string, fileId: number) {
    setLoaded((prev) =>
      prev === null || prev.projectId !== of
        ? prev
        : {
            ...prev,
            files: prev.files.filter((file) => file.fileId !== fileId),
          },
    );
  }

  /**
   * 실패했을 때 **원래 자리**로 되돌린다 — 맨 위로 올라오면 어디 있던 것인지 잃는다.
   * 되돌리기는 더 위험하다 — 프로젝트를 확인하지 않으면 **남의 문서가 이 휴지통에 꽂힌다.**
   */
  function restoreAt(of: string, file: ProjectTrashFile, index: number) {
    setLoaded((prev) => {
      if (prev === null || prev.projectId !== of) return prev;
      // 그 사이 목록을 다시 읽었으면 이미 들어 있다
      if (prev.files.some((current) => current.fileId === file.fileId)) {
        return prev;
      }

      const files = [...prev.files];
      files.splice(Math.min(index, files.length), 0, file);
      return { ...prev, files };
    });
  }

  /**
   * 복구 — 화면에서 먼저 빼고 요청은 뒤에서 보낸다.
   * `void` 로 띄워 두므로 사용자는 곧바로 다음 문서를 정리할 수 있다.
   */
  function restore(file: ProjectTrashFile, index: number) {
    // 응답이 늦게 와도 이 요청이 어느 프로젝트의 것인지 잃지 않게 지금 값을 잡아 둔다
    const of = projectId;
    remove(of, file.fileId);

    void restoreFile(file.fileId)
      .then((restored) => {
        notifyToast(
          restored.blockDeleted
            ? `${restored.name} — 블록이 삭제되어 문서함으로 복구했습니다.`
            : `${restored.name} 을(를) 복구했습니다.`,
        );
      })
      .catch((caught) => {
        restoreAt(of, file, index);
        notifyToast(
          `${file.name} — ${messageOf(caught, '복구하지 못했습니다.')}`,
          'error',
        );
      });
  }

  /** 영구 삭제 — 확인 문자를 받은 뒤 모달이 닫히고, 실제 요청은 여기서 뒤에 돈다 */
  function permanentlyDelete(
    file: ProjectTrashFile,
    index: number,
    request: Promise<unknown>,
  ) {
    const of = projectId;
    remove(of, file.fileId);

    void request
      .then(() => notifyToast(`${file.name} 을(를) 영구 삭제했습니다.`))
      .catch((caught) => {
        restoreAt(of, file, index);
        notifyToast(
          `${file.name} — ${messageOf(caught, '영구 삭제하지 못했습니다.')}`,
          'error',
        );
      });
  }

  if (hasFailed) {
    return (
      <div className="flex flex-col items-center gap-3 rounded-lg border border-dashed border-border-default px-4 py-12">
        <p className="text-label text-text-secondary">
          휴지통을 불러오지 못했습니다.
        </p>
        <button
          type="button"
          onClick={() => {
            setFailedProjectId(null);
            setReloadCount((count) => count + 1);
          }}
          className="cursor-pointer rounded-button-sm px-2 py-1 text-detail font-medium text-text-primary-blue hover:bg-blue-bg-soft"
        >
          다시 시도
        </button>
      </div>
    );
  }

  if (!files) return <ProjectFilesSkeleton />;

  /*
   * 렌더 시점의 대상을 지역 상수로 고정한다.
   * JSX 안에서 `deleteModal.target!` 로 단언하면, 콜백이 도는 시점에 이미 닫혔을
   * 가능성을 타입이 감춘다 — 조건부 렌더에 기대는 보장을 코드로 드러낸다.
   */
  const deleteTarget = deleteModal.target;

  return (
    <div className="flex flex-col gap-3">
      {files.length === 0 ? (
        <p className="rounded-lg border border-dashed border-border-default px-4 py-12 text-center text-label text-text-secondary">
          휴지통에 문서가 없습니다.
        </p>
      ) : (
        <ul className="flex flex-col gap-2">
          {files.map((file, index) => (
            <TrashFileRow
              key={file.fileId}
              file={file}
              onRestore={() => restore(file, index)}
              onPermanentDelete={() => deleteModal.open({ file, index })}
            />
          ))}
        </ul>
      )}

      {deleteTarget && (
        <PermanentDeleteFileModal
          fileName={deleteTarget.file.name}
          onClose={deleteModal.close}
          // 확인만 받고 요청은 여기서 뒤에 돌린다 — 모달은 곧바로 닫힌다
          onConfirm={(confirmText) =>
            permanentlyDelete(
              deleteTarget.file,
              deleteTarget.index,
              permanentlyDeleteFile(deleteTarget.file.fileId, confirmText),
            )
          }
        />
      )}
    </div>
  );
}

/** 휴지통 문서 한 줄 — 위치 · 삭제 시각 · 복구 · 영구 삭제 */
function TrashFileRow({
  file,
  onRestore,
  onPermanentDelete,
}: {
  file: ProjectTrashFile;
  onRestore: () => void;
  onPermanentDelete: () => void;
}) {
  const style = extensionStyle(file.extension);

  return (
    <li className="flex items-center gap-3 rounded-base border border-border-default bg-bg-card p-3">
      <span
        aria-hidden
        style={{ color: style.text, backgroundColor: style.background }}
        className="flex size-9 shrink-0 items-center justify-center rounded-button-sm opacity-60"
      >
        <DocumentIcon />
      </span>

      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-1">
          <span className="min-w-0 truncate text-detail font-semibold text-text-primary">
            {file.name}
          </span>
          <span
            style={{ color: style.text, backgroundColor: style.background }}
            className="shrink-0 rounded-button-sm px-1 py-0.5 font-mono text-[8px] font-semibold"
          >
            {extensionLabel(file.extension)}
          </span>
          {/*
            `v{n}` 으로 쓰지 않는다 — 휴지통 응답(106번)에는 `latestVersionNo` 가 없어
            `versionCount` 뿐이라, `v3` 이라고 적으면 **3차 버전**으로 읽힌다.
          */}
          <span className="shrink-0 rounded-button-sm bg-bg-hover px-1 py-0.5 text-[8px] font-semibold text-text-secondary">
            버전 {file.versionCount}개
          </span>
        </div>

        <p className="mt-0.5 truncate text-micro text-text-secondary">
          {file.stepName}
          {file.blockDeleted ? (
            <span className="ml-1 rounded-button-sm bg-bg-hover px-1 py-0.5 text-text-secondary">
              블록 삭제됨
            </span>
          ) : (
            ` · ${file.blockTitle || '제목 없는 블록'}`
          )}
        </p>
        <p className="font-mono text-micro text-text-secondary">
          {formatDateTime(file.deletedAt)} 삭제 ·{' '}
          {formatFileSize(file.sizeBytes)}
        </p>
      </div>

      <div className="flex shrink-0 items-center gap-1.5">
        <button
          type="button"
          onClick={onRestore}
          className="cursor-pointer rounded-button-md border border-border-primary px-2 py-1 text-caption font-medium text-text-primary-blue hover:bg-blue-bg-soft"
        >
          복구
        </button>
        <button
          type="button"
          onPointerEnter={() => void loadPermanentDeleteModal()}
          onFocus={() => void loadPermanentDeleteModal()}
          onClick={onPermanentDelete}
          className="cursor-pointer rounded-button-md border border-red-border px-2 py-1 text-caption font-medium text-text-danger hover:bg-red-bg-soft"
        >
          영구 삭제
        </button>
      </div>
    </li>
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
      className="size-4"
    >
      <path d="M14 3H7a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V8z" />
      <path d="M14 3v5h5" />
    </svg>
  );
}
