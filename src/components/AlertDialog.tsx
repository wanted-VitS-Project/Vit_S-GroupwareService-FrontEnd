'use client';

import Modal from './Modal';

/**
 * 안내 · 경고 다이얼로그. (공용)
 *
 * 폼이 들어가는 큰 모달(`Modal` · `PanelModal`)과 쓰임이 다르다 —
 * **확인을 받거나 결과를 알리는** 용도라 아이콘 · 제목 · 설명 · 버튼 한 줄로 고정돼 있다.
 *
 * 버튼 개수로 둘로 나뉜다.
 * - `AlertDialogOneButton` — 알리기만 한다 (저장 완료)
 * - `AlertDialogTwoButton` — 고르게 한다 (저장할까요? · 삭제할까요?)
 *
 * 아이콘은 쓰는 쪽이 `DialogIcons` 넷 중 하나를 골라 넘긴다.
 * 색 · 버튼 · 글자 크기는 모두 `globals.css` 의 기존 토큰과 `.btn` 계열을 쓴다.
 *
 * **여닫는 것은 쓰는 쪽 몫이다** — 이 컴포넌트에는 `isOpen` 이 없다.
 * 조건부로 그렸다 지우면 `Modal` 이 `<dialog>` 를 열고 닫는다.
 *
 * ```tsx
 * {isConfirming && (
 *   <AlertDialogTwoButton
 *     icon={DialogIcons.danger}
 *     title="정말 삭제할까요?"
 *     description="삭제한 내용은 되돌릴 수 없습니다."
 *     confirmLabel="삭제"
 *     isDanger
 *     isBusy={isPending}
 *     onConfirm={remove}
 *     onCancel={() => setIsConfirming(false)}
 *   />
 * )}
 * ```
 */
interface AlertDialogProps {
  icon: React.ReactNode;
  title: string;
  description?: React.ReactNode;
  /** 요청 실패처럼 사용자가 바로 알아야 하는 부가 안내 */
  errorMessage?: string;
}

/** 알림형. 고를 것이 없어 확인 하나만 두고 폭을 꽉 채운다 */
export function AlertDialogOneButton({
  icon,
  title,
  description,
  errorMessage,
  confirmLabel = '확인',
  isBusy = false,
  onConfirm,
}: AlertDialogProps & {
  confirmLabel?: string;
  isBusy?: boolean;
  onConfirm: () => void;
}) {
  return (
    // 닫을 길이 확인 버튼뿐이라 Esc · 배경 클릭으로도 닫히게 둔다
    <Shell
      icon={icon}
      title={title}
      description={description}
      errorMessage={errorMessage}
      onClose={onConfirm}
    >
      <button
        type="button"
        onClick={onConfirm}
        disabled={isBusy}
        className="btn btn-primary w-full"
      >
        {confirmLabel}
      </button>
    </Shell>
  );
}

/** 선택형. 되돌릴 수 없는 동작이면 `isDanger` 로 확인 버튼을 빨갛게 한다 */
export function AlertDialogTwoButton({
  icon,
  title,
  description,
  errorMessage,
  confirmLabel = '확인',
  cancelLabel = '취소',
  isDanger = false,
  isBusy = false,
  onConfirm,
  onCancel,
}: AlertDialogProps & {
  confirmLabel?: string;
  cancelLabel?: string;
  isDanger?: boolean;
  /** 처리 중에는 두 버튼을 함께 막는다 — 취소로 빠지면 결과를 알 수 없다 */
  isBusy?: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}) {
  return (
    <Shell
      icon={icon}
      title={title}
      description={description}
      errorMessage={errorMessage}
      onClose={isBusy ? undefined : onCancel}
    >
      <button
        type="button"
        onClick={onCancel}
        disabled={isBusy}
        className="btn btn-gray w-40"
      >
        {cancelLabel}
      </button>
      <button
        type="button"
        onClick={onConfirm}
        disabled={isBusy}
        className={`btn w-40 ${isDanger ? 'btn-danger' : 'btn-primary'}`}
      >
        {confirmLabel}
      </button>
    </Shell>
  );
}

/** 아이콘 · 제목 · 설명은 둘이 같다 — 버튼만 갈아끼운다 */
function Shell({
  icon,
  title,
  description,
  errorMessage,
  onClose,
  children,
}: AlertDialogProps & {
  onClose?: () => void;
  children: React.ReactNode;
}) {
  return (
    <Modal
      title={title}
      onClose={onClose}
      header={icon}
      // 480px 고정이되 좁은 화면에서는 줄어든다 — 고정만 하면 모바일에서 잘린다
      className="w-120 max-w-[calc(100vw-2rem)] rounded-base bg-bg-card p-8"
    >
      <div className="mt-6 text-center">
        <h2 className="text-heading-xl font-semibold text-text-primary">
          {title}
        </h2>
        {description && (
          <div className="mt-3 text-heading-m text-text-secondary">
            {description}
          </div>
        )}
        {errorMessage && (
          <p
            role="alert"
            className="text-body-s mt-3 rounded-lg bg-red-bg-soft px-3 py-2 text-text-danger"
          >
            {errorMessage}
          </p>
        )}
      </div>

      <div className="mt-6 flex justify-center gap-2">{children}</div>
    </Modal>
  );
}

const INFO_PATHS = (
  <>
    <circle cx="12" cy="12" r="9" />
    <path d="M12 11v5" />
    <path d="M12 8h.01" />
  </>
);

const SUCCESS_PATHS = (
  <>
    <circle cx="12" cy="12" r="9" />
    <path d="m8.5 12.5 2.5 2.5 4.5-5" />
  </>
);

const WARNING_PATHS = (
  <>
    <path d="M10.3 3.9 1.8 18a2 2 0 0 0 1.7 3h17a2 2 0 0 0 1.7-3L13.7 3.9a2 2 0 0 0-3.4 0" />
    <path d="M12 9v4" />
    <path d="M12 17h.01" />
  </>
);

/**
 * 다이얼로그 아이콘 4종.
 *
 * 색만 다르면 색을 구별하지 못하는 사용자에게는 전부 같아 보인다 —
 * **모양도 함께** 다르게 뒀다 (원+느낌표 · 체크 · 삼각형).
 */
export const DialogIcons = {
  /** 물어볼 때 — 변경사항을 저장할까요? */
  info: <DialogIcon>{INFO_PATHS}</DialogIcon>,
  /** 끝났다고 알릴 때 — 저장 완료 */
  success: <DialogIcon>{SUCCESS_PATHS}</DialogIcon>,
  /** 주의를 줄 때. 되돌릴 수는 있다 */
  warning: <DialogIcon>{WARNING_PATHS}</DialogIcon>,
  /** **되돌릴 수 없을 때** — 삭제 */
  danger: <DialogIcon isDanger>{WARNING_PATHS}</DialogIcon>,
};

function DialogIcon({
  isDanger = false,
  children,
}: {
  isDanger?: boolean;
  children: React.ReactNode;
}) {
  return (
    <svg
      aria-hidden
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={`mx-auto size-16 ${
        isDanger ? 'text-text-danger' : 'text-text-primary-blue'
      }`}
    >
      {children}
    </svg>
  );
}
