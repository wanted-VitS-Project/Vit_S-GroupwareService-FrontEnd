'use client';

import Link from 'next/link';
import { useParams } from 'next/navigation';
import { useEffect, useRef, useState } from 'react';

import {
  getProject,
  getProjectStages,
  getProjectSteps,
} from '@/features/project/api';
import type {
  ProjectDetail,
  ProjectStage,
  ProjectStep,
} from '@/features/project/types';
import { formatDateRange } from '@/lib/format';

/**
 * 프로젝트 상세 화면 왼쪽 사이드바.
 * 프로젝트 개요 · 진행 단계 · 참여자를 보여주고 하위 화면 전환의 기준이 된다.
 *
 * ⚠️ 참여자 목록은 아직 API 가 없어 목 데이터로 그린다. (.ai/API.md)
 */

// TODO: 참여자 조회 API 연동 후 제거
const MOCK_MEMBERS = [
  { userId: 'EMP001', initial: '김', color: '#374151' },
  { userId: 'EMP002', initial: '이', color: '#9CA3AF' },
  { userId: 'EMP003', initial: '박', color: '#1F2937' },
  { userId: 'EMP004', initial: '최', color: '#4B5563' },
  { userId: 'EMP005', initial: '정', color: '#9CA3AF' },
];

/** `stageId: null` 인 스텝을 모아 보여줄 가상 스테이지 */
const UNASSIGNED_STAGE_ID = -1;

