'use client';

import Link from 'next/link';
import { useEffect, useId, useState } from 'react';

import MemberAvatar from '@/components/MemberAvatar';
import { PROJECT_STATUS_LABELS } from '@/constants/status';
import { formatDateRange } from '@/lib/format';

import { getProject, getProjectStages, getProjectSteps } from './api';
import { PROJECT_STATUS_STYLE } from './projectStatus';
import { PROJECT_ROUTES } from './routes';
import type {
  ProjectDetail,
  ProjectListItem,
  ProjectStage,
  ProjectStep,
} from './types';

/** 카드에 한 줄로 세우는 아바타 수. 넘치면 마지막 자리를 `+N` 으로 접는다 */
const AVATAR_LIMIT = 4;

/**
 * 머리글에 세우는 카테고리 태그 수. 나머지는 `+N` 으로 접는다.
 * 태그 칸 너비가 고정(`w-32`)이라 2개를 세우면 이름이 거의 다 잘려 1개만 둔다.
 */
const CATEGORY_TAG_LIMIT = 1;

/**
 * 목록 카드 한 장. 머리글을 누르면 접었다 펼칠 수 있다.
 *
 * 펼친 영역(설명 · 내 이슈 · 내 결재 · 스테이지별 스텝 타임라인)은
 * **펼칠 때 처음 조회한다** — 목록 10건이 한꺼번에 부르면 첫 화면에서 31콜이 된다.
 * 한 번 받은 뒤에는 다시 접었다 펴도 재조회하지 않는다.
 */
