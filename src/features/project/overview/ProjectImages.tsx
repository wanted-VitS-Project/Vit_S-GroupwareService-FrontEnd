'use client';

// CSR - 프로젝트 이미지 모아보기: 블록에 흩어진 이미지를 한 판에 모아 크게 볼 수 있게 한다.
import dynamic from 'next/dynamic';
import { useParams } from 'next/navigation';
import { memo, useMemo, useEffect, useState } from 'react';

import Pagination, { PaginationPlaceholder } from '@/components/Pagination';
import { getProjectImages } from '@/features/block/api';
import {
  projectImageAltText,
  type ImagePage,
  type ProjectImage,
} from '@/features/block/types';
import { isAbortError } from '@/lib/api';
import { formatDate } from '@/lib/format';
import { useModalTarget } from '@/lib/useModal';

import { ProjectImagesSkeleton } from './ProjectOverviewSkeletons';
import {
  imageBlockLabel,
  readImageBlockNames,
  useImageBlockNames,
} from './useImageBlockNames';

// 크게 보기는 별도 청크로 뺀다 — 목록만 훑고 나가는 사용자가 Modal 까지 받을 이유가 없다.
// 타일에 마우스가 닿으면 미리 받아 두므로 실제로 열 때는 이미 캐시에 있다.
const loadLightbox = () => import('./ProjectImageLightbox');
const ProjectImageLightbox = dynamic(loadLightbox);

/** 한 판에 20장 — xl 그리드(5열) 기준 딱 4줄이다 */
const PAGE_SIZE = 20;

