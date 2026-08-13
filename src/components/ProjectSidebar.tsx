'use client';

import dynamic from 'next/dynamic';
import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';

import MemberAvatar from '@/components/MemberAvatar';
import ModalLoadingFallback from '@/components/ModalLoadingFallback';
import { notifyToast } from '@/components/Toast';
import { notifyBlockChanged } from '@/features/block/events';
import {
  ISSUE_CHANGED_EVENT,
  notifyIssueChanged,
} from '@/features/issue/events';
import {
  getProject,
  getProjectMembers,
  getProjectStages,
  getProjectSteps,
} from '@/features/project/api';
import {
  SIDEBAR_COLLAPSED_WIDTH,
  SIDEBAR_WIDTH,
  useProjectSidebarCollapse,
} from '@/features/project/SidebarCollapse';
import type {
  CompletedStep,
  ProjectDetail,
  ProjectMember,
  ProjectStage,
  ProjectStep,
  StepStatus,
} from '@/features/project/types';
import { formatDateRange } from '@/lib/format';
import { useModalTarget } from '@/lib/useModal';

import {
  ProjectMembersSkeleton,
  ProjectOverviewSkeleton,
  ProjectStagesSkeleton,
} from './project/ProjectSidebarSkeleton';

/**
 * 프로젝트 상세 화면 왼쪽 사이드바.
 * 프로젝트 개요 · 진행 단계 · 참여자를 보여주고 하위 화면 전환의 기준이 된다.
 *
 */

/*
 * 단계 · 스텝 편집 모달은 **누를 때 받아온다**.
 * 사이드바는 프로젝트 하위 모든 화면에 항상 떠 있어, 여기서 정적으로 물면
 * 편집 권한이 없는 사용자까지 모달 6개를 매번 내려받게 된다.
 */
const loadStageManageModal = () =>
  import('@/features/project/stage/StageManageModal');
const loadStageFormModal = () =>
  import('@/features/project/stage/StageFormModal');
const loadStageDeleteModal = () =>
  import('@/features/project/stage/StageDeleteModal');
const loadStepFormModal = () => import('@/features/project/step/StepFormModal');
const loadStepDeleteModal = () =>
  import('@/features/project/step/StepDeleteModal');
const loadStepCompleteModal = () =>
  import('@/features/project/step/StepCompleteModal');
const loadStepPermissionModal = () =>
  import('@/features/project/step/StepPermissionModal');
const loadStepStatusModal = () =>
  import('@/features/project/step/StepStatusModal');
const loadStagePermissionModal = () =>
  import('@/features/project/stage/StagePermissionModal');
const loadProjectMembersModal = () =>
  import('@/features/project/member/ProjectMembersModal');

/** `PanelModal` 과 같은 폭 — 청크가 도착할 때 패널이 흔들리지 않게 한다 */
const PANEL_FALLBACK = 'w-full max-w-[420px] rounded-base p-6 shadow-2xl';

const StageManageModal = dynamic(loadStageManageModal, {
  loading: () => (
    <ModalLoadingFallback title="단계 관리" className={PANEL_FALLBACK} />
  ),
});
const StageFormModal = dynamic(loadStageFormModal, {
  loading: () => (
    <ModalLoadingFallback title="단계" className={PANEL_FALLBACK} />
  ),
});
const StageDeleteModal = dynamic(loadStageDeleteModal, {
  loading: () => (
    <ModalLoadingFallback title="단계 삭제" className={PANEL_FALLBACK} />
  ),
});
const StepFormModal = dynamic(loadStepFormModal, {
  loading: () => (
    <ModalLoadingFallback title="스텝" className={PANEL_FALLBACK} />
  ),
});
const StepDeleteModal = dynamic(loadStepDeleteModal, {
  loading: () => (
    <ModalLoadingFallback title="스텝 삭제" className={PANEL_FALLBACK} />
  ),
});
const StepCompleteModal = dynamic(loadStepCompleteModal, {
  loading: () => (
    <ModalLoadingFallback title="스텝 완료 처리" className={PANEL_FALLBACK} />
  ),
});

const StepPermissionModal = dynamic(loadStepPermissionModal, {
  loading: () => (
    <ModalLoadingFallback title="스텝 권한 관리" className={PANEL_FALLBACK} />
  ),
});
const StagePermissionModal = dynamic(loadStagePermissionModal, {
  loading: () => (
    <ModalLoadingFallback
      title="새 스텝 권한 기본값"
      className={PANEL_FALLBACK}
    />
  ),
});

const ProjectMembersModal = dynamic(loadProjectMembersModal, {
  loading: () => (
    <ModalLoadingFallback title="참여자 관리" className={PANEL_FALLBACK} />
  ),
});

const StepStatusModal = dynamic(loadStepStatusModal, {
  loading: () => (
    <ModalLoadingFallback title="스텝 상태 변경" className={PANEL_FALLBACK} />
  ),
});

/** 메뉴를 여는 순간 받아 둔다 — 항목을 고를 때는 이미 도착해 있다 */
function preloadStageChunks() {
  void loadStageManageModal();
  void loadStageFormModal();
  void loadStageDeleteModal();
  void loadStagePermissionModal();
}
function preloadStepChunks() {
  void loadStepFormModal();
  void loadStepDeleteModal();
  void loadStepCompleteModal();
  void loadStepPermissionModal();
  void loadStepStatusModal();
}

/**
 * 지금 열려 있는 편집 모달.
 *
 * 불리언 6개를 따로 두면 두 개가 동시에 참인 상태를 타입이 막지 못한다 —
 * 대상까지 함께 든 값 **하나**로 들면 그 상태가 아예 만들어지지 않는다. (`lib/useModal`)
 */
type SidebarModal =
  | { kind: 'stageManage' }
  | { kind: 'stageCreate' }
  | { kind: 'stageRename'; stage: ProjectStage }
  | { kind: 'stageDelete'; stage: ProjectStage }
  | { kind: 'stepCreate'; stageId?: number; stageName?: string }
  | { kind: 'stepEdit'; step: ProjectStep }
  | { kind: 'stepDelete'; step: ProjectStep }
  | { kind: 'stepComplete'; step: ProjectStep }
  /** 스텝 권한 오버라이드 — **프로젝트 EDITOR** 전용이다 (스텝 EDITOR 로는 못 부른다) */
  | { kind: 'stepPermission'; step: ProjectStep }
  /** 상태 변경 — 바꿀 상태는 **모달 안에서** 고른다 (`DONE` 은 완료 처리로 넘어간다) */
  | { kind: 'stepStatus'; step: ProjectStep }
  /** 이 단계에 새로 생길 스텝의 권한 기본값 */
  | { kind: 'stagePermission'; stage: ProjectStage }
  /** 참여자 명단 — 사이드바 아바타 줄에서 바로 연다 */
  | { kind: 'members' };

