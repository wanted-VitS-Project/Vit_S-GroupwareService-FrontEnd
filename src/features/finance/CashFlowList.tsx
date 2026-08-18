'use client';

import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { useEffect, useMemo, useState } from 'react';

import { AlertDialogTwoButton, DialogIcons } from '@/components/AlertDialog';
import Breadcrumb from '@/components/Breadcrumb';
import DataTable, { type DataTableColumn } from '@/components/DataTable';
import PageTitle from '@/components/PageTitle';
import Pagination from '@/components/Pagination';
import LoadingSpinner from '@/components/Spinner';
import { notifyToast } from '@/components/Toast';
import { messageOf } from '@/lib/api';
import { formatDateTime } from '@/lib/format';
import { useModalTarget } from '@/lib/useModal';
import { dateInputProps } from '@/lib/dateInput';

import {
  deleteCashFlows,
  getCashFlowFilterOptions,
  getCashFlows,
  updateCashFlowExclusion,
} from './api';
import CashFlowFormModal, {
  type CashFlowFormTarget,
} from './CashFlowFormModal';
import { FINANCE_ROUTES } from './routes';
import {
  CASH_FLOW_AMOUNT_COLOR,
  CASH_FLOW_LINK_BADGE,
  CASH_FLOW_TYPE_BADGE,
  formatAmount,
} from './display';
import {
  CASH_FLOW_LINK_STATUS_LABELS,
  CASH_FLOW_SOURCE_LABELS,
  CASH_FLOW_TYPE_LABELS,
  type CashFlowItem,
  type CashFlowListQuery,
  type CashFlowSkippedItem,
  type CashFlowSource,
  type CashFlowType,
  type ProjectOption,
} from './types';

/** 한 페이지 20건. 세금계산서 목록과 같은 값이다 */
const PAGE_SIZE = 20;

const TYPE_OPTIONS: CashFlowType[] = ['INCOME', 'OUTCOME'];
const SOURCE_OPTIONS: CashFlowSource[] = ['MANUAL', 'CSV', 'API'];

/** URL 은 사용자가 손댈 수 있다 — 허용된 값이 아니면 필터가 없는 것으로 본다 */
function pickOption<T extends string>(value: string | null, options: T[]) {
  return options.find((option) => option === value);
}

/** 음수 · 소수 · 문자열이 그대로 서버로 가면 400 이 되어 목록이 실패 화면이 된다 */
function pickInt(value: string | null, min: number) {
  const parsed = Number(value);
  return Number.isInteger(parsed) && parsed >= min ? parsed : undefined;
}

/** `yyyy-MM-dd` 형태만 서버로 보낸다 (date 인풋 값이지만 URL 로도 들어온다) */
function pickDate(value: string | null) {
  return value && /^\d{4}-\d{2}-\d{2}$/.test(value) ? value : undefined;
}

/**
 * 입출금 내역 목록 화면. (#12)
 * 구분 · 출처는 서버 필터가 없어 지금 페이지 안에서만 걸러지고, 표 위에 그 사실을 적는다.
 */
