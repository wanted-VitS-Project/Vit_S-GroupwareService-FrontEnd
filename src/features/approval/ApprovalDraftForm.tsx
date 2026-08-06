'use client';

import { useRef, useState } from 'react';

import EmployeeSearchInput from '@/features/employee/EmployeeSearchInput';
import { uploadFile } from '@/features/file/upload';
import { messageOf } from '@/lib/api';

import { addDocument, removeDocument, setLines, updateRevision } from './api';
import ErrorText from './ErrorText';
import type { ApprovalDocument, ApprovalLine, ApprovalRevision } from './types';

/** 제목 · 내용 입력 공통 스타일 */
const FIELD_CLASS =
  'w-full rounded-lg border border-[#1C1F2A]/10 bg-[#ECEEF4]/40 px-2.5 py-1.5 text-[10px] text-[#1C1F2A] placeholder:text-[#6C7389] focus:outline-2 focus:outline-offset-2 focus:outline-[#3B5BDB]';

interface ApprovalDraftFormProps {
  approvalId: number;
  revisionId: number;
  /** 파일을 어느 블록에 붙일지 — 업로드 API 가 블록 단위다 */
  blockId: number;
  revision: ApprovalRevision;
  /** 저장 버튼 — API 호출 없이 화면만 닫는다 (모든 항목이 이미 즉시 저장됐다) */
  onClose: () => void;
  /** 문서 · 결재선이 바뀌면 상위가 회차를 다시 받는다 */
  onChanged: (next: Partial<ApprovalRevision>) => void;
}

/**
 * 결재 초안 작성 · 수정 폼. (AP-005~020)
 *
 * ⚠️ **별도 저장 버튼이 없다.** 제목 · 내용은 블러 시 즉시 `PATCH` 하고,
 * 문서 · 결재선은 조작 즉시 각자의 API 를 부른다.
 * 하단 `저장` 은 편집 화면을 닫기만 한다.
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
  /** 마지막으로 서버에 보낸 값 — 값이 그대로면 블러마다 요청하지 않는다 */
  const saved = useRef({
    title: revision.title ?? '',
    content: revision.content ?? '',
  });
  const [error, setError] = useState('');

  async function saveField(field: 'title' | 'content', value: string) {
    if (saved.current[field] === value) return;

    setError('');
    try {
      await updateRevision(approvalId, revisionId, { [field]: value });
      saved.current[field] = value;
    } catch (caught) {
      setError(messageOf(caught, '저장하지 못했습니다.'));
    }
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
        onClick={onClose}
        className="w-full cursor-pointer rounded-lg bg-[#4F39F6] py-2 text-[11px] font-semibold text-white hover:bg-[#4430d6]"
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
      <span className="mb-1 block text-[10px] font-semibold text-[#1C1F2A]">
        {label}
      </span>
      {children}
    </label>
  );
}

/**
 * 결재 문서. 파일 자체는 공용 파일 API 로 먼저 올리고,
 * 거기서 받은 `fileVersionId` 만 결재에 연결한다 (AP-009 · AP-010).
 */
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
      // 1) 공용 업로드 3단계 → 2) 받은 파일 버전을 결재 문서로 연결
      const uploaded = await uploadFile({ blockId, file });
      const added = await addDocument(approvalId, revisionId, {
        fileVersionId: uploaded.fileVersionId,
      });

      onChanged([...documents, added]);
    } catch (caught) {
      setError(messageOf(caught, '문서를 추가하지 못했습니다.'));
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
      <h4 className="mb-1 text-[10px] font-semibold text-[#1C1F2A]">
        결재 문서
      </h4>

      {documents.length > 0 && (
        <ul className="mb-1.5 flex flex-col gap-1">
          {documents.map((document) => (
            <li
              key={document.documentId}
              className="flex items-center gap-2 rounded border border-[#1C1F2A]/10 px-2 py-1.5"
            >
              <span className="min-w-0 flex-1 truncate text-[10px] text-[#1C1F2A]">
                {/* 회차 상세에는 파일명이 없다 — 그때는 버전 번호로 구분한다 */}
                {document.fileName ?? `파일 버전 #${document.fileVersionId}`}
              </span>
              <button
                type="button"
                onClick={() => detach(document.documentId)}
                disabled={isBusy}
                className="shrink-0 cursor-pointer text-[10px] text-[#6C7389] hover:text-[#E7000B] disabled:cursor-not-allowed disabled:text-[#C7CCD9]"
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
        className="w-full cursor-pointer rounded-lg border border-dashed border-[#1C1F2A]/15 py-3 text-[10px] text-[#6C7389] hover:bg-[#ECEEF4]/40 disabled:cursor-not-allowed"
      >
        {isBusy ? '처리 중…' : '클릭하여 업로드'}
      </button>

      <ErrorText message={error} className="mt-1" />
    </section>
  );
}

/**
 * 결재선. `PUT` 은 **전체 치환**이라 한 명만 바꿔도 목록 전체를 보낸다 (AP-015~020).
 * 순서는 목록의 위치대로 1부터 다시 매긴다 — 빈 번호가 생기면 400 이 된다.
 */
function LineSection({
  approvalId,
  revisionId,
  lines,
  onChanged,
}: {
  approvalId: number;
  revisionId: number;
  lines: ApprovalLine[];
  onChanged: (lines: ApprovalLine[]) => void;
}) {
  const [isBusy, setIsBusy] = useState(false);
  const [error, setError] = useState('');

  const ordered = [...lines].sort((a, b) => a.order - b.order);

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
      onChanged(result.lines);
    } catch (caught) {
      // 프로젝트 member 가 아니거나 순서가 어긋난 경우 백엔드 문구가 가장 정확하다
      setError(messageOf(caught, '결재선을 저장하지 못했습니다.'));
    } finally {
      setIsBusy(false);
    }
  }

  return (
    <section>
      <h4 className="mb-1 text-[10px] font-semibold text-[#1C1F2A]">
        결재자 지정
      </h4>

      {ordered.length > 0 && (
        <ol className="mb-1.5 flex flex-col gap-1">
          {ordered.map((line, index) => (
            <li
              key={line.lineId}
              className="flex items-center gap-2 rounded border border-[#1C1F2A]/10 px-2 py-1.5"
            >
              <span className="flex size-4 shrink-0 items-center justify-center rounded-full bg-[#FFFBEB] text-[9px] font-semibold text-[#BB4D00]">
                {index + 1}
              </span>
              <span className="min-w-0 flex-1 truncate text-[10px] text-[#1C1F2A]">
                {line.approverName}
                {line.approverPosition && (
                  <span className="ml-1 text-[#6C7389]">
                    {line.approverPosition}
                  </span>
                )}
              </span>
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
                className="shrink-0 cursor-pointer text-[10px] text-[#6C7389] hover:text-[#E7000B] disabled:cursor-not-allowed disabled:text-[#C7CCD9]"
              >
                제거
              </button>
            </li>
          ))}
        </ol>
      )}

      {/* 선택 즉시 결재선 맨 뒤에 붙는다 — 별도 `추가` 버튼이 없다 (#41) */}
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

      <p className="mt-1 text-[10px] break-keep text-[#6C7389]">
        마지막 결재자는 MASTER 여야 합니다.
      </p>

      <ErrorText message={error} className="mt-1" />
    </section>
  );
}
