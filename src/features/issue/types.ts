/**
 * 스텝 이슈(일정) 도메인 타입 · 라벨 · 배지 색. (.ai/API.md 55~60번)
 *
 * 응답에 없는 것은 화면에서도 만들지 않는다 — 표시용 이슈 키, 시작일,
 * 이슈별 진척도, 이슈 활동 이력은 명세에서 명시적으로 제외됐다.
 */

import type { BlockTypeCode } from '@/features/block/types';

export type IssueStatus = 'TODO' | 'IN_PROGRESS' | 'DONE';

export type IssuePriority = 'LOW' | 'MEDIUM' | 'HIGH';

/**
 * 담당자 — `userId` 는 사번이다. 참여자 응답의 `memberId` 를 쓰면 안 된다.
 *
 * 사원은 삭제되지 않고 **퇴사일만 기록된다** (2026-08-12 컨벤션).
 * 퇴사자여도 담당자 항목을 화면에서 빼지 않고 이름 뒤에 `(퇴사자)` 문구만 붙인다 —
 * 사원 조회 API 를 따로 부를 필요가 없다.
 *
 * ⚠️ 필드명은 `deletedAt` 이 아니라 **`resignedAt`** 이고, 블록 담당자의
 *    `deleted`(사원 데이터 삭제 · D-6)와도 **다른 값**이다.
 */
export interface IssueAssignee {
  userId: string;
  name: string;
  /** 퇴사일 `yyyy-MM-dd`. 재직 중이면 null */
  resignedAt: string | null;
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
  /**
   * 낙관적 락 버전 (2026-08-12 신설).
   *
   * ✅ **필수다** — 목록(55) · 상세(57) · 프로젝트 이슈(108) 응답 스키마에 실려 있는 것을
   *    2026-08-12 실서버 `/v3/api-docs` 로 확인했다 (`IssueListResponseIssueSummary` ·
   *    `IssueDetailResponse` · `ProjectIssueListResponseIssueSummary`).
   */
  version: number;
}

/**
 * 이슈 진척도 — 프로젝트 전체 · 스텝별이 같은 모양이다. (108번)
 *
 * `progressRate` 는 이슈가 0개일 때 `null` 이다 — 0% 와 구분해야
 * "아직 이슈가 없음" 과 "하나도 못 끝냄" 이 섞이지 않는다.
 */
export interface IssueProgress {
  totalIssueCount: number;
  doneIssueCount: number;
  inProgressIssueCount: number;
  progressRate: number | null;
}

/** GET /projects/{projectId}/issues 의 스텝 하나. 이슈가 없어도 빈 배열로 온다 */
export interface ProjectIssueStep extends IssueProgress {
  stepId: number;
  stepName: string;
  issues: IssueSummary[];
}

/** GET /projects/{projectId}/issues — 페이징이 없다 */
export interface ProjectIssuesResponse {
  progress: IssueProgress;
  /** 이미 `sortOrder` 로 정렬돼 있다. 삭제된 스텝은 빠진다 */
  steps: ProjectIssueStep[];
}

/** 시작 전(TODO) 이슈 수 — 서버가 주지 않아 화면에서 뺀다 */
export function todoIssueCount(progress: IssueProgress) {
  return Math.max(
    progress.totalIssueCount -
      progress.doneIssueCount -
      progress.inProgressIssueCount,
    0,
  );
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
  /**
   * ⚠️ **필수.** 최초 조회값(`base`)의 버전을 싣는다 — 어긋나면 409 다.
   *    화면이 들고 있는 draft 의 버전이 아니라 **비교 기준의 버전**이어야 한다.
   */
  version: number;
}