export default function ProjectCard({ row }: { row: ProjectListItem }) {
  const panelId = useId();
  const [isOpen, setIsOpen] = useState(false);
  /**
   * 한 번이라도 펼쳤으면 패널을 **언마운트하지 않는다** —
   * 접을 때 지워버리면 받아둔 상세 · 스테이지 · 스텝이 함께 사라져
   * 다시 펼칠 때마다 3콜이 새로 나간다.
   */
  const [hasOpened, setHasOpened] = useState(false);

  /** 백엔드가 새 상태값을 보내도 화면이 죽지 않게 기본값을 둔다 (응답 런타임 검증이 없다) */
  const style =
    PROJECT_STATUS_STYLE[row.status] ?? PROJECT_STATUS_STYLE.NOT_STARTED;
  const shown = row.members.slice(0, AVATAR_LIMIT);
  const restCount = row.members.length - shown.length;
  const categoryTags = row.businessCategories.slice(0, CATEGORY_TAG_LIMIT);
  const restCategoryCount = row.businessCategories.length - categoryTags.length;

  return (
    <li
      className={`overflow-hidden rounded-base border bg-bg-card ${
        isOpen ? 'border-border-default' : 'border-border-default'
      }`}
    >
      {/**
       * 머리글은 **두 영역**이다 —
       * 넓은 왼쪽은 프로젝트로 들어가는 링크, 오른쪽 화살표 버튼은 펼침 토글.
       * 링크 안에 버튼을 넣을 수 없어 형제로 나란히 둔다.
       */}
      <div
        className={`flex items-center gap-2 pr-3 ${isOpen ? 'bg-bg-hover' : ''}`}
      >
        <Link
          href={PROJECT_ROUTES.detail(row.projectId)}
          className="flex min-w-0 flex-1 items-center gap-4 px-5 py-4 hover:bg-black/[0.03]"
        >
          {/*
            배지 · 태그 칸은 **너비를 고정한다** — 상태 라벨(`진행 전` vs `완료`)이나
            카테고리 이름 길이에 따라 폭이 달라지면 카드마다 과업명 시작 위치가 어긋난다
          */}
          <span
            className={`flex w-16 shrink-0 justify-center rounded-pill px-2 py-0.5 text-label font-medium ${style.badge}`}
          >
            {PROJECT_STATUS_LABELS[row.status]}
          </span>

          {/**
           * 카테고리는 이름에 괄호로 붙이지 않고 별도 태그로 세운다 (시안 `Tag`).
           * ⚠️ 개수 상한이 없으면 머리글이 가로로 넘쳐 본문에 가로 스크롤바가 생긴다 —
           *    `CATEGORY_TAG_LIMIT` 까지만 세우고 나머지는 `+N` 으로 접는다.
           */}
          <span
            title={row.businessCategories.map((item) => item.name).join(' · ')}
            className="flex w-32 shrink-0 items-center gap-1.5"
          >
            {categoryTags.map((category) => (
              <span
                key={category.categoryId}
                className="min-w-0 truncate rounded-[9px] border-[1.5px] border-border-default bg-bg-surface px-3 py-0.5 text-label font-medium text-gray-text-soft"
              >
                {category.name}
              </span>
            ))}
            {restCategoryCount > 0 && (
              <span className="shrink-0 rounded-[9px] border-[1.5px] border-border-default bg-bg-surface px-2 py-0.5 text-label font-medium text-text-secondary">
                +{restCategoryCount}
              </span>
            )}
          </span>

          <h3 className="min-w-0 flex-1 truncate text-[15px] font-semibold text-gray-text-soft">
            {row.name}
          </h3>

          {/* 발주처는 이름이 길 수 있어 줄어들 수 있게 둔다 — 넘치면 말줄임 */}
          <span className="w-32 min-w-0 shrink truncate text-[13px] text-gray-text-soft">
            {row.clientName}
          </span>

          <span className="w-40 shrink-0 text-[13px] whitespace-nowrap text-gray-text-soft">
            {formatDateRange(row.startedOn, row.endedOn)}
          </span>

          {/*
            `relative` 가 필요하다 — 안쪽 `sr-only` 는 `position: absolute` 인데
            좌표 기준(컨테이닝 블록)이 없으면 문서 전체를 기준으로 잡혀 문서 높이를 늘린다
          */}
          <span className="relative flex shrink-0 items-center -space-x-1.5">
            {shown.map((member) => (
              <MemberAvatar
                key={member.userId}
                userId={member.userId}
                name={member.name}
                decorative
              />
            ))}
            {restCount > 0 && (
              <span className="flex size-6 items-center justify-center rounded-pill border border-white bg-bg-hover-secondary text-caption font-semibold text-text-secondary">
                +{restCount}
              </span>
            )}
            <span className="sr-only">참여자 {row.members.length}명</span>
          </span>

          <span className="flex w-32 shrink-0 items-center gap-3">
            {/* 스텝이 0개면 진척률이 응답에 없다 — 0% 로 단정하지 않고 빈 바로 둔다 */}
            <span className="h-2 flex-1 overflow-hidden rounded-pill bg-bg-hover-secondary">
              {/* 색은 상태와 무관하게 하나로 둔다 — 채운 길이만으로 진행도를 읽는다 */}
              <span
                style={{ width: `${row.progressRate ?? 0}%` }}
                className="block h-full rounded-l-pill bg-btn-primary"
              />
            </span>
            <span className="w-9 text-right text-[13px] font-semibold text-gray-text-soft">
              {row.progressRate === undefined ? '–' : `${row.progressRate}%`}
            </span>
          </span>
        </Link>

        {/* 펼침 방향을 화살표로 알린다 — `aria-expanded` 만으로는 눈에 보이지 않는다 */}
        <button
          type="button"
          onClick={() => {
            setIsOpen((open) => !open);
            setHasOpened(true);
          }}
          aria-expanded={isOpen}
          aria-controls={panelId}
          aria-label={`${row.name} ${isOpen ? '접기' : '펼치기'}`}
          className="flex size-9 shrink-0 cursor-pointer items-center justify-center rounded-lg hover:bg-black/[0.05]"
        >
          <ChevronIcon isOpen={isOpen} />
        </button>
      </div>

      {/*
        펼치기 전에는 아예 그리지 않고, 한 번 펼친 뒤에는 **감추기만** 한다 —
        받아둔 데이터를 유지해 접었다 펼 때마다 재조회하지 않기 위함이다
      */}
      {hasOpened && (
        <div
          id={panelId}
          hidden={!isOpen}
          className="border-t border-border-default px-5 py-4"
        >
          <div className="flex flex-wrap items-center gap-5">
            {/**
             * ⚠️ 시안 라벨은 `결재 대기` 지만 이 값은 **기안자 관점**이다 —
             * 내가 올려서 아직 안 끝난 건이라 결재함 대기 건수와 다르다. 라벨을 바꿔 단다.
             */}
            <CountItem
              label="내 이슈"
              count={row.myIssueInProgressCount}
              className="text-[#EF4444]"
            />
            <span aria-hidden className="h-4 w-px bg-bg-hover-secondary" />
            <CountItem
              label="내 결재"
              count={row.myApprovalInProgressCount}
              className="text-yellow-border"
            />

            <Link
              href={PROJECT_ROUTES.detail(row.projectId)}
              className="ml-auto flex items-center gap-2 rounded-lg bg-btn-primary px-5 py-2 text-[13px] font-medium text-text-white hover:bg-btn-primary-hover"
            >
              프로젝트 전체 보기
              <ArrowIcon />
            </Link>
          </div>

          <ProjectPanel projectId={row.projectId} />
        </div>
      )}
    </li>
  );
}

