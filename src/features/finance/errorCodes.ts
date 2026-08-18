/**
 * 재무 도메인 응답 코드 단일 소스.
 * 형식 오류가 404 로 오기도 해서 분기는 status 가 아니라 code 로 한다.
 */

import { ApiError } from '@/lib/api';

export const FINANCE_CODES = {
  /** 403: 재무 화면 접근 권한 없음 */
  accessDenied: 'FINANCE_ACCESS_DENIED',
  /** 403: 편집 권한 없음. 화면은 볼 수 있어 문구만 띄운다 */
  editDenied: 'FINANCE_EDIT_ACCESS_DENIED',

  /** 400: 비밀번호가 걸린 엑셀. 비밀번호를 받아 다시 부른다 */
  csvPasswordRequired: 'FINANCE_CSV_PASSWORD_REQUIRED',
  /** 400: 비밀번호가 틀렸다 */
  csvPasswordInvalid: 'FINANCE_CSV_PASSWORD_INVALID',
  /** 404: CSV · 엑셀 형식이 아니다 */
  csvInvalidFile: 'FINANCE_INVALID_CSV_FILE',
  /** 400: 필수 컬럼 매핑 누락 */
  csvMappingRequired: 'FINANCE_CSV_MAPPING_REQUIRED',

  /** 400: 이미 매칭된 입출금 */
  alreadyMatched: 'FINANCE_CASH_FLOW_ALREADY_MATCHED',
  /** 400: 매칭되지 않은 건의 해제 */
  notMatched: 'FINANCE_CASH_FLOW_NOT_MATCHED',
  /** 400: 입출금 구분과 정산 블록 타입 불일치 */
  matchTypeMismatch: 'FINANCE_MATCH_TYPE_MISMATCH',
  /** 400: 이미 매칭된 정산 블록 */
  blockAlreadyMatched: 'FINANCE_SETTLEMENT_BLOCK_ALREADY_MATCHED',
} as const;

function codeOf(error: unknown) {
  return error instanceof ApiError ? error.code : undefined;
}

/** 비밀번호를 받아야 하는지. 미입력과 오입력을 함께 본다 */
export function isCsvPasswordIssue(error: unknown) {
  const code = codeOf(error);

  return (
    code === FINANCE_CODES.csvPasswordRequired ||
    code === FINANCE_CODES.csvPasswordInvalid
  );
}

/** 비밀번호가 틀린 경우. 처음 요구할 때와 문구를 달리한다 */
export function isCsvPasswordInvalid(error: unknown) {
  return codeOf(error) === FINANCE_CODES.csvPasswordInvalid;
}

/** 파일 형식이 아닌 경우. 404 로 오므로 code 로 판정한다 */
export function isCsvInvalidFile(error: unknown) {
  return codeOf(error) === FINANCE_CODES.csvInvalidFile;
}
