'use client';

import { useEffect, useRef, useState } from 'react';

import { notifyToast } from '@/components/Toast';
import EmployeeSearchInput from '@/features/employee/EmployeeSearchInput';
import { uploadFile } from '@/features/file/upload';
import { messageOf } from '@/lib/api';

import { addDocument, removeDocument, setLines, updateRevision } from './api';
import ErrorText from './ErrorText';
import type {
  ApprovalDetailLine,
  ApprovalDocument,
  ApprovalLine,
  ApprovalRevision,
} from './types';

/** 제목 · 내용 입력 공통 스타일 */
const FIELD_CLASS =
  'w-full rounded-lg border border-border-default bg-bg-surface px-2.5 py-1.5 text-caption text-text-primary placeholder:text-text-secondary focus:outline-2 focus:outline-offset-2 focus:outline-border-primary';

interface ApprovalDraftFormProps {
  approvalId: number;
  revisionId: number;
  /** 파일을 붙일 블록. 업로드 API 가 블록 단위다 */
  blockId: number;
  revision: ApprovalRevision;
  /** 편집 화면을 닫는다. 남은 입력은 폼이 먼저 저장한다 */
  onClose: () => void;
  /** 바뀐 항목을 상위 회차에 반영한다 */
  onChanged: (next: Partial<ApprovalRevision>) => void;
}

/**
 * 결재 초안 작성 · 수정 폼. 모든 항목이 즉시 저장된다.
 * 하단 저장 버튼은 아직 블러되지 않은 입력만 보내고 화면을 닫는다.
 */
export default function ApprovalDraftForm({
  approvalId,
  revisionId,
  blockId,
  revision,
  onClose,
  onChanged,
}: ApprovalDraftFormProps) {
  const [title, setTitle] = useState(revision.title ?? '');
  const [content, setContent] = useState(revision.content ?? '');
  /** 마지막으로 서버에 보낸 값. 값이 그대로면 블러마다 요청하지 않는다 */
  const [saved, setSaved] = useState({
    title: revision.title ?? '',
    content: revision.content ?? '',
  });
  const [error, setError] = useState('');

  /** 아직 서버에 못 보낸 입력이 있는지 */
  const isDirty =
    title.trim() !== saved.title || content.trim() !== saved.content;

  /* 저장 전 이탈을 막는다. 앱 내부 라우팅은 차단 API 가 없어 막지 못한다 */
  useEffect(() => {
    if (!isDirty) return;

    const confirmLeave = (event: BeforeUnloadEvent) => event.preventDefault();

    window.addEventListener('beforeunload', confirmLeave);
    return () => window.removeEventListener('beforeunload', confirmLeave);
  }, [isDirty]);

  async function saveField(field: 'title' | 'content', value: string) {
    if (saved[field] === value) return;

    setError('');
    try {
      await updateRevision(approvalId, revisionId, { [field]: value });
      setSaved((prev) => ({ ...prev, [field]: value }));
      // 제목 · 내용도 검증 대상이라 상위가 상신 가능 여부를 다시 판정한다
      onChanged({ [field]: value });
    } catch (caught) {
      setError(messageOf(caught, '저장하지 못했습니다.'));
    }
  }

  /** 닫기 전에 아직 블러되지 않은 입력을 저장한다 */
  async function closeAfterSave() {
    await saveField('title', title.trim());
    await saveField('content', content.trim());
    onClose();
  }

  return (
    <div className="flex flex-col gap-3">
      <Field label="제목">
        <input
          type="text"
          value={title}
          onChange={(event) => setTitle(event.target.value)}
          onBlur={() => saveField('title', title.trim())}
          placeholder="제목 입력"
          className={FIELD_CLASS}
        />
      </Field>

      <Field label="내용">
        <textarea
          value={content}
          onChange={(event) => setContent(event.target.value)}
          onBlur={() => saveField('content', content.trim())}
          placeholder="내용 입력"
          rows={4}
          className={`resize-y ${FIELD_CLASS}`}
        />
      </Field>

      <DocumentSection
        approvalId={approvalId}
        revisionId={revisionId}
        blockId={blockId}
        documents={revision.documents}
        onChanged={(documents) => onChanged({ documents })}
      />

      <LineSection
        approvalId={approvalId}
        revisionId={revisionId}
        lines={revision.lines}
        onChanged={(lines) => onChanged({ lines })}
      />

      <ErrorText message={error} />

      <button
        type="button"
        onClick={closeAfterSave}
        className="btn btn-md btn-primary w-full"
      >
        저장
      </button>
    </div>
  );
}