function CountItem({
  label,
  count,
  className,
}: {
  label: string;
  count: number;
  className: string;
}) {
  return (
    <span className="flex items-center gap-2">
      <span className="text-[13px] text-text-secondary">{label}</span>
      {/* 0건은 색으로 강조하지 않는다 — 할 일이 없다는 뜻이다 */}
      <span
        className={`text-[13px] font-semibold ${count > 0 ? className : 'text-text-muted'}`}
      >
        {count}건
      </span>
    </span>
  );
}

type StageState = 'DONE' | 'IN_PROGRESS' | 'NOT_STARTED';

/** 스테이지 머리글 배지. 스텝 배지와 달리 미착수를 `진행전` 이라 부른다 (시안) */
const STAGE_BADGE: Record<StageState, { className: string; label: string }> = {
  DONE: { className: 'bg-green-bg text-green-text', label: '완료' },
  IN_PROGRESS: {
    className: 'bg-yellow-bg-soft text-yellow-text',
    label: '진행중',
  },
  NOT_STARTED: {
    className: 'bg-bg-hover-secondary text-gray-text',
    label: '진행전',
  },
};

const STEP_STYLE: Record<
  StageState,
  { node: string; label: string; line: string; sub: string }
> = {
  DONE: {
    node: 'border-step-done bg-green-bg',
    label: 'text-green-text',
    line: 'bg-step-done',
    sub: '완료',
  },
  IN_PROGRESS: {
    node: 'border-step-in-progress bg-yellow-bg-soft',
    label: 'text-yellow-text',
    line: 'bg-step-in-progress',
    sub: '진행중',
  },
  NOT_STARTED: {
    node: 'border-btn-gray-bg-hover bg-bg-surface',
    label: 'text-text-muted',
    line: 'bg-bg-hover-secondary',
    sub: '대기',
  },
};

/**
 * 스테이지 상태는 **스텝에서 파생한다** — 스테이지 API(7번)에 상태 필드가 없다.
 * 스텝이 하나도 없는 스테이지는 아직 시작하지 않은 것으로 본다.
 */
function stageStateOf(steps: ProjectStep[]): StageState {
  if (steps.length === 0) return 'NOT_STARTED';
  if (steps.every((step) => step.status === 'DONE')) return 'DONE';
  if (steps.some((step) => step.status !== 'NOT_STARTED')) return 'IN_PROGRESS';
  return 'NOT_STARTED';
}

interface PanelData {
  detail: ProjectDetail;
  stages: ProjectStage[];
  steps: ProjectStep[];
}

