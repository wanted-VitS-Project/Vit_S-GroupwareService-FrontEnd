'use client';

import { useEffect, useRef, useState } from 'react';
import { Document, Page, pdfjs } from 'react-pdf';

/**
 * pdf.js 는 파싱을 워커에서 한다. 번들러가 워커 파일을 함께 내보내도록
 * `import.meta.url` 기준 경로로 지정한다 (CDN 을 쓰면 오프라인 · 사내망에서 깨진다).
 */
pdfjs.GlobalWorkerOptions.workerSrc = new URL(
  'pdfjs-dist/build/pdf.worker.min.mjs',
  import.meta.url,
).toString();

/**
 * PDF 를 페이지 단위로 그린다.
 *
 * - 브라우저 내장 뷰어(툴바 · 자체 스크롤)를 쓰지 않는다
 * - 컨테이너 **너비에 맞춰** 각 페이지를 렌더한다
 * - 자체 스크롤을 만들지 않는다 — 페이지를 세로로 쌓기만 하고 스크롤은 부모(모달)가 갖는다
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
        onLoadSuccess={({ numPages }) => setPageCount(numPages)}
        onLoadError={() => onFailed('PDF 를 읽지 못했습니다.')}
        // 로딩 · 실패 표시는 호출부가 맡는다
        loading={null}
        error={null}
        noData={null}
      >
        {/* 폭을 재기 전에는 그리지 않는다 — 잘못된 크기로 한 번 그리면 다시 렌더된다 */}
        {width > 0 &&
          Array.from({ length: pageCount }, (unused, index) => (
            <Page
              key={index}
              pageNumber={index + 1}
              width={width}
              // 페이지 이미지만 필요하다. 텍스트 · 주석 레이어는 그리지 않는다
              renderTextLayer={false}
              renderAnnotationLayer={false}
              loading={null}
              error={null}
              className="mb-4 overflow-hidden rounded border border-[#E2E8F0] bg-white shadow-sm last:mb-0 [&_canvas]:block [&_canvas]:!h-auto [&_canvas]:!w-full"
            />
          ))}
      </Document>
    </div>
  );
}
