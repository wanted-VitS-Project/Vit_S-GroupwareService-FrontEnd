/**
 * 정산 도메인 타입. (.ai/API.md 85 · 86 · 정산 도메인 공통)
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
 * 수정 화면을 열 때 받는 값 (.ai/API.md 85).
 *
 * ⚠️ **저장된 현재 값이 아니다.** 추천값과 원본 계좌번호뿐이라,
 * 이미 작성된 항목의 회차 · 금액은 블록 목록의 `detail` 에서 읽어야 한다.
 */
export interface SettlementDraft {
  settleId: number;
  /** 프로젝트 내 정산 블록 **개수** 기준 추천 회차 — 입력값이 아니라 안내다 */
  recommendRoundNo: number | null;
  /**
   * 프로젝트 내 다른 정산 블록의 총 예정 금액.
   *
   * ⚠️ **첫 블록이면 `null` 이다** (기준 삼을 블록이 없다). 실제 응답에서 확인했다.
   * ⚠️ 이름은 '추천'이지만 **맞춰야 하는 값**에 가깝다 — 다른 블록과 어긋나면 저장이 409
   * (`SETL-008`)로 막힌다.
   */
  recommendTotalAmount: number | null;
  /** 마스킹 없는 계좌번호. `OUTCOME` 이 아니면 null */
  originalAccountNumber: string | null;
}

/**
 * 정산 항목 작성 · 수정 요청 (.ai/API.md 86).
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
  /**
   * 거래처명 — 돈을 **보내는 쪽**의 이름이다.
   * `INCOME` 은 상대 클라이언트(받는 건 우리), `OUTCOME` 은 **우리 회사**(보내는 게 우리).
   *
   * ⚠️ 계좌 3종(`bankName` · `accountNumber` · `accountHolder`)은 반대로 **받는 쪽**,
   * 즉 외주 업체 것이다 — 둘을 헷갈리면 출금 정보가 뒤집힌다.
   */
  traderName: string;
  bankName?: string;
  /** ⚠️ 하이픈 · 공백 없이 보낸다 */
  accountNumber?: string;
  accountHolder?: string;
}

/**
 * 정산 항목 (.ai/API.md 86 응답).
 *
 * ⚠️ `accountNumber` 는 **마스킹된 값**(`100******444`)이다.
 * 폼에 채울 원본은 85번의 `originalAccountNumber` 에서 온다.
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
 * 저장된 값을 주는 조회 API 가 따로 없어 요약 카드는 **이 `detail` 로만** 그린다.
 * 작성 전에도 `detail` 자체는 온다 — 항목 필드가 전부 `null` 이고 `status` · `createdAt` 만 찬다.
 */
export interface SettlementBlockDetail {
  settleId: number;
  /** 작성 전에는 `null` — 수정 폼에서 입금 · 출금을 고르면 정해진다 */
  type: SettlementType | null;
  /** 작성 전에도 온다 (`PENDING`) */
  status: SettlementStatus | null;
  /** 아직 작성하지 않았으면 `null` */
  item: SettlementItem | null;
}

/**
 * `detail` 을 런타임 검증해서 읽는다. 형태가 다르면 `null` —
 * 추측해서 API 를 부르면 **남의 정산 블록**을 고치게 된다.
 */
export function readSettlementBlockDetail(
  detail: unknown,
): SettlementBlockDetail | null {
  if (typeof detail !== 'object' || detail === null) return null;

  const source = detail as Record<string, unknown>;
  if (typeof source.settleId !== 'number') return null;

  return {
    settleId: source.settleId,
    type: readType(source.type),
    status: readStatus(source.status),
    // 아직 아무것도 작성하지 않았으면 값이 없다 — 그 자체가 정상이다
    item: readItem(source),
  };
}

function readType(value: unknown): SettlementType | null {
  return value === 'INCOME' || value === 'OUTCOME' ? value : null;
}

function readStatus(value: unknown): SettlementStatus | null {
  return typeof value === 'string' && value in SETTLEMENT_STATUS_LABELS
    ? (value as SettlementStatus)
    : null;
}

/** 숫자 칸 — 유한수만 통과시킨다. `NaN` · `Infinity` 는 그리는 쪽에서 깨진다 */
function readNumber(value: unknown): number | null {
  return typeof value === 'number' && Number.isFinite(value) ? value : null;
}

/** 문자열 칸 — 빈 문자열은 값이 없는 것으로 본다 */
function readText(value: unknown): string | null {
  return typeof value === 'string' && value.trim() !== '' ? value : null;
}

/**
 * 작성된 항목. `detail` 은 항목 필드를 **평면으로** 담는다 (중첩 객체가 아니다).
 *
 * **회차와 예정 금액이 둘 다 있어야** 작성된 것으로 본다 — 작성 전에는 둘 다 `null` 이고,
 * 하나만 있는 상태는 서버가 만들지 않는다(둘 다 필수 입력).
 *
 * ⚠️ 통째로 단언(`as`)하지 않고 **화면이 직접 읽는 필드를 하나씩 정규화**한다.
 * 두 필드만 확인하고 넘기면 `plannedDate` 가 숫자거나 `paidAmountRatio` 가 문자열일 때
 * 표기 단계(`toLocaleString` · 진행률 계산)에서 `NaN%` 나 빈 화면으로 터진다.
 */
