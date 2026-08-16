/**
 * 입찰 공고 타입. (.ai/API.md 103~104 · `입찰 도메인 — 공통`)
 *
 * ⚠️ **공고 상태와 프로젝트 전환 여부는 다른 축이다.**
 *    `noticeStatus` 는 검토 상태(등록 · 제외)이고, 전환 여부는 `projectId` 로만 안다.
 *    한 배지로 합치면 제외된 공고가 전환된 것처럼 읽힌다.
 *
 * ⚠️ 사내 공지(`features/notice`)와 이름이 비슷하지만 **다른 도메인**이다.
 *    화면 경로가 `/notices` 인 것은 사이드바 카탈로그 코드가 `BIDDING` 이기 때문이다.
 */

/**
 * 공고 검토 상태. 목록 필터 · 배지에 쓴다.
 *
 * ⚠️ 수집된 공고는 `REGISTERED` 가 **아니라 `COLLECTED`** 다 (2026-08-11 실측 —
 *    `POST /bidding/notices` 응답). 초안 명세의 `REGISTERED` 를 쓰면 필터가 조용히 0건이 된다
 *    (스웨거상 `noticeStatus` 가 enum 이 아니라 `string` 이라 400 도 나지 않는다).
 * ℹ️ **직접 등록한 공고도 `COLLECTED`** 로 온다 — 등록 경로는 `sourceCode` 로 구분한다.
 */
export type NoticeStatus = 'COLLECTED' | 'DISMISSED';

/**
 * 정렬 기준.
 *
 * ⚠️ Spring Pageable 규약(`bidDeadlineAt,asc`)이 **아니다** — 자체 enum 이고,
 *    규약대로 보내면 400(`BIDDING_INVALID_NOTICE_QUERY`) 이 난다.
 *    서버 기본값은 `ANNOUNCED_DESC` (스웨거 확인).
 */
export type NoticeSort =
  'ANNOUNCED_DESC' | 'ANNOUNCED_ASC' | 'DEADLINE_ASC' | 'DEADLINE_DESC';

/** 공고 첨부파일 — 우리 저장소가 아니라 **원문 사이트 링크**다 (다운로드 API 가 없다) */
export interface NoticeAttachment {
  attachmentOrder: number;
  fileName: string;
  sourceUrl: string | null;
}

/** 공고 목록 한 줄 */
export interface BidNoticeListItem {
  noticeId: number;
  noticeName: string;
  noticeAgency: string;
  businessCategoryId: number | null;
  businessCategoryName: string | null;
  /** 기초금액. 자릿수가 커 화면에서 콤마를 넣어 그린다 */
  baseAmount: number | null;
  estimatedAmount: number | null;
  announcedAt: string | null;
  bidDeadlineAt: string | null;
  /**
   * 투찰 마감까지 남은 일수 — **서버 계산값**이다.
   * 프론트에서 다시 계산하지 않는다 (기준 시각이 어긋난다).
   */
  dDay: number | null;
  noticeStatus: NoticeStatus;
  /** 전환된 프로젝트 ID. `null` 이면 아직 전환되지 않았다 */
  projectId: number | null;
}

/** 목록 조회 조건. 전부 선택이고, 값이 있는 것만 쿼리에 싣는다 */
export interface NoticeListQuery {
  /** 공고일 시작 (`yyyy-MM-dd`) */
  startDate?: string;
  /** 공고일 종료 (`yyyy-MM-dd`) */
  endDate?: string;
  noticeAgency?: string;
  /** ⚠️ **단일** 선택이다 — 프로젝트 쪽 카테고리와 달리 멀티가 아니다 */
  businessCategoryId?: number;
  region?: string;
  deadlineSoon?: boolean;
  /** 공고명 검색어 */
  keyword?: string;
  noticeStatus?: NoticeStatus;
  sort?: NoticeSort;
  /** 0-based — 백엔드 페이징이 0부터 센다 */
  page?: number;
  size?: number;
}

/** 페이지 응답 공통 모양 (결재 · 알림과 같은 규약) */
export interface NoticePage<T> {
  content: T[];
  page: number;
  size: number;
  totalElements: number;
  totalPages: number;
}

/**
 * 공고 상세. (스웨거 기준 — 초안 명세와 다른 곳이 있다)
 *
 * ⚠️ **참여사(`participants`) 는 응답에 없다.** 초안 명세에는 있었지만 실제로는 오지 않는다.
 * ⚠️ 반대로 **첨부 목록(`attachments`) 은 온다** — 초안에는 `hasAttachment` 뿐이었다.
 */
