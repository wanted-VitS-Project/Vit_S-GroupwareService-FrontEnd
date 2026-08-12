'use client';

import dynamic from 'next/dynamic';
import { useRef, useState } from 'react';

import ModalLoadingFallback from '@/components/ModalLoadingFallback';
import { messageOf } from '@/lib/api';
import { useModalTarget } from '@/lib/useModal';

import {
  createChecklistItem,
  deleteChecklistItem,
  updateChecklistItem,
} from './api';
import BlockCard from './BlockCard';

const loadItemDeleteModal = () => import('./ChecklistItemDeleteModal');
const ChecklistItemDeleteModal = dynamic(loadItemDeleteModal, {
  loading: () => <ModalLoadingFallback title="항목 삭제" />,
});
import {
  readChecklistBlockId,
  readChecklistItems,
  type ChecklistItem,
  type StepBlock,
} from './types';

/** 화면에만 있는 항목 상태 — 아직 서버에 없는 항목을 구분한다 */
interface DraftableItem extends ChecklistItem {
  /** 생성 요청이 끝나기 전이라 `chkId` 가 임시값이다 */
  isPending?: boolean;
}

/**
 * 체크리스트 블록.
 *
 * 평소에는 **읽기 전용** — 진척률과 항목 상태만 보인다.
 * `편집` 을 눌러야 체크 · 내용 수정 · 추가 · 삭제가 열린다.
 *
 * 모든 변경은 **화면에 먼저 반영하고** 요청은 뒤에서 처리한다(낙관적 갱신).
 * 실패하면 그 항목만 원래대로 되돌리고 사유를 띄운다.
 *
 * 진척률(`n / m 완료`)은 화면의 항목 목록에서 계산한다.
 * 응답의 `completedCount` · `totalCount` 를 쓰면 목록과 숫자가 어긋날 수 있다.
 */
