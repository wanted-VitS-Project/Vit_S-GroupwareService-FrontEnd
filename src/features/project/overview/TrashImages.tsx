'use client';

import dynamic from 'next/dynamic';
import { useParams } from 'next/navigation';
import { useEffect, useState } from 'react';

import ModalLoadingFallback from '@/components/ModalLoadingFallback';
import { notifyToast } from '@/components/Toast';
import {
  getProjectTrashImages,
  permanentlyDeleteImages,
  restoreImages,
} from '@/features/block/api';
import { projectImageAltText, type TrashImage } from '@/features/block/types';
import { isAbortError, messageOf } from '@/lib/api';
import { formatDateTime } from '@/lib/format';
import { useModal } from '@/lib/useModal';

import { ProjectImagesSkeleton } from './ProjectOverviewSkeletons';

const loadPermanentDeleteModal = () =>
  import('@/features/block/PermanentDeleteImagesModal');
const PermanentDeleteImagesModal = dynamic(loadPermanentDeleteModal, {
  loading: () => <ModalLoadingFallback title="영구 삭제" />,
});

/**
 * 휴지통 — 이미지. (명세 109 · 110 · 111번)
 *
 * 문서 휴지통과 조작 방식이 다르다 — **복구 · 영구 삭제 API 가 다건**(`imgIds[]`)이라
 * 건별 버튼 대신 **선택 후 일괄 처리**로 둔다. 한 장만 고르면 그대로 한 건 처리다.
 *
 * ⚠️ 응답에 `imgBlockId` 가 없어 어느 블록의 것인지 알 수 없다 — 묶지 않고 삭제 시각순으로만 늘어놓는다.
 * 복구 · 영구 삭제는 **낙관적으로 처리한다** — 고른 것을 화면에서 먼저 빼고 요청은 뒤에서 보낸다.
 * 끝나면 토스트로 알리고, 실패하면 뺀 것을 되돌린다.
 *
 * ⚠️ 복구는 **이미지가 속한 스텝별로** 권한을 본다. 보낸 것이 다 돌아오지 않을 수 있어,
 *    응답이 오면 **돌아오지 않은 것만 목록에 되살린다.**
 */
