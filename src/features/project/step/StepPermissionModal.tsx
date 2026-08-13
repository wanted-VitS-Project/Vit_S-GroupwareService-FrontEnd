'use client';

import { useEffect, useState } from 'react';

import PanelModal, { ModalFooter } from '@/components/PanelModal';
import { useCurrentUser } from '@/features/auth/useCurrentUser';
import { ApiError, messageOf } from '@/lib/api';

import {
  getStepPermissions,
  revokeStepPermission,
  setStepPermission,
} from '../api';
import { STEP_PERMISSION_CODES } from '../errorCodes';
import { STEP_PERMISSION_LABELS, STEP_PERMISSIONS } from '../labels';
import type { StepPermission, StepPermissionEntry } from '../types';

interface StepPermissionModalProps {
  stepId: number;
  stepName: string;
  onClose: () => void;
}

/**
 * 스텝 권한 관리 모달. (.ai/API.md 134~136)
 *
 * ⚠️ **`overridden: false` 는 차단이 아니라 프로젝트 권한 상속이다** (STP-011) —
 *    화면에서 `상속` · `직접 지정` 을 구분해 보여주지 않으면, 상속 상태를 "권한 없음" 으로
 *    오해해 굳이 `NONE` 을 걸어 잠가버린다.
 * ⚠️ 특정 스텝만 가리려면 **`NONE` 을 명시적으로** 골라야 한다.
 * ⛔ 자기 자신의 행은 바꿀 수 없다 (INV-10) — 백엔드도 403 이지만 화면에서도 잠근다.
 *
 * 이 API 는 **프로젝트 `EDITOR`** 전용이다 (스텝 `EDITOR` 로는 부를 수 없다).
 */
