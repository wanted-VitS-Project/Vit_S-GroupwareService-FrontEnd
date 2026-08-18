'use client';

// CSR - 프로젝트 문서함: 전체 문서를 스텝 → 블록 트리로 훑는 조회 전용 화면.
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { memo, useCallback, useEffect, useMemo, useState } from 'react';

import { downloadVersion, getProjectFiles } from '@/features/file/api';
import {
  extensionLabel,
  extensionStyle,
  formatFileSize,
} from '@/features/file/format';
import {
  LazyFileViewerModal,
  preloadViewer,
} from '@/features/file/LazyFileViewer';
import {
  cancelPreviewPrefetch,
  schedulePreviewPrefetch,
} from '@/features/file/previewCache';
import type { ProjectFile } from '@/features/file/types';
import { isAbortError, messageOf } from '@/lib/api';
import { formatDate } from '@/lib/format';
import { useModalTarget } from '@/lib/useModal';

import { groupFilesByStep, type FileBlockGroup } from './groupFiles';
import { ProjectFilesSkeleton } from './ProjectOverviewSkeletons';
import StageSection from './StageSection';
import { groupByStage, useProjectStages } from './useProjectStages';

// 프로젝트 문서함 — 전체 문서를 스텝 → 블록 트리로 본다. (명세 105번)
// 조회 전용이다. 업로드·이름 수정·삭제는 문서가 붙은 블록(스텝 화면)에서 한다 —
// 문서함은 프로젝트를 가로질러 훑는 곳이라 여기서 고치면 어느 블록을 건드렸는지 잘 안 보인다.
// presigned 가 실려 오지 않아 다운로드는 누를 때 발급 API(42번)를 부른다.
export default function ProjectFiles() {
  const params = useParams<{ id: string }>();
  const projectId = params.id;

  /** 어느 프로젝트의 응답인지 함께 담는다 — 경로가 바뀌면 즉시 무효가 된다 */
  const [loaded, setLoaded] = useState<{
    projectId: string;
    files: ProjectFile[];
  } | null>(null);
  const [failedProjectId, setFailedProjectId] = useState<string | null>(null);
  const [reloadCount, setReloadCount] = useState(0);
  /** 다운로드 실패처럼 화면을 막지 않는 오류 */
  const [errorMessage, setErrorMessage] = useState('');

  /** 접어 둔 스텝. 기본이 펼침이라 닫은 것만 담는다 */
  const [closedStepIds, setClosedStepIds] = useState<Set<number>>(new Set());
  const viewerModal = useModalTarget<ProjectFile>();

  /*
   * 105번 응답에 stageId 가 없어 따로 읽는다. 실패해도 목록은 그대로 보인다.
   * 다만 판정이 끝나기 전에는 그리지 않는다 (isSettled) — 색인 없이 먼저 그리면
   * 스텝이 한 덩어리로 늘어섰다가 색인이 도착하는 순간 스테이지별로 다시 묶여
   * 제목이 끼어들고 높이가 바뀐다.
   */
  const { index: stageIndex, isSettled: isStageSettled } =
    useProjectStages(projectId);

  useEffect(() => {
    const controller = new AbortController();
    const { signal } = controller;

    getProjectFiles(projectId, signal)
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

  /*
   * 평면 목록 → 스텝/블록 트리 → 스테이지 묶음.
   * 접기·다운로드 실패처럼 목록과 무관한 렌더에서 전체를 다시 훑지 않게 기억해 둔다.
   */
  const steps = useMemo(() => (files ? groupFilesByStep(files) : []), [files]);
  const stageGroups = useMemo(
    () => groupByStage(steps, (step) => step.stepId, stageIndex),
    [steps, stageIndex],
  );

  /** 행마다 새 화살표 함수를 넘기면 memo(FileRow) 가 무력해진다 */
  const download = useCallback((file: ProjectFile) => {
    downloadVersion(file.latestVersionId)
      // 성공하면 지난 실패 문구를 지운다 — 남겨 두면 방금 성공한 동작을 실패로 오해한다
      .then(() => setErrorMessage(''))
      .catch((caught) =>
        setErrorMessage(messageOf(caught, '다운로드에 실패했습니다.')),
      );
  }, []);

  const toggleStep = useCallback((stepId: number) => {
    setClosedStepIds((prev) => {
      const next = new Set(prev);
      if (!next.delete(stepId)) next.add(stepId);
      return next;
    });
  }, []);

  if (hasFailed) {
    return (
      <div className="flex flex-col items-center gap-3 rounded-lg border border-dashed border-border-default px-4 py-12">
        <p className="text-label text-text-secondary">
          문서를 불러오지 못했습니다.
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

  // 스테이지 색인까지 기다렸다가 묶인 모습으로 한 번에 그린다
  if (!files || !isStageSettled) return <ProjectFilesSkeleton />;

  const areAllClosed = steps.every((step) => closedStepIds.has(step.stepId));

  return (
    <div
      className="flex flex-col gap-4"
      // 열기 직전 신호 — 여기서 뷰어 청크·pdf.js 워커를 미리 받아 둔다
      onPointerEnter={preloadViewer}
    >
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <h2 className="text-body-m font-semibold text-text-primary">
            문서함
          </h2>
          <span className="rounded-pill bg-bg-hover px-2 py-0.5 text-caption text-text-secondary">
            총 {files.length}개
          </span>
          <span className="text-caption text-text-secondary">
            스텝 {steps.length}개
          </span>
        </div>
        {steps.length > 0 && (
          <button
            type="button"
            onClick={() =>
              setClosedStepIds(
                areAllClosed
                  ? new Set()
                  : new Set(steps.map((step) => step.stepId)),
              )
            }
            className="cursor-pointer rounded-button-sm px-2 py-1 text-detail font-medium text-text-primary-blue hover:bg-blue-bg-soft"
          >
            {areAllClosed ? '모두 펼치기' : '모두 접기'}
          </button>
        )}
      </div>

      {errorMessage && (
        <p
          role="alert"
          className="rounded-lg border border-red-border bg-red-bg-soft px-3 py-2 text-caption text-text-danger"
        >
          {errorMessage}
        </p>
      )}

      {steps.length === 0 ? (
        <p className="rounded-lg border border-dashed border-border-default px-4 py-12 text-center text-label text-text-secondary">
          등록된 문서가 없습니다.
        </p>
      ) : (
        stageGroups.map((group) => (
          <StageSection
            key={group.stageId}
            name={group.name}
            count={group.items.reduce(
              (total, step) => total + step.fileCount,
              0,
            )}
            countLabel="개"
          >
            {group.items.map((step) => {
              const isOpen = !closedStepIds.has(step.stepId);

              return (
                <section
                  key={step.stepId}
                  className="overflow-hidden rounded-base border border-border-default bg-bg-card"
                >
                  <div className="flex items-center gap-3 px-4 py-3">
                    <button
                      type="button"
                      aria-expanded={isOpen}
                      onClick={() => toggleStep(step.stepId)}
                      className="flex min-w-0 flex-1 cursor-pointer items-center gap-2 text-left"
                    >
                      <ChevronIcon isOpen={isOpen} />
                      <span
                        className={`truncate text-detail font-semibold ${
                          isOpen
                            ? 'text-text-primary-blue'
                            : 'text-text-primary'
                        }`}
                      >
                        {step.stepName}
                      </span>
                      <span className="shrink-0 rounded-pill bg-bg-hover px-2 py-0.5 text-caption text-text-secondary">
                        {step.fileCount}개
                      </span>
                    </button>

                    <Link
                      href={`/projects/${projectId}/steps/${step.stepId}`}
                      className="shrink-0 rounded-button-sm px-2 py-1 text-detail font-medium text-text-secondary hover:bg-bg-surface hover:text-text-primary-blue"
                    >
                      스텝 열기
                    </Link>
                  </div>

                  {isOpen && (
                    <div className="flex flex-col gap-3 border-t border-border-default bg-bg-surface/60 p-3">
                      {step.blocks.map((block) => (
                        <BlockGroup
                          key={block.key}
                          block={block}
                          onOpen={viewerModal.open}
                          onDownload={download}
                        />
                      ))}
                    </div>
                  )}
                </section>
              );
            })}
          </StageSection>
        ))
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

// 블록 하나 — 제목 줄 + 그 아래 문서 목록.
// memo — 다른 스텝을 접었다 펼 때 이 블록의 문서 행까지 다시 그리지 않는다.
const BlockGroup = memo(function BlockGroup({
  block,
  onOpen,
  onDownload,
}: {
  block: FileBlockGroup<ProjectFile>;
  onOpen: (file: ProjectFile) => void;
  onDownload: (file: ProjectFile) => void;
}) {
  return (
    <div className="rounded-lg border border-border-default bg-bg-card p-2.5">
      <div className="mb-1.5 flex items-center gap-1.5 px-1">
        {block.blockDeleted ? (
          <>
            <span
              className="rounded-button-sm border border-border-default bg-bg-hover px-1.5 py-0.5 text-micro font-medium text-text-secondary"
              title="블록이 삭제돼 문서만 남아 있습니다"
            >
              블록 삭제됨
            </span>
            <span className="text-caption text-text-secondary">
              연결된 블록이 없는 문서
            </span>
          </>
        ) : (
          <span className="min-w-0 truncate text-detail font-semibold text-text-primary">
            {block.blockTitle || '제목 없는 블록'}
          </span>
        )}
        <span className="ml-auto shrink-0 text-micro text-text-secondary">
          {block.files.length}개
        </span>
      </div>

      <ul className="flex flex-col gap-1">
        {block.files.map((file) => (
          <FileRow
            key={file.fileId}
            file={file}
            onOpen={onOpen}
            onDownload={onDownload}
          />
        ))}
      </ul>
    </div>
  );
});

// 문서 한 줄 — 누르면 뷰어가 열린다 (조회 전용).
// memo 라서 콜백은 대상을 인자로 받는 고정 함수를 받는다.
const FileRow = memo(function FileRow({
  file,
  onOpen,
  onDownload,
}: {
  file: ProjectFile;
  onOpen: (file: ProjectFile) => void;
  onDownload: (file: ProjectFile) => void;
}) {
  const style = extensionStyle(file.extension);

  return (
    <li
      /*
        미리보기 fetch 는 서버가 원본을 잘라 주느라 느리다. 행에 머무는 동안
        미리 시작해 두면 클릭이 그 요청을 이어받는다.
      */
      onPointerEnter={() => schedulePreviewPrefetch(file.latestVersionId)}
      onPointerLeave={cancelPreviewPrefetch}
      className="group/file relative flex items-center gap-2.5 rounded-lg p-1.5 hover:bg-bg-surface"
    >
      {/* 행 전체가 뷰어 진입점. 버튼만 위로 올려 클릭을 가로챈다 */}
      <button
        type="button"
        aria-label={`${file.name} 문서 보기`}
        onClick={() => onOpen(file)}
        className="absolute inset-0 cursor-pointer rounded-lg"
      />

      <span
        aria-hidden
        style={{ color: style.text, backgroundColor: style.background }}
        className="pointer-events-none relative flex size-8 shrink-0 items-center justify-center rounded-button-sm"
      >
        <DocumentIcon />
      </span>

      <div className="pointer-events-none relative min-w-0 flex-1">
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
          {/* v1 도 표기한다 — 버전이 하나뿐인 문서도 차수가 보여야 한다 */}
          <span
            title={`버전 ${file.versionCount}개`}
            className="shrink-0 rounded-button-sm bg-blue-bg-soft px-1 py-0.5 font-mono text-[8px] font-semibold text-text-primary-blue"
          >
            v{file.latestVersionNo}
          </span>
        </div>
        <p className="mt-0.5 truncate text-micro text-text-secondary">
          {file.uploaderName} · {formatDate(file.updatedAt)} ·{' '}
          {formatFileSize(file.sizeBytes)}
        </p>
      </div>

      {/* 호버·포커스 전에는 자리만 차지한다 — 나타날 때 레이아웃이 밀리지 않는다 */}
      <div className="pointer-events-auto relative flex shrink-0 items-center opacity-0 group-focus-within/file:opacity-100 group-hover/file:opacity-100">
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
    </li>
  );
});

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
