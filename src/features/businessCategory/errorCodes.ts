/** 사업 카테고리 응답 코드 단일 소스. (.ai/API.md 15~18) */

export const CATEGORY_CODES = {
  /** 409 — 이름 중복 */
  nameDuplicated: 'BUSINESS_CATEGORY_NAME_DUPLICATED',
  /** 409 — 업무코드 중복 */
  codeDuplicated: 'BUSINESS_CATEGORY_CODE_DUPLICATED',
  /** 409 — 연결된 프로젝트가 있어 삭제 불가 (건수는 message 문구에 포함) */
  inUse: 'BUSINESS_CATEGORY_IN_USE',
  /** 404 — 없거나 이미 삭제됨 */
  notFound: 'BUSINESS_CATEGORY_NOT_FOUND',
} as const;
