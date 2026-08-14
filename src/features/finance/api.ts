/**
 * 재무 도메인 API. (2026-08-12 스웨거 실측 — `.ai/API.md` 재무 절)
 *
 * ⚠️ 목록은 **페이징이 없고**, 다건 처리(삭제 · 제외)는 **부분 성공이 정상**이다.
 *    두 가지가 이 도메인의 다른 화면들과 가장 다른 점이다.
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
  TaxInvoiceCsvPreview,
  TaxInvoiceCsvUploadRequest,
  TaxInvoiceCsvUploadResult,
  TaxInvoiceFilterOptions,
  TaxInvoiceListQuery,
  TaxInvoiceListResponse,
  TaxInvoiceSkippedItem,
  UpdateCashFlowRequest,
} from './types';

/** 재무 관리 허브 진입 시 3개 항목 수치를 한 번에 받아온다 */
export function getFinanceSummary(signal?: AbortSignal) {
  return api.get<FinanceSummary>(ENDPOINTS.finance.summary, signal);
}

/**
 * 쿼리 문자열을 만든다.
 *
 * 빈 값을 실어 보내면 백엔드가 **그 빈 값으로 검색**해 0건이 된다 — 값이 있는 조건만 싣는다.
 * `unlinked` 는 켰을 때만 보낸다 (없으면 전체이고, `false` 가 '연결된 것만' 은 아니다).
 */
function toSearch(query: CashFlowListQuery) {
  const params = new URLSearchParams();

  const { startDate, endDate, unlinked, projectId, keyword } = query;

  if (startDate) params.set('startDate', startDate);
  if (endDate) params.set('endDate', endDate);
  if (unlinked) params.set('unlinked', 'true');
  if (projectId !== undefined) params.set('projectId', String(projectId));
  if (keyword) params.set('keyword', keyword);

  const search = params.toString();
  return search ? `?${search}` : '';
}

/** 입출금 내역 목록 — ⚠️ 페이징이 없다 (배열 하나가 통째로 온다) */
export function getCashFlows(query: CashFlowListQuery, signal?: AbortSignal) {
  return api.get<CashFlowListResponse>(
    `${ENDPOINTS.finance.cashFlows.root}${toSearch(query)}`,
    signal,
  );
}

/** 필터 옵션 — 프로젝트 목록만 내려온다 */
export function getCashFlowFilterOptions(signal?: AbortSignal) {
  return api.get<CashFlowFilterOptions>(
    ENDPOINTS.finance.cashFlows.filters,
    signal,
  );
}

/** 직접 등록 — 저장된 건은 `sourceType: 'MANUAL'` 이 된다 */
export function createCashFlow(body: CreateCashFlowRequest) {
  return api.post<CashFlowItem>(ENDPOINTS.finance.cashFlows.root, body);
}

/**
 * 수정.
 *
 * ⚠️ 적요 외의 필드는 **직접 등록 + 미연결** 건에만 반영된다 —
 *    나머지는 서버가 조용히 무시하므로 화면에서 먼저 막는다 (`canEditAll()`).
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
 * 다건 삭제 — 본문에 ID 배열을 싣는다.
 *
 * ⚠️ 매칭된 건은 삭제되지 않고 `skippedItems` 로 빠진다 (**부분 성공이 정상**).
 *    먼저 연결을 해제해야 지울 수 있다.
 */
export async function deleteCashFlows(cashFlowIds: number[]) {
  const data = await api.deleteWithBody<{
    deletedCount: number;
    skippedItems: CashFlowSkippedItem[];
  }>(ENDPOINTS.finance.cashFlows.root, { cashFlowIds });

  return { count: data.deletedCount, skippedItems: data.skippedItems };
}

/**
 * 연결 대상 제외 · 제외 취소.
 *
 * ⚠️ 토글이 아니라 **값 지정**이다 — `isExcluded` 를 그대로 보낸다.
 * ⚠️ 이미 매칭된 건은 제외할 수 없어 `skippedItems` 로 빠진다.
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

/**
 * 매칭 추천 후보 — 최대 5건이 추천 순으로 온다.
 *
 * ⚠️ 프로젝트가 아니라 **정산 블록** 후보다. `matchTags` 에 추천 이유가 담겨 온다.
 */
export function getCashFlowMatchCandidates(
  cashFlowId: number,
  signal?: AbortSignal,
) {
  return api.get<MatchCandidateResponse>(
    ENDPOINTS.finance.cashFlows.matchCandidates(cashFlowId),
    signal,
  );
}

/**
 * 정산 블록에 연결.
 *
 * ⚠️ 400 이 세 갈래다 — 이미 매칭된 입출금 · **구분과 블록 타입 불일치** ·
 *    이미 매칭된 정산 블록. 셋 다 서버 문구가 가장 정확해 그대로 띄운다.
 */
