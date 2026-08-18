'use client';

import dynamic from 'next/dynamic';
import { useParams } from 'next/navigation';
import { useEffect, useState } from 'react';

import ModalLoadingFallback from '@/components/ModalLoadingFallback';
import Pagination, { PaginationPlaceholder } from '@/components/Pagination';
import { notifyToast } from '@/components/Toast';
import {
  getProjectTrashImages,
  permanentlyDeleteImages,
  restoreImages,
} from '@/features/block/api';
import {
  projectImageAltText,
  type ImagePage,
  type TrashImage,
} from '@/features/block/types';
import { isAbortError, messageOf } from '@/lib/api';
import { formatDateTime } from '@/lib/format';
import { useModal } from '@/lib/useModal';

import { ProjectImagesSkeleton } from './ProjectOverviewSkeletons';

const loadPermanentDeleteModal = () =>
  import('@/features/block/PermanentDeleteImagesModal');
const PermanentDeleteImagesModal = dynamic(loadPermanentDeleteModal, {
  loading: () => <ModalLoadingFallback title="영구 삭제" />,
});

/** 한 판에 20장 — 모아보기와 같은 수로 맞춘다 */
const PAGE_SIZE = 20;

// 휴지통 — 이미지. (명세 109·110·111번)
// 문서 휴지통과 조작 방식이 다르다 — 복구·영구 삭제 API 가 다건(imgIds[])이라
// 건별 버튼 대신 선택 후 일괄 처리로 둔다. 한 장만 고르면 그대로 한 건 처리다.
// 응답에 imgBlockId 가 없어 어느 블록의 것인지 알 수 없다 — 묶지 않고 삭제 시각순으로만 늘어놓는다.
// 복구·영구 삭제는 낙관적으로 처리한다 — 고른 것을 화면에서 먼저 빼고 요청은 뒤에서 보낸다.
// 끝나면 토스트로 알리고, 실패하면 뺀 것을 되돌린다.
// 복구는 이미지가 속한 스텝별로 권한을 본다. 보낸 것이 다 돌아오지 않을 수 있어,
// 응답이 오면 돌아오지 않은 것만 목록에 되살린다.
// 2026-08-18 부터 한 판 20장씩 받는다 (109번 page·size) — 선택·복구·영구 삭제는 그 판 안에서만
// 이뤄지고, 처리 뒤에는 뒷장이 빈자리를 메우도록 그 장을 다시 읽는다.
// blockDeleted 는 블록째 지워져 딸려 들어온 이미지다 — 문서 휴지통과 같은 뱃지로 표시한다.
export default function TrashImages() {
  const params = useParams<{ id: string }>();
  const projectId = params.id;

  /*
   * 보고 있는 페이지 번호(0-base)에 프로젝트를 묶어 둔다 —
   * 경로가 바뀌면 값이 어긋나 저절로 첫 장으로 돌아간다.
   */
  const [pageOf, setPageOf] = useState({ projectId, page: 0 });
  const page = pageOf.projectId === projectId ? pageOf.page : 0;

  /**
   * 어느 프로젝트 · 어느 장의 응답인지 함께 담는다.
   * `projectId` 가 어긋나면 남의 휴지통이라 버리고, `key` 만 어긋나면 이전 장이라
   * 새 장이 올 때까지 그대로 두고 페이지 줄만 잠근다.
   */
  const [loaded, setLoaded] = useState<{
    key: string;
    projectId: string;
    imagePage: ImagePage<TrashImage>;
  } | null>(null);
  const [failedProjectId, setFailedProjectId] = useState<string | null>(null);
  const [reloadCount, setReloadCount] = useState(0);

  /** 고른 것은 **이 페이지 안에서만** 센다 — 장을 넘기면 비운다 */
  const [selectedIds, setSelectedIds] = useState<Set<number>>(new Set());

  const deleteModal = useModal();

  /** 무엇을 받아야 하는지 — 다시 읽기(reloadCount)까지 담아 이 값 하나로 요청을 돌린다 */
  const requestKey = `${projectId} ${page} ${reloadCount}`;

  useEffect(() => {
    const controller = new AbortController();
    const { signal } = controller;

    getProjectTrashImages(projectId, { page, size: PAGE_SIZE }, signal)
      .then((imagePage) => {
        /*
         * 영구 삭제로 마지막 장이 통째로 비면 서버가 빈 목록을 준다 —
         * 있던 자리를 고집하지 않고 마지막 장으로 물러선다.
         */
        if (page > 0 && page >= imagePage.totalPages) {
          setPageOf({ projectId, page: Math.max(imagePage.totalPages - 1, 0) });
          return;
        }

        setLoaded({ key: requestKey, projectId, imagePage });
        setFailedProjectId((failed) => (failed === projectId ? null : failed));
      })
      .catch((caught) => {
        if (!isAbortError(caught)) setFailedProjectId(projectId);
      });

    return () => controller.abort();
  }, [projectId, page, requestKey]);

  const imagePage = loaded?.projectId === projectId ? loaded.imagePage : null;
  const images = imagePage?.images ?? null;
  /** 지금 조건의 응답이 아직 안 왔다 — 보이는 것은 이전 장이다 */
  const isPending = loaded?.key !== requestKey;
  const hasFailed = failedProjectId === projectId;

  /** 장을 넘긴다 — 선택은 이 페이지의 것이라 함께 비운다 */
  function goToPage(next: number) {
    setPageOf({ projectId, page: next });
    setSelectedIds(new Set());
  }

  function toggle(imgId: number) {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (!next.delete(imgId)) next.add(imgId);
      return next;
    });
  }

  // 고른 것을 화면에서 뺀다 — 되돌릴 수 있게 뺀 항목을 그대로 돌려준다.
  // of 는 요청을 시작한 시점의 projectId 다. 낙관적 처리라 응답이 늦게 오는데,
  // 그 사이 다른 프로젝트로 옮겨 갔으면 지금 목록은 남의 휴지통이다.
  function takeSelected(of: string) {
    const taken = images?.filter((image) => selectedIds.has(image.imgId)) ?? [];

    setLoaded((prev) =>
      prev === null || prev.projectId !== of
        ? prev
        : {
            ...prev,
            imagePage: {
              ...prev.imagePage,
              images: prev.imagePage.images.filter(
                (image) => !selectedIds.has(image.imgId),
              ),
              // 총 장수도 함께 줄인다 — 머리의 숫자가 목록보다 늦게 따라오면 어긋나 보인다
              totalElements: Math.max(
                prev.imagePage.totalElements - taken.length,
                0,
              ),
            },
          },
    );
    setSelectedIds(new Set());

    return taken;
  }

  // 되돌리기 — 삭제 시각 내림차순 자리를 지킨다.
  // 순번으로 끼워 넣으면 그 사이 다른 요청이 목록을 바꿨을 때 자리가 어긋난다.
  // 프로젝트를 확인하지 않으면 남의 이미지가 이 휴지통에 꽂힌다 — 그 상태로
  // 복구·영구 삭제까지 누를 수 있어 되돌리기가 조회보다 위험하다.
  function putBack(of: string, taken: TrashImage[]) {
    if (taken.length === 0) return;

    setLoaded((prev) => {
      if (prev === null || prev.projectId !== of) return prev;

      const known = new Set(prev.imagePage.images.map((image) => image.imgId));
      const missing = taken.filter((image) => !known.has(image.imgId));
      const restored = [...prev.imagePage.images, ...missing];
      restored.sort((left, right) =>
        left.deletedAt === right.deletedAt
          ? 0
          : left.deletedAt < right.deletedAt
            ? 1
            : -1,
      );

      return {
        ...prev,
        imagePage: {
          ...prev.imagePage,
          images: restored,
          totalElements: prev.imagePage.totalElements + missing.length,
        },
      };
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

        // 권한을 스텝별로 보므로 돌아오지 않은 것은 아직 휴지통에 있다
        const rejected = taken.filter((image) => !restoredIds.has(image.imgId));
        putBack(of, rejected);

        notifyToast(
          rejected.length === 0
            ? `이미지 ${restored.length}장을 복구했습니다.`
            : `${taken.length}장 중 ${restored.length}장을 복구했습니다. 나머지는 편집 권한이 없는 스텝의 이미지입니다.`,
          rejected.length === 0 ? 'success' : 'error',
        );

        /*
         * 페이징이라 목록에서 뺀 자리를 뒷장의 이미지가 메워야 한다 —
         * 다시 읽지 않으면 이 장만 20장보다 짧게 남는다.
         */
        if (of === projectId) setReloadCount((count) => count + 1);
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
         * 응답이 null 이라 몇 장이 실제로 지워졌는지 알 수 없다.
         * 화면에서 뺀 것은 예상일 뿐이라, 성공하면 서버 상태로 맞춘다.
         * (복구는 응답 images[] 가 결과를 알려 줘서 다시 읽지 않는다)
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

  // 첫 판을 받는 중 — 페이지 줄 자리까지 잡아 둔다
  if (!imagePage) {
    return (
      <div className="flex flex-col gap-3">
        <ProjectImagesSkeleton />
        <div className="overflow-hidden rounded-base border border-border-default bg-bg-card">
          <PaginationPlaceholder />
        </div>
      </div>
    );
  }

  const pageImages = imagePage.images;
  /** 전체 선택은 **이 페이지** 기준이다 — 다른 장의 이미지는 손대지 않는다 */
  const areAllSelected =
    pageImages.length > 0 &&
    pageImages.every((image) => selectedIds.has(image.imgId));

  return (
    <div className="flex flex-col gap-3">
      {pageImages.length > 0 && (
        <div className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-border-default bg-bg-card px-3 py-2">
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() =>
                setSelectedIds(
                  areAllSelected
                    ? new Set()
                    : new Set(pageImages.map((image) => image.imgId)),
                )
              }
              className="cursor-pointer rounded-button-sm px-2 py-1 text-detail font-medium text-text-primary-blue hover:bg-blue-bg-soft"
            >
              {/*
                여러 장으로 나뉘면 `전체 선택` 이 휴지통 전부로 읽힌다 —
                실제로는 지금 페이지만 고르므로 라벨에 범위를 적는다.
              */}
              {areAllSelected
                ? '전체 해제'
                : imagePage.totalPages > 1
                  ? '이 페이지 전체 선택'
                  : '전체 선택'}
            </button>
            <span className="text-caption text-text-secondary">
              {selectedIds.size > 0
                ? `${selectedIds.size}장 선택`
                : `총 ${imagePage.totalElements}장 — 복구하거나 지울 이미지를 고르세요`}
            </span>
          </div>

          <div className="flex items-center gap-1.5">
            <button
              type="button"
              onClick={restore}
              disabled={selectedIds.size === 0}
              className="cursor-pointer rounded-button-md border border-border-primary px-2.5 py-1 text-caption font-medium text-text-primary-blue hover:bg-blue-bg-soft disabled:cursor-not-allowed disabled:opacity-40"
            >
              복구
            </button>
            <button
              type="button"
              onPointerEnter={() => void loadPermanentDeleteModal()}
              onFocus={() => void loadPermanentDeleteModal()}
              onClick={deleteModal.open}
              disabled={selectedIds.size === 0}
              className="cursor-pointer rounded-button-md border border-red-border px-2.5 py-1 text-caption font-medium text-text-danger hover:bg-red-bg-soft disabled:cursor-not-allowed disabled:opacity-40"
            >
              영구 삭제
            </button>
          </div>
        </div>
      )}

      {pageImages.length === 0 ? (
        <p className="rounded-lg border border-dashed border-border-default px-4 py-12 text-center text-label text-text-secondary">
          휴지통에 이미지가 없습니다.
        </p>
      ) : (
        <ul className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5">
          {pageImages.map((image) => {
            const isSelected = selectedIds.has(image.imgId);

            return (
              <li key={image.imgId}>
                {/*
                  타일 전체가 선택 토글이다 — 휴지통에서 할 수 있는 일은 고르는 것뿐이라
                  체크박스만 눌러야 하면 목표가 작아 답답하다.
                */}
                <label
                  className={`flex h-full cursor-pointer flex-col overflow-hidden rounded-base border bg-bg-card transition-colors ${
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
                    {/*
                      블록째 지워져 딸려 들어온 이미지 — 문서 휴지통과 같은 말로 적는다.
                      체크박스 반대쪽 위에 얹는다 (아래 두 줄은 캡션 자리라 침범하면 행이 어긋난다).
                      바탕이 사진이라 반투명 카드색 + 테두리로 글자를 띄운다.
                    */}
                    {image.blockDeleted && (
                      <span
                        title="블록이 삭제돼 이미지만 남아 있습니다"
                        className="absolute top-2 right-2 rounded-button-sm border border-border-default bg-bg-card/90 px-1.5 py-0.5 text-micro font-medium text-text-secondary"
                      >
                        블록 삭제됨
                      </span>
                    )}
                  </span>

                  {/* 캡션이 있든 없든 두 줄 자리를 잡아 둔다 — 그리드 행이 어긋나지 않게 */}
                  <span className="flex h-11 flex-col justify-center gap-0.5 px-2.5 py-1.5">
                    <span className="truncate text-caption font-medium text-text-primary">
                      {image.caption || image.originalName}
                    </span>
                    <span className="font-mono text-micro text-text-secondary">
                      {formatDateTime(image.deletedAt)} 삭제
                    </span>
                  </span>
                </label>
              </li>
            );
          })}
        </ul>
      )}

      {/* 빈 휴지통에는 넘길 장이 없다 */}
      {imagePage.totalElements > 0 && (
        <div className="overflow-hidden rounded-base border border-border-default bg-bg-card">
          <Pagination
            page={imagePage.page}
            totalPages={imagePage.totalPages}
            // 응답이 도는 동안 잠근다 — 늦게 온 장이 화면을 덮으면 선택과 목록이 어긋난다
            disabled={isPending}
            onChange={goToPage}
          />
        </div>
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
