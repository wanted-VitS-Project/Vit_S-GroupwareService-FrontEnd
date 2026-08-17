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
 * ⛔ **상태 · 스텝 수로 막지 않는다** (2026-08-13 명세 전면 변경) — 종결이든 진행 중이든
 *    언제든 지울 수 있고, 지울 범위 확인은 서버가 409 로 되묻는다(모달에서 처리).
 *    화면에서 미리 잠그면 사용자가 삭제할 방법을 영영 못 찾는다.
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

  // 상태 · 스텝 수는 보지 않는다 — 권한과 로딩만 본다
  const canDelete = Boolean(project) && canEdit;

  return (
    <SettingsSection
      title="프로젝트 삭제"
      description="하위 스테이지 · 스텝 · 블록 · 이슈까지 함께 지워지고 되돌릴 수 없습니다."
    >
      <div className="flex items-center justify-between gap-4">
        <p className="text-caption break-keep text-text-secondary">
          기록으로 남기고 싶다면 삭제 대신 위 진행 상태에서 종결로 남겨주세요.
          연결된 공고가 있으면 함께 풀립니다.
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
          stepCount={project.stepCount}
          // 진행 전 + 스텝 0개가 아니면 서버가 되묻는다 — 모달이 미리 알린다
          requiresConfirm={
            project.status !== 'NOT_STARTED' || project.stepCount > 0
          }
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
