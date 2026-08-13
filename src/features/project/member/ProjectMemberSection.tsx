'use client';

import SettingsSection from '../settings/SettingsSection';
import type { ProjectMember } from '../types';
import MemberList from './MemberList';

interface ProjectMemberSectionProps {
  projectId: string;
  /** 아직 도착하지 않았으면 `null` */
  members: ProjectMember[] | null;
  hasFailed: boolean;
  canEdit: boolean;
  onChanged: () => void;
}

/**
 * 설정 화면의 참여자 섹션 — 껍데기만 씌운다.
 *
 * 목록 · 권한 변경 · 제거 · 추가는 `MemberList` 한 곳에 있다 (사이드바와 공용).
 * 추가 버튼도 그 안에 있어(`showAddButton`) 목록 바로 위에 붙는다 —
 * 섹션 헤더로 올리면 사이드바 모달에는 헤더가 없어 버튼 자리가 두 벌이 된다.
 */
export default function ProjectMemberSection({
  projectId,
  members,
  hasFailed,
  canEdit,
  onChanged,
}: ProjectMemberSectionProps) {
  return (
    <SettingsSection
      title="참여자"
      description="프로젝트를 볼 수 있는 사람과 편집할 수 있는 사람을 관리합니다. 접근을 막으려면 참여자에서 제거하세요."
    >
      <MemberList
        projectId={projectId}
        members={members}
        hasFailed={hasFailed}
        canEdit={canEdit}
        onChanged={onChanged}
        showAddButton
      />
    </SettingsSection>
  );
}
