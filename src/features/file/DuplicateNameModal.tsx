'use client';

import Modal from '@/components/Modal';

/**
 * 동명 문서가 있을 때 확인.
 * 서버가 409 `FILE_NAME_DUPLICATED` 로 한 번 막고, 확인하면
 * `allowDuplicateName: true` 로 같은 파일을 다시 올린다.
 */
export default function DuplicateNameModal({
  fileName,
  message,
  onCancel,
  onConfirm,
}: {
  fileName: string;
  /** 백엔드 안내 문구 */
  message: string;
  onCancel: () => void;
  onConfirm: () => void;
}) {
  return (
    <Modal
      title="같은 이름의 문서가 있습니다"
      onClose={onCancel}
      className="w-full max-w-sm rounded-xl p-6 shadow-2xl"
    >
      {/* 제목은 Modal 이 `title` 로 그린다 — 여기서 또 쓰면 중복 낭독된다 */}
      <p className="mt-2 text-xs break-keep text-text-secondary">{message}</p>
      <p className="mt-2 text-xs break-keep text-text-secondary">
        <b className="text-text-primary">{fileName}</b> 을(를) 새 문서로
        추가할까요? 기존 문서의 새 버전으로 올리려면 취소한 뒤 해당 문서 메뉴의{' '}
        <b className="text-text-primary">새 버전 올리기</b> 를 쓰세요.
      </p>

      <div className="mt-5 flex justify-end gap-2">
        <button
          type="button"
          onClick={onCancel}
          className="cursor-pointer rounded-lg px-4 py-1.5 text-[11px] font-medium text-text-secondary hover:bg-bg-hover"
        >
          취소
        </button>
        <button
          type="button"
          onClick={onConfirm}
          className="cursor-pointer rounded-lg bg-btn-primary px-4 py-1.5 text-[11px] font-semibold text-white hover:bg-btn-primary-hover"
        >
          새 문서로 추가
        </button>
      </div>
    </Modal>
  );
}
