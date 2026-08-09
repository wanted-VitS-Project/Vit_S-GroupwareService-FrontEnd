import type { ProjectStatusCode } from '@/constants/status';

/** 사업 카테고리 — 프로젝트에 여러 개 붙을 수 있다 */
export interface BusinessCategory {
  categoryId: number;
  name: string;
  /** 업무코드는 선택 입력이라 없을 수 있다 */
  code: string | null;
}

/**
 * 프로젝트 상태.
 * 값과 라벨을 한곳에서 관리하려고 `constants/status.ts` 의 타입을 그대로 쓴다.
 */
export type ProjectStatus = ProjectStatusCode;

/** 프로젝트에서 요청자가 가진 권한. VIEWER 면 수정 버튼을 숨긴다 */
export type ProjectPermission = 'VIEWER' | 'EDITOR';

export interface ProjectMember {
  memberId: number;
  userId: string;
  name: string;
  department: string | null;
  permission: 'VIEWER' | 'EDITOR' | 'NONE';
  resigned: boolean;
}

/**
 * GET /api/v1/projects/{projectId}
 * ⚠️ status 는 백엔드 enum 이 확정되지 않아 string 으로 둔다. (예: 'IN_PROGRESS')
 */
export interface ProjectDetail {
  projectId: number;
  name: string;
  description: string | null;
  /** 발주처 */
  clientName: string;
  status: string;
  /** YYYY-MM-DD */
  startedOn: string;
  /** YYYY-MM-DD */
  endedOn: string;
  contractAmount: number;
  /** 진척률(%) — 스텝이 0개면 응답에 없다 */
  progressRate?: number;
  stepCount: number;
  doneStepCount: number;
  businessCategories: BusinessCategory[];
  bidNoticeId: number | null;
  /** 종결 건에만 값이 있다 */
  closeReasonCode: string | null;
  closeReasonNote: string | null;
  myPermission: ProjectPermission;
  /** YYYY-MM-DDTHH:mm:ss */
  createdAt: string;
}

/** 카드 아바타용 참여자 — 상세의 `ProjectMember` 보다 훨씬 얇다 */
export interface ProjectListMember {
  userId: string;
  name: string;
}

/**
 * GET /api/v1/projects — 목록 한 건.
 *
 * ⚠️ 상세(`ProjectDetail`)와 달리 `stepCount` · `doneStepCount` · `description` 이 없다.
 * 카드에 `완료/전체` 를 그리려면 상세를 카드마다 불러야 하므로 대신
 * 목록이 주는 `myIssueInProgressCount` · `myApprovalOpenCount` 를 뱃지로 쓴다.
 */
export interface ProjectListItem {
  projectId: number;
  name: string;
  /** 발주처 */
  clientName: string;
  status: ProjectStatus;
  /** YYYY-MM-DD */
  startedOn: string;
  /** YYYY-MM-DD */
  endedOn: string;
  contractAmount: number;
  /** 진척률(%) — 스텝이 0개면 응답에 없다 */
  progressRate?: number;
  businessCategories: BusinessCategory[];
  /** 이름 오름차순 */
  members: ProjectListMember[];
  /** 요청자가 담당인 `IN_PROGRESS` 이슈 수 */
  myIssueInProgressCount: number;
  /** 요청자가 **기안한** `IN_PROGRESS`+`REJECTED` 결재 수 — `결재 대기` 가 아니다 */
  myApprovalOpenCount: number;
}

/**
 * 목록 조회 파라미터.
 * ⚠️ 정렬은 `created_at DESC` → `project_id DESC` 고정이라 정렬 파라미터가 없다.
 */
export interface ProjectListQuery {
  status?: ProjectStatus;
  businessCategoryId?: number;
  /** YYYY-MM-DD */
  startedOnFrom?: string;
  /** YYYY-MM-DD */
  startedOnTo?: string;
  /** 과업명 · 발주처 검색 */
  keyword?: string;
  /** 0-based */
  page?: number;
  /** 기본 20. 백엔드가 1~100 으로 잘라낸다 */
  size?: number;
}

/** 목록 응답 봉투 */
export interface ProjectPage<T> {
  content: T[];
  page: number;
  size: number;
  totalElements: number;
  totalPages: number;
}

/** GET /api/v1/projects/{projectId}/stages — sortOrder 오름차순으로 온다 */
export interface ProjectStage {
  stageId: number;
  name: string;
  sortOrder: number;
  /** 소속 스텝 수 */
  stepCount: number;
}

export type StepStatus = 'NOT_STARTED' | 'IN_PROGRESS' | 'DONE';

/** 스텝 책임자 — 지정 전이면 null */
export interface StepOwner {
  userId: string;
  name: string;
}

/** GET /api/v1/projects/{projectId}/steps */
export interface ProjectStep {
  stepId: number;
  /** 소속 스테이지. null 이면 아직 스테이지에 배정되지 않은 스텝이다 */
  stageId: number | null;
  name: string;
  status: StepStatus;
  sortOrder: number;
  /** YYYY-MM-DD */
  startedOn: string;
  /** YYYY-MM-DD */
  endedOn: string;
  owner: StepOwner | null;
  totalIssueCount: number;
  doneIssueCount: number;
  inProgressIssueCount: number;
  /** 진척률(%) — 이슈가 0개면 응답에 없다 */
  progressRate?: number;
  myPermission: ProjectPermission;
}
