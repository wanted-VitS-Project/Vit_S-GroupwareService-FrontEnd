/**
 * 재무 도메인 API (.ai/API.md 재무 절).
 * 목록은 모두 페이징이고 다건 처리는 부분 성공이 정상이다.
 */
import { ENDPOINTS } from '@/constants/endpoints';
import { api, postForm } from '@/lib/api';

import type {
  CashFlowFilterOptions,
  CashFlowItem,
  CashFlowListQuery,
  CashFlowListResponse,
  CashFlowSkippedItem,
  CreateCashFlowRequest,
  CsvPreview,
  CsvUploadRequest,
  CsvUploadResult,
  FinanceSummary,
  MatchCandidateResponse,
  SettlementProjectPage,
  SettlementProjectQuery,
  SettlementRound,
  TaxInvoiceCsvPreview,
  TaxInvoiceCsvUploadRequest,
  TaxInvoiceCsvUploadResult,
  TaxInvoiceFilterOptions,
  TaxInvoiceItem,
  TaxInvoiceListQuery,
  TaxInvoiceListResponse,
  TaxInvoiceSkippedItem,
  UpdateCashFlowRequest,
} from './types';

/** 재무 관리 허브의 3개 항목 수치를 한 번에 받아온다 */
export function getFinanceSummary(signal?: AbortSignal) {
  return api.get<FinanceSummary>(ENDPOINTS.finance.summary, signal);
}

/**
 * 쿼리 문자열을 만든다. 값이 있는 조건만 싣는다.
 * unlinked 는 켰을 때만 보낸다 (false 는 '연결된 것만' 이 아니다).
 */
function toSearch(query: CashFlowListQuery) {
  const params = new URLSearchParams();

  const {
    startDate,
    endDate,
    unlinked,
    projectId,
    keyword,
    type,
    sourceType,
    page,
    size,
  } = query;

  if (startDate) params.set('startDate', startDate);
  if (endDate) params.set('endDate', endDate);
  if (unlinked) params.set('unlinked', 'true');
  if (projectId !== undefined) params.set('projectId', String(projectId));
  if (keyword) params.set('keyword', keyword);
  // 구분 · 출처는 나머지 조건과 AND 로 묶인다
  if (type) params.set('type', type);
  if (sourceType) params.set('sourceType', sourceType);
  // 0 페이지도 유효한 값이라 값 유무로 판단한다
  if (page !== undefined) params.set('page', String(page));
  if (size !== undefined) params.set('size', String(size));

  const search = params.toString();
  return search ? `?${search}` : '';
}

/** 입출금 내역 목록. 세금계산서와 같은 페이징 응답이다 (page 는 0부터) */
export function getCashFlows(query: CashFlowListQuery, signal?: AbortSignal) {
  return api.get<CashFlowListResponse>(
    `${ENDPOINTS.finance.cashFlows.root}${toSearch(query)}`,
    signal,
  );
}

/**
 * 입출금 단건 조회. 목록 아이템(`CashFlowItem`)과 같은 모양이 온다.
 * 없는 ID 는 404 로 떨어지므로 화면은 실패로 받아 처리한다.
 */
export function getCashFlow(cashFlowId: number, signal?: AbortSignal) {
  return api.get<CashFlowItem>(
    ENDPOINTS.finance.cashFlows.detail(cashFlowId),
    signal,
  );
}

/** 입출금 필터 옵션. 프로젝트 목록만 내려온다 */
export function getCashFlowFilterOptions(signal?: AbortSignal) {
  return api.get<CashFlowFilterOptions>(
    ENDPOINTS.finance.cashFlows.filters,
    signal,
  );
}

/** 직접 등록. 저장된 건은 출처가 MANUAL 이 된다 */
export function createCashFlow(body: CreateCashFlowRequest) {
  return api.post<CashFlowItem>(ENDPOINTS.finance.cashFlows.root, body);
}

/**
 * 수정. 적요 외의 필드는 직접 등록 + 미연결 건에만 반영된다.
 * 나머지는 서버가 조용히 무시하므로 화면에서 먼저 막는다.
 */
export function updateCashFlow(
  cashFlowId: number,
  body: UpdateCashFlowRequest,
) {
  return api.patch<CashFlowItem>(
    ENDPOINTS.finance.cashFlows.detail(cashFlowId),
    body,
  );
}

/**
 * 다건 삭제. 본문에 ID 배열을 싣는다.
 * 매칭된 건은 처리되지 않고 빠지므로 부분 성공이 정상이다.
 */
export async function deleteCashFlows(cashFlowIds: number[]) {
  const data = await api.deleteWithBody<{
    deletedCount: number;
    skippedItems: CashFlowSkippedItem[];
  }>(ENDPOINTS.finance.cashFlows.root, { cashFlowIds });

  return { count: data.deletedCount, skippedItems: data.skippedItems };
}