export default function CashFlowList() {
  const router = useRouter();
  const searchParams = useSearchParams();

  /**
   * URL 이 필터의 원본이다. 서버 조건은 값 하나하나로 풀어 둬야
   * 화면 필터만 바꿨을 때 같은 목록을 다시 요청하지 않는다.
   */
  const startDate = pickDate(searchParams.get('startDate'));
  const endDate = pickDate(searchParams.get('endDate'));
  const unlinked = searchParams.get('unlinked') === 'true' || undefined;
  const projectId = pickInt(searchParams.get('projectId'), 1);
  const keyword = searchParams.get('keyword') ?? undefined;
  /** 0 페이지가 기본이다. 이상한 값이 오면 첫 페이지로 본다 */
  const page = pickInt(searchParams.get('page'), 0) ?? 0;

  /** 값이 그대로면 같은 객체를 유지한다 — 조회 효과가 헛돌지 않게 */
  const query = useMemo<CashFlowListQuery>(
    () => ({
      startDate,
      endDate,
      unlinked,
      projectId,
      keyword,
      page,
      size: PAGE_SIZE,
    }),
    [startDate, endDate, unlinked, projectId, keyword, page],
  );

  /** 화면에서만 거르는 조건 — 서버에 없다 */
  const clientType = pickOption(searchParams.get('type'), TYPE_OPTIONS);
  const clientSource = pickOption(searchParams.get('source'), SOURCE_OPTIONS);

  /** 입력 중인 검색어 — 제출해야 URL 에 반영된다 */
  const [keywordInput, setKeywordInput] = useState(keyword ?? '');
  const [syncedKeyword, setSyncedKeyword] = useState(keyword ?? '');

  // 뒤로가기나 검색어가 담긴 링크로 들어오면 URL 만 바뀌고 입력값은 옛것이 남는다
  if (syncedKeyword !== (keyword ?? '')) {
    setSyncedKeyword(keyword ?? '');
    setKeywordInput(keyword ?? '');
  }

  const [reloadCount, setReloadCount] = useState(0);
  /** 어떤 요청의 결과인지 `key` 로 들고 있는다 — 조건이 바뀌면 자동으로 로딩 상태가 된다 */
  const [result, setResult] = useState<{
    key: string;
    data?: CashFlowItem[];
    /** 서버가 센 전체 건수 · 쪽수. 목록 길이로 대신하면 한 쪽 분량만 세게 된다 */
    totalElements?: number;
    totalPages?: number;
    hasFailed?: boolean;
  } | null>(null);

  const [projects, setProjects] = useState<ProjectOption[]>([]);

  /** 등록 · 수정 모달. 대상 하나로 여닫이까지 대신한다 */
  const formModal = useModalTarget<CashFlowFormTarget>();

  /** 다건 처리 대상. 안 보이는 건이 지워지지 않게 목록이 바뀌면 비운다 */
  const [selectedIds, setSelectedIds] = useState<number[]>([]);
  /** 선택이 어느 조회 결과의 것인지 — 조건이 바뀌면 선택을 비우는 기준이다 */
  const [selectedKey, setSelectedKey] = useState('');
  /** 삭제 확인 — 대상이 있어야 열린다 */
  const deleteConfirm = useModalTarget<number[]>();
  const [isBusy, setIsBusy] = useState(false);

  /** 서버 조건만 요청 키에 넣는다 — 화면 필터로 다시 조회하면 결과는 같고 요청만 는다 */
  const requestKey = [
    reloadCount,
    startDate,
    endDate,
    unlinked,
    projectId,
    keyword,
    page,
  ].join(' ');

  const current = result?.key === requestKey ? result : null;
  /** 재조회 중에는 직전 결과를 유지한다 — 목록이 통째로 사라지면 스크롤이 튄다 */
  const received = current?.data ?? result?.data ?? null;
  const hasFailed = current?.hasFailed ?? false;
  const isLoading = current === null && !hasFailed;
  /** 재조회 중에도 직전 쪽수를 유지한다. 페이지 줄이 사라졌다 나타나면 화면이 튄다 */
  const totalElements = current?.totalElements ?? result?.totalElements;
  const totalPages = current?.totalPages ?? result?.totalPages ?? 0;

  useEffect(() => {
    const controller = new AbortController();
    const { signal } = controller;

    getCashFlows(query, signal)
      .then((data) =>
        setResult({
          key: requestKey,
          data: data.cashFlows,
          totalElements: data.totalElements,
          totalPages: data.totalPages,
        }),
      )
      .catch(() => {
        // 취소는 실패가 아니다
        if (!signal.aborted) setResult({ key: requestKey, hasFailed: true });
      });

    return () => controller.abort();
    // `query` 는 서버 조건이 그대로면 같은 객체다 — 화면 필터로는 다시 돌지 않는다
  }, [requestKey, query]);

  /** 프로젝트 셀렉트 — 목록과 달리 한 번만 받는다. 실패해도 화면은 그대로 쓴다 */
  useEffect(() => {
    const controller = new AbortController();
    const { signal } = controller;

    getCashFlowFilterOptions(signal)
      .then((options) => setProjects(options.projects))
      .catch(() => {
        // 셀렉트 하나 때문에 목록 화면을 오류로 덮지 않는다
      });

    return () => controller.abort();
  }, []);

  /**
   * 목록이 갈리면 선택도 비운다 — 안 보이는 건이 남으면 `삭제` 가 그 행까지 지운다.
   */
  if (selectedKey !== requestKey) {
    setSelectedKey(requestKey);
    setSelectedIds([]);
  }

  /** 화면 필터는 받아온 목록에서 거른다 */
  const rows = useMemo(() => {
    if (received === null) return null;

    return received.filter(
      (row) =>
        (clientType === undefined || row.type === clientType) &&
        (clientSource === undefined || row.sourceType === clientSource),
    );
  }, [received, clientType, clientSource]);

  /**
   * 다건 처리 결과 안내. 부분 성공이 정상 동작이라 빠진 건의 사유까지 알린다.
   */
  function reportBulk(
    done: string,
    result: { count: number; skippedItems: CashFlowSkippedItem[] },
  ) {
    const skipped = result.skippedItems.length;

    if (skipped === 0) {
      notifyToast(`${result.count}건을 ${done}했습니다.`);
      return;
    }

    // 사유는 서버 문구가 가장 정확하다. 여러 건이면 첫 사유만 대표로 싣는다
    const reason = result.skippedItems[0].reason;

    // 한 건도 처리되지 않았으면 성공 문구를 붙이지 않는다 (`0건을 …했습니다` 는 어색하다)
    notifyToast(
      result.count === 0
        ? `${skipped}건을 처리하지 못했습니다. ${reason}`
        : `${result.count}건을 ${done}했습니다. ${skipped}건은 처리하지 못했습니다. ${reason}`,
      'error',
    );
  }

  /** 다건 처리 공통 — 끝나면 선택을 비우고 목록을 다시 읽는다 */
  async function runBulk(
    done: string,
    run: () => Promise<{ count: number; skippedItems: CashFlowSkippedItem[] }>,
  ) {
    if (isBusy) return;
    setIsBusy(true);

    try {
      reportBulk(done, await run());
      setSelectedIds([]);
      setReloadCount((count) => count + 1);
    } catch (caught) {
      notifyToast(messageOf(caught, '처리하지 못했습니다.'), 'error');
    } finally {
      setIsBusy(false);
      deleteConfirm.close();
    }
  }

  const visibleIds = rows?.map((row) => row.cashFlowId) ?? [];
  const isAllSelected =
    visibleIds.length > 0 && visibleIds.every((id) => selectedIds.includes(id));

  const columns = useMemo(
    () =>
      buildColumns({
        selectedIds,
        isAllSelected,
        onToggle: (id) =>
          setSelectedIds((prev) =>
            prev.includes(id)
              ? prev.filter((item) => item !== id)
              : [...prev, id],
          ),
        onToggleAll: () => setSelectedIds(isAllSelected ? [] : visibleIds),
      }),
    // `visibleIds` 는 매 렌더 새 배열이라 넣으면 열이 매번 다시 만들어진다.
    // 값이 바뀌는 순간은 `rows` 가 바뀔 때뿐이므로 그것만 본다
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [selectedIds, isAllSelected, rows],
  );

  /** 필터를 바꾸면 URL 만 갈아끼운다. 3페이지에서 조건을 바꾸면 빈 화면이라 첫 장으로 돌린다 */
  function applyFilter(patch: Record<string, string | undefined>) {
    const next = new URLSearchParams(searchParams.toString());

    for (const [key, value] of Object.entries(patch)) {
      if (value) next.set(key, value);
      else next.delete(key);
    }
    next.delete('page');

    router.replace(next.toString() ? `?${next}` : '?');
  }

  /** 페이지만 갈아끼운다. 나머지 조건은 그대로 둔다 */
  function movePage(next: number) {
    const params = new URLSearchParams(searchParams.toString());

    if (next > 0) params.set('page', String(next));
    else params.delete('page');

    router.replace(params.toString() ? `?${params}` : '?');
  }

  const hasFilter = [...searchParams.keys()].length > 0;

  return (
    <>
      {/* 액션 버튼은 제목 줄 오른쪽에 둔다 — 필터 바에 섞으면 다음 줄로 밀린다 */}
      <Breadcrumb
        items={[
          { label: '재무 관리', href: FINANCE_ROUTES.hub },
          { label: '입출금 내역' },
        ]}
      />

      <PageTitle
        title="입출금 내역"
        description="입출금을 등록·조회하고 정산 블록에 연결합니다."
      >
        <div className="flex shrink-0 gap-2">
          <Link
            href={FINANCE_ROUTES.cashFlowImport}
            className="btn btn-sm btn-primary-outlined"
          >
            CSV 등록
          </Link>
          <button
            type="button"
            onClick={() => formModal.open('create')}
            className="btn btn-sm btn-primary"
          >
            입출금 등록
          </button>
        </div>
      </PageTitle>

      <CashFlowFilterBar
        searchParams={searchParams}
        projects={projects}
        keywordInput={keywordInput}
        onKeywordChange={setKeywordInput}
        onApply={applyFilter}
      />

      {selectedIds.length > 0 && (
        <div className="mb-3 flex flex-wrap items-center gap-2 rounded-base border border-border-primary bg-blue-bg-soft px-5 py-3">
          <span className="text-caption font-semibold text-text-primary">
            {selectedIds.length}건 선택됨
          </span>

          <div className="ml-auto flex flex-wrap gap-2">
            <button
              type="button"
              disabled={isBusy}
              onClick={() =>
                runBulk('연결 대상에서 제외', () =>
                  updateCashFlowExclusion(selectedIds, true),
                )
              }
              className="btn btn-sm btn-gray-outlined"
            >
              연결 제외
            </button>
            <button
              type="button"
              disabled={isBusy}
              onClick={() =>
                runBulk('제외 취소', () =>
                  updateCashFlowExclusion(selectedIds, false),
                )
              }
              className="btn btn-sm btn-gray-outlined"
            >
              제외 취소
            </button>
            <button
              type="button"
              disabled={isBusy}
              onClick={() => deleteConfirm.open(selectedIds)}
              className="btn btn-sm btn-danger"
            >
              삭제
            </button>
          </div>
        </div>
      )}

      {/* 서버가 센 전체 건수를 적는다. 목록 길이는 지금 쪽 분량이라 총 건수가 아니다 */}
      <div className="mb-2 flex flex-wrap items-baseline justify-between gap-1">
        <p className="text-caption text-text-secondary">
          총 {(totalElements ?? 0).toLocaleString('ko-KR')}건
        </p>
        {/* 서버 조건이 아니라 지금 쪽에서만 걸러진다. 오해하지 않게 적는다 */}
        {(clientType !== undefined || clientSource !== undefined) && (
          <p className="text-caption break-keep text-text-secondary">
            구분 · 출처는 이 페이지 안에서만 거릅니다.
          </p>
        )}
      </div>

      {/*
        첫 조회 중에는 표를 그리지 않는다 — 몇 줄이 올지 모르는 채로 깔면
        결과가 적을 때 표가 떴다가 줄어들며 화면이 튄다.
      */}
      {isLoading && !rows && !hasFailed ? (
        <LoadingSpinner label="입출금 내역을 불러오는 중" className="py-20" />
      ) : (
        <DataTable
          caption="입출금 내역 목록"
          /* `loadingLabel` 을 주지 않는다 — 첫 조회는 위 스피너, 재조회는 직전 목록이 맡는다 */
          columns={columns}
          rows={hasFailed ? [] : (rows ?? [])}
          rowKey={(row) => row.cashFlowId}
          onRowClick={(row) =>
            router.push(FINANCE_ROUTES.cashFlowDetail(row.cashFlowId))
          }
          // 열이 10개다 — 여백을 줄여(`dense`) 가로 스크롤 없이 담는다
          dense
          skeletonRows={10}
          rowClassName={(row) => (row.isExcluded ? 'opacity-60' : '')}
          errorMessage={
            hasFailed ? '입출금 내역을 불러오지 못했습니다.' : undefined
          }
          onRetry={() => setReloadCount((count) => count + 1)}
          emptyMessage={
            hasFilter
              ? '조건에 맞는 입출금 내역이 없습니다.'
              : '아직 등록된 입출금 내역이 없습니다.'
          }
          emptyAction={
            hasFilter && (
              <button
                type="button"
                onClick={() => router.replace('?')}
                className="btn btn-sm btn-gray-outlined"
              >
                필터 초기화
              </button>
            )
          }
        />
      )}

      {totalPages > 1 && (
        <div className="mt-3 overflow-hidden rounded-base border border-border-default bg-bg-card">
          <Pagination page={page} totalPages={totalPages} onChange={movePage} />
        </div>
      )}

      {deleteConfirm.target && (
        <AlertDialogTwoButton
          icon={DialogIcons.danger}
          title={`${deleteConfirm.target.length}건을 삭제할까요?`}
          description="삭제한 내역은 되돌릴 수 없습니다. 정산 블록에 연결된 건은 삭제되지 않고 그대로 남습니다."
          confirmLabel="삭제"
          isDanger
          isBusy={isBusy}
          onConfirm={() => {
            const targets = deleteConfirm.target ?? [];
            void runBulk('삭제', () => deleteCashFlows(targets));
          }}
          onCancel={deleteConfirm.close}
        />
      )}

      {formModal.target && (
        <CashFlowFormModal
          target={formModal.target}
          onClose={formModal.close}
          onSaved={() => {
            formModal.close();
            // 저장 결과가 목록 조건에 맞는지는 서버만 안다 — 통째로 다시 읽는다
            setReloadCount((count) => count + 1);
          }}
        />
      )}
    </>
  );
}

