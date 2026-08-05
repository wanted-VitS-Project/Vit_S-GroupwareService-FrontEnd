/**
 * 스텝 화면에 붙이는 블록의 유형 정의.
 * 값은 ERD `block.type` enum 9값과 정확히 일치해야 한다. (.ai/API.md 9번)
 */

export type BlockTypeCode =
  | 'TEXT'
  | 'IMAGE'
  | 'CHECKLIST'
  | 'FILE'
  | 'PAYMENT_CONFIRM'
  | 'TAX_INVOICE_VIEW'
  | 'APPROVAL'
  | 'AI'
  | 'BID_NOTICE';

export interface BlockTypeOption {
  code: BlockTypeCode;
  label: string;
  description: string;
  /**
   * `title` 필드의 라벨. 대부분 '블록 이름' 이지만
   * 입금 확인 블록에서는 `title` 이 회차명이다.
   */
  titleLabel?: string;
  /** 아이콘 상자 배경 */
  background: string;
  /** 아이콘 상자 테두리 */
  border: string;
  /** 아이콘 선 색 */
  icon: string;
}

/** 모달에 노출되는 순서 그대로 둔다 (2열 그리드) */
export const BLOCK_TYPES: BlockTypeOption[] = [
  {
    code: 'CHECKLIST',
    label: '체크리스트',
    description: '할 일 목록을 Step 화면에서 바로 체크하며 관리',
    background: '#ECFDF5',
    border: '#A4F4CF',
    icon: '#009966',
  },
  {
    code: 'TEXT',
    label: '텍스트',
    description: '메모, 회의록, 설명 등을 자유롭게 작성하는 노트',
    background: '#F8FAFC',
    border: '#E2E8F0',
    icon: '#45556C',
  },
  {
    code: 'IMAGE',
    label: '이미지',
    description: '이미지를 업로드하고 썸네일로 미리 보기',
    background: '#F0F9FF',
    border: '#B8E6FE',
    icon: '#0084D1',
  },
  {
    code: 'FILE',
    label: '문서 업로드',
    description: '여러 파일을 첨부·관리하는 문서 보관함',
    background: '#EFF6FF',
    border: '#BEDBFF',
    icon: '#155DFC',
  },
  {
    code: 'APPROVAL',
    label: '결재',
    description: '결재 라인 구성 및 승인 현황 요약, 상세 진입 가능',
    background: '#FFFBEB',
    border: '#FEE685',
    icon: '#BB4D00',
  },
  {
    code: 'PAYMENT_CONFIRM',
    label: '입금 확인',
    description: '회차별 입금 예정·실제 입금 내역을 확인',
    titleLabel: '회차명',
    background: '#F5F3FF',
    border: '#DDD6FF',
    icon: '#7F22FE',
  },
  {
    code: 'TAX_INVOICE_VIEW',
    label: '세금계산서 조회',
    description: '발행된 세금계산서 내역을 조회',
    background: '#ECFEFF',
    border: '#A2F4FD',
    icon: '#0092B8',
  },
  {
    code: 'BID_NOTICE',
    label: '입찰 공고',
    description: '입찰 일정, 참여사, 진행 상태를 한눈에 파악',
    background: '#FFF7ED',
    border: '#FFD6A8',
    icon: '#F54900',
  },
  {
    code: 'AI',
    label: 'AI Block',
    description: '문서 요약·초안 생성·분석 결과를 AI로 처리',
    background: '#EEF2FF',
    border: '#C6D2FF',
    icon: '#4F39F6',
  },
];

/** `title` 최대 길이 — 백엔드 `VARCHAR(200)` */
export const BLOCK_TITLE_MAX_LENGTH = 200;

/** 한 행에 놓일 수 있는 칸 수. 블록은 1~3칸을 차지한다 */
export const BLOCK_COLUMNS = 3;

export interface BlockOwner {
  /** 사번 */
  userId: string;
  name: string;
}

/**
 * GET /api/v1/steps/{stepId}/blocks 의 블록 하나.
 * 응답은 `rowIndex` · `sortOrder` 순으로 정렬되어 온다.
 */