function readItem(source: Record<string, unknown>): SettlementItem | null {
  const roundNo = readNumber(source.roundNo);
  const plannedAmount = readNumber(source.plannedAmount);

  if (roundNo === null || plannedAmount === null) return null;

  return {
    settleId: readNumber(source.settleId) ?? 0,
    roundNo,
    plannedAmount,
    totalAmount: readNumber(source.totalAmount) ?? 0,
    plannedTaxAmount: readNumber(source.plannedTaxAmount) ?? 0,
    plannedDate: readText(source.plannedDate) ?? '',
    traderName: readText(source.traderName) ?? '',
    // 계좌 3종은 입금이면 아예 없다 — 없는 것과 잘못된 것을 똑같이 `undefined` 로 둔다
    bankName: readText(source.bankName) ?? undefined,
    accountNumber: readText(source.accountNumber) ?? undefined,
    accountHolder: readText(source.accountHolder) ?? undefined,
    // 재무팀이 채우기 전에는 `null` 이 정상이다
    actualAmount: readNumber(source.actualAmount),
    actualDate: readText(source.actualDate),
    status: readStatus(source.status) ?? 'PENDING',
    paidAmountRatio: readNumber(source.paidAmountRatio) ?? 0,
    createdAt: readText(source.createdAt) ?? '',
  };
}

/**
 * 폼이 들고 있는 값. 숫자 칸도 **문자열로** 둔다 — 지웠을 때 0 이 되면 안 된다.
 * 검증이 이 모양을 그대로 보므로 폼과 같은 파일에 두지 않고 여기서 함께 관리한다.
 */
export interface SettlementFormValues {
  roundNo: string;
  totalAmount: string;
  plannedAmount: string;
  plannedTaxAmount: string;
  plannedDate: string;
  traderName: string;
  bankName: string;
  accountNumber: string;
  accountHolder: string;
}

/**
 * `traderName` 을 부르는 이름. **돈을 보내는 쪽**이라 방향에 따라 달라진다 —
 * 받을 때(`INCOME`)는 상대 클라이언트, 보낼 때(`OUTCOME`)는 우리 회사다.
 * 폼 라벨 · 요약 카드 · 검증 문구가 같은 말을 쓰도록 한 곳에서 만든다.
 */
export function traderLabel(type: SettlementType | null) {
  return type === 'OUTCOME' ? '출금 주체' : '입금 거래처';
}

/** 금액 칸 — 0 이상이면 된다 (`roundNo` 는 규칙이 달라 따로 본다) */
const AMOUNT_FIELDS = [
  ['totalAmount', '정산 예정 총 금액'],
  ['plannedAmount', '이번 회차 예정 금액'],
  ['plannedTaxAmount', '예정 세금'],
] as const;

/**
 * 저장을 막아야 하는 이유를 찾는다. 없으면 `null`.
 *
 * 명세 86번은 회차 · 금액 3종 · 정산 예정일 · 거래처명이 **모두 필수**이고,
 * 출금이면 계좌 3종이 더 붙는다. 그런데 빈 칸을 그대로 보내면
 * `Number('')` 가 **0** 이라 **0원짜리 정산이 조용히 저장된다** — 그래서 화면에서 먼저 막는다.
 */
export function findBlocker(
  type: SettlementType,
  form: SettlementFormValues,
): string | null {
  const roundNo = form.roundNo.trim();
  if (roundNo === '') return '정산 회차를 입력해주세요.';
  if (!Number.isInteger(Number(roundNo)) || Number(roundNo) < 1) {
    return '정산 회차는 1 이상의 정수로 입력해주세요.';
  }

  for (const [field, label] of AMOUNT_FIELDS) {
    const value = form[field].trim();

    if (value === '') return `${label}을(를) 입력해주세요.`;
    // 숫자 칸이라도 `1e5` · 공백 같은 값이 들어올 수 있다 — NaN 이면 서버에서 400 이다
    if (!Number.isFinite(Number(value))) {
      return `${label}은(는) 숫자로 입력해주세요.`;
    }
    if (Number(value) < 0) return `${label}은(는) 0보다 작을 수 없습니다.`;
  }

  if (form.plannedDate.trim() === '') return '정산 예정일을 입력해주세요.';

  // 거래처명은 방향에 따라 부르는 이름이 다르다 — 폼 라벨과 문구를 맞춘다
  if (form.traderName.trim() === '') {
    return `${traderLabel(type)}을(를) 입력해주세요.`;
  }

  // 출금이면 계좌 3종이 모두 있어야 한다 (서버도 400 으로 막는다)
  if (type === 'OUTCOME') {
    if (form.bankName.trim() === '') return '출금은 은행명이 필요합니다.';
    if (form.accountNumber.trim() === '') {
      return '출금은 계좌번호가 필요합니다.';
    }
    if (form.accountHolder.trim() === '') return '출금은 예금주가 필요합니다.';
  }

  return null;
}