export default function ProjectSidebar() {
  // 스텝 화면(`/projects/{id}/steps/{stepId}`)이면 stepId 도 함께 들어온다
  const params = useParams<{ id: string; stepId?: string }>();
  const projectId = params.id;

  /** 어느 프로젝트의 응답인지 함께 담는다 — 경로가 바뀌면 즉시 무효가 된다 */
  const [loaded, setLoaded] = useState<{
    projectId: string;
    project: ProjectDetail;
    stages: ProjectStage[];
    steps: ProjectStep[];
  } | null>(null);
  const [failedProjectId, setFailedProjectId] = useState<string | null>(null);

  useEffect(() => {
    // 프로젝트를 빠르게 옮겨다닐 때 이전 요청을 실제로 끊는다
    const controller = new AbortController();
    const { signal } = controller;

    Promise.all([
      getProject(projectId, signal),
      getProjectStages(projectId, signal),
      getProjectSteps(projectId, signal),
    ])
      .then(([project, stages, steps]) =>
        setLoaded({ projectId, project, stages, steps }),
      )
      .catch(() => {
        // 취소는 실패가 아니다
        if (!signal.aborted) setFailedProjectId(projectId);
      });

    return () => controller.abort();
  }, [projectId]);

  // 현재 경로의 응답만 화면에 쓴다. 다른 프로젝트 데이터가 남아 보이지 않는다
  const current = loaded?.projectId === projectId ? loaded : null;
  const project = current?.project ?? null;
  const stages = current?.stages ?? null;
  const steps = current?.steps ?? null;
  const hasFailed = failedProjectId === projectId;

  /**
   * 선택 상태로 표시할 스텝.
   * 스텝 화면이면 URL 의 스텝, 아니면 진행 중인 첫 스텝을 잡는다.
   */
  const activeStepId = params.stepId
    ? Number(params.stepId)
    : (steps?.find((step) => step.status === 'IN_PROGRESS')?.stepId ?? null);

  const activeStep = steps?.find((step) => step.stepId === activeStepId);
  const activeStageId = activeStep
    ? (activeStep.stageId ?? UNASSIGNED_STAGE_ID)
    : null;

  const [openStageId, setOpenStageId] = useState<number | null>(null);

  // 데이터가 도착하거나 다른 스테이지의 스텝으로 이동하면 그 스테이지를 펼친다
  // (effect 가 아니라 렌더 중 상태 조정 — https://react.dev/reference/react/useState)
  const [syncedStageId, setSyncedStageId] = useState<number | null>(null);
  if (activeStageId !== null && activeStageId !== syncedStageId) {
    setSyncedStageId(activeStageId);
    setOpenStageId(activeStageId);
  }

  const progressRate = project?.progressRate ?? 0;
  const category = project?.businessCategories.map((c) => c.name).join(' · ');
  const canEdit = project?.myPermission === 'EDITOR';

  /** 스테이지 목록 + 스테이지 없는 스텝을 담을 '미분류' 묶음 */
  const unassignedSteps = steps?.filter((step) => step.stageId === null) ?? [];
  const groups: ProjectStage[] = [
    ...(stages ?? []),
    ...(unassignedSteps.length > 0
      ? [
          {
            stageId: UNASSIGNED_STAGE_ID,
            name: '미분류',
            sortOrder: Number.MAX_SAFE_INTEGER,
            stepCount: unassignedSteps.length,
          },
        ]
      : []),
  ];

  return (
    <aside className="flex h-full w-70 shrink-0 flex-col border-r border-gray-200 bg-white">
      {/* 스크롤 영역 — 참여자 · 설정은 아래에 고정한다 */}
      <div className="min-h-0 flex-1 overflow-y-auto">
        <Link
          href="/"
          className="flex h-13 items-center gap-2 border-b border-gray-200 px-4 py-3 text-[15px] font-medium text-gray-500 hover:bg-gray-50"
        >
          <ArrowLeftIcon />
          홈으로 돌아가기
        </Link>

        <div className="flex flex-col gap-2 border-b border-gray-200 px-4 py-3">
          <div className="flex items-center gap-2">
            <p className="min-w-0 flex-1 truncate text-xs font-semibold tracking-[0.9px] text-gray-500 uppercase">
              {category || (project ? '카테고리 없음' : '')}
            </p>
            {/* TODO: 사이드바 접기 동작 — 요구사항 확정 후 */}
            <button
              type="button"
              aria-label="사이드바 접기"
              className="flex size-6 shrink-0 cursor-pointer items-center justify-center rounded hover:bg-gray-100"
            >
              <PanelIcon />
            </button>
          </div>

          {hasFailed ? (
            <p className="text-xs text-gray-500">
              프로젝트 정보를 불러오지 못했습니다.
            </p>
          ) : !project ? (
            // 문구 한 줄만 두면 로드 후 블록이 커지면서 아래 진행 단계가 통째로 밀린다
            <div
              role="status"
              aria-label="프로젝트 정보를 불러오는 중입니다"
              className="flex flex-col gap-2"
            >
              <span
                aria-hidden
                className="h-5 w-40 animate-pulse rounded bg-gray-100"
              />
              <span
                aria-hidden
                className="h-4 w-24 animate-pulse rounded bg-gray-100"
              />
              <span
                aria-hidden
                className="h-3 w-full animate-pulse rounded bg-gray-100"
              />
              <span
                aria-hidden
                className="h-[5px] w-full animate-pulse rounded-full bg-gray-100"
              />
              <span
                aria-hidden
                className="h-4 w-36 animate-pulse rounded bg-gray-100"
              />
            </div>
          ) : (
            <>
              <p className="text-xl font-bold break-keep text-gray-900">
                {project.name}
              </p>
              <p className="pt-1 text-base font-bold text-gray-500">
                {project.clientName}
              </p>
              {project.description && (
                <p className="pt-1 text-xs text-gray-500">
                  {project.description}
                </p>
              )}

              <div className="pt-1">
                <p className="text-[10px] text-gray-500">전체 진행률</p>
                <div className="flex items-center gap-2.5">
                  <div className="h-[5px] flex-1 rounded-full bg-[#ECEEF5]">
                    <div
                      className="h-full rounded-full bg-[#305CE3]"
                      style={{ width: `${progressRate}%` }}
                    />
                  </div>
                  <span className="text-xs font-medium text-[#305CE3]">
                    {progressRate}%
                  </span>
                </div>
              </div>

              <p className="flex items-center gap-1 pt-1 text-sm font-medium text-gray-500">
                <CalendarIcon />
                {formatDateRange(project.startedOn, project.endedOn)}
              </p>
            </>
          )}
        </div>

        <div className="flex h-13 items-center justify-between border-b border-[#EBEBEC] px-4">
          <h2 className="text-base font-semibold text-gray-500 uppercase">
            진행 단계
          </h2>
          {canEdit && (
            <div className="flex items-center gap-1.5">
              {/* TODO: 단계 수정 · 추가 모달 연결 */}
              <button
                type="button"
                className="cursor-pointer rounded border border-blue-600 px-1.5 py-0.5 text-xs font-medium text-blue-600 hover:bg-blue-50"
              >
                단계수정
              </button>
              <button
                type="button"
                className="flex cursor-pointer items-center gap-0.5 rounded border border-blue-600 px-1.5 py-0.5 text-xs font-medium text-blue-600 hover:bg-blue-50"
              >
                <PlusIcon />
                추가
              </button>
            </div>
          )}
        </div>

        {!stages || !steps ? (
          <p className="px-4 py-3 text-xs text-gray-500">
            {hasFailed ? '진행 단계를 불러오지 못했습니다.' : '불러오는 중…'}
          </p>
        ) : groups.length === 0 ? (
          <p className="px-4 py-3 text-xs text-gray-500">
            등록된 스테이지가 없습니다.
          </p>
        ) : (
          groups.map((stage) => {
            const isOpen = stage.stageId === openStageId;
            const stageSteps = steps.filter((step) =>
              stage.stageId === UNASSIGNED_STAGE_ID
                ? step.stageId === null
                : step.stageId === stage.stageId,
            );

            // 미분류는 실제 스테이지가 아니라 이름 수정 · 삭제 · 스텝 추가 대상이 아니다
            const isEditable = canEdit && stage.stageId !== UNASSIGNED_STAGE_ID;

            return (
              <div key={stage.stageId}>
                <div className="group flex h-13 items-center border-b border-[#EBEBEC] px-2">
                  <div className="flex flex-1 items-center gap-1 rounded-md p-1.5 group-hover:bg-[#ECEEF4]">
                    <button
                      type="button"
                      aria-expanded={isOpen}
                      onClick={() =>
                        setOpenStageId(isOpen ? null : stage.stageId)
                      }
                      className="flex min-w-0 flex-1 cursor-pointer items-center gap-2"
                    >
                      <ChevronIcon isOpen={isOpen} />
                      <span
                        className={`truncate text-left text-base uppercase ${
                          isOpen
                            ? 'font-semibold text-[#305CE3]'
                            : 'font-medium text-gray-900'
                        }`}
                      >
                        {stage.name}
                      </span>
                    </button>

                    {!isEditable ? (
                      // 미분류처럼 편집 버튼이 없어도 스텝 수 위치가 흔들리지 않게 자리만 남긴다
                      <span aria-hidden className="size-5 shrink-0" />
                    ) : (
                      // TODO: 스텝 추가 모달 연결
                      <button
                        type="button"
                        aria-label={`${stage.name} 스텝 추가`}
                        // 노출 · 호버 · 아이콘 색을 RowMenu 의 ⋯ 버튼과 동일하게 맞춘다.
                        // group-focus-within 은 쓰지 않는다 — 스테이지를 클릭한 뒤
                        // 포커스가 남아 버튼이 계속 보인다
                        className="flex size-5 shrink-0 cursor-pointer items-center justify-center rounded text-[#6C7389] opacity-0 group-hover:opacity-100 hover:bg-black/5 focus-visible:opacity-100"
                      >
                        <PlusIcon />
                      </button>
                    )}

                    <span
                      className={`shrink-0 text-base uppercase ${
                        isOpen
                          ? 'font-semibold text-[#305CE3]'
                          : 'font-medium text-gray-500'
                      }`}
                    >
                      {stage.stepCount}
                    </span>

                    {isEditable ? (
                      <RowMenu label={stage.name} />
                    ) : (
                      <span aria-hidden className="size-5 shrink-0" />
                    )}
                  </div>
                </div>

                {isOpen && stageSteps.length === 0 && (
                  // 새로 만든 스테이지는 스텝이 0개다. 펼쳤을 때 아무 변화도 없으면
                  // 동작이 실패한 것으로 오해한다
                  <p className="border-b border-[#EBEBEC] px-6 py-3 text-xs text-gray-500">
                    등록된 스텝이 없습니다.
                  </p>
                )}

                {isOpen && stageSteps.length > 0 && (
                  <div className="flex flex-col gap-2 border-b border-[#EBEBEC] pb-4">
                    {stageSteps.map((step) => (
                      <StepCard
                        key={step.stepId}
                        projectId={projectId}
                        step={step}
                        isActive={step.stepId === activeStepId}
                      />
                    ))}
                    <Legend />
                  </div>
                )}
              </div>
            );
          })
        )}

        {canEdit && (
          <div className="p-4">
            {/* TODO: 스테이지 추가 모달 연결 */}
            <button
              type="button"
              className="flex w-full cursor-pointer items-center gap-2 rounded-lg border border-dashed border-gray-400 p-2 text-sm font-medium text-gray-900 uppercase hover:bg-gray-50"
            >
              <PlusIcon />
              스테이지 추가
            </button>
          </div>
        )}
      </div>

      <div className="border-t border-[#EBEBEC] px-4 py-3">
        <p className="flex items-center gap-1.5 text-xs text-[#6C7389]">
          <UsersIcon />
          참여자 ({MOCK_MEMBERS.length})
        </p>
        <div className="flex items-center pt-2">
          {MOCK_MEMBERS.map((member, index) => (
            <span
              key={member.userId}
              style={{
                backgroundColor: member.color,
                marginLeft: index === 0 ? 0 : -8,
                zIndex: index,
              }}
              className="flex size-6 items-center justify-center rounded-full border border-white text-[9px] font-semibold text-white"
            >
              {member.initial}
            </span>
          ))}
          {/* TODO: 참여자 추가 모달 연결 */}
          <button
            type="button"
            aria-label="참여자 추가"
            style={{ marginLeft: -8, zIndex: MOCK_MEMBERS.length }}
            className="flex size-6 cursor-pointer items-center justify-center rounded-full border border-white bg-[#ECEEF4] hover:bg-gray-200"
          >
            <PlusIcon />
          </button>
        </div>
      </div>

      <Link
        href={`/projects/${projectId}/settings`}
        className="flex h-13 shrink-0 items-center gap-2 border-t border-[#EBEBEC] px-4 text-base font-medium text-gray-500 hover:bg-gray-50"
      >
        <SettingsIcon />
        프로젝트 설정
      </Link>
    </aside>
  );
}

