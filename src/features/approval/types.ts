/**
 * 결재 도메인 타입. (.ai/API.md 결재 절)
 *
 * 구성은 **결재(`approvalId`) > 상신 회차(`revisionId`) > 결재선 · 결재 문서** 다.
 * 회차는 상신할 때마다 새로 만들어지고 이전 회차는 이력으로 남는다 — 덮어쓰지 않는다.
 */

import type { ApprovalStatusCode } from '@/constants/status';

/**
 * 결재 전체 · 회차 공용 상태.
 * 값과 라벨을 한곳에서 관리하려고 `constants/status.ts` 의 타입을 그대로 쓴다.
 */
export type ApprovalStatus = ApprovalStatusCode;

/**
 * 결재선 한 명의 처리 상태.
 * ❗ 회차 상세 응답에 아직 없다 — 백엔드 확인 대기. 값은 API 설명문에서 추린 것이다.
 */
export type ApprovalLineStatus =
  'WAITING' | 'ACTIVE' | 'APPROVED' | 'REJECTED' | 'CANCELED';

export interface ApprovalLine {
  lineId: number;
  /** 사번 */
  approverId: string;
  approverName: string;
  approverPosition: string | null;
  approverDepartment: string | null;
  /** 1차 · 2차 · 3차 */
  order: number;
  /**
   * ⚠️ 아래 3개는 **명세에는 없지만 실제 응답에는 온다** (2026-08-07 확인).
   * 결재 상세 · 회차 상세는 항상 주고, 결재선 등록(`PUT`) 응답만 아직 확인 전이라
   * 여기서는 선택 필드로 두고 `ApprovalDetailLine` 에서 조인다.
   */
  status?: ApprovalLineStatus;
  /** 승인 · 반려 의견. 요청 body 와 같은 이름이다 (`comment` 아님) */
  opinion?: string | null;
  processedAt?: string | null;
}

/** 결재 상세의 결재선 — 처리 상태가 **항상** 온다 */
export interface ApprovalDetailLine extends ApprovalLine {
  status: ApprovalLineStatus;
  opinion: string | null;
  processedAt: string | null;
  /**
   * 이 결재자가 **더는 결재할 수 없는 상태**인지 (퇴사 · 프로젝트 이탈 등).
   *
   * `ACTIVE` · `WAITING` 인 결재선이 이 값이면 결재가 멈춰 있어 교체 · 제외가 필요하다
   * (`ApproverReplaceModal` 의 대상 판정).
   *
   * ⚠️ **선택 필드다** — 응답에서의 정확한 위치를 아직 실측하지 못했다(2026-08-13).
   *    값이 안 오면 배너 · 모달이 뜨지 않을 뿐 기존 화면은 그대로 동작한다.
   *    위치가 확인되면 여기와 `unavailableLines()` 만 고치면 된다.
   */
  approverUnavailable?: boolean;
}

/** 결재가 만들어진 원본 위치. `원본 블록 보기` 이동에 쓴다 (AP-079) */
export interface ApprovalBlockOrigin {
  blockId: number;
  stepId: number;
  projectId: number;
}

/**
 * GET /approvals/{approvalId} — 결재 관리 상세.
 *
 * ⚠️ **항상 현재 회차**다. 이전 회차는 회차 상세(`.../revisions/{revisionId}`)로 받는다.
 * 회차 상세와 달리 `submittedAt` · `finishedAt` 이 없고, 대신 `blockOrigin` 이 있다.
 */
export interface ApprovalDetail {
  revisionId: number;
  revisionNo: number;
  title: string | null;
  content: string | null;
  drafterId: string;
  drafterName: string;
  drafterDepartment: string | null;
  drafterPosition: string | null;
  status: ApprovalStatus;
  documents: ApprovalDocument[];
  lines: ApprovalDetailLine[];
  blockOrigin: ApprovalBlockOrigin;
}

export interface ApprovalDocument {
  documentId: number;
  /** 결재 대상은 파일이 아니라 **파일 버전**이다 (AP-010) */
  fileVersionId: number;
  /**
   * ❗ 문서 추가 응답에만 있고 회차 상세에는 없다.
   * 없으면 파일 도메인 API 로 따로 조회해야 파일명을 보여줄 수 있다.
   */
  fileName?: string;
  fileSize?: number;
  uploadedAt?: string;
}

