'use client';

import dynamic from 'next/dynamic';
import { useState } from 'react';

import { ProjectFilesSkeleton } from './ProjectOverviewSkeletons';

/**
 * 두 갈래는 **각자 청크로 나눈다.**
 *
 * 한 번에 하나만 그리는데 둘을 함께 실으면, 문서만 보고 나가는 사용자도
 * 이미지 휴지통 · 다중 선택 · 이미지 영구삭제 모달 로더까지 받는다.
 * 처음 보이는 `문서` 쪽은 **선택 즉시** 필요하므로 자리를 지키는 스켈레톤을 함께 준다.
 */
const TrashFiles = dynamic(() => import('./TrashFiles'), {
  loading: () => <ProjectFilesSkeleton />,
});
const loadTrashImages = () => import('./TrashImages');
const TrashImages = dynamic(loadTrashImages, {
  loading: () => <ProjectFilesSkeleton />,
});

type TrashKind = 'files' | 'images';

const KINDS: { kind: TrashKind; label: string }[] = [
  { kind: 'files', label: '문서' },
  { kind: 'images', label: '이미지' },
];

/**
 * 휴지통 — 문서 · 이미지.
 *
 * 두 도메인의 **계약이 달라** 한 목록으로 합치지 않는다.
 * 문서는 건별(경로에 ID)이고 확인 문자로 잠기며, 이미지는 다건(`imgIds[]`)에 확인 문자가 없다.
 * 섞어 놓으면 어떤 항목이 무슨 규칙으로 지워지는지 화면에서 설명할 수 없다.
 *
 * ⚠️ 갈래 전환을 URL 쿼리로 두지 않는다 — 탭 내비(`ProjectTabs`)가 이미 `pathname` 정확 일치로
 *    활성 탭을 잡고 있어, 쿼리가 붙으면 휴지통 탭 활성 판정과 뒤엉킨다.
 */
export default function ProjectTrash() {
  const [kind, setKind] = useState<TrashKind>('files');

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <h2 className="text-sm font-semibold text-text-primary">휴지통</h2>
          <span className="text-[10px] text-text-secondary">
            보관 기간 제한 없음 · 영구 삭제만 저장소에서 지워집니다
          </span>
        </div>

        <div
          role="tablist"
          aria-label="휴지통 종류"
          className="flex items-center gap-1 rounded-lg bg-bg-hover p-0.5"
        >
          {KINDS.map((option) => (
            <button
              key={option.kind}
              type="button"
              role="tab"
              aria-selected={kind === option.kind}
              // 누르기 직전 신호 — 이미지 청크를 미리 받아 두면 전환이 끊기지 않는다
              onPointerEnter={
                option.kind === 'images'
                  ? () => void loadTrashImages()
                  : undefined
              }
              onFocus={
                option.kind === 'images'
                  ? () => void loadTrashImages()
                  : undefined
              }
              onClick={() => setKind(option.kind)}
              className={`cursor-pointer rounded-md px-3 py-1 text-[11px] font-medium ${
                kind === option.kind
                  ? 'bg-white text-text-primary-blue shadow-sm'
                  : 'text-text-secondary hover:text-text-primary'
              }`}
            >
              {option.label}
            </button>
          ))}
        </div>
      </div>

      {/*
        고르지 않은 쪽은 **DOM 에서 뺀다** — 감춰만 두면 보이지도 않는 목록을 위해
        휴지통 조회가 두 번 나가고, 선택 상태도 배경에서 계속 살아 있는다.
      */}
      {kind === 'files' ? <TrashFiles /> : <TrashImages />}
    </div>
  );
}
