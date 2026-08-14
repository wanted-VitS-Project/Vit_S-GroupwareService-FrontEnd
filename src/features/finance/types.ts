/**
 * 재무 관리 요약 (`GET /finance/summary`).
 *
 * 집계 기준이 항목마다 다르다 —
 * 입출금 내역 · 세금계산서는 **개별 행**, 정산 현황은 **진행 중 프로젝트**를 센다.
 *
 * ⚠️ 정산 현황만 두 번째 수치가 `totalCount` 가 아니라 **`inProgressCount`** 다
 *    (2026-08-12 스웨거 실측). 셋을 한 타입으로 묶지 않는 이유다.
 */
export interface FinanceSummary {
  cashFlow: FinanceSummaryCount;
  taxInvoice: FinanceSummaryCount;
  settlement: SettlementSummaryCount;
}

/** 입출금 내역 · 세금계산서 요약 */
export interface FinanceSummaryCount {
  /** 아직 정산 블록에 연결되지 않은 건수 */
  unlinkedCount: number;
  totalCount: number;
}

/** 정산 현황 요약 — 두 번째 수치가 전체가 아니라 진행 중 프로젝트 수다 */
export interface SettlementSummaryCount {
  /** 미연결 정산 블록 개수 */
  unlinkedCount: number;
  /** 상태가 완료 · 종료가 아닌 프로젝트 개수 */
  inProgressCount: number;
}

/** 입출금 구분 */
export type CashFlowType = 'INCOME' | 'OUTCOME';

export const CASH_FLOW_TYPE_LABELS: Record<CashFlowType, string> = {
  INCOME: '입금',
  OUTCOME: '출금',
};

/**
 * 수집 출처.
 *
 * ⚠️ **수정 가능 범위를 가르는 값**이다 — `CSV` · `API` 로 들어온 건은 적요(메모)만 고칠 수 있다.
 *    직접 등록(`MANUAL`)이면서 미매칭인 건만 전체 수정이 된다.
 */
export type CashFlowSource = 'MANUAL' | 'CSV' | 'API';

export const CASH_FLOW_SOURCE_LABELS: Record<CashFlowSource, string> = {
  MANUAL: '직접 등록',
  CSV: 'CSV',
  API: '외부 API',
};

/**
 * 정산 블록 연결 상태 (2026-08-10 백엔드 추가 — 원 명세엔 없던 필드).
 *
 * ⚠️ `LINK_BLOCK_DELETED` 는 **연결됐던 블록이 지워진** 상태다.
 *    `settleId` · `roundName` 은 값이 남아 있으므로 이 필드로만 구분된다.
 */
export type CashFlowLinkStatus = 'UNLINKED' | 'LINKED' | 'LINK_BLOCK_DELETED';

export const CASH_FLOW_LINK_STATUS_LABELS: Record<CashFlowLinkStatus, string> =
  {
    UNLINKED: '미연결',
    LINKED: '연결됨',
    LINK_BLOCK_DELETED: '블록 삭제됨',
  };

/**
 * 입출금 내역 목록 행 (`GET /finance/cash-flows`, 2026-08-12 스웨거 실측).
 *
 * ⚠️ **거래 후 잔액 · 은행명은 목록에 없다.** CSV 매핑에는 잔액 항목이 있지만
 *    목록 응답으로는 내려오지 않는다 — 열을 만들 수 없다.
 */
export interface CashFlowItem {
  cashFlowId: number;
  /** 거래 일시 — `2026-07-15T10:30:00` (ISO, `T` 구분자) */
  tradedAt: string;
  /** 거래고유번호 — 은행명 + 거래일시로 자동 생성된다 */
  bankTxnId: string;
  type: CashFlowType;
  /** 거래 금액. 구분과 별개로 양수로 온다 */
  amount: number;
  /** 입금자명 · 수취인명 */
  depositorName: string;
  /** 적요 · 통장 메모 */
  bankMemo: string | null;
  sourceType: CashFlowSource;
  /** 미연결이거나 프로젝트가 삭제됐으면 `null` */
  projectId: number | null;
  projectName: string | null;
  /** ⚠️ 블록이 삭제돼도 값이 남는다 — 연결 여부는 `linkStatus` 로 판단한다 */
  settleId: number | null;
  /** 정산 블록명(회차명) */
  roundName: string | null;
  /** 매칭 처리자 사번 */
  linkedBy: string | null;
  linkedByName: string | null;
  linkedAt: string | null;
  /** 연결 대상에서 제외된 건 (프로젝트와 무관한 거래) */
  isExcluded: boolean;
  linkStatus: CashFlowLinkStatus;
}

