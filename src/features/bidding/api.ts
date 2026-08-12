import { ENDPOINTS } from '@/constants/endpoints';
import { api } from '@/lib/api';

import type {
  BidNoticeDetail,
  BidNoticeListItem,
  CollectionCondition,
  CollectionRun,
  CollectionRunAccepted,
  CreateCollectionConditionRequest,
  CreateNoticeRequest,
  NoticeListQuery,
  NoticeMutationResult,
  NoticePage,
  UpdateCollectionConditionRequest,
  UpdateNoticeRequest,
} from './types';

/**
 * 쿼리 문자열을 만든다.
 *
 * 빈 값을 실어 보내면 백엔드가 **그 빈 값으로 검색**해 결과가 0건이 된다 —
 * 값이 있는 조건만 싣는다. `deadlineSoon` 은 켰을 때만 보낸다 (`false` 는 무조건이 아니다).
 */
function toSearch(query: NoticeListQuery) {
  const params = new URLSearchParams();

  const {
    startDate,
    endDate,
    noticeAgency,
    businessCategoryId,
    region,
    deadlineSoon,
    keyword,
    noticeStatus,
    sort,
    page,
    size,
  } = query;

  if (startDate) params.set('startDate', startDate);
  if (endDate) params.set('endDate', endDate);
  if (noticeAgency) params.set('noticeAgency', noticeAgency);
  if (businessCategoryId !== undefined) {
    params.set('businessCategoryId', String(businessCategoryId));
  }
  if (region) params.set('region', region);
  if (deadlineSoon) params.set('deadlineSoon', 'true');
  if (keyword) params.set('keyword', keyword);
  if (noticeStatus) params.set('noticeStatus', noticeStatus);
  if (sort) params.set('sort', sort);
  // 0 페이지는 유효한 값이라 `if (page)` 로 거르면 안 된다
  if (page !== undefined) params.set('page', String(page));
  if (size !== undefined) params.set('size', String(size));

  const search = params.toString();
  return search ? `?${search}` : '';
}

/**
 * 입찰 공고 목록 (입찰 `VIEWER` · `EDITOR`).
 * 현재 회사가 수집한 공고만 온다 — 프론트가 회사로 거르지 않는다.
 */
export function getNotices(query: NoticeListQuery = {}, signal?: AbortSignal) {
  return api.get<NoticePage<BidNoticeListItem>>(
    `${ENDPOINTS.bidding.notices}${toSearch(query)}`,
    signal,
  );
}

/**
 * 입찰 공고 상세 (입찰 `VIEWER` · `EDITOR`).
 *
 * ℹ️ 첨부 **목록(`attachments`)이 함께 온다** — 초안 명세에는 `hasAttachment` 뿐이었다.
 *    `hasAttachment` 가 `true` 여도 배열이 비어 있을 수 있어 **길이로 판단**한다.
 */
export function getNoticeDetail(
  noticeId: number | string,
  signal?: AbortSignal,
) {
  return api.get<BidNoticeDetail>(ENDPOINTS.bidding.notice(noticeId), signal);
}

/**
 * 공고 직접 등록 (입찰 `EDITOR`).
 *
 * 수집으로 못 가져온 공고를 사람이 넣는다 — 등록해도 `noticeStatus` 는 `COLLECTED` 다
 * (등록 경로는 `sourceCode` 로 구분한다).
 *
 * ⚠️ 같은 공고를 두 번 넣으면 409(`BIDDING_MANUAL_NOTICE_DUPLICATED`) 다.
 */
export function createNotice(body: CreateNoticeRequest, signal?: AbortSignal) {
  return api.post<NoticeMutationResult>(
    ENDPOINTS.bidding.notices,
    body,
    signal,
  );
}

/**
 * 직접 등록 공고 수정 (입찰 `EDITOR`).
 *
 * ⚠️ `attachments` 만 부분 수정이 아니라 **전체 교체**다.
 * ⚠️ 수집 공고는 409(`BIDDING_NOTICE_EDIT_NOT_ALLOWED`) — 버튼 자체를 감춘다.
 */