// 프로젝트 이미지 모아보기. (명세 107번)
// 응답에 스텝 정보도 orderIndex 도 없다 — 아는 것은 imgBlockId 뿐이다.
// 그래서 문서함처럼 스텝 → 블록 트리로 접지 못하고 블록 단위 묶음까지만 만든다.
// 블록 제목도 오지 않아 머리에는 블록 #3 처럼 ID 로만 적는다.
// 조회 전용이다. 등록·캡션 수정·삭제는 이미지 블록(스텝 화면)에서 한다.
// 2026-08-18 부터 한 판 20장씩 받는다 (107번 page·size) — 블록 묶음도 그 판 안에서만 만든다.
export default function ProjectImages() {
  const params = useParams<{ id: string }>();
  const projectId = params.id;

  /*
   * 보고 있는 장(0-base)에 프로젝트를 함께 묶어 둔다 — 경로가 바뀌면 값이 어긋나
   * 저절로 첫 장으로 돌아간다. 3페이지에서 다른 프로젝트로 넘어가면 없는 장을 부른다.
   * 효과 안에서 되돌리지 않으므로 `react-hooks/set-state-in-effect` 에 걸리지 않는다.
   */
  const [pageOf, setPageOf] = useState({ projectId, page: 0 });
  const page = pageOf.projectId === projectId ? pageOf.page : 0;

  /**
   * 어느 프로젝트 · 어느 장의 응답인지 함께 담는다.
   * `projectId` 가 어긋나면 남의 목록이라 버리고, `key` 만 어긋나면 **같은 프로젝트의
   * 이전 장**이라 새 장이 올 때까지 그대로 두고 페이지 줄만 잠근다 —
   * 넘길 때마다 통째로 뼈대로 바뀌면 그리드가 접혔다 펴져 화면이 튄다.
   */
  const [loaded, setLoaded] = useState<{
    key: string;
    projectId: string;
    imagePage: ImagePage<ProjectImage>;
  } | null>(null);
  const [failedProjectId, setFailedProjectId] = useState<string | null>(null);
  const [reloadCount, setReloadCount] = useState(0);
  /** 블록으로 묶어 볼지 — 기본은 최신순 한 줄 흐름이다 */
  const [groupByBlock, setGroupByBlock] = useState(false);

  const lightbox = useModalTarget<ProjectImage>();

  /** 무엇을 받아야 하는지 — 다시 읽기(reloadCount)까지 담아 이 값 하나로 요청을 돌린다 */
  const requestKey = `${projectId} ${page} ${reloadCount}`;

  useEffect(() => {
    const controller = new AbortController();
    const { signal } = controller;

    getProjectImages(projectId, { page, size: PAGE_SIZE }, signal)
      .then((imagePage) => {
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

  /*
   * 블록 이름은 두 갈래로 얻는다.
   *
   * 1. 응답에 실려 오면 그대로 쓴다 — 백엔드에 요청해 둔 blockTitle·stepId ·
   *    stepName 이 배포되면 이 길로 붙고, 아래 N+1 조회는 켜지지 않는다.
   * 2. 아직 안 오면 스텝마다 블록 목록을 불러 모은다 (요청이 스텝 수만큼 늘어난다).
   *    그래서 이름을 실제로 쓰는 순간(블록별 보기·크게 보기)에만 켠다.
   */
  const embeddedNames = useMemo(
    () => (images ? readImageBlockNames(images) : null),
    [images],
  );
  const fetchedNames = useImageBlockNames(
    projectId,
    embeddedNames === null && (groupByBlock || lightbox.target !== null),
  );
  const blockNames = embeddedNames ?? fetchedNames;

  // 블록 묶음은 이름이 늦게 도착해도 그대로다 — 목록이 바뀔 때만 다시 만든다
  const blocks = useMemo(
    () => (images ? groupImagesByBlock(images) : []),
    [images],
  );

  if (hasFailed) {
    return (
      <div className="flex flex-col items-center gap-3 rounded-lg border border-dashed border-border-default px-4 py-12">
        <p className="text-label text-text-secondary">
          이미지를 불러오지 못했습니다.
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

  // 첫 판을 받는 중 — 페이지 줄 자리까지 잡아 둬야 결과가 올 때 아래가 밀리지 않는다
  if (!imagePage) {
    return (
      <div className="flex flex-col gap-4">
        <ProjectImagesSkeleton />
        <div className="overflow-hidden rounded-base border border-border-default bg-bg-card">
          <PaginationPlaceholder />
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <h2 className="text-body-m font-semibold text-text-primary">
            이미지
          </h2>
          <span className="rounded-pill bg-bg-hover px-2 py-0.5 text-caption text-text-secondary">
            총 {imagePage.totalElements}장
          </span>
          {/* 묶음은 지금 페이지 안에서만 만든다 — 같은 블록의 이미지가 여러 장에 걸칠 수 있다 */}
          <span className="text-caption text-text-secondary">
            이 페이지 블록 {blocks.length}개
          </span>
        </div>
        {/*
          이 버튼에는 `aria-pressed` 를 걸지 않는다 — 라벨이 **지금 상태가 아니라 다음 동작**이라
          (`블록별로 보기` 를 누르면 묶인다) 눌림 여부를 실으면 "전체 보기, 눌림" 처럼
          뜻이 뒤집혀 읽힌다. 상태를 말하려면 라벨부터 상태로 바꿔야 한다.
        */}
        {imagePage.images.length > 0 && (
          <button
            type="button"
            onClick={() => setGroupByBlock((grouped) => !grouped)}
            className="cursor-pointer rounded-button-sm px-2 py-1 text-detail font-medium text-text-primary-blue hover:bg-blue-bg-soft"
          >
            {groupByBlock ? '전체 보기' : '블록별로 보기'}
          </button>
        )}
      </div>

      {imagePage.images.length === 0 ? (
        <p className="rounded-lg border border-dashed border-border-default px-4 py-12 text-center text-label text-text-secondary">
          등록된 이미지가 없습니다.
        </p>
      ) : groupByBlock ? (
        blocks.map((block) => (
          <section
            key={block.imgBlockId}
            className="flex flex-col gap-2.5 rounded-base border border-border-default bg-bg-card p-4"
          >
            <div className="flex flex-wrap items-center gap-2">
              {/* 제목이 107번 응답에 없어 스텝 블록 목록에서 모아 온 이름이다 */}
              <h3 className="text-detail font-semibold text-text-primary">
                {imageBlockLabel(block.imgBlockId, blockNames)}
              </h3>
              {blockNames?.get(block.imgBlockId)?.stepName && (
                <span className="rounded-pill bg-bg-hover px-2 py-0.5 text-micro text-text-secondary">
                  {blockNames.get(block.imgBlockId)?.stepName}
                </span>
              )}
              <span className="text-caption text-text-secondary">
                {block.images.length}장
              </span>
            </div>
            <ImageGrid images={block.images} onOpen={lightbox.open} />
          </section>
        ))
      ) : (
        <ImageGrid images={imagePage.images} onOpen={lightbox.open} />
      )}

      {/* 빈 화면에는 넘길 장이 없다 — 페이지 줄도 두지 않는다 */}
      {imagePage.totalElements > 0 && (
        <div className="overflow-hidden rounded-base border border-border-default bg-bg-card">
          <Pagination
            page={imagePage.page}
            totalPages={imagePage.totalPages}
            // 응답이 도는 동안 잠근다 — 연달아 누르면 늦게 온 장이 화면을 덮는다
            disabled={isPending}
            onChange={(next) => setPageOf({ projectId, page: next })}
          />
        </div>
      )}

      {lightbox.target && (
        <ProjectImageLightbox
          image={lightbox.target}
          blockName={blockNames?.get(lightbox.target.imgBlockId) ?? null}
          onClose={lightbox.close}
        />
      )}
    </div>
  );
}

// 정사각 타일 그리드 — 캡션 줄은 항상 자리를 잡아 둔다.
// memo — 블록별로 보기 를 켜고 끌 때 다른 묶음의 타일까지 다시 그리지 않는다.
const ImageGrid = memo(function ImageGrid({
  images,
  onOpen,
}: {
  images: ProjectImage[];
  onOpen: (image: ProjectImage) => void;
}) {
  return (
    <ul
      // 열기 직전 신호 — 크게 보기 청크를 미리 받아 둔다
      onPointerEnter={() => void loadLightbox()}
      className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5"
    >
      {images.map((image) => (
        <li key={image.imgId}>
          <button
            type="button"
            onClick={() => onOpen(image)}
            aria-label={`${projectImageAltText(image)} 크게 보기`}
            className="w-full cursor-pointer overflow-hidden rounded-base border border-border-default bg-bg-card text-left transition-[border-color,box-shadow] hover:border-border-primary/40 hover:shadow-sm focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-border-primary"
          >
            <span className="flex aspect-square items-center justify-center overflow-hidden bg-bg-surface">
              {/* eslint-disable-next-line @next/next/no-img-element -- 저장소(S3) 도메인이 확정되지 않아 next/image 원격 패턴을 걸 수 없다 */}
              <img
                src={image.imageUrl}
                alt={projectImageAltText(image)}
                loading="lazy"
                className="size-full object-cover"
              />
            </span>
            {/*
              캡션이 있든 없든 두 줄 자리를 잡아 둔다 —
              조건부로 그리면 캡션이 있는 타일만 길어져 그리드 행이 어긋난다.
            */}
            <span className="flex h-11 flex-col justify-center gap-0.5 px-2.5 py-1.5">
              <span className="truncate text-caption font-medium text-text-primary">
                {image.caption || image.originalName}
              </span>
              <span className="font-mono text-micro text-text-secondary">
                {formatDate(image.createdAt)}
              </span>
            </span>
          </button>
        </li>
      ))}
    </ul>
  );
});

/** 블록 단위로 묶는다. 응답 순서를 그대로 유지한다 */
function groupImagesByBlock(images: ProjectImage[]) {
  const blocks = new Map<
    number,
    { imgBlockId: number; images: ProjectImage[] }
  >();

  for (const image of images) {
    let block = blocks.get(image.imgBlockId);
    if (!block) {
      block = { imgBlockId: image.imgBlockId, images: [] };
      blocks.set(image.imgBlockId, block);
    }
    block.images.push(image);
  }

  return [...blocks.values()];
}