/**
 * 목록 응답.
 *
 * ⚠️ **페이징이 없다** — `content` · `totalElements` 가 아니라 배열 하나다.
 *    화면에서 페이지네이션을 붙이지 않는다 (붙이려면 백엔드부터 바뀌어야 한다).
 */
export interface CashFlowListResponse {
  cashFlows: CashFlowItem[];
}

/**
 * 목록 조회 조건. 값이 있는 것만 쿼리로 나간다.
 *
 * ⚠️ **구분(`type`) · 출처(`sourceType`) 필터는 서버에 없다** (2026-08-12 실측).
 *    필요하면 받아온 목록에서 화면이 직접 거른다.
 */
export interface CashFlowListQuery {
  /** `tradedAt` 날짜 기준 `yyyy-MM-dd` */
  startDate?: string;
  endDate?: string;
  /** 미연결만 보기 — 켰을 때만 보낸다 (없으면 전체) */
  unlinked?: boolean;
  /** 매칭 프로젝트 필터 */
  projectId?: number;
  /** 적요 또는 입금자명 검색 */
  keyword?: string;
}

/** 직접 등록 (`POST /finance/cash-flows`) — 저장되면 `sourceType` 은 `MANUAL` 이 된다 */
export interface CreateCashFlowRequest {
  bankName: string;
  /** `yyyy-MM-ddTHH:mm:ss` */
  tradedAt: string;
  type: CashFlowType;
  amount: number;
  depositorName: string;
  /** 적요 */
  memo: string | null;
}

/**
 * 수정 (`PATCH /finance/cash-flows/{id}`).
 *
 * ⚠️ **적요(`memo`) 외의 필드는 직접 등록 + 미연결 건에만 반영된다.**
 *    CSV · 외부 API 로 들어왔거나 이미 블록에 연결된 건은 서버가 나머지를 무시하므로
 *    화면에서도 입력을 막고 사유를 알린다.
 */
export type UpdateCashFlowRequest = Partial<CreateCashFlowRequest>;

/**
 * 다건 처리(삭제 · 연결 제외)에서 **처리되지 못한 건**.
 *
 * ⚠️ **부분 성공이 정상 동작이다.** 매칭된 건은 삭제 · 제외가 막혀 여기로 빠지고
 *    나머지는 그대로 처리된다. 성공/실패 두 갈래로 다루면 안 된다.
 */
export interface CashFlowSkippedItem {
  cashFlowId: number;
  /** 서버가 준 사유 문구를 그대로 보여준다 */
  reason: string;
}

/**
 * 매칭 추천 후보 (`GET /finance/cash-flows/{id}/match-candidates`).
 *
 * ⚠️ 후보는 프로젝트가 아니라 **정산 블록** 단위다. 최대 5건이고 추천 순으로 온다.
 */
export interface MatchCandidate {
  settleId: number;
  /** 정산 블록명(회차명) */
  roundName: string;
  projectName: string;
  plannedAmount: number;
  /** `yyyy-MM-dd` */
  plannedDate: string;
  /** 거래처명 */
  traderName: string;
  /** 추천 이유 — `["금액 일치", "상호명 일치"]` 처럼 온다 */
  matchTags: string[];
}

export interface MatchCandidateResponse {
  candidates: MatchCandidate[];
}

/** 필터 옵션 — 입출금이 연결된 정산 블록을 가진 프로젝트만 내려온다 */
export interface CashFlowFilterOptions {
  projects: ProjectOption[];
}

export interface ProjectOption {
  projectId: number;
  projectName: string;
}

/* ────────────────────────── CSV 업로드 (#13) ────────────────────────── */

/**
 * 일시 입력 방식.
 * `SINGLE` 은 `2026-07-15 10:30` 한 칸, `SEPARATE` 는 날짜 칸과 시간 칸이 나뉜 파일이다.
 */
export type CsvDateTimeMode = 'SINGLE' | 'SEPARATE';

/**
 * 금액 입력 방식.
 * `SINGLE_WITH_TYPE` 은 `금액` + `입출금 구분` 두 칸, `SEPARATE` 는 `입금액` · `출금액` 두 칸이다.
 */
export type CsvAmountMode = 'SINGLE_WITH_TYPE' | 'SEPARATE';

/**
 * 컬럼 매핑. **CSV 의 컬럼명**을 담는다 (값이 아니다).
 * 쓰지 않는 칸은 `null` — 방식(`mode`)에 따라 필요한 칸이 갈린다.
 */