/** GET /approvals/{approvalId}/revisions/{revisionId} */
export interface ApprovalRevision {
  revisionId: number;
  /** 회차 번호. 재상신할 때마다 1씩 오른다 */
  revisionNo: number;
  title: string | null;
  content: string | null;
  drafterId: string;
  drafterName: string;
  drafterDepartment: string | null;
  drafterPosition: string | null;
  status: ApprovalStatus;
  /** DRAFT 회차는 아직 상신 전이라 null */
  submittedAt: string | null;
  /** 진행 중이면 null. 명세 예시의 문자열 `"null"` 은 오표기다 (실물 확인) */
  finishedAt: string | null;
  documents: ApprovalDocument[];
  lines: ApprovalDetailLine[];
  /**
   * 기안자가 **더는 상신할 수 없는 상태**인지 (퇴사 · 프로젝트 이탈 등).
   * 반려된 회차에서 이 값이 참이면 누군가 대신 재상신해야 결재가 다시 굴러간다.
   */
  drafterUnavailable?: boolean;
  /**
   * 대행 기안자. **지정 절차가 따로 없다** — 가장 먼저 재상신에 성공한 스텝 `EDITOR` 가 된다.
   * 아직 없으면 `null` 이고, 그때만 재상신 버튼을 연다.
   */
  actingDrafterId?: string | null;
  actingDrafterName?: string | null;
}

/**
 * 결재 관리 목록의 조회 범위. 탭 하나가 값 하나다.
 *
 * ⚠️ `all` 은 MASTER · ADMIN 만 쓸 수 있다 —
 * 다른 권한이 요청하면 403 `APPROVAL_SCOPE_ALL_FORBIDDEN` 이라 탭 자체를 감춘다.
 */
export type ApprovalScope = 'drafted' | 'pending' | 'all';

/** GET /approvals 쿼리. 값이 있는 것만 실어 보낸다 */
export interface ApprovalListQuery {
  /** 생략하면 서버 기본값 `drafted` */
  scope?: ApprovalScope;
  status?: ApprovalStatus;
  /** ⚠️ 아래 둘은 `scope=all` 에서만 적용된다 */
  drafterId?: string;
  approverId?: string;
  /** yyyy-MM-dd */
  fromDate?: string;
  toDate?: string;
  /** 결재 제목 또는 프로젝트명 */
  keyword?: string;
  /** 현재 회차 번호 */
  revisionNo?: number;
  /** **0부터** 시작한다 (사원 목록과 다르니 주의) */
  page?: number;
  /** 기본 10 */
  size?: number;
}

/** 결재 목록 응답 봉투. 사원 목록과 달리 `page` · `size` 가 없다 */
export interface ApprovalPage<T> {
  content: T[];
  totalElements: number;
  totalPages: number;
}

/**
 * 목록 행의 결재선 요약. 아바타 줄과 진행 카운트를 그리는 데 쓴다.
 *
 * ⚠️ 회차 상세(`ApprovalLine`)와 다르다 — 여기엔 **`status` 가 오고**
 * 대신 부서 · 직급 · `lineId` 가 없다.
 */
export interface ApprovalListLine {
  approverId: string;
  approverName: string;
  order: number;
  status: ApprovalLineStatus;
}

/** GET /approvals 목록 한 줄 */
export interface ApprovalListItem {
  approvalId: number;
  title: string | null;
  status: ApprovalStatus;
  /** 현재 회차 번호. 재상신했으면 2 이상이다 */
  currentRevisionNo: number;
  drafterId: string;
  drafterName: string;
  /** 지금 차례인 결재자. 완료 · 반려된 결재는 null */
  currentApproverId: string | null;
  currentApproverName: string | null;
  /** 목록에 `프로젝트 > Step` 경로를 그리는 데 쓴다 */
  projectId: number;
  projectName: string;
  stepId: number;
  stepName: string;
  lines: ApprovalListLine[];
  /** 블록을 만든 시각 — 상신 전에도 있다 */
  createdAt: string;
  /** DRAFT 면 null */
  submittedAt: string | null;
  completedAt: string | null;
}

/**
 * POST /approval-lines/{lineId}/approve · reject — 의견은 선택이다 (AP-042·054).
 *
 * ⚠️ 대상이 결재가 아니라 **결재선(`lineId`)** 이다.
 * `lineId` 는 회차 상세의 `lines[]` 에서 얻는다 — 목록 응답에는 없다.
 */
export interface ProcessLineRequest {
  opinion?: string;
}

export interface RejectLineResponse {
  lineId: number;
  status: ApprovalLineStatus;
  processedAt: string;
}

export interface ApproveLineResponse extends RejectLineResponse {
  /** 다음 결재자가 없으면 null — 그때 `approvalCompleted` 가 true 다 */
  nextActiveLineId: number | null;
  /** 마지막 순번의 승인이면 결재 전체가 끝난다 (AP-047~049) */
  approvalCompleted: boolean;
}

/** PATCH /approvals/{approvalId}/revisions/{revisionId} — 보낸 필드만 바뀐다 */
export interface UpdateRevisionRequest {
  title?: string;
  content?: string;
}

export interface UpdateRevisionResponse {
  revisionId: number;
  title: string;
  content: string;
  updatedAt: string;
}

