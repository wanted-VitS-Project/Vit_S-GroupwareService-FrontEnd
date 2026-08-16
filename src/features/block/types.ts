/**
 * 스텝 화면에 붙이는 블록의 유형 정의.
 * 값은 ERD `block.type` enum 9값과 정확히 일치해야 한다. (.ai/API.md 9번)
 */

/**
 * ⛔ `PAYMENT_CONFIRM`(입금 확인) · `TAX_INVOICE_VIEW`(세금계산서 조회)는
 *    **화면에서 통째로 걷어냈다** (2026-08-16). 본문이 없어 만들어도 빈 껍데기만 붙었다.
 *    정산 관련은 `SETTLEMENT` 하나로 모은다.
 *
 * ⚠️ 백엔드 enum 에는 두 값이 **남아 있을 수 있다.** 그래서 `block.type` 은
 *    이 유니온으로 좁혀 받되, 모르는 값이 와도 화면이 죽지 않아야 한다 —
 *    조회하는 쪽(`BLOCK_TYPES.find`)이 이미 `undefined` 를 감안한다.
 */
export type BlockTypeCode =
  | 'TEXT'
  | 'IMAGE'
  | 'CHECKLIST'
  | 'FILE'
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
 * 블록 유형 표 — 모달 선택지이자 기존 블록의 라벨 · 색 조회표다.
 *
 * 모달에 노출되는 순서 그대로 둔다 (2열 그리드).
 * 가로 1칸 — 체크리스트 · 텍스트 · 이미지 · 결재 · 정산
 * 가로 2칸 — 문서 업로드 · 입찰 · AI
 */
export const BLOCK_TYPES: BlockTypeOption[] = [
  {
    code: 'CHECKLIST',
    label: '체크리스트',
    description: '할 일 목록을 스텝 화면에서 바로 체크하며 관리',
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
    label: 'AI 블록',
    description: '문서 요약·초안 생성·분석 결과를 AI로 처리',
    defaultColSpan: 2,
    background: '#EEF2FF',
    border: '#C6D2FF',
    /*
     * ⚠️ 여기만 토큰을 참조한다 — 다른 블록의 색은 서로를 구별하기 위한 **식별색**이지만,
     *    AI 블록의 아이콘색은 화면 곳곳에서 쓰는 **AI 브랜드색**이라 한 곳에서 관리한다.
     */
    icon: 'var(--color-ai-primary)',
  },
];

/** `title` 최대 길이 — 백엔드 `VARCHAR(200)` */
export const BLOCK_TITLE_MAX_LENGTH = 200;

/** 한 행에 놓일 수 있는 칸 수. 블록은 1~3칸을 차지한다 */
export const BLOCK_COLUMNS = 3;

export interface BlockOwner {
  /** 사번 */
  userId: string;
  /** ⚠️ 삭제된 사원이어도 **비우지 않는다** */
  name: string;
  /**
   * 사원 데이터 삭제 여부 (D-6 · 2026-08-11 신설).
   *
   * `true` 여도 이름은 그대로 온다 — 이름 뒤에 `(퇴사자)` 문구를 붙이고
   * **담당자 선택 후보에서만 제외**한다.
   *
   * ⚠️ 이슈 담당자 · 활동 수행자의 `resignedAt`(퇴사)와 **다른 값**이다 — 서로 대체하지 말고,
   *    화면 표기만 하나로 합친다 (`components/PersonNote.tsx`). 이 응답에는 `resignedAt` 이 없어
   *    참여자 목록의 `resigned` 로 보충한다 (`BlockMembersContext`).
   * ⚠️ 생성 응답(9번)에서는 항상 `false` 다 — `true` 는 조회(10번)에서만 온다.
   */
  deleted: boolean;
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
  /**
   * 낙관적 락 버전 (2026-08-11 신설).
   *
   * ⚠️ **선택 필드로 둔다** — 조회 응답에 실린다는 계약은 나왔지만 실서버 확인 전이다.
   * 값이 없으면 화면이 **이동 저장을 막고 재조회를 안내한다** (스테이지 · 스텝과 같은 방침).
   *
   * ❗ 배치 저장(`layout`) · 제목/담당자 수정도 `version` 을 요구한다 — 그쪽은 미배관이다.
   */
  version?: number;
}

/**
 * PATCH /api/v1/blocks/{blockId}/step — 블록을 다른 스텝으로 옮긴다.
 *
 * ⚠️ 출발 · 도착 **양쪽 스텝의 EDITOR** 여야 한다.
 */
