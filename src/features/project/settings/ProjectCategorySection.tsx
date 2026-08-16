'use client';

import { useState } from 'react';

import { notifyToast } from '@/components/Toast';
import { ApiError, messageOf } from '@/lib/api';
import { useModal } from '@/lib/useModal';

import { unlinkBusinessCategory } from '../api';
import { PROJECT_CATEGORY_CODES } from '../errorCodes';
import type { BusinessCategory } from '../types';
import LinkCategoryModal from './LinkCategoryModal';
import SettingsSection from './SettingsSection';

interface ProjectCategorySectionProps {
  projectId: string;
  /** 아직 도착하지 않았으면 `null` */
  categories: BusinessCategory[] | null;
  canEdit: boolean;
  /** 연결 · 해제 후 상세를 다시 읽는 신호 */
  onChanged: () => void;
}

/**
 * 프로젝트에 붙은 사업 카테고리 관리. (.ai/API.md 132 · 133)
 *
 * ⛔ 카테고리 **자체**를 만들거나 지우는 곳이 아니다 — 그건 전사 관리(15~18) 소관이다.
 *    여기서는 이미 있는 카테고리를 프로젝트에 붙이고 뗄 뿐이다.
 * 🗑️ 마스터가 삭제된 카테고리(`deleted`)도 연결 행은 남아 보인다 (D-3) —
 *    배지를 붙이되 **해제는 막지 않는다.** 정리할 수 있어야 하기 때문이다.
 */
export default function ProjectCategorySection({
  projectId,
  categories,
  canEdit,
  onChanged,
}: ProjectCategorySectionProps) {
  const linkModal = useModal();
  const [error, setError] = useState('');
  /**
   * 해제 중인 카테고리.
   *
   * 요청이 나가 있는 동안에는 **모든 줄의 버튼을 막는다** — 목록이 곧 갈릴 예정이라
   * 다른 줄을 눌러도 어느 것이 지워졌는지 알기 어렵다. 대신 처리 중인 줄에는
   * `aria-busy` 를 붙여 왜 안 눌리는지 알 수 있게 한다.
   */
  const [unlinkingId, setUnlinkingId] = useState<number | null>(null);

  async function unlink(category: BusinessCategory) {
    if (unlinkingId !== null) return;

    setError('');
    setUnlinkingId(category.categoryId);

    try {
      await unlinkBusinessCategory(projectId, category.categoryId);
      onChanged();
      notifyToast(`'${category.name}' 연결을 해제했습니다.`);
    } catch (caught) {
      const code = caught instanceof ApiError ? caught.code : undefined;

      // 이미 남이 뗐다 — 실패로 보이게 할 이유가 없어 목록만 맞춘다
      if (code === PROJECT_CATEGORY_CODES.notLinked) {
        onChanged();
      } else {
        setError(messageOf(caught, '연결을 해제하지 못했습니다.'));
      }
    } finally {
      setUnlinkingId(null);
    }
  }

  return (
    <SettingsSection
      title="사업 카테고리"
      description="프로젝트의 사업 분류입니다. 카테고리 자체의 추가 · 삭제는 전사 관리에서 합니다."
      action={
        canEdit ? (
          <button
            type="button"
            onClick={linkModal.open}
            className="shrink-0 cursor-pointer rounded-lg border border-border-primary px-3 py-1.5 text-detail font-medium text-text-primary-blue hover:bg-blue-bg-soft"
          >
            + 카테고리 연결
          </button>
        ) : null
      }
    >
      {categories === null ? (
        <p className="text-detail text-text-secondary">불러오는 중…</p>
      ) : categories.length === 0 ? (
        <p className="rounded-lg bg-bg-surface px-3 py-2.5 text-detail break-keep text-text-secondary">
          연결된 사업 카테고리가 없습니다.
          {canEdit && ' 오른쪽 위에서 연결할 수 있습니다.'}
        </p>
      ) : (
        <ul className="flex flex-wrap gap-2">
          {categories.map((category) => (
            <li
              key={category.categoryId}
              aria-busy={unlinkingId === category.categoryId || undefined}
              className="flex items-center gap-1.5 rounded-pill border border-border-default bg-bg-surface py-1 pr-1 pl-3"
            >
              <span className="text-detail font-medium text-text-primary">
                {category.name}
              </span>
              {category.code && (
                <span className="font-mono text-caption text-text-secondary">
                  {category.code}
                </span>
              )}
              {category.deleted && (
                <span className="badge badge-gray shrink-0">삭제됨</span>
              )}
              {canEdit && (
                <button
                  type="button"
                  aria-label={`${category.name} 연결 해제`}
                  disabled={unlinkingId !== null}
                  onClick={() => void unlink(category)}
                  className="flex size-5 cursor-pointer items-center justify-center rounded-pill text-text-secondary hover:bg-bg-hover hover:text-text-danger disabled:cursor-not-allowed disabled:text-text-muted"
                >
                  ✕
                </button>
              )}
            </li>
          ))}
        </ul>
      )}

      <p
        role="alert"
        className="mt-3 text-caption break-keep text-text-danger empty:hidden"
      >
        {error}
      </p>

      {linkModal.isOpen && (
        <LinkCategoryModal
          projectId={projectId}
          linked={categories ?? []}
          onClose={linkModal.close}
          onLinked={onChanged}
        />
      )}
    </SettingsSection>
  );
}
