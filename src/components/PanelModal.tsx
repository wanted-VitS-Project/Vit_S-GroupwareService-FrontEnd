'use client';

import Modal from '@/components/Modal';

/**
 * 하단 버튼 줄 — 본문과 구분선으로 나뉜다.
 *
 * ⚠️ **마지막 버튼(실행 버튼)에 최소 폭을 준다.** 이 줄은 오른쪽 정렬이라,
 *    라벨이 `삭제 → 삭제 중…` 처럼 길어지면 왼쪽의 `취소` 가 밀려 버튼이 흔들린다.
 *    폼마다 고치지 않도록 여기 한 곳에서 자리를 잡아 둔다 —
 *    지금 쓰는 라벨은 `메일 재발송`(가장 김)까지 전부 이 폭 안에 들어온다.
 *    (버튼 두 개를 `div` 로 묶어 넘기는 모달이 있어 **자손 선택자**로 잡는다)
 */
export function ModalFooter({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex items-center justify-end gap-4 border-t border-border-default bg-bg-surface px-5 py-3.5 [&_button:last-child]:min-w-[104px]">
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
