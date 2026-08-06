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

/** 확장자 배지 · 아이콘 색. 등록되지 않은 확장자는 회색으로 떨어뜨린다 */
const EXTENSION_STYLES: Record<string, { text: string; background: string }> = {
  pdf: { text: '#E7000B', background: '#FEF2F2' },
  doc: { text: '#155DFC', background: '#EFF6FF' },
  docx: { text: '#155DFC', background: '#EFF6FF' },
  xls: { text: '#009966', background: '#ECFDF5' },
  xlsx: { text: '#009966', background: '#ECFDF5' },
  csv: { text: '#009966', background: '#ECFDF5' },
  ppt: { text: '#F54900', background: '#FFF7ED' },
  pptx: { text: '#F54900', background: '#FFF7ED' },
  hwp: { text: '#0092B8', background: '#ECFEFF' },
  hwpx: { text: '#0092B8', background: '#ECFEFF' },
  txt: { text: '#45556C', background: '#F8FAFC' },
  md: { text: '#45556C', background: '#F8FAFC' },
  zip: { text: '#7F22FE', background: '#F5F3FF' },
  png: { text: '#0084D1', background: '#F0F9FF' },
  jpg: { text: '#0084D1', background: '#F0F9FF' },
  jpeg: { text: '#0084D1', background: '#F0F9FF' },
};

const FALLBACK_STYLE = { text: '#6C7389', background: '#ECEEF4' };

export function extensionStyle(extension: string) {
  return EXTENSION_STYLES[extension.toLowerCase()] ?? FALLBACK_STYLE;
}

/** 배지에 넣을 짧은 라벨 — 대문자, 너무 길면 자른다 */
export function extensionLabel(extension: string) {
  return extension.toUpperCase().slice(0, 4);
}
