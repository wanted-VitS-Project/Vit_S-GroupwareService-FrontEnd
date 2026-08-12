'use client';

import dynamic from 'next/dynamic';
import { useParams } from 'next/navigation';
import { useRef } from 'react';

import MemberAvatar from '@/components/MemberAvatar';
import { SIDE_PANEL } from '@/components/Modal';
import ModalLoadingFallback, {
  SidePanelFallbackHeader,
} from '@/components/ModalLoadingFallback';
import { notifyToast } from '@/components/Toast';
import ActivityIcon from '@/features/activityLog/ActivityIcon';
import { notifyIssueChanged } from '@/features/issue/events';
import { useModal, useModalRouter } from '@/lib/useModal';

import { useBlockActions } from './BlockActionsContext';
import { setPillDragImage, useBlockDrag } from './BlockDragContext';
import { notifyBlockChanged } from './events';
import BlockTypeIcon from './BlockTypeIcon';
import { BLOCK_TYPES, type StepBlock } from './types';

const loadBlockIssuesPanel = () => import('./BlockIssuesPanel');
const loadBlockActivityLogPanel = () =>
  import('@/features/activityLog/BlockActivityLogPanel');
const loadBlockEditModal = () => import('./BlockEditModal');
const loadBlockDeleteModal = () => import('./BlockDeleteModal');
const loadBlockMoveStepModal = () => import('./BlockMoveStepModal');

const BlockIssuesPanel = dynamic(loadBlockIssuesPanel, {
  loading: () => (
    <ModalLoadingFallback
      title="연결된 이슈"
      className={SIDE_PANEL}
      header={<SidePanelFallbackHeader title="연결된 이슈" hasBadge />}
      bodyClassName="m-3 min-h-0 flex-1"
    />
  ),
});
const BlockActivityLogPanel = dynamic(loadBlockActivityLogPanel, {
  loading: () => (
    <ModalLoadingFallback
      title="블록 활동 로그"
      className={SIDE_PANEL}
      header={<SidePanelFallbackHeader title="블록 활동 로그" hasBadge />}
      bodyClassName="m-3 min-h-0 flex-1"
    />
  ),
});
const BlockEditModal = dynamic(loadBlockEditModal, {
  loading: () => <ModalLoadingFallback title="블록 수정" />,
});
const BlockDeleteModal = dynamic(loadBlockDeleteModal, {
  loading: () => <ModalLoadingFallback title="블록 삭제" />,
});
const BlockMoveStepModal = dynamic(loadBlockMoveStepModal, {
  loading: () => (
    <ModalLoadingFallback
      title="다른 스텝으로 이동"
      className="w-full max-w-[420px] rounded-xl p-6 shadow-2xl"
    />
  ),
});

function preloadBlockMenuChunks() {
  void loadBlockIssuesPanel();
  void loadBlockActivityLogPanel();
  void loadBlockEditModal();
  void loadBlockDeleteModal();
  void loadBlockMoveStepModal();
}

interface BlockCardProps {
  block: StepBlock;
  /** 헤더 오른쪽 배지 등 유형별 부가 정보 */
  headerExtra?: React.ReactNode;
  children: React.ReactNode;
}

/**
 * 블록 공통 껍데기 — 헤더(드래그 핸들 · 유형 아이콘 · 제목 · ⋯) / 본문 / 담당자 푸터.
 * 같은 행의 블록끼리 높이를 맞추려고 `h-full` 로 늘어난다.
 *
 * 드래그는 **핸들에서만** 시작한다 — 카드 전체를 잡게 하면 본문의 입력·체크가 막힌다.
 */