export interface BidNoticeDetail {
  noticeId: number;
  externalId: string | null;
  /** 공고 차수. 없으면 빈 문자열로 오기도 한다 */
  noticeOrder: string | null;
  noticeName: string;
  /** 공고 유형 (`CONSTRUCTION` · `SERVICE` 등 수집 조건과 같은 축) */
  noticeType: string | null;
  /** 수집처가 준 원문 상태 — 우리 검토 상태(`noticeStatus`)와 다른 축이다 */
  externalNoticeStatus: string | null;
  noticeAgency: string;
  demandAgency: string | null;
  noticeStatus: NoticeStatus;
  dismissReason: string | null;
  projectId: number | null;

  /** 수집처 (예: `NARA` / `나라장터`) */
  sourceCode: string | null;
  sourceName: string | null;

  announcedAt: string | null;
  bidStartAt: string | null;
  questionDeadlineAt: string | null;
  applicationDeadlineAt: string | null;
  bidDeadlineAt: string | null;
  openingAt: string | null;
  dDay: number | null;

  baseAmount: number | null;
  estimatedAmount: number | null;
  /** 예정가격 변동 폭 **원문** (예: `-2% ~ +2%`) — 파싱하지 않고 그대로 보여준다 */
  priceRangeText: string | null;
  /** 투찰하한율 원문 (예: `87.745%`) */
  minimumBidRateText: string | null;

  /** 참가 자격 원문 */
  participationQualificationText: string | null;
  regionLimitText: string | null;
  businessLimitText: string | null;
  /** 공동수급 허용 여부. 수집처가 안 주면 `null` 이라 `false` 와 구분해 그린다 */
  jointContractAllowed: boolean | null;
  jointContractText: string | null;
  contractMethod: string | null;
  evaluationMethod: string | null;
  /** 공고 원문 URL */
  sourceUrl: string | null;
  hasAttachment: boolean;
  /** 첨부 목록. `hasAttachment` 가 true 여도 빈 배열일 수 있어 길이로 판단한다 */
  attachments: NoticeAttachment[];
}

/* ─────────────────── 공고 직접 등록 · 수정 ─────────────────── */

/**
 * 공고 유형. **실측된 값만 적는다** — 스웨거가 enum 전체를 주지 않는다
 * (수집 조건 `noticeTypes` 와 같은 축이고 `CONSTRUCTION` · `SERVICE` 확인).
 */
export type NoticeTypeCode = 'CONSTRUCTION' | 'SERVICE' | (string & {});

/**
 * 등록할 첨부 — **파일 업로드가 아니라 원문 URL 등록**이다.
 * (`files` 도메인과 무관하고 우리 저장소에 올라가지 않는다)
 */
export interface NoticeAttachmentInput {
  fileName: string;
  sourceUrl: string;
}

/**
 * 공고 직접 등록 본문 (`POST /bidding/notices`).
 *
 * ⚠️ 일시는 모두 `yyyy-MM-ddTHH:mm:ss` — 오프셋을 붙이지 않는다.
 *    `<input type="datetime-local">` 값은 초가 없어 전송 직전에 `:00` 을 붙인다.
 * ℹ️ 필수 항목이 스웨거에 표시되지 않아 **공고명 · 공고 유형 · 발주처만 화면에서 필수**로 둔다
 *    (400 `BIDDING_INVALID_MANUAL_NOTICE` 가 나면 여기 기준을 고친다).
 */
export interface CreateNoticeRequest {
  noticeName: string;
  noticeType: NoticeTypeCode;
  noticeAgency: string;
  demandAgency: string | null;
  internationalBidType: 'DOMESTIC' | (string & {});
  announcedAt: string | null;
  bidStartAt: string | null;
  bidDeadlineAt: string | null;
  openingAt: string | null;
  baseAmount: number | null;
  estimatedAmount: number | null;
  bidMethod: string | null;
  contractMethod: string | null;
  participationQualificationText: string | null;
  regionLimitText: string | null;
  businessLimitText: string | null;
  jointContractAllowed: boolean;
  /** 공동수급을 허용하지 않으면 `null` 로 보낸다 */
  jointContractText: string | null;
  evaluationMethod: string | null;
  sourceUrl: string | null;
  attachments: NoticeAttachmentInput[];
}