export interface CsvColumnMapping {
  /** `SINGLE` 일 때 */
  tradedDateTimeColumn: string | null;
  /** `SEPARATE` 일 때 */
  tradedDateColumn: string | null;
  tradedTimeColumn: string | null;
  /** `SINGLE_WITH_TYPE` 일 때 */
  amountColumn: string | null;
  typeColumn: string | null;
  /** `SEPARATE` 일 때 */
  incomeAmountColumn: string | null;
  outcomeAmountColumn: string | null;
  /** 적요 · 입금자명 · 잔액은 있으면 좋고 없어도 된다 */
  memoColumn: string | null;
  depositorColumn: string | null;
  balanceColumn: string | null;
}

/** 미리보기 응답 (`POST /finance/cash-flows/csv/preview`) */
export interface CsvPreview {
  /** 파일에 있는 전체 컬럼명 */
  columns: string[];
  /** 은행명 셀렉트에 채울 목록 — 비어 있을 수 있어 직접 입력도 함께 둔다 */
  bankOptions: string[];
  /** 상위 5행 (컬럼명 → 값) */
  sampleRows: Record<string, string>[];
  recommendedDateTimeMode: CsvDateTimeMode;
  recommendedAmountMode: CsvAmountMode;
  recommendedMapping: CsvColumnMapping;
}

/**
 * 업로드 요청의 `request` 파트 — **JSON 문자열로 담아 보낸다** (파일과 함께 multipart).
 *
 * ⚠️ 이 모양은 **스웨거에 스키마가 없다** (`request: string` 으로만 적혀 있다).
 *    미리보기 응답의 키와 같은 이름을 쓴다고 보고 맞췄다 — 400 이 나면 여기부터 본다.
 */
export interface CsvUploadRequest extends CsvColumnMapping {
  bankName: string;
  dateTimeMode: CsvDateTimeMode;
  amountMode: CsvAmountMode;
  /** 비밀번호가 걸린 엑셀만 */
  password?: string;
}

/** 업로드 결과 (`POST /finance/cash-flows/csv`) */
export interface CsvUploadResult {
  totalRows: number;
  savedCount: number;
  /** 이미 등록된 거래라 건너뛴 건수 */
  duplicateCount: number;
  duplicateRows: CsvDuplicateRow[];
}

export interface CsvDuplicateRow {
  tradedAt: string;
  amount: number;
  /** 서버가 준 사유 문구를 그대로 보여준다 */
  reason: string;
}

/* ---------------------------------------------------------------------------
 * 세금계산서 (#16 · #17) — `/finance/tax-invoices`
 * ------------------------------------------------------------------------- */

/** ⚠️ 입출금과 **같은 세 값**이라 라벨 · 배지를 그대로 쓴다 */
export type TaxInvoiceLinkStatus = CashFlowLinkStatus;

/**
 * 세금계산서 목록 행 (`GET /finance/tax-invoices`, 2026-08-14 스웨거 실측).
 *
 * ⚠️ 입출금 목록과 달리 **페이징이 있다** (`page` · `size`).
 * ⚠️ `issuedNo` 는 이름과 달리 **발행일**이다 (명세 설명 기준).
 */
export interface TaxInvoiceItem {
  taxId: number;
  /** 발행일 (이름이 `No` 지만 날짜다) */
  issuedNo: string;
  /** 중복 판정 기준 */
  approvalNo: string;
  type: TaxInvoiceType;
  /** 공급받는자 상호명 */
  buyerName: string;
  buyerBizNo: string;
  supplierBizNo: string | null;
  subBizNo: string | null;
  ceoName: string | null;
  itemName: string | null;
  supplyAmount: number;
  taxAmount: number;
  totalAmount: number;
  memo: string | null;
  /** 지금은 CSV 업로드로만 들어온다 */
  sourceType: string;
  /** ⚠️ 미연결이거나 **프로젝트가 삭제됐으면** null */
  projectId: number | null;
  projectName: string | null;
  /** ⚠️ 블록이 삭제돼도 값은 남는다 — 상태는 `linkStatus` 로 본다 */
  settleId: number | null;
  roundName: string | null;
  linkedBy: string | null;
  linkedByName: string | null;
  linkedAt: string | null;
  /** 연결 대상에서 뺀 건 — 미연결 건수에 잡히지 않는다 */
  isExcluded: boolean;
  linkStatus: TaxInvoiceLinkStatus;
}

/** ⚠️ 페이지 번호는 **0부터**다 (서버 기준 그대로 쓴다) */
export interface TaxInvoiceListQuery {
  startDate?: string;
  endDate?: string;
  /** 켰을 때만 보낸다 — `false` 는 '연결된 것만' 이 아니다 */
  unlinked?: boolean;
  projectId?: number;
  keyword?: string;
  page?: number;
  size?: number;
}

export interface TaxInvoiceListResponse {
  page: number;
  size: number;
  totalElements: number;
  totalPages: number;
  taxInvoices: TaxInvoiceItem[];
}