export function matchCashFlow(cashFlowId: number, settleId: number) {
  return api.patch<unknown>(ENDPOINTS.finance.cashFlows.match(cashFlowId), {
    settleId,
  });
}

/**
 * 정산 블록 연결 해제.
 *
 * ⚠️ 매칭되지 않은 건에 부르면 400 (`FINANCE_CASH_FLOW_NOT_MATCHED`) 이라
 *    화면에서 `linkStatus` 로 먼저 막는다.
 */
export function unmatchCashFlow(cashFlowId: number) {
  return api.patch<unknown>(ENDPOINTS.finance.cashFlows.unmatch(cashFlowId));
}

/**
 * CSV · 엑셀 컬럼 추천 조회 — **파일은 저장되지 않는다.**
 *
 * ⚠️ 비밀번호가 걸린 엑셀이면 400(`FINANCE_CSV_PASSWORD_REQUIRED`) 이 온다.
 *    비밀번호를 받아 같은 파일로 다시 부른다 (`FINANCE_CSV_PASSWORD_INVALID` 는 틀린 경우).
 * ⚠️ 형식이 아니면 **404**(`FINANCE_INVALID_CSV_FILE`) 다 — 400 이 아니다.
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
 * 매핑을 확정해 저장한다.
 *
 * ⚠️ 매핑은 **JSON 문자열**로 `request` 파트에 담는다 (파일과 같은 multipart).
 * ⚠️ 이미 등록된 거래는 저장되지 않고 `duplicateRows` 로 돌아온다 — 실패가 아니다.
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

/**
 * 세금계산서 목록 — ⚠️ 입출금과 달리 **페이징이 있다** (`page` 는 0부터).
 */
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
 * 세금계산서 한 건을 찾는다.
 *
 * ⚠️ **단건 조회 API 가 없다** (2026-08-14 스웨거 실측). 목록에서 찾는 수밖에 없는데
 *    목록은 페이징이라 한 번에 다 오지 않아, 찾을 때까지 페이지를 넘긴다.
 * ⚠️ 페이지 수에 **상한을 둔다** — 없는 ID 를 열면 끝없이 요청하게 된다.
 *    상한을 넘기면 못 찾은 것으로 보고 화면이 안내한다.
 */
export async function findTaxInvoice(
  taxId: number,
  signal?: AbortSignal,
  maxPages = 10,
) {
  const size = 100;

  for (let page = 0; page < maxPages; page++) {
    const data = await getTaxInvoices({ page, size }, signal);

    const found = data.taxInvoices.find((item) => item.taxId === taxId);
    if (found) return found;

    if (page >= data.totalPages - 1) break;
  }

  return null;
}

/** 필터 옵션 — 프로젝트 목록만 내려온다 */
export function getTaxInvoiceFilterOptions(signal?: AbortSignal) {
  return api.get<TaxInvoiceFilterOptions>(
    ENDPOINTS.finance.taxInvoices.filters,
    signal,
  );
}

/**
 * 다건 삭제 — 본문에 ID 배열을 싣는다.
 *
 * ⚠️ 매칭된 건은 삭제되지 않고 `skippedItems` 로 빠진다 (**부분 성공이 정상**).
 */
export async function deleteTaxInvoices(taxIds: number[]) {
  const data = await api.deleteWithBody<{
    deletedCount: number;
    skippedItems: TaxInvoiceSkippedItem[];
  }>(ENDPOINTS.finance.taxInvoices.root, { taxIds });

  return { count: data.deletedCount, skippedItems: data.skippedItems };
}

/**
 * 연결 대상 제외 · 제외 취소.
 *
 * ⚠️ 토글이 아니라 **값 지정**이다 — `isExcluded` 를 그대로 보낸다.
 */
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

/** ⚠️ 세금계산서는 **메모만** 고칠 수 있다 — 직접 등록이 없어 나머지는 파일이 원본이다 */
export function updateTaxInvoiceMemo(taxId: number, memo: string) {
  return api.patch<{ taxId: number; memo: string | null; updatedAt: string }>(
    ENDPOINTS.finance.taxInvoices.detail(taxId),
    { memo },
  );
}

/** 매칭 추천 후보 — 최대 5건이 추천 순으로 온다 (정산 블록 후보다) */
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

/**
 * 세금계산서 CSV · 엑셀 컬럼 추천 조회 — **파일은 저장되지 않는다.**
 *
 * 오류 코드는 입출금과 같은 계열을 쓴다 (`errorCodes.ts` 의 `isCsv*`).
 */
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

/**
 * 매핑을 확정해 저장한다.
 *
 * ⚠️ 이미 등록된 **승인번호**는 저장되지 않고 `duplicateRows` 로 돌아온다 — 실패가 아니다.
 */
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