/**
 * 직접 등록 공고 수정 (`PATCH /bidding/notices/{noticeId}`).
 *
 * 보낸 필드만 바뀌는 부분 수정이지만 **`attachments` 는 예외로 통째로 교체**된다 —
 * 1개만 보내면 기존 첨부가 전부 사라진다.
 *
 * ⚠️ 수집 공고를 수정하면 409(`BIDDING_NOTICE_EDIT_NOT_ALLOWED`) 다.
 *    `sourceCode !== 'MANUAL'` 인 공고에는 수정 버튼을 노출하지 않는다.
 */
export type UpdateNoticeRequest = Partial<CreateNoticeRequest>;

/** 등록 · 수정 응답 — 상세와 같은 모양이라고 보고 `noticeId` 만 쓴다 */
export interface NoticeMutationResult {
  noticeId: number;
}

/* ─────────────────── 수집 조건 · 수집 실행 ─────────────────── */

/**
 * 자동 수집 주기. **실측된 값만 적는다** — 스웨거가 enum 전체를 주지 않는다
 * (`DAILY` · `WEEKDAYS` 확인). 모르는 값이 와도 화면이 깨지지 않게 `string` 을 함께 받는다.
 */
export type CollectionScheduleType = 'DAILY' | 'WEEKDAYS' | (string & {});

/**
 * 조회 기간 — 실행할 때마다 **얼마나 되돌아가 검색할지** (2026-08-15 백엔드 추가).
 *
 * ⚠️ 선택 필드다. 보내지 않으면 서버가 `ONE_WEEK` 으로 채운다.
 * ℹ️ 자동 수집이 자주 돌면 짧게, 가끔 몰아 보면 길게 잡는 것이 맞다 —
 *    길수록 매번 훑는 양이 늘어 수집이 느려진다.
 */
export type CollectionLookbackPeriod =
  | 'ONE_WEEK'
  | 'TWO_WEEKS'
  | 'ONE_MONTH'
  | (string & {});

export const COLLECTION_LOOKBACK_LABELS: Record<string, string> = {
  ONE_WEEK: '최근 1주 (7일)',
  TWO_WEEKS: '최근 2주 (14일)',
  ONE_MONTH: '최근 1개월 (30일)',
};

/**
 * 조회 기간 표기. **모르는 값은 원문 그대로 보여준다** —
 * 서버가 새 값(`THREE_MONTHS` 등)을 주기 시작했을 때 `최근 1주` 로 둘러대면
 * 0건 원인을 찾는 사람이 실제 설정과 다른 기간을 보고 판단하게 된다.
 */
export function lookbackLabel(period: CollectionLookbackPeriod | null | undefined) {
  if (!period) return COLLECTION_LOOKBACK_LABELS.ONE_WEEK;
  return COLLECTION_LOOKBACK_LABELS[period] ?? period;
}

/** 수집 조건의 필터. 통째로 교체되므로 부분 수정 대상이 아니다 */
export interface CollectionFilters {
  keywords: string[];
  /** 행정구역 코드 2자리 (예: `11` 서울 · `41` 경기) */
  regionCodes: string[];
  /**
   * 사업 카테고리 — **우리 `businessCategories` 와 같은 축이다** (2026-08-11 확인).
   *
   * ⚠️ 담는 값은 `categoryId` 가 아니라 **`code`(업무코드) 문자열**이다.
   *    공고 목록 필터는 `businessCategoryId`(숫자) 를 쓰므로 **같은 셀렉트라도 보내는 값이 다르다.**
   * ⚠️ `code` 는 선택 입력이라 `null` 인 카테고리가 있다 — 그런 항목은 조건에 넣을 수 없어
   *    셀렉트에서 걸러낸다.
   */
  industryCodes: string[];
  minimumEstimatedPrice: number | null;
  maximumEstimatedPrice: number | null;
  /** 마감된 공고 제외 */
  excludeClosed: boolean;
  internationalBidType: 'DOMESTIC' | (string & {});
}