export function updateNotice(
  noticeId: number | string,
  body: UpdateNoticeRequest,
  signal?: AbortSignal,
) {
  return api.patch<NoticeMutationResult>(
    ENDPOINTS.bidding.notice(noticeId),
    body,
    signal,
  );
}

/**
 * 수집 조건 목록 (입찰 `EDITOR`).
 *
 * ⚠️ 공고 목록과 달리 **페이징이 없다** — `content` 만 오고 `totalElements` · `page` 는 없다.
 *    최신 등록 순으로 현재 회사의 조건 전체가 온다.
 */
export function getCollectionConditions(signal?: AbortSignal) {
  return api.get<{ content: CollectionCondition[] }>(
    ENDPOINTS.bidding.collectionConditions,
    signal,
  );
}

/** 수집 조건 등록. `sourceCode` 는 여기서만 정한다 (수정으로는 못 바꾼다) */
export function createCollectionCondition(
  body: CreateCollectionConditionRequest,
  signal?: AbortSignal,
) {
  return api.post<CollectionCondition>(
    ENDPOINTS.bidding.collectionConditions,
    body,
    signal,
  );
}

/**
 * 조회한 조건을 그대로 되돌려 보낼 수정 본문으로 바꾼다.
 *
 * `PATCH` 가 **통째로 교체**라, 한 항목(예: 활성 여부)만 바꾸려 해도 나머지를 전부 실어야 한다.
 * ⚠️ `scheduledTime` 은 응답이 `HH:mm:ss`, 요청이 `HH:mm` 라 여기서 초를 뗀다.
 * ⚠️ `sourceCode` · `nextRunAt` 같은 서버 소유 값은 싣지 않는다.
 */
export function toUpdateRequest(
  condition: CollectionCondition,
): UpdateCollectionConditionRequest {
  return {
    conditionName: condition.conditionName,
    noticeTypes: condition.noticeTypes,
    filters: condition.filters,
    isActive: condition.isActive,
    autoCollectionEnabled: condition.autoCollectionEnabled,
    scheduleType: condition.scheduleType,
    scheduledTime: condition.scheduledTime?.slice(0, 5) ?? null,
    timezone: condition.timezone,
  };
}

/**
 * 수집 조건 수정.
 *
 * ⚠️ 부분 수정이 아니다 — `noticeTypes` · `filters` · 자동 수집 설정이 **통째로 교체**된다.
 *    조회값을 그대로 실어 보내되 `scheduledTime` 은 `HH:mm` 으로 잘라야 한다
 *    (응답은 `HH:mm:ss` 다).
 */
export function updateCollectionCondition(
  conditionId: number | string,
  body: UpdateCollectionConditionRequest,
  signal?: AbortSignal,
) {
  return api.patch<CollectionCondition>(
    ENDPOINTS.bidding.collectionCondition(conditionId),
    body,
    signal,
  );
}

/**
 * 수동 수집 요청. 본문이 없고 `202` 로 접수만 된다 — 결과는 `getCollectionRun()` 으로 받는다.
 *
 * ⚠️ 비활성 조건이면 400(`BIDDING_INACTIVE_COLLECTION_CONDITION`),
 *    이미 돌고 있으면 409(`BIDDING_COLLECTION_RUN_ALREADY_PROCESSING`) 다.
 *    409 는 오류가 아니라 **진행 중** 이라는 뜻이라 그렇게 안내한다.
 */
export function runCollection(
  conditionId: number | string,
  signal?: AbortSignal,
) {
  return api.post<CollectionRunAccepted>(
    ENDPOINTS.bidding.collectionRuns(conditionId),
    undefined,
    signal,
  );
}

/**
 * 수집 실행 결과. `PENDING` → `PROCESSING` 동안 폴링한다.
 *
 * ⚠️ 실행 이력 **목록** API 가 없어 화면을 떠나면 `runId` 를 되찾을 수 없다.
 * ⚠️ `COMPLETED` + `collectedCount: 0` 은 실패가 아니라 "조건에 맞는 공고 없음" 이다.
 */
export function getCollectionRun(runId: number | string, signal?: AbortSignal) {
  return api.get<CollectionRun>(ENDPOINTS.bidding.collectionRun(runId), signal);
}
