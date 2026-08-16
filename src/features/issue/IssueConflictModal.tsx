'use client';

import { useState } from 'react';

import Modal from '@/components/Modal';

import type { IssueEditField } from './types';

/** 같은 필드를 서로 고친 한 줄. 값 문구는 부르는 쪽이 만든다 (담당자 · 블록 이름을 아는 곳이 거기다) */
export interface IssueConflictRow {
  field: IssueEditField;
  label: string;
  /** 내가 입력한 값 */
  mine: string;
  /** 서버의 최신값 */
  theirs: string;
}

export type IssueConflictChoice = Record<IssueEditField, 'mine' | 'theirs'>;

/** 값이 비어 있으면 빈 칸이 되어 무엇이 다른지 안 보인다 — 눈에 보이는 문구로 바꾼다 */
function shown(value: string) {
  return value.trim() || '(비어 있음)';
}

/**
 * 낙관적 락 충돌 해소 — **같은 필드**를 나와 남이 함께 고쳤을 때만 뜬다.
 * (겹치지 않는 필드는 화면이 자동으로 병합해 다시 저장하므로 여기까지 오지 않는다)
 *
 * ⚠️ 취소는 `계속 편집` 이다 — Esc · 배경 클릭도 취소로 흘러 들어오므로,
 *    잘못 누른 한 번에 입력이 사라지거나 남의 값이 지워지면 안 된다.
 *    `dismissOnBackdrop` 을 끄고 배경 클릭은 아예 받지 않는다.
 */
export default function IssueConflictModal({
  rows,
  isSaving,
  onSave,
  onCancel,
}: {
  rows: IssueConflictRow[];
  isSaving: boolean;
  onSave: (choices: IssueConflictChoice) => void;
  onCancel: () => void;
}) {
  /**
   * 기본값은 **내 값 유지**다 — 방금 입력한 것을 잠자코 남의 값으로 바꿔치기하면
   * 사용자는 자기가 쓴 내용이 사라진 줄 안다.
   */
  const [choices, setChoices] = useState<IssueConflictChoice>(
    () =>
      Object.fromEntries(
        rows.map((row) => [row.field, 'mine']),
      ) as IssueConflictChoice,
  );

  return (
    <Modal
      title="같은 항목을 다른 사람도 수정했습니다"
      onClose={isSaving ? undefined : onCancel}
      dismissOnBackdrop={false}
      className="flex max-h-[85vh] w-full max-w-[560px] flex-col overflow-hidden rounded-base border border-border-default shadow-2xl"
      header={
        <div className="shrink-0 border-b border-border-default px-5 py-3.5">
          <h2 className="text-body-m font-semibold text-text-primary">
            같은 항목을 다른 사람도 수정했습니다
          </h2>
          <p className="pt-1 text-caption break-keep text-text-secondary">
            항목마다 어느 값을 남길지 골라주세요. 여기 없는 항목은 이미 최신
            내용과 합쳐 두었습니다.
          </p>
        </div>
      }
    >
      <div className="flex min-h-0 flex-1 flex-col gap-4 overflow-y-auto p-5">
        {rows.map((row) => {
          const picked = choices[row.field];

          return (
            <fieldset key={row.field}>
              <legend className="mb-1.5 text-detail font-semibold text-text-primary">
                {row.label}
              </legend>
              <div className="grid grid-cols-2 gap-2">
                {(['mine', 'theirs'] as const).map((side) => {
                  const isPicked = picked === side;

                  return (
                    <label
                      key={side}
                      className={`flex cursor-pointer flex-col gap-1 rounded-lg border p-2.5 ${
                        isPicked
                          ? 'border-border-primary bg-blue-bg-soft'
                          : 'border-border-default hover:bg-bg-hover'
                      }`}
                    >
                      <span className="flex items-center gap-1.5 text-caption font-semibold text-text-secondary">
                        <input
                          type="radio"
                          name={`conflict-${row.field}`}
                          checked={isPicked}
                          disabled={isSaving}
                          onChange={() =>
                            setChoices((prev) => ({
                              ...prev,
                              [row.field]: side,
                            }))
                          }
                        />
                        {side === 'mine' ? '내 값' : '최신값'}
                      </span>
                      <span className="text-detail break-words whitespace-pre-wrap text-text-primary">
                        {shown(side === 'mine' ? row.mine : row.theirs)}
                      </span>
                    </label>
                  );
                })}
              </div>
            </fieldset>
          );
        })}
      </div>

      <div className="flex shrink-0 items-center justify-end gap-2 border-t border-border-default bg-bg-surface px-5 py-3.5">
        <button
          type="button"
          onClick={onCancel}
          disabled={isSaving}
          className="cursor-pointer rounded-lg px-4 py-1.5 text-detail font-medium text-text-secondary hover:bg-bg-hover disabled:cursor-not-allowed disabled:opacity-40"
        >
          계속 편집
        </button>
        <button
          type="button"
          onClick={() => onSave(choices)}
          disabled={isSaving}
          className="min-w-[136px] cursor-pointer rounded-lg bg-btn-primary px-4 py-1.5 text-detail font-semibold text-text-white hover:bg-btn-primary-hover disabled:cursor-not-allowed disabled:bg-bg-hover disabled:text-text-secondary"
        >
          {isSaving ? '저장 중…' : '이 선택으로 저장'}
        </button>
      </div>
    </Modal>
  );
}