/** 수집 조건 한 건 */
export interface CollectionCondition {
  conditionId: number;
  /** 수집처 코드 — **등록 후에는 바꿀 수 없다** */
  sourceCode: string;
  sourceName: string;
  conditionName: string;
  noticeTypes: string[];
  filters: CollectionFilters;
  /** 비활성 조건은 수동 수집이 400 이다 (`BIDDING_INACTIVE_COLLECTION_CONDITION`) */
  isActive: boolean;
  autoCollectionEnabled: boolean;
  /** ⚠️ 옛 조건에는 없을 수 있다 — 없으면 `ONE_WEEK` 로 본다 */
  lookbackPeriod?: CollectionLookbackPeriod | null;
  /** 자동 수집이 꺼져 있으면 스케줄 3개가 모두 null */
  scheduleType: CollectionScheduleType | null;
  /** ⚠️ 응답은 `HH:mm:ss`, 요청은 `HH:mm` 다 — 되돌려 보낼 때 잘라야 한다 */
  scheduledTime: string | null;
  timezone: string | null;
  /** 서버가 계산해서 준다 — 보내는 값이 아니다 */
  nextRunAt: string | null;
  lastScheduledAt: string | null;
  /** 한 번도 성공하지 않았으면 null */
  lastSuccessAt: string | null;
  lastCollectedCount: number | null;
  createdAt: string;
  updatedAt: string | null;
}

/**
 * 수집 조건 등록 본문.
 * ⚠️ `scheduleType` · `scheduledTime` · `timezone` 은 자동 수집을 끄면 `null` 로 보낸다.
 */
export interface CreateCollectionConditionRequest {
  sourceCode: string;
  conditionName: string;
  noticeTypes: string[];
  filters: CollectionFilters;
  isActive: boolean;
  autoCollectionEnabled: boolean;
  /** 서버는 생략을 허용하지만(기본 `ONE_WEEK`) 화면은 **항상 실어 보낸다** */
  lookbackPeriod: CollectionLookbackPeriod;
  scheduleType: CollectionScheduleType | null;
  /** `HH:mm` (응답 포맷과 다르다) */
  scheduledTime: string | null;
  timezone: string | null;
}

/** 수집 조건 수정 본문 — 등록과 같지만 `sourceCode` 가 없다 */
export type UpdateCollectionConditionRequest = Omit<
  CreateCollectionConditionRequest,
  'sourceCode'
>;

/** 수집 진행 상태. `COMPLETED` 라도 수집 건수가 0 일 수 있다 */
export type CollectionRunStatus =
  'PENDING' | 'PROCESSING' | 'COMPLETED' | 'FAILED';

/** 수동 수집 요청 응답 (`202`) — 결과는 `runId` 로 따로 물어야 한다 */
export interface CollectionRunAccepted {
  runId: number;
  runStatus: CollectionRunStatus;
  requestedAt: string;
}

/**
 * 수집 실행 결과.
 *
 * ⚠️ `COMPLETED` + `collectedCount: 0` 은 **실패가 아니다** —
 *    조건에 맞는 공고가 없었다는 뜻이라 `FAILED` 와 다르게 안내한다.
 */
export interface CollectionRun {
  runId: number;
  conditionId: number;
  /** 자동 수집은 `SCHEDULED` */
  triggerType: 'MANUAL' | 'SCHEDULED' | (string & {});
  runStatus: CollectionRunStatus;
  /**
   * 실제로 훑은 구간 (2026-08-15 백엔드 추가).
   *
   * ⭐ **0건일 때 가장 쓸모 있는 값**이다 — "어느 기간을 봤는지" 를 보여주면
   *    "왜 0건이지?" 라는 물음이 대부분 여기서 풀린다.
   * ⚠️ 옛 실행 기록에는 없을 수 있어 선택으로 둔다.
   */
  collectionStartedAt?: string | null;
  collectionEndedAt?: string | null;
  collectedCount: number;
  insertedCount: number;
  updatedCount: number;
  skippedCount: number;
  /** 실패 사유 (예: `all_collection_tasks_failed`). 성공이면 null */
  errorMessage: string | null;
  startedAt: string | null;
  finishedAt: string | null;
}

/* ────────────────────────── AI 요약 (BID-V1) ────────────────────────── */

/**
 * 요약 처리 상태. 수집 실행(`CollectionRunStatus`)과 값이 같지만 **다른 축**이라 따로 둔다.
 *
 * ⚠️ Python Worker 가 꺼져 있으면 `PENDING` 에서 영영 멈춘다 (장애가 아니라 미기동이다).
 *    화면은 폴링 상한을 두고 손을 놓되, 요약 자체는 서버에 남아 있으므로 이력에서 다시 볼 수 있다.
 */
export type SummaryStatus =
  | 'PENDING'
  | 'PROCESSING'
  | 'COMPLETED'
  | 'FAILED'
  | (string & {});