/** 스텝 하나 — 이슈 개수로 진척률 바를 그린다 */
function StepCard({
  projectId,
  step,
  isActive,
}: {
  projectId: string;
  step: ProjectStep;
  isActive: boolean;
}) {
  return (
    <div className="px-4">
      {/* 카드 전체가 링크. 메뉴 버튼만 링크 위로 올려 클릭을 가로챈다 */}
      <div
        className={`group/step relative flex flex-col gap-1 rounded-lg p-2 ${
          isActive ? 'bg-[#EDF2FF]' : 'hover:bg-[#ECEEF4]'
        }`}
      >
        <Link
          href={`/projects/${projectId}/steps/${step.stepId}`}
          aria-current={isActive ? 'page' : undefined}
          aria-label={step.name}
          className="absolute inset-0 rounded-lg"
        />

        <div className="pointer-events-none relative flex items-center gap-1">
          <span
            aria-hidden
            className={`size-2 shrink-0 rounded-full ${
              isActive ? 'bg-[#3B5BDB]' : 'bg-gray-500'
            }`}
          />
          <span
            className={`flex-1 truncate text-xs font-semibold ${
              isActive ? 'text-[#3B5BDB]' : 'text-gray-500'
            }`}
          >
            {step.name}
          </span>
          <span
            className={`text-xs ${isActive ? 'text-[#3B5BDB]' : 'text-gray-500'}`}
          >
            {step.progressRate ?? 0}%
          </span>
          {step.myPermission === 'EDITOR' ? (
            <span className="pointer-events-auto">
              <RowMenu
                label={step.name}
                revealClass="group-hover/step:opacity-100"
              />
            </span>
          ) : (
            // 메뉴가 없어도 진척률 % 위치가 흔들리지 않게 자리만 남긴다
            <span aria-hidden className="size-5 shrink-0" />
          )}
        </div>

        <div className="pointer-events-none relative">
          <StepProgressBar step={step} />
        </div>
      </div>
    </div>
  );
}