function Field({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <label className="block">
      <span className="mb-1 block text-caption font-semibold text-text-primary">
        {label}
      </span>
      {children}
    </label>
  );
}

/** 결재 문서. 공용 파일 API 로 올린 뒤 받은 파일 버전만 결재에 연결한다 */
function DocumentSection({
  approvalId,
  revisionId,
  blockId,
  documents,
  onChanged,
}: {
  approvalId: number;
  revisionId: number;
  blockId: number;
  documents: ApprovalDocument[];
  onChanged: (documents: ApprovalDocument[]) => void;
}) {
  const [isBusy, setIsBusy] = useState(false);
  const [error, setError] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);

  async function attach(file: File) {
    if (isBusy) return;

    setIsBusy(true);
    setError('');

    try {
      // 공용 업로드를 끝낸 뒤 받은 파일 버전을 결재 문서로 연결한다
      const uploaded = await uploadFile({ blockId, file });
      const added = await addDocument(approvalId, revisionId, {
        fileVersionId: uploaded.fileVersionId,
      });

      onChanged([...documents, added]);
      notifyToast(`${file.name} 을(를) 첨부했습니다.`);
    } catch (caught) {
      const message = messageOf(caught, '문서를 추가하지 못했습니다.');

      setError(message);
      // 폼 위쪽을 보고 있을 수 있어 토스트로 알린다
      notifyToast(message, 'error');
    } finally {
      setIsBusy(false);
    }
  }

  async function detach(documentId: number) {
    if (isBusy) return;

    setIsBusy(true);
    setError('');

    try {
      await removeDocument(approvalId, revisionId, documentId);
      onChanged(documents.filter((doc) => doc.documentId !== documentId));
    } catch (caught) {
      setError(messageOf(caught, '문서를 제거하지 못했습니다.'));
    } finally {
      setIsBusy(false);
    }
  }

  return (
    <section>
      <h4 className="mb-1 text-caption font-semibold text-text-primary">
        결재 문서
      </h4>

      {documents.length > 0 && (
        <ul className="mb-1.5 flex flex-col gap-1">
          {documents.map((document) => (
            <li
              key={document.documentId}
              className="flex items-center gap-2 rounded-button-sm border border-border-default px-2 py-1.5"
            >
              <span className="min-w-0 flex-1 truncate text-caption text-text-primary">
                {/* 회차 상세에는 파일명이 없어 버전 번호로 구분한다 */}
                {document.fileName ?? `파일 버전 #${document.fileVersionId}`}
              </span>
              <button
                type="button"
                onClick={() => detach(document.documentId)}
                disabled={isBusy}
                className="shrink-0 cursor-pointer text-caption text-text-secondary hover:text-text-danger disabled:cursor-not-allowed disabled:text-text-muted"
              >
                제거
              </button>
            </li>
          ))}
        </ul>
      )}

      <input
        ref={inputRef}
        type="file"
        className="hidden"
        onChange={(event) => {
          const file = event.target.files?.[0];
          // 같은 파일을 다시 골라도 change 가 나도록 값을 비운다
          event.target.value = '';
          if (file) void attach(file);
        }}
      />
      <button
        type="button"
        onClick={() => inputRef.current?.click()}
        disabled={isBusy}
        className="w-full cursor-pointer rounded-lg border border-dashed border-border-default py-3 text-caption text-text-secondary hover:bg-bg-surface disabled:cursor-not-allowed"
      >
        {isBusy ? '처리 중…' : '클릭하여 업로드'}
      </button>

      <ErrorText message={error} className="mt-1" />
    </section>
  );
}

/** 조회 응답과 모양을 맞춘다. 처리 상태가 없으면 대기로 채운다 */
function toDetailLines(lines: ApprovalLine[]): ApprovalDetailLine[] {
  return lines.map((line) => ({
    ...line,
    status: line.status ?? 'WAITING',
    opinion: line.opinion ?? null,
    processedAt: line.processedAt ?? null,
  }));
}

/**
 * 결재선. 전체 치환이라 한 명만 바꿔도 목록 전체를 보낸다.
 * 순서는 목록 위치대로 1부터 다시 매긴다.
 */