export default function ChecklistBlock({ block }: { block: StepBlock }) {
  const [items, setItems] = useState<DraftableItem[]>(() =>
    readChecklistItems(block.detail),
  );
  /**
   * 항목 생성 경로에 쓰는 ID. `blockId` 와 다른 값이라 폴백하지 않는다.
   * 없으면 어느 체크리스트에 붙일지 알 수 없어 추가를 막는다.
   */
  const chkBlockId = readChecklistBlockId(block.detail);
  const [isEditing, setIsEditing] = useState(false);
  const [draft, setDraft] = useState('');
  const [editingId, setEditingId] = useState<number | null>(null);
  const [editingText, setEditingText] = useState('');
  const [errorMessage, setErrorMessage] = useState('');
  /** 삭제 확인을 기다리는 항목 — 대상이 곧 열림 여부다 */
  const deleteModal = useModalTarget<DraftableItem>();
  /** 서버 ID 와 겹치지 않게 임시 항목은 음수 ID 를 쓴다 */
  const nextTempId = useRef(-1);
  /**
   * 항목별 마지막 변경 번호.
   *
   * 한 항목을 연달아 고치면 요청이 여러 개 나가고 **보낸 순서대로 돌아오지 않는다.**
   * 늦게 온 옛 응답이 최신 화면을 덮지 않도록, **모든 변경 경로**가 번호를 올리고
   * 자기 번호가 아직 최신일 때만 화면에 손댄다. (토글 · 내용 수정 · 삭제 공통)
   */
  const revisions = useRef(new Map<number, number>());
  /**
   * 항목별 요청 줄.
   *
   * 번호 검사는 **화면**을 지킬 뿐, 서버가 요청을 역순으로 처리하면 새로고침했을 때
   * 옛 값이 남는다. 같은 항목의 요청은 앞 요청이 끝난 뒤에 보내 겹칠 여지를 없앤다.
   * (다른 항목끼리는 그대로 동시에 나간다)
   */
  const queues = useRef(new Map<number, Promise<unknown>>());

  const completedCount = items.filter((item) => item.isCompleted).length;
  // 지역 상수로 받아야 JSX 안에서 `null` 이 아님이 좁혀진다
  const itemToDelete = deleteModal.target;

  /** 한 항목만 골라 바꾼다 — 다른 항목의 진행 중인 변경을 덮어쓰지 않는다 */
  function patchItem(chkId: number, changes: Partial<DraftableItem>) {
    setItems((previous) =>
      previous.map((current) =>
        current.chkId === chkId ? { ...current, ...changes } : current,
      ),
    );
  }

  /** 이 항목의 변경 번호를 올리고 방금 딴 번호를 준다 */
  function bumpRevision(chkId: number) {
    const next = (revisions.current.get(chkId) ?? 0) + 1;
    revisions.current.set(chkId, next);
    return next;
  }

  /** 그 사이 같은 항목을 또 고쳤다면 이 응답은 이미 낡았다 */
  function isLatest(chkId: number, revision: number) {
    return revisions.current.get(chkId) === revision;
  }

  /** 같은 항목의 앞 요청이 끝난 뒤에 보낸다 — 서버가 순서를 뒤집을 여지를 없앤다 */
  function enqueue<T>(chkId: number, send: () => Promise<T>) {
    // 앞 요청의 실패가 뒤 요청까지 막지 않게 한 번 삼킨다 (처리는 각자 catch 에서)
    const queued = (queues.current.get(chkId) ?? Promise.resolve())
      .catch(() => undefined)
      .then(send);

    queues.current.set(chkId, queued);
    return queued;
  }

  function addItem() {
    const content = draft.trim();
    if (!content || chkBlockId === null) return;

    const tempId = nextTempId.current;
    nextTempId.current -= 1;

    // 입력창은 곧바로 비우고 항목도 바로 세운다 — 응답을 기다리지 않는다
    setDraft('');
    setErrorMessage('');
    setItems((previous) => [
      ...previous,
      { chkId: tempId, content, isCompleted: false, isPending: true },
    ]);

    void createChecklistItem(chkBlockId, content)
      .then((created) => {
        // 임시 ID 를 서버가 준 진짜 ID 로 갈아끼운다
        patchItem(tempId, {
          chkId: created.chkId,
          content: created.content,
          isPending: false,
        });
      })
      .catch((caught: unknown) => {
        setItems((previous) =>
          previous.filter((current) => current.chkId !== tempId),
        );
        setErrorMessage(messageOf(caught, '항목을 추가하지 못했습니다.'));
      });
  }

  function toggleItem(item: DraftableItem) {
    if (item.isPending) return;

    const nextCompleted = !item.isCompleted;
    const revision = bumpRevision(item.chkId);

    patchItem(item.chkId, { isCompleted: nextCompleted });
    setErrorMessage('');

    /**
     * 성공해도 응답으로 다시 그리지 않는다 — 화면에 이미 같은 값이 들어가 있고,
     * 늦게 온 옛 응답으로 덮어쓰면 방금 누른 상태가 뒤집힌다.
     */
    void enqueue(item.chkId, () =>
      updateChecklistItem(item.chkId, { changeStatusTo: nextCompleted }),
    ).catch((caught: unknown) => {
      // 그 사이 다시 눌렀다면 화면이 이미 더 최신이다 — 되돌리지 않는다
      if (!isLatest(item.chkId, revision)) return;
      patchItem(item.chkId, { isCompleted: item.isCompleted });
      setErrorMessage(messageOf(caught, '완료 여부를 바꾸지 못했습니다.'));
    });
  }

  function saveContent(item: DraftableItem) {
    const content = editingText.trim();
    setEditingId(null);

    if (!content || content === item.content || item.isPending) return;

    const revision = bumpRevision(item.chkId);

    patchItem(item.chkId, { content });
    setErrorMessage('');

    void enqueue(item.chkId, () => updateChecklistItem(item.chkId, { content }))
      .then((updated) => {
        // 이미 다음 수정이 화면에 들어가 있으면 옛 응답으로 되돌리지 않는다
        if (!isLatest(item.chkId, revision)) return;
        patchItem(item.chkId, { content: updated.content });
      })
      .catch((caught: unknown) => {
        if (!isLatest(item.chkId, revision)) return;
        patchItem(item.chkId, { content: item.content });
        setErrorMessage(messageOf(caught, '항목을 수정하지 못했습니다.'));
      });
  }

  function removeItem(item: DraftableItem) {
    if (item.isPending) return;

    // 되돌릴 때 원래 자리로 넣으려고 위치를 같이 들고 있는다
    const index = items.findIndex((current) => current.chkId === item.chkId);
    // 아직 나가 있는 수정의 응답이 지워진 항목을 되살리지 않게 번호를 올려둔다
    bumpRevision(item.chkId);
    setItems((previous) =>
      previous.filter((current) => current.chkId !== item.chkId),
    );
    setErrorMessage('');

    // 앞선 수정이 끝난 뒤에 지운다 — 삭제가 먼저 닿으면 수정이 404 로 깨진다
    void enqueue(item.chkId, () => deleteChecklistItem(item.chkId)).catch(
      (caught: unknown) => {
        setItems((previous) => {
          const restored = [...previous];
          restored.splice(Math.min(index, restored.length), 0, item);
          return restored;
        });
        setErrorMessage(messageOf(caught, '항목을 삭제하지 못했습니다.'));
      },
    );
  }

  return (
    <BlockCard block={block}>
      <div className="flex h-full flex-col gap-2">
        <p className="text-micro text-text-secondary">
          {completedCount} / {items.length} 완료
        </p>

        {items.length === 0 && !isEditing && (
          <p className="text-caption text-text-muted">
            항목이 없습니다. 편집으로 추가해보세요.
          </p>
        )}

        <ul className="flex-1">
          {items.map((item) => {
            const isItemEditing = isEditing && editingId === item.chkId;
            const labelClass = `min-w-0 flex-1 truncate text-left text-detail ${
              item.isCompleted
                ? 'text-text-secondary line-through'
                : 'text-text-primary'
            }`;

            return (
              <li
                key={item.chkId}
                className="group/item flex items-center gap-2 pt-1.5 first:pt-0"
              >
                {isEditing ? (
                  <button
                    type="button"
                    role="checkbox"
                    aria-checked={item.isCompleted}
                    aria-label={item.content}
                    disabled={item.isPending}
                    onClick={() => toggleItem(item)}
                    className={`flex size-3.5 shrink-0 cursor-pointer items-center justify-center rounded-button-sm border disabled:cursor-progress ${
                      item.isCompleted
                        ? 'border-[#00BC7D] bg-[#00BC7D] text-text-white'
                        : 'border-text-secondary bg-bg-card'
                    }`}
                  >
                    {item.isCompleted && <CheckIcon />}
                  </button>
                ) : (
                  // 읽기 전용 — 누를 수 없는 표시로만 둔다
                  <span
                    role="checkbox"
                    aria-checked={item.isCompleted}
                    aria-label={item.content}
                    aria-disabled
                    className={`flex size-3.5 shrink-0 items-center justify-center rounded-button-sm border ${
                      item.isCompleted
                        ? 'border-[#00BC7D] bg-[#00BC7D] text-text-white'
                        : 'border-text-secondary bg-bg-card'
                    }`}
                  >
                    {item.isCompleted && <CheckIcon />}
                  </span>
                )}

                {isItemEditing ? (
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
                    className="min-w-0 flex-1 rounded-button-sm border border-border-primary px-1 py-0 text-detail text-text-primary outline-none"
                  />
                ) : isEditing ? (
                  <button
                    type="button"
                    disabled={item.isPending}
                    onClick={() => {
                      setEditingId(item.chkId);
                      setEditingText(item.content);
                    }}
                    className={`${labelClass} cursor-text`}
                  >
                    {item.content}
                  </button>
                ) : (
                  <span className={labelClass}>{item.content}</span>
                )}

                {isEditing && (
                  <button
                    type="button"
                    aria-label={`${item.content} 삭제`}
                    disabled={item.isPending}
                    onPointerEnter={() => void loadItemDeleteModal()}
                    onFocus={() => void loadItemDeleteModal()}
                    onClick={() => deleteModal.open(item)}
                    className="flex size-4 shrink-0 cursor-pointer items-center justify-center rounded-button-sm text-text-secondary opacity-0 group-hover/item:opacity-100 hover:bg-bg-hover focus-visible:opacity-100 disabled:cursor-progress"
                  >
                    <CloseIcon />
                  </button>
                )}
              </li>
            );
          })}
        </ul>

        {isEditing &&
          (chkBlockId === null ? (
            // detail.chkBlockId 없이 추가하면 어느 체크리스트에 붙을지 알 수 없다
            <p className="text-caption text-text-muted">
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
              placeholder="+ 항목 추가"
              className="w-full bg-transparent text-caption text-text-primary outline-none placeholder:text-text-muted"
            />
          ))}

        {errorMessage && (
          <p role="alert" className="text-micro text-text-danger">
            {errorMessage}
          </p>
        )}

        <div className="flex items-center justify-end border-t border-border-default pt-1">
          <button
            type="button"
            onClick={() => {
              setEditingId(null);
              setErrorMessage('');
              setIsEditing((wasEditing) => !wasEditing);
            }}
            className={`flex cursor-pointer items-center gap-1 rounded-button-md px-2 py-0.5 text-caption font-medium ${
              isEditing
                ? 'text-text-secondary hover:bg-bg-hover'
                : 'text-text-primary-blue hover:bg-blue-bg-soft'
            }`}
          >
            {isEditing ? <CheckIcon /> : <PencilIcon />}
            {isEditing ? '편집 완료' : '편집'}
          </button>
        </div>
      </div>

      {itemToDelete && (
        <ChecklistItemDeleteModal
          content={itemToDelete.content}
          onClose={deleteModal.close}
          onConfirm={() => {
            removeItem(itemToDelete);
            deleteModal.close();
          }}
        />
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

function PencilIcon() {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
      className="size-2.5 shrink-0"
    >
      <path d="M4 20h4L20 8l-4-4L4 16z" />
      <path d="m15 5 4 4" />
    </svg>
  );
}