/** `stageId: null` 인 스텝을 모아 보여줄 가상 스테이지 */
const UNASSIGNED_STAGE_ID = -1;

/** 이슈 변경이 몰려 올 때 진척률 재조회를 합치는 대기 시간 */
const REFRESH_QUIET_MS = 300;

/**
 * 접힌 사이드바에서 스테이지 하나가 보여줄 점의 최대 개수.
 *
 * 스텝이 스무 개쯤 되는 스테이지가 몇 개만 있어도 세로로 한없이 길어져,
 * 접은 이유(한눈에 보기)가 사라진다. 넘치는 만큼은 `+N` 으로만 알린다.
 * 3의 배수 — 한 줄에 3개씩 놓여 딱 3줄로 떨어진다.
 */
const MAX_COLLAPSED_DOTS = 9;

/**
 * 스텝 상태 → 색. `GET /projects/{projectId}/steps` 의 `status` 를 그대로 쓴다.
 *
 * 실제 색값은 `globals.css` 의 `--color-step-*` 한 곳뿐이다 —
 * 점(접힘 · 펼침) · 진척 바 · 범례가 모두 이 표를 거치므로 토큰만 고치면 세 곳이 함께 움직인다.
 *
 * ⚠️ Tailwind 는 조합된 클래스명을 못 읽는다 — 완성된 문자열로 적어야 한다.
 */
const STEP_STATUS_BG: Record<StepStatus, string> = {
  NOT_STARTED: 'bg-step-not-started',
  IN_PROGRESS: 'bg-step-in-progress',
  DONE: 'bg-step-done',
};

