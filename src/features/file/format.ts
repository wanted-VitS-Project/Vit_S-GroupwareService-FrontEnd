/** 파일 표기 헬퍼. 크기 · 확장자 색을 화면마다 다르게 쓰지 않도록 모은다 */

/** 5_800_000 → '5.8 MB' (1024 기준, 소수 1자리) */
export function formatFileSize(sizeBytes: number) {
  if (!Number.isFinite(sizeBytes) || sizeBytes < 0) return '';
  if (sizeBytes < 1024) return `${sizeBytes} B`;

  const units = ['KB', 'MB', 'GB'] as const;
  let size = sizeBytes / 1024;
  let unitIndex = 0;

  while (size >= 1024 && unitIndex < units.length - 1) {
    size /= 1024;
    unitIndex += 1;
  }

  // 10 이상은 소수점을 떼야 배지 폭이 흔들리지 않는다
  const rounded = size >= 10 ? Math.round(size) : Math.round(size * 10) / 10;
  return `${rounded} ${units[unitIndex]}`;
}

/**
 * 확장자 배지 · 아이콘 색. 등록되지 않은 확장자는 회색으로 떨어뜨린다.
 *
 * ⚠️ 색값을 직접 쓰지 않고 **globals.css 의 토큰**(`--color-*-text` · `--color-*-bg-soft`)을
 *    가리킨다 — 배지 · 태그가 쓰는 팔레트와 어긋나지 않게 하기 위함이다.
 * ℹ️ 팔레트에 없는 하늘색(hwp) · 주황(ppt)은 **가장 가까운 토큰**으로 모았다.
 *    그래서 문서 계열(doc · hwp)과 이미지가 같은 파랑을 쓴다 — 색만으로 갈라 읽지 않는다
 *    (배지에 확장자 글자가 함께 있다).
 */
const EXTENSION_STYLES: Record<string, { text: string; background: string }> = {
  pdf: { text: 'var(--color-red-text)', background: 'var(--color-red-bg-soft)' },
  doc: {
    text: 'var(--color-blue-text)',
    background: 'var(--color-blue-bg-soft)',
  },
  docx: {
    text: 'var(--color-blue-text)',
    background: 'var(--color-blue-bg-soft)',
  },
  xls: { text: 'var(--color-green-text)', background: 'var(--color-green-bg)' },
  xlsx: { text: 'var(--color-green-text)', background: 'var(--color-green-bg)' },
  csv: { text: 'var(--color-green-text)', background: 'var(--color-green-bg)' },
  ppt: {
    text: 'var(--color-yellow-text)',
    background: 'var(--color-yellow-bg-soft)',
  },
  pptx: {
    text: 'var(--color-yellow-text)',
    background: 'var(--color-yellow-bg-soft)',
  },
  hwp: {
    text: 'var(--color-blue-text)',
    background: 'var(--color-blue-bg-soft)',
  },
  hwpx: {
    text: 'var(--color-blue-text)',
    background: 'var(--color-blue-bg-soft)',
  },
  txt: {
    text: 'var(--color-gray-text-soft)',
    background: 'var(--color-gray-bg-soft)',
  },
  md: {
    text: 'var(--color-gray-text-soft)',
    background: 'var(--color-gray-bg-soft)',
  },
  zip: {
    text: 'var(--color-purple-text)',
    background: 'var(--color-purple-bg-soft)',
  },
  png: {
    text: 'var(--color-blue-text)',
    background: 'var(--color-blue-bg-soft)',
  },
  jpg: {
    text: 'var(--color-blue-text)',
    background: 'var(--color-blue-bg-soft)',
  },
  jpeg: {
    text: 'var(--color-blue-text)',
    background: 'var(--color-blue-bg-soft)',
  },
};

const FALLBACK_STYLE = {
  text: 'var(--color-text-secondary)',
  background: 'var(--color-gray-bg)',
};

export function extensionStyle(extension: string) {
  return EXTENSION_STYLES[extension.toLowerCase()] ?? FALLBACK_STYLE;
}

/** 배지에 넣을 짧은 라벨 — 대문자, 너무 길면 자른다 */
export function extensionLabel(extension: string) {
  return extension.toUpperCase().slice(0, 4);
}
