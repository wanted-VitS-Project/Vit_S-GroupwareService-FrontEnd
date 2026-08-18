'use client';

// CSR - 대시보드 일정·이슈: 한 카드에 캘린더와 고른 날짜의 이슈를 나란히 둔다.
// GET /issues/calendar 에 기간 파라미터가 없어 처음 한 번만 받아 두고 달 이동은 클라이언트에서 거른다.
import Link from 'next/link';
import { useEffect, useMemo, useState, useSyncExternalStore } from 'react';

import { getIssueCalendar } from '@/features/issue/api';
import type { CalendarIssue } from '@/features/issue/types';
import { PROJECT_ROUTES } from '@/features/project/routes';
import { useModal } from '@/lib/useModal';
import LoadingSpinner from '@/components/Spinner';

// 응답에 색이 없어 화면이 projectId 기준으로 매긴다. 모자라면 앞에서부터 다시 쓴다.
const PROJECT_COLORS = [
  '#3F89F0',
  '#CA0005',
  '#312E81',
  '#E17100',
  '#16A34A',
  '#7C3AED',
] as const;

const WEEKDAYS = ['일', '월', '화', '수', '목', '금', '토'] as const;

// 한 날짜에 세우는 점의 수. 넘치면 마지막을 + 로 접는다.
const DOT_LIMIT = 3;

// 판을 언제나 6주(7 × 6)로 고정한다 — 실제 주 수만큼만 그리면 달을 넘길 때 판 높이가
// 한 줄씩 오르내려 카드와 아래 범례가 통째로 흔들린다. 남는 줄은 빈 칸으로 채운다.
const CALENDAR_CELLS = 42;

const MONTH_LABELS = Array.from({ length: 12 }, (_, index) => `${index + 1}월`);