function LineSection({
  approvalId,
  revisionId,
  lines,
  onChanged,
}: {
  approvalId: number;
  revisionId: number;
  lines: ApprovalDetailLine[];
  onChanged: (lines: ApprovalDetailLine[]) => void;
}) {
  const [isBusy, setIsBusy] = useState(false);
  const [error, setError] = useState('');

  const ordered = [...lines].sort((a, b) => a.order - b.order);

  /** 결재 차수를 한 칸 옮긴다. 블록 드래그와 겹쳐 화살표 버튼으로 둔다 */
  function move(index: number, step: -1 | 1) {
    const target = index + step;
    if (target < 0 || target >= ordered.length) return;

    const next = ordered.map((line) => line.approverId);
    [next[index], next[target]] = [next[target], next[index]];
    void replace(next);
  }

  async function replace(approverIds: string[]) {
    if (isBusy) return;

    setIsBusy(true);
    setError('');

    try {
      const result = await setLines(approvalId, revisionId, {
        lines: approverIds.map((approverId, index) => ({
          approverId,
          order: index + 1,
        })),
      });
      onChanged(toDetailLines(result.lines));
    } catch (caught) {
      // 실패 사유는 백엔드 문구가 가장 정확하다
      setError(messageOf(caught, '결재선을 저장하지 못했습니다.'));
    } finally {
      setIsBusy(false);
    }
  }

  return (
    <section>
      <h4 className="mb-1 text-caption font-semibold text-text-primary">
        결재자 지정
      </h4>

      {ordered.length > 0 && (
        <ol className="mb-1.5 flex flex-col gap-1">
          {ordered.map((line, index) => (
            <li
              key={line.lineId}
              className="flex items-center gap-1.5 rounded-button-sm border border-border-default px-2 py-1.5"
            >
              <span className="flex size-4 shrink-0 items-center justify-center rounded-pill bg-yellow-bg-soft text-micro font-semibold text-yellow-text">
                {index + 1}
              </span>
              <span className="min-w-0 flex-1 truncate text-caption text-text-primary">
                {line.approverName}
                {line.approverPosition && (
                  <span className="ml-1 text-text-secondary">
                    {line.approverPosition}
                  </span>
                )}
              </span>
              <MoveButton
                label={`${index + 1}차 결재자 위로`}
                onClick={() => move(index, -1)}
                disabled={isBusy || index === 0}
              >
                ↑
              </MoveButton>
              <MoveButton
                label={`${index + 1}차 결재자 아래로`}
                onClick={() => move(index, 1)}
                disabled={isBusy || index === ordered.length - 1}
              >
                ↓
              </MoveButton>
              <button
                type="button"
                onClick={() =>
                  replace(
                    ordered
                      .filter((item) => item.lineId !== line.lineId)
                      .map((item) => item.approverId),
                  )
                }
                disabled={isBusy}
                className="shrink-0 cursor-pointer text-caption text-text-secondary hover:text-text-danger disabled:cursor-not-allowed disabled:text-text-muted"
              >
                제거
              </button>
            </li>
          ))}
        </ol>
      )}

      {/* 선택 즉시 결재선 맨 뒤에 붙는다 (별도 추가 버튼 없음) */}
      <EmployeeSearchInput
        excludedIds={ordered.map((line) => line.approverId)}
        disabled={isBusy}
        onSelect={(employee) => {
          setError('');
          void replace([
            ...ordered.map((line) => line.approverId),
            employee.userId,
          ]);
        }}
      />

      {/* 응답에 role 이 없어 권한 안내는 두지 않는다 */}
      {ordered.length > 1 && (
        <p className="mt-1 text-caption break-keep text-text-secondary">
          순서는 ↑↓ 로 바꿀 수 있습니다.
        </p>
      )}

      <ErrorText message={error} className="mt-1" />
    </section>
  );
}

/** 결재 차수 이동 버튼. 아이콘만 있어 대체 텍스트를 따로 준다 */
function MoveButton({
  label,
  onClick,
  disabled,
  children,
}: {
  label: string;
  onClick: () => void;
  disabled: boolean;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      aria-label={label}
      title={label}
      className="flex size-4 shrink-0 cursor-pointer items-center justify-center rounded-button-sm text-caption leading-none text-text-secondary hover:bg-bg-hover hover:text-text-primary disabled:cursor-not-allowed disabled:text-text-muted disabled:hover:bg-transparent"
    >
      {children}
    </button>
  );
}
