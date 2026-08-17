'use client';

import Modal from '@/components/Modal';
import { projectImageAltText, type ProjectImage } from '@/features/block/types';
import { formatDate } from '@/lib/format';

import type { ImageBlockName } from './useImageBlockNames';

// 프로젝트 이미지 크게 보기.
// 블록 캐러셀(features/block/ImageLightbox)과 달리 좌우 이동이 없다 —
// 그쪽은 블록 안의 정렬 번호로 움직이는데 107번 응답에는 orderIndex 가 없다.
// 별도 파일인 이유는 코드 스플리팅이다. 목록만 훑고 나가는 사용자가
// Modal 까지 받을 이유가 없어 타일에 마우스가 닿을 때 미리 받는다.
export default function ProjectImageLightbox({
  image,
  blockName,
  onClose,
}: {
  image: ProjectImage;
  /** 아직 못 읽었으면 null — 그때는 블록 ID 로 적는다 */
  blockName: ImageBlockName | null;
  onClose: () => void;
}) {
  return (
    <Modal
      title={image.caption || image.originalName || '이미지 크게 보기'}
      onClose={onClose}
      className="flex max-h-[90vh] w-full max-w-[880px] flex-col overflow-hidden rounded-base border border-border-default shadow-2xl"
      header={
        <div className="flex shrink-0 items-center justify-between gap-3 border-b border-border-default px-5 py-3">
          <p className="min-w-0 truncate text-detail font-semibold text-text-primary">
            {image.originalName || '이미지'}
          </p>
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
      <div className="flex min-h-0 flex-1 flex-col items-center gap-2 bg-bg-sidebar/[0.03] p-4">
        <div className="flex h-[62vh] w-full items-center justify-center">
          {/* eslint-disable-next-line @next/next/no-img-element -- 저장소(S3) 도메인이 확정되지 않아 next/image 원격 패턴을 걸 수 없다 */}
          <img
            src={image.imageUrl}
            alt={projectImageAltText(image)}
            className="max-h-full max-w-full rounded-lg object-contain"
          />
        </div>
        {/* 캡션도 있든 없든 한 줄 자리를 잡아 둔다 */}
        <p className="line-clamp-2 h-8 max-w-lg text-center text-detail leading-4 text-text-primary">
          {image.caption}
        </p>
      </div>

      <div className="shrink-0 border-t border-border-default bg-bg-surface px-5 py-2 text-center">
        <p className="text-caption text-text-secondary">
          {blockName?.stepName && `${blockName.stepName} · `}
          {blockName?.title?.trim() || `블록 #${image.imgBlockId}`} ·{' '}
          <span className="font-mono">{formatDate(image.createdAt)}</span>
        </p>
      </div>
    </Modal>
  );
}