/** 펼친 영역 본문 — 프로젝트 설명 + 스테이지별 스텝 타임라인 */
function ProjectPanel({ projectId }: { projectId: number }) {
  const [data, setData] = useState<PanelData | null>(null);
  const [reloadCount, setReloadCount] = useState(0);
  /** 몇 번째 시도가 실패했는지 들고 있는다 — `다시 시도` 를 누르면 자동으로 실패가 풀린다 */
  const [failedAt, setFailedAt] = useState<number | null>(null);
  const hasFailed = failedAt === reloadCount;

  useEffect(() => {
    // 한 번 받아 두면 접었다 펴도 다시 부르지 않는다
    if (data) return;

    const controller = new AbortController();
    const { signal } = controller;

    Promise.all([
      // 설명(`description`)은 목록 응답에 없어 상세를 한 번 더 부른다
      getProject(projectId, signal),
      getProjectStages(projectId, signal),
      getProjectSteps(projectId, signal),
    ])
      .then(([detail, stages, steps]) => setData({ detail, stages, steps }))
      .catch(() => {
        // 취소는 실패가 아니다
        if (!signal.aborted) setFailedAt(reloadCount);
      });

    return () => controller.abort();
  }, [projectId, data, reloadCount]);

  if (hasFailed) {
    return (
      // 패널을 연 뒤 비동기로 바뀌는 상태라, 알리지 않으면 스크린리더가 실패를 못 읽는다
      <p
        role="alert"
        className="mt-5 flex items-center gap-3 text-[13px] text-text-secondary"
      >
        진행 상황을 불러오지 못했어요.
        <button
          type="button"
          onClick={() => setReloadCount((count) => count + 1)}
          className="cursor-pointer rounded-lg border border-border-default px-2.5 py-1 text-label font-semibold text-text-primary hover:bg-bg-hover"
        >
          다시 시도
        </button>
      </p>
    );
  }

  if (!data) {
    return (
      <p aria-live="polite" className="mt-5 text-[13px] text-text-muted">
        진행 상황을 불러오는 중…
      </p>
    );
  }

  /** 스테이지에 배정되지 않은 스텝(`stageId === null`)도 감추지 않고 마지막에 모아 둔다 */
  const unassigned = data.steps.filter((step) => step.stageId === null);

  return (
    <>
      {data.detail.description && (
        <p className="mt-4 text-[13px] whitespace-pre-line text-text-primary">
          {data.detail.description}
        </p>
      )}

      {data.stages.length === 0 && unassigned.length === 0 ? (
        <p className="mt-5 text-[13px] text-text-muted">
          등록된 스테이지가 없어요.
        </p>
      ) : (
        <section aria-label="스테이지별 진행 상황" className="mt-5">
          {/* 스테이지 하나가 한 줄을 다 쓴다 — 스텝이 가로로 넉넉히 펴진다 */}
          <ul className="flex flex-col gap-3">
            {data.stages.map((stage) => (
              <StageBox
                key={stage.stageId}
                name={stage.name}
                steps={data.steps.filter(
                  (step) => step.stageId === stage.stageId,
                )}
              />
            ))}
            {unassigned.length > 0 && (
              <StageBox name="스테이지 미지정" steps={unassigned} />
            )}
          </ul>
        </section>
      )}
    </>
  );
}

