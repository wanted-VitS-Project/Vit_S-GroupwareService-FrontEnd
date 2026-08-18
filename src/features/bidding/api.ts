import { ENDPOINTS } from '@/constants/endpoints';
import { putToStorage } from '@/features/file/api';
import { api } from '@/lib/api';

import type {
  NoticeAttachmentUploadResult,
  NoticeAttachmentUploadStart,
  StartNoticeAttachmentUploadRequest,
  BidNoticeDetail,
  BidNoticeListItem,
  ConvertNoticeToProjectRequest,
  ConvertNoticeToProjectResult,
  BidReview,
  BidSummary,
  CreateReviewRequest,
  CreateSummaryRequest,
  ReviewAbandoned,
  ReviewAccepted,
  ReviewHistoryItem,
  ReviewSources,
  SummaryAccepted,
  SummaryConfirmed,
  SummaryHistory,
  SummarySections,
  CollectionCondition,
  CollectionRun,
  CollectionRunAccepted,
  CreateCollectionConditionRequest,
  AbandonSummaryResult,
  CreateNoticeRequest,
  DismissNoticeRequest,
  NoticeListQuery,
  NoticeMutationResult,
  NoticePage,
  NoticeStatusResult,
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
    favorite,
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
  // 켰을 때만 싣는다 — `false` 는 `관심 아닌 것만` 이 아니라 조건 없음이다
  if (favorite) params.set('favorite', 'true');
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

/* ─────────────────── 관심 · 제외 · 복구 ─────────────────── */

/**
 * 공고 **관심 등록** (입찰 `EDITOR`).
 *
 * ⚠️ 개인 즐겨찾기가 아니라 **회사 공용**이다 — 누가 눌러도 회사 전원 화면에서 함께 켜진다.
 * ℹ️ 네 API 모두 바뀐 뒤의 상태를 그대로 돌려준다 — 목록을 다시 읽지 않고 그 줄만 갱신한다.
 */
export function favoriteNotice(noticeId: number | string, signal?: AbortSignal) {
  return api.patch<NoticeStatusResult>(
    ENDPOINTS.bidding.noticeFavorite(noticeId),
    undefined,
    signal,
  );
}

/** 공고 관심 해제 (입찰 `EDITOR`) */
export function unfavoriteNotice(
  noticeId: number | string,
  signal?: AbortSignal,
) {
  return api.patch<NoticeStatusResult>(
    ENDPOINTS.bidding.noticeUnfavorite(noticeId),
    undefined,
    signal,
  );
}

/**
 * 공고 **제외** — 검토 대상에서 뺀다 (`noticeStatus: DISMISSED`).
 *
 * ⚠️ 사유(`reason`)가 **필수**다. 상세 화면이 사유를 그대로 보여 주므로
 *    무엇 때문에 뺐는지가 나중에 남는다.
 */
export function dismissNotice(
  noticeId: number | string,
  body: DismissNoticeRequest,
  signal?: AbortSignal,
) {
  return api.patch<NoticeStatusResult>(
    ENDPOINTS.bidding.noticeDismiss(noticeId),
    body,
    signal,
  );
}

/** 제외한 공고를 되돌린다 (`noticeStatus: COLLECTED`) — 본문이 없다 */
export function restoreNotice(noticeId: number | string, signal?: AbortSignal) {
  return api.patch<NoticeStatusResult>(
    ENDPOINTS.bidding.noticeRestore(noticeId),
    undefined,
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
    /**
     * ⚠️ 통째로 교체라 **이것도 반드시 실어야 한다** — 빠뜨리면 활성 토글 한 번에
     *    조회 기간이 서버 기본값(`ONE_WEEK`)으로 되돌아간다.
     * ⚠️ 옛 조건에는 값이 없어 기본값으로 채운다.
     */
    lookbackPeriod: condition.lookbackPeriod ?? 'ONE_WEEK',
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

/* ────────────────────────── AI 요약 ────────────────────────── */

/**
 * AI 요약 요청. **202 로 접수만 되고 결과는 없다** — `getSummary()` 를 폴링한다.
 *
 * `baseSummaryId` 를 주면 그 요약을 딛고 다시 묻는다 (차수가 오른다).
 * ⚠️ 같은 공고에 이미 진행 중인 요약이 있으면 409 `BIDDING_SUMMARY_ALREADY_PROCESSING`.
 */
export function requestSummary(
  noticeId: number | string,
  body: CreateSummaryRequest,
  signal?: AbortSignal,
) {
  return api.post<SummaryAccepted>(
    ENDPOINTS.bidding.noticeSummaries(noticeId),
    body,
    signal,
  );
}

/** 요약 단건 — 폴링 대상이다 (`PENDING` · `PROCESSING` 동안 다시 부른다) */
export function getSummary(summaryId: number | string, signal?: AbortSignal) {
  return api.get<BidSummary>(ENDPOINTS.bidding.summary(summaryId), signal);
}

/**
 * 공고별 요약 이력 — 내 요약 + 같은 회사에서 **확정된** 요약이 최신순으로 온다.
 * 화면을 다시 열었을 때 `latestMySummaryId` 로 이어서 볼 수 있다.
 */
export function getNoticeSummaries(
  noticeId: number | string,
  signal?: AbortSignal,
) {
  return api.get<SummaryHistory>(
    ENDPOINTS.bidding.noticeSummaries(noticeId),
    signal,
  );
}

/**
 * 요약 본문 수정. **보낸 칸만 바뀐다.**
 *
 * ⚠️ `COMPLETED` + **미확정**이고 **요청자 본인**일 때만 된다 —
 *    아니면 409 `BIDDING_SUMMARY_NOT_EDITABLE`.
 */
export function updateSummary(
  summaryId: number | string,
  body: Partial<SummarySections>,
  signal?: AbortSignal,
) {
  return api.patch<BidSummary>(
    ENDPOINTS.bidding.summary(summaryId),
    body,
    signal,
  );
}

/**
 * 요약 확정. **되돌릴 수 없고** 확정 후에는 수정이 막힌다.
 * 확정해야 이 공고로 프로젝트를 만들 수 있다 (`projectCreationAllowed`).
 */
export function confirmSummary(
  summaryId: number | string,
  signal?: AbortSignal,
) {
  return api.patch<SummaryConfirmed>(
    ENDPOINTS.bidding.summaryConfirm(summaryId),
    undefined,
    signal,
  );
}

/**
 * AI 요약 **중단** (2026-08-18 신설).
 *
 * 검토의 `abandonReview()` 와 짝이다 — 예전에는 요약에 대응 API 가 없어 화면이
 * 잠금만 풀고 서버 작업은 그대로 돌게 두었다. 이제 서버에서도 끝낸다.
 */
export function abandonSummary(
  summaryId: number | string,
  signal?: AbortSignal,
) {
  return api.patch<AbandonSummaryResult>(
    ENDPOINTS.bidding.summaryAbandon(summaryId),
    undefined,
    signal,
  );
}

/* ────────────────────────── AI 문서 검토 ────────────────────────── */

/** 검토 화면에서 고를 공고 첨부 — `supported: false` 는 고를 수 없다 */
export function getReviewSources(
  noticeId: number | string,
  signal?: AbortSignal,
) {
  return api.get<ReviewSources>(
    ENDPOINTS.bidding.reviewSources(noticeId),
    signal,
  );
}

/**
 * AI 문서 검토 요청. **202 로 접수만 되고 결과는 없다** — `getReview()` 를 폴링한다.
 *
 * ⚠️ 이미 진행 중이면 409 `BIDDING_REVIEW_ALREADY_PROCESSING`,
 *    AI 가 못 읽는 형식이면 422 `BIDDING_REVIEW_UNSUPPORTED_FILE` 이다.
 */
export function requestReview(
  noticeId: number | string,
  body: CreateReviewRequest,
  signal?: AbortSignal,
) {
  return api.post<ReviewAccepted>(
    ENDPOINTS.bidding.noticeReviews(noticeId),
    body,
    signal,
  );
}

/** 검토 단건 — 폴링 대상이다 (결과 · 근거 인용 포함) */
export function getReview(reviewId: number | string, signal?: AbortSignal) {
  return api.get<BidReview>(ENDPOINTS.bidding.review(reviewId), signal);
}

/** 공고별 검토 이력 — 내가 요청한 것만 최신순 최대 20건 */
export function getNoticeReviews(
  noticeId: number | string,
  signal?: AbortSignal,
) {
  return (
    api
      .get<{ content: ReviewHistoryItem[] }>(
        ENDPOINTS.bidding.noticeReviews(noticeId),
        signal,
      )
      // ⚠️ `content` 가 빠져 와도 화면이 `history[0]` 에서 터지지 않게 빈 배열로 맞춘다
      .then((data) => data.content ?? [])
  );
}

/**
 * 검토 종료. 프로젝트로 전환하지 않은 검토의 **임시 파일 정리를 즉시** 요청한다.
 * 그냥 두어도 만료(`expiresAt`)되면 지워지므로 급히 부를 일은 아니다.
 */
export function abandonReview(reviewId: number | string, signal?: AbortSignal) {
  return api.patch<ReviewAbandoned>(
    ENDPOINTS.bidding.reviewAbandon(reviewId),
    undefined,
    signal,
  );
}

/**
 * 공고를 프로젝트로 전환한다. (`201`)
 *
 * ⚠️ 409 가 다섯 갈래다 — 이미 전환된 공고 · 검토 미완료 · 검토가 다른 프로젝트에 연결됨 ·
 *    요약 미확정 · 요약이 다른 프로젝트에 연결됨. 화면이 코드별로 다르게 안내한다.
 */
export function convertNoticeToProject(
  noticeId: number | string,
  body: ConvertNoticeToProjectRequest,
) {
  return api.post<ConvertNoticeToProjectResult>(
    ENDPOINTS.bidding.noticeProjects(noticeId),
    body,
  );
}

/* ─────────────── 공고 첨부 파일 업로드 ─────────────── */

/**
 * ① 업로드 시작 — presigned URL 을 받는다. (입찰 `EDITOR`)
 *
 * ⚠️ 공고를 먼저 만들어야 한다 — `noticeId` 가 경로에 들어간다.
 * ℹ️ 프로젝트 문서(37 · 38번)와 같은 2단계다: 발급 → 저장소 PUT → 완료 통보.
 */
export function startNoticeAttachmentUpload(
  noticeId: number | string,
  body: StartNoticeAttachmentUploadRequest,
  signal?: AbortSignal,
) {
  return api.post<NoticeAttachmentUploadStart>(
    ENDPOINTS.bidding.noticeAttachmentUploads(noticeId),
    body,
    signal,
  );
}

/**
 * ③ 완료 통보. **이 호출이 빠지면 첨부가 목록에 나오지 않는다** —
 * 저장소에 파일은 올라가 있어도 서버가 완료로 보지 않는다.
 */
export function completeNoticeAttachmentUpload(
  noticeId: number | string,
  attachmentId: number | string,
  signal?: AbortSignal,
) {
  return api.post<NoticeAttachmentUploadResult>(
    ENDPOINTS.bidding.noticeAttachmentUploadComplete(noticeId, attachmentId),
    {},
    signal,
  );
}

/**
 * 파일 하나를 끝까지 올린다 (발급 → PUT → 완료).
 *
 * 저장소로 나가는 PUT 은 우리 API 래퍼를 쓰지 않는다 — 파일 도메인의 `putToStorage` 를
 * 그대로 빌려 쓴다 (세션 쿠키를 실으면 안 되고 응답도 우리 봉투가 아니다).
 */
export async function uploadNoticeAttachment(
  noticeId: number | string,
  file: File,
  /**
   * 세 단계에 그대로 넘긴다 — 첨부는 최대 10개가 **차례로** 올라가서,
   * 화면을 떠난 뒤에도 남은 파일이 계속 올라가면 기다림만 길어진다.
   */
  signal?: AbortSignal,
) {
  const { attachmentId, uploadUrl } = await startNoticeAttachmentUpload(
    noticeId,
    {
      fileName: file.name,
      // 브라우저가 확장자를 못 알아보는 파일이 있다 — 서버가 판단하도록 기본값을 준다
      mimeType: file.type || 'application/octet-stream',
      sizeBytes: file.size,
    },
    signal,
  );

  await putToStorage(uploadUrl, file, signal);

  return completeNoticeAttachmentUpload(noticeId, attachmentId, signal);
}