export default function BlockCard({
  block,
  headerExtra,
  children,
}: BlockCardProps) {
  const { stepId } = useParams<{ stepId: string }>();
  /** 카드가 띄우는 사이드 패널 둘 — 하나만 열린다 */
  const panel = useModalRouter<'issues' | 'logs'>();
  const type = BLOCK_TYPES.find((option) => option.code === block.type);
  const drag = useBlockDrag();
  const label = block.title || type?.label || '블록';
  const isDragging = drag?.draggingId === block.blockId;

  return (
    <article
      /*
       * 드롭 대상 판정은 카드가 하지 않는다 — 보드가 캡처 단계에서 한 번에 처리한다.
       * 카드 안에는 파일 목록 · 에디터처럼 자체 드래그 처리를 갖는 자식이 있어,
       * 카드에 핸들러를 달면 그런 자식 위에서는 이벤트가 올라오지 않는다.
       */
      // 끄는 중인 카드는 "여기서 빠져나간 자리" 로 읽히게 점선 + 반투명으로 낮춘다
      className={`flex h-full flex-col rounded-lg border bg-bg-card transition-[opacity,border-color] duration-150 ${
        isDragging
          ? 'border-dashed border-border-primary/40 opacity-40'
          : 'border-border-default'
      }`}
    >
      <header className="flex items-center gap-2 border-b border-border-default px-3 py-2">
        {/*
          핸들은 **배치 편집 중에만** 그린다 (`useBlockDrag()` 가 그때만 값을 준다).
          평소에도 흐리게 남겨 두면 "끌 수 있나?" 하고 잡아보게 되는데 아무 일도 일어나지 않는다 —
          할 수 없는 동작의 흔적을 남기지 않는 편이 낫다.
        */}
        {drag && (
          <span
            aria-label={`${label} 위치 이동 핸들`}
            draggable
            onDragStart={(event) => {
              setPillDragImage(event, label);
              drag.start(block.blockId, label);
            }}
            onDragEnd={drag.finish}
            // 점 6개(약 12×10px)만으로는 잡기 어렵다 — 여백으로 실제 클릭 영역을 넓힌다
            className="-m-1 flex cursor-grab flex-col gap-0.5 rounded-button-sm p-1 opacity-40 hover:bg-bg-hover hover:opacity-80 active:cursor-grabbing"
          >
            {[0, 1, 2].map((row) => (
              <span key={row} className="flex gap-0.5">
                <span className="size-1 rounded-pill bg-text-secondary" />
                <span className="size-1 rounded-pill bg-text-secondary" />
              </span>
            ))}
          </span>
        )}

        <span
          style={{
            backgroundColor: type?.background,
            borderColor: type?.border,
            color: type?.icon,
          }}
          className="flex size-5 shrink-0 items-center justify-center rounded-button-sm border"
        >
          <BlockTypeIcon code={block.type} />
        </span>

        <h3 className="min-w-0 flex-1 truncate text-[11px] font-semibold text-text-primary">
          {block.title || type?.label}
        </h3>

        {headerExtra}
        <BlockMenu
          block={block}
          title={label}
          onViewIssues={() => panel.open('issues')}
          onViewLogs={() => panel.open('logs')}
        />
      </header>

      <div className="flex-1 p-3">{children}</div>

      <footer className="flex items-center gap-2 border-t border-border-default bg-bg-surface px-3 py-1.5">
        {block.owner ? (
          <>
            <MemberAvatar
              userId={block.owner.userId}
              name={block.owner.name}
              size="xs"
              withRing={false}
              // 바로 옆에 이름 글자가 있다
              decorative
            />
            <span className="min-w-0 flex-1 truncate text-[9px] text-text-secondary">
              {block.owner.name}
            </span>
          </>
        ) : (
          <span className="flex-1 text-[9px] text-text-secondary">
            담당자 없음
          </span>
        )}

        {block.linkedIssueTotal > 0 && (
          <button
            type="button"
            onPointerEnter={() => void loadBlockIssuesPanel()}
            onFocus={() => void loadBlockIssuesPanel()}
            onClick={() => panel.open('issues')}
            aria-label={`연결된 이슈 ${block.linkedIssueDone} / ${block.linkedIssueTotal} 완료`}
            title={`연결된 이슈 ${block.linkedIssueDone} / ${block.linkedIssueTotal} 완료`}
            className="shrink-0 cursor-pointer rounded-button-sm px-1 py-0.5 text-[9px] text-text-primary-blue hover:bg-blue-bg-soft hover:text-btn-primary-hover"
          >
            # {block.linkedIssueDone} / {block.linkedIssueTotal}
          </button>
        )}
      </footer>
      {panel.isOpen('issues') && (
        <BlockIssuesPanel
          stepId={stepId}
          blockId={block.blockId}
          blockTitle={label}
          onClose={panel.close}
        />
      )}
      {panel.isOpen('logs') && (
        <BlockActivityLogPanel
          stepId={stepId}
          blockId={block.blockId}
          blockTitle={label}
          onClose={panel.close}
        />
      )}
    </article>
  );
}

