'use client';

import { memo } from 'react';

import MemberAvatar from '@/components/MemberAvatar';
import { IssueBlockIcon } from '@/features/issue/IssueBadges';

import { parseActivityTime } from './time';
import {
  ACTIVITY_ACTION_LABELS,
  ACTIVITY_ACTION_STYLES,
  fieldDisplay,
  fieldLabel,
  formatFieldValue,
  type ActivityLog,
} from './types';

/**
 * 활동 기록 한 줄. 서버가 주는 원자 데이터를 화면에서 문장으로 조립한다. (.ai/API.md 72번)
 *
 * 윗줄 — 수행자 · 블록(제목 · 유형)
 * 아랫줄 — `displayName` + 동작, 수정이면 어떤 필드가 어떻게 바뀌었는지
 *
 * `memo` — 이어 읽기 · 스크롤로 목록 상태가 바뀔 때마다 이미 그린 줄까지 다시 그리면
 * 목록이 길어질수록 스크롤이 끊긴다. 기록은 한 번 오면 바뀌지 않아 그대로 재사용된다.
 * (펼친 `<details>` 상태도 유지된다 — 다시 그리면 접혀 버린다)
 */
function ActivityLogItem({
  log,
  isLast,
  /** 블록 필터가 걸린 목록에서는 블록 이름이 줄마다 반복돼 감춘다 */
  showBlock = true,
}: {
  log: ActivityLog;
  isLast: boolean;
  showBlock?: boolean;
}) {
  const time = parseActivityTime(log.createdAt);
  const actionLabel = ACTIVITY_ACTION_LABELS[log.action];
  const style = ACTIVITY_ACTION_STYLES[log.action];

  // 스냅샷 이름이 비어 있을 수 있다 — 빈칸 대신 대체 문구를 둔다
  const targetName = log.displayName || log.block.title || '이름 없음';
  const targetKind = log.targetType === 'BLOCK' ? '블록' : '항목';
  const blockTitle = log.block.title || '제목 없는 블록';

  return (
    <li className="relative flex gap-3 pb-5 last:pb-0">
      {/* 타임라인 세로선 — 마지막 줄에는 그리지 않는다 */}
      {!isLast && (
        <span
          aria-hidden
          className="absolute top-8 bottom-0 left-[13px] w-px bg-[#1C1F2A]/10"
        />
      )}

      <span
        aria-hidden
        className={`relative z-[1] flex size-[27px] shrink-0 items-center justify-center rounded-full border bg-white ${style.icon}`}
      >
        <ActionIcon action={log.action} />
      </span>

      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-center gap-1.5">
          <MemberAvatar
            userId={log.actor.userId}
            name={log.actor.name}
            size="xs"
            decorative
          />
          <span className="text-[11px] font-semibold text-[#1C1F2A]">
            {log.actor.name}
          </span>

          {showBlock && (
            <span className="inline-flex min-w-0 items-center gap-1 rounded border border-[#1C1F2A]/9 bg-[#F7F8FB] px-1.5 py-0.5 text-[10px] text-[#6C7389]">
              <IssueBlockIcon type={log.block.type} size={16} />
              <span className="truncate">{blockTitle}</span>
            </span>
          )}

          <span
            className={`rounded-full border px-1.5 py-0.5 text-[10px] font-semibold ${style.badge}`}
          >
            {actionLabel}
          </span>

          {/*
            시간 문구는 '방금' → '32분 전' 처럼 길이가 변한다. 폭을 고정해 두지 않으면
            같은 줄의 블록 칩이 다시 접혀 줄 전체가 흔들린다.
          */}
          <span
            title={time?.full}
            className="ml-auto w-14 shrink-0 text-right text-[10px] text-[#9AA1B4]"
          >
            {time?.relative ?? ''}
          </span>
        </div>

        <div className="mt-1 rounded-md bg-[#F7F8FB] px-2.5 py-1.5 text-[11px] leading-relaxed text-[#4A5164]">
          <span className="font-medium text-[#1C1F2A]">‘{targetName}’</span>{' '}
          {log.action === 'MODIFY' && log.fieldName ? (
            <>
              {targetKind}의 {fieldLabel(log.fieldName)} 수정
            </>
          ) : (
            <>
              {targetKind} {actionLabel}
            </>
          )}
          <FieldChange log={log} />
        </div>
      </div>
    </li>
  );
}

