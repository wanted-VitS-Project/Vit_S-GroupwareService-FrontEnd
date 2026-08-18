import type { ApprovalLineStatus } from './types';

/** 결재선 한 명의 처리 상태 표기. 목록 · 블록 · 상세가 함께 쓴다 */
export const LINE_STATUS_LABELS: Record<ApprovalLineStatus, string> = {
  WAITING: '대기',
  ACTIVE: '결재 차례',
  APPROVED: '승인',
  REJECTED: '반려',
  CANCELED: '취소',
};

export const LINE_STATUS_CLASS: Record<ApprovalLineStatus, string> = {
  WAITING: 'bg-bg-hover text-text-secondary',
  ACTIVE: 'bg-blue-bg-soft text-text-primary-blue',
  APPROVED: 'bg-green-bg text-green-text',
  REJECTED: 'bg-red-bg-soft text-text-danger',
  CANCELED: 'bg-bg-hover text-text-muted',
};