/** AI 요약 본문 6칸. 수정(PATCH)도 이 모양 그대로 보낸다 */
export interface SummarySections {
  overviewSummary: string | null;
  amountSummary: string | null;
  scheduleSummary: string | null;
  qualificationSummary: string | null;
  taskSummary: string | null;
  riskSummary: string | null;
}

/**
 * AI 요약 단건. (`GET /bidding/summaries/{summaryId}`)
 *
 * ℹ️ 같은 공고를 여러 번 요약할 수 있다 — `revisionNo` 가 차수고, 이전 요약을 딛고
 *    다시 요청하면 `parentSummaryId` 로 이어진다 (요청 본문의 `baseSummaryId`).
 * ⚠️ **확정(`confirmed`)되면 더 수정할 수 없다** — 수정은 `COMPLETED` + 미확정일 때만이다.
 */
export interface BidSummary extends SummarySections {
  summaryId: number;
  noticeId: number;
  /** 이 요약이 딛고 선 이전 요약. 최초 요청이면 null */
  parentSummaryId: number | null;
  revisionNo: number;
  /** 사용자가 입력한 요청 문구 — 결과와 함께 보여 무엇을 물었는지 남긴다 */
  prompt: string | null;
  summaryStatus: SummaryStatus;
  confirmed: boolean;
  /** 사번 */
  confirmedBy: string | null;
  confirmedAt: string | null;
  /** 이 요약으로 만들어진 프로젝트 */
  projectId: number | null;
  /** `FAILED` 일 때의 사유 */
  errorMessage: string | null;
  requestedAt: string;
  completedAt: string | null;
  updatedAt: string | null;
}

/** 요약 요청 본문 (`POST /bidding/notices/{noticeId}/summaries`) */
export interface CreateSummaryRequest {
  /** 사용자가 직접 쓴다 — 무엇을 정리해달라고 할지가 결과를 좌우한다 */
  prompt: string;
  /** 이전 요약을 딛고 다시 물을 때만. 없으면 처음부터 */
  baseSummaryId?: number;
}

/** 요약 요청 응답 (`202`) — 결과는 `summaryId` 로 폴링한다 */
export interface SummaryAccepted {
  summaryId: number;
  summaryStatus: SummaryStatus;
  requestedAt: string;
}

/** 확정 응답 (`PATCH /bidding/summaries/{summaryId}/confirm`) */
export interface SummaryConfirmed {
  summaryId: number;
  confirmed: boolean;
  confirmedBy: string;
  confirmedAt: string;
  /** 확정해야 이 공고로 프로젝트를 만들 수 있다 */
  projectCreationAllowed: boolean;
}

/**
 * 공고별 요약 이력. (`GET /bidding/notices/{noticeId}/summaries`)
 *
 * 내 요약과 **같은 회사에서 확정된 요약**이 최신순으로 온다.
 *
 * ⚠️ **스웨거의 `content[]` 스키마가 잘못 붙어 있다** (2026-08-14 실측) —
 *    전공 목록(`majorId` · `employeeCount` · `deletable`)이 그대로 복사돼 있다.
 *    요약 목록이 그 모양일 리 없어 **단건(`BidSummary`)의 부분집합**으로 본다.
 *    실제 응답을 받아보고 어긋나면 여기부터 고친다.
 */
/**
 * 요약 이력 한 줄.
 *
 * ⚠️ **단건 조회(`BidSummary`) 와 다르다** — 여섯 칸 본문은 오지 않는다.
 *    본문이 필요하면 `summaryId` 로 단건을 다시 부른다.
 */
export interface SummaryHistoryItem {
  summaryId: number;
  parentSummaryId: number | null;
  revisionNo: number;
  summaryStatus: SummaryStatus;
  prompt: string | null;
  confirmed: boolean;
  /** 내가 요청한 것인지 — 남의 확정 요약도 함께 온다 */
  isMine: boolean;
  projectId: number | null;
  requestedAt: string;
  confirmedAt: string | null;
  completedAt?: string | null;
}

export interface SummaryHistory {
  /** 내가 마지막으로 요청한 요약 — 화면이 기본으로 펼칠 대상이다 */
  latestMySummaryId: number | null;
  content: SummaryHistoryItem[];
  totalElements: number;
  totalPages: number;
  page: number;
  size: number;
}

/* ────────────────────────── AI 문서 검토 (BID-V1) ────────────────────────── */