/**
 * 열 정의. 폭 합계는 100% 여야 한다 (`DataTable` 이 개발 모드에서 검사한다).
 * 행 메뉴가 핸들러를 써야 해서 상수가 아니라 함수로 둔다.
 */
function buildColumns({
  selectedIds,
  isAllSelected,
  onToggle,
  onToggleAll,
}: {
  selectedIds: number[];
  isAllSelected: boolean;
  onToggle: (cashFlowId: number) => void;
  onToggleAll: () => void;
}): DataTableColumn<CashFlowItem>[] {
  return [
    {
      key: 'select',
      header: (
        <input
          type="checkbox"
          checked={isAllSelected}
          onChange={onToggleAll}
          aria-label="전체 선택"
          className="size-3.5 cursor-pointer accent-btn-primary"
        />
      ),
      width: '4%',
      skeletonWidth: 'w-4',
      // 칸 자체에 동작이 있어 행 클릭으로 새지 않게 막는다
      stopRowClick: true,
      cell: (row) => (
        <input
          type="checkbox"
          checked={selectedIds.includes(row.cashFlowId)}
          onChange={() => onToggle(row.cashFlowId)}
          aria-label={`${row.depositorName} 내역 선택`}
          className="size-3.5 cursor-pointer accent-btn-primary"
        />
      ),
    },
    {
      key: 'tradedAt',
      header: '거래일시',
      width: '12%',
      skeletonWidth: 'w-28',
      // 날짜 · 시각을 한 줄에 둔다 — 행 높이를 한 줄로 못 박아 헤더와 어긋나지 않게 한다
      cell: (row) => (
        <span className="block whitespace-nowrap text-text-secondary">
          {formatDateTime(row.tradedAt) || '-'}
        </span>
      ),
    },
    {
      key: 'type',
      header: '구분',
      width: '6%',
      skeletonWidth: 'w-10',
      cell: (row) => (
        <span className={CASH_FLOW_TYPE_BADGE[row.type]}>
          {CASH_FLOW_TYPE_LABELS[row.type]}
        </span>
      ),
    },
    {
      key: 'amount',
      header: '금액',
      width: '10%',
      /** 금액은 오른쪽 정렬이라 자릿수가 세로로 맞는다. 열을 1%p 넉넉히 잡는다 */
      align: 'right',
      skeletonWidth: 'w-20',
      // 출금은 금액도 빨갛게 — 통장처럼 나가는 돈이 바로 보여야 한다
      cell: (row) => (
        <span
          // `tabular-nums` — 숫자 폭이 같아져 자릿수가 반듯하게 맞는다
          className={`block font-semibold tabular-nums ${CASH_FLOW_AMOUNT_COLOR[row.type]}`}
        >
          {formatAmount(row.amount)}
        </span>
      ),
    },
    {
      key: 'depositorName',
      /** 헤더와 칸에 같은 왼쪽 여백을 준다 — 앞 열이 오른쪽 정렬이라 붙어 보인다 */
      header: <span className="block pl-3">입금자명</span>,
      width: '13%',
      skeletonWidth: 'w-24',
      /** 링크 클릭이 행 클릭으로 번지면 같은 이동이 두 번 일어난다 */
      stopRowClick: true,
      /** 행 클릭만으로는 키보드로 갈 수 없다 — 칸 안에 링크를 함께 둔다 */
      cell: (row) => (
        <Link
          href={FINANCE_ROUTES.cashFlowDetail(row.cashFlowId)}
          className="wrap:anywhere block pl-3 font-semibold break-keep text-text-primary hover:underline"
        >
          {row.depositorName || '-'}
        </Link>
      ),
    },
    {
      key: 'bankMemo',
      header: '적요',
      width: '11%',
      skeletonWidth: 'w-32',
      cell: (row) => (
        <span className="wrap:anywhere block break-keep text-text-secondary">
          {row.bankMemo || '-'}
        </span>
      ),
    },
    {
      key: 'sourceType',
      header: '출처',
      width: '9%',
      skeletonWidth: 'w-14',
      cell: (row) => (
        <span className="block break-keep text-text-secondary">
          {CASH_FLOW_SOURCE_LABELS[row.sourceType]}
        </span>
      ),
    },
    {
      key: 'linkStatus',
      header: '연결',
      width: '11%',
      skeletonWidth: 'w-14',
      cell: (row) => (
        <span className="flex flex-wrap items-center gap-1">
          <span className={CASH_FLOW_LINK_BADGE[row.linkStatus]}>
            {CASH_FLOW_LINK_STATUS_LABELS[row.linkStatus]}
          </span>
          {row.isExcluded && <span className="badge badge-gray">제외</span>}
        </span>
      ),
    },
    {
      /** 배지와 글자를 다른 칸으로 나눈다 — 한 칸에 두면 줄마다 시작점이 어긋난다 */
      key: 'linkDetail',
      header: '연결 정보',
      width: '24%',
      skeletonWidth: 'w-40',
      cell: (row) => <LinkDetailCell row={row} />,
    },
  ];
}

