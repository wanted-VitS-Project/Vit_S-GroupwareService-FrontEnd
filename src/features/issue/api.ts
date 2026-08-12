import { ENDPOINTS } from '@/constants/endpoints';
import { api } from '@/lib/api';

import type {
  CreateIssueRequest,
  IssueDetail,
  IssueStatus,
  IssueStatusChanged,
  IssueSummary,
  ProjectIssuesResponse,
  UpdateIssueRequest,
} from './types';

/**
 * 스텝 이슈 목록. `blockId` 를 넘기면 그 블록에 연결된 이슈만 온다.
 * 응답이 `{ issues: [...] }` 로 한 겹 감싸져 있어 여기서 벗겨 반환한다.
 *
 * ⚠️ 상태 · 담당자 · 우선순위 · 제목 검색 · 정렬은 서버가 하지 않는다. (명세 55번)
 */
export function getStepIssues(
  stepId: number | string,
  options?: { blockId?: number; signal?: AbortSignal },
) {
  const path = ENDPOINTS.steps.issues(stepId);
  const query =
    options?.blockId === undefined ? '' : `?blockId=${options.blockId}`;

  return api
    .get<{ issues: IssueSummary[] }>(`${path}${query}`, options?.signal)
    .then((data) => data.issues);
}

/**
 * 프로젝트 전체 이슈 — 스텝별로 묶여 오고 진척도까지 함께 온다. (명세 108번)
 *
 * ⚠️ 스텝 목록(55번)과 달리 **페이징 · 필터가 아예 없다** — 프로젝트의 모든 이슈가 한 번에 온다.
 */
export function getProjectIssues(
  projectId: number | string,
  signal?: AbortSignal,
) {
  return api.get<ProjectIssuesResponse>(
    ENDPOINTS.projects.issues(projectId),
    signal,
  );
}

export function getIssue(issueId: number | string, signal?: AbortSignal) {
  return api.get<IssueDetail>(ENDPOINTS.issues.detail(issueId), signal);
}

/** 응답은 상세 조회와 같은 구조로 온다 */
export function createIssue(
  stepId: number | string,
  body: CreateIssueRequest,
  signal?: AbortSignal,
) {
  return api.post<IssueDetail>(ENDPOINTS.steps.issues(stepId), body, signal);
}

/**
 * 부분 수정. 보낸 필드만 반영된다.
 * `status` 는 여기서 못 바꾼다 — `updateIssueStatus()` 를 쓴다.
 *
 * ⚠️ **낙관적 락이다.** `body.version` 은 최초 조회값(`base`)의 버전이어야 하고,
 *    그 사이 남이 먼저 저장했으면 409 `ISSUE_VERSION_CONFLICT` 가 온다 —
 *    부르는 쪽이 최신값을 읽어 **자동 병합 또는 사용자 선택**으로 풀어야 한다.
 * ⚠️ 응답 `version` 은 **저장 후의 새 값**이라 화면 상태를 갈아끼워야 다음 저장이 통과한다.
 */
export function updateIssue(
  issueId: number | string,
  body: UpdateIssueRequest,
  signal?: AbortSignal,
) {
  return api.patch<IssueDetail>(ENDPOINTS.issues.detail(issueId), body, signal);
}

/**
 * 상태만 바꾼다. 상태 · 완료 시각도 **같은 `version` 조건**을 탄다.
 *
 * ⚠️ 같은 상태로 다시 보내면 서버는 아무것도 바꾸지 않지만, 버전이 어긋나 있으면
 *    그것도 409 다 — 부르는 쪽은 최신값을 읽어 카드를 맞춰야 한다.
 */
export function updateIssueStatus(
  issueId: number | string,
  status: IssueStatus,
  version: number,
  signal?: AbortSignal,
) {
  return api.patch<IssueStatusChanged>(
    ENDPOINTS.issues.status(issueId),
    { status, version },
    signal,
  );
}

/** soft delete — 담당자 · 블록은 남고 연결만 끊긴다. 응답 data 는 null */
export function deleteIssue(issueId: number | string, signal?: AbortSignal) {
  return api.delete<null>(ENDPOINTS.issues.detail(issueId), signal);
}

/**
 * 화면은 날짜만 받는데 **생성 API 만** `yyyy-MM-ddTHH:mm:ss` 를 요구한다.
 * (수정 · 조회는 `YYYY-MM-DD`) — 백엔드 확인 후 형식이 통일되면 이 함수를 지운다.
 */
export function toCreateDueDate(date: string) {
  return date ? `${date}T00:00:00` : undefined;
}
