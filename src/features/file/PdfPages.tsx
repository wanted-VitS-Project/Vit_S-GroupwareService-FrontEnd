'use client';

import { useEffect, useRef, useState } from 'react';
import { Document, Page, pdfjs } from 'react-pdf';

import { PDF_WORKER_SRC } from './pdfViewer';

// 워커 경로는 프리로드 쪽과 **같은 값**이어야 프리페치한 파일이 재사용된다
pdfjs.GlobalWorkerOptions.workerSrc = PDF_WORKER_SRC;

/**
 * 캔버스 배율 상한.
 *
 * react-pdf 는 기본적으로 `devicePixelRatio` 만큼 캔버스를 키운다. 3x 화면이면
 * 픽셀이 9배 — 래스터화 시간도 메모리도 그만큼이다. 확대가 없는 미리보기라
 * 2 로 묶어도 눈으로는 차이가 없다.
 */
const MAX_DEVICE_PIXEL_RATIO = 2;

/** 아직 그리지 않은 페이지의 자리 비율(높이 ÷ 너비). A4 세로 기준 */
const DEFAULT_PAGE_RATIO = 1.414;

/** 한 화면 앞까지 미리 그린다 — 스크롤 중 빈 칸이 보이지 않게 */
const PRERENDER_MARGIN = '100%';

/**
 * PDF 를 페이지 단위로 그린다.
 *
 * - 브라우저 내장 뷰어(툴바 · 자체 스크롤)를 쓰지 않는다
 * - 컨테이너 **너비에 맞춰** 각 페이지를 렌더한다
 * - 자체 스크롤을 만들지 않는다 — 페이지를 세로로 쌓기만 하고 스크롤은 부모(모달)가 갖는다
 * - **화면에 들어온 페이지만** 그린다 (아래 `LazyPage`)
 */
export default function PdfPages({
  /** 미리보기 PDF blob */
  file,
  onFailed,
}: {
  file: Blob;
  onFailed: (message: string) => void;
}) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [width, setWidth] = useState(0);
  const [pageCount, setPageCount] = useState(0);
  /** 자리표시자 높이용. 1페이지를 재서 문서 전체에 쓴다 — 보통 페이지 크기가 같다 */
  const [pageRatio, setPageRatio] = useState(DEFAULT_PAGE_RATIO);

  // 폭 변화는 외부 시스템(레이아웃)에서 오는 값이라 effect 로 구독한다
  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const observer = new ResizeObserver(([entry]) => {
      setWidth(Math.floor(entry.contentRect.width));
    });

    observer.observe(container);
    return () => observer.disconnect();
  }, []);

  return (
    <div ref={containerRef} className="w-full">
      <Document
        file={file}
        onLoadSuccess={(pdf) => {
          setPageCount(pdf.numPages);
          // 렌더가 아니라 메타데이터만 읽는다 — 자리 높이를 정확히 잡기 위해서다
          pdf
            .getPage(1)
            .then((page) => {
              const viewport = page.getViewport({ scale: 1 });
              if (viewport.width > 0) {
                setPageRatio(viewport.height / viewport.width);
              }
            })
            // 실패해도 A4 기본값으로 그리면 되므로 삼킨다
            .catch(() => undefined);
        }}
        onLoadError={() => onFailed('PDF 를 읽지 못했습니다.')}
        // 로딩 · 실패 표시는 호출부가 맡는다
        loading={null}
        error={null}
        noData={null}
      >
        {/* 폭을 재기 전에는 그리지 않는다 — 잘못된 크기로 한 번 그리면 다시 렌더된다 */}
        {width > 0 &&
          Array.from({ length: pageCount }, (unused, index) => (
            <LazyPage
              key={index}
              pageNumber={index + 1}
              width={width}
              ratio={pageRatio}
            />
          ))}
      </Document>
    </div>
  );
}

/**
 * 화면에 들어올 때까지 렌더를 미루는 페이지.
 *
 * pdf.js 워커는 하나뿐이라 페이지를 한꺼번에 마운트하면 **1페이지가 나머지와
 * 큐를 다툰다**. 처음 보이는 페이지만 그리면 첫 화면이 그만큼 빨리 뜬다.
 *
 * 한 번 그린 페이지는 **버리지 않는다** — 미리보기는 최대 5페이지라 점유가
 * 예측 가능하고, 되돌아올 때마다 다시 래스터화하는 편이 훨씬 비싸다.
 */
function LazyPage({
  pageNumber,
  width,
  ratio,
}: {
  pageNumber: number;
  width: number;
  ratio: number;
}) {
  const slotRef = useRef<HTMLDivElement>(null);
  /** 관찰 범위에 들어왔는가 — 렌더 **시작** 조건이다 */
  const [isVisible, setIsVisible] = useState(false);
  /**
   * 캔버스가 실제로 그려졌는가 — 자리 높이를 **놓아도 되는** 조건이다.
   *
   * `isVisible` 로 높이를 풀면 `loading={null}` 인 동안 슬롯이 0 으로 주저앉아
   * 스크롤 위치가 튀고, 아래 페이지들이 한꺼번에 관찰 범위에 들어온다.
   */
  const [isRendered, setIsRendered] = useState(false);

  useEffect(() => {
    const slot = slotRef.current;
    if (!slot) return;

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (!entry.isIntersecting) return;
        setIsVisible(true);
        // 한 번 그리면 계속 두므로 더 볼 필요가 없다
        observer.disconnect();
      },
      {
        // 스크롤을 모달 본문이 갖는다. root 를 맞춰야 rootMargin 이 먹는다
        root: findScrollParent(slot),
        rootMargin: PRERENDER_MARGIN,
      },
    );

    observer.observe(slot);
    return () => observer.disconnect();
  }, []);

  return (
    <div
      ref={slotRef}
      /*
        캔버스가 나오기 전까지 자리를 지킨다. `height` 가 아니라 `minHeight` 인 건
        추정 비율이 실제보다 작아도 캔버스가 잘리지 않게 하기 위해서다.
      */
      style={isRendered ? undefined : { minHeight: Math.round(width * ratio) }}
      className="mb-4 overflow-hidden rounded border border-[#E2E8F0] bg-white shadow-sm last:mb-0"
    >
      {isVisible && (
        <Page
          pageNumber={pageNumber}
          width={width}
          devicePixelRatio={previewPixelRatio()}
          // 페이지 이미지만 필요하다. 텍스트 · 주석 레이어는 그리지 않는다
          renderTextLayer={false}
          renderAnnotationLayer={false}
          onRenderSuccess={() => setIsRendered(true)}
          loading={null}
          error={null}
          className="[&_canvas]:block [&_canvas]:!h-auto [&_canvas]:!w-full"
        />
      )}
    </div>
  );
}

/** 실제로 스크롤하는 조상. 못 찾으면 `null` — IntersectionObserver 가 뷰포트를 쓴다 */
function findScrollParent(element: HTMLElement) {
  for (
    let node = element.parentElement;
    node && node !== document.body;
    node = node.parentElement
  ) {
    const { overflowY } = getComputedStyle(node);
    if (overflowY === 'auto' || overflowY === 'scroll') return node;
  }

  return null;
}

function previewPixelRatio() {
  if (typeof window === 'undefined') return 1;
  return Math.min(window.devicePixelRatio || 1, MAX_DEVICE_PIXEL_RATIO);
}
