/**
 * 정산 도메인 타입. (.ai/API.md 84 · 85 · 정산 도메인 공통)
 *
 * 정산 블록 하나(`settleId`)에 정산 항목 **한 벌**이 붙는다.
 * 타입(`INCOME` · `OUTCOME`)은 요청마다 쿼리로 보내야 한다.
 */

/** 우리 회사 기준 — 받는 돈인지 주는 돈인지 */
export type SettlementType = 'INCOME' | 'OUTCOME';

export const SETTLEMENT_TYPE_LABELS: Record<SettlementType, string> = {
  INCOME: '입금',
  OUTCOME: '출금',
};

/**
 * 정산 상태.
 *
 * ❗ 명세 본문은 `PENDGING` 으로 적혀 있지만 응답 예시는 `PENDING` 이다 — **예시를 따랐다.**
 * 실제 값이 다르면 라벨이 비므로 화면에서 바로 드러난다.
 */
export type SettlementStatus = 'PENDING' | 'WAITING' | 'PARTIAL' | 'COMPLETED';

export const SETTLEMENT_STATUS_LABELS: Record<SettlementStatus, string> = {
  PENDING: '미연결',
  WAITING: '정산 대기',
  PARTIAL: '부분 정산',
  COMPLETED: '정산 완료',
};

/**
 * 수정 화면을 열 때 받는 값 (.ai/API.md 84).
 *
 * ⚠️ **저장된 현재 값이 아니다.** 추천값과 원본 계좌번호뿐이라,
 * 이미 작성된 항목의 회차 · 금액은 블록 목록의 `detail` 에서 읽어야 한다.
 */
export interface SettlementDraft {
  settleId: number;
  /** 프로젝트 내 정산 블록 **개수** 기준 추천 회차 — 입력값이 아니라 안내다 */
  recommendRoundNo: number;
  /** 프로젝트 내 정산 블록 **총 금액** 기준 추천 총액 */
  recommendTotalAmount: number;
  /** 마스킹 없는 계좌번호. `OUTCOME` 이 아니면 null */
  originalAccountNumber: string | null;
}

/**
 * 정산 항목 작성 · 수정 요청 (.ai/API.md 85).
 * 계좌 3종은 `OUTCOME` 일 때만 보내며, 그때는 **셋 다 필수**다.
 */
export interface SaveSettlementRequest {
  roundNo: number;
  /** 프로젝트 정산 예정 총 금액 */
  totalAmount: number;
  /** 회차별 정산 예정 금액 */
  plannedAmount: number;
  /** 회차별 정산 예정 세금 금액 */
  plannedTaxAmount: number;
  /** yyyy-MM-dd */
  plannedDate: string;
  /** 거래처명 — `INCOME` 은 상대 클라이언트, `OUTCOME` 은 외주 업체 */
  traderName: string;
  bankName?: string;
  /** ⚠️ 하이픈 · 공백 없이 보낸다 */
  accountNumber?: string;
  accountHolder?: string;
}

/**
 * 정산 항목 (.ai/API.md 85 응답).
 *
 * ⚠️ `accountNumber` 는 **마스킹된 값**(`100******444`)이다.
 * 폼에 채울 원본은 84번의 `originalAccountNumber` 에서 온다.
 */
export interface SettlementItem extends SaveSettlementRequest {
  settleId: number;
  /** 재무팀이 나중에 채운다. 작성 직후에는 null — 화면은 `-` 로 그린다 */
  actualAmount: number | null;
  actualDate: string | null;
  status: SettlementStatus;
  /** 금액 기준 진행률. 작성 직후 `0.0` */
  paidAmountRatio: number;
  createdAt: string;
}

/**
 * 블록 목록(10번)의 `detail` 에서 읽어낸 정산 블록 정보.
 *
 * ❗ **스키마가 확정되지 않았다** (스웨거 미공개). 저장된 값을 주는 조회 API 가 따로 없어
 * 요약 카드는 이 `detail` 로만 그린다 — 값이 없으면 빈 항목으로 두고 `수정하기` 만 남긴다.
 */
export interface SettlementBlockDetail {
  settleId: number;
  type: SettlementType | null;
  item: SettlementItem | null;
}

/**
 * `detail` 을 런타임 검증해서 읽는다. 형태가 다르면 `null` —
 * 추측해서 API 를 부르면 **남의 정산 블록**을 고치게 된다.
 *
 * ⚠️ 키 이름이 확정되지 않아 `settleId` · `settlementId` 둘 다 받는다.
 * 확정되면 한쪽만 남긴다.
 */
export function readSettlementBlockDetail(
  detail: unknown,
): SettlementBlockDetail | null {
  if (typeof detail !== 'object' || detail === null) return null;

  const source = detail as Record<string, unknown>;
  const settleId = source.settleId ?? source.settlementId;
  if (typeof settleId !== 'number') return null;

  return {
    settleId,
    type: readType(source.type),
    // 아직 아무것도 작성하지 않았으면 값이 없다 — 그 자체가 정상이다
    item: readItem(source),
  };
}

function readType(value: unknown): SettlementType | null {
  return value === 'INCOME' || value === 'OUTCOME' ? value : null;
}

/**
 * 작성된 항목. **회차와 예정 금액이 둘 다 있어야** 작성된 것으로 본다 —
 * 하나만 있는 상태는 서버가 만들지 않는다(둘 다 필수 입력).
 */
function readItem(source: Record<string, unknown>): SettlementItem | null {
  const nested = source.item;
  const item = (
    typeof nested === 'object' && nested !== null ? nested : source
  ) as Record<string, unknown>;

  if (
    typeof item.roundNo !== 'number' ||
    typeof item.plannedAmount !== 'number'
  ) {
    return null;
  }

  return item as unknown as SettlementItem;
}

/** 출금이면 계좌 3종이 모두 있어야 저장할 수 있다 (서버도 400 으로 막는다) */
export function findAccountBlocker(
  type: SettlementType,
  form: Pick<
    SaveSettlementRequest,
    'bankName' | 'accountNumber' | 'accountHolder'
  >,
) {
  if (type !== 'OUTCOME') return null;

  if (!form.bankName?.trim()) return '은행명';
  if (!form.accountNumber?.trim()) return '계좌번호';
  if (!form.accountHolder?.trim()) return '예금주';

  return null;
}