/** 검토 처리 상태. `ABANDONED` 는 사용자가 끝낸 것이라 실패가 아니다 */
export type ReviewStatus =
  | 'PENDING'
  | 'PROCESSING'
  | 'COMPLETED'
  | 'FAILED'
  | 'ABANDONED'
  | (string & {});

/**
 * 검토에 들어간 문서 하나가 어디서 왔는지.
 *
 * 셋 중 **하나만** 채워진다 — `documentRole` 로 어느 ID 를 볼지 정한다.
 */
export type DocumentRole =
  | 'BID_ATTACHMENT'
  | 'INTERNAL_REFERENCE'
  | (string & {});

/** 검토 화면에서 고를 공고 첨부 (`GET .../review-sources`) */
export interface ReviewAttachment {
  attachmentId: number;
  fileName: string;
  /** 수집처 (`NARA` 등) */
  sourceType: string | null;
  /**
   * AI 가 읽을 수 있는 형식인지.
   *
   * ⚠️ `false` 면 **고를 수 없다** — 보내면 422 `BIDDING_REVIEW_UNSUPPORTED_FILE` 이다.
   *    목록에서 감추지는 않는다. 첨부가 있는데 안 보이면 빠진 줄 안다.
   */
  supported: boolean;
}

export interface ReviewSources {
  noticeId: number;
  attachments: ReviewAttachment[];
}

/** 검토에 실제로 들어간 문서 */
export interface ReviewDocument {
  documentRole: DocumentRole;
  bidAttachmentId: number | null;
  referenceFileId: number | null;
  companyDocumentVersionId: number | null;
  fileName: string;
  /** 임시 저장소 준비 상태 */
  processingStatus: string | null;
}

/**
 * 결과가 어느 문서 어디를 근거로 삼았는지.
 * 화면은 이걸 **결과 아래 출처**로 보여준다 — AI 말만 있고 근거가 없으면 검증할 수 없다.
 */
export interface ReviewCitation {
  rankOrder: number;
  documentRole: DocumentRole;
  bidAttachmentId: number | null;
  referenceFileId: number | null;
  companyDocumentVersionId: number | null;
  fileName: string;
  /** PDF 면 페이지, 엑셀이면 시트 — 형식에 따라 한쪽만 온다 */
  pageNumber: number | null;
  sheetName: string | null;
  excerpt: string | null;
}

/** 검토 단건 (`GET /bidding/reviews/{reviewId}`) */
export interface BidReview {
  reviewId: number;
  noticeId: number;
  prompt: string | null;
  reviewStatus: ReviewStatus;
  /** 완료 시 본문. 요약과 달리 **칸이 나뉘지 않은 한 덩어리 글**이다 */
  result: string | null;
  errorMessage: string | null;
  requestedAt: string;
  completedAt: string | null;
  /**
   * 임시 파일이 지워지는 시각.
   * ⚠️ 프로젝트로 전환하지 않으면 **3시간 뒤 자동 삭제**된다 — 화면이 미리 알린다.
   */
  expiresAt: string | null;
  projectId: number | null;
  documents: ReviewDocument[];
  citations: ReviewCitation[];
}

/** 검토 이력 한 줄 (`GET /bidding/notices/{noticeId}/reviews`) — 최대 20건 */
export interface ReviewHistoryItem {
  reviewId: number;
  reviewStatus: ReviewStatus;
  prompt: string | null;
  requestedAt: string;
  completedAt: string | null;
  expiresAt: string | null;
  projectId: number | null;
}

/**
 * 검토 요청 본문.
 *
 * ⚠️ 세 목록 모두 **선택**이지만 하나도 안 고르면 비교할 것이 없어 400 이다.
 * ℹ️ `referenceFileIds` 는 입찰 기준자료(`/bidding/reference-files`)다 —
 *    그 화면이 아직 없어 지금은 항상 비어 있다.
 */
export interface CreateReviewRequest {
  bidAttachmentIds?: number[];
  referenceFileIds?: number[];
  /** 사내 문서는 **버전 ID** 로 고정해 넘긴다 */
  companyDocumentVersionIds?: number[];
  prompt: string;
}

/** 검토 요청 응답 (`202`) — 결과는 `reviewId` 로 폴링한다 */
export interface ReviewAccepted {
  reviewId: number;
  reviewStatus: ReviewStatus;
  requestedAt: string;
}

/** 검토 종료 응답 */
export interface ReviewAbandoned {
  reviewId: number;
  reviewStatus: ReviewStatus;
  abandonedAt: string;
}
