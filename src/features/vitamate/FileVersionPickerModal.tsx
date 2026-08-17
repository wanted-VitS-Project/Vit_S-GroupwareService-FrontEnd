'use client';

import { useState } from 'react';

import Modal from '@/components/Modal';
import { ModalFooter } from '@/components/PanelModal';
import LoadingSpinner from '@/components/Spinner';
import { extensionLabel, extensionStyle } from '@/features/file/format';
import type { IndexStatus, ProjectFileVersion } from '@/features/file/types';

import { type DocumentRole, ROLE_LABEL } from './types';

/**
 * 기준 · 대상 문서 선택 모달 (역할만 바꿔 재사용한다).
 *
 * 파일과 파일 **버전**은 다르다 — 같은 문서라도 버전에 따라 결과가 달라져서
 * 목록도 버전 단위다. 프로젝트 전체가 대상이라 다른 스텝에 올린 기준 문서도 고를 수 있다.
 *
 * 두 가지를 미리 막는다 (서버도 막지만 눌러 보고 알게 되면 늦다).
 * - `indexStatus !== 'COMPLETED'` — AI 가 아직 문서를 못 읽었다
 * - 반대 역할에 이미 넣은 버전 — 같은 버전을 기준·대상 양쪽에 둘 수 없다
 */
export default function FileVersionPickerModal({
  versions,
  loadError,
  isIndexing,
  role,
  selectedIds,
  /** 반대 역할이 이미 가져간 버전 */
  takenIds,
  onConfirm,
  onClose,
}: {
  /** 아직 안 왔으면 null — 목록은 실행 모달이 한 번만 받아 두 역할이 나눠 쓴다 */
  versions: ProjectFileVersion[] | null;
  loadError: string;
  /** 아직 읽는 중인 문서가 있는지 — 목록이 저절로 갱신된다는 것을 알린다 */
  isIndexing: boolean;
  role: DocumentRole;
  selectedIds: number[];
  takenIds: number[];
  onConfirm: (fileVersionIds: number[]) => void;
  onClose: () => void;
}) {
  /** 확인을 눌러야 반영한다 — 취소하면 원래 선택이 남아야 한다 */
  const [draft, setDraft] = useState<number[]>(selectedIds);

  function toggle(fileVersionId: number) {
    setDraft((previous) =>
      previous.includes(fileVersionId)
        ? previous.filter((id) => id !== fileVersionId)
        : [...previous, fileVersionId],
    );
  }

  const title = `${ROLE_LABEL[role]} 선택`;

  return (
    <Modal
      title={title}
      onClose={onClose}
      /* 실행 모달과 같은 이유로 높이 고정 — 문서가 1개든 30개든 패널은 그대로다 */
      className="flex h-[520px] max-h-[80vh] w-full max-w-[560px] flex-col overflow-hidden rounded-base border border-border-default shadow-2xl"
      header={
        <div className="flex items-center justify-between gap-2 border-b border-border-default px-5 py-3.5">
          <div className="min-w-0">
            <h2 className="text-body-m font-semibold text-text-primary">
              {title}
            </h2>
            <p className="mt-0.5 text-caption text-text-secondary">
              {role === 'REFERENCE'
                ? '비교 기준이 되는 문서를 고르세요.'
                : '검토받을 문서를 고르세요.'}
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="닫기"
            className="flex size-6 shrink-0 cursor-pointer items-center justify-center rounded-button-md text-text-secondary hover:bg-bg-hover"
          >
            ✕
          </button>
        </div>
      }
    >
      {/*
       * 회색으로 막힌 문서를 보고 "고장인가" 싶지 않게, 기다리면 풀린다는 것을 알린다.
       * 목록은 5초마다 저절로 다시 받으므로 사용자가 닫았다 열 필요가 없다.
       */}
      {isIndexing && (
        <p
          role="status"
          className="flex shrink-0 items-center gap-1.5 border-b border-yellow-border bg-yellow-bg-soft px-5 py-2 text-caption text-yellow-text"
        >
          <span
            aria-hidden
            className="size-2.5 animate-spin rounded-pill border border-yellow-border border-t-yellow-text"
          />
          AI가 아직 읽는 중인 문서가 있습니다. 끝나면 자동으로 선택할 수
          있습니다.
        </p>
      )}

      <div className="min-h-0 flex-1 overflow-y-auto px-5 py-3">
        {versions === null ? (
          <LoadingSpinner
            label="문서 목록을 불러오는 중입니다"
            className="py-16"
          />
        ) : loadError ? (
          <p className="py-10 text-center text-label text-text-secondary">
            {loadError}
          </p>
        ) : versions.length === 0 ? (
          <p className="py-10 text-center text-label text-text-secondary">
            프로젝트에 등록된 문서가 없습니다.
          </p>
        ) : (
          <ul className="flex flex-col gap-1.5">
            {versions.map((version) => (
              <VersionRow
                key={version.fileVersionId}
                version={version}
                isChecked={draft.includes(version.fileVersionId)}
                isTaken={takenIds.includes(version.fileVersionId)}
                onToggle={() => toggle(version.fileVersionId)}
              />
            ))}
          </ul>
        )}
      </div>

      <ModalFooter>
        <span className="mr-auto text-caption text-text-secondary">
          {draft.length}개 선택됨
        </span>
        <button
          type="button"
          onClick={onClose}
          className="cursor-pointer rounded-button-md border border-border-default px-3 py-1.5 text-detail font-medium text-text-secondary hover:bg-bg-hover"
        >
          취소
        </button>
        <button
          type="button"
          onClick={() => onConfirm(draft)}
          className="cursor-pointer rounded-button-md bg-ai-primary px-3 py-1.5 text-detail font-semibold text-text-white hover:bg-ai-primary-hover"
        >
          확인
        </button>
      </ModalFooter>
    </Modal>
  );
}

