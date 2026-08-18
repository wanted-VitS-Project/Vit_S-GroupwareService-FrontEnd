import type { ProjectStatusCode } from '@/constants/status';
import type { SettlementStatus } from '@/features/settlement/types';

/**
 * 재무 관리 요약. 집계 기준이 항목마다 달라 한 타입으로 묶지 않는다.
 * 입출금 · 세금계산서는 개별 행, 정산 현황은 진행 중 프로젝트를 센다.
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

/** 정산 현황 요약. 두 번째 수치는 전체가 아니라 진행 중 프로젝트 수다 */
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
 * 수집 출처. 수정 가능 범위를 가르는 값이다.
 * 직접 등록이면서 미매칭인 건만 전체 수정이 된다.
 */
export type CashFlowSource = 'MANUAL' | 'CSV' | 'API';

export const CASH_FLOW_SOURCE_LABELS: Record<CashFlowSource, string> = {
  MANUAL: '직접 등록',
  CSV: 'CSV',
  API: '외부 API',
};

/**
 * 정산 블록 연결 상태.
 * 블록이 지워져도 관련 값은 남으므로 연결 여부는 이 필드로만 구분한다.
 */
export type CashFlowLinkStatus = 'UNLINKED' | 'LINKED' | 'LINK_BLOCK_DELETED';

export const CASH_FLOW_LINK_STATUS_LABELS: Record<CashFlowLinkStatus, string> =
  {
    UNLINKED: '미연결',
    LINKED: '연결됨',
    LINK_BLOCK_DELETED: '블록 삭제됨',
  };

/**
 * 입출금 내역 목록 행.
 * 거래 후 잔액 · 은행명은 목록 응답에 없어 열을 만들 수 없다.
 */
export interface CashFlowItem {
  cashFlowId: number;
  /** 거래 일시 (ISO 형식) */
  tradedAt: string;
  /** 거래고유번호. 은행명 + 거래일시로 자동 생성된다 */
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
  /** 블록이 삭제돼도 값이 남으므로 연결 여부는 linkStatus 로 판단한다 */
  settleId: number | null;
  /** 정산 블록명(회차명) */
  roundName: string | null;
  /** 매칭 처리자 사번 */
  linkedBy: string | null;
  linkedByName: string | null;
  linkedAt: string | null;
  /** 연결 대상에서 제외된 건 */
  isExcluded: boolean;
  linkStatus: CashFlowLinkStatus;
}

/** 목록 응답. 페이징 없이 배열 하나가 온다 */
export interface CashFlowListResponse {
  page: number;
  size: number;
  totalElements: number;
  totalPages: number;
  cashFlows: CashFlowItem[];
}

/**
 * 목록 조회 조건. 값이 있는 것만 쿼리로 나간다.
 * 구분 · 출처 필터는 서버에 없어 화면이 직접 거른다.
 */
export interface CashFlowListQuery {
  /** 거래 일시 날짜 기준 */
  startDate?: string;
  endDate?: string;
  /** 미연결만 보기. 켰을 때만 보낸다 */
  unlinked?: boolean;
  /** 매칭 프로젝트 필터 */
  projectId?: number;
  /** 적요 또는 입금자명 검색 */
  keyword?: string;
  /** 0부터 센다 */
  page?: number;
  /** 기본 20 · 최대 100 */
  size?: number;
}

/** 직접 등록 요청. 저장되면 출처가 MANUAL 이 된다 */
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
 * 수정 요청. 적요 외의 필드는 직접 등록 + 미연결 건에만 반영된다.
 * 나머지는 서버가 무시하므로 화면에서도 입력을 막고 사유를 알린다.
 */
export type UpdateCashFlowRequest = Partial<CreateCashFlowRequest>;

/**
 * 다건 처리에서 처리되지 못한 건.
 * 부분 성공이 정상이라 성공 · 실패 두 갈래로 다루지 않는다.
 */
export interface CashFlowSkippedItem {
  cashFlowId: number;
  /** 서버가 준 사유 문구를 그대로 보여준다 */
  reason: string;
}

/** 매칭 추천 후보. 프로젝트가 아니라 정산 블록 단위로 최대 5건 온다 */
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
  /** 추천 이유 목록 */
  matchTags: string[];
}

export interface MatchCandidateResponse {
  candidates: MatchCandidate[];
}

/** 필터 옵션. 입출금이 연결된 프로젝트만 내려온다 */
export interface CashFlowFilterOptions {
  projects: ProjectOption[];
}

export interface ProjectOption {
  projectId: number;
  projectName: string;
}

/* ────────────────────────── CSV 업로드 (#13) ────────────────────────── */

/** 일시 입력 방식. 한 칸에 담긴 파일과 날짜 · 시간이 나뉜 파일을 구분한다 */
export type CsvDateTimeMode = 'SINGLE' | 'SEPARATE';

