'use client';

import dynamic from 'next/dynamic';
import { useParams } from 'next/navigation';
import { memo, useMemo, useEffect, useState } from 'react';

import { getProjectImages } from '@/features/block/api';
import { projectImageAltText, type ProjectImage } from '@/features/block/types';
import { isAbortError } from '@/lib/api';
import { formatDate } from '@/lib/format';
import { useModalTarget } from '@/lib/useModal';

import { ProjectImagesSkeleton } from './ProjectOverviewSkeletons';
import { imageBlockLabel, useImageBlockNames } from './useImageBlockNames';

/**
 * 크게 보기는 별도 청크로 뺀다 — 목록만 훑고 나가는 사용자가 `Modal` 까지 받을 이유가 없다.
 * 타일에 마우스가 닿으면 미리 받아 두므로 실제로 열 때는 이미 캐시에 있다.
 */
const loadLightbox = () => import('./ProjectImageLightbox');
const ProjectImageLightbox = dynamic(loadLightbox);

/**
 * 프로젝트 이미지 모아보기. (명세 107번)
 *
 * ⚠️ 응답에 **스텝 정보도 `orderIndex` 도 없다** — 아는 것은 `imgBlockId` 뿐이다.
 *    그래서 문서함처럼 스텝 → 블록 트리로 접지 못하고 **블록 단위 묶음**까지만 만든다.
 *    블록 제목도 오지 않아 머리에는 `블록 #3` 처럼 ID 로만 적는다.
 * ⚠️ 조회 전용이다. 등록 · 캡션 수정 · 삭제는 이미지 블록(스텝 화면)에서 한다.
 */
export default function ProjectImages() {
  const params = useParams<{ id: string }>();
  const projectId = params.id;

  /** 어느 프로젝트의 응답인지 함께 담는다 — 경로가 바뀌면 즉시 무효가 된다 */
  const [loaded, setLoaded] = useState<{
    projectId: string;
    images: ProjectImage[];
  } | null>(null);
  const [failedProjectId, setFailedProjectId] = useState<string | null>(null);
  const [reloadCount, setReloadCount] = useState(0);
  /** 블록으로 묶어 볼지 — 기본은 최신순 한 줄 흐름이다 */
  const [groupByBlock, setGroupByBlock] = useState(false);

  const lightbox = useModalTarget<ProjectImage>();

  /*
   * 블록 이름은 107번 응답에 없어 스텝 블록 목록에서 따로 모은다 — 요청이 스텝 수만큼 늘어난다.
   * 그래서 **이름을 실제로 쓰는 순간**(블록별 보기 · 크게 보기)에만 켠다.
   */
  const blockNames = useImageBlockNames(
    projectId,
    groupByBlock || lightbox.target !== null,
  );

  useEffect(() => {
    const controller = new AbortController();
    const { signal } = controller;

    getProjectImages(projectId, signal)
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

  if (!images) return <ProjectImagesSkeleton />;

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <h2 className="text-body-m font-semibold text-text-primary">
            이미지
          </h2>
          <span className="rounded-pill bg-bg-hover px-2 py-0.5 text-caption text-text-secondary">
            총 {images.length}장
          </span>
          <span className="text-caption text-text-secondary">
            블록 {blocks.length}개
          </span>
        </div>
        {/*
          이 버튼에는 `aria-pressed` 를 걸지 않는다 — 라벨이 **지금 상태가 아니라 다음 동작**이라
          (`블록별로 보기` 를 누르면 묶인다) 눌림 여부를 실으면 "전체 보기, 눌림" 처럼
          뜻이 뒤집혀 읽힌다. 상태를 말하려면 라벨부터 상태로 바꿔야 한다.
        */}
        {images.length > 0 && (
          <button
            type="button"
            onClick={() => setGroupByBlock((grouped) => !grouped)}
            className="cursor-pointer rounded-button-sm px-2 py-1 text-detail font-medium text-text-primary-blue hover:bg-blue-bg-soft"
          >
            {groupByBlock ? '전체 보기' : '블록별로 보기'}
          </button>
        )}
      </div>

      {images.length === 0 ? (
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
        <ImageGrid images={images} onOpen={lightbox.open} />
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

/**
 * 정사각 타일 그리드 — 캡션 줄은 항상 자리를 잡아 둔다.
 * `memo` — `블록별로 보기` 를 켜고 끌 때 다른 묶음의 타일까지 다시 그리지 않는다.
 */
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
