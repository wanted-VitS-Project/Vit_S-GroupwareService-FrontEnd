import type { IssueProgress } from '@/features/issue/types';
import { todoIssueCount } from '@/features/issue/types';

/**
 * 진행 중(노랑) · 완료(파랑) · 진행 전(회색) 이슈 비율을 한 줄로.
 *
 * ⚠️ 색은 `ProjectSidebar` 의 스텝 진척 바와 **같은 토큰**(`--color-step-*`)을 쓴다 —
 *    사이드바에서 보던 스텝이 이 화면에서 다른 색이면 같은 값으로 읽히지 않는다.
 */
export default function IssueProgressBar({
  progress,
  className = 'h-1.5',
}: {
  progress: IssueProgress;
  className?: string;
}) {
  const segments = [
    {
      key: 'inProgress',
      count: progress.inProgressIssueCount,
      className: 'bg-step-in-progress',
    },
    {
      key: 'done',
      count: progress.doneIssueCount,
      className: 'bg-step-done',
    },
    {
      key: 'notStarted',
      count: todoIssueCount(progress),
      className: 'bg-step-not-started',
    },
  ];

  // 이슈가 하나도 없으면 빈 바로 둔다 — 0% 로 그리면 '다 못 끝냈다' 로 읽힌다
  if (progress.totalIssueCount === 0) {
    return <div className={`${className} rounded-pill bg-btn-gray-bg-hover`} />;
  }

  return (
    <div className={`${className} flex overflow-hidden rounded-pill`}>
      {/*
        0인 구간도 지우지 않고 폭 0으로 둔다 — DOM 에서 빼면 값이 바뀔 때
        막대가 끊겼다 나타나 깜빡인다. 비율만 부드럽게 전환한다. (사이드바와 같은 규칙)
      */}
      {segments.map((segment) => (
        <span
          key={segment.key}
          className={`transition-[flex-grow] duration-300 ${segment.className}`}
          style={{ flexGrow: segment.count }}
        />
      ))}
    </div>
  );
}

/** 진행 중 · 완료 · 진행 전 개수를 한 줄로. 0인 항목도 자리를 지킨다 */
export function IssueProgressCounts({ progress }: { progress: IssueProgress }) {
  return (
    <span className="flex items-center gap-2.5 text-caption">
      <CountItem
        dotClass="bg-step-in-progress"
        textClass="text-yellow-text"
        label="진행 중"
        count={progress.inProgressIssueCount}
      />
      <CountItem
        dotClass="bg-step-done"
        textClass="text-text-primary-blue"
        label="완료"
        count={progress.doneIssueCount}
      />
      <CountItem
        dotClass="bg-step-not-started"
        textClass="text-text-secondary"
        label="시작 전"
        count={todoIssueCount(progress)}
      />
    </span>
  );
}

function CountItem({
  dotClass,
  textClass,
  label,
  count,
}: {
  dotClass: string;
  textClass: string;
  label: string;
  count: number;
}) {
  return (
    <span className="flex items-center gap-1">
      <span
        aria-hidden
        className={`size-2 shrink-0 rounded-pill ${dotClass}`}
      />
      <span className={textClass}>
        {label} {count}
      </span>
    </span>
  );
}
