'use client';

import { useState } from 'react';

import { AlertDialogTwoButton, DialogIcons } from '@/components/AlertDialog';
import { notifyToast } from '@/components/Toast';
import { PROJECT_STATUS_LABELS } from '@/constants/status';
import { ApiError, messageOf } from '@/lib/api';
import { useModal } from '@/lib/useModal';

import { updateProjectStatus } from '../api';
import { isVersionConflict } from '../errorCodes';
import { closeReasonLabel } from '../labels';
import type { ProjectDetail, ProjectStatusChange } from '../types';
import CloseProjectModal from './CloseProjectModal';
import SettingsSection from './SettingsSection';

// 고를 수 있는 상태 4가지.
// CLOSED 는 없다 — 종결은 사유가 필수라 전용 API(131)를 쓴다.
// 여기에 끼워 넣으면 사유 없이 종결하려다 400 을 맞는다.
const CHOICES: ProjectStatusChange[] = [
  'NOT_STARTED',
  'IN_PROGRESS',
  'SETTLEMENT',
  'COMPLETED',
];

interface ProjectStatusSectionProps {
  projectId: string;
  project: ProjectDetail | null;
  canEdit: boolean;
  onSaved: (version: number) => void;
  /** 종결은 version 을 주지 않아 상세를 다시 읽는다 */
  onClosed: () => void;
  onReload: () => void;
}

// 진행 상태 변경·종결. (.ai/API.md 130·131)
// 두 API 는 성격이 다르다 — 상태 변경은 낙관적 락 대상이고, 종결은 아니다.
// 그래서 한 섹션에 두되 버튼과 안내를 나눠 둔다.
export default function ProjectStatusSection({
  projectId,
  project,
  canEdit,
  onSaved,
  onClosed,
  onReload,
}: ProjectStatusSectionProps) {
  const closeModal = useModal();
  const [error, setError] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const [conflictMessage, setConflictMessage] = useState('');
  /** 확인을 기다리는 선택 — 409 뒤 덮어쓰기에서 다시 쓴다 */
  const [pending, setPending] = useState<ProjectStatusChange | null>(null);

  const isClosed = project?.status === 'CLOSED';

  async function save(status: ProjectStatusChange, overwrite: boolean) {
    if (!project || isSaving) return;

    if (project.version === undefined) {
      setError('버전 정보가 없어 상태를 바꿀 수 없습니다. 새로고침해주세요.');
      return;
    }

    setError('');
    setConflictMessage('');
    setPending(status);
    setIsSaving(true);

    try {
      const saved = await updateProjectStatus(projectId, {
        status,
        version: project.version,
        ...(overwrite ? { overwrite: true } : {}),
      });
      onSaved(saved.version);
      // 상태는 화면 곳곳(사이드바·목록)에 걸려 있어 상세를 다시 읽는 편이 안전하다
      onReload();
      notifyToast(
        `상태를 '${PROJECT_STATUS_LABELS[saved.status]}' 로 바꿨습니다.`,
      );
    } catch (caught) {
      const code = caught instanceof ApiError ? caught.code : undefined;

      if (isVersionConflict(code)) {
        setConflictMessage(
          messageOf(caught, '다른 사람이 먼저 이 프로젝트를 수정했습니다.'),
        );
      } else {
        setError(messageOf(caught, '상태를 바꾸지 못했습니다.'));
      }
    } finally {
      setIsSaving(false);
    }
  }

  return (
    <SettingsSection
      title="진행 상태"
      description="상태는 되돌릴 수 있습니다. 종결은 사유가 필요해 따로 처리합니다."
    >
      <div className="flex flex-wrap gap-2">
        {CHOICES.map((status) => {
          const isCurrent = project?.status === status;

          return (
            <button
              key={status}
              type="button"
              aria-pressed={isCurrent}
              disabled={!project || !canEdit || isSaving || isCurrent}
              onClick={() => void save(status, false)}
              className={`cursor-pointer rounded-lg border px-3.5 py-2 text-detail font-medium whitespace-nowrap disabled:cursor-not-allowed ${
                isCurrent
                  ? 'border-border-primary bg-blue-bg-soft text-text-primary-blue'
                  : 'border-border-default text-text-primary hover:bg-bg-hover disabled:text-text-muted'
              }`}
            >
              {PROJECT_STATUS_LABELS[status]}
            </button>
          );
        })}
      </div>

      {isClosed && (
        <p className="mt-4 rounded-lg bg-bg-surface px-3 py-2.5 text-detail leading-relaxed break-keep text-text-secondary">
          이 프로젝트는 <strong className="text-text-primary">종결</strong>{' '}
          상태입니다
          {/*
            ⚠️ `closeReasonCode` 는 응답 타입이 `string` 이다 —
            단언(`as`)으로 좁히면 백엔드가 새 코드를 추가했을 때 `undefined` 가 그대로 그려진다.
            객체 조회로 두고 **모르는 코드는 코드 값 그대로** 보여준다.
          */}
          {project?.closeReasonCode && (
            <> ({closeReasonLabel(project.closeReasonCode)})</>
          )}
          . 종결해도 목록과 활동 기록에서 사라지지 않으며, 위에서 다른 상태를
          고르면 다시 진행할 수 있습니다.
          {project?.closeReasonNote && (
            <>
              <br />
              사유: {project.closeReasonNote}
            </>
          )}
        </p>
      )}

      <p
        role="alert"
        className="mt-3 text-caption break-keep text-text-danger empty:hidden"
      >
        {error}
      </p>

      {canEdit && !isClosed && (
        <div className="mt-4 flex items-center justify-between gap-4 border-t border-border-default pt-4">
          <p className="text-caption break-keep text-text-secondary">
            더 진행하지 않는 과업은 사유를 남겨 종결합니다. 삭제와 달리 기록은
            그대로 남습니다.
          </p>
          <button
            type="button"
            disabled={!project || isSaving}
            onClick={closeModal.open}
            className="shrink-0 cursor-pointer rounded-lg border border-border-default px-3.5 py-2 text-detail font-medium text-text-danger hover:bg-red-bg-soft disabled:cursor-not-allowed disabled:text-text-muted"
          >
            프로젝트 종결
          </button>
        </div>
      )}

      {closeModal.isOpen && (
        <CloseProjectModal
          projectId={projectId}
          projectName={project?.name ?? ''}
          onClose={closeModal.close}
          onClosed={onClosed}
        />
      )}

      {conflictMessage && pending && (
        <AlertDialogTwoButton
          icon={DialogIcons.warning}
          title="다른 사람이 먼저 수정했습니다"
          description={`${conflictMessage} 최신 내용을 다시 불러올지, 고른 상태로 덮어쓸지 선택해주세요.`}
          confirmLabel="덮어쓰기"
          cancelLabel="다시 불러오기"
          isDanger
          isBusy={isSaving}
          onConfirm={() => void save(pending, true)}
          onCancel={() => {
            setConflictMessage('');
            setPending(null);
            onReload();
          }}
        />
      )}
    </SettingsSection>
  );
}