export default function ProjectSidebar() {
  // 스텝 화면(`/projects/{id}/steps/{stepId}`)이면 stepId 도 함께 들어온다
  const params = useParams<{ id: string; stepId?: string }>();
  const projectId = params.id;
  const router = useRouter();
  const { isCollapsed, toggle, expand } = useProjectSidebarCollapse();

  /** 단계 · 스텝을 고친 뒤 목록을 다시 읽는 신호 */
  const [reloadCount, setReloadCount] = useState(0);
  const modal = useModalTarget<SidebarModal>();

  function reload() {
    setReloadCount((count) => count + 1);
  }

  /** 어느 프로젝트의 응답인지 함께 담는다 — 경로가 바뀌면 즉시 무효가 된다 */
  const [loaded, setLoaded] = useState<{
    projectId: string;
    project: ProjectDetail;
    stages: ProjectStage[];
    steps: ProjectStep[];
  } | null>(null);
  const [failedProjectId, setFailedProjectId] = useState<string | null>(null);
  const [loadedMembers, setLoadedMembers] = useState<{
    projectId: string;
    members: ProjectMember[];
  } | null>(null);
  const [failedMembersProjectId, setFailedMembersProjectId] = useState<
    string | null
  >(null);
  const [membersReloadCount, setMembersReloadCount] = useState(0);

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
    // 단계 · 스텝을 고치면 `reloadCount` 가 올라 같은 조회를 다시 태운다
  }, [projectId, reloadCount]);

  /**
   * 이슈가 바뀌면 스텝 진척률 · 전체 진척률을 다시 읽는다.
   *
   * 화면이 깜빡이지 않게 **가진 값을 지우지 않고** 도착한 값만 덮어쓴다.
   * (`loaded` 를 null 로 되돌리면 스켈레톤이 다시 떠서 사이드바가 흔들린다)
   * 스테이지는 이슈와 무관하므로 다시 읽지 않는다.
   */
  useEffect(() => {
    let controller: AbortController | null = null;
    let timer: ReturnType<typeof setTimeout> | null = null;

    function refresh() {
      // 연달아 오면 앞선 요청은 버린다
      controller?.abort();
      controller = new AbortController();
      const { signal } = controller;

      Promise.all([
        getProject(projectId, signal),
        getProjectSteps(projectId, signal),
      ])
        .then(([project, steps]) =>
          setLoaded((prev) =>
            prev && prev.projectId === projectId
              ? { ...prev, project, steps }
              : prev,
          ),
        )
        // 갱신 실패는 조용히 넘긴다 — 이미 보이는 값이 있다
        .catch(() => undefined);
    }

    /** 카드를 연달아 옮기면 이벤트가 몰려 온다 — 한 번으로 합쳐 보낸다 */
    function schedule() {
      if (timer) clearTimeout(timer);
      timer = setTimeout(refresh, REFRESH_QUIET_MS);
    }

    window.addEventListener(ISSUE_CHANGED_EVENT, schedule);
    return () => {
      window.removeEventListener(ISSUE_CHANGED_EVENT, schedule);
      if (timer) clearTimeout(timer);
      controller?.abort();
    };
  }, [projectId]);

  // 참여자는 보조 정보다. 지연·실패해도 프로젝트 개요와 단계 탐색을 막지 않는다.
  useEffect(() => {
    const controller = new AbortController();
    const { signal } = controller;

    getProjectMembers(projectId, signal)
      .then((members) => {
        setLoadedMembers({ projectId, members });
        setFailedMembersProjectId((failed) =>
          failed === projectId ? null : failed,
        );
      })
      .catch(() => {
        if (!signal.aborted) setFailedMembersProjectId(projectId);
      });

    return () => controller.abort();
  }, [projectId, membersReloadCount]);

  // 현재 경로의 응답만 화면에 쓴다. 다른 프로젝트 데이터가 남아 보이지 않는다
  const current = loaded?.projectId === projectId ? loaded : null;
  const project = current?.project ?? null;
  const stages = current?.stages ?? null;
  const steps = current?.steps ?? null;
  const members =
    loadedMembers?.projectId === projectId ? loadedMembers.members : null;
  const hasFailed = failedProjectId === projectId;
  const haveMembersFailed = failedMembersProjectId === projectId;

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

  /**
   * 스텝을 지우면 하위 이슈도 함께 사라진다 —
   * 이슈 보드가 열려 있을 수 있으므로 전역 이벤트로도 알린다. (`features/issue/events`)
   */
  function handleStepDeleted(step: ProjectStep, movedBlockCount: number) {
    notifyToast(
      movedBlockCount > 0
        ? `스텝을 삭제하고 블록 ${movedBlockCount}개를 옮겼습니다.`
        : '스텝을 삭제했습니다.',
    );
    reload();
    if (step.totalIssueCount > 0) notifyIssueChanged();
    /*
     * 블록을 옮겼으면 **도착 스텝의 목록이 달라진다** —
     * 그 보드가 열려 있으면 알리지 않는 한 옛 목록을 계속 보여준다.
     */
    if (movedBlockCount > 0) notifyBlockChanged();

    // 보고 있던 스텝이 사라졌다 — 빈 화면에 남겨두지 않는다
    if (params.stepId === String(step.stepId)) {
      router.replace(`/projects/${projectId}`);
    }
  }

  function handleStepCompleted(result: CompletedStep) {
    notifyToast(
      result.closedIssueCount > 0
        ? `스텝을 완료하고 이슈 ${result.closedIssueCount}개를 함께 종료했습니다.`
        : '스텝을 완료 처리했습니다.',
    );
    reload();
    if (result.closedIssueCount > 0) notifyIssueChanged();
  }

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

  /** 좁히기 전에 한 번 꺼내 둔다 — 조건마다 `modal.target?` 을 다시 좁히지 않아도 된다 */
  const openModal = modal.target;

  /*
   * 폭만 전환한다 (`transition-all` 은 색 · 그림자까지 매 프레임 계산한다).
   *
   * 안쪽 트리는 **고정 폭**을 그대로 들고 `overflow-hidden` 으로 잘린다 —
   * 이러면 전환 중에 사이드바 내용이 매 프레임 다시 배치되지 않는다.
   * (안쪽까지 폭을 따라가게 두면 줄바꿈 · 말줄임이 프레임마다 다시 계산돼 끊긴다)
   *
   * `will-change` 는 걸지 않는다 — 항상 켜 두면 레이어가 계속 떠 있어 손해다.
   */
  return (
    <>
      <aside
        className={`h-full shrink-0 overflow-hidden border-r border-border-default bg-bg-card transition-[width] duration-200 ease-out motion-reduce:transition-none ${
          isCollapsed ? SIDEBAR_COLLAPSED_WIDTH : SIDEBAR_WIDTH
        }`}
      >
        {isCollapsed ? (
          <CollapsedSidebar
            groups={groups}
            steps={steps}
            hasFailed={hasFailed}
            activeStageId={activeStageId}
            projectId={projectId}
            onExpandStage={(stageId) => {
              setOpenStageId(stageId);
              expand();
            }}
            onExpand={expand}
          />
        ) : (
          <div
            className={`flex h-full ${SIDEBAR_WIDTH} animate-panel-in flex-col motion-reduce:animate-none`}
          >
            {/* 이탈 경로는 항상 같은 자리에 있어야 한다 — 스크롤 영역 밖에 둔다 */}
            <Link
              href="/"
              className="flex h-13 shrink-0 items-center gap-2 border-b border-border-default px-4 text-[15px] font-medium text-text-secondary hover:bg-bg-surface"
            >
              <ArrowLeftIcon />
              홈으로 돌아가기
            </Link>

            {/* 스크롤 영역 — 홈 · 참여자 · 설정은 위아래에 고정한다. 폭이 좁아 스크롤바는 숨긴다 */}
            <div className="no-scrollbar min-h-0 flex-1 overflow-y-auto">
              <div className="flex flex-col gap-2 border-b border-border-default px-4 py-3">
                <div className="flex items-center gap-2">
                  <p className="min-w-0 flex-1 truncate text-label font-semibold tracking-[0.9px] text-text-secondary uppercase">
                    {category || (project ? '카테고리 없음' : '')}
                  </p>
                  <button
                    type="button"
                    onClick={toggle}
                    aria-label="사이드바 접기"
                    aria-expanded
                    className="flex size-6 shrink-0 cursor-pointer items-center justify-center rounded-button-sm hover:bg-bg-hover"
                  >
                    <PanelIcon direction="left" />
                  </button>
                </div>

                {hasFailed ? (
                  <p className="text-label text-text-secondary">
                    프로젝트 정보를 불러오지 못했습니다.
                  </p>
                ) : !project ? (
                  <ProjectOverviewSkeleton />
                ) : (
                  <div className="flex flex-col gap-3">
                    <div className="flex flex-col gap-0.5">
                      <p className="text-heading-l font-bold break-keep text-text-primary">
                        {project.name}
                      </p>
                      <p className="text-body-l font-semibold text-text-secondary">
                        {project.clientName}
                      </p>
                    </div>
                    {project.description && (
                      <p className="text-label leading-5 text-text-secondary">
                        {project.description}
                      </p>
                    )}

                    <div>
                      <p className="pb-1 text-caption text-text-secondary">
                        전체 진행률
                      </p>
                      <div className="flex items-center gap-2.5">
                        <div className="h-1.25 flex-1 rounded-pill bg-bg-hover">
                          {/* 갱신될 때 값이 튀지 않고 채워지도록 폭만 전환한다 */}
                          <div
                            className="h-full rounded-pill bg-btn-primary transition-[width] duration-300"
                            style={{ width: `${progressRate}%` }}
                          />
                        </div>
                        <span className="text-label font-medium text-text-primary-blue">
                          {progressRate}%
                        </span>
                      </div>
                    </div>

                    <p className="flex items-center gap-1.5 text-body-m font-medium text-text-secondary">
                      <CalendarIcon />
                      {formatDateRange(project.startedOn, project.endedOn)}
                    </p>
                  </div>
                )}
              </div>

              <div className="flex h-13 items-center justify-between border-b border-border-default px-4">
                <h2 className="text-body-l font-semibold text-text-secondary uppercase">
                  진행 단계
                </h2>
                {canEdit && (
                  <div className="flex items-center gap-1.5">
                    {/*
                    `⋯` 메뉴는 행에 호버해야 나타나 처음 쓰는 사람이 찾지 못한다 —
                    이름 수정 · 삭제로 가는 **눈에 보이는 길**을 여기에 둔다.
                  */}
                    <button
                      type="button"
                      onClick={() => modal.open({ kind: 'stageManage' })}
                      onPointerEnter={preloadStageChunks}
                      disabled={!stages}
                      className="cursor-pointer rounded-button-sm border border-border-primary px-1.5 py-0.5 text-label font-medium text-text-primary-blue hover:bg-blue-bg-soft disabled:cursor-not-allowed disabled:border-border-default disabled:text-text-muted"
                    >
                      단계수정
                    </button>
                    <button
                      type="button"
                      onClick={() => modal.open({ kind: 'stageCreate' })}
                      onPointerEnter={preloadStageChunks}
                      className="flex cursor-pointer items-center gap-0.5 rounded-button-sm border border-border-primary px-1.5 py-0.5 text-label font-medium text-text-primary-blue hover:bg-blue-bg-soft"
                    >
                      <PlusIcon />
                      추가
                    </button>
                  </div>
                )}
              </div>

              {!stages || !steps ? (
                hasFailed ? (
                  <p className="px-4 py-3 text-label text-text-secondary">
                    진행 단계를 불러오지 못했습니다.
                  </p>
                ) : (
                  <ProjectStagesSkeleton />
                )
              ) : groups.length === 0 ? (
                <p className="px-4 py-3 text-label text-text-secondary">
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
                  const isEditable =
                    canEdit && stage.stageId !== UNASSIGNED_STAGE_ID;

                  return (
                    <div key={stage.stageId}>
                      <div className="group flex h-13 items-center border-b border-border-default px-2">
                        <div className="flex flex-1 items-center gap-1 rounded-button-md p-1.5 group-hover:bg-bg-hover">
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
                              className={`truncate text-left text-body-l uppercase ${
                                isOpen
                                  ? 'font-semibold text-text-primary-blue'
                                  : 'font-medium text-text-primary'
                              }`}
                            >
                              {stage.name}
                            </span>
                          </button>

                          {!isEditable ? (
                            // 미분류처럼 편집 버튼이 없어도 스텝 수 위치가 흔들리지 않게 자리만 남긴다
                            <span aria-hidden className="size-5 shrink-0" />
                          ) : (
                            <button
                              type="button"
                              aria-label={`${stage.name} 스텝 추가`}
                              onClick={() =>
                                modal.open({
                                  kind: 'stepCreate',
                                  stageId: stage.stageId,
                                  stageName: stage.name,
                                })
                              }
                              onPointerEnter={preloadStepChunks}
                              // 노출 · 호버 · 아이콘 색을 RowMenu 의 ⋯ 버튼과 동일하게 맞춘다.
                              // group-focus-within 은 쓰지 않는다 — 스테이지를 클릭한 뒤
                              // 포커스가 남아 버튼이 계속 보인다
                              className="flex size-5 shrink-0 cursor-pointer items-center justify-center rounded-button-sm text-text-secondary opacity-0 group-hover:opacity-100 hover:bg-black/5 focus-visible:opacity-100"
                            >
                              <PlusIcon />
                            </button>
                          )}

                          <span
                            className={`shrink-0 text-body-l uppercase ${
                              isOpen
                                ? 'font-semibold text-text-primary-blue'
                                : 'font-medium text-text-secondary'
                            }`}
                          >
                            {stage.stepCount}
                          </span>

                          {isEditable ? (
                            <RowMenu
                              label={stage.name}
                              onOpen={preloadStageChunks}
                              items={[
                                {
                                  label: '이름 수정',
                                  icon: <PencilIcon />,
                                  onSelect: () =>
                                    modal.open({ kind: 'stageRename', stage }),
                                },
                                {
                                  label: '스텝 권한 기본값',
                                  icon: <KeyIcon />,
                                  onSelect: () =>
                                    modal.open({
                                      kind: 'stagePermission',
                                      stage,
                                    }),
                                },
                                {
                                  label: '삭제',
                                  icon: <TrashIcon />,
                                  danger: true,
                                  onSelect: () =>
                                    modal.open({ kind: 'stageDelete', stage }),
                                },
                              ]}
                            />
                          ) : (
                            <span aria-hidden className="size-5 shrink-0" />
                          )}
                        </div>
                      </div>

                      {isOpen && stageSteps.length === 0 && (
                        // 새로 만든 스테이지는 스텝이 0개다. 펼쳤을 때 아무 변화도 없으면
                        // 동작이 실패한 것으로 오해한다
                        <p className="border-b border-border-default px-6 py-3 text-label text-text-secondary">
                          등록된 스텝이 없습니다.
                        </p>
                      )}

                      {isOpen && stageSteps.length > 0 && (
                        <div className="flex flex-col gap-1.5 border-b border-border-default py-2">
                          {stageSteps.map((step) => (
                            <StepCard
                              key={step.stepId}
                              projectId={projectId}
                              step={step}
                              isActive={step.stepId === activeStepId}
                              canManagePermissions={canEdit}
                              onManagePermissions={() =>
                                modal.open({ kind: 'stepPermission', step })
                              }
                              onChangeStatus={() =>
                                modal.open({ kind: 'stepStatus', step })
                              }
                              onEdit={() =>
                                modal.open({ kind: 'stepEdit', step })
                              }
                              onDelete={() =>
                                modal.open({ kind: 'stepDelete', step })
                              }
                            />
                          ))}
                          <Legend />
                        </div>
                      )}
                    </div>
                  );
                })
              )}
            </div>

            <div className="border-t border-border-default px-4 py-3">
              {haveMembersFailed ? (
                <>
                  <p className="flex items-center gap-1.5 text-label text-text-secondary">
                    <UsersIcon />
                    참여자
                  </p>
                  <div className="flex items-center justify-between gap-2 pt-2">
                    <p role="alert" className="text-caption text-text-danger">
                      참여자를 불러오지 못했습니다.
                    </p>
                    <button
                      type="button"
                      onClick={() => {
                        setFailedMembersProjectId(null);
                        setMembersReloadCount((count) => count + 1);
                      }}
                      className="shrink-0 cursor-pointer rounded-button-sm px-1.5 py-0.5 text-caption font-medium text-text-primary-blue hover:bg-blue-bg-soft"
                    >
                      다시 시도
                    </button>
                  </div>
                </>
              ) : !members ? (
                <>
                  <p className="flex items-center gap-1.5 text-label text-text-secondary">
                    <UsersIcon />
                    참여자
                  </p>
                  <ProjectMembersSkeleton />
                </>
              ) : (
                /*
                 * 영역 전체가 버튼이다 — 아바타만 겹쳐 놓아서는 누가 무슨 권한인지 알 수 없어
                 * 눌러서 명단을 연다. 편집 권한이 없으면 모달이 **읽기 전용**으로 열린다.
                 * (`관리` · `+` 를 따로 두지 않는다 — 좁은 폭에서 누를 곳이 셋으로 갈린다)
                 */
                <button
                  type="button"
                  aria-label={canEdit ? '참여자 관리' : '참여자 명단 보기'}
                  onClick={() => {
                    void loadProjectMembersModal();
                    modal.open({ kind: 'members' });
                  }}
                  className="-mx-2 block w-[calc(100%+1rem)] cursor-pointer rounded-lg px-2 py-1 text-left hover:bg-bg-hover"
                >
                  <span className="flex items-center gap-1.5 text-label text-text-secondary">
                    <UsersIcon />
                    참여자 ({members.length})
                  </span>
                  {members.length === 0 ? (
                    <span className="block pt-2 text-caption text-text-secondary">
                      등록된 참여자가 없습니다.
                      {canEdit && ' 눌러서 추가하세요.'}
                    </span>
                  ) : (
                    <span className="flex items-center pt-2">
                      {/*
                        담당자 아바타는 `MemberAvatar` 하나로 모은다 — 사번 기준으로 색이 정해져
                        이슈 · 블록 담당자와 **같은 사람이 같은 색**으로 나온다
                      */}
                      {members.map((member, index) => (
                        <span
                          key={member.memberId}
                          title={`${member.name}${member.department ? ` · ${member.department}` : ''}${member.resigned ? ' · 퇴사' : ''}`}
                          style={{
                            marginLeft: index === 0 ? 0 : -8,
                            zIndex: index,
                          }}
                          className="flex"
                        >
                          <MemberAvatar
                            userId={member.userId}
                            name={member.name}
                          />
                        </span>
                      ))}
                      {/*
                        `+` 는 **버튼이 아니라 표시**다 — 영역 전체가 이미 버튼이라
                        안에 버튼을 또 넣을 수 없다 (중첩 버튼은 유효하지 않다).
                      */}
                      {canEdit && (
                        <span
                          aria-hidden
                          style={{ marginLeft: -8, zIndex: members.length }}
                          className="flex size-6 items-center justify-center rounded-pill border border-white bg-bg-hover text-text-secondary"
                        >
                          <PlusIcon />
                        </span>
                      )}
                    </span>
                  )}
                </button>
              )}
            </div>

            <Link
              href={`/projects/${projectId}/settings`}
              className="flex h-13 shrink-0 items-center gap-2 border-t border-border-default px-4 text-body-l font-medium text-text-secondary hover:bg-bg-surface"
            >
              <SettingsIcon />
              프로젝트 설정
            </Link>
          </div>
        )}
      </aside>

      {/*
        모달은 `<aside>` 밖에 둔다 — 사이드바가 `overflow-hidden` 이라
        안에 두면 접힘 전환 중에 잘린다. `<dialog>` 는 어차피 top-layer 에 뜬다.
      */}
      {openModal?.kind === 'stageManage' && stages && steps && (
        <StageManageModal
          projectId={projectId}
          stages={stages}
          steps={steps}
          onClose={modal.close}
          onChanged={reload}
        />
      )}
      {(openModal?.kind === 'stageCreate' ||
        openModal?.kind === 'stageRename') && (
        <StageFormModal
          projectId={projectId}
          stage={openModal.kind === 'stageRename' ? openModal.stage : undefined}
          onClose={modal.close}
          onSaved={reload}
        />
      )}
      {openModal?.kind === 'stageDelete' && (
        <StageDeleteModal
          stage={openModal.stage}
          stages={stages ?? []}
          onClose={modal.close}
          onDeleted={reload}
        />
      )}
      {(openModal?.kind === 'stepCreate' || openModal?.kind === 'stepEdit') && (
        <StepFormModal
          projectId={projectId}
          step={openModal.kind === 'stepEdit' ? openModal.step : undefined}
          stageId={
            openModal.kind === 'stepCreate' ? openModal.stageId : undefined
          }
          stageName={
            openModal.kind === 'stepCreate' ? openModal.stageName : undefined
          }
          onClose={modal.close}
          onSaved={reload}
        />
      )}
      {openModal?.kind === 'stepDelete' && (
        <StepDeleteModal
          step={openModal.step}
          steps={steps ?? []}
          onClose={modal.close}
          onDeleted={({ movedBlockCount }) =>
            handleStepDeleted(openModal.step, movedBlockCount)
          }
        />
      )}
      {openModal?.kind === 'stepComplete' && (
        <StepCompleteModal
          step={openModal.step}
          onClose={modal.close}
          onCompleted={handleStepCompleted}
        />
      )}
      {/*
        권한만 바꾸면 목록에 보이는 값(이름 · 진척률 · 상태)은 그대로라 다시 읽지 않는다 —
        내 권한이 바뀌는 경우는 없다 (자기 자신 행은 잠겨 있다).
      */}
      {openModal?.kind === 'stepPermission' && (
        <StepPermissionModal
          stepId={openModal.step.stepId}
          stepName={openModal.step.name}
          onClose={modal.close}
        />
      )}
      {openModal?.kind === 'stepStatus' && (
        <StepStatusModal
          step={openModal.step}
          onClose={modal.close}
          // 새 `version` 과 상태가 목록에 반영돼야 다음 조작이 409 가 되지 않는다
          onChanged={reload}
          // 완료는 미완료 이슈 처리를 물어야 해서 전용 모달이 이어받는다
          onRequestComplete={() =>
            modal.open({ kind: 'stepComplete', step: openModal.step })
          }
        />
      )}
      {openModal?.kind === 'members' && (
        <ProjectMembersModal
          projectId={projectId}
          members={members}
          hasFailed={haveMembersFailed}
          canEdit={canEdit}
          onClose={modal.close}
          // 권한 · 명단이 바뀌면 아바타 줄도 함께 맞춰야 한다
          onChanged={() => {
            setFailedMembersProjectId(null);
            setMembersReloadCount((count) => count + 1);
          }}
        />
      )}
      {openModal?.kind === 'stagePermission' && (
        <StagePermissionModal
          projectId={projectId}
          stageId={openModal.stage.stageId}
          stageName={openModal.stage.name}
          onClose={modal.close}
          // 기존 스텝에 적용됐으면 내 스텝 권한(`myPermission`)도 달라질 수 있다
          onApplied={reload}
        />
      )}
    </>
  );
}