/** 금액 입력 방식. 금액 + 구분 두 칸인지, 입금액 · 출금액 두 칸인지 */
export type CsvAmountMode = 'SINGLE_WITH_TYPE' | 'SEPARATE';

/**
 * 컬럼 매핑. 값이 아니라 CSV 의 컬럼명을 담는다.
 * 방식에 따라 필요한 칸이 갈리며 쓰지 않는 칸은 null 이다.
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
  /** 여기부터는 없어도 되는 칸 */
  memoColumn: string | null;
  depositorColumn: string | null;
  balanceColumn: string | null;
}

/** 입출금 CSV 미리보기 응답 */
export interface CsvPreview {
  /** 파일에 있는 전체 컬럼명 */
  columns: string[];
  /** 은행명 선택지. 비어 있을 수 있어 직접 입력도 함께 둔다 */
  bankOptions: string[];
  /** 상위 5행 (컬럼명 → 값) */
  sampleRows: Record<string, string>[];
  recommendedDateTimeMode: CsvDateTimeMode;
  recommendedAmountMode: CsvAmountMode;
  recommendedMapping: CsvColumnMapping;
}

/**
 * 업로드 요청의 request 파트. JSON 문자열로 담아 파일과 함께 보낸다.
 * 명세에 스키마가 없어 미리보기 응답의 키에 맞춘 모양이다.
 */
export interface CsvUploadRequest extends CsvColumnMapping {
  bankName: string;
  dateTimeMode: CsvDateTimeMode;
  amountMode: CsvAmountMode;
  /** 비밀번호가 걸린 엑셀에만 쓴다 */
  password?: string;
}

/** 입출금 CSV 업로드 결과 */
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

/** 입출금과 같은 값이라 라벨 · 배지를 그대로 쓴다 */
export type TaxInvoiceLinkStatus = CashFlowLinkStatus;

/**
 * 세금계산서 목록 행. 입출금 목록과 달리 페이징이 있다.
 * issuedNo 는 이름과 달리 발행일이다.
 */
export interface TaxInvoiceItem {
  taxId: number;
  /** 발행일 */
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
  /** 미연결이거나 프로젝트가 삭제됐으면 null */
  projectId: number | null;
  projectName: string | null;
  /** 블록이 삭제돼도 값은 남으므로 상태는 linkStatus 로 본다 */
  settleId: number | null;
  roundName: string | null;
  linkedBy: string | null;
  linkedByName: string | null;
  linkedAt: string | null;
  /** 연결 대상에서 뺀 건. 미연결 건수에 잡히지 않는다 */
  isExcluded: boolean;
  linkStatus: TaxInvoiceLinkStatus;
}