/**
 * 연결 대상 제외 · 제외 취소. 토글이 아니라 값을 그대로 보낸다.
 * 이미 매칭된 건은 제외할 수 없어 빠진다.
 */
export async function updateCashFlowExclusion(
  cashFlowIds: number[],
  isExcluded: boolean,
) {
  const data = await api.patch<{
    updatedCount: number;
    skippedItems: CashFlowSkippedItem[];
  }>(ENDPOINTS.finance.cashFlows.exclude, { cashFlowIds, isExcluded });

  return { count: data.updatedCount, skippedItems: data.skippedItems };
}

/** 매칭 추천 후보. 프로젝트가 아니라 정산 블록 후보가 최대 5건 온다 */
export function getCashFlowMatchCandidates(
  cashFlowId: number,
  signal?: AbortSignal,
) {
  return api.get<MatchCandidateResponse>(
    ENDPOINTS.finance.cashFlows.matchCandidates(cashFlowId),
    signal,
  );
}

/** 정산 블록에 연결. 실패 사유가 여러 갈래라 서버 문구를 그대로 띄운다 */
export function matchCashFlow(cashFlowId: number, settleId: number) {
  return api.patch<unknown>(ENDPOINTS.finance.cashFlows.match(cashFlowId), {
    settleId,
  });
}

/** 정산 블록 연결 해제. 매칭되지 않은 건은 화면에서 먼저 막는다 */
export function unmatchCashFlow(cashFlowId: number) {
  return api.patch<unknown>(ENDPOINTS.finance.cashFlows.unmatch(cashFlowId));
}

/**
 * CSV · 엑셀 컬럼 추천 조회. 파일은 저장되지 않는다.
 * 비밀번호가 걸린 엑셀은 비밀번호를 받아 같은 파일로 다시 부른다.
 */
export function previewCashFlowCsv(
  file: File,
  password?: string,
  signal?: AbortSignal,
) {
  const form = new FormData();
  form.append('file', file);
  if (password) form.append('password', password);

  return postForm<CsvPreview>(
    ENDPOINTS.finance.cashFlows.csvPreview,
    form,
    signal,
  );
}

/**
 * 매핑을 확정해 저장한다. 매핑은 JSON 문자열로 request 파트에 담는다.
 * 이미 등록된 거래는 중복으로 돌아오며 실패가 아니다.
 */
export function uploadCashFlowCsv(
  file: File,
  request: CsvUploadRequest,
  signal?: AbortSignal,
) {
  const form = new FormData();
  form.append('file', file);
  form.append('request', JSON.stringify(request));

  return postForm<CsvUploadResult>(
    ENDPOINTS.finance.cashFlows.csv,
    form,
    signal,
  );
}

/** 세금계산서 목록. 입출금과 달리 페이징이 있다 (page 는 0부터) */
export function getTaxInvoices(
  query: TaxInvoiceListQuery,
  signal?: AbortSignal,
) {
  const params = new URLSearchParams();

  const { startDate, endDate, unlinked, projectId, keyword, page, size } =
    query;

  if (startDate) params.set('startDate', startDate);
  if (endDate) params.set('endDate', endDate);
  if (unlinked) params.set('unlinked', 'true');
  if (projectId !== undefined) params.set('projectId', String(projectId));
  if (keyword) params.set('keyword', keyword);
  if (page !== undefined) params.set('page', String(page));
  if (size !== undefined) params.set('size', String(size));

  const search = params.toString();

  return api.get<TaxInvoiceListResponse>(
    `${ENDPOINTS.finance.taxInvoices.root}${search ? `?${search}` : ''}`,
    signal,
  );
}

/**
 * 세금계산서 단건 조회. 목록 아이템(`TaxInvoiceItem`)과 같은 모양이 온다.
 * 없는 ID 는 404 로 떨어진다 (입출금 단건 조회와 같다).
 */
export function getTaxInvoice(taxId: number, signal?: AbortSignal) {
  return api.get<TaxInvoiceItem>(
    ENDPOINTS.finance.taxInvoices.detail(taxId),
    signal,
  );
}

/** 세금계산서 필터 옵션. 프로젝트 목록만 내려온다 */
export function getTaxInvoiceFilterOptions(signal?: AbortSignal) {
  return api.get<TaxInvoiceFilterOptions>(
    ENDPOINTS.finance.taxInvoices.filters,
    signal,
  );
}

/** 다건 삭제. 매칭된 건은 처리되지 않고 빠진다 */
export async function deleteTaxInvoices(taxIds: number[]) {
  const data = await api.deleteWithBody<{
    deletedCount: number;
    skippedItems: TaxInvoiceSkippedItem[];
  }>(ENDPOINTS.finance.taxInvoices.root, { taxIds });

  return { count: data.deletedCount, skippedItems: data.skippedItems };
}