export interface MoveBlockRequest {
  /** 같은 프로젝트의 **다른** 스텝 */
  stepId: number;
  version: number;
  /** `true` 면 충돌을 무시하고 덮어쓴다 */
  overwrite?: boolean;
}

export interface MoveBlockResponse {
  blockId: number;
  stepId: number;
  /**
   * 끊긴 이슈-블록 연결 수.
   * ⚠️ **0 이 아니면 사용자에게 알려야 한다** — 블록과 이슈는 같은 스텝이어야 해서 끊긴다.
   */
  unlinkedIssueCount: number;
  /** 저장 후의 새 값 */
  version: number;
}

/**
 * 수정 응답의 담당자를 화면 상태에 넣을 수 있는 모양으로 맞춘다.
 *
 * `deleted` 가 오지 않았을 때 —
 * - **같은 담당자면** 화면이 들고 있던 값을 유지한다 (표기가 깜빡 사라지지 않는다)
 * - **바뀐 담당자면** `false` 다. 새 담당자는 후보 목록에서 온 재직 중인 사원뿐이다
 */
export function normalizeUpdatedOwner(
  updated: UpdateBlockResponse['owner'],
  previous: BlockOwner | null,
): BlockOwner | null {
  if (updated === null) return null;
  if (updated.deleted !== undefined)
    return { ...updated, deleted: updated.deleted };

  const isSamePerson = previous?.userId === updated.userId;
  return { ...updated, deleted: isSamePerson ? previous.deleted : false };
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
  /**
   * 낙관적 락 버전 (2026-08-11 신설).
   *
   * ⚠️ **`block.version` 과 다른 값이다** — `text` 테이블의 자기 버전이다.
   *    블록 목록 조회의 `TEXT` 상세에 함께 실려 온다.
   * ⚠️ 선택으로 둔다 — 없으면 화면이 저장을 막고 새로고침을 안내한다.
   */
  version?: number;
}

/**
 * `detail` 에서 텍스트 블록 정보를 꺼낸다.
 * `txtId` 가 없으면 어느 본문을 고칠지 알 수 없어 편집을 막는다.
 */
export function readTextBlockDetail(detail: unknown): TextBlockDetail | null {
  if (typeof detail !== 'object' || detail === null) return null;

  const { txtId, content, version } = detail as {
    txtId?: unknown;
    content?: unknown;
    version?: unknown;
  };
  if (typeof txtId !== 'number') return null;

  return {
    txtId,
    content: typeof content === 'string' ? content : '',
    version: typeof version === 'number' ? version : undefined,
  };
}

/**
 * PATCH /api/v1/blocks/texts/{txtId}
 *
 * ⚠️ **낙관적 락** — `version` 필수(없으면 400 `TEXT_VERSION_REQUIRED`),
 *    늦으면 409 `TEXT_VERSION_CONFLICT`. 409 면 재조회 / 덮어쓰기를 묻는다.
 */
export interface UpdateTextBlockRequest {
  /** 부분 수정이 아니라 전체 내용 */
  content: string;
  /** 블록 목록에서 받은 `detail.version` 그대로 */
  version: number;
  /** `true` 면 충돌을 무시하고 덮어쓴다 */
  overwrite?: boolean;
}

export interface UpdateTextBlockResponse {
  txtId: number;
  content: string;
  updatedAt: string;
  /**
   * 저장 후의 새 값. 화면에 꽂지 않으면 **다음 저장이 또 409** 다.
   * 응답에 없으면 화면은 버전을 비워 다음 저장 전에 새로고침을 안내한다.
   */
  version?: number;
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
  /**
   * 낙관적 락 버전 (2026-08-11 신설) — **이미지 한 장마다** 따로 있다 (`image` 테이블).
   *
   * 수정 요청의 `images[]` 각 항목에 그대로 실어 보낸다. 하나라도 어긋나면
   * **배열 전체가 409** 이고 부분 저장은 없다. 선택으로 둬 없으면 저장을 막는다.
   */
  version?: number;
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
  /**
   * 아래 셋은 **아직 백엔드 계약에 없다** (2026-08-14 요청함).
   *
   * 없는 동안에는 화면이 스텝마다 블록 목록(10번)을 부르는 **N+1** 로 이름을 모은다
   * (`useImageBlockNames`). 형제 API 인 문서함(105번)은 이미 같은 필드를 주고 있어
   * 107번만 맞추면 그 우회가 통째로 사라진다.
   *
   * 값이 오면 `readImageBlockNames()` 가 알아서 이 필드를 쓰고 N+1 은 켜지지 않는다 —
   * **프론트 수정 없이** 배포되는 순간 바뀐다.
   */
  blockTitle?: string | null;
  stepId?: number;
  stepName?: string;
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

/** 한 장의 최대 용량 (2026-08-16 확정) */
export const IMAGE_MAX_SIZE_BYTES = 20 * 1024 * 1024;

/**
 * 한 번의 업로드 요청에 실을 수 있는 장수 · 합계 용량 (2026-08-16 확정).
 *
 * ⚠️ **블록이 담을 수 있는 총 장수에는 제한이 없다** — 요청 한 번의 상한일 뿐이다.
 *    넘치면 나눠 올리면 되므로, 초과분을 버리지 말고 "다음 번에 올리라" 고 안내한다.
 */
export const IMAGE_UPLOAD_MAX_COUNT = 15;
export const IMAGE_UPLOAD_MAX_TOTAL_BYTES = 300 * 1024 * 1024;

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
  /**
   * 정렬된 **전체** 목록. 빠진 이미지는 삭제로 간주된다.
   *
   * ⚠️ 항목마다 `version` 이 **필수**다 (없으면 400 `IMAGE_VERSION_REQUIRED`).
   *    하나라도 늦으면 **배열 전체가 409** 다 — 부분 저장이 없다.
   */
  images: { imgId: number; caption: string | null; version: number }[];
}

