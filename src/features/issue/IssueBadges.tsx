/**
 * 이슈 화면에서 반복되는 작은 표시 요소 —
 * 상태 · 우선순위 · 마감 경과 배지, 담당자 아바타, 블록 아이콘 상자.
 * 카드 · 상세 모달 · 폼 모달이 같은 모양을 쓰도록 한 곳에 모았다.
 */

import MemberAvatar from '@/components/MemberAvatar';
import BlockTypeIcon from '@/features/block/BlockTypeIcon';
import { BLOCK_TYPES, type BlockTypeCode } from '@/features/block/types';

import {
  ISSUE_OVERDUE_STYLE,
  ISSUE_PRIORITY_LABELS,
  ISSUE_PRIORITY_STYLES,
  ISSUE_STATUS_LABELS,
  ISSUE_STATUS_STYLES,
  type IssueAssignee,
  type IssuePriority,
  type IssueStatus,
} from './types';

export function IssueStatusBadge({ status }: { status: IssueStatus }) {
  const { badge, dot } = ISSUE_STATUS_STYLES[status];

  return (
    <span
      className={`inline-flex items-center gap-1 rounded border px-1.5 py-0.5 text-[9px] font-medium ${badge}`}
    >
      <span className={`size-1.5 rounded-full ${dot}`} />
      {ISSUE_STATUS_LABELS[status]}
    </span>
  );
}

/**
 * 우선순위 배지.
 * `withPrefix` 는 상세 모달 헤더용 — '우선순위 높음' 처럼 무엇의 등급인지 밝힌다.
 */
export function IssuePriorityBadge({
  priority,
  withPrefix = false,
  withDot = true,
}: {
  priority: IssuePriority;
  withPrefix?: boolean;
  withDot?: boolean;
}) {
  const { badge, dot } = ISSUE_PRIORITY_STYLES[priority];

  return (
    <span
      className={`inline-flex items-center gap-1 rounded border px-1.5 py-0.5 text-[9px] font-medium ${badge}`}
    >
      {withDot && <span className={`size-1.5 rounded-full ${dot}`} />}
      {withPrefix && '우선순위 '}
      {ISSUE_PRIORITY_LABELS[priority]}
    </span>
  );
}

/** 마감일이 지난 만큼을 짧게 — 'D+3' */
export function OverdueBadge({ days }: { days: number }) {
  if (days <= 0) return null;

  return (
    <span
      title={`마감일에서 ${days}일 지났습니다`}
      className={`inline-flex items-center rounded border px-1.5 py-0.5 text-[9px] font-medium ${ISSUE_OVERDUE_STYLE}`}
    >
      D+{days}
    </span>
  );
}

/** 마감일이 지난 만큼을 문장으로 — '3일 지남' (상세 모달 우측) */
export function OverduePill({ days }: { days: number }) {
  if (days <= 0) return null;

  return (
    <span
      className={`inline-flex items-center rounded-lg border px-2.5 py-1 text-[11px] font-medium ${ISSUE_OVERDUE_STYLE}`}
    >
      {days}일 지남
    </span>
  );
}

/** 담당자 여러 명을 겹쳐 보여준다. 지정 전이면 안내 문구를 대신 그린다 */
export function AssigneeAvatars({
  assignees,
  size = 'xs',
}: {
  assignees: IssueAssignee[];
  size?: 'xs' | 'sm';
}) {
  if (assignees.length === 0) {
    return <span className="text-[10px] text-[#6C7389]">담당자 없음</span>;
  }

  return (
    <span className="flex items-center">
      {assignees.map((assignee, index) => (
        <span
          key={assignee.userId}
          style={{ marginLeft: index === 0 ? 0 : -6, zIndex: index }}
        >
          <MemberAvatar
            userId={assignee.userId}
            name={assignee.name}
            size={size}
          />
        </span>
      ))}
    </span>
  );
}

/**
 * 블록 유형 아이콘 상자. 유형별 색은 `BLOCK_TYPES` 를 그대로 쓴다.
 * 명세에 없는 유형이 오면 색 없이 빈 상자만 그린다 — 화면이 깨지지 않게.
 */
export function IssueBlockIcon({
  type,
  size = 20,
}: {
  type: BlockTypeCode | string;
  size?: 16 | 20;
}) {
  const option = BLOCK_TYPES.find((candidate) => candidate.code === type);

  return (
    <span
      style={{
        width: size,
        height: size,
        backgroundColor: option?.background ?? '#ECEEF4',
        borderColor: option?.border ?? 'rgba(28,31,42,0.09)',
        color: option?.icon ?? '#6C7389',
      }}
      className="flex shrink-0 items-center justify-center rounded border [&_svg]:size-2.5"
    >
      {option && <BlockTypeIcon code={option.code} />}
    </span>
  );
}