/** 연결 대상 제외 · 제외 취소. 토글이 아니라 값을 그대로 보낸다 */
export async function updateTaxInvoiceExclusion(
  taxIds: number[],
  isExcluded: boolean,
) {
  const data = await api.patch<{
    updatedCount: number;
    skippedItems: TaxInvoiceSkippedItem[];
  }>(ENDPOINTS.finance.taxInvoices.exclude, { taxIds, isExcluded });

  return { count: data.updatedCount, skippedItems: data.skippedItems };
}

/** 세금계산서는 메모만 고칠 수 있다. 나머지는 파일이 원본이다 */
export function updateTaxInvoiceMemo(taxId: number, memo: string) {
  return api.patch<{ taxId: number; memo: string | null; updatedAt: string }>(
    ENDPOINTS.finance.taxInvoices.detail(taxId),
    { memo },
  );
}

/** 매칭 추천 후보. 정산 블록 후보가 최대 5건 온다 */
export function getTaxInvoiceMatchCandidates(
  taxId: number,
  signal?: AbortSignal,
) {
  return api.get<MatchCandidateResponse>(
    ENDPOINTS.finance.taxInvoices.matchCandidates(taxId),
    signal,
  );
}

/** 정산 블록에 연결 */
export function matchTaxInvoice(taxId: number, settleId: number) {
  return api.patch<unknown>(ENDPOINTS.finance.taxInvoices.match(taxId), {
    settleId,
  });
}

/** 정산 블록 연결 해제 */
export function unmatchTaxInvoice(taxId: number) {
  return api.patch<unknown>(ENDPOINTS.finance.taxInvoices.unmatch(taxId));
}

/** 세금계산서 CSV 컬럼 추천 조회. 파일은 저장되지 않는다 */
export function previewTaxInvoiceCsv(
  file: File,
  password?: string,
  signal?: AbortSignal,
) {
  const form = new FormData();
  form.append('file', file);
  if (password) form.append('password', password);

  return postForm<TaxInvoiceCsvPreview>(
    ENDPOINTS.finance.taxInvoices.csvPreview,
    form,
    signal,
  );
}

/** 매핑을 확정해 저장한다. 이미 등록된 승인번호는 중복으로 돌아온다 */
export function uploadTaxInvoiceCsv(
  file: File,
  request: TaxInvoiceCsvUploadRequest,
  signal?: AbortSignal,
) {
  const form = new FormData();
  form.append('file', file);
  form.append('request', JSON.stringify(request));

  return postForm<TaxInvoiceCsvUploadResult>(
    ENDPOINTS.finance.taxInvoices.csv,
    form,
    signal,
  );
}

/* ─────────────── 정산 현황 ─────────────── */

/**
 * 프로젝트 단위 정산 현황. 페이징이 있다.
 * 정렬은 서버가 두 값만 받아 아무 열이나 정렬할 수 없다.
 */
export function getSettlementProjects(
  query: SettlementProjectQuery = {},
  signal?: AbortSignal,
) {
  const params = new URLSearchParams();

  if (query.startDate) params.set('startDate', query.startDate);
  if (query.endDate) params.set('endDate', query.endDate);
  if (query.client) params.set('client', query.client);
  // 기본값과 구분해야 해서 값이 있을 때만 싣는다
  if (query.includeCompleted) params.set('includeCompleted', 'true');
  if (query.page !== undefined) params.set('page', String(query.page));
  if (query.size !== undefined) params.set('size', String(query.size));
  if (query.sort) params.set('sort', query.sort);

  const search = params.toString();
  const path = ENDPOINTS.finance.settlements.root;

  return api.get<SettlementProjectPage>(
    search ? `${path}?${search}` : path,
    signal,
  );
}

/** 발주처 필터 선택지. 응답 껍데기를 벗겨 배열로 돌려준다 */
export function getSettlementClients(signal?: AbortSignal) {
  return (
    api
      .get<{ clients: string[] }>(ENDPOINTS.finance.settlements.filters, signal)
      // 필드가 비어 와도 화면이 죽지 않게 한다
      .then((data) => data.clients ?? [])
  );
}

/** 한 프로젝트의 정산 회차. 페이징이 없어 전체가 온다 */
export function getProjectSettlements(
  projectId: number | string,
  signal?: AbortSignal,
) {
  return (
    api
      .get<{ blocks: SettlementRound[] }>(
        ENDPOINTS.finance.settlements.ofProject(projectId),
        signal,
      )
      // 비어 오면 '회차 없음' 으로 그린다
      .then((data) => data.blocks ?? [])
  );
}
