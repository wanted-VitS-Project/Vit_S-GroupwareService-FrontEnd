'use client';

import { useRouter } from 'next/navigation';

import { notifyToast } from '@/components/Toast';
import { useModal } from '@/lib/useModal';

import { PROJECT_ROUTES } from '../routes';
import type { ProjectDetail } from '../types';
import DeleteProjectModal from './DeleteProjectModal';
import SettingsSection from './SettingsSection';

interface DeleteProjectSectionProps {
  projectId: string;
  /** 아직 도착하지 않았으면 `null` — 버튼을 잠근 채 그린다 */
  project: ProjectDetail | null;
  canEdit: boolean;
}

/**
 * 프로젝트 삭제. 프로젝트 `EDITOR` 전용. (.ai/API.md 139 · PRJ-014)
 *
 * ⛔ **`진행 전` 이면서 스텝이 0개일 때만** 삭제할 수 있다 — 조건을 화면에서 먼저 보고
 *    안 되는 이유를 문구로 알린다. 눌러 보고 409 를 보게 두지 않는다.
 * ℹ️ 되돌릴 수 없는 조작이라 설정 화면 **맨 아래**에 두고 확인 모달을 거친다 —
 *    상태 변경 · 참여자 편집을 하다 실수로 누를 자리에 두지 않는다.
 */
export default function DeleteProjectSection({
  projectId,
  project,
  canEdit,
}: DeleteProjectSectionProps) {
  const router = useRouter();
  const deleteModal = useModal();

  const isNotStarted = project?.status === 'NOT_STARTED';
  const hasSteps = (project?.stepCount ?? 0) > 0;
  const canDelete = Boolean(project) && canEdit && isNotStarted && !hasSteps;

  /** 못 지우는 이유 — 없으면 `null` */
  const blockedReason = !project
    ? null
    : !isNotStarted
      ? '이미 시작한 프로젝트는 삭제할 수 없습니다. 더 진행하지 않는다면 위 진행 상태에서 종결로 남겨주세요.'
      : hasSteps
        ? `스텝이 ${project.stepCount}개 남아 있어 삭제할 수 없습니다. 스텝을 모두 지우거나 종결로 남겨주세요.`
        : null;

  return (
    <SettingsSection
      title="프로젝트 삭제"
      description="진행 전이면서 스텝이 하나도 없을 때만 삭제할 수 있습니다."
    >
      <div className="flex items-center justify-between gap-4">
        <p className="text-caption break-keep text-text-secondary">
          {blockedReason ??
            '삭제하면 목록에서 사라지고, 연결된 공고가 있으면 함께 풀립니다.'}
        </p>
        <button
          type="button"
          disabled={!canDelete}
          onClick={deleteModal.open}
          className="shrink-0 cursor-pointer rounded-lg border border-border-default px-3.5 py-2 text-detail font-medium text-text-danger hover:bg-red-bg-soft disabled:cursor-not-allowed disabled:text-text-muted disabled:hover:bg-transparent"
        >
          프로젝트 삭제
        </button>
      </div>

      {deleteModal.isOpen && project && (
        <DeleteProjectModal
          projectId={projectId}
          projectName={project.name}
          onClose={deleteModal.close}
          onDeleted={() => {
            // 이 화면은 더 이상 열 수 없다 — 목록으로 보내고 이력에서도 지운다
            router.replace(PROJECT_ROUTES.list);
            notifyToast('프로젝트를 삭제했습니다.');
          }}
        />
      )}
    </SettingsSection>
  );
}