/**
 * 스테이지 · 스텝 공통 `⋯` 메뉴. 이름 수정 · 삭제를 담는다.
 * 평소에는 투명하게 자리만 차지하고, 행에 호버하거나 포커스가 들어오면 보인다.
 */
function RowMenu({
  label,
  // ⚠️ Tailwind 는 조합된 클래스명을 못 읽는다. 완성된 문자열로 넘겨야 한다
  revealClass = 'group-hover:opacity-100',
}: {
  label: string;
  revealClass?: string;
}) {
  const [isOpen, setIsOpen] = useState(false);
  const triggerRef = useRef<HTMLButtonElement>(null);

  /** 메뉴를 닫고 트리거로 포커스를 돌려준다 — 키보드로 되돌아갈 곳이 필요하다 */
  function close() {
    setIsOpen(false);
    triggerRef.current?.focus();
  }

  return (
    <span
      className="relative shrink-0"
      // 팝업 메뉴는 Esc 로 닫히는 것이 표준 동작이다
      onKeyDown={(event) => {
        if (event.key !== 'Escape' || !isOpen) return;
        event.stopPropagation();
        close();
      }}
    >
      <button
        ref={triggerRef}
        type="button"
        aria-label={`${label} 메뉴`}
        aria-haspopup="menu"
        aria-expanded={isOpen}
        onClick={() => setIsOpen((wasOpen) => !wasOpen)}
        className={`flex size-5 cursor-pointer items-center justify-center rounded hover:bg-black/5 focus-visible:opacity-100 ${
          isOpen ? 'opacity-100' : `opacity-0 ${revealClass}`
        }`}
      >
        <MoreIcon />
      </button>

      {isOpen && (
        <>
          {/* 바깥을 누르면 닫히도록 덮개를 깐다 */}
          <button
            type="button"
            tabIndex={-1}
            aria-label="메뉴 닫기"
            onClick={() => setIsOpen(false)}
            className="fixed inset-0 z-10 cursor-default"
          />
          <span
            role="menu"
            className="absolute top-full right-0 z-20 mt-1 flex w-32 flex-col overflow-hidden rounded-lg border border-[#1C1F2A]/10 bg-white shadow-lg"
          >
            {/* TODO: 이름 수정 · 삭제 API 연동 */}
            <button
              type="button"
              role="menuitem"
              onClick={close}
              className="flex cursor-pointer items-center gap-2 px-3 py-1.5 text-[11px] font-medium text-[#1C1F2A] hover:bg-gray-50"
            >
              <PencilIcon />
              이름 수정
            </button>
            <button
              type="button"
              role="menuitem"
              onClick={close}
              className="flex cursor-pointer items-center gap-2 px-3 py-1.5 text-[11px] font-medium text-[#E7000B] hover:bg-red-50"
            >
              <TrashIcon />
              삭제
            </button>
          </span>
        </>
      )}
    </span>
  );
}

