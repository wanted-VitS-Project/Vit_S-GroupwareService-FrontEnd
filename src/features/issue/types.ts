/**
 * 스텝 이슈(일정) 도메인 타입 · 라벨 · 배지 색. (.ai/API.md 55~60번)
 *
 * 응답에 없는 것은 화면에서도 만들지 않는다 — 표시용 이슈 키, 시작일,
 * 이슈별 진척도, 이슈 활동 이력은 명세에서 명시적으로 제외됐다.
 */

import type { BlockTypeCode } from '@/features/block/types';

export type IssueStatus = 'TODO' | 'IN_PROGRESS' | 'DONE';

export type IssuePriority = 'LOW' | 'MEDIUM' | 'HIGH';

/** 담당자 — `userId` 는 사번이다. 참여자 응답의 `memberId` 를 쓰면 안 된다 */
export interface IssueAssignee {
  userId: string;
  name: string;
}

/** 이슈에 연결된 블록. `title` · `type` 은 표시용이라 요청에 보내지 않는다 */
export interface IssueRelatedBlock {
  blockId: number;
  title: string;
  /** 명세에 없는 유형이 와도 화면이 깨지지 않게 문자열도 허용한다 */
  type: BlockTypeCode | string;
}

/** GET /steps/{stepId}/issues — 목록에는 `content` 가 없다 */
export interface IssueSummary {
  issueId: number;
  title: string;
  status: IssueStatus;
  priority: IssuePriority;
  /** YYYY-MM-DD · 미지정이면 null */
  dueDate: string | null;
  assignees: IssueAssignee[];
  relatedBlocks: IssueRelatedBlock[];
}

/** GET /issues/{issueId} — 목록 필드 + 설명 · 완료 시각 */
export interface IssueDetail extends IssueSummary {
  stepId: number;
  content: string | null;
  /** YYYY-MM-DDTHH:mm:ss · DONE 이 아니면 null. 서버가 관리한다 */
  completedAt: string | null;
}

/** POST /steps/{stepId}/issues */
export interface CreateIssueRequest {
  title: string;
  content?: string | null;
  /** ⚠️ 생성만 `yyyy-MM-ddTHH:mm:ss` 다 (수정 · 조회는 날짜) */
  dueDate?: string;
  status?: IssueStatus;
  priority: IssuePriority;
  /** 사번 목록 */
  assigneeIds?: string[];
  blockIds?: number[];
}

/**
 * PATCH /issues/{issueId} — 보낸 필드만 반영된다.
 *
 * `content` · `dueDate` 는 `null` 이 "해제" 다.
 * `assigneeIds` · `blockIds` 는 추가분이 아니라 **최종 전체 목록**이고, `null` 은 400 이다.
 */
export interface UpdateIssueRequest {
  title?: string;
  content?: string | null;
  /** YYYY-MM-DD · null 이면 마감일 해제 */
  dueDate?: string | null;
  priority?: IssuePriority;
  assigneeIds?: string[];
  blockIds?: number[];
}

/** PATCH /issues/{issueId}/status 응답 */
export interface IssueStatusChanged {
  issueId: number;
  status: IssueStatus;
  completedAt: string | null;
  updatedAt: string;
}

/**
 * 생성 · 수정 모달이 다루는 입력값.
 *
 * `status` 는 없다 — 생성은 항상 `TODO` 이고 이후 변경은 보드 드래그로만 한다.
 * `completedAt` 은 서버가 관리한다.
 */
export interface IssueFormValues {
  title: string;
  content: string;
  priority: IssuePriority;
  /** 빈 문자열이면 마감일 미지정 */
  dueDate: string;
  assigneeIds: string[];
  blockIds: number[];
}

/** 보드 열 순서 — 왼쪽부터 이 순서로 그린다 */
export const ISSUE_STATUS_ORDER: IssueStatus[] = [
  'TODO',
  'IN_PROGRESS',
  'DONE',
];

export const ISSUE_STATUS_LABELS: Record<IssueStatus, string> = {
  TODO: '시작 전',
  IN_PROGRESS: '진행 중',
  DONE: '완료',
};

export interface IssueStatusStyle {
  /** 상태 배지 (열 머리 · 상세 공용) */
  badge: string;
  /** 배지 앞 점 */
  dot: string;
  /** 드롭 대상일 때 열 배경 */
  columnBg: string;
  /** 드롭 대상일 때 열 테두리 */
  columnRing: string;
}

