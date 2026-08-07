import type { ApprovalLineStatus } from './types';

/**
 * 결재선 한 명의 처리 상태 표기. 목록 아바타 · 블록 스텝퍼 · 상세 타임라인이 함께 쓴다.
 * 색과 문구를 화면마다 따로 두면 같은 상태가 다르게 보인다.
 */
export const LINE_STATUS_LABELS: Record<ApprovalLineStatus, string> = {
  WAITING: '대기',
  ACTIVE: '결재 차례',
  APPROVED: '승인',
  REJECTED: '반려',
  CANCELED: '취소',
};

export const LINE_STATUS_CLASS: Record<ApprovalLineStatus, string> = {
  WAITING: 'bg-[#ECEEF4] text-[#6C7389]',
  ACTIVE: 'bg-[#EEF2FF] text-[#3B5BDB]',
  APPROVED: 'bg-[#ECFDF3] text-[#12B76A]',
  REJECTED: 'bg-[#FEF2F2] text-[#E7000B]',
  CANCELED: 'bg-[#ECEEF4] text-[#C7CCD9]',
};
