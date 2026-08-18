/**
 * 전공 · 자격증 **마스터 항목** 타입. (ADMIN 전용)
 *
 * 두 도메인이 이름만 다르고 구조가 같아 **한 타입으로 다룬다** —
 * 화면도 목록 하나에 설정만 주입해 두 벌을 만들지 않는다.
 *
 * 사원의 학력 · 자격증은 이 목록에서 **골라서** 넣는다 (자유입력이 아니다) —
 * 그래서 목록에 없는 값을 쓰려면 이 화면에서 먼저 항목을 만들어야 한다.
 */

/** 어느 마스터인지 — 경로 · 에러코드 · 문구가 이 값으로 갈린다 */
export type MasterItemKind = 'major' | 'certificate';

export interface MasterItem {
  /** `majorId` · `certificateId` 를 여기로 모아 담는다 */
  id: number;
  name: string;
  /** 이 항목을 쓰는 사원 수 — 지울지 말지 사람이 판단할 근거다 */
  employeeCount: number;
  /**
   * 쓰는 사원이 없으면 `true`.
   * ⚠️ 이 값으로 버튼을 잠가도 **경합은 못 막는다** — 그 사이 누가 쓰면 409 가 온다.
   */
  deletable: boolean;
}

/** 항목 이름 최대 길이 */
export const MASTER_ITEM_NAME_MAX_LENGTH = 100;

/** 학위 — 세 값 고정이다 */
export type Degree = 'BACHELOR' | 'MASTER' | 'DOCTOR';

export const DEGREE_LABELS: Record<Degree, string> = {
  BACHELOR: '학사',
  MASTER: '석사',
  DOCTOR: '박사',
};

/** 셀렉트 · 엑셀 안내가 함께 쓰는 순서 (낮은 학위부터) */
export const DEGREES: Degree[] = ['BACHELOR', 'MASTER', 'DOCTOR'];

/**
 * 줄을 가르는 **화면 전용 키**. 서버로 보내지 않는다 (`toQualificationPayload` 가 뺀다).
 *
 * 배열 자리(index)를 `key` 로 쓰면 가운데 줄을 지웠을 때 뒤 줄들의 자리가 한 칸씩 당겨져,
 * React 가 같은 DOM 을 재사용한다 — 지운 줄의 포커스 · 입력 중이던 날짜 · 한글 조합이
 * 다음 줄에 남아 값이 뒤바뀐 것처럼 보인다.
 */
export interface QualificationRowKey {
  rowKey: string;
}

/** 줄을 새로 만들 때 붙인다 — 값이 같아도 줄은 서로 다르다 */
export function newRowKey() {
  return crypto.randomUUID();
}

/** 서버와 주고받는 학력 한 줄 — 화면 전용 키가 섞이지 않는다 */
export interface EducationValue {
  majorId: number;
  degree: Degree;
  /** 학교명 — 선택 */
  school?: string;
}

/** 서버와 주고받는 자격증 한 줄 */
export interface CertificateValue {
  certificateId: number;
  /** 취득일 `YYYY-MM-DD` — 선택 */
  acquiredDate?: string;
}

/** 폼이 들고 있는 학력 한 줄 — 값 + 화면 전용 키 */
export interface EducationInput extends EducationValue, QualificationRowKey {}

/** 폼이 들고 있는 자격증 한 줄 */
export interface CertificateInput
  extends CertificateValue, QualificationRowKey {}

/**
 * 사원 상세 응답의 학력 — 마스터를 조인해 **표시명이 함께** 온다.
 * 화면은 이름을 다시 찾지 않고 이 값을 그대로 적는다.
 */
export interface EducationView extends EducationValue {
  majorName: string;
}

export interface CertificateView extends CertificateValue {
  certificateName: string;
}