/** 삭제 · 제외에서 빠진 건 — **부분 성공이 정상**이다 */
export interface TaxInvoiceSkippedItem {
  taxId: number;
  reason: string;
}

/** 필터 옵션 — 세금계산서가 연결된 정산 블록을 가진 프로젝트만 내려온다 */
export interface TaxInvoiceFilterOptions {
  projects: ProjectOption[];
}

/* ---------------------------------------------------------------------------
 * 세금계산서 CSV 수집 (#16) — `POST /finance/tax-invoices/csv{,/preview}`
 * ------------------------------------------------------------------------- */

/**
 * 세금계산서 구분.
 *
 * ⚠️ 입출금(`CashFlowType`)과 **글자만 같고 뜻이 다르다** — 여기서는
 *    `INCOME` 이 **매출**(우리가 발행), `OUTCOME` 이 **매입**(우리가 수취)이다.
 *    한 타입으로 묶으면 라벨이 뒤섞이므로 따로 둔다.
 */
export type TaxInvoiceType = 'INCOME' | 'OUTCOME';

export const TAX_INVOICE_TYPE_LABELS: Record<TaxInvoiceType, string> = {
  INCOME: '매출',
  OUTCOME: '매입',
};

/**
 * 구분 배지 색.
 *
 * ⚠️ 입출금(`CASH_FLOW_TYPE_BADGE`)의 **파랑 · 빨강을 쓰지 않는다** — 거기서 빨강은
 *    '돈이 나간다' 는 뜻인데, 매입은 나가는 돈이 아니라 받은 계산서다. 색을 그대로
 *    가져오면 같은 빨강을 다른 뜻으로 읽게 된다.
 */
export const TAX_INVOICE_TYPE_BADGE: Record<TaxInvoiceType, string> = {
  INCOME: 'badge badge-blue',
  OUTCOME: 'badge badge-gray',
};

/**
 * 세금계산서 컬럼 매핑. **파일의 컬럼명**을 담는다 (값이 아니다).
 *
 * 앞의 8개는 필수, 뒤의 4개는 없어도 저장된다.
 * 쓰지 않는 칸은 `null` 로 정리해 보낸다.
 */
export interface TaxInvoiceCsvMapping {
  /** 중복 판정 기준 — 같은 승인번호는 다시 저장되지 않는다 */
  approvalNoColumn: string | null;
  issuedDateColumn: string | null;
  supplierBizNoColumn: string | null;
  buyerBizNoColumn: string | null;
  buyerNameColumn: string | null;
  supplyAmountColumn: string | null;
  taxAmountColumn: string | null;
  totalAmountColumn: string | null;
  /** 여기부터 선택 */
  itemNameColumn: string | null;
  ceoNameColumn: string | null;
  subBizNoColumn: string | null;
  memoColumn: string | null;
}

/** 미리보기 응답 (`POST /finance/tax-invoices/csv/preview`) */
export interface TaxInvoiceCsvPreview {
  /** 파일에 있는 전체 컬럼명 */
  columns: string[];
  /** 상위 5행 (컬럼명 → 값) */
  sampleRows: Record<string, string>[];
  /**
   * 파일을 보고 서버가 추측한 구분.
   *
   * ⚠️ `null` 로 온다 — 못 알아본 것이라 화면이 **매출로 단정하지 않고** 사람이 고르게 둔다.
   */
  recommendedType: TaxInvoiceType | null;
  recommendedMapping: TaxInvoiceCsvMapping;
}

/**
 * 업로드 요청의 `request` 파트 — **JSON 문자열로 담아 보낸다** (파일과 함께 multipart).
 *
 * ⚠️ 입출금과 마찬가지로 **스웨거에 스키마가 없다** (`request: string`).
 *    미리보기 응답의 키에 `type` 을 더한 모양으로 맞췄다 — 400 이 나면 여기부터 본다.
 */
export interface TaxInvoiceCsvUploadRequest extends TaxInvoiceCsvMapping {
  type: TaxInvoiceType;
  /** 비밀번호가 걸린 엑셀만 */
  password?: string;
}

/** 업로드 결과 (`POST /finance/tax-invoices/csv`) */
export interface TaxInvoiceCsvUploadResult {
  totalRows: number;
  savedCount: number;
  /** 이미 등록된 승인번호라 건너뛴 건수 */
  duplicateCount: number;
  duplicateRows: TaxInvoiceCsvDuplicateRow[];
}

/** ⚠️ 입출금(`거래일시` · `금액`)과 달리 **승인번호**로 어느 건인지 가린다 */
export interface TaxInvoiceCsvDuplicateRow {
  approvalNo: string;
  /** 서버가 준 사유 문구를 그대로 보여준다 */
  reason: string;
}
