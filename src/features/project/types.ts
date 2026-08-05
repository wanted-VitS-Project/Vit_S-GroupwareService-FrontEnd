/** 사업 카테고리 — 프로젝트에 여러 개 붙을 수 있다 */
export interface BusinessCategory {
  categoryId: number;
  name: string;
  code: string;
}

/** 프로젝트에서 요청자가 가진 권한. VIEWER 면 수정 버튼을 숨긴다 */
export type ProjectPermission = 'VIEWER' | 'EDITOR';

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