/**
 * POST /approvals/{approvalId}/revisions — 재상신 회차 생성.
 * 이전 회차의 제목 · 내용 · 문서를 복사하고 결재선은 반려자부터 재구성해 온다.
 */
export interface CreateRevisionResponse {
  revisionId: number;
  revisionNo: number;
  status: ApprovalStatus;
  /** 어느 회차를 복사했는지 */
  copiedFromRevisionNo: number;
  title: string | null;
  content: string | null;
  documents: ApprovalDocument[];
  lines: ApprovalLine[];
}

/**
 * 결재 이력 한 줄. (.ai/API.md 73)
 *
 * 회차를 **고르는 데 필요한 것만** 온다 — 제목 · 내용 · 결재선은 없다.
 * 고른 회차의 내용은 회차 상세(`getRevision()`)로 따로 받는다.
 */
export interface ApprovalRevisionSummary {
  revisionId: number;
  /** 1부터. 재상신마다 +1 */
  revisionNo: number;
  status: ApprovalStatus;
  /** DRAFT 회차는 아직 상신 전이라 null */
  submittedAt: string | null;
  /** 진행 중이면 null */
  finishedAt: string | null;
  /**
   * 지금 살아 있는 회차. 목록에 **하나만** true 다 —
   * 회차 번호로 마지막을 짚지 않고 이 값을 그대로 쓴다.
   */
  isCurrent: boolean;
}

/**
 * GET /approvals/{approvalId}/revisions — 결재 이력.
 * 회차 번호 오름차순이고, **페이징이 없다** (`totalElements` 조차 없다).
 */
export interface ApprovalRevisionHistory {
  content: ApprovalRevisionSummary[];
}

/** POST /approvals/{approvalId}/revisions/{revisionId}/submit */
export interface SubmitRevisionResponse {
  approvalId: number;
  revisionId: number;
  revisionNo: number;
  status: ApprovalStatus;
  submittedAt: string;
  /** 상신 직후 활성화된 첫 결재선 */
  firstActiveLineId: number;
}

/** POST /approvals/{approvalId}/revisions/{revisionId}/documents */
export interface AddDocumentRequest {
  /** 업로드가 끝난 파일 버전만 연결할 수 있다 — 업로드 자체는 파일 API 소관 */
  fileVersionId: number;
}

/** PUT /approvals/{approvalId}/revisions/{revisionId}/lines — 전체 치환이다 */
export interface SetLinesRequest {
  lines: { approverId: string; order: number }[];
}

export interface SetLinesResponse {
  lines: ApprovalLine[];
}

/**
 * 블록 목록 응답의 `detail` 에서 결재 연결 정보를 꺼낸다.
 *
 * 체크리스트(`chkBlockId`) · 텍스트(`txtId`)와 같은 구조다 —
 * 블록(`blockId`)과 결재(`approvalId`)는 다른 값이라 폴백하지 않는다.
 * 값이 없으면 어느 결재인지 알 수 없어 블록이 안내만 띄운다.
 */
export interface ApprovalBlockDetail {
  approvalId: number;
  /** 현재 회차. 초안이면 DRAFT 회차, 상신 후면 진행 중인 회차 */
  revisionId: number;
  /** 블록 목록 응답이 직접 내려준다 — 회차를 받기 전에도 요약을 그릴 수 있다 */
  title?: string | null;
  content?: string | null;
  /**
   * 참여 불가한 결재자가 있어 **교체 · 제외가 필요한** 상태인지.
   *
   * 블록이 회차 상세를 받기 전에도 배너를 띄울 수 있게 목록 응답이 함께 내려준다.
   * 실제 대상 결재선은 회차 상세의 `approverUnavailable` 로 고른다.
   */
  requiresApproverReplacement?: boolean;
}

/** 문자열 또는 null 만 통과시킨다. 숫자 · 객체가 오면 없는 것으로 본다 */
function readText(value: unknown) {
  if (typeof value === 'string') return value;
  return value === null ? null : undefined;
}

export function readApprovalBlockDetail(
  detail: unknown,
): ApprovalBlockDetail | null {
  if (typeof detail !== 'object' || detail === null) return null;

  const {
    approvalId,
    revisionId,
    title,
    content,
    requiresApproverReplacement,
  } = detail as {
    approvalId?: unknown;
    revisionId?: unknown;
    title?: unknown;
    content?: unknown;
    requiresApproverReplacement?: unknown;
  };

  // 둘 중 하나라도 없으면 어떤 결재의 어느 회차인지 특정할 수 없다
  if (typeof approvalId !== 'number' || typeof revisionId !== 'number') {
    return null;
  }

  return {
    approvalId,
    revisionId,
    title: readText(title),
    content: readText(content),
    // 참이라고 확실할 때만 배너를 띄운다 — 모르는 값으로 경고를 만들지 않는다
    requiresApproverReplacement: requiresApproverReplacement === true,
  };
}
