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
  | 'BID_NOTICE'
  /**
   * ❗ **값 확인 필요.** 9번 표의 9값에 정산이 없고 "ERD enum 10값" 중 남은 1값으로 보인다.
   * API 경로가 `/blocks/settlements/...` 라 그 이름을 따랐다 — 틀리면 이 문자열만 고치면 된다.
   */
  | 'SETTLEMENT';

export interface BlockTypeOption {
  code: BlockTypeCode;
  label: string;
  description: string;
  /**
   * `title` 필드의 라벨. 대부분 '블록 이름' 이지만
   * 입금 확인 블록에서는 `title` 이 회차명이다.
   */
  titleLabel?: string;
  /**
   * 생성 시 차지할 칸 수 (한 행 = 3칸).
   * 표 · 목록 · 수치가 한 줄로 들어가는 블록은 2칸이 필요하다.
   * 새 유형을 추가하면 여기서 폭을 정해야 한다 — 선택 필드가 아니다.
   */
  defaultColSpan: 1 | 2;
  /**
   * 아이콘 배지 색 3종. 인라인 `style` 로 들어가므로 유틸리티 클래스가 아니라
   * hex 나 `var(--color-*)` 를 쓴다.
   *
   * 유형을 구별하는 **고유 액센트**라 시맨틱 토큰으로 뭉갤 수 없다 —
   * globals.css 에 같은 색이 있는 유형만 `var()` 로 옮겨 두고, 나머지는 hex 로 남겼다.
   */
  background: string;
  border: string;
  icon: string;
}

/**
 * 모달에 노출되는 순서 그대로 둔다 (2열 그리드).
 *
 * 가로 1칸 — 텍스트 · 이미지 · 체크리스트 · 결재 · 정산
 * 가로 2칸 — 문서 업로드 · 입금 확인 · 세금계산서 · 입찰 · AI
 */