/** 세금계산서 목록 조회 조건. 페이지 번호는 0부터다 */
export interface TaxInvoiceListQuery {
  startDate?: string;
  endDate?: string;
  /** 켰을 때만 보낸다. false 는 '연결된 것만' 이 아니다 */
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

/** 삭제 · 제외에서 빠진 건. 부분 성공이 정상이다 */
export interface TaxInvoiceSkippedItem {
  taxId: number;
  reason: string;
}

/** 필터 옵션. 세금계산서가 연결된 프로젝트만 내려온다 */
export interface TaxInvoiceFilterOptions {
  projects: ProjectOption[];
}

/* ---------------------------------------------------------------------------
 * 세금계산서 CSV 수집 (#16) — `POST /finance/tax-invoices/csv{,/preview}`
 * ------------------------------------------------------------------------- */

/**
 * 세금계산서 구분. 입출금과 글자만 같고 뜻이 다르다.
 * 여기서는 INCOME 이 매출, OUTCOME 이 매입이라 타입을 따로 둔다.
 */
export type TaxInvoiceType = 'INCOME' | 'OUTCOME';

export const TAX_INVOICE_TYPE_LABELS: Record<TaxInvoiceType, string> = {
  INCOME: '매출',
  OUTCOME: '매입',
};

/**
 * 구분 배지 색. 입출금 배지 색을 그대로 쓰지 않는다.
 * 같은 색이 다른 뜻으로 읽히는 것을 막기 위해서다.
 */
export const TAX_INVOICE_TYPE_BADGE: Record<TaxInvoiceType, string> = {
  INCOME: 'badge badge-blue',
  OUTCOME: 'badge badge-gray',
};

/**
 * 세금계산서 컬럼 매핑. 값이 아니라 파일의 컬럼명을 담는다.
 * 앞의 8개는 필수이고 나머지는 없어도 저장된다.
 */
export interface TaxInvoiceCsvMapping {
  /** 중복 판정 기준. 같은 승인번호는 다시 저장되지 않는다 */
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

/** 세금계산서 CSV 미리보기 응답 */
export interface TaxInvoiceCsvPreview {
  /** 파일에 있는 전체 컬럼명 */
  columns: string[];
  /** 상위 5행 (컬럼명 → 값) */
  sampleRows: Record<string, string>[];
  /** 서버가 추측한 구분. null 이면 사람이 직접 고른다 */
  recommendedType: TaxInvoiceType | null;
  recommendedMapping: TaxInvoiceCsvMapping;
}

/**
 * 업로드 요청의 request 파트. JSON 문자열로 담아 파일과 함께 보낸다.
 * 명세에 스키마가 없어 미리보기 응답의 키에 구분을 더한 모양이다.
 */
export interface TaxInvoiceCsvUploadRequest extends TaxInvoiceCsvMapping {
  type: TaxInvoiceType;
  /** 비밀번호가 걸린 엑셀만 */
  password?: string;
}

/** 세금계산서 CSV 업로드 결과 */
export interface TaxInvoiceCsvUploadResult {
  totalRows: number;
  savedCount: number;
  /** 이미 등록된 승인번호라 건너뛴 건수 */
  duplicateCount: number;
  duplicateRows: TaxInvoiceCsvDuplicateRow[];
}

/** 중복으로 건너뛴 행. 입출금과 달리 승인번호로 어느 건인지 가린다 */
export interface TaxInvoiceCsvDuplicateRow {
  approvalNo: string;
  /** 서버가 준 사유 문구를 그대로 보여준다 */
  reason: string;
}

/* ─────────────── 정산 현황 (프로젝트 단위) ─────────────── */

/** 정렬 기준. 서버가 두 가지만 받아 다른 열은 정렬할 수 없다 */
export type SettlementSort = 'NEXT_PLANNED_DATE_ASC' | 'TOTAL_AMOUNT_DESC';

export interface SettlementProjectQuery {
  /** 정산 예정일 기준 */
  startDate?: string;
  endDate?: string;
  /** 발주처 이름 */
  client?: string;
  /** 기본은 종료 프로젝트를 뺀다 */
  includeCompleted?: boolean;
  page?: number;
  size?: number;
  sort?: SettlementSort;
}

/** 프로젝트 줄에 세우는 태그 하나. 서버 값이 아니라 화면이 4개 지표로 만든다 */
export interface SettlementProjectTag {
  key: string;
  label: string;
  /** globals.css 의 공용 .badge-* 색 */
  className: string;
}

/** 정산 현황 한 줄. 프로젝트 하나의 집계다 */
export interface SettlementProjectItem {
  projectId: number;
  projectName: string;
  clientName: string | null;
  /** PM 이름 */
  projectManager: string;
  /** 계약 예정 총액. 정산 항목을 아직 안 썼으면 null */
  totalPlannedAmount: number | null;
  /** 실제 수금 · 지출 합계와 순액 */
  totalIncome: number;
  totalOutcome: number;
  totalAmount: number;
  completedRoundCount: number;
  totalRoundCount: number;
  /** 다음 정산 예정일. 남은 회차가 없으면 null */
  nextPlannedDate: string | null;
  /** 연결되지 않은 입금 · 계산서 건수 */
  paymentUnlinkedCount: number;
  taxInvoiceUnlinkedCount: number;
  /** 예정일을 넘긴 일수. 0 이면 지연이 아니다 */
  paymentOverdueDays: number;
  taxInvoiceOverdueDays: number;
  /** 서버가 값을 늘려도 화면이 죽지 않게 열어 둔다 */
  projectStatus: ProjectStatusCode | (string & {});
  /** 종료일. 진행 중이면 null */
  endedOn: string | null;
}

export interface SettlementProjectPage {
  page: number;
  size: number;
  totalElements: number;
  totalPages: number;
  projects: SettlementProjectItem[];
}

/**
 * 프로젝트 안의 정산 회차 한 줄.
 * 만들기만 하고 아직 안 쓴 회차가 있어 거의 모든 값이 nullable 이다.
 */
export interface SettlementRound {
  settleId: number;
  roundNo: number | null;
  roundName: string | null;
  plannedDate: string | null;
  plannedAmount: number | null;
  plannedTaxAmount: number | null;
  taxInvoiceDate: string | null;
  taxInvoiceAmount: number | null;
  /** 수금 방식. 자유 문자열이라 그대로 적는다 */
  paidType: string | null;
  bankName: string | null;
  accountNumber: string | null;
  accountHolder: string | null;
  paidDate: string | null;
  paidAmount: number | null;
  /** 정산 블록과 같은 값. 모르는 값이 오면 원문을 그대로 적는다 */
  status: SettlementStatus | (string & {});
  /** 계산서 · 입금을 연결한 사람과 시각 */
  taxLinkedByName: string | null;
  taxLinkedAt: string | null;
  cashFlowLinkedByName: string | null;
  cashFlowLinkedAt: string | null;
}