export interface UpdateImageItemsResponse {
  /** `version` 은 저장 후의 새 값 — 다음 수정 요청에 그대로 실어 보낸다 */
  images: {
    imgId: number;
    orderIndex: number;
    caption: string;
    version?: number;
  }[];
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
  /**
   * 낙관적 락 버전.
   *
   * 요청에는 **필수**(`BlockLayoutOrder`), 응답에는 **저장 후의 새 값**이 온다.
   * 조회에 실리는지 확인 전이라 선택으로 둔다 (`StepBlock.version` 참고).
   */
  version?: number;
}

/**
 * 서버로 보내는 배치 한 줄 — `version` 이 **반드시** 있어야 한다.
 * 화면 좌표 계산용 `BlockLayout` 과 나눠 두어야, 버전 없는 값이 요청에 섞이지 않는다.
 */
export type BlockLayoutOrder = BlockLayout & { version: number };

/**
 * PATCH /api/v1/steps/{stepId}/blocks/layout
 *
 * ⚠️ 스텝의 배치 **전체**를 보낸다 — 옮긴 블록만 보내면 나머지가 지워진다.
 * ⚠️ 낙관적 락을 **항목마다** 검사한다. 하나라도 어긋나면 요청 전체가 409 로 롤백된다.
 * ⛔ `overwrite` 가 **없다** — 409 면 재조회 말고는 출구가 없다.
 */
export interface UpdateBlockLayoutRequest {
  layouts: BlockLayoutOrder[];
}

export interface UpdateBlockLayoutResponse {
  /** `version` 은 저장 후의 새 값이다 — 화면 블록에 덮어써야 다음 저장이 통과한다 */
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
/**
 * PATCH /api/v1/blocks/{blockId}
 *
 * ⚠️ 이쪽은 **진짜 부분 수정**이다 (스테이지 · 스텝 수정과 다르다) —
 *    키를 생략하면 유지, `null` 을 명시하면 해제.
 *    ⛔ `title` · `owner` 를 **둘 다 생략하면** 400 `BLOCK_UPDATE_FIELD_REQUIRED`.
 */
export interface UpdateBlockRequest {
  title?: string | null;
  owner?: string | null;
  /** ⚠️ **필수.** `title` · `owner` 는 생략할 수 있어도 이건 항상 보낸다 */
  version: number;
  /** `true` 면 충돌을 무시하고 덮어쓴다 */
  overwrite?: boolean;
}

export interface UpdateBlockResponse {
  blockId: number;
  title: string | null;
  /**
   * ⚠️ **`deleted` 가 없을 수 있다** — 46번 명세에 이 필드가 명시돼 있지 않다.
   *    그래서 응답 경계에서는 **선택 필드**로 받고, 화면 상태에 넣기 전에
   *    `normalizeUpdatedOwner()` 로 정규화한다 (없으면 옛 값을 유지).
   *    그대로 꽂으면 제목만 고쳤는데 담당자의 `(퇴사자)` 표기가 사라진다.
   */
  owner: (Omit<BlockOwner, 'deleted'> & { deleted?: boolean }) | null;
  updatedAt: string;
  /** ⚠️ 저장 후의 새 값. 화면 상태를 이 값으로 교체하지 않으면 다음 저장이 또 409 다 */
  version: number;
}