/**
 * 연결 칸. 블록이 삭제된 건은 `roundName` 이 남아 있어도 유효한 연결이 아니라
 * 이름 대신 배지로만 알린다.
 */
function LinkDetailCell({ row }: { row: CashFlowItem }) {
  if (row.linkStatus === 'UNLINKED') {
    return <span className="text-text-muted">-</span>;
  }

  return (
    /** 위는 무엇에 붙었는지, 아래는 누가 언제 붙였는지 (배지는 옆 칸으로 뺐다) */
    <span className="block">
      <span className="wrap:anywhere block break-keep text-text-secondary">
        {[row.projectName, row.roundName].filter(Boolean).join(' · ') || '-'}
      </span>
      <span className="mt-0.5 block text-detail break-keep text-text-muted">
        {row.linkedByName ?? '-'} · {formatDateTime(row.linkedAt) || '-'}
      </span>
    </span>
  );
}

/** 필터 바. 값의 원본은 URL 이고 검색어만 예외로 상태를 든다 */
function CashFlowFilterBar({
  searchParams,
  projects,
  keywordInput,
  onKeywordChange,
  onApply,
}: {
  searchParams: URLSearchParams;
  projects: ProjectOption[];
  keywordInput: string;
  onKeywordChange: (value: string) => void;
  onApply: (patch: Record<string, string | undefined>) => void;
}) {
  const isUnlinked = searchParams.get('unlinked') === 'true';

  return (
    <form
      onSubmit={(event) => {
        event.preventDefault();
        onApply({ keyword: keywordInput.trim() || undefined });
      }}
      className="mb-4 flex flex-wrap items-center gap-2"
    >
      <DateInput
        label="거래일 시작"
        value={searchParams.get('startDate') ?? ''}
        onChange={(value) => onApply({ startDate: value })}
      />
      <span className="text-caption text-text-muted">~</span>
      <DateInput
        label="거래일 종료"
        value={searchParams.get('endDate') ?? ''}
        onChange={(value) => onApply({ endDate: value })}
      />

      <SelectFilter
        label="구분"
        value={searchParams.get('type') ?? ''}
        options={TYPE_OPTIONS.map((option) => ({
          value: option,
          label: CASH_FLOW_TYPE_LABELS[option],
        }))}
        placeholder="구분 전체"
        onChange={(value) => onApply({ type: value })}
      />

      <SelectFilter
        label="출처"
        value={searchParams.get('source') ?? ''}
        options={SOURCE_OPTIONS.map((option) => ({
          value: option,
          label: CASH_FLOW_SOURCE_LABELS[option],
        }))}
        placeholder="출처 전체"
        onChange={(value) => onApply({ source: value })}
      />

      {/* 옵션이 온 뒤에 그리지 않는다 — 칸이 나중에 생기면 필터 바가 늘어나며 밀린다 */}
      <SelectFilter
        label="프로젝트"
        value={searchParams.get('projectId') ?? ''}
        options={projects.map((project) => ({
          value: String(project.projectId),
          label: project.projectName,
        }))}
        placeholder="프로젝트 전체"
        width="w-44"
        disabled={projects.length === 0}
        onChange={(value) => onApply({ projectId: value })}
      />

      {/* 토글은 값이 하나뿐이라 켜면 `true`, 끄면 파라미터 자체를 뺀다 */}
      <button
        type="button"
        aria-pressed={isUnlinked}
        onClick={() => onApply({ unlinked: isUnlinked ? undefined : 'true' })}
        className={`h-9 shrink-0 cursor-pointer rounded-lg border px-3 text-caption font-semibold ${
          isUnlinked
            ? 'border-border-primary bg-blue-bg-soft text-text-primary-blue'
            : 'border-border-default text-text-secondary hover:bg-bg-hover'
        }`}
      >
        미연결
      </button>

      <div className="relative w-56 shrink-0">
        <label htmlFor="cashFlowSearch" className="sr-only">
          적요 · 입금자명 검색
        </label>
        <input
          id="cashFlowSearch"
          type="search"
          value={keywordInput}
          onChange={(event) => onKeywordChange(event.target.value)}
          placeholder="적요 · 입금자명 검색"
          className="h-9 w-full rounded-lg border border-border-default pr-10 pl-3 text-caption text-text-primary placeholder:text-text-secondary focus:outline-2 focus:outline-offset-2 focus:outline-border-primary"
        />
        <button
          type="submit"
          aria-label="검색"
          className="absolute top-1/2 right-1 flex size-7 -translate-y-1/2 cursor-pointer items-center justify-center rounded-md text-text-secondary hover:bg-bg-hover hover:text-text-primary"
        >
          <SearchIcon />
        </button>
      </div>
    </form>
  );
}

