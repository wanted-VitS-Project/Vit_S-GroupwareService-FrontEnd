'use client';

import Link from 'next/link';

import PanelModal, { ModalFooter } from '@/components/PanelModal';

import { PROJECT_ROUTES } from '../routes';
import type { ProjectMember } from '../types';
import MemberList from './MemberList';

interface ProjectMembersModalProps {
  projectId: string;
  members: ProjectMember[] | null;
  hasFailed: boolean;
  canEdit: boolean;
  onChanged: () => void;
  onClose: () => void;
}

/**
 * 사이드바에서 여는 참여자 관리 모달. (.ai/API.md 45 · 125~127)
 *
 * 사이드바 참여자 줄은 아바타만 겹쳐 놓아 **누가 무슨 권한인지 알 수 없다** —
 * 설정 화면까지 가지 않고 여기서 바로 고칠 수 있게 같은 목록(`MemberList`)을 띄운다.
 *
 * ⚠️ 목록은 **사이드바가 이미 받아 둔 것**을 그대로 쓴다 — 같은 요청을 두 번 보내지 않는다.
 *    바꾼 뒤에는 `onChanged` 로 사이드바가 다시 읽어, 아바타 줄도 함께 맞춰진다.
 */
export default function ProjectMembersModal({
  projectId,
  members,
  hasFailed,
  canEdit,
  onChanged,
  onClose,
}: ProjectMembersModalProps) {
  return (
    // 편집 권한이 없으면 목록이 읽기 전용이라 제목도 `관리` 라고 하지 않는다
    <PanelModal title={canEdit ? '참여자 관리' : '참여자'} onClose={onClose}>
      <div className="max-h-[55vh] overflow-y-auto p-5">
        <MemberList
          projectId={projectId}
          members={members}
          hasFailed={hasFailed}
          canEdit={canEdit}
          onChanged={onChanged}
          showAddButton
        />
      </div>

      <ModalFooter>
        {/* 스텝 권한 · 카테고리처럼 더 넓은 설정은 설정 화면 몫이다 */}
        <Link
          href={`${PROJECT_ROUTES.detail(projectId)}/settings`}
          onClick={onClose}
          className="mr-auto cursor-pointer text-detail font-medium whitespace-nowrap text-text-primary-blue hover:underline"
        >
          프로젝트 설정에서 더 보기
        </Link>
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
