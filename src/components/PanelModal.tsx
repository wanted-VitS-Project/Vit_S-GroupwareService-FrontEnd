'use client';

import Modal from '@/components/Modal';

/** 하단 버튼 줄 — 본문과 구분선으로 나뉜다 */
export function ModalFooter({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex items-center justify-end gap-4 border-t border-border-default bg-bg-surface px-5 py-3.5">
      {children}
    </div>
  );
}

/** 설정 화면 공통 모달 껍데기 — 패널 크기 · 제목 · 닫기 버튼 */
export default function PanelModal({
  title,
  onClose,
  children,
}: {
  title: string;
  onClose: () => void;
  children: React.ReactNode;
}) {
  return (
    <Modal
      title={title}
      onClose={onClose}
      className="w-full max-w-[420px] overflow-hidden rounded-base border border-border-default shadow-2xl"
      header={
        <div className="flex items-center justify-between gap-2 border-b border-border-default px-5 py-3.5">
          <h2 className="text-body-m font-semibold text-text-primary">
            {title}
          </h2>
          <button
            type="button"
            onClick={onClose}
            aria-label="닫기"
            className="flex size-6 cursor-pointer items-center justify-center rounded-button-md text-text-secondary hover:bg-bg-hover"
          >
            ✕
          </button>
        </div>
      }
    >
      {children}
    </Modal>
  );
}