/** PATCH /issues/{issueId}/status 응답 */
export interface IssueStatusChanged {
  issueId: number;
  status: IssueStatus;
  completedAt: string | null;
  updatedAt: string;
  /**
   * 저장 후의 새 값. 상태 변경도 issue 버전을 올린다 —
   * 화면 카드에 덮어쓰지 않으면 **다음 수정이 409** 다.
   *
   * ✅ 응답 스키마(`IssueStatusChangeResponse`)에 있는 것을 2026-08-12 실서버로 확인했다.
   */
  version: number;
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

/**
 * 부분 수정(58번)이 다루는 필드 전체.
 *
 * `status` · `completedAt` 은 여기 없다 — 상태는 별도 API(59번) 소관이라
 * 충돌 비교 대상도 아니다.
 */
export const ISSUE_EDIT_FIELDS = [
  'title',
  'content',
  'dueDate',
  'priority',
  'assigneeIds',
  'blockIds',
] as const;

export type IssueEditField = (typeof ISSUE_EDIT_FIELDS)[number];

export const ISSUE_FIELD_LABELS: Record<IssueEditField, string> = {
  title: '이슈 이름',
  content: '이슈 설명',
  dueDate: '마감일',
  priority: '우선순위',
  assigneeIds: '담당자',
  blockIds: '관련 블록',
};

export function toIssueFormValues(issue: IssueDetail): IssueFormValues {
  return {
    title: issue.title,
    content: issue.content ?? '',
    priority: issue.priority,
    dueDate: issue.dueDate ?? '',
    assigneeIds: issue.assignees.map((assignee) => assignee.userId),
    blockIds: issue.relatedBlocks.map((block) => block.blockId),
  };
}

/** 순서만 다른 같은 집합은 변경으로 보지 않는다 — 불필요한 관계 재동기화를 막는다 */
export function isSameIdSet<T>(left: T[], right: T[]) {
  return (
    left.length === right.length && left.every((item) => right.includes(item))
  );
}

/**
 * 비교 전 다듬기.
 *
 * 제목 · 설명의 앞뒤 공백은 저장할 때 어차피 떨어진다 — 다듬지 않고 비교하면
 * 스페이스 하나 눌렀다 지운 것이 "수정한 필드" 로 잡혀 **없던 충돌이 생긴다.**
 */
function trimmed(values: IssueFormValues) {
  return {
    ...values,
    title: values.title.trim(),
    content: values.content.trim(),
  };
}

/** `left` 가 `right` 와 다른 필드 목록. 어느 쪽을 기준에 두느냐는 부르는 쪽이 정한다 */
export function changedIssueFields(
  left: IssueFormValues,
  right: IssueFormValues,
): IssueEditField[] {
  const one = trimmed(left);
  const other = trimmed(right);

  return ISSUE_EDIT_FIELDS.filter((field) => {
    if (field === 'assigneeIds') {
      return !isSameIdSet(one.assigneeIds, other.assigneeIds);
    }
    if (field === 'blockIds') return !isSameIdSet(one.blockIds, other.blockIds);
    return one[field] !== other[field];
  });
}

/** `target` 위에 `source` 의 지정 필드만 얹는다 — 자동 병합 · 충돌 해소 공용 */
export function mergeIssueFields(
  target: IssueFormValues,
  source: IssueFormValues,
  fields: IssueEditField[],
): IssueFormValues {
  const merged = { ...target };

  for (const field of fields) {
    if (field === 'assigneeIds') merged.assigneeIds = [...source.assigneeIds];
    else if (field === 'blockIds') merged.blockIds = [...source.blockIds];
    else if (field === 'priority') merged.priority = source.priority;
    else merged[field] = source[field];
  }

  return merged;
}

/**
 * PATCH 본문 — **지정한 필드만** 담는다. `null` 은 해제 신호다.
 *
 * ⚠️ 상세 객체 전체를 다시 보내지 않는다. 안 보낸 필드는 서버가 건드리지 않아,
 *    남이 그 사이 고친 다른 필드가 내 화면의 옛 값으로 되돌아가지 않는다.
 */
export function issuePatchOf(
  values: IssueFormValues,
  fields: IssueEditField[],
  version: number,
): UpdateIssueRequest {
  const body: UpdateIssueRequest = { version };
  const clean = trimmed(values);

  for (const field of fields) {
    if (field === 'title') body.title = clean.title;
    else if (field === 'content') body.content = clean.content || null;
    else if (field === 'dueDate') body.dueDate = clean.dueDate || null;
    else if (field === 'priority') body.priority = clean.priority;
    else if (field === 'assigneeIds') body.assigneeIds = clean.assigneeIds;
    else body.blockIds = clean.blockIds;
  }

  return body;
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
    badge: 'border-border-default bg-bg-hover text-text-secondary',
    dot: 'bg-text-muted',
    columnBg: 'bg-bg-surface',
    columnRing: 'ring-border-default',
  },
  IN_PROGRESS: {
    badge: 'border-yellow-border bg-yellow-bg-soft text-yellow-text',
    dot: 'bg-step-in-progress',
    columnBg: 'bg-yellow-bg-soft/50',
    columnRing: 'ring-yellow-border',
  },
  DONE: {
    badge: 'border-green-border bg-green-bg text-green-text',
    dot: 'bg-step-done',
    columnBg: 'bg-green-bg/50',
    columnRing: 'ring-green-border',
  },
};

/** 마감일이 지난 이슈를 강조하는 색 — 우선순위 '높음' 과 같은 계열이다 */
export const ISSUE_OVERDUE_STYLE = 'border-red-border bg-red-bg text-[#C10007]';

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
    badge: 'border-red-border bg-red-bg text-[#C10007]',
    dot: 'bg-[#FB2C36]',
  },
  MEDIUM: {
    badge: 'border-yellow-border bg-yellow-bg text-yellow-text',
    dot: 'bg-yellow-border',
  },
  LOW: {
    badge: 'border-border-default bg-bg-surface text-gray-text-soft',
    dot: 'bg-text-muted',
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

/** 'YYYY-MM-DD' 만 받는다 — 형식이 다르면 경과를 계산하지 않는다 */
const DUE_DATE_PATTERN = /^(\d{4})-(\d{2})-(\d{2})$/;

/**
 * 마감일이 며칠 지났는지. 아직 안 지났거나 마감일이 없으면 `0`.
 *
 * 완료된 이슈는 지났다고 보지 않는다 — 이미 끝난 일에 경고를 띄울 이유가 없다.
 *
 * ⚠️ **달력 날짜 기준**으로 센다. 로컬 자정끼리 밀리초를 빼서 24시간으로 나누면
 *    서머타임 전환일(23·25시간)에 하루가 밀린다. `Date.UTC` 는 전환이 없어
 *    연·월·일만 넣으면 항상 정확한 날수 차이가 나온다.
 */
export function overdueDays(issue: {
  dueDate: string | null;
  status: IssueStatus;
}) {
  if (!issue.dueDate || issue.status === 'DONE') return 0;

  const matched = DUE_DATE_PATTERN.exec(issue.dueDate);
  if (!matched) return 0;

  const [, year, month, day] = matched;
  const due = Date.UTC(Number(year), Number(month) - 1, Number(day));

  // 사용자가 보는 '오늘' 은 로컬 날짜다 — 연·월·일만 뽑아 같은 기준으로 옮긴다
  const now = new Date();
  const today = Date.UTC(now.getFullYear(), now.getMonth(), now.getDate());

  const passed = (today - due) / DAY_IN_MS;
  return passed > 0 ? passed : 0;
}