/** 스테이지 한 칸. 머리글을 눌러 안쪽 스텝 타임라인을 접을 수 있다 */
function StageBox({ name, steps }: { name: string; steps: ProjectStep[] }) {
  const bodyId = useId();
  // 카드를 펼치면 스테이지는 전부 닫힌 채로 시작한다 — 머리글만 훑고 필요한 것만 편다
  const [isOpen, setIsOpen] = useState(false);

  const badge = STAGE_BADGE[stageStateOf(steps)];
  const sorted = [...steps].sort((a, b) => a.sortOrder - b.sortOrder);

  return (
    <li className="overflow-hidden rounded-lg border border-border-default">
      <button
        type="button"
        onClick={() => setIsOpen((open) => !open)}
        aria-expanded={isOpen}
        aria-controls={bodyId}
        className="flex w-full cursor-pointer items-center gap-4 bg-bg-surface px-3 py-2 text-left hover:bg-bg-hover"
      >
        <span className="min-w-0 truncate text-[13px] font-medium text-gray-text-soft">
          {name}
        </span>
        <span
          className={`shrink-0 rounded-pill px-2.5 py-0.5 text-detail font-medium ${badge.className}`}
        >
          {badge.label}
        </span>
        <ChevronIcon isOpen={isOpen} className="ml-auto" />
      </button>

      {isOpen && (
        /**
         * 높이를 고정한다 — 스텝 수 · 이름 길이가 달라도 박스가 같은 높이라
         * 스테이지를 접었다 펼 때 아래 박스들이 들썩이지 않는다.
         *
         * ⚠️ `overflow-x-auto` 만 주면 **y 축이 `auto` 로 계산된다** (CSS Overflow 명세 —
         * 한쪽만 `visible` 이 아니면 `visible` 쪽이 `auto` 가 된다).
         * 그러면 높이를 고정한 이 박스가 자체 세로 스크롤을 갖게 돼 페이지 스크롤과 겹친다.
         * y 축을 명시적으로 잠가 가로로만 굴러가게 한다.
         */
        <div
          id={bodyId}
          /*
            스텝이 많으면 가로로 굴러가는데 안에 포커스 받을 요소가 하나도 없다 —
            `tabIndex` 가 없으면 키보드만 쓰는 사용자는 화면 밖 스텝을 볼 방법이 없다
          */
          tabIndex={0}
          role="group"
          aria-label={`${name} 스텝 진행 상황`}
          className="flex h-[124px] items-center overflow-x-auto overflow-y-hidden bg-bg-card px-5"
        >
          {sorted.length === 0 ? (
            <p className="text-label text-text-muted">등록된 스텝이 없어요.</p>
          ) : (
            <ol className="flex w-full items-start">
              {sorted.map((step, index) => {
                // 상태 배지와 같은 이유로 기본값을 둔다 — 모르는 상태에 화면이 죽지 않게
                const style = STEP_STYLE[step.status] ?? STEP_STYLE.NOT_STARTED;
                const isLast = index === sorted.length - 1;

                return (
                  <li
                    key={step.stepId}
                    className={`flex items-start ${isLast ? '' : 'flex-1'}`}
                  >
                    {/* 칸 너비를 고정해 이름 길이에 따라 노드 위치가 밀리지 않게 한다 */}
                    <div className="flex w-20 shrink-0 flex-col items-center text-center">
                      <span
                        aria-hidden
                        className={`flex size-9 items-center justify-center rounded-pill border-2 ${style.node}`}
                      >
                        {step.status === 'DONE' && <CheckIcon />}
                        {step.status === 'IN_PROGRESS' && (
                          <span className="size-2.5 rounded-pill bg-step-in-progress" />
                        )}
                      </span>
                      <span
                        className={`mt-2 w-full truncate text-label font-medium ${style.label}`}
                        title={step.name}
                      >
                        {step.name}
                      </span>
                      <span className="mt-0.5 text-detail text-text-muted">
                        {style.sub}
                      </span>
                    </div>

                    {/* 연결선 색은 **앞 스텝** 기준이다 — 상태 색으로 지나온 구간을 표시한다 */}
                    {!isLast && (
                      <span
                        aria-hidden
                        className={`mt-[17px] h-1 min-w-6 flex-1 ${style.line}`}
                      />
                    )}
                  </li>
                );
              })}
            </ol>
          )}
        </div>
      )}
    </li>
  );
}

function ChevronIcon({
  isOpen,
  className = '',
}: {
  isOpen: boolean;
  className?: string;
}) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.8}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
      className={`size-4 shrink-0 text-text-muted transition-transform ${
        isOpen ? '-rotate-90' : 'rotate-90'
      } ${className}`}
    >
      <path d="m9 6 6 6-6 6" />
    </svg>
  );
}

function ArrowIcon() {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.8}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
      className="size-3.5"
    >
      <path d="M5 12h14M13 6l6 6-6 6" />
    </svg>
  );
}

function CheckIcon() {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={2.6}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
      className="size-4 text-green-text"
    >
      <path d="m5 12.5 4.5 4.5L19 7" />
    </svg>
  );
}
