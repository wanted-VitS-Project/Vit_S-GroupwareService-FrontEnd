'use client';

import Modal from '@/components/Modal';

/** 하단 버튼 줄 — 본문과 구분선으로 나뉜다 */
export function ModalFooter({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex items-center justify-end gap-4 border-t border-[#1C1F2A]/10 bg-[#ECEEF4]/20 px-5 py-3.5">
      {children}
    </div>
  );
}

/** 카테고리 모달 공통 껍데기 — 패널 크기 · 제목 · 닫기 버튼 */
export default function CategoryModal({
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
      className="w-full max-w-[420px] overflow-hidden rounded-xl border border-[#1C1F2A]/10 shadow-2xl"
      header={
        <div className="flex items-center justify-between gap-2 border-b border-[#1C1F2A]/10 px-5 py-3.5">
          <h2 className="text-sm font-semibold text-[#1C1F2A]">{title}</h2>
          <button
            type="button"
            onClick={onClose}
            aria-label="닫기"
            className="flex size-6 cursor-pointer items-center justify-center rounded-md text-[#6C7389] hover:bg-[#ECEEF4]"
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
