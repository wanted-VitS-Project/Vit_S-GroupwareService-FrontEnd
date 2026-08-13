'use client';

import { lazy, Suspense } from 'react';

import Modal from '@/components/Modal';

import { preloadPdfViewer } from './pdfViewer';
import type { ViewerFile } from './types';

const FileViewerModal = lazy(() => import('./FileViewerModal'));

/**
 * 지연 로딩되는 문서 뷰어.
 *
 * 뷰어는 pdfjs 를 끌고 오므로 초기 번들에서 분리한다. 목록에 마우스를 올리는 순간
 * `preloadViewer()` 로 미리 받아 두기 때문에 실제로 열 때는 이미 캐시에 있다.
 *
 * 문서를 목록으로 훑는 화면(프로젝트 문서함 · 내 파일)이 **같은 방식**을 쓰므로
 * 청크 분리 · 대기 자리 · 프리로드를 여기 한 벌만 둔다.
 *
 * ⚠️ `next/dynamic` 이 아니라 `lazy` + `Suspense` 다 — `dynamic` 의 `loading` 은
 *    props 를 받지 못해 **대기 자리를 닫을 수 없다.** 청크가 늦거나 실패하면
 *    사용자가 닫히지 않는 모달에 갇히므로 `onClose` 가 폴백까지 닿아야 한다.
 */
export function LazyFileViewerModal(props: {
  file: ViewerFile;
  onClose: () => void;
}) {
  return (
    <Suspense fallback={<FileViewerFallback onClose={props.onClose} />}>
      <FileViewerModal {...props} />
    </Suspense>
  );
}

/** 청크가 아직 도착하지 않았을 때의 자리 — 없으면 눌러도 반응이 없는 것처럼 보인다 */
function FileViewerFallback({ onClose }: { onClose: () => void }) {
  return (
    <Modal
      title="문서 보기"
      onClose={onClose}
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
let isPreloaded = false;

/** 뷰어 청크 · pdf.js 워커를 미리 받는다. 목록 영역에 들어오는 순간 부른다 */
export function preloadViewer() {
  if (isPreloaded) return;
  isPreloaded = true;

  void import('./FileViewerModal').catch(() => {});
  preloadPdfViewer();
}
