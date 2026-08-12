/**
 * 스텝 활동 기록(Activity Log) 도메인 타입 · 표시 사전. (.ai/API.md 72번)
 *
 * ⚠️ 서버는 **완성된 문장을 주지 않는다.** 조립에 필요한 원자 데이터만 온다 —
 *    문장 · 날짜 그룹 · 상대 시간은 모두 화면에서 만든다.
 */

import type { BlockTypeCode } from '@/features/block/types';

export type ActivityAction = 'CREATE' | 'MODIFY' | 'DELETE';

/** `resource.resourceId` 유무로 갈린다 — 서버가 계산해서 내려준다 */
export type ActivityTargetType = 'BLOCK' | 'RESOURCE';

/**
 * 활동 수행자. `userId` 는 사번이다.
 *
 * 퇴사자여도 **로그 항목을 화면에서 지우지 않는다** — 이름을 그대로 두고
 * 옆에 `퇴사함` 배지만 붙인다 (2026-08-12 퇴사자 표기 컨벤션).
 */
export interface ActivityActor {
  userId: string;
  name: string;
  /** Sprint1 에서는 항상 null */
  profileImageUrl: string | null;
  /** 퇴사일 `yyyy-MM-dd`. 재직 중이면 null */
  resignedAt: string | null;
}

/** 활동이 발생한 블록 */
export interface ActivityBlock {
  blockId: number;
  title: string | null;
  /** 명세에 없는 유형이 와도 화면이 깨지지 않게 문자열도 허용한다 */
  type: BlockTypeCode | string;
}

/** 블록 내부 데이터. 블록 자체 활동이면 두 값 모두 null */
export interface ActivityResource {
  resourceId: number | null;
  /** 활동 시점의 표시명 **스냅샷** — 지금 이름과 다를 수 있다 */
  name: string | null;
}

export interface ActivityLog {
  activityLogId: number;
  action: ActivityAction;
  targetType: ActivityTargetType;
  /** `resource.name` 이 있으면 그 값, 없으면 `block.title` */
  displayName: string | null;
  /** 수정 필드. 생성 · 삭제면 null */
  fieldName: string | null;
  beforeValue: string | null;
  afterValue: string | null;
  resource: ActivityResource;
  actor: ActivityActor;
  block: ActivityBlock;
  /** 'YYYY-MM-DDTHH:mm:ss' — 타임존 표기가 없다 */
  createdAt: string;
}

/** GET /steps/{stepId}/activity-logs */
export interface ActivityLogPage {
  activities: ActivityLog[];
  /** 다음 조회 커서. 없으면 null */
  nextCursor: number | null;
  hasNext: boolean;
}

/** 한 번에 받아오는 개수. 명세 기본값과 같다 */
export const ACTIVITY_LOG_PAGE_SIZE = 20;

export const ACTIVITY_ACTION_LABELS: Record<ActivityAction, string> = {
  CREATE: '추가',
  MODIFY: '수정',
  DELETE: '삭제',
};

/** 타임라인 점 색 — 추가(초록) · 수정(파랑) · 삭제(빨강) */
export const ACTIVITY_ACTION_STYLES: Record<
  ActivityAction,
  { badge: string; icon: string }
> = {
  CREATE: {
    badge: 'border-green-border bg-green-bg text-green-text',
    icon: 'border-green-border bg-green-bg text-green-text',
  },
  MODIFY: {
    badge: 'border-blue-border bg-blue-bg text-btn-primary-hover',
    icon: 'border-blue-border bg-blue-bg text-btn-primary-hover',
  },
  DELETE: {
    badge: 'border-red-border bg-red-bg text-[#C10007]',
    icon: 'border-red-border bg-red-bg text-[#C10007]',
  },
};

/**
 * 수정 필드 이름표.
 * 사전에 없는 필드가 오면 원래 값을 그대로 보여준다 — 빈칸으로 두지 않는다.
 */
const FIELD_LABELS: Record<string, string> = {
  title: '제목',
  content: '내용',
  caption: '캡션',
  orderIndex: '순서',
  isCompleted: '완료 여부',
  // 명세 예시가 `completed` 로 와서 두 이름을 모두 받는다 (BE 확인 필요)
  completed: '완료 여부',
  status: '상태',
  lines: '결재선',
  name: '이름',
  dueDate: '마감일',
};

export function fieldLabel(fieldName: string) {
  return FIELD_LABELS[fieldName] ?? fieldName;
}

/**
 * 값 사전. `fieldName` 별로 원자 값을 사람이 읽는 말로 바꾼다.
 * 사전에 없으면 원래 값을 그대로 쓴다.
 */
const VALUE_LABELS: Record<string, Record<string, string>> = {
  isCompleted: { true: '완료', false: '미완료' },
  completed: { true: '완료', false: '미완료' },
  status: {
    DRAFT: '초안',
    IN_PROGRESS: '진행중',
    ACTIVE: '진행중',
    WAITING: '대기',
    APPROVED: '승인',
    REJECTED: '반려',
    COMPLETED: '완료',
    CANCELED: '취소',
  },
};

/**
 * 변경 값 표시 방식.
 *
 * | 방식      | 대상 필드                    |
 * | --------- | ---------------------------- |
 * | `expand`  | `title` `content` `caption`  |
 * | `inline`  | 그 외 전부                   |
 *
 * `orderIndex` 는 1부터 시작하는 위치 번호라 'N번째' 로만 붙여 인라인으로 둔다.
 * `lines` 는 BE 가 이미 이름 CSV 로 내려줘 추가 변환이 없다.
 */
export type FieldDisplay = 'expand' | 'inline';

const EXPANDABLE_FIELDS = new Set(['title', 'content', 'caption']);

export function fieldDisplay(fieldName: string | null): FieldDisplay {
  return fieldName && EXPANDABLE_FIELDS.has(fieldName) ? 'expand' : 'inline';
}

/**
 * 원자 값 → 화면 문구. 값이 없으면 빈 문자열을 준다 (호출 측에서 '없음' 처리).
 * `orderIndex` 는 숫자일 때만 'N번째' 를 붙인다 — 이상한 값이 와도 그대로 보인다.
 */
export function formatFieldValue(
  fieldName: string | null,
  value: string | null,
) {
  if (value === null || value === '') return '';
  if (!fieldName) return value;

  if (fieldName === 'orderIndex') {
    return /^\d+$/.test(value) ? `${value}번째` : value;
  }

  return VALUE_LABELS[fieldName]?.[value] ?? value;
}

/**
 * 목록 앞에 붙는 필터 옵션의 '전체' 값.
 * `blockId` 를 빼고 조회한다는 뜻이라 숫자와 섞이지 않게 문자열로 둔다.
 */
export const ALL_BLOCKS = 'all';
