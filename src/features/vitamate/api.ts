import { ENDPOINTS } from '@/constants/endpoints';
import { api } from '@/lib/api';

import type {
  Analysis,
  AnalysisSummary,
  CreateAnalysisRequest,
  CreateAnalysisResponse,
  ReviewType,
} from './types';

// 받아 둔 검토 템플릿. 운영자가 바꾸기 전까지 고정인 참조 데이터라
// 한 번 받으면 세션 내내 재사용한다 (새로고침하면 다시 받는다).
let cachedReviewTypes: ReviewType[] | null = null;
// 동시에 두 곳에서 열어도 요청은 하나만 나가게.
let inFlightReviewTypes: Promise<ReviewType[]> | null = null;

// 검토 유형·세부 카테고리 목록. 응답이 { reviewTypes: [...] } 로 감싸져 있어 벗겨 반환한다.
// 실제 AI 지시문은 이 API 로 내려오지 않는다 — 화면에 채우는 기본값은 exampleText 다.
// 여러 호출부가 공유하는 요청이라 signal 을 받지 않는다 — 한 화면이 취소하면
// 같이 기다리던 다른 화면까지 실패한다.
export function getReviewTemplates(): Promise<ReviewType[]> {
  if (cachedReviewTypes) return Promise.resolve(cachedReviewTypes);
  if (inFlightReviewTypes) return inFlightReviewTypes;

  inFlightReviewTypes = api
    .get<{ reviewTypes: ReviewType[] }>(ENDPOINTS.vitamate.reviewTemplates)
    .then((data) => {
      cachedReviewTypes = data.reviewTypes ?? [];
      return cachedReviewTypes;
    })
    // 실패는 캐시하지 않는다 — 다음에 열면 다시 시도해야 한다.
    .finally(() => {
      inFlightReviewTypes = null;
    });

  return inFlightReviewTypes;
}

// 같은 분석 요청이 두 번 나가는 것을 막는 키.
// 버튼 잠금만으로는 부족하다 — 응답이 늦어 새로고침하고 다시 누르면 분석이 두 건 생긴다.
// 같은 키 + 같은 내용이면 서버가 기존 analysisId 를 돌려주고, 내용이 다르면 409 가 온다.
export function newIdempotencyKey() {
  // 구형·비보안 컨텍스트에는 randomUUID 가 없다.
  if (typeof crypto !== 'undefined' && 'randomUUID' in crypto) {
    return crypto.randomUUID();
  }
  return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 12)}`;
}

// 분석 요청. 응답은 202 + PENDING 이고 결과가 바로 오지 않는다 —
// 받은 analysisId 로 폴링해서 결과를 받는다 (useAnalysisPolling).
// key 는 호출부가 만들어 재시도할 때까지 같은 값을 유지해야 중복 방지가 걸린다.
export function createAnalysis(
  blockId: number | string,
  body: CreateAnalysisRequest,
  key: string,
  signal?: AbortSignal,
) {
  return api.post<CreateAnalysisResponse>(
    ENDPOINTS.blocks.vitamateAnalyses(blockId),
    body,
    signal,
    { 'Idempotency-Key': key },
  );
}

// 분석 단건 조회 — 진행 중 폴링·결과 표시·이력 상세가 모두 이걸 쓴다.
export function getAnalysis(analysisId: number | string, signal?: AbortSignal) {
  return api.get<Analysis>(ENDPOINTS.vitamate.analysis(analysisId), signal);
}

// 블록의 분석 이력 (최신순, 최대 20건·페이징 없음).
// documents·result·citations 가 오지 않아 목록에서는 본문을 못 그리고,
// "블록의 최신 분석" 도 첫 건의 analysisId 로 단건 조회를 한 번 더 해야 한다.
export function getBlockAnalyses(
  blockId: number | string,
  signal?: AbortSignal,
) {
  return api
    .get<{ analyses: AnalysisSummary[] } | AnalysisSummary[]>(
      ENDPOINTS.blocks.vitamateAnalyses(blockId),
      signal,
    )
    .then((data) => {
      // 감싸는 키가 확정 전이라 배열·객체 두 모양을 모두 받는다.
      if (Array.isArray(data)) return data;
      return data?.analyses ?? [];
    });
}