export default memo(ActivityLogItem);

/**
 * 변경 내용. 필드에 따라 두 가지로 갈린다.
 *
 * - `title` · `content` · `caption` — 길어질 수 있어 펼쳐서 전문을 본다
 * - 그 외 — 값 사전으로 짧게 바꿔 한 줄에 인라인 표시
 */
function FieldChange({ log }: { log: ActivityLog }) {
  if (log.action !== 'MODIFY' || !log.fieldName) return null;

  const before = formatFieldValue(log.fieldName, log.beforeValue);
  const after = formatFieldValue(log.fieldName, log.afterValue);
  if (!before && !after) return null;

  if (fieldDisplay(log.fieldName) === 'expand') {
    return (
      <details className="group mt-1">
        <summary className="flex w-fit cursor-pointer list-none items-center gap-1 text-[10px] font-medium text-[#3B5BDB] hover:underline">
          <svg
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2.5"
            strokeLinecap="round"
            strokeLinejoin="round"
            aria-hidden
            className="size-3 transition-transform group-open:rotate-90"
          >
            <path d="m9 6 6 6-6 6" />
          </svg>
          변경 내용 보기
        </summary>
        <div className="mt-1.5 flex flex-col gap-1.5">
          <FullValue label="변경 전" value={before} tone="before" />
          <FullValue label="변경 후" value={after} tone="after" />
        </div>
      </details>
    );
  }

  return (
    <span className="ml-1 inline-flex flex-wrap items-center gap-1 align-middle">
      <InlineValue value={before} tone="before" />
      <span aria-hidden className="text-[#9AA1B4]">
        →
      </span>
      <span className="sr-only">에서</span>
      <InlineValue value={after} tone="after" />
      <span className="sr-only">(으)로</span>
    </span>
  );
}

/** 값이 비어 있으면 '없음' 으로 채운다 — 빈칸은 무엇이 바뀌었는지 알 수 없다 */
function InlineValue({
  value,
  tone,
}: {
  value: string;
  tone: 'before' | 'after';
}) {
  return (
    <span
      className={`rounded border px-1.5 py-0.5 text-[10px] ${
        tone === 'before'
          ? 'border-[#1C1F2A]/9 bg-white text-[#9AA1B4] line-through'
          : 'border-[#8EC5FF] bg-[#DBEAFE] font-medium text-[#1447E6]'
      }`}
    >
      {value || '없음'}
    </span>
  );
}

/** 전문 표시 — 줄바꿈을 살리고, 너무 길면 상자 안에서만 스크롤한다 */
function FullValue({
  label,
  value,
  tone,
}: {
  label: string;
  value: string;
  tone: 'before' | 'after';
}) {
  return (
    <div>
      <p className="mb-0.5 text-[10px] font-medium text-[#6C7389]">{label}</p>
      <pre
        className={`max-h-40 overflow-auto rounded border px-2 py-1.5 text-[10px] leading-relaxed whitespace-pre-wrap ${
          tone === 'before'
            ? 'border-[#1C1F2A]/9 bg-white text-[#9AA1B4]'
            : 'border-[#8EC5FF] bg-[#EFF6FF] text-[#1C1F2A]'
        }`}
      >
        {value || '없음'}
      </pre>
    </div>
  );
}

/** 동작 아이콘 — 추가(+) · 수정(연필) · 삭제(휴지통) */
function ActionIcon({ action }: { action: ActivityLog['action'] }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
      className="size-3.5"
    >
      {action === 'CREATE' && <path d="M12 5v14M5 12h14" />}
      {action === 'MODIFY' && (
        <>
          <path d="M4 20h4l10-10a2.8 2.8 0 0 0-4-4L4 16z" />
          <path d="m13.5 6.5 4 4" />
        </>
      )}
      {action === 'DELETE' && (
        <>
          <path d="M4 7h16" />
          <path d="M9 7V5h6v2" />
          <path d="M6 7v12a2 2 0 0 0 2 2h8a2 2 0 0 0 2-2V7" />
        </>
      )}
    </svg>
  );
}
