/**
 * 전공 · 자격증 마스터 응답 코드 단일 소스.
 *
 * 두 도메인이 **접두어만 다르고 규칙이 같다** (`MAJOR_*` · `CERT_*`) —
 * 화면이 하나라 코드도 종류로 골라 쓴다. 분기는 status 가 아니라 `code` 로 한다.
 */

import type { MasterItemKind } from './types';

const CODES = {
  major: {
    nameDuplicated: 'MAJOR_NAME_DUPLICATED',
    /** 409 — 쓰는 사원이 있어 삭제 불가. **사원 수는 서버 `message` 에 담겨 온다** */
    inUse: 'MAJOR_IN_USE',
    notFound: 'MAJOR_NOT_FOUND',
  },
  certificate: {
    nameDuplicated: 'CERT_NAME_DUPLICATED',
    inUse: 'CERT_IN_USE',
    notFound: 'CERT_NOT_FOUND',
  },
} as const;

export function codesOf(kind: MasterItemKind) {
  return CODES[kind];
}

/**
 * 사원 등록 · 수정이 **없는 항목**을 받았을 때. (404)
 *
 * 목록을 띄워 둔 사이 관리자가 항목을 지운 경우다 — 고를 값이 사라진 것이라
 * 폼은 그 줄을 다시 고르게 안내하고 목록을 새로 받는다.
 */
export const ITEM_NOT_FOUND_CODES: string[] = [
  CODES.major.notFound,
  CODES.certificate.notFound,
  /** 엑셀 일괄 등록 검증이 쓰는 행 단위 코드 */
  'EDU_NOT_FOUND',
];

export function isItemNotFoundCode(code: string | undefined) {
  return code !== undefined && ITEM_NOT_FOUND_CODES.includes(code);
}