/** 진행 중(노랑) · 완료(파랑) · 진행 전(회색) 이슈 비율을 한 줄로 보여준다 */
function StepProgressBar({ step }: { step: ProjectStep }) {
  const notStarted = Math.max(
    step.totalIssueCount - step.doneIssueCount - step.inProgressIssueCount,
    0,
  );
  const segments = [
    { key: 'inProgress', count: step.inProgressIssueCount, color: '#FFB900' },
    { key: 'done', count: step.doneIssueCount, color: '#2B7FFF' },
    { key: 'notStarted', count: notStarted, color: '#D1D5DB' },
  ].filter((segment) => segment.count > 0);

  // 이슈가 하나도 없으면 빈 바로 둔다
  if (segments.length === 0) {
    return <div className="h-1.5 rounded-full bg-[#D1D5DB]" />;
  }

  return (
    <div className="flex h-1.5 overflow-hidden rounded-full">
      {segments.map((segment) => (
        <span
          key={segment.key}
          style={{ flexGrow: segment.count, backgroundColor: segment.color }}
        />
      ))}
    </div>
  );
}

function Legend() {
  return (
    <div className="flex items-center justify-between px-4 text-[10px]">
      <span className="text-gray-500">* 스텝별 이슈 진척률</span>
      <span className="flex items-center gap-2">
        <LegendItem
          color="#FFB900"
          textClass="text-[#E17100]"
          label="진행 중"
        />
        <LegendItem color="#2563EB" textClass="text-blue-600" label="완료" />
        <LegendItem color="#D1D5DB" textClass="text-gray-500" label="진행 전" />
      </span>
    </div>
  );
}

