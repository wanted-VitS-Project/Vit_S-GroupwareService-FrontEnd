// 프로젝트 도메인 화면 라벨 단일 소스.
// 컴포넌트 파일에 두지 않는다. 라벨을 화면 컴포넌트에서 내보내면
// 형제 컴포넌트가 그것을 가져다 쓰면서 순환 참조가 생긴다 —
// 번들이 한쪽 모듈을 먼저 평가해 Cannot access '...' before initialization 로 죽는다.
// (2026-08-13 MEMBER_PERMISSION_LABELS 로 실제로 겪은 문제다)
// 값 자체는 constants/status.ts 와 같은 규칙이다 — 키는 백엔드 값과 같아야 한다.

import type {
  CloseReasonCode,
  ProjectPermission,
  StepPermission,
  StepStatusChange,
} from './types';

// 프로젝트 참여자 권한.
// NONE 은 폐기됐다 (2026-08-06) — 차단은 참여자 제거로 표현한다.
export const MEMBER_PERMISSION_LABELS: Record<ProjectPermission, string> = {
  VIEWER: '열람',
  EDITOR: '편집',
};

export const MEMBER_PERMISSIONS = Object.keys(
  MEMBER_PERMISSION_LABELS,
) as ProjectPermission[];

// 스텝 권한.
// 여기만 NONE 이 살아 있다 — 스텝 단위로는 "이 스텝만 가린다" 가 성립한다 (STP-011).
export const STEP_PERMISSION_LABELS: Record<StepPermission, string> = {
  EDITOR: '편집',
  VIEWER: '열람',
  NONE: '차단',
};

export const STEP_PERMISSIONS = Object.keys(
  STEP_PERMISSION_LABELS,
) as StepPermission[];

// 스텝 상태 변경으로 고를 수 있는 값.
// DONE 은 없다 — 미완료 이슈 처리 선택이 필요해 완료 처리 API 소관이다.
export const STEP_STATUS_CHANGE_LABELS: Record<StepStatusChange, string> = {
  NOT_STARTED: '진행 전',
  IN_PROGRESS: '진행중',
};

/** 프로젝트 종결 사유 */
export const CLOSE_REASON_LABELS: Record<CloseReasonCode, string> = {
  NOT_PARTICIPATED: '미참여',
  FAILED_BID: '유찰',
  NOT_SELECTED: '미선정',
  CANCELED: '취소',
};

export const CLOSE_REASONS = Object.keys(
  CLOSE_REASON_LABELS,
) as CloseReasonCode[];

// 종결 사유 라벨 — 응답이 string 인 자리에서 쓴다.
// 상세 조회의 closeReasonCode 는 타입이 string 이라 단언(as)으로 좁히면
// 백엔드가 사유를 추가했을 때 화면에 undefined 가 그려진다.
// 모르는 코드는 코드 값을 그대로 돌려준다.
export function closeReasonLabel(code: string) {
  return CLOSE_REASON_LABELS[code as CloseReasonCode] ?? code;
}