export const BLOCK_TYPES: BlockTypeOption[] = [
  {
    code: 'CHECKLIST',
    label: '체크리스트',
    description: '할 일 목록을 Step 화면에서 바로 체크하며 관리',
    defaultColSpan: 1,
    background: '#ECFDF5',
    border: '#A4F4CF',
    icon: '#009966',
  },
  {
    code: 'TEXT',
    label: '텍스트',
    description: '메모, 회의록, 설명 등을 자유롭게 작성하는 노트',
    defaultColSpan: 1,
    background: '#F8FAFC',
    border: '#E2E8F0',
    icon: '#45556C',
  },
  {
    code: 'IMAGE',
    label: '이미지',
    description: '이미지를 업로드하고 썸네일로 미리 보기',
    defaultColSpan: 1,
    background: '#F0F9FF',
    border: '#B8E6FE',
    icon: '#0084D1',
  },
  {
    code: 'APPROVAL',
    label: '결재',
    description: '결재 라인 구성 및 승인 현황 요약, 상세 진입 가능',
    defaultColSpan: 1,
    background: '#FFFBEB',
    border: '#FEE685',
    icon: '#BB4D00',
  },
  {
    code: 'FILE',
    label: '문서 업로드',
    description: '여러 파일을 첨부·관리하는 문서 보관함',
    // 문서 행에 이름 · 배지 · 업로더 · 버튼이 한 줄로 들어간다
    defaultColSpan: 2,
    background: '#EFF6FF',
    border: '#BEDBFF',
    icon: '#155DFC',
  },
  {
    code: 'PAYMENT_CONFIRM',
    label: '입금 확인',
    description: '회차별 입금 예정·실제 입금 내역을 확인',
    titleLabel: '회차명',
    // 정산 계열 — 금액 · 일자 · 상태를 표로 늘어놓는다
    defaultColSpan: 2,
    background: '#F5F3FF',
    border: '#DDD6FF',
    icon: '#7F22FE',
  },
  {
    code: 'SETTLEMENT',
    label: '정산',
    description: '회차별 정산 예정 금액·일자와 실제 정산 진행률을 관리',
    // 라벨 · 값을 한 줄씩 쌓는 구조라 1칸으로 충분하다 (표를 늘어놓는 다른 정산 계열과 다르다)
    defaultColSpan: 1,
    /**
     * 이 세 줄만 토큰이다 — 다른 유형은 아직 hex 다.
     * 인라인 `style` 로 들어가므로 유틸리티 클래스가 아니라 `var()` 로 읽는다.
     */
    background: 'var(--color-purple-bg-soft)',
    border: 'var(--color-purple-border)',
    icon: 'var(--color-purple-text)',
  },
  {
    code: 'TAX_INVOICE_VIEW',
    label: '세금계산서 조회',
    description: '발행된 세금계산서 내역을 조회',
    defaultColSpan: 2,
    background: '#ECFEFF',
    border: '#A2F4FD',
    icon: '#0092B8',
  },
  {
    code: 'BID_NOTICE',
    label: '입찰 공고',
    description: '입찰 일정, 참여사, 진행 상태를 한눈에 파악',
    defaultColSpan: 2,
    background: '#FFF7ED',
    border: '#FFD6A8',
    icon: '#F54900',
  },
  {
    code: 'AI',
    label: 'AI Block',
    description: '문서 요약·초안 생성·분석 결과를 AI로 처리',
    defaultColSpan: 2,
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

/** 이미지 블록의 이미지 한 장 */
export interface BlockImage {
  imgId: number;
  originalName: string;
  /** 저장소 URL — 그대로 `<img src>` 에 넣는다 */
  imageUrl: string;
  /** 없으면 빈 문자열 */
  caption: string;
  /** 1부터 시작하는 정렬 번호. 수정 API 가 항상 1..N 으로 다시 매긴다 */
  orderIndex: number;
  /**
   * 대체 텍스트 — 스크린리더에 읽어 줄 **이미지의 뜻**.
   *
   * ❗ 아직 백엔드 계약에 없다 (요청해 둠 — `.ai/API.md` 이미지 절).
   * 캡션은 **보여 주는 문구**, `originalName` 은 **파일명**이라 둘 다 뜻을 보장하지 않는다.
   * 값이 오면 그대로 쓰고, 없으면 `imageAltText()` 가 차선책으로 떨어진다.
   */
  altText?: string;
}

/**
 * 스크린리더에 읽어 줄 문구.
 *
 * `altText` 가 가장 정확하다. 없을 때 캡션 · 파일명으로 떨어지는 것은 **차선**이고,
 * 그마저 없으면 `'이미지'` 로 둔다 (빈 `alt` 는 장식용이라는 뜻이 되어 더 나쁘다).
 */
export function imageAltText(image: BlockImage) {
  return (
    image.altText?.trim() ||
    image.caption.trim() ||
    image.originalName.trim() ||
    '이미지'
  );
}

/**
 * GET /projects/{projectId}/images 의 한 장. (명세 107번)
 *
 * `BlockImage` 와 달리 `orderIndex` 가 없고 `imgBlockId` 가 붙는다 —
 * 프로젝트 전체를 훑는 목록이라 "어느 블록의 몇 번째" 가 아니라 "어느 블록의 것" 만 안다.
 */
export interface ProjectImage {
  imgId: number;
  imgBlockId: number;
  originalName: string;
  imageUrl: string;
  /** 없으면 빈 문자열 */
  caption: string;
  createdAt: string;
}

/**
 * GET /projects/{projectId}/images/trash 의 한 장. (명세 109번)
 *
 * ⚠️ 활성 목록(107번)에 있던 **`imgBlockId` 가 없다** — 어느 블록에서 지워졌는지 모른다.
 *    그래서 휴지통은 블록으로 묶지 못하고 삭제 시각순 평면 목록으로만 그린다.
 */
export interface TrashImage {
  imgId: number;
  originalName: string;
  imageUrl: string;
  caption: string;
  deletedAt: string;
}

/**
 * PATCH /blocks/images/items/restore 의 복구 결과 한 건. (명세 110번)
 *
 * 권한을 **이미지가 속한 스텝별로** 보므로 보낸 것이 다 돌아오지 않을 수 있다 —
 * 화면은 보낸 목록이 아니라 **이 응답 기준으로** 휴지통에서 지운다.
 */
export interface RestoredImage {
  imgBlockId: number;
  imgId: number;
  originalName: string;
  /** 복구 후 순서 — 원래 자리가 아니라 블록 뒤에 붙는다 */
  orderIndex: number;
}

/**
 * 프로젝트 이미지 · 휴지통 이미지의 대체 텍스트.
 *
 * `BlockImage.altText` 처럼 뜻을 담은 필드가 이 응답들에는 없다 —
 * 캡션 → 파일명 순으로 떨어지고, 그마저 없으면 `'이미지'` 로 둔다
 * (빈 `alt` 는 장식용이라는 뜻이 되어 더 나쁘다).
 */
export function projectImageAltText(image: {
  caption: string;
  originalName: string;
}) {
  return image.caption.trim() || image.originalName.trim() || '이미지';
}

/** 캡션 최대 길이 — ❗ 백엔드 확인 필요. 우선 블록 제목과 같은 200자로 막는다 */
export const IMAGE_CAPTION_MAX_LENGTH = 200;

/** 초안 안내 문구 기준 (JPG · PNG · GIF · WEBP · 최대 10MB) */
export const IMAGE_MAX_SIZE_BYTES = 10 * 1024 * 1024;

/**
 * 올릴 수 있는 형식. **화면 안내 문구(JPG · PNG · GIF · WEBP)와 같은 목록**이다.
 *
 * `image/*` 로 두면 SVG · BMP 처럼 안내에 없는 형식이 통과한다
 * (특히 SVG 는 스크립트를 품을 수 있어 저장소에 그대로 올리면 안 된다).
 * ⚠️ 프론트 검사는 **편의**일 뿐이다 — 서버가 같은 목록으로 독립 검증해야 한다.
 */
export const IMAGE_MIME_TYPES = [
  'image/jpeg',
  'image/png',
  'image/gif',
  'image/webp',
] as const;

/** `<input accept>` 에 그대로 넣는 값 */
export const IMAGE_ACCEPT = IMAGE_MIME_TYPES.join(',');

export function isAllowedImageType(type: string) {
  return (IMAGE_MIME_TYPES as readonly string[]).includes(type);
}

/**
 * 이미지 블록의 `detail`.
 *
 * **첫 이미지는 블록 목록 조회(10번)에 함께 실려 온다** — 카드는 이 값으로 바로 그리고,
 * 두 번째 장부터 항목 조회 API(66번)로 한 장씩 받는다.
 */
export interface ImageBlockDetail {
  imgBlockId: number;
  /** 실려 온 이미지 — 보통 첫 장 하나다. 없으면 빈 배열 */
  images: BlockImage[];
  /** 전체 장수. 모르면 null — 0 과 구분해야 빈 블록 판정이 가능하다 */
  totalCount: number | null;
}

/**
 * ID · 정렬 번호로 쓸 수 있는 값인지.
 *
 * `typeof v === 'number'` 만으로는 `NaN` · `Infinity` · 음수 · 소수가 모두 통과한다.
 * 그런 값이 들어오면 캐시(`Map`) 조회가 빗나가고 `/items/NaN` 같은 요청까지 나간다.
 */
export function isPositiveInteger(value: unknown): value is number {
  return Number.isSafeInteger(value) && (value as number) > 0;
}

/** 개수로 쓸 수 있는 값인지 — 0 은 "빈 블록" 이라는 뜻이라 허용한다 */
export function isCount(value: unknown): value is number {
  return Number.isSafeInteger(value) && (value as number) >= 0;
}

/** `fallbackOrder` — `orderIndex` 가 빠진 응답(첫 장만 실어 줄 때)의 기본 정렬 번호 */
function readBlockImage(value: unknown, fallbackOrder: number) {
  if (typeof value !== 'object' || value === null) return null;

  const { imgId, originalName, imageUrl, caption, orderIndex, altText } =
    value as {
      imgId?: unknown;
      originalName?: unknown;
      imageUrl?: unknown;
      caption?: unknown;
      orderIndex?: unknown;
      altText?: unknown;
    };

  // 이 둘이 성하지 않으면 화면에 그릴 수도, 어느 항목인지 지목할 수도 없다
  if (!isPositiveInteger(imgId)) return null;
  if (typeof imageUrl !== 'string' || imageUrl.trim() === '') return null;

  return {
    imgId,
    originalName: typeof originalName === 'string' ? originalName : '',
    imageUrl,
    caption: typeof caption === 'string' ? caption : '',
    orderIndex: isPositiveInteger(orderIndex) ? orderIndex : fallbackOrder,
    ...(typeof altText === 'string' && altText.trim() !== ''
      ? { altText }
      : {}),
  } satisfies BlockImage;
}

/**
 * `detail` 에서 이미지 블록 정보를 꺼낸다.
 *
 * 체크리스트 · 텍스트와 같은 **블록(`blockId`) > 블록의 내용(`imgBlockId`)** 구조라
 * `imgBlockId` 가 없으면 조회 · 업로드 경로를 만들 수 없어 null 로 떨어뜨린다.
 *
 * ⚠️ 첫 이미지를 담는 **키 이름이 확정되지 않아** 세 모양을 모두 읽는다 —
 *    `images: [...]` · `firstImage: {...}` · `detail` 바로 아래 평면(`imgId` · `imageUrl` …).
 *    확정되면 해당 분기만 남기면 된다.
 */
export function readImageBlockDetail(detail: unknown): ImageBlockDetail | null {
  if (typeof detail !== 'object' || detail === null) return null;

  const source = detail as {
    imgBlockId?: unknown;
    images?: unknown;
    firstImage?: unknown;
    image?: unknown;
    totalCount?: unknown;
    imageCount?: unknown;
  };
  if (!isPositiveInteger(source.imgBlockId)) return null;

  const parsed = Array.isArray(source.images)
    ? source.images
        .map((image, index) => readBlockImage(image, index + 1))
        .filter((image): image is BlockImage => image !== null)
        .sort((left, right) => left.orderIndex - right.orderIndex)
    : // 배열이 아니면 첫 장 하나만 온 것으로 본다 (정렬 번호가 없으면 1번)
      [
        readBlockImage(source.firstImage, 1) ??
          readBlockImage(source.image, 1) ??
          readBlockImage(detail, 1),
      ].filter((image): image is BlockImage => image !== null);

  // 장수 키도 확정 전이라 둘 다 본다. 목록이 통째로 왔으면 그 길이가 가장 정확하다
  const declared = isCount(source.totalCount)
    ? source.totalCount
    : isCount(source.imageCount)
      ? source.imageCount
      : null;

  return {
    imgBlockId: source.imgBlockId,
    images: parsed,
    // 첫 장만 왔을 때 그 길이(1)를 전체 장수로 쓰면 다음 장 버튼이 사라진다
    totalCount: declared ?? (parsed.length > 1 ? parsed.length : null),
  };
}

/** GET /api/v1/blocks/images/{imgBlockId}/items/{currentOrderIndex} */
export interface ImageItemResponse extends BlockImage {
  /** 해당 블록의 전체 이미지 개수 */
  totalCount: number;
}

/** GET /api/v1/blocks/images/{imgBlockId}/items — 편집 권한 필요 */
export interface ImageItemsResponse {
  /** 활성 이미지 개수 */
  totalCount: number;
  /** `orderIndex` 오름차순 */
  images: BlockImage[];
}

/** POST /api/v1/blocks/images/{imgBlockId}/items */
export interface CreateImageItemsResponse {
  imgBlockId: number;
  images: (BlockImage & { createdAt: string })[];
}

/** PATCH /api/v1/blocks/images/items/{imgBlockId} — 정렬된 전체 목록을 보낸다 */
export interface UpdateImageItemsRequest {
  images: { imgId: number; caption: string | null }[];
}

export interface UpdateImageItemsResponse {
  images: { imgId: number; orderIndex: number; caption: string }[];
}

/**
 * 블록 한 개의 배치. 배치 변경 요청 · 응답이 같은 모양이다.
 * 총 열 수는 3 고정이다 (BLK-003).
 */
export interface BlockLayout {
  blockId: number;
  rowIndex: number;
  sortOrder: number;
  /** 열 병합 수 (1~3) */
  colSpan: number;
}

/**
 * PATCH /api/v1/steps/{stepId}/blocks/layout
 *
 * ⚠️ 스텝의 배치 **전체**를 보낸다 — 옮긴 블록만 보내면 나머지가 지워진다.
 */
export interface UpdateBlockLayoutRequest {
  layouts: BlockLayout[];
}

export interface UpdateBlockLayoutResponse {
  blocks: BlockLayout[];
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

/** PATCH /api/v1/blocks/{blockId} — 생략은 유지, null 은 해제 */
export interface UpdateBlockRequest {
  title?: string | null;
  owner?: string | null;
}

export interface UpdateBlockResponse {
  blockId: number;
  title: string | null;
  owner: BlockOwner | null;
  updatedAt: string;
}