export const ISSUE_STATUS_STYLES: Record<IssueStatus, IssueStatusStyle> = {
  TODO: {
    badge: 'border-[#1C1F2A]/9 bg-[#ECEEF4] text-[#6C7389]',
    dot: 'bg-[#9AA1B4]',
    columnBg: 'bg-[#ECEEF4]/50',
    columnRing: 'ring-[#C8CDD9]',
  },
  IN_PROGRESS: {
    badge: 'border-[#8EC5FF] bg-[#DBEAFE] text-[#1447E6]',
    dot: 'bg-[#2B7FFF]',
    columnBg: 'bg-[#DBEAFE]/50',
    columnRing: 'ring-[#8EC5FF]',
  },
  DONE: {
    badge: 'border-[#7BF1A8] bg-[#DCFCE7] text-[#008236]',
    dot: 'bg-[#00C951]',
    columnBg: 'bg-[#DCFCE7]/50',
    columnRing: 'ring-[#7BF1A8]',
  },
};

/** 마감일이 지난 이슈를 강조하는 색 — 우선순위 '높음' 과 같은 계열이다 */
export const ISSUE_OVERDUE_STYLE =
  'border-[#FFA2A2] bg-[#FFE2E2] text-[#C10007]';

export const ISSUE_PRIORITY_ORDER: IssuePriority[] = ['HIGH', 'MEDIUM', 'LOW'];

export const ISSUE_PRIORITY_LABELS: Record<IssuePriority, string> = {
  HIGH: '높음',
  MEDIUM: '보통',
  LOW: '낮음',
};

export const ISSUE_PRIORITY_STYLES: Record<
  IssuePriority,
  { badge: string; dot: string }
> = {
  HIGH: {
    badge: 'border-[#FFA2A2] bg-[#FFE2E2] text-[#C10007]',
    dot: 'bg-[#FB2C36]',
  },
  MEDIUM: {
    badge: 'border-[#FEE685] bg-[#FEF9C2] text-[#A65F00]',
    dot: 'bg-[#FE9A00]',
  },
  LOW: {
    badge: 'border-[#E2E8F0] bg-[#F8FAFC] text-[#45556C]',
    dot: 'bg-[#90A1B9]',
  },
};

/**
 * 마감일 오름차순 · 미지정(`null`)은 마지막. 서버가 정렬해주지 않아 화면에서 한다.
 * 문자열 비교로 충분하다 — 'YYYY-MM-DD' 는 사전순 = 시간순이다.
 *
 * ⚠️ 첫 조회에서 한 번만 쓴다. 이후에는 생성 · 상태 변경한 이슈가 열 맨 위로 오도록
 *    화면이 들고 있는 배열 순서를 그대로 보여준다.
 */
export function byDueDate(left: IssueSummary, right: IssueSummary) {
  if (left.dueDate === right.dueDate) return 0;
  if (!left.dueDate) return 1;
  if (!right.dueDate) return -1;
  return left.dueDate < right.dueDate ? -1 : 1;
}

const DAY_IN_MS = 24 * 60 * 60 * 1000;

/**
 * 마감일이 며칠 지났는지. 아직 안 지났거나 마감일이 없으면 `0`.
 *
 * 완료된 이슈는 지났다고 보지 않는다 — 이미 끝난 일에 경고를 띄울 이유가 없다.
 * `Date` 는 비교에만 쓴다. 자정 기준이라 시각은 결과에 영향을 주지 않는다.
 */
export function overdueDays(issue: {
  dueDate: string | null;
  status: IssueStatus;
}) {
  if (!issue.dueDate || issue.status === 'DONE') return 0;

  // 'Z' 를 붙이지 않아 로컬 자정으로 읽힌다 — 사용자가 보는 날짜와 같은 기준
  const due = Date.parse(`${issue.dueDate}T00:00:00`);
  if (Number.isNaN(due)) return 0;

  const now = new Date();
  const today = new Date(
    now.getFullYear(),
    now.getMonth(),
    now.getDate(),
  ).getTime();

  const passed = Math.floor((today - due) / DAY_IN_MS);
  return passed > 0 ? passed : 0;
}