// 로컬 날짜를 yyyy-MM-dd 로. toISOString() 은 UTC 라 날짜가 하루 밀린다.
function toDateKey(date: Date) {
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${date.getFullYear()}-${month}-${day}`;
}

// '2026-08-01' → '2026년 8월 1일 토요일' (형식이 어긋나면 빈 문자열)
function formatFullDate(dateKey: string) {
  const matched = /^(\d{4})-(\d{2})-(\d{2})$/.exec(dateKey);
  if (!matched) return '';

  const [, year, month, day] = matched;
  const weekday =
    WEEKDAYS[new Date(Number(year), Number(month) - 1, Number(day)).getDay()];

  return `${year}년 ${Number(month)}월 ${Number(day)}일 ${weekday}요일`;
}

export default function DashboardSchedule() {
  const [issues, setIssues] = useState<CalendarIssue[] | null>(null);
  const [reloadCount, setReloadCount] = useState(0);
  const [failedAt, setFailedAt] = useState<number | null>(null);
  const hasFailed = failedAt === reloadCount;

  // 서버(대개 UTC)와 브라우저의 '오늘' 이 다르면 서버 HTML 과 어긋나 하이드레이션이 깨진다.
  // 서버 스냅샷을 false 로 두어 첫 렌더는 자리만 잡고, 하이드레이션 후 브라우저 날짜로 다시 그린다.
  const isHydrated = useSyncExternalStore(
    subscribeNothing,
    () => true,
    () => false,
  );

  // 기준 시각은 한 번만 잡는다 — 렌더마다 새로 만들면 자정을 넘길 때 값이 흔들린다.
  const [now] = useState(() => new Date());
  const today = toDateKey(now);

  const [month, setMonth] = useState(() => ({
    year: now.getFullYear(),
    month: now.getMonth(),
  }));
  const [selected, setSelected] = useState(() => toDateKey(now));

  // 달과 고른 날짜가 둘 다 오늘이어야 한다 — 달만 돌아왔고 고른 날짜가 다르면 아직 갈 곳이 남아 있다.
  const isOnToday =
    month.year === now.getFullYear() &&
    month.month === now.getMonth() &&
    selected === today;

  const picker = useModal();

  // 달과 고른 날짜를 한 번에 오늘로 되돌린다.
  function goToToday() {
    setMonth({ year: now.getFullYear(), month: now.getMonth() });
    setSelected(today);
  }

  useEffect(() => {
    const controller = new AbortController();
    const { signal } = controller;

    getIssueCalendar(signal)
      .then(setIssues)
      .catch(() => {
        // 취소는 실패가 아니다
        if (!signal.aborted) setFailedAt(reloadCount);
      });

    return () => controller.abort();
  }, [reloadCount]);

  // 목록 등장 순서로 색을 고정해 달을 넘겨도 같은 프로젝트가 같은 색을 유지하게 한다.
  const colorOf = useMemo(() => {
    const ids = [...new Set((issues ?? []).map((issue) => issue.projectId))];
    return (projectId: number) => {
      const index = ids.indexOf(projectId);
      return index < 0
        ? PROJECT_COLORS[0]
        : PROJECT_COLORS[index % PROJECT_COLORS.length];
    };
  }, [issues]);

  // 날짜별로 미리 묶어 둔다 — 칸마다 전체 목록을 훑으면 42번 훑는다.
  const byDate = useMemo(() => {
    const map = new Map<string, CalendarIssue[]>();

    for (const issue of issues ?? []) {
      const list = map.get(issue.dueDate);
      if (list) list.push(issue);
      else map.set(issue.dueDate, [issue]);
    }

    return map;
  }, [issues]);

  // 이 달에 이슈가 걸린 프로젝트만 범례로 세운다.
  const legend = useMemo(() => {
    const prefix = `${month.year}-${String(month.month + 1).padStart(2, '0')}`;
    const seen = new Map<number, string>();

    for (const issue of issues ?? []) {
      if (issue.dueDate.startsWith(prefix)) {
        seen.set(issue.projectId, issue.projectName);
      }
    }

    return [...seen].map(([projectId, name]) => ({ projectId, name }));
  }, [issues, month]);

  const selectedIssues = byDate.get(selected) ?? [];

  // 하이드레이션 전에는 자리만 잡는다 — 날짜에 기대는 것은 하나도 그리지 않는다.
  if (!isHydrated) {
    return (
      <section
        aria-label="일정 · 이슈"
        className="flex h-full flex-col rounded-base border border-border-default bg-bg-card p-6"
      >
        <LoadingSpinner label="일정을 불러오는 중" className="flex-1 py-16" />
      </section>
    );
  }

  return (
    /* 날짜를 고르는 곳과 그 결과라 한 상자 안에서 나눈다 — 테두리로 갈라 두면 상관없는 상자로 읽힌다 */
    <section
      aria-label="일정 · 이슈"
      /* 캘린더 칸을 조금 더 넓게 — 7칸을 가로로 나눠야 해서 반씩 주면 날짜 동그라미가 붙는다 */
      className="grid h-full min-h-0 grid-cols-1 overflow-hidden rounded-base border border-border-default bg-bg-card xl:grid-cols-[minmax(0,1.15fr)_minmax(0,1fr)] xl:divide-x xl:divide-border-default"
    >
      {/* ───────── 왼쪽: 캘린더 ───────── */}
      <div className="flex min-h-0 flex-col p-5 2xl:p-6">
        <h2 className="text-logo leading-8 font-semibold text-gray-text-soft">
          일정
        </h2>

        {/* 3칸 그리드 — 왼쪽 빈 칸이 오른쪽 오늘 버튼과 폭을 나눠 달 이동 묶음이 실제 가운데에 선다 */}
        <div className="mt-4 grid grid-cols-[1fr_auto_1fr] items-center">
          <span aria-hidden />

          <div className="flex items-center justify-center gap-3">
            <MonthButton
              label="이전 달"
              onClick={() => setMonth(shiftMonth(month, -1))}
            >
              <ChevronIcon className="rotate-180" />
            </MonthButton>
            {/* 제목을 눌러 년·월을 한 번에 고른다. 패널이 이 자리를 기준으로 떠서 relative 가 필요하다 */}
            <span
              className="relative"
              // 패널 밖으로 초점이 나가면 닫는다 (다른 곳을 누르면 초점이 body 로 빠진다)
              onBlur={(event) => {
                if (!event.currentTarget.contains(event.relatedTarget)) {
                  picker.close();
                }
              }}
              onKeyDown={(event) => {
                if (event.key === 'Escape') picker.close();
              }}
            >
              {/* 폭을 고정한다 — 2026년 8월과 2026년 12월의 폭이 달라 화살표가 흔들린다 */}
              <button
                type="button"
                aria-haspopup="dialog"
                aria-expanded={picker.isOpen}
                onClick={() => (picker.isOpen ? picker.close() : picker.open())}
                className="flex w-32 cursor-pointer items-center justify-center gap-1 rounded-lg py-0.5 text-[19px] font-semibold text-gray-text-soft hover:bg-bg-hover"
              >
                {month.year}년 {month.month + 1}월
                {/* 열리면 위를 가리킨다 — 아래에 뜬 패널을 다시 접는다는 뜻 */}
                <ChevronIcon
                  className={picker.isOpen ? '-rotate-90' : 'rotate-90'}
                />
              </button>

              {picker.isOpen && (
                <MonthPicker
                  year={month.year}
                  month={month.month}
                  onPick={(picked) => {
                    setMonth(picked);
                    picker.close();
                  }}
                />
              )}
            </span>
            <MonthButton
              label="다음 달"
              onClick={() => setMonth(shiftMonth(month, 1))}
            >
              <ChevronIcon />
            </MonthButton>
          </div>

          {/* 화살표를 세어 돌아가지 않게 한 번에 되돌린다. 이미 오늘이면 누를 것이 없어 잠근다 */}
          <button
            type="button"
            onClick={goToToday}
            disabled={isOnToday}
            title={isOnToday ? '이미 오늘을 보고 있습니다' : '오늘로 이동'}
            className="cursor-pointer justify-self-end rounded-lg border border-border-default px-2.5 py-1.5 text-detail font-semibold text-text-primary hover:bg-bg-hover disabled:cursor-not-allowed disabled:text-text-muted disabled:hover:bg-transparent"
          >
            오늘
          </button>
        </div>

        {hasFailed ? (
          <p
            role="alert"
            className="flex flex-1 flex-col items-center justify-center gap-3 py-16 text-detail text-text-secondary"
          >
            일정을 불러오지 못했습니다.
            <button
              type="button"
              onClick={() => setReloadCount((count) => count + 1)}
              className="cursor-pointer rounded-lg border border-border-default px-2.5 py-1 text-label font-semibold text-text-primary hover:bg-bg-hover"
            >
              다시 시도
            </button>
          </p>
        ) : (
          <>
            <div className="mt-4 grid grid-cols-7">
              {WEEKDAYS.map((weekday) => (
                <p
                  key={weekday}
                  className="py-1 text-center text-detail text-text-secondary"
                >
                  {weekday}
                </p>
              ))}
            </div>

            <div className="mt-1 grid grid-cols-7 gap-y-1">
              {monthCells(month).map((cell) => (
                <DayCell
                  key={cell.key}
                  dateKey={cell.dateKey}
                  day={cell.day}
                  isToday={cell.dateKey === today}
                  isSelected={cell.dateKey === selected}
                  issues={cell.dateKey ? (byDate.get(cell.dateKey) ?? []) : []}
                  colorOf={colorOf}
                  onSelect={setSelected}
                />
              ))}
            </div>

            {/* 범례가 없으면 자리도 비운다 — 빈 상자만 남으면 뭔가 빠진 것처럼 보인다 */}
            {legend.length > 0 && (
              /* 2열로 세운다 — 한 줄로 흘리면 프로젝트가 늘 때마다 달력이 위로 밀린다 */
              <ul className="mt-auto grid grid-cols-2 gap-x-6 gap-y-3 pt-6">
                {legend.map((item) => (
                  <li
                    key={item.projectId}
                    className="flex min-w-0 items-center gap-2"
                  >
                    <span
                      aria-hidden
                      style={{ backgroundColor: colorOf(item.projectId) }}
                      className="size-2 shrink-0 rounded-pill"
                    />
                    <span
                      style={{ color: colorOf(item.projectId) }}
                      className="truncate text-detail font-semibold"
                    >
                      {item.name}
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </>
        )}
      </div>

      {/* ───────── 오른쪽: 고른 날짜의 이슈 ───────── */}
      <div className="flex min-h-0 flex-col border-t border-border-default p-5 xl:border-t-0 2xl:p-6">
        <h2 className="text-logo leading-8 font-semibold text-gray-text-soft">
          이슈
        </h2>

        <p className="mt-4 border-b border-border-default pb-3 text-[15px] font-semibold text-text-primary-blue empty:hidden">
          {formatFullDate(selected)}
        </p>

        {hasFailed ? (
          /* 실패를 빈 목록으로 보이지 않는다 — 그냥 두면 "이 날짜엔 이슈가 없다" 로 읽힌다 */
          <p
            role="alert"
            className="flex flex-1 items-center justify-center py-16 text-detail text-text-secondary"
          >
            이슈를 불러오지 못했습니다.
          </p>
        ) : issues === null ? (
          <LoadingSpinner label="이슈를 불러오는 중" className="flex-1 py-16" />
        ) : selectedIssues.length === 0 ? (
          <p className="flex flex-1 items-center justify-center py-16 text-detail text-text-secondary">
            이 날짜에 마감인 담당 이슈가 없습니다.
          </p>
        ) : (
          /* 하루에 이슈가 많으면 카드 안에서만 굴린다 — 옆 두 상자와 높이가 어긋나지 않게 */
          <ul className="mt-4 flex min-h-0 flex-1 flex-col gap-4 overflow-y-auto">
            {groupByProject(selectedIssues).map((group) => (
              <li
                key={group.projectId}
                className="shrink-0 rounded-base bg-bg-surface p-5"
              >
                <div className="flex items-center justify-between gap-3">
                  <p className="flex min-w-0 items-center gap-2">
                    <span
                      aria-hidden
                      style={{ backgroundColor: colorOf(group.projectId) }}
                      className="size-2 shrink-0 rounded-pill"
                    />
                    <span
                      style={{ color: colorOf(group.projectId) }}
                      className="truncate text-[15px] font-semibold"
                    >
                      {group.projectName}
                    </span>
                  </p>
                  <span className="shrink-0 text-detail text-text-secondary">
                    이슈 {group.issues.length}건
                  </span>
                </div>

                <ul className="mt-3 flex flex-col gap-2">
                  {group.issues.map((issue) => (
                    <li key={issue.issueId}>
                      {/* 이슈는 단독 화면이 없다 — 보드로 가며 `issueId` 를 실어 모달을 연다 */}
                      <Link
                        href={PROJECT_ROUTES.stepIssues(
                          issue.projectId,
                          issue.stepId,
                          issue.issueId,
                        )}
                        className="block truncate rounded-lg px-1 py-0.5 text-detail text-text-secondary hover:bg-bg-hover hover:text-text-primary"
                        title={`${issue.stepName} · ${issue.title}`}
                      >
                        {issue.stepName} · {issue.title}
                      </Link>
                    </li>
                  ))}
                </ul>
              </li>
            ))}
          </ul>
        )}
      </div>
    </section>
  );
}

// 구독할 외부 상태가 없다 — 서버/클라이언트 스냅샷 차이만 쓰는 자리라 빈 해지 함수만 준다.
function subscribeNothing() {
  return () => {};
}

// 고른 날짜의 이슈를 프로젝트별로 묶는다.
// 응답 순서를 유지해 colorOf 가 매긴 색 순서와 어긋나지 않게 한다.
function groupByProject(issues: CalendarIssue[]) {
  const groups = new Map<
    number,
    { projectId: number; projectName: string; issues: CalendarIssue[] }
  >();

  for (const issue of issues) {
    const group = groups.get(issue.projectId);
    if (group) group.issues.push(issue);
    else {
      groups.set(issue.projectId, {
        projectId: issue.projectId,
        projectName: issue.projectName,
        issues: [issue],
      });
    }
  }

  return [...groups.values()];
}

// 보고 있는 달을 step 만큼 옮긴다. 12월 다음은 다음 해 1월 — Date 가 알아서 넘겨 준다.
function shiftMonth(current: { year: number; month: number }, step: number) {
  const moved = new Date(current.year, current.month + step, 1);
  return { year: moved.getFullYear(), month: moved.getMonth() };
}

interface Cell {
  key: string;
  /** 이 달 밖의 칸은 null — 앞뒤 달 날짜를 흐리게 채우면 잘못 누른다 */
  dateKey: string | null;
  day: number | null;
}

// 달력 한 판(42칸)을 만든다 — 1일 앞의 빈 칸 + 이 달 날짜 + 남는 빈 칸.
function monthCells({ year, month }: { year: number; month: number }): Cell[] {
  const firstWeekday = new Date(year, month, 1).getDay();
  const lastDay = new Date(year, month + 1, 0).getDate();

  const blanks: Cell[] = Array.from({ length: firstWeekday }, (_, index) => ({
    key: `blank-${index}`,
    dateKey: null,
    day: null,
  }));

  const days: Cell[] = Array.from({ length: lastDay }, (_, index) => {
    const day = index + 1;
    const dateKey = toDateKey(new Date(year, month, day));
    return { key: dateKey, dateKey, day };
  });

  // 남는 줄까지 빈 칸으로 채워 판 높이를 고정한다 (달마다 5주·6주로 갈리지 않게).
  const filled = [...blanks, ...days];
  const trailing: Cell[] = Array.from(
    { length: CALENDAR_CELLS - filled.length },
    (_, index) => ({ key: `trail-${index}`, dateKey: null, day: null }),
  );

  return [...filled, ...trailing];
}

function DayCell({
  dateKey,
  day,
  isToday,
  isSelected,
  issues,
  colorOf,
  onSelect,
}: {
  dateKey: string | null;
  day: number | null;
  isToday: boolean;
  isSelected: boolean;
  issues: CalendarIssue[];
  colorOf: (projectId: number) => string;
  onSelect: (dateKey: string) => void;
}) {
  if (dateKey === null || day === null) {
    return <span aria-hidden className="h-13" />;
  }

  // 점은 '어느 프로젝트인지' 를 알리므로 같은 프로젝트가 여러 건이어도 하나만 찍는다.
  const projectIds = [...new Set(issues.map((issue) => issue.projectId))];
  const dots = projectIds.slice(0, DOT_LIMIT);

  return (
    <button
      type="button"
      onClick={() => onSelect(dateKey)}
      aria-pressed={isSelected}
      aria-label={`${formatFullDate(dateKey)}${
        issues.length > 0 ? ` — 이슈 ${issues.length}건` : ''
      }`}
      className="group flex h-13 cursor-pointer flex-col items-center justify-center"
    >
      {/* 날짜와 마우스 반응 모두 동그라미에 준다 — 네모 배경은 옆 칸과 붙어 보인다 */}
      <span
        className={`flex size-9 items-center justify-center rounded-pill border text-[15px] group-hover:bg-bg-hover ${
          isSelected
            ? 'border-blue-border-soft bg-blue-bg-soft font-semibold text-text-primary-blue'
            : isToday
              ? 'border-transparent bg-bg-surface font-semibold text-text-primary'
              : 'border-transparent text-text-primary hover:bg-bg-hover'
        }`}
      >
        {day}
      </span>
      {/* 점 자리는 이슈가 없어도 비워 둔다 — 있고 없고에 따라 숫자 위치가 흔들린다 */}
      <span aria-hidden className="mt-1 flex h-1.5 items-center gap-1">
        {dots.map((projectId) => (
          <span
            key={projectId}
            style={{ backgroundColor: colorOf(projectId) }}
            className="size-1.5 rounded-pill"
          />
        ))}
        {projectIds.length > DOT_LIMIT && (
          <span className="text-caption leading-none text-text-secondary">
            +
          </span>
        )}
      </span>
    </button>
  );
}

// 제목을 눌렀을 때 뜨는 년·월 선택 패널.
// 년도는 패널 안에서만(draftYear) 움직이고 달을 눌러야 확정된다 — 년도를 넘길 때마다
// 뒤 달력이 따라 바뀌면 무엇을 고르는 중인지 알 수 없다.
function MonthPicker({
  year,
  month,
  onPick,
}: {
  /** 지금 보고 있는 달 — 초안 년도의 출발점이자 선택 표시 기준 */
  year: number;
  month: number;
  onPick: (picked: { year: number; month: number }) => void;
}) {
  const [draftYear, setDraftYear] = useState(year);

  return (
    <div
      role="dialog"
      aria-label="년 · 월 선택"
      /* z-20 은 아래 달력 칸(버튼) 위에 서기 위한 것. 제목 폭(w-32)보다 넓어 -translate-x-1/2 로 중앙에 맞춘다 */
      className="absolute top-full left-1/2 z-20 mt-2 w-60 -translate-x-1/2 rounded-base border border-border-default bg-bg-card p-3 shadow-lg"
    >
      <div className="flex items-center justify-between gap-2">
        <MonthButton
          label="이전 해"
          onClick={() => setDraftYear((current) => current - 1)}
        >
          <ChevronIcon className="rotate-180" />
        </MonthButton>
        <p className="text-[15px] font-semibold text-text-primary">
          {draftYear}년
        </p>
        <MonthButton
          label="다음 해"
          onClick={() => setDraftYear((current) => current + 1)}
        >
          <ChevronIcon />
        </MonthButton>
      </div>

      <div className="mt-3 grid grid-cols-4 gap-1">
        {MONTH_LABELS.map((label, index) => {
          const isPicked = draftYear === year && index === month;

          return (
            <button
              key={label}
              type="button"
              aria-pressed={isPicked}
              onClick={() => onPick({ year: draftYear, month: index })}
              className={`cursor-pointer rounded-lg py-1.5 text-detail ${
                isPicked
                  ? 'bg-blue-bg-soft font-semibold text-text-primary-blue'
                  : 'text-text-primary hover:bg-bg-hover'
              }`}
            >
              {label}
            </button>
          );
        })}
      </div>
    </div>
  );
}

function MonthButton({
  label,
  onClick,
  children,
}: {
  label: string;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={label}
      className="flex size-8 cursor-pointer items-center justify-center rounded-lg border border-border-default text-text-muted hover:bg-bg-hover"
    >
      {children}
    </button>
  );
}

function ChevronIcon({ className = '' }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={2}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
      className={`size-4 ${className}`}
    >
      <path d="m9 6 6 6-6 6" />
    </svg>
  );
}
