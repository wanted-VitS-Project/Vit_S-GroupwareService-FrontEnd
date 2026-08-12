/**
 * PDF 뷰어(react-pdf + pdfjs-dist) 는 초기 번들에서 떼어 낸다 — 문서를 열지 않는
 * 사용자에게까지 수백 KB 를 내려보낼 이유가 없다.
 *
 * 대신 **열기 전에 미리 받아 둔다**. 뷰어를 여는 순간 청크를 받기 시작하면
 * 스플리팅한 만큼 뷰어가 늦게 뜨기 때문이다.
 */

/**
 * pdf.js 는 파싱을 워커에서 한다. 번들러가 워커 파일을 함께 내보내도록
 * `import.meta.url` 기준 경로로 지정한다 (CDN 을 쓰면 오프라인 · 사내망에서 깨진다).
 *
 * ℹ️ `new URL(..., import.meta.url)` 은 에셋 경로만 만들 뿐 모듈을 불러오지 않는다 —
 *    이 파일을 초기 번들이 import 해도 pdfjs 본체는 딸려오지 않는다.
 */
export const PDF_WORKER_SRC = new URL(
  'pdfjs-dist/build/pdf.worker.min.mjs',
  import.meta.url,
).toString();

/** 프리로드는 한 번이면 된다 — 이후는 브라우저 · 번들러 캐시가 맡는다 */
let isPreloaded = false;

/**
 * 뷰어 청크와 pdf.js 워커를 미리 받아 둔다.
 * 문서 목록에 마우스를 올리는 등 **열기 직전 신호**에서 부르면 된다.
 */
export function preloadPdfViewer() {
  if (isPreloaded || typeof window === 'undefined') return;
  isPreloaded = true;

  // 뷰어 청크 — 실패해도 열 때 다시 받으므로 삼킨다
  void import('./PdfPages').catch(() => {});

  // 워커는 `<Document>` 가 마운트돼야 요청된다. 미리 캐시에 넣어 그 대기를 없앤다
  const link = document.createElement('link');
  link.rel = 'prefetch';
  link.as = 'script';
  link.href = PDF_WORKER_SRC;
  document.head.append(link);
}
