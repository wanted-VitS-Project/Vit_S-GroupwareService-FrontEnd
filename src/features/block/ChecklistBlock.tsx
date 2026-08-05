'use client';

import { useState } from 'react';

import { messageOf } from '@/lib/api';

import {
  createChecklistItem,
  deleteChecklistItem,
  updateChecklistItem,
} from './api';
import BlockCard from './BlockCard';
import {
  readChecklistBlockId,
  readChecklistItems,
  type ChecklistItem,
  type StepBlock,
} from './types';

/**
 * 체크리스트 블록.
 * 완료 토글 · 내용 수정 · 항목 추가 · 항목 삭제를 각각 API 로 즉시 반영한다.
 *
 * 진척률(`n / m 완료`)은 화면의 항목 목록에서 계산한다.
 * 응답의 `completedCount` · `totalCount` 를 쓰면 목록과 숫자가 어긋날 수 있다.
 */
export default function ChecklistBlock({ block }: { block: StepBlock }) {
  const [items, setItems] = useState<ChecklistItem[]>(() =>
    readChecklistItems(block.detail),
  );
  /**
   * 항목 생성 경로에 쓰는 ID. `blockId` 와 다른 값이라 폴백하지 않는다.
   * 없으면 어느 체크리스트에 붙일지 알 수 없어 추가를 막는다.
   */
  const chkBlockId = readChecklistBlockId(block.detail);
  const [draft, setDraft] = useState('');
  const [isAdding, setIsAdding] = useState(false);
  /** 요청이 진행 중인 항목 — 중복 클릭을 막는다 */
  const [busyIds, setBusyIds] = useState<number[]>([]);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [editingText, setEditingText] = useState('');
  const [errorMessage, setErrorMessage] = useState('');

  const completedCount = items.filter((item) => item.isCompleted).length;

  function withBusy(chkId: number, isBusy: boolean) {
    setBusyIds((previous) =>
      isBusy
        ? [...previous, chkId]
        : previous.filter((busyId) => busyId !== chkId),
    );
  }

  async function addItem() {
    const content = draft.trim();
    if (!content || isAdding || chkBlockId === null) return;

    setIsAdding(true);
    setErrorMessage('');

    try {
      const created = await createChecklistItem(chkBlockId, content);
      setItems((previous) => [
        ...previous,
        {
          chkId: created.chkId,
          content: created.content,
          isCompleted: false,
        },
      ]);
      setDraft('');
    } catch (caught) {
      setErrorMessage(messageOf(caught, '항목을 추가하지 못했습니다.'));
    } finally {
      setIsAdding(false);
    }
  }

  async function toggleItem(item: ChecklistItem) {
    if (busyIds.includes(item.chkId)) return;

    withBusy(item.chkId, true);
    setErrorMessage('');

    try {
      const updated = await updateChecklistItem(item.chkId, {
        changeStatusTo: !item.isCompleted,
      });
      setItems((previous) =>
        previous.map((current) =>
          current.chkId === item.chkId
            ? {
                ...current,
                content: updated.content,
                isCompleted: updated.isCompleted,
              }
            : current,
        ),
      );
    } catch (caught) {
      setErrorMessage(messageOf(caught, '완료 여부를 바꾸지 못했습니다.'));
    } finally {
      withBusy(item.chkId, false);
    }
  }

  async function saveContent(item: ChecklistItem) {
    const content = editingText.trim();
    setEditingId(null);

    if (!content || content === item.content) return;

    withBusy(item.chkId, true);
    setErrorMessage('');

    try {
      const updated = await updateChecklistItem(item.chkId, { content });
      setItems((previous) =>
        previous.map((current) =>
          current.chkId === item.chkId
            ? { ...current, content: updated.content }
            : current,
        ),
      );
    } catch (caught) {
      setErrorMessage(messageOf(caught, '항목을 수정하지 못했습니다.'));
    } finally {
      withBusy(item.chkId, false);
    }
  }

  async function removeItem(item: ChecklistItem) {
    if (busyIds.includes(item.chkId)) return;

    withBusy(item.chkId, true);
    setErrorMessage('');

    try {
      await deleteChecklistItem(item.chkId);
      setItems((previous) =>
        previous.filter((current) => current.chkId !== item.chkId),
      );
    } catch (caught) {
      setErrorMessage(messageOf(caught, '항목을 삭제하지 못했습니다.'));
      withBusy(item.chkId, false);
    }
  }

  return (
    <BlockCard block={block}>
      <p className="text-[9px] text-[#6C7389]">
        {completedCount} / {items.length} 완료
      </p>

      <ul className="pt-2">
        {items.map((item) => {
          const isBusy = busyIds.includes(item.chkId);
          const isEditing = editingId === item.chkId;

          return (
            <li
              key={item.chkId}
              className="group/item flex items-center gap-2 pt-1.5 first:pt-0"
            >
              <button
                type="button"
                role="checkbox"
                aria-checked={item.isCompleted}
                aria-label={item.content}
                disabled={isBusy}
                onClick={() => toggleItem(item)}
                className={`flex size-3.5 shrink-0 cursor-pointer items-center justify-center rounded border disabled:cursor-progress ${
                  item.isCompleted
                    ? 'border-[#00BC7D] bg-[#00BC7D] text-white'
                    : 'border-[#6C7389] bg-white'
                }`}
              >
                {item.isCompleted && <CheckIcon />}
              </button>

              {isEditing ? (
                <input
                  autoFocus
                  aria-label={`${item.content} 항목 수정`}
                  value={editingText}
                  onChange={(event) => setEditingText(event.target.value)}
                  onBlur={() => saveContent(item)}
                  onKeyDown={(event) => {
                    if (event.key === 'Enter') saveContent(item);
                    if (event.key === 'Escape') setEditingId(null);
                  }}
                  className="min-w-0 flex-1 rounded border border-[#3B5BDB] px-1 py-0 text-[11px] text-[#1C1F2A] outline-none"
                />
              ) : (
                <button
                  type="button"
                  onClick={() => {
                    setEditingId(item.chkId);
                    setEditingText(item.content);
                  }}
                  className={`min-w-0 flex-1 cursor-text truncate text-left text-[11px] ${
                    item.isCompleted
                      ? 'text-[#6C7389] line-through'
                      : 'text-[#1C1F2A]'
                  }`}
                >
                  {item.content}
                </button>
              )}

              <button
                type="button"
                aria-label={`${item.content} 삭제`}
                disabled={isBusy}
                onClick={() => removeItem(item)}
                className="flex size-4 shrink-0 cursor-pointer items-center justify-center rounded text-[#6C7389] opacity-0 group-hover/item:opacity-100 hover:bg-[#ECEEF4] focus-visible:opacity-100"
              >
                <CloseIcon />
              </button>
            </li>
          );
        })}
      </ul>

      {chkBlockId === null ? (
        // detail.chkBlockId 없이 추가하면 어느 체크리스트에 붙을지 알 수 없다
        <p className="mt-2 text-[10px] text-[#6C7389]/60">
          항목을 추가할 수 없습니다.
        </p>
      ) : (
        <input
          aria-label="체크리스트 항목 추가"
          value={draft}
          onChange={(event) => setDraft(event.target.value)}
          onKeyDown={(event) => {
            if (event.key === 'Enter') addItem();
          }}
          onBlur={addItem}
          disabled={isAdding}
          placeholder="+ 항목 추가"
          className="mt-2 w-full bg-transparent text-[10px] text-[#1C1F2A] outline-none placeholder:text-[#6C7389]/60"
        />
      )}

      {errorMessage && (
        <p role="alert" className="mt-1.5 text-[9px] text-[#E7000B]">
          {errorMessage}
        </p>
      )}
    </BlockCard>
  );
}

function CheckIcon() {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="3.5"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
      className="size-2.5"
    >
      <path d="m5 13 4.5 4.5L19 7" />
    </svg>
  );
}

function CloseIcon() {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2.5"
      strokeLinecap="round"
      aria-hidden
      className="size-2.5"
    >
      <path d="M6 6l12 12M18 6 6 18" />
    </svg>
  );
}
