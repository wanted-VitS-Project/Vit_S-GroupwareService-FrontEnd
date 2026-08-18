import { ENDPOINTS } from '@/constants/endpoints';
import { api } from '@/lib/api';

import type {
  CalendarIssue,
  CreateIssueRequest,
  IssueDetail,
  IssueStatus,
  IssueStatusChanged,
  IssueSummary,
  ProjectIssuesResponse,
  UpdateIssueRequest,
} from './types';

// 스텝 이슈 목록. blockId 를 넘기면 그 블록에 연결된 이슈만 온다.
// 응답이 { issues: [...] } 로 한 겹 감싸져 있어 여기서 벗겨 반환한다.
// 상태·담당자·우선순위·제목 검색·정렬은 서버가 하지 않는다.
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

// 프로젝트 전체 이슈 — 스텝별로 묶여 오고 진척도까지 함께 온다.
// 스텝 목록과 달리 페이징·필터가 아예 없다 — 프로젝트의 모든 이슈가 한 번에 온다.
export function getProjectIssues(
  projectId: number | string,
  signal?: AbortSignal,
) {
  return api.get<ProjectIssuesResponse>(
    ENDPOINTS.projects.issues(projectId),
    signal,
  );
}

// 담당 이슈 캘린더 — 로그인 사용자가 담당인 미완료 이슈 전체.
// 기간 파라미터가 없어 한 번에 다 받아 두고 월 이동은 화면에서 거른다.
export function getIssueCalendar(signal?: AbortSignal) {
  return api
    .get<{ issues: CalendarIssue[] }>(ENDPOINTS.issues.calendar, signal)
    .then((data) => data.issues);
}

export function getIssue(issueId: number | string, signal?: AbortSignal) {
  return api.get<IssueDetail>(ENDPOINTS.issues.detail(issueId), signal);
}

// 이슈 생성. 응답은 상세 조회와 같은 구조로 온다.
export function createIssue(
  stepId: number | string,
  body: CreateIssueRequest,
  signal?: AbortSignal,
) {
  return api.post<IssueDetail>(ENDPOINTS.steps.issues(stepId), body, signal);
}

// 이슈 부분 수정. 보낸 필드만 반영되고 status 는 updateIssueStatus() 로 따로 바꾼다.
// 낙관적 락이다 — body.version 은 최초 조회값의 버전이어야 하고, 그 사이 남이 저장했으면
// 409 ISSUE_VERSION_CONFLICT 가 온다. 응답 version 은 저장 후의 새 값이라
// 화면 상태를 갈아끼워야 다음 저장이 통과한다.
export function updateIssue(
  issueId: number | string,
  body: UpdateIssueRequest,
  signal?: AbortSignal,
) {
  return api.patch<IssueDetail>(ENDPOINTS.issues.detail(issueId), body, signal);
}

// 상태만 바꾼다. 상태·완료 시각도 updateIssue 와 같은 version 조건을 탄다.
// 같은 상태로 다시 보내도 버전이 어긋나 있으면 409 다 — 부르는 쪽이 최신값을 읽어 카드를 맞춘다.
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

// soft delete — 담당자·블록은 남고 연결만 끊긴다. 응답 data 는 null.
export function deleteIssue(issueId: number | string, signal?: AbortSignal) {
  return api.delete<null>(ENDPOINTS.issues.detail(issueId), signal);
}

// 생성 API 만 yyyy-MM-ddTHH:mm:ss 를 요구한다 (수정·조회는 YYYY-MM-DD).
// 백엔드에서 형식이 통일되면 이 함수를 지운다.
export function toCreateDueDate(date: string) {
  return date ? `${date}T00:00:00` : undefined;
}
