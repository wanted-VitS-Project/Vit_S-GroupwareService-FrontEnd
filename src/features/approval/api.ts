import { ENDPOINTS } from '@/constants/endpoints';
import { api } from '@/lib/api';

import type {
  AddDocumentRequest,
  ApprovalDocument,
  ApprovalRevision,
  CreateRevisionResponse,
  SetLinesRequest,
  SetLinesResponse,
  SubmitRevisionResponse,
  UpdateRevisionRequest,
  UpdateRevisionResponse,
} from './types';

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