export default function StepPermissionModal({
  stepId,
  stepName,
  onClose,
}: StepPermissionModalProps) {
  const me = useCurrentUser();

  const [entries, setEntries] = useState<StepPermissionEntry[] | null>(null);
  const [hasFailed, setHasFailed] = useState(false);
  const [error, setError] = useState('');
  /** 요청이 나가 있는 사번 — 처리 중에는 모든 줄을 잠근다 */
  const [savingUserId, setSavingUserId] = useState<string | null>(null);
  /** 목록을 다시 읽는 신호 */
  const [reloadCount, setReloadCount] = useState(0);

  useEffect(() => {
    const controller = new AbortController();
    const { signal } = controller;

    getStepPermissions(stepId, signal)
      .then(setEntries)
      .catch(() => {
        // 취소는 실패가 아니다
        if (!signal.aborted) setHasFailed(true);
      });

    return () => controller.abort();
  }, [stepId, reloadCount]);

  /** 서버 값으로 목록을 다시 맞춘다 — 화면 값이 더 이상 근거가 되지 못할 때 쓴다 */
  function reload() {
    setReloadCount((count) => count + 1);
  }

  /** 응답 한 줄로 그 사람의 행만 갈아끼운다 — 목록을 다시 읽을 필요가 없다 */
  function patchEntry(
    userId: string,
    permission: StepPermission,
    overridden: boolean,
  ) {
    setEntries((current) =>
      current
        ? current.map((entry) =>
            entry.userId === userId
              ? { ...entry, permission, overridden }
              : entry,
          )
        : current,
    );
  }

  async function change(
    entry: StepPermissionEntry,
    permission: StepPermission,
  ) {
    if (savingUserId !== null) return;

    setError('');
    setSavingUserId(entry.userId);

    try {
      const saved = await setStepPermission(stepId, entry.userId, permission);
      patchEntry(saved.userId, saved.permission, saved.overridden);
    } catch (caught) {
      setError(messageOf(caught, '권한을 바꾸지 못했습니다.'));
    } finally {
      setSavingUserId(null);
    }
  }

  async function revoke(entry: StepPermissionEntry) {
    if (savingUserId !== null) return;

    setError('');
    setSavingUserId(entry.userId);

    try {
      const saved = await revokeStepPermission(stepId, entry.userId);
      // 응답의 `permission` 은 **회수 후 상속된 등급**이다
      patchEntry(saved.userId, saved.permission, saved.overridden);
    } catch (caught) {
      const code = caught instanceof ApiError ? caught.code : undefined;

      /*
       * 행이 원래 없었다 — 이미 상속 상태라 실패로 보일 이유는 없지만,
       * ⚠️ **화면 값을 그대로 두면 안 된다.** 지금 보이는 등급은 직접 지정 값이라
       *    실제 상속 등급과 다를 수 있고, 그대로 두면 관리자가 잘못된 값으로 판단한다.
       *    서버에서 다시 읽어 맞춘다.
       */
      if (code === STEP_PERMISSION_CODES.notFound) {
        reload();
      } else {
        setError(messageOf(caught, '상속으로 되돌리지 못했습니다.'));
      }
    } finally {
      setSavingUserId(null);
    }
  }

  return (
    <PanelModal title="스텝 권한 관리" onClose={onClose}>
      <div className="max-h-[55vh] overflow-y-auto p-5">
        <p className="rounded-lg bg-bg-surface px-3 py-2.5 text-detail break-keep text-text-primary">
          {stepName}
        </p>

        <p className="mt-3 text-caption leading-relaxed break-keep text-text-secondary">
          <strong>상속</strong>은 프로젝트 참여자 권한을 그대로 따른다는
          뜻입니다. 이 스텝만 가리려면 <strong>차단</strong>을 골라주세요 —
          아무것도 지정하지 않은 상태는 차단이 아닙니다.
        </p>

        {hasFailed ? (
          <p className="mt-3 rounded-lg bg-red-bg-soft px-3 py-2.5 text-detail break-keep text-text-danger">
            권한 목록을 불러오지 못했습니다. 프로젝트 편집 권한이 있어야 조회할
            수 있습니다.
          </p>
        ) : !entries ? (
          <p className="mt-3 text-detail text-text-secondary">불러오는 중…</p>
        ) : entries.length === 0 ? (
          <p className="mt-3 rounded-lg bg-bg-surface px-3 py-2.5 text-detail break-keep text-text-secondary">
            참여자가 없습니다.
          </p>
        ) : (
          <ul className="mt-3 divide-y divide-border-default">
            {entries.map((entry) => {
              const isMe = entry.userId === me.userId;
              const isSaving = savingUserId === entry.userId;

              return (
                <li key={entry.userId} className="py-2.5">
                  <div className="flex items-center gap-2">
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-detail font-medium text-text-primary">
                        {entry.name}
                        {isMe && (
                          <span className="ml-1 text-caption text-text-secondary">
                            (나)
                          </span>
                        )}
                      </p>
                      <p className="truncate text-caption text-text-secondary">
                        {entry.userId} ·{' '}
                        {entry.overridden ? '직접 지정' : '프로젝트 권한 상속'}
                      </p>
                    </div>

                    {isMe ? (
                      <span
                        title="자기 자신의 권한은 바꿀 수 없습니다"
                        className="shrink-0 rounded-button-sm bg-bg-surface px-2 py-1 text-detail text-text-secondary"
                      >
                        {STEP_PERMISSION_LABELS[entry.permission]}
                      </span>
                    ) : (
                      <>
                        <label
                          htmlFor={`step-permission-${entry.userId}`}
                          className="sr-only"
                        >
                          {entry.name} 스텝 권한
                        </label>
                        <select
                          id={`step-permission-${entry.userId}`}
                          value={entry.permission}
                          disabled={savingUserId !== null}
                          onChange={(event) =>
                            void change(
                              entry,
                              event.target.value as StepPermission,
                            )
                          }
                          className="shrink-0 cursor-pointer rounded-lg border border-border-default bg-bg-card px-2 py-1 text-detail text-text-primary focus:outline-2 focus:outline-offset-2 focus:outline-border-primary disabled:cursor-not-allowed disabled:text-text-muted"
                        >
                          {STEP_PERMISSIONS.map((permission) => (
                            <option key={permission} value={permission}>
                              {STEP_PERMISSION_LABELS[permission]}
                            </option>
                          ))}
                        </select>

                        {/*
                          상속 상태에는 되돌릴 것이 없다 — 버튼 자리를 비워 두면
                          줄마다 폭이 달라지므로 자리는 남기고 숨긴다
                        */}
                        {entry.overridden ? (
                          <button
                            type="button"
                            disabled={savingUserId !== null}
                            onClick={() => void revoke(entry)}
                            className="shrink-0 cursor-pointer rounded-button-sm px-2 py-1 text-caption font-medium whitespace-nowrap text-text-primary-blue hover:bg-blue-bg-soft disabled:cursor-not-allowed disabled:text-text-muted"
                          >
                            {isSaving ? '처리 중…' : '상속으로'}
                          </button>
                        ) : (
                          <span
                            aria-hidden
                            className="shrink-0 px-2 py-1 text-caption text-transparent"
                          >
                            상속으로
                          </span>
                        )}
                      </>
                    )}
                  </div>
                </li>
              );
            })}
          </ul>
        )}

        {/* 요소를 먼저 두고 내용만 바꿔야 스크린리더가 읽는다 */}
        <p
          role="alert"
          className="mt-2 text-caption break-keep text-text-danger empty:hidden"
        >
          {error}
        </p>
      </div>

      <ModalFooter>
        <button
          type="button"
          onClick={onClose}
          className="min-w-[104px] cursor-pointer rounded-lg bg-btn-primary px-4 py-1.5 text-detail font-semibold text-text-white hover:bg-btn-primary-hover"
        >
          닫기
        </button>
      </ModalFooter>
    </PanelModal>
  );
}
