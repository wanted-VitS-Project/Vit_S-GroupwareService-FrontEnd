'use client';

import dynamic from 'next/dynamic';

import ModalLoadingFallback from '@/components/ModalLoadingFallback';
import { useModal } from '@/lib/useModal';

import type { StepBlock } from './types';

const loadAddBlockModal = () => import('./AddBlockModal');
const AddBlockModal = dynamic(loadAddBlockModal, {
  loading: () => <ModalLoadingFallback title="블록 추가" />,
});

/** 스텝 화면 블록 목록 헤더의 블록 추가 버튼. */
export default function AddBlockButton({
  stepName,
  blocks,
  isBlocked = false,
  onBlocked,
  onBeforeCreate,
  onCreated,
}: {
  stepName: string;
  /** 새 블록 자리 계산용 — 아직 못 불러왔으면 null */
  blocks: StepBlock[] | null;
  /** 지금은 추가하면 안 되는 상황 (배치 편집 중) — 모달 대신 onBlocked 로 넘긴다 */
  isBlocked?: boolean;
  /** 막힌 이유를 알리는 쪽. 버튼을 disabled 로 두면 왜 안 되는지 알 수 없다 */
  onBlocked?: () => void;
  /** 생성 요청 직전 — 미뤄둔 배치 저장을 먼저 흘려보낼 때 쓴다 */
  onBeforeCreate?: () => void;
  onCreated?: () => void;
}) {
  const modal = useModal();

  return (
    <>
      <button
        type="button"
        onPointerEnter={() => void loadAddBlockModal()}
        onFocus={() => void loadAddBlockModal()}
        onClick={() => (isBlocked ? onBlocked?.() : modal.open())}
        className="flex shrink-0 cursor-pointer items-center gap-1.5 rounded-lg bg-btn-primary px-3 py-1.5 text-detail font-semibold text-text-white hover:bg-btn-primary-hover"
      >
        <svg
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          aria-hidden
          className="size-3"
        >
          <path d="M12 5v14M5 12h14" />
        </svg>
        블록 추가
      </button>

      {modal.isOpen && (
        <AddBlockModal
          stepName={stepName}
          blocks={blocks}
          onBeforeCreate={onBeforeCreate}
          onCreated={onCreated}
          onClose={modal.close}
        />
      )}
    </>
  );
}