function BlockMenu({
  block,
  title,
  onViewIssues,
  onViewLogs,
}: {
  block: StepBlock;
  title: string;
  onViewIssues: () => void;
  onViewLogs: () => void;
}) {
  const { id: projectId, stepId } = useParams<{ id: string; stepId: string }>();
  const actions = useBlockActions();
  /** ⋯ 드롭다운. 모달은 아니지만 여닫이가 같아 같은 훅을 쓴다 */
  const menu = useModal();
  /** 메뉴에서 여는 모달 셋 — 하나만 열린다 */
  const modal = useModalRouter<'edit' | 'move' | 'delete'>();
  const triggerRef = useRef<HTMLButtonElement>(null);

  function closeMenuAndFocus() {
    menu.close();
    triggerRef.current?.focus();
  }

  /** 메뉴에서 모달로 넘어간다 — 드롭다운이 뒤에 남으면 모달 밖 클릭을 가로챈다 */
  function openFromMenu(name: 'edit' | 'move' | 'delete') {
    menu.close();
    modal.open(name);
  }

  return (
    <>
      <span
        className="relative shrink-0"
        onKeyDown={(event) => {
          if (event.key !== 'Escape' || !menu.isOpen) return;
          event.stopPropagation();
          closeMenuAndFocus();
        }}
      >
        <button
          ref={triggerRef}
          type="button"
          aria-label={`${title} 메뉴`}
          aria-haspopup="menu"
          aria-expanded={menu.isOpen}
          onPointerEnter={preloadBlockMenuChunks}
          onFocus={preloadBlockMenuChunks}
          onClick={() => (menu.isOpen ? menu.close() : menu.open())}
          className={`flex size-5 cursor-pointer items-center justify-center rounded-button-sm text-text-secondary hover:bg-bg-hover ${
            menu.isOpen ? 'bg-bg-hover' : ''
          }`}
        >
          <MoreIcon />
        </button>

        {menu.isOpen && (
          <>
            <button
              type="button"
              tabIndex={-1}
              aria-label="메뉴 닫기"
              onClick={menu.close}
              className="fixed inset-0 z-10 cursor-default"
            />
            <span
              role="menu"
              className="absolute top-full right-0 z-20 mt-1 flex w-28 flex-col overflow-hidden rounded-lg border border-border-default bg-bg-card shadow-lg"
            >
              <button
                type="button"
                role="menuitem"
                onClick={() => {
                  menu.close();
                  onViewIssues();
                }}
                className="flex cursor-pointer items-center gap-2 px-2.5 py-1.5 text-caption font-medium text-text-primary hover:bg-bg-surface"
              >
                <HashIcon />
                <span className="flex-1 text-left">연결된 이슈</span>
                {block.linkedIssueTotal > 0 && (
                  <span className="rounded-pill bg-blue-bg px-1.5 py-0.5 text-[9px] font-bold text-btn-primary-hover">
                    {block.linkedIssueTotal}
                  </span>
                )}
              </button>
              <button
                type="button"
                role="menuitem"
                onClick={() => {
                  menu.close();
                  onViewLogs();
                }}
                className="flex cursor-pointer items-center gap-2 px-2.5 py-1.5 text-caption font-medium text-text-primary hover:bg-bg-surface"
              >
                <ActivityIcon className="size-2.5 shrink-0 text-purple-text" />
                <span className="flex-1 text-left">활동 로그</span>
              </button>
              <button
                type="button"
                role="menuitem"
                onClick={() => openFromMenu('edit')}
                className="flex cursor-pointer items-center gap-2 px-2.5 py-1.5 text-caption font-medium text-text-primary hover:bg-bg-surface"
              >
                <PencilIcon />
                수정
              </button>
              <button
                type="button"
                role="menuitem"
                onClick={() => openFromMenu('move')}
                className="flex cursor-pointer items-center gap-2 px-2.5 py-1.5 text-caption font-medium text-text-primary hover:bg-bg-surface"
              >
                <MoveIcon />
                <span className="flex-1 text-left">스텝 이동</span>
              </button>
              <button
                type="button"
                role="menuitem"
                onClick={() => openFromMenu('delete')}
                className="flex cursor-pointer items-center gap-2 px-2.5 py-1.5 text-caption font-medium text-text-danger hover:bg-red-bg-soft"
              >
                <TrashIcon />
                삭제
              </button>
            </span>
          </>
        )}
      </span>
      {modal.isOpen('edit') && (
        <BlockEditModal
          block={block}
          onClose={modal.close}
          // 보드 밖에서 쓰인 카드(컨텍스트 없음)는 재조회로 되돌아간다
          onUpdated={(updated) =>
            actions ? actions.patch(updated) : notifyBlockChanged()
          }
        />
      )}
      {modal.isOpen('move') && (
        <BlockMoveStepModal
          projectId={projectId}
          currentStepId={stepId}
          block={block}
          blockTitle={title}
          onClose={modal.close}
          onMoved={(result) => {
            /*
             * 옮긴 블록은 **이 스텝에서 사라진다** — 삭제와 같은 자리 정리다.
             * 보드 밖에서 쓰인 카드(컨텍스트 없음)는 재조회로 되돌아간다.
             */
            if (actions) actions.remove(result.blockId);
            else notifyBlockChanged();

            notifyToast(
              result.unlinkedIssueCount > 0
                ? `블록을 옮기고 이슈 연결 ${result.unlinkedIssueCount}건을 끊었습니다.`
                : '블록을 옮겼습니다.',
            );
            // 연결이 끊기면 이슈 쪽 숫자도 달라진다
            if (result.unlinkedIssueCount > 0) notifyIssueChanged();
          }}
        />
      )}
      {modal.isOpen('delete') && (
        <BlockDeleteModal
          blockId={block.blockId}
          blockTitle={title}
          onClose={modal.close}
          onDeleted={(deletedId) =>
            actions ? actions.remove(deletedId) : notifyBlockChanged()
          }
        />
      )}
    </>
  );
}

function HashIcon() {
  return (
    <span className="text-[11px] font-semibold text-text-primary-blue">#</span>
  );
}

/** 상자 밖으로 나가는 화살표 — "여기서 다른 곳으로" 를 뜻한다 */
function MoveIcon() {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
      className="size-2.5 shrink-0 text-text-secondary"
    >
      <path d="M13 4h7v7" />
      <path d="M20 4 11 13" />
      <path d="M19 15v4a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1V6a1 1 0 0 1 1-1h4" />
    </svg>
  );
}

function MoreIcon() {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="currentColor"
      aria-hidden
      className="size-2.5"
    >
      <circle cx="5" cy="12" r="1.6" />
      <circle cx="12" cy="12" r="1.6" />
      <circle cx="19" cy="12" r="1.6" />
    </svg>
  );
}

function PencilIcon() {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
      className="size-2.5 shrink-0"
    >
      <path d="M4 20h4L20 8l-4-4L4 16z" />
      <path d="m15 5 4 4" />
    </svg>
  );
}

function TrashIcon() {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
      className="size-2.5 shrink-0"
    >
      <path d="M3 6h18M8 6V4h8v2M6 6l1 14h10l1-14" />
      <path d="M10 11v5M14 11v5" />
    </svg>
  );
}
