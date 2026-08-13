'use client';

import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';

import { AlertDialogTwoButton, DialogIcons } from '@/components/AlertDialog';
import Breadcrumb from '@/components/Breadcrumb';
import { ErrorStateTwoButton } from '@/components/ErrorState';
import { Skeleton, SkeletonGroup } from '@/components/Skeleton';
import { notifyToast } from '@/components/Toast';
import { notifyBlockChanged } from '@/features/block/events';
import { messageOf } from '@/lib/api';
import { formatDateTime } from '@/lib/format';
import { useModal } from '@/lib/useModal';

import { deleteCashFlows, getCashFlows, unmatchCashFlow } from './api';
import CashFlowFormModal from './CashFlowFormModal';
import CashFlowMatchModal from './CashFlowMatchModal';
import {
  CASH_FLOW_AMOUNT_COLOR,
  CASH_FLOW_LINK_BADGE,
  CASH_FLOW_TYPE_BADGE,
  formatAmount,
} from './display';
import { FINANCE_ROUTES } from './routes';
import {
  CASH_FLOW_LINK_STATUS_LABELS,
  CASH_FLOW_SOURCE_LABELS,
  CASH_FLOW_TYPE_LABELS,
  type CashFlowItem,
} from './types';

/**
 * 입출금 내역 상세. (#12)
 *
 * ⚠️ **단건 조회 API 가 없다** — 목록을 받아 그 안에서 찾는다. 목록에 페이징이 없어
 *    가능한 방법이고, 생기면 이 함수만 바꾸면 된다.
 *
 * 목록 표에 두기 어려운 값(거래고유번호 · 매칭 처리자)을 여기서 보여주고,
 * 수정 · 연결 · 삭제도 이 화면에서 한다 — 표의 행 메뉴에 다 담으면 좁고 위험하다.
 */