/** 조건 셀렉트. 빈 값은 '전체' 라 파라미터 자체를 뺀다 */
function SelectFilter({
  label,
  value,
  options,
  placeholder,
  width = 'w-32',
  disabled = false,
  onChange,
}: {
  label: string;
  value: string;
  options: { value: string; label: string }[];
  placeholder: string;
  width?: string;
  /** 고를 것이 아직 없을 때 — 자리는 두고 잠근다 */
  disabled?: boolean;
  onChange: (value: string | undefined) => void;
}) {
  return (
    <label className="shrink-0">
      <span className="sr-only">{label}</span>
      <select
        value={value}
        disabled={disabled}
        onChange={(event) => onChange(event.target.value || undefined)}
        className={`h-9 ${width} rounded-lg border border-border-default px-2 text-caption text-text-primary focus:outline-2 focus:outline-offset-2 focus:outline-border-primary disabled:opacity-60`}
      >
        <option value="">{placeholder}</option>
        {options.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
    </label>
  );
}

function DateInput({
  label,
  value,
  onChange,
}: {
  label: string;
  value: string;
  onChange: (value: string | undefined) => void;
}) {
  return (
    <label className="flex items-center">
      <span className="sr-only">{label}</span>
      <input
        type="date"
        {...dateInputProps('date')}
        value={value}
        aria-label={label}
        onChange={(event) => onChange(event.target.value || undefined)}
        className="h-9 w-36 cursor-pointer rounded-lg border border-border-default px-3 text-caption text-text-primary focus:outline-2 focus:outline-offset-2 focus:outline-border-primary"
      />
    </label>
  );
}

/** 공고 목록 · 사원 목록과 같은 아이콘 — 검색바 모양을 화면마다 다르게 두지 않는다 */
function SearchIcon() {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      aria-hidden
      className="size-4"
    >
      <circle cx="11" cy="11" r="7" />
      <path d="m20 20-3.5-3.5" />
    </svg>
  );
}