/**
 * 접힌 사이드바 (58px).
 *
 * 폭이 좁아 개요 · 참여자는 들어가지 않는다 — **어디까지 왔는지**만 남긴다.
 * 스테이지 이름 아래 점이 스텝 하나씩이고, 색이 그 스텝의 상태다.
 * 지금 보고 있는 스텝이 든 스테이지만 이름을 파랗게 둔다.
 */
function CollapsedSidebar({
  groups,
  steps,
  hasFailed,
  activeStageId,
  projectId,
  onExpandStage,
  onExpand,
}: {
  groups: ProjectStage[];
  steps: ProjectStep[] | null;
  hasFailed: boolean;
  activeStageId: number | null;
  projectId: string;
  onExpandStage: (stageId: number) => void;
  onExpand: () => void;
}) {
  return (
    <div
      className={`flex h-full ${SIDEBAR_COLLAPSED_WIDTH} animate-panel-in flex-col motion-reduce:animate-none`}
    >
      <Link
        href="/"
        aria-label="홈으로 돌아가기"
        title="홈으로 돌아가기"
        className="flex h-13 shrink-0 items-center justify-center"
      >
        {/* 평소에는 흰 바탕이라 아이콘만 떠 보인다 — 호버할 때만 판이 드러난다 */}
        <span className="flex size-7 items-center justify-center rounded-lg bg-bg-card text-text-secondary hover:bg-bg-hover">
          <ArrowLeftIcon />
        </span>
      </Link>

      <button
        type="button"
        onClick={onExpand}
        aria-label="사이드바 펼치기"
        aria-expanded={false}
        title="사이드바 펼치기"
        className="flex h-13 shrink-0 cursor-pointer items-center justify-center"
      >
        <span className="flex size-7 items-center justify-center rounded-lg bg-bg-card hover:bg-bg-hover">
          <PanelIcon direction="right" />
        </span>
      </button>

      {/* 스테이지 목록 */}
      <div className="no-scrollbar flex min-h-0 flex-1 flex-col overflow-y-auto">
        {/*
          펼친 쪽과 같은 세 갈래를 유지한다 — 실패와 로딩을 구분하지 않으면
          둘 다 "스테이지 0개" 로 보여 사용자가 없는 것으로 오해한다.
        */}
        {hasFailed ? (
          <p
            role="alert"
            className="px-1 py-3 text-center text-caption break-keep text-text-danger"
          >
            불러오지 못했습니다
          </p>
        ) : !steps ? (
          <div aria-busy className="flex flex-col gap-2 px-2 py-3">
            {[0, 1, 2].map((row) => (
              <span
                key={row}
                aria-hidden
                className="h-10 animate-pulse rounded-button-sm bg-bg-hover"
              />
            ))}
          </div>
        ) : (
          groups.map((stage) => {
            const stageSteps = steps.filter((step) =>
              stage.stageId === UNASSIGNED_STAGE_ID
                ? step.stageId === null
                : step.stageId === stage.stageId,
            );
            const hiddenStepCount = stageSteps.length - MAX_COLLAPSED_DOTS;

            return (
              <button
                key={stage.stageId}
                type="button"
                onClick={() => onExpandStage(stage.stageId)}
                /*
                  점은 색으로만 말하므로 `aria-hidden` 이다 — 대신 상태별 개수를 글로 실어
                  스크린리더 사용자도 "어디까지 왔는지" 를 알 수 있게 한다.
                  (색 대비가 낮은 '진행 전' 회색에 기대지 않는 효과도 있다)
                */
                aria-label={`${stage.name} · ${describeSteps(stageSteps)}`}
                title={`${stage.name} · ${describeSteps(stageSteps)}`}
                className="flex min-h-19.5 shrink-0 cursor-pointer flex-col items-center justify-center gap-2 px-1 py-3 hover:bg-bg-hover"
              >
                <span
                  aria-hidden
                  className={`w-full truncate text-center text-caption font-medium ${
                    stage.stageId === activeStageId
                      ? 'text-text-primary-blue'
                      : 'text-text-primary'
                  }`}
                >
                  {stage.name}
                </span>
                {/*
                  한 줄에 3개씩 접힌다 (`max-w-8` = 8px 점 3개 + 4px 간격 2개).
                  세로로만 쌓으면 스텝이 늘수록 스테이지 한 칸이 그만큼 길어진다.
                */}
                <span
                  aria-hidden
                  className="flex max-w-8 flex-wrap justify-center gap-1"
                >
                  {stageSteps.slice(0, MAX_COLLAPSED_DOTS).map((step) => (
                    <span
                      key={step.stepId}
                      className={`size-2 rounded-pill ${STEP_STATUS_BG[step.status]}`}
                    />
                  ))}
                </span>
                {hiddenStepCount > 0 && (
                  <span
                    aria-hidden
                    className="text-caption leading-none text-text-secondary"
                  >
                    +{hiddenStepCount}
                  </span>
                )}
              </button>
            );
          })
        )}
      </div>

      <Link
        href={`/projects/${projectId}/settings`}
        aria-label="프로젝트 설정"
        title="프로젝트 설정"
        className="flex h-11.5 shrink-0 items-center justify-center hover:bg-bg-surface"
      >
        <SettingsIcon />
      </Link>
    </div>
  );
}