export default function TrashImages() {
  const params = useParams<{ id: string }>();
  const projectId = params.id;

  /** 어느 프로젝트의 응답인지 함께 담는다 — 경로가 바뀌면 즉시 무효가 된다 */
  const [loaded, setLoaded] = useState<{
    projectId: string;
    images: TrashImage[];
  } | null>(null);
  const [failedProjectId, setFailedProjectId] = useState<string | null>(null);
  const [reloadCount, setReloadCount] = useState(0);

  const [selectedIds, setSelectedIds] = useState<Set<number>>(new Set());

  const deleteModal = useModal();

  useEffect(() => {
    const controller = new AbortController();
    const { signal } = controller;

    getProjectTrashImages(projectId, signal)
      .then((images) => {
        setLoaded({ projectId, images });
        setFailedProjectId((failed) => (failed === projectId ? null : failed));
      })
      .catch((caught) => {
        if (!isAbortError(caught)) setFailedProjectId(projectId);
      });

    return () => controller.abort();
  }, [projectId, reloadCount]);

  const images = loaded?.projectId === projectId ? loaded.images : null;
  const hasFailed = failedProjectId === projectId;

  function toggle(imgId: number) {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (!next.delete(imgId)) next.add(imgId);
      return next;
    });
  }

  /**
   * 고른 것을 화면에서 뺀다 — 되돌릴 수 있게 뺀 항목을 그대로 돌려준다.
   *
   * `of` 는 **요청을 시작한 시점**의 `projectId` 다. 낙관적 처리라 응답이 늦게 오는데,
   * 그 사이 다른 프로젝트로 옮겨 갔으면 지금 목록은 남의 휴지통이다.
   */
  function takeSelected(of: string) {
    const taken = images?.filter((image) => selectedIds.has(image.imgId)) ?? [];

    setLoaded((prev) =>
      prev === null || prev.projectId !== of
        ? prev
        : {
            ...prev,
            images: prev.images.filter(
              (image) => !selectedIds.has(image.imgId),
            ),
          },
    );
    setSelectedIds(new Set());

    return taken;
  }

  /**
   * 되돌리기 — 삭제 시각 내림차순 자리를 지킨다.
   * 순번으로 끼워 넣으면 그 사이 다른 요청이 목록을 바꿨을 때 자리가 어긋난다.
   *
   * ⚠️ 프로젝트를 확인하지 않으면 **남의 이미지가 이 휴지통에 꽂힌다** — 그 상태로
   *    복구 · 영구 삭제까지 누를 수 있어 되돌리기가 조회보다 위험하다.
   */
  function putBack(of: string, taken: TrashImage[]) {
    if (taken.length === 0) return;

    setLoaded((prev) => {
      if (prev === null || prev.projectId !== of) return prev;

      const known = new Set(prev.images.map((image) => image.imgId));
      const restored = [
        ...prev.images,
        ...taken.filter((image) => !known.has(image.imgId)),
      ];
      restored.sort((left, right) =>
        left.deletedAt === right.deletedAt
          ? 0
          : left.deletedAt < right.deletedAt
            ? 1
            : -1,
      );

      return { ...prev, images: restored };
    });
  }

  /** 복구 — 화면에서 먼저 빼고 요청은 뒤에서 보낸다 */
  function restore() {
    if (selectedIds.size === 0) return;

    // 응답이 늦게 와도 이 요청이 어느 프로젝트의 것인지 잃지 않게 지금 값을 잡아 둔다
    const of = projectId;
    const taken = takeSelected(of);

    void restoreImages(taken.map((image) => image.imgId))
      .then((restored) => {
        const restoredIds = new Set(restored.map((image) => image.imgId));

        // 권한을 스텝별로 보므로 **돌아오지 않은 것**은 아직 휴지통에 있다
        const rejected = taken.filter((image) => !restoredIds.has(image.imgId));
        putBack(of, rejected);

        notifyToast(
          rejected.length === 0
            ? `이미지 ${restored.length}장을 복구했습니다.`
            : `${taken.length}장 중 ${restored.length}장을 복구했습니다. 나머지는 편집 권한이 없는 스텝의 이미지입니다.`,
          rejected.length === 0 ? 'success' : 'error',
        );
      })
      .catch((caught) => {
        putBack(of, taken);
        notifyToast(
          messageOf(caught, '이미지를 복구하지 못했습니다.'),
          'error',
        );
      });
  }

  /** 영구 삭제 — 확인 모달이 닫힌 뒤 뒤에서 돈다 */
  function permanentlyDelete() {
    if (selectedIds.size === 0) return;

    const of = projectId;
    const taken = takeSelected(of);

    void permanentlyDeleteImages(taken.map((image) => image.imgId))
      .then(() => {
        notifyToast(`이미지 ${taken.length}장을 영구 삭제했습니다.`);
        /*
         * 응답이 `null` 이라 **몇 장이 실제로 지워졌는지 알 수 없다.**
         * 화면에서 뺀 것은 예상일 뿐이라, 성공하면 서버 상태로 맞춘다.
         * (복구는 응답 `images[]` 가 결과를 알려 줘서 다시 읽지 않는다)
         */
        if (of === projectId) setReloadCount((count) => count + 1);
      })
      .catch((caught) => {
        putBack(of, taken);
        notifyToast(
          messageOf(caught, '이미지를 영구 삭제하지 못했습니다.'),
          'error',
        );
      });
  }

  if (hasFailed) {
    return (
      <div className="flex flex-col items-center gap-3 rounded-lg border border-dashed border-border-default px-4 py-12">
        <p className="text-xs text-text-secondary">
          휴지통을 불러오지 못했습니다.
        </p>
        <button
          type="button"
          onClick={() => {
            setFailedProjectId(null);
            setReloadCount((count) => count + 1);
          }}
          className="cursor-pointer rounded px-2 py-1 text-[11px] font-medium text-text-primary-blue hover:bg-blue-bg-soft"
        >
          다시 시도
        </button>
      </div>
    );
  }

  if (!images) return <ProjectImagesSkeleton />;

  const areAllSelected =
    images.length > 0 && images.every((image) => selectedIds.has(image.imgId));

  return (
    <div className="flex flex-col gap-3">
      {images.length > 0 && (
        <div className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-border-default bg-white px-3 py-2">
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() =>
                setSelectedIds(
                  areAllSelected
                    ? new Set()
                    : new Set(images.map((image) => image.imgId)),
                )
              }
              className="cursor-pointer rounded px-2 py-1 text-[11px] font-medium text-text-primary-blue hover:bg-blue-bg-soft"
            >
              {areAllSelected ? '전체 해제' : '전체 선택'}
            </button>
            <span className="text-[10px] text-text-secondary">
              {selectedIds.size > 0
                ? `${selectedIds.size}장 선택`
                : '복구하거나 지울 이미지를 고르세요'}
            </span>
          </div>

          <div className="flex items-center gap-1.5">
            <button
              type="button"
              onClick={restore}
              disabled={selectedIds.size === 0}
              className="cursor-pointer rounded-md border border-border-primary px-2.5 py-1 text-[10px] font-medium text-text-primary-blue hover:bg-blue-bg-soft disabled:cursor-not-allowed disabled:opacity-40"
            >
              복구
            </button>
            <button
              type="button"
              onPointerEnter={() => void loadPermanentDeleteModal()}
              onFocus={() => void loadPermanentDeleteModal()}
              onClick={deleteModal.open}
              disabled={selectedIds.size === 0}
              className="cursor-pointer rounded-md border border-red-border px-2.5 py-1 text-[10px] font-medium text-text-danger hover:bg-red-bg-soft disabled:cursor-not-allowed disabled:opacity-40"
            >
              영구 삭제
            </button>
          </div>
        </div>
      )}

      {images.length === 0 ? (
        <p className="rounded-lg border border-dashed border-border-default px-4 py-12 text-center text-xs text-text-secondary">
          휴지통에 이미지가 없습니다.
        </p>
      ) : (
        <ul className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5">
          {images.map((image) => {
            const isSelected = selectedIds.has(image.imgId);

            return (
              <li key={image.imgId}>
                {/*
                  타일 전체가 선택 토글이다 — 휴지통에서 할 수 있는 일은 고르는 것뿐이라
                  체크박스만 눌러야 하면 목표가 작아 답답하다.
                */}
                <label
                  className={`flex h-full cursor-pointer flex-col overflow-hidden rounded-xl border bg-white transition-colors ${
                    isSelected
                      ? 'border-border-primary ring-2 ring-border-primary/30'
                      : 'border-border-default hover:border-border-primary/40'
                  }`}
                >
                  <span className="relative flex aspect-square items-center justify-center overflow-hidden bg-bg-surface">
                    {/* eslint-disable-next-line @next/next/no-img-element -- 저장소(S3) 도메인이 확정되지 않아 next/image 원격 패턴을 걸 수 없다 */}
                    <img
                      src={image.imageUrl}
                      alt={projectImageAltText(image)}
                      loading="lazy"
                      // 지워진 것이라는 사실이 한눈에 보이도록 살짝 흐리게 둔다
                      className={`size-full object-cover ${
                        isSelected ? '' : 'opacity-70'
                      }`}
                    />
                    <input
                      type="checkbox"
                      checked={isSelected}
                      onChange={() => toggle(image.imgId)}
                      aria-label={`${projectImageAltText(image)} 선택`}
                      className="absolute top-2 left-2 size-4 cursor-pointer accent-btn-primary"
                    />
                  </span>

                  {/* 캡션이 있든 없든 두 줄 자리를 잡아 둔다 — 그리드 행이 어긋나지 않게 */}
                  <span className="flex h-11 flex-col justify-center gap-0.5 px-2.5 py-1.5">
                    <span className="truncate text-[10px] font-medium text-text-primary">
                      {image.caption || image.originalName}
                    </span>
                    <span className="font-mono text-[9px] text-text-secondary">
                      {formatDateTime(image.deletedAt)} 삭제
                    </span>
                  </span>
                </label>
              </li>
            );
          })}
        </ul>
      )}

      {deleteModal.isOpen && (
        <PermanentDeleteImagesModal
          count={selectedIds.size}
          onClose={deleteModal.close}
          // 확인만 받고 요청은 여기서 뒤에 돌린다 — 모달은 곧바로 닫힌다
          onConfirm={permanentlyDelete}
        />
      )}
    </div>
  );
}
