import { ENDPOINTS } from '@/constants/endpoints';
import { api } from '@/lib/api';

import type {
  AddDocumentRequest,
  ApprovalDetail,
  ApprovalDocument,
  ApprovalListItem,
  ApprovalListQuery,
  ApprovalPage,
  ApprovalRevision,
  ApprovalRevisionHistory,
  ApproveLineResponse,
  CreateRevisionResponse,
  ProcessLineRequest,
  RejectLineResponse,
  SetLinesRequest,
  SetLinesResponse,
  SubmitRevisionResponse,
  UpdateRevisionRequest,
  UpdateRevisionResponse,
} from './types';

/** 값이 있는 필터만 실어 보낸다 — 빈 문자열을 보내면 그 값으로 검색한다 */
function toSearchParams(query: ApprovalListQuery) {
  const params = new URLSearchParams();

  if (query.scope) params.set('scope', query.scope);
  if (query.status) params.set('status', query.status);
  if (query.drafterId) params.set('drafterId', query.drafterId);
  if (query.approverId) params.set('approverId', query.approverId);
  if (query.fromDate) params.set('fromDate', query.fromDate);
  if (query.toDate) params.set('toDate', query.toDate);
  if (query.keyword) params.set('keyword', query.keyword);
  if (query.revisionNo) params.set('revisionNo', String(query.revisionNo));
  // page 는 0 이 유효한 값이라 falsy 로 거르지 않는다
  if (query.page !== undefined) params.set('page', String(query.page));
  if (query.size) params.set('size', String(query.size));

  return params.toString();
}

/**
 * 결재 관리 목록. 탭(`scope`)에 따라 대상이 달라진다 —
 * `drafted` 내가 기안 · `pending` 내 차례 · `all` 전체(MASTER · ADMIN 전용).
 *
 * ⚠️ 타입은 실제 응답 기준이다. 명세의 응답 예시는 파일 버전 스키마로 잘못 표기돼 있다.
 */
export function getApprovals(query: ApprovalListQuery, signal?: AbortSignal) {
  const search = toSearchParams(query);
  const path = search
    ? `${ENDPOINTS.approvals.root}?${search}`
    : ENDPOINTS.approvals.root;

  return api.get<ApprovalPage<ApprovalListItem>>(path, signal);
}

/**
 * 결재 상세. **항상 현재 회차**를 준다 — 회차를 지정할 수 없다.
 * 이전 회차가 필요하면 `getRevision()` 을 쓴다.
 */
export function getApproval(approvalId: number, signal?: AbortSignal) {
  return api.get<ApprovalDetail>(
    ENDPOINTS.approvals.detail(approvalId),
    signal,
  );
}

/**
 * 회차 상세. 기안자 · 해당 회차 결재자(과거 이력 포함) · MASTER 만 볼 수 있다.
 * 차례가 오지 않은 결재자는 403 `APPROVAL_LINE_NOT_VIEWABLE` 로 막힌다.
 */
export function getRevision(
  approvalId: number,
  revisionId: number,
  signal?: AbortSignal,
) {
  return api.get<ApprovalRevision>(
    ENDPOINTS.approvals.revision(approvalId, revisionId),
    signal,
  );
}

/**
 * 결재 이력. 이 결재의 **전체 회차**를 회차 번호 오름차순으로 준다.
 *
 * 조회 권한은 회차 상세와 같되 **전체 회차를 통틀어** 판정한다 —
 * 한 회차에서만 결재자였어도 이력 전체를 볼 수 있다.
 */
export function getRevisions(approvalId: number, signal?: AbortSignal) {
  return api.get<ApprovalRevisionHistory>(
    ENDPOINTS.approvals.revisions(approvalId),
    signal,
  );
}

/** 제목 · 내용 수정. DRAFT 회차에서만 되고, 보낸 필드만 바뀐다 */
export function updateRevision(
  approvalId: number,
  revisionId: number,
  body: UpdateRevisionRequest,
) {
  return api.patch<UpdateRevisionResponse>(
    ENDPOINTS.approvals.revision(approvalId, revisionId),
    body,
  );
}

/**
 * 재상신 회차 생성. **멱등이다** —
 * 이미 DRAFT 회차가 있으면 새로 만들지 않고 200 으로 그대로 돌려준다.
 * 그래서 호출 측이 중복 생성을 막을 필요가 없다.
 */
export function createRevision(approvalId: number) {
  return api.post<CreateRevisionResponse>(
    ENDPOINTS.approvals.revisions(approvalId),
  );
}

/**
 * 상신. 최초 · 재상신 겸용이다.
 * 서버가 제목 · 내용 · 문서 · 결재선을 전부 재검증하므로 프론트 검증은 왕복을 줄이는 용도다.
 */
export function submitRevision(approvalId: number, revisionId: number) {
  return api.post<SubmitRevisionResponse>(
    ENDPOINTS.approvals.submit(approvalId, revisionId),
  );
}

/**
 * 결재 문서 연결. 업로드가 끝난 파일 버전만 붙일 수 있다 —
 * 업로드 자체는 파일 도메인(`features/file`) 소관이고 여기서는 `fileVersionId` 만 넘긴다.
 */
export function addDocument(
  approvalId: number,
  revisionId: number,
  body: AddDocumentRequest,
) {
  // `Required<>` 로 감싸지 않는다 — 서버가 파일명을 빼면 화면에 undefined 가 그대로 샌다
  return api.post<ApprovalDocument>(
    ENDPOINTS.approvals.documents(approvalId, revisionId),
    body,
  );
}

/** 결재 문서 제거. DRAFT 회차에서만 되고 하드 삭제라 이력에 남지 않는다 */
export function removeDocument(
  approvalId: number,
  revisionId: number,
  documentId: number,
) {
  return api.delete<void>(
    ENDPOINTS.approvals.document(approvalId, revisionId, documentId),
  );
}

/**
 * 결재 승인. 대상은 결재가 아니라 **결재선**이다 —
 * 그 결재선의 결재자 본인이, `ACTIVE` 일 때만 할 수 있다 (AP-041).
 *
 * 응답의 `approvalCompleted` 가 true 면 마지막 순번이라 결재 전체가 끝난 것이다.
 */
export function approveLine(lineId: number, body: ProcessLineRequest = {}) {
  return api.post<ApproveLineResponse>(
    ENDPOINTS.approvalLines.approve(lineId),
    body,
  );
}

/**
 * 결재 반려. 이후 `WAITING` 단계는 전부 `CANCELED` 가 되고
 * 회차 · 결재 전체가 `REJECTED` 로 종료된다 (AP-056~058).
 */
export function rejectLine(lineId: number, body: ProcessLineRequest = {}) {
  return api.post<RejectLineResponse>(
    ENDPOINTS.approvalLines.reject(lineId),
    body,
  );
}

/**
 * 결재선 등록 · 수정. **전체 치환이다** —
 * 한 명만 바꿔도 전체 목록을 보내야 하고, 빠뜨린 사람은 삭제된다.
 */
export function setLines(
  approvalId: number,
  revisionId: number,
  body: SetLinesRequest,
) {
  return api.put<SetLinesResponse>(
    ENDPOINTS.approvals.lines(approvalId, revisionId),
    body,
  );
}
