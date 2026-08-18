'use client';

import { useState } from 'react';

import { AlertDialogTwoButton, DialogIcons } from '@/components/AlertDialog';
import PanelModal, { ModalFooter } from '@/components/PanelModal';
import { ApiError, messageOf } from '@/lib/api';

import { createStage, updateStage } from '../api';
import { STAGE_CODES } from '../errorCodes';
import { type ProjectStage, STAGE_NAME_MAX_LENGTH } from '../types';

interface StageFormModalProps {
  projectId: string;
  /** 있으면 이름 수정, 없으면 추가 */
  stage?: ProjectStage;
  onClose: () => void;
  /** 저장 성공·남이 먼저 지운 경우 모두 목록을 다시 읽는다 */
  onSaved: () => void;
}

// 스테이지 추가·이름 수정 모달. (.ai/API.md 112·113)
// 순서는 여기서 못 바꾼다 — 추가는 서버가 맨 뒤(max+1)에 붙이고,
// 기존 스테이지의 순서 변경은 PATCH /projects/{projectId}/stages/order 소관이다.
// 수정은 낙관적 락이다. 그 사이 남이 저장했으면 409 가 오고,
// 그때는 저장을 조용히 버리지 않고 덮어쓸지 다시 불러올지 사용자에게 묻는다.
export default function StageFormModal({
  projectId,
  stage,
  onClose,
  onSaved,
}: StageFormModalProps) {
  const isEditing = stage !== undefined;

  const [name, setName] = useState(stage?.name ?? '');
  const [nameError, setNameError] = useState('');
  const [error, setError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isConflicting, setIsConflicting] = useState(false);

  // 수정에 필요한 version 이 목록 응답에 없는 경우.
  // 그대로 보내면 400 이라 저장 자체를 막고 재조회를 안내한다. (types.ts 참고)
  const hasNoVersion = isEditing && stage.version === undefined;

  /** 값을 고치면 직전 서버 오류는 더 이상 맞지 않는다 */
  function changeName(value: string) {
    setName(value);
    setNameError('');
    setError('');
  }

  /** 저장 중에는 닫지 않는다 */
  function requestClose() {
    if (!isSubmitting) onClose();
  }

  const trimmedName = name.trim();
  const hasChanges = !isEditing || trimmedName !== stage.name;
  const canSubmit =
    trimmedName !== '' && hasChanges && !isSubmitting && !hasNoVersion;

  async function save(overwrite: boolean) {
    setNameError('');
    setError('');
    setIsConflicting(false);
    setIsSubmitting(true);

    try {
      if (stage) {
        // canSubmit 이 막고 있지만 덮어쓰기 경로도 지나므로 여기서 한 번 더 본다
        if (stage.version === undefined) {
          setError('버전 정보가 없어 저장할 수 없습니다. 새로고침해주세요.');
          setIsSubmitting(false);
          return;
        }
        await updateStage(stage.stageId, {
          name: trimmedName,
          version: stage.version,
          ...(overwrite ? { overwrite: true } : {}),
        });
      } else {
        await createStage(projectId, { name: trimmedName });
      }

      onSaved();
      onClose();
    } catch (caught) {
      const code = caught instanceof ApiError ? caught.code : undefined;

      // 남이 먼저 저장했다 — 덮어쓸지 다시 불러올지 묻는다
      if (code === STAGE_CODES.versionConflict) {
        setIsConflicting(true);
        setIsSubmitting(false);
        return;
      }
      // 남이 먼저 지웠다 — 목록만 갱신하고 닫는다
      if (code === STAGE_CODES.notFound) {
        onSaved();
        onClose();
        return;
      }

      const message = messageOf(caught, '저장하지 못했습니다.');
      // 이름이 문제면 어느 입력이 문제인지 알 수 있어 필드에 붙인다
      if (caught instanceof ApiError && caught.status === 400) {
        setNameError(message);
      } else {
        setError(message);
      }
      setIsSubmitting(false);
    }
  }

  function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    if (canSubmit) void save(false);
  }

  return (
    <>
      <PanelModal
        title={isEditing ? '스테이지명 수정' : '스테이지 추가'}
        onClose={requestClose}
      >
        <form onSubmit={handleSubmit}>
          <div className="space-y-4 p-5">
            <div>
              <div className="flex items-end justify-between gap-2 pb-1.5">
                <label
                  htmlFor="stageName"
                  className="text-detail font-semibold text-text-primary"
                >
                  스테이지명 <span className="text-text-danger">*</span>
                </label>
                <span className="text-caption text-text-secondary">
                  {name.length} / {STAGE_NAME_MAX_LENGTH}
                </span>
              </div>
              <input
                id="stageName"
                type="text"
                value={name}
                maxLength={STAGE_NAME_MAX_LENGTH}
                onChange={(event) => changeName(event.target.value)}
                placeholder="제안"
                autoFocus
                aria-invalid={nameError ? true : undefined}
                aria-describedby={nameError ? 'stageName-error' : undefined}
                className={`w-full rounded-lg border bg-bg-surface px-3 py-2 text-detail text-text-primary placeholder:text-text-secondary focus:outline-2 focus:outline-offset-2 ${
                  nameError
                    ? 'border-border-danger focus:outline-border-danger'
                    : 'border-border-default focus:outline-border-primary'
                }`}
              />
              {nameError ? (
                <p
                  id="stageName-error"
                  role="alert"
                  className="mt-1 text-caption break-keep text-text-danger"
                >
                  {nameError}
                </p>
              ) : (
                <p className="mt-1 text-caption break-keep text-text-secondary">
                  {isEditing
                    ? '이름을 바꿔도 소속 스텝과 순서는 그대로 유지됩니다.'
                    : '추가한 스테이지는 목록 맨 뒤에 붙습니다. 소속 스텝은 나중에 추가할 수 있습니다.'}
                </p>
              )}
            </div>

            {hasNoVersion && (
              <p className="rounded-lg bg-yellow-bg-soft px-3 py-2.5 text-detail leading-relaxed break-keep text-yellow-text">
                이 스테이지의 버전 정보를 받지 못해 수정할 수 없습니다. 새로고침
                후 다시 시도해주세요.
              </p>
            )}
          </div>

          <ModalFooter>
            {/* 요소를 먼저 두고 내용만 바꿔야 스크린리더가 읽는다 */}
            <p
              role="alert"
              className="mr-auto text-caption break-keep text-text-danger"
            >
              {error}
            </p>
            <div className="flex shrink-0 items-center gap-2">
              <button
                type="button"
                onClick={requestClose}
                disabled={isSubmitting}
                className="btn btn-md btn-gray-outlined"
              >
                취소
              </button>
              <button
                type="submit"
                disabled={!canSubmit}
                className="btn btn-md btn-primary min-w-26"
              >
                {isSubmitting ? '저장 중…' : isEditing ? '저장' : '추가'}
              </button>
            </div>
          </ModalFooter>
        </form>
      </PanelModal>

      {isConflicting && (
        /*
         * 409 를 조용히 삼키면 사용자는 저장된 줄 안다.
         * 취소(= Esc·배경 클릭)를 다시 불러오기에 두어 잘못 눌러도 남의 값이 지워지지 않게 한다.
         */
        <AlertDialogTwoButton
          icon={DialogIcons.warning}
          title="다른 사람이 먼저 저장했습니다"
          description="그 사이 이 스테이지가 수정됐습니다. 지금 입력한 이름으로 덮어쓰거나, 최신 내용을 다시 불러올 수 있습니다."
          confirmLabel="덮어쓰기"
          cancelLabel="다시 불러오기"
          isDanger
          onConfirm={() => void save(true)}
          onCancel={() => {
            onSaved();
            onClose();
          }}
        />
      )}
    </>
  );
}
