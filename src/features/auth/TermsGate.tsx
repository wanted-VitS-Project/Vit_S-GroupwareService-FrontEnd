'use client';

import { useId, useState } from 'react';

import Modal, { ModalButton } from '@/components/Modal';
import { messageOf } from '@/lib/api';

import { agreeToTerms } from './api';
import { TERMS_DOCUMENTS } from './termsContent';

interface TermsGateProps {
  /** '1 / 2' 처럼 남은 단계를 알려주는 문구 */
  stepLabel?: string;
  /** 이미 동의한 경우. 확인만 하고 넘어간다 */
  hasAgreed?: boolean;
  onDone: () => void;
}

/** 저장소에서 쓰는 공통 모달 폭 */
const PANEL = 'w-full max-w-[576px] rounded-base p-8 shadow-2xl';

/**
 * 약관 동의 게이트. 문서 2건을 각각 체크받고 서버에는 한 번만 보낸다.
 * 다음 동작은 여기서 정하지 않고 onDone 을 받은 쪽이 정한다.
 */
export default function TermsGate({
  stepLabel,
  hasAgreed,
  onDone,
}: TermsGateProps) {
  const [error, setError] = useState('');
  const [isPending, setIsPending] = useState(false);
  /** 문서 id 별 동의 여부. 이미 동의한 계정은 확인만 하므로 검사하지 않는다 */
  const [checked, setChecked] = useState<Record<string, boolean>>({});
  /** 펼친 문서. 스크롤이 모달 하나로 유지되도록 한 번에 하나만 편다 */
  const [openId, setOpenId] = useState<string | null>(null);

  const isAllChecked = TERMS_DOCUMENTS.every((doc) => checked[doc.id]);
  const canSubmit = hasAgreed || isAllChecked;

  async function handleAgree() {
    // 확인만 한 경우. 불필요한 호출을 피한다
    if (hasAgreed) {
      onDone();
      return;
    }

    if (!isAllChecked) {
      setError('필수 약관에 모두 동의해야 서비스를 이용할 수 있습니다.');
      return;
    }

    setError('');
    setIsPending(true);

    try {
      // 화면은 2건이지만 서버 동의 기록은 하나다
      await agreeToTerms();
      onDone();
    } catch (caught) {
      setError(
        messageOf(
          caught,
          '동의를 처리하지 못했습니다. 잠시 후 다시 시도해주세요.',
        ),
      );
      setIsPending(false);
    }
  }

  return (
    <Modal
      title={hasAgreed ? '약관 확인' : '약관 동의'}
      stepLabel={stepLabel}
      className={PANEL}
    >
      <p className="mt-2 text-body-m break-keep text-text-secondary">
        {hasAgreed
          ? '이미 동의한 약관입니다.'
          : '서비스 이용을 위해 아래 약관에 모두 동의해주세요.'}
      </p>

      <div className="mt-5 flex flex-col gap-3">
        {TERMS_DOCUMENTS.map((doc) => (
          <TermsSection
            key={doc.id}
            doc={doc}
            isOpen={openId === doc.id}
            isChecked={checked[doc.id] ?? false}
            isReadOnly={hasAgreed === true}
            isPending={isPending}
            onToggleOpen={() =>
              setOpenId((current) => (current === doc.id ? null : doc.id))
            }
            onCheck={(next) => {
              setChecked((prev) => ({ ...prev, [doc.id]: next }));
              setError('');
            }}
          />
        ))}
      </div>

      {/* 에러가 떠도 버튼 위치가 흔들리지 않게 자리를 잡아둔다 */}
      <p
        role="alert"
        className="mt-4 min-h-5 text-label break-keep text-text-danger"
      >
        {error}
      </p>

      <ModalButton onClick={handleAgree} disabled={isPending || !canSubmit}>
        {isPending ? '처리 중…' : hasAgreed ? '다음' : '동의하고 계속하기'}
      </ModalButton>
    </Modal>
  );
}

/**
 * 약관 한 건. 체크박스는 접힌 상태에서도 보인다.
 * 자체 스크롤을 두지 않는다 — 모달 스크롤과 겹치면 위치를 놓친다.
 */
function TermsSection({
  doc,
  isOpen,
  isChecked,
  isReadOnly,
  isPending,
  onToggleOpen,
  onCheck,
}: {
  doc: (typeof TERMS_DOCUMENTS)[number];
  isOpen: boolean;
  isChecked: boolean;
  isReadOnly: boolean;
  isPending: boolean;
  onToggleOpen: () => void;
  onCheck: (next: boolean) => void;
}) {
  const bodyId = useId();

  return (
    <section className="overflow-hidden rounded-button-sm border border-border-default">
      <h3>
        <button
          type="button"
          onClick={onToggleOpen}
          aria-expanded={isOpen}
          aria-controls={bodyId}
          className="flex w-full cursor-pointer items-center justify-between gap-3 px-4 py-3 text-left hover:bg-bg-hover"
        >
          <span className="text-body-m font-bold break-keep text-text-primary">
            {doc.title}
          </span>
          <span className="flex shrink-0 items-center gap-1.5 text-caption text-text-secondary">
            {isOpen ? '접기' : '전문 보기'}
            <Chevron isOpen={isOpen} />
          </span>
        </button>
      </h3>

      {isOpen && (
        <div
          id={bodyId}
          className="border-t border-border-default bg-bg-hover p-4 text-label break-keep text-text-secondary"
        >
          {/* 색 대신 굵기와 배경 대비로 세운다 — 본문 조문과 섞이지 않게 */}
          <p className="rounded-lg border border-border-default bg-bg-card px-3 py-2 text-pretty">
            <b className="font-bold text-text-primary">데모 서비스 안내</b> —{' '}
            {doc.notice}
          </p>
          <div className="mt-3">{doc.body}</div>
        </div>
      )}

      {!isReadOnly && (
        <label className="flex cursor-pointer items-start gap-2 border-t border-border-default px-4 py-3 text-label text-text-primary hover:bg-bg-hover">
          <input
            type="checkbox"
            checked={isChecked}
            disabled={isPending}
            onChange={(event) => onCheck(event.target.checked)}
            className="mt-0.5 cursor-pointer"
          />
          <span className="break-keep">{doc.label}</span>
        </label>
      )}
    </section>
  );
}

/** 펼치면 위를 가리킨다 */
function Chevron({ isOpen }: { isOpen: boolean }) {
  return (
    <svg
      aria-hidden
      viewBox="0 0 16 16"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={`size-4 shrink-0 transition-transform ${isOpen ? 'rotate-180' : ''}`}
    >
      <path d="m3 6 5 5 5-5" />
    </svg>
  );
}