/**
 * 접힌 사이드바의 스텝 점을 **글로 옮긴다**.
 * 점은 색으로만 상태를 말해 스크린리더에도, 색 대비가 약한 회색에도 기댈 수 없다.
 */
function describeSteps(stageSteps: ProjectStep[]) {
  if (stageSteps.length === 0) return '스텝 없음';

  const counts = stageSteps.reduce(
    (total, step) => ({ ...total, [step.status]: total[step.status] + 1 }),
    { NOT_STARTED: 0, IN_PROGRESS: 0, DONE: 0 } as Record<StepStatus, number>,
  );

  const parts = [
    counts.DONE > 0 && `완료 ${counts.DONE}`,
    counts.IN_PROGRESS > 0 && `진행 중 ${counts.IN_PROGRESS}`,
    counts.NOT_STARTED > 0 && `진행 전 ${counts.NOT_STARTED}`,
  ].filter(Boolean);

  return `스텝 ${stageSteps.length}개 · ${parts.join(' · ')}`;
}

/** 스텝 하나 — 이슈 개수로 진척률 바를 그린다 */
function StepCard({
  projectId,
  step,
  isActive,
  canManagePermissions,
  onEdit,
  onDelete,
  onManagePermissions,
  onChangeStatus,
}: {
  projectId: string;
  step: ProjectStep;
  isActive: boolean;
  /**
   * 스텝 권한 관리 가능 여부 — **프로젝트 `EDITOR`** 다.
   *
   * ⚠️ 스텝 권한 API(134~136)는 스텝 권한이 아니라 프로젝트 권한을 본다.
   *    그래서 아래 `step.myPermission` 과 **다른 값이며 함께 쓸 수 없다** —
   *    남이 이 스텝에 `VIEWER` 오버라이드를 걸어 둔 프로젝트 편집자도 권한은 관리할 수 있다.
   */
  canManagePermissions: boolean;
  onEdit: () => void;
  onDelete: () => void;
  onManagePermissions: () => void;
  /** 바꿀 상태는 모달 안에서 고른다 — 메뉴는 열기만 한다 */
  onChangeStatus: () => void;
}) {
  const canEditStep = step.myPermission === 'EDITOR';
  return (
    <div className="px-4">
      {/* 카드 전체가 링크. 메뉴 버튼만 링크 위로 올려 클릭을 가로챈다 */}
      <div
        className={`group/step relative flex flex-col gap-1 rounded-lg px-2 py-3 ${
          isActive ? 'bg-blue-bg-soft' : 'hover:bg-bg-hover'
        }`}
      >
        <Link
          href={`/projects/${projectId}/steps/${step.stepId}`}
          aria-current={isActive ? 'page' : undefined}
          aria-label={step.name}
          className="absolute inset-0 rounded-lg"
        />

        <div className="pointer-events-none relative flex items-center gap-1">
          {/*
            선택 여부가 아니라 **스텝 상태**를 나타낸다 — 접힌 사이드바의 점과 같은 규칙이다.
            지금 보고 있는 스텝인지는 카드 배경 · 글자색이 이미 말해준다.
          */}
          <span
            aria-hidden
            className={`size-2 shrink-0 rounded-pill ${STEP_STATUS_BG[step.status]}`}
          />
          <span
            className={`flex-1 truncate text-body-m font-semibold ${
              isActive ? 'text-text-primary-blue' : 'text-text-secondary'
            }`}
          >
            {step.name}
          </span>
          <span
            className={`text-label ${isActive ? 'text-text-primary-blue' : 'text-text-secondary'}`}
          >
            {step.progressRate ?? 0}%
          </span>
          {canEditStep || canManagePermissions ? (
            <span className="pointer-events-auto">
              <RowMenu
                label={step.name}
                revealClass="group-hover/step:opacity-100"
                onOpen={preloadStepChunks}
                items={[
                  // 수정 · 완료 · 삭제는 **스텝** 권한, 권한 관리는 **프로젝트** 권한이다
                  ...(canEditStep
                    ? [
                        {
                          label: '스텝 수정',
                          icon: <PencilIcon />,
                          onSelect: onEdit,
                        },
                      ]
                    : []),
                  /*
                   * 상태는 **항목 하나로 묶는다** — 진행 전 · 진행중 · 완료를 각각 두면
                   * 메뉴가 스텝 상태에 따라 늘었다 줄었다 해서 매번 읽어야 한다.
                   * 무엇으로 바꿀지는 모달 안에서 고른다 (완료만 완료 처리 모달로 넘어간다).
                   */
                  ...(canEditStep
                    ? [
                        {
                          label: '상태 변경',
                          icon: <PlayIcon />,
                          onSelect: onChangeStatus,
                        },
                      ]
                    : []),
                  ...(canManagePermissions
                    ? [
                        {
                          label: '권한 관리',
                          icon: <KeyIcon />,
                          onSelect: onManagePermissions,
                        },
                      ]
                    : []),
                  ...(canEditStep
                    ? [
                        {
                          label: '삭제',
                          icon: <TrashIcon />,
                          danger: true,
                          onSelect: onDelete,
                        },
                      ]
                    : []),
                ]}
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
 * 메뉴 크기 — 열기 전에 위치를 계산해야 해서 값으로 들고 있다.
 * `스텝 권한 기본값` 처럼 긴 항목이 줄바꿈되지 않도록 넉넉히 잡는다.
 */
const MENU_WIDTH = 156;
/** 항목 하나 높이(`py-1.5` + 본문) · 위아래 `py-1` */
const MENU_ITEM_HEIGHT = 30;
const MENU_PADDING = 8;

interface RowMenuItem {
  label: string;
  icon: React.ReactNode;
  /** 삭제처럼 되돌릴 수 없는 항목은 빨갛게 */
  danger?: boolean;
  onSelect: () => void;
}

/**
 * 스테이지 · 스텝 공통 `⋯` 메뉴. 항목은 쓰는 쪽이 정한다.
 * 평소에는 투명하게 자리만 차지하고, 행에 호버하거나 포커스가 들어오면 보인다.
 */
function RowMenu({
  label,
  items,
  // ⚠️ Tailwind 는 조합된 클래스명을 못 읽는다. 완성된 문자열로 넘겨야 한다
  revealClass = 'group-hover:opacity-100',
  onOpen,
}: {
  label: string;
  items: RowMenuItem[];
  revealClass?: string;
  /** 열자마자 모달 청크를 받아 둔다 — 항목을 고를 때는 이미 도착해 있다 */
  onOpen?: () => void;
}) {
  /**
   * 열린 위치. `null` 이면 닫혀 있다.
   *
   * ⚠️ **`absolute` 로는 안 된다** — 사이드바가 `overflow-y-auto` 라 메뉴가 목록 안에서
   *    잘린다 (아래쪽 행일수록 심하다). `body` 로 빼서 `fixed` 로 띄우고 좌표는 열 때 잰다.
   *    좌표가 굳으므로 스크롤 · 리사이즈가 생기면 닫는다. (`CategoryList` 의 `RowMenu` 와 같은 방식)
   */
  const [position, setPosition] = useState<{
    top: number;
    left: number;
  } | null>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);

  const isOpen = position !== null;

  /** 메뉴를 닫고 트리거로 포커스를 돌려준다 — 키보드로 되돌아갈 곳이 필요하다 */
  function close() {
    setPosition(null);
    triggerRef.current?.focus();
  }

  /** 여는 순간의 트리거 위치에서 좌표를 잡는다 — 아래가 좁으면 위로 펼친다 */
  function open() {
    const rect = triggerRef.current?.getBoundingClientRect();
    if (!rect) return;

    const height = items.length * MENU_ITEM_HEIGHT + MENU_PADDING;
    const opensUp = window.innerHeight - rect.bottom < height + 8;

    setPosition({
      top: opensUp ? Math.max(8, rect.top - height - 4) : rect.bottom + 4,
      // 오른쪽 끝을 트리거에 맞추되 화면 밖으로 나가지 않게 한다
      left: Math.max(8, rect.right - MENU_WIDTH),
    });
  }

  useEffect(() => {
    if (!isOpen) return;

    function dismiss() {
      setPosition(null);
    }
    // 스크롤은 사이드바 안쪽에서도 일어나므로 캡처 단계에서 받는다
    document.addEventListener('scroll', dismiss, true);
    window.addEventListener('resize', dismiss);

    return () => {
      document.removeEventListener('scroll', dismiss, true);
      window.removeEventListener('resize', dismiss);
    };
  }, [isOpen]);

  /**
   * 항목 사이를 화살표로 옮긴다 (WAI-ARIA 메뉴 패턴).
   *
   * Tab 만으로도 닿기는 하지만, 메뉴는 **위아래로 훑는 것**이 표준 동작이다.
   * 끝에서 한 번 더 누르면 반대쪽으로 돌아간다 — 목록이 짧아 되돌아가는 편이 빠르다.
   */
  function focusItem(step: 1 | -1) {
    const buttons = menuRef.current?.querySelectorAll('[role="menuitem"]');
    if (!buttons?.length) return;

    const current = Array.from(buttons).indexOf(
      document.activeElement as Element,
    );
    // 아직 항목에 없으면(트리거에 포커스) 방향에 맞는 끝에서 시작한다
    const next =
      current === -1
        ? step === 1
          ? 0
          : buttons.length - 1
        : (current + step + buttons.length) % buttons.length;

    (buttons[next] as HTMLElement).focus();
  }

  return (
    <span
      className="relative shrink-0"
      onKeyDown={(event) => {
        if (!isOpen) return;

        // 팝업 메뉴는 Esc 로 닫히는 것이 표준 동작이다
        if (event.key === 'Escape') {
          event.stopPropagation();
          close();
          return;
        }
        if (event.key === 'ArrowDown' || event.key === 'ArrowUp') {
          // 화살표로 목록을 훑는 동안 뒤 화면이 스크롤되면 안 된다
          event.preventDefault();
          event.stopPropagation();
          focusItem(event.key === 'ArrowDown' ? 1 : -1);
        }
      }}
    >
      <button
        ref={triggerRef}
        type="button"
        aria-label={`${label} 메뉴`}
        aria-haspopup="menu"
        aria-expanded={isOpen}
        onPointerEnter={onOpen}
        onClick={() => {
          if (isOpen) {
            setPosition(null);
            return;
          }
          onOpen?.();
          open();
        }}
        className={`flex size-5 cursor-pointer items-center justify-center rounded-button-sm hover:bg-black/5 focus-visible:opacity-100 ${
          isOpen ? 'opacity-100' : `opacity-0 ${revealClass}`
        }`}
      >
        <MoreIcon />
      </button>

      {position &&
        createPortal(
          <>
            {/* 바깥을 누르면 닫히도록 덮개를 깐다 */}
            <button
              type="button"
              tabIndex={-1}
              aria-label="메뉴 닫기"
              onClick={() => setPosition(null)}
              className="fixed inset-0 z-40 cursor-default"
            />
            <div
              ref={menuRef}
              role="menu"
              style={{
                top: position.top,
                left: position.left,
                width: MENU_WIDTH,
              }}
              className="fixed z-50 flex flex-col overflow-hidden rounded-lg border border-border-default bg-bg-card py-1 shadow-lg"
            >
              {items.map((item) => (
                <button
                  key={item.label}
                  type="button"
                  role="menuitem"
                  onClick={() => {
                    close();
                    item.onSelect();
                  }}
                  className={`flex cursor-pointer items-center gap-2 px-3 py-1.5 text-left text-detail font-medium whitespace-nowrap ${
                    item.danger
                      ? 'text-text-danger hover:bg-red-bg-soft'
                      : 'text-text-primary hover:bg-bg-surface'
                  }`}
                >
                  {item.icon}
                  {item.label}
                </button>
              ))}
            </div>
          </>,
          document.body,
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
    {
      key: 'inProgress',
      count: step.inProgressIssueCount,
      className: STEP_STATUS_BG.IN_PROGRESS,
    },
    { key: 'done', count: step.doneIssueCount, className: STEP_STATUS_BG.DONE },
    {
      key: 'notStarted',
      count: notStarted,
      className: STEP_STATUS_BG.NOT_STARTED,
    },
  ];

  // 이슈가 하나도 없으면 빈 바로 둔다
  if (step.totalIssueCount === 0) {
    return <div className="h-1.5 rounded-pill bg-btn-gray-bg-hover" />;
  }

  return (
    <div className="flex h-1.5 overflow-hidden rounded-pill">
      {/*
        0인 구간도 지우지 않고 폭 0으로 둔다 — DOM 에서 빼면 이슈 상태가 바뀔 때
        막대가 끊겼다 나타나 깜빡인다. 대신 비율만 부드럽게 전환한다.
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

function Legend() {
  return (
    <div className="flex items-center justify-between px-4 pt-1 text-caption">
      <span className="text-text-secondary">* 스텝별 이슈 진척률</span>
      <span className="flex items-center gap-2">
        <LegendItem
          dotClass={STEP_STATUS_BG.IN_PROGRESS}
          textClass="text-yellow-text"
          label="진행 중"
        />
        <LegendItem
          dotClass={STEP_STATUS_BG.DONE}
          textClass="text-green-text"
          label="완료"
        />
        <LegendItem
          dotClass={STEP_STATUS_BG.NOT_STARTED}
          textClass="text-text-secondary"
          label="진행 전"
        />
      </span>
    </div>
  );
}

function LegendItem({
  dotClass,
  textClass,
  label,
}: {
  dotClass: string;
  textClass: string;
  label: string;
}) {
  return (
    <span className="flex items-center gap-1">
      <span aria-hidden className={`size-2 rounded-pill ${dotClass}`} />
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
      className={`size-4 shrink-0 text-text-muted transition-transform ${
        isOpen ? 'rotate-90' : ''
      }`}
    >
      <path d="m9 5 7 7-7 7" />
    </Svg>
  );
}

/**
 * 사이드바 접기 · 펼치기 아이콘.
 * 화살표가 **일어날 일**을 가리킨다 — 접을 때는 왼쪽, 펼칠 때는 오른쪽.
 */
function PanelIcon({ direction }: { direction: 'left' | 'right' }) {
  return (
    <Svg strokeWidth={1.6} className="size-4 text-text-secondary">
      <rect x="3" y="3" width="18" height="18" rx="2" />
      <path d="M9 3v18" />
      <path d={direction === 'left' ? 'm16 9-3 3 3 3' : 'm13 9 3 3-3 3'} />
    </Svg>
  );
}

function CalendarIcon() {
  return (
    <Svg strokeWidth={1.6}>
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
    <Svg className="size-3 shrink-0 text-text-secondary">
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

/** 진행중으로 — 재생 삼각형 */
function PlayIcon() {
  return (
    <Svg className="size-3 shrink-0">
      <path d="M8 5.5v13l10-6.5z" />
    </Svg>
  );
}

/** 권한 관리 — 열쇠. 자물쇠(잠금)와 달리 "누구에게 열어줄지" 를 정하는 자리다 */
function KeyIcon() {
  return (
    <Svg className="size-3 shrink-0">
      <circle cx="8" cy="15" r="4" />
      <path d="m11 12 9-9M17.5 5.5l2 2M14.5 8.5l2 2" />
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
    <Svg strokeWidth={1.6} className="size-4 shrink-0 text-text-secondary">
      <circle cx="12" cy="7" r="4" />
      <path d="M3 21a9 9 0 0 1 18 0" />
    </Svg>
  );
}

/** 공통 사이드바(`MenuIcon` 의 `settings`)와 같은 톱니바퀴다 — 두 곳이 달라 보이면 안 된다 */
function SettingsIcon() {
  return (
    <Svg strokeWidth={1.6} className="size-4 shrink-0 text-text-secondary">
      <circle cx="12" cy="12" r="3" />
      <path d="M19.4 15a1.7 1.7 0 0 0 .3 1.9l.1.1a2 2 0 1 1-2.8 2.8l-.1-.1a1.7 1.7 0 0 0-2.9 1.2v.1a2 2 0 1 1-4 0v-.2a1.7 1.7 0 0 0-3-1.2l-.1.1a2 2 0 1 1-2.8-2.8l.1-.1a1.7 1.7 0 0 0-1.2-2.9H3a2 2 0 1 1 0-4h.2a1.7 1.7 0 0 0 1.2-3l-.1-.1a2 2 0 1 1 2.8-2.8l.1.1a1.7 1.7 0 0 0 2.9-1.2V3a2 2 0 1 1 4 0v.2a1.7 1.7 0 0 0 3 1.2l.1-.1a2 2 0 1 1 2.8 2.8l-.1.1a1.7 1.7 0 0 0 1.2 2.9H21a2 2 0 1 1 0 4h-.2a1.7 1.7 0 0 0-1.5 1z" />
    </Svg>
  );
}