export default function CashFlowDetail({ cashFlowId }: { cashFlowId: number }) {
  const router = useRouter();

  /**
   * 어떤 요청의 결과인지 `key` 로 들고 있는다 — 목록 화면과 같은 방식이다.
   * 다시 읽는 동안 화면을 비우지 않고 직전 값을 그대로 둔다.
   */
  const [result, setResult] = useState<{
    key: string;
    row?: CashFlowItem;
    hasFailed?: boolean;
  } | null>(null);
  const [reloadCount, setReloadCount] = useState(0);

  const requestKey = `${cashFlowId} ${reloadCount}`;
  const current = result?.key === requestKey ? result : null;
  const row = current?.row ?? result?.row ?? null;
  const hasFailed = current?.hasFailed ?? false;
  const isLoading = current === null && !hasFailed;

  const editModal = useModal();
  const matchModal = useModal();
  const unmatchConfirm = useModal();
  const deleteConfirm = useModal();
  const [isBusy, setIsBusy] = useState(false);

  useEffect(() => {
    const controller = new AbortController();
    const { signal } = controller;

    getCashFlows({}, signal)
      .then((data) => {
        const found = data.cashFlows.find(
          (item) => item.cashFlowId === cashFlowId,
        );

        setResult(
          found
            ? { key: requestKey, row: found }
            : { key: requestKey, hasFailed: true },
        );
      })
      .catch(() => {
        // 취소는 실패가 아니다
        if (!signal.aborted) setResult({ key: requestKey, hasFailed: true });
      });

    return () => controller.abort();
  }, [cashFlowId, requestKey]);

  async function unmatch() {
    if (isBusy) return;
    setIsBusy(true);

    try {
      await unmatchCashFlow(cashFlowId);
      notifyToast('정산 블록 연결을 해제했습니다.');
      setReloadCount((count) => count + 1);
      // 열려 있는 프로젝트 보드의 정산 블록도 잠금이 풀려야 한다
      notifyBlockChanged();
    } catch (caught) {
      notifyToast(messageOf(caught, '연결을 해제하지 못했습니다.'), 'error');
    } finally {
      setIsBusy(false);
      unmatchConfirm.close();
    }
  }

  async function remove() {
    if (isBusy) return;
    setIsBusy(true);

    try {
      const result = await deleteCashFlows([cashFlowId]);

      // 매칭된 건은 지워지지 않는다 — 사유를 그대로 알리고 화면에 남는다
      if (result.count === 0) {
        notifyToast(
          result.skippedItems[0]?.reason ?? '삭제하지 못했습니다.',
          'error',
        );
        return;
      }

      notifyToast('입출금 내역을 삭제했습니다.');
      router.replace(FINANCE_ROUTES.cashFlows);
    } catch (caught) {
      notifyToast(messageOf(caught, '삭제하지 못했습니다.'), 'error');
    } finally {
      setIsBusy(false);
      deleteConfirm.close();
    }
  }

  const crumbs = (
    <Breadcrumb
      items={[
        { label: '재무 관리', href: FINANCE_ROUTES.hub },
        { label: '입출금 내역', href: FINANCE_ROUTES.cashFlows },
        { label: '상세' },
      ]}
    />
  );

  if (hasFailed) {
    return (
      <>
        {crumbs}
        <div className="mt-4">
          <ErrorStateTwoButton
            title="입출금 내역을 찾을 수 없습니다."
            description="이미 삭제되었거나 조회에 실패했습니다."
            retryLabel="다시 시도"
            onRetry={() => setReloadCount((count) => count + 1)}
          />
        </div>
      </>
    );
  }

  if (isLoading || row === null) {
    return (
      <>
        {crumbs}
        <SkeletonGroup label="입출금 내역 불러오는 중" className="mt-4">
          <Skeleton className="h-6 w-40" />
          <div className="mt-4 rounded-base border border-border-default bg-bg-card p-6">
            {[0, 1, 2, 3, 4].map((line) => (
              <Skeleton key={line} className="mt-3 h-3 w-full max-w-md" />
            ))}
          </div>
        </SkeletonGroup>
      </>
    );
  }

  const isLinked = row.linkStatus !== 'UNLINKED';

  return (
    <>
      {crumbs}

      <div className="mt-1 mb-6 flex flex-wrap items-start justify-between gap-3">
        <div>
          <span className="flex items-center gap-2">
            <span className={CASH_FLOW_TYPE_BADGE[row.type]}>
              {CASH_FLOW_TYPE_LABELS[row.type]}
            </span>
            <h2
              className={`text-heading-m font-bold ${CASH_FLOW_AMOUNT_COLOR[row.type]}`}
            >
              {formatAmount(row.amount)}원
            </h2>
          </span>
          <p className="mt-1.5 text-caption text-text-secondary">
            {formatDateTime(row.tradedAt) || '-'} · {row.depositorName || '-'}
          </p>
        </div>

        <div className="flex shrink-0 flex-wrap gap-2">
          {isLinked ? (
            <button
              type="button"
              onClick={unmatchConfirm.open}
              className="btn btn-sm btn-gray-outlined"
            >
              연결 해제
            </button>
          ) : (
            <button
              type="button"
              onClick={matchModal.open}
              className="btn btn-sm btn-primary-outlined"
            >
              정산 블록 연결
            </button>
          )}
          <button
            type="button"
            onClick={editModal.open}
            className="btn btn-sm btn-gray-outlined"
          >
            수정
          </button>
          <button
            type="button"
            onClick={deleteConfirm.open}
            className="btn btn-sm btn-danger"
          >
            삭제
          </button>
        </div>
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <Card title="거래 정보">
          <Row label="거래일시" value={formatDateTime(row.tradedAt) || '-'} />
          <Row label="구분" value={CASH_FLOW_TYPE_LABELS[row.type]} />
          <Row label="금액" value={`${formatAmount(row.amount)}원`} />
          <Row label="입금자명" value={row.depositorName || '-'} />
          <Row label="적요" value={row.bankMemo || '-'} />
          <Row
            label="수집 출처"
            value={CASH_FLOW_SOURCE_LABELS[row.sourceType]}
          />
          {/* 표에 두기엔 길고, 대사할 때는 꼭 봐야 하는 값이다 */}
          <Row label="거래고유번호" value={row.bankTxnId || '-'} />
          <Row
            label="연결 대상 제외"
            value={row.isExcluded ? '제외됨' : '아니오'}
          />
        </Card>

        <Card title="정산 블록 연결">
          <Row
            label="상태"
            value={
              <span className={CASH_FLOW_LINK_BADGE[row.linkStatus]}>
                {CASH_FLOW_LINK_STATUS_LABELS[row.linkStatus]}
              </span>
            }
          />
          <Row label="프로젝트" value={row.projectName || '-'} />
          <Row label="정산 블록" value={row.roundName || '-'} />
          <Row label="매칭 처리자" value={row.linkedByName || '-'} />
          <Row label="매칭일시" value={formatDateTime(row.linkedAt) || '-'} />

          {row.linkStatus === 'LINK_BLOCK_DELETED' && (
            <p className="mt-3 rounded-lg bg-yellow-bg-soft px-4 py-3 text-caption break-keep text-yellow-text">
              연결했던 정산 블록이 삭제됐습니다. 연결을 해제한 뒤 다른 블록에
              다시 연결해주세요.
            </p>
          )}
        </Card>
      </div>

      {editModal.isOpen && (
        <CashFlowFormModal
          target={row}
          onClose={editModal.close}
          onSaved={() => {
            editModal.close();
            setReloadCount((count) => count + 1);
          }}
        />
      )}

      {matchModal.isOpen && (
        <CashFlowMatchModal
          cashFlow={row}
          onClose={matchModal.close}
          onMatched={() => {
            matchModal.close();
            notifyToast('정산 블록에 연결했습니다.');
            setReloadCount((count) => count + 1);
          }}
        />
      )}

      {unmatchConfirm.isOpen && (
        <AlertDialogTwoButton
          icon={DialogIcons.warning}
          title="정산 블록 연결을 해제할까요?"
          description="해제하면 이 내역은 미연결 상태로 돌아갑니다. 다시 연결할 수 있습니다."
          confirmLabel="연결 해제"
          isBusy={isBusy}
          onConfirm={() => void unmatch()}
          onCancel={unmatchConfirm.close}
        />
      )}

      {deleteConfirm.isOpen && (
        <AlertDialogTwoButton
          icon={DialogIcons.danger}
          title="이 내역을 삭제할까요?"
          description="삭제한 내역은 되돌릴 수 없습니다. 정산 블록에 연결된 건은 먼저 연결을 해제해야 합니다."
          confirmLabel="삭제"
          isDanger
          isBusy={isBusy}
          onConfirm={() => void remove()}
          onCancel={deleteConfirm.close}
        />
      )}
    </>
  );
}

function Card({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <section className="rounded-base border border-border-default bg-bg-card p-6">
      <p className="mb-4 text-label font-bold text-text-primary">{title}</p>
      <dl className="flex flex-col gap-3">{children}</dl>
    </section>
  );
}

/** 라벨 · 값 한 줄. 값이 길면 줄바꿈으로 흐른다 (잘라 감추지 않는다) */
function Row({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="flex gap-4">
      <dt className="w-24 shrink-0 text-caption break-keep text-text-secondary">
        {label}
      </dt>
      <dd className="min-w-0 flex-1 text-label [overflow-wrap:anywhere] break-keep text-text-primary">
        {value}
      </dd>
    </div>
  );
}
