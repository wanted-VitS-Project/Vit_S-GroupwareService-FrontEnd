'use client';

import { useEffect, useState } from 'react';

import { AlertDialogTwoButton, DialogIcons } from '@/components/AlertDialog';
import LoadingSpinner from '@/components/Spinner';
import { notifyToast } from '@/components/Toast';
import { ApiError, messageOf } from '@/lib/api';
import { useModalTarget } from '@/lib/useModal';

import {
  createMasterItem,
  deleteMasterItem,
  getMasterItems,
  updateMasterItem,
} from './api';
import { codesOf } from './errorCodes';
import type { MasterItem, MasterItemKind } from './types';
import { MASTER_ITEM_NAME_MAX_LENGTH } from './types';

/**
 * 전공 · 자격증 **한 벌**을 관리하는 칸.
 *
 * 두 도메인이 규칙이 같아 **이 컴포넌트를 두 번 세운다** — 종류만 바꿔 넘긴다.
 * 사원 등록 폼은 이 목록에서 고르므로, 여기 없는 값은 사원에 붙일 수 없다.
 *
 * ⚠️ `deletable` 로 삭제를 잠그되 **409 처리를 함께 둔다** — 목록을 띄워 둔 사이
 *    누가 그 항목으로 사원을 등록하면 잠금은 이미 지난 판단이 된다.
 */