export interface StepBlock {
  blockId: number;
  type: BlockTypeCode;
  title: string | null;
  /** 미지정이면 null (BLK-012) */
  owner: BlockOwner | null;
  /** 같은 값끼리 한 행에 묶인다 */
  rowIndex: number;
  /** 행 내 좌우 순서 */
  sortOrder: number;
  /** 열 병합 수 (1~3) */
  colSpan: number;
  /**
   * 타입별 상세 — 구조가 타입마다 다르다.
   * ⚠️ `FILE` 의 `{ fileCount }` 만 확인됐다. 나머지는 확인 필요.
   */
  detail: unknown;
  linkedIssueTotal: number;
  linkedIssueDone: number;
}

export interface ChecklistItem {
  chkId: number;
  content: string;
  isCompleted: boolean;
}

/**
 * `detail` 에서 체크리스트 블록 ID 를 꺼낸다.
 *
 * 구성은 **블록(`blockId`) > 블록의 내용(`chkBlockId`)** 이고 두 값은 다르다.
 * 항목 생성 경로(`/blocks/checklists/{chkBlockId}/items`)에는 `chkBlockId` 만 쓴다.
 * `blockId` 로 폴백하면 남의 블록에 항목이 붙을 수 있어 절대 대체하지 않는다.
 */
export function readChecklistBlockId(detail: unknown): number | null {
  if (typeof detail !== 'object' || detail === null) return null;

  const { chkBlockId } = detail as { chkBlockId?: unknown };
  return typeof chkBlockId === 'number' ? chkBlockId : null;
}

/**
 * `detail` 에서 체크리스트 항목을 안전하게 꺼낸다.
 * 스키마가 확정되지 않아 형태가 맞지 않으면 빈 배열로 떨어뜨린다.
 */
export function readChecklistItems(detail: unknown): ChecklistItem[] {
  if (typeof detail !== 'object' || detail === null) return [];

  const { items } = detail as { items?: unknown };
  if (!Array.isArray(items)) return [];

  return items.filter(
    (item): item is ChecklistItem =>
      typeof item === 'object' &&
      item !== null &&
      typeof (item as ChecklistItem).chkId === 'number' &&
      typeof (item as ChecklistItem).content === 'string' &&
      typeof (item as ChecklistItem).isCompleted === 'boolean',
  );
}

export interface TextBlockDetail {
  /** 텍스트 항목 ID — 본문 수정 경로에 쓴다. `blockId` 와 다른 값이다 */
  txtId: number;
  /** 마크다운 원문 */
  content: string;
}

/**
 * `detail` 에서 텍스트 블록 정보를 꺼낸다.
 * `txtId` 가 없으면 어느 본문을 고칠지 알 수 없어 편집을 막는다.
 */
export function readTextBlockDetail(detail: unknown): TextBlockDetail | null {
  if (typeof detail !== 'object' || detail === null) return null;

  const { txtId, content } = detail as { txtId?: unknown; content?: unknown };
  if (typeof txtId !== 'number') return null;

  return { txtId, content: typeof content === 'string' ? content : '' };
}

/** PATCH /api/v1/blocks/texts/{txtId} */
export interface UpdateTextBlockResponse {
  txtId: number;
  content: string;
  updatedAt: string;
}

/** POST /api/v1/blocks/checklists/{chkBlockId}/items */
export interface CreateChecklistItemResponse {
  chkBlockId: number;
  chkId: number;
  content: string;
  completedCount: number;
  totalCount: number;
  createdAt: string;
}

/** PATCH /api/v1/blocks/checklists/items/{chkId} */
export interface UpdateChecklistItemRequest {
  /** 수정한 부분을 포함한 전체 내용 */
  content?: string;
  /** 목표 완료 여부 */
  changeStatusTo?: boolean;
}

export interface UpdateChecklistItemResponse {
  chkId: number;
  content: string;
  isCompleted: boolean;
  completedCount: number;
  totalCount: number;
  updatedAt: string;
}

/** DELETE /api/v1/blocks/checklists/items/{chkId} */
export interface DeleteChecklistItemResponse {
  completedCount: number;
  totalCount: number;
}

/** POST /api/v1/steps/{stepId}/blocks */
export interface CreateBlockRequest {
  type: BlockTypeCode;
  /** 최대 200자. 입금 확인 블록에서는 회차명 */
  title?: string;
  /** 담당자 사번 — 선택 입력 (BLK-012) */
  owner?: string;
  /** 미지정 시 맨 아래 */
  rowIndex?: number;
  /** 행 내 순서 */
  sortOrder?: number;
  /** 열 병합 수 (1~3), 기본 1 */
  colSpan?: number;
}