function LegendItem({
  color,
  textClass,
  label,
}: {
  color: string;
  textClass: string;
  label: string;
}) {
  return (
    <span className="flex items-center gap-1">
      <span
        aria-hidden
        className="size-2 rounded-full"
        style={{ backgroundColor: color }}
      />
      <span className={textClass}>{label}</span>
    </span>
  );
}

/* 아이콘 — 아이콘 라이브러리 도입 전까지 인라인 SVG 로 둔다 (MenuIcon.tsx 와 동일 방침) */

function Svg({
  children,
  className = 'size-4 shrink-0',
  strokeWidth = 1.5,
}: {
  children: React.ReactNode;
  className?: string;
  strokeWidth?: number;
}) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={strokeWidth}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
      className={className}
    >
      {children}
    </svg>
  );
}

function ArrowLeftIcon() {
  return (
    <Svg strokeWidth={2}>
      <path d="M15 5 8 12l7 7" />
    </Svg>
  );
}

function ChevronIcon({ isOpen }: { isOpen: boolean }) {
  return (
    <Svg
      strokeWidth={2}
      className={`size-4 shrink-0 text-gray-400 transition-transform ${
        isOpen ? 'rotate-90' : ''
      }`}
    >
      <path d="m9 5 7 7-7 7" />
    </Svg>
  );
}

function PanelIcon() {
  return (
    <Svg strokeWidth={1} className="size-4 text-[#6C7389]">
      <rect x="3" y="3" width="18" height="18" rx="2" />
      <path d="M9 3v18M13 9l3 3-3 3" />
    </Svg>
  );
}

function CalendarIcon() {
  return (
    <Svg strokeWidth={1}>
      <rect x="2" y="5" width="20" height="17" rx="2" />
      <path d="M2 10h20M7 2v4M17 2v4" />
    </Svg>
  );
}

function PlusIcon() {
  return (
    <Svg className="size-3 shrink-0">
      <path d="M12 5v14M5 12h14" />
    </Svg>
  );
}

function MoreIcon() {
  return (
    <Svg className="size-3 shrink-0 text-[#6C7389]">
      <circle cx="5" cy="12" r="1" fill="currentColor" />
      <circle cx="12" cy="12" r="1" fill="currentColor" />
      <circle cx="19" cy="12" r="1" fill="currentColor" />
    </Svg>
  );
}

function PencilIcon() {
  return (
    <Svg className="size-3 shrink-0">
      <path d="M4 20h4L20 8l-4-4L4 16z" />
      <path d="m15 5 4 4" />
    </Svg>
  );
}

function TrashIcon() {
  return (
    <Svg className="size-3 shrink-0">
      <path d="M3 6h18M8 6V4h8v2M6 6l1 14h10l1-14" />
      <path d="M10 11v5M14 11v5" />
    </Svg>
  );
}

function UsersIcon() {
  return (
    <Svg strokeWidth={1} className="size-4 shrink-0 text-[#6C7389]">
      <circle cx="12" cy="7" r="4" />
      <path d="M3 21a9 9 0 0 1 18 0" />
    </Svg>
  );
}

function SettingsIcon() {
  return (
    <Svg strokeWidth={1} className="size-4 shrink-0 text-[#6C7389]">
      <circle cx="12" cy="12" r="3" />
      <circle cx="12" cy="12" r="9" />
      <path d="M12 3v3M12 18v3M3 12h3M18 12h3" />
    </Svg>
  );
}