export default function MasterItemPanel({
  kind,
  title,
  placeholder,
}: {
  kind: MasterItemKind;
  title: string;
  /** 추가 입력칸 예시 — 도메인마다 다르다 */
  placeholder: string;
}) {
  const [items, setItems] = useState<MasterItem[] | null>(null);
  const [hasFailed, setHasFailed] = useState(false);
  const [reloadCount, setReloadCount] = useState(0);

  const [name, setName] = useState('');
  const [isAdding, setIsAdding] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');

  /** 이름을 고치는 중인 항목 — 한 번에 하나만 연다 */
  const [editing, setEditing] = useState<{ id: number; name: string } | null>(
    null,
  );
  const deleteModal = useModalTarget<MasterItem>();

  useEffect(() => {
    const controller = new AbortController();

    getMasterItems(kind, controller.signal)
      .then((list) => {
        setItems(list);
        setHasFailed(false);
      })
      .catch(() => {
        if (!controller.signal.aborted) setHasFailed(true);
      });

    return () => controller.abort();
  }, [kind, reloadCount]);

  function reload() {
    setReloadCount((count) => count + 1);
  }

  async function add(event: React.FormEvent) {
    event.preventDefault();

    const next = name.trim();
    if (next === '' || isAdding) return;

    setIsAdding(true);
    setErrorMessage('');

    try {
      const created = await createMasterItem(kind, next);
      // 서버가 정렬해 주지 않으므로 이름순 자리에 꽂는다
      setItems((current) =>
        [...(current ?? []), created].sort((a, b) =>
          a.name.localeCompare(b.name, 'ko'),
        ),
      );
      setName('');
    } catch (caught) {
      const code = caught instanceof ApiError ? caught.code : undefined;

      setErrorMessage(
        code === codesOf(kind).nameDuplicated
          ? '이미 있는 이름입니다.'
          : messageOf(caught, '추가하지 못했습니다.'),
      );
    } finally {
      setIsAdding(false);
    }
  }

  async function rename() {
    if (editing === null) return;

    const next = editing.name.trim();
    const before = items?.find((item) => item.id === editing.id)?.name;

    // 그대로면 요청을 보내지 않는다 — 중복 검사에 자기 이름이 걸린다
    if (next === '' || next === before) {
      setEditing(null);
      return;
    }

    try {
      const saved = await updateMasterItem(kind, editing.id, next);
      setItems(
        (current) =>
          current?.map((item) => (item.id === saved.id ? saved : item)) ?? null,
      );
      setEditing(null);
    } catch (caught) {
      const code = caught instanceof ApiError ? caught.code : undefined;

      notifyToast(
        code === codesOf(kind).nameDuplicated
          ? '이미 있는 이름입니다.'
          : messageOf(caught, '이름을 바꾸지 못했습니다.'),
        'error',
      );
    }
  }

  async function remove(item: MasterItem) {
    deleteModal.close();

    try {
      await deleteMasterItem(kind, item.id);
      setItems(
        (current) => current?.filter((row) => row.id !== item.id) ?? null,
      );
      notifyToast(`${item.name} 항목을 삭제했습니다.`);
    } catch (caught) {
      const code = caught instanceof ApiError ? caught.code : undefined;

      /*
        409 는 그 사이 누가 이 항목으로 사원을 등록했다는 뜻이다.
        건수는 서버 문구에 담겨 오므로 그대로 띄우고 목록을 다시 받는다.
      */
      if (code === codesOf(kind).inUse) {
        notifyToast(
          messageOf(caught, '사용 중이라 삭제할 수 없습니다.'),
          'error',
        );
        reload();
        return;
      }

      notifyToast(messageOf(caught, '삭제하지 못했습니다.'), 'error');
    }
  }

  return (
    <section className="rounded-base border border-border-default bg-bg-card p-5">
      <h3 className="text-body-m font-bold text-text-primary">{title}</h3>

      {hasFailed ? (
        <div className="mt-4 rounded-lg border border-border-default px-4 py-6 text-center">
          <p className="text-label text-text-secondary">
            목록을 불러오지 못했습니다.
          </p>
          <button
            type="button"
            onClick={reload}
            className="mt-1 cursor-pointer rounded-button-sm px-2 py-1 text-detail font-medium text-text-primary-blue hover:bg-blue-bg-soft"
          >
            다시 시도
          </button>
        </div>
      ) : items === null ? (
        <LoadingSpinner label={`${title} 불러오는 중`} className="py-10" />
      ) : items.length === 0 ? (
        <p className="mt-4 rounded-lg border border-border-default px-4 py-6 text-center text-caption text-text-secondary">
          등록된 항목이 없습니다. 아래에서 추가해주세요.
        </p>
      ) : (
        <ul className="mt-4 flex flex-col gap-1.5">
          {items.map((item) => (
            <li
              key={item.id}
              className="flex items-center gap-2 rounded-lg border border-border-default px-3 py-2"
            >
              {editing?.id === item.id ? (
                <input
                  autoFocus
                  value={editing.name}
                  maxLength={MASTER_ITEM_NAME_MAX_LENGTH}
                  onChange={(event) =>
                    setEditing({ id: item.id, name: event.target.value })
                  }
                  onBlur={rename}
                  onKeyDown={(event) => {
                    if (event.key === 'Enter') rename();
                    if (event.key === 'Escape') setEditing(null);
                  }}
                  aria-label={`${item.name} 이름 수정`}
                  className="input min-w-0 flex-1"
                />
              ) : (
                <>
                  <span className="min-w-0 flex-1 truncate text-detail font-medium text-text-primary">
                    {item.name}
                  </span>
                  <span className="shrink-0 rounded-button-sm bg-bg-hover px-1.5 py-0.5 text-caption text-text-secondary">
                    사원 {item.employeeCount}
                  </span>
                  <IconButton
                    label={`${item.name} 이름 수정`}
                    onClick={() => setEditing({ id: item.id, name: item.name })}
                  >
                    <PencilIcon />
                  </IconButton>
                  {/*
                    ⚠️ 사용 중이면 잠그되 **사유를 글로 남긴다** — 비활성 버튼은 포커스를
                       받지 못해 `title` 만으로는 이유가 전달되지 않는다.
                  */}
                  <IconButton
                    label={
                      item.deletable
                        ? `${item.name} 삭제`
                        : `${item.name} — 사원 ${item.employeeCount}명이 쓰고 있어 삭제할 수 없습니다`
                    }
                    disabled={!item.deletable}
                    onClick={() => deleteModal.open(item)}
                  >
                    <TrashIcon />
                  </IconButton>
                </>
              )}
            </li>
          ))}
        </ul>
      )}

      <form onSubmit={add} className="mt-3 flex gap-2">
        <label htmlFor={`${kind}-new`} className="sr-only">
          {title} 추가
        </label>
        <input
          id={`${kind}-new`}
          value={name}
          maxLength={MASTER_ITEM_NAME_MAX_LENGTH}
          placeholder={placeholder}
          onChange={(event) => {
            setName(event.target.value);
            setErrorMessage('');
          }}
          className="input min-w-0 flex-1"
        />
        <button
          type="submit"
          disabled={name.trim() === '' || isAdding}
          className="btn btn-md btn-primary min-w-16 shrink-0"
        >
          {isAdding ? '추가 중…' : '추가'}
        </button>
      </form>

      {errorMessage && (
        <p role="alert" className="mt-1 text-caption text-text-danger">
          {errorMessage}
        </p>
      )}

      {deleteModal.target && (
        <AlertDialogTwoButton
          icon={DialogIcons.danger}
          title="항목을 삭제할까요?"
          description={
            <>
              <strong className="text-text-primary">
                {deleteModal.target.name}
              </strong>{' '}
              항목을 삭제합니다. 이후 사원 등록에서 고를 수 없습니다.
            </>
          }
          confirmLabel="삭제"
          isDanger
          onConfirm={() => remove(deleteModal.target as MasterItem)}
          onCancel={deleteModal.close}
        />
      )}
    </section>
  );
}

/** 목록 줄에 놓이는 작은 동작 버튼 — 터치 기기를 위해 **항상 보인다** */
function IconButton({
  label,
  disabled = false,
  onClick,
  children,
}: {
  label: string;
  disabled?: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      title={label}
      aria-label={label}
      disabled={disabled}
      onClick={onClick}
      className="flex size-7 shrink-0 cursor-pointer items-center justify-center rounded-button-md text-text-secondary hover:bg-bg-hover hover:text-text-primary disabled:cursor-not-allowed disabled:text-text-muted disabled:hover:bg-transparent"
    >
      {children}
    </button>
  );
}

function PencilIcon() {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
      className="size-4"
    >
      <path d="M4 20h4l10-10a2.8 2.8 0 0 0-4-4L4 16z" />
    </svg>
  );
}

function TrashIcon() {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
      className="size-4"
    >
      <path d="M4 7h16M9 7V5h6v2M6 7l1 12h10l1-12" />
    </svg>
  );
}
