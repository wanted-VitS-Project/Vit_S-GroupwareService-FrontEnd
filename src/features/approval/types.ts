/**
 * 결재 도메인 타입. (.ai/API.md 결재 절)
 *
 * 구성은 **결재(`approvalId`) > 상신 회차(`revisionId`) > 결재선 · 결재 문서** 다.
 * 회차는 상신할 때마다 새로 만들어지고 이전 회차는 이력으로 남는다 — 덮어쓰지 않는다.
 */

/** 결재 전체 · 회차 공용 상태 */
export type ApprovalStatus = 'DRAFT' | 'IN_PROGRESS' | 'REJECTED' | 'COMPLETED';

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
   * ❗ 아래 3개는 명세에 없다.
   * 진행 현황 스텝퍼 · 반려 사유 표시에 필요해서 선택 필드로 열어 두고,
   * 값이 없으면 순서만 그린다.
   */
  status?: ApprovalLineStatus;
  comment?: string | null;
  processedAt?: string | null;
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
  finishedAt: string | null;
  documents: ApprovalDocument[];
  lines: ApprovalLine[];
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

  const { approvalId, revisionId, title, content } = detail as {
    approvalId?: unknown;
    revisionId?: unknown;
    title?: unknown;
    content?: unknown;
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
  };
}