/**
 * 인덱싱이 안 끝난 문서를 왜 못 고르는지 알려주는 문구.
 * `COMPLETED` 에는 문구가 없어 `Partial` 이다.
 */
const INDEX_HINT: Partial<Record<IndexStatus, string>> = {
  PENDING: 'AI가 아직 읽는 중',
  PROCESSING: 'AI가 아직 읽는 중',
  FAILED: 'AI가 읽지 못한 문서',
};

function VersionRow({
  version,
  isChecked,
  isTaken,
  onToggle,
}: {
  version: ProjectFileVersion;
  isChecked: boolean;
  isTaken: boolean;
  onToggle: () => void;
}) {
  const isIndexed = version.indexStatus === 'COMPLETED';
  const isBlocked = !isIndexed || isTaken;
  /**
   * 이미 고른 항목은 **막지 않는다.**
   *
   * 목록은 폴링으로 갱신되므로 모달이 열린 채로 상태가 바뀔 수 있다. 고른 버전이
   * 재인덱싱으로 `PENDING` 이 되면 체크박스가 잠겨 **해제할 수도 없이** 그대로
   * 전송된다. 색은 그대로 흐리게 두되 해제는 열어 둔다.
   */
  const isDisabled = isBlocked && !isChecked;
  const hint = isTaken
    ? '반대쪽에 이미 선택됨'
    : (INDEX_HINT[version.indexStatus] ?? '');
  const style = extensionStyle(version.extension);

  return (
    <li>
      <label
        className={`flex items-center gap-2.5 rounded-lg border px-3 py-2 ${
          isDisabled
            ? 'cursor-not-allowed border-border-default opacity-50'
            : isChecked
              ? // 고를 수 없게 된 뒤에도 고른 상태면 흐리게 표시해 해제를 유도한다
                `cursor-pointer border-ai-primary bg-blue-bg-soft ${isBlocked ? 'opacity-60' : ''}`
              : 'cursor-pointer border-border-default hover:bg-bg-surface'
        }`}
      >
        <input
          type="checkbox"
          checked={isChecked}
          disabled={isDisabled}
          onChange={onToggle}
          className="size-3.5 shrink-0 accent-ai-primary"
        />
        <span
          style={{ color: style.text, backgroundColor: style.background }}
          className="shrink-0 rounded-button-sm px-1.5 py-0.5 text-micro font-bold"
        >
          {extensionLabel(version.extension)}
        </span>

        <span className="min-w-0 flex-1">
          <span className="block truncate text-detail font-medium text-text-primary">
            {version.name}
          </span>
          <span className="mt-0.5 flex items-center gap-1.5 text-micro text-text-secondary">
            <span>v{version.versionNo}</span>
            {version.latest && (
              <span className="rounded-button-sm bg-green-bg px-1 py-px font-semibold text-green-text">
                최신
              </span>
            )}
            {version.pageCount !== null && <span>{version.pageCount}p</span>}
            {hint && <span className="text-yellow-text">{hint}</span>}
          </span>
        </span>
      </label>
    </li>
  );
}
