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
import { formatDate, formatDateTime } from '@/lib/format';
import { useModal } from '@/lib/useModal';

import {
  deleteTaxInvoices,
  findTaxInvoice,
  unmatchTaxInvoice,
  updateTaxInvoiceExclusion,
  updateTaxInvoiceMemo,
} from './api';
import { CASH_FLOW_LINK_BADGE, formatAmount } from './display';
import { FINANCE_ROUTES } from './routes';
import TaxInvoiceMatchModal from './TaxInvoiceMatchModal';
import {
  CASH_FLOW_LINK_STATUS_LABELS,
  TAX_INVOICE_TYPE_BADGE,
  TAX_INVOICE_TYPE_LABELS,
  type TaxInvoiceItem,
} from './types';

/**
 * 세금계산서 상세. (#17)
 *
 * 화면 구성은 **입출금 상세와 같다** — 머리에 금액 · 배지 · 동작 버튼을 두고,
 * 아래를 `세금계산서 정보` · `정산 블록 연결` 두 카드로 나눈다. 두 화면을 오가며
 * 쓰는 자리라 배치가 다르면 매번 눈이 다시 찾는다.
 *
 * ⚠️ **단건 조회 API 가 없다** — 목록에서 찾는다 (`findTaxInvoice`).
 *    입출금과 달리 목록에 페이징이 있어 페이지를 넘겨 가며 찾는다.
 * ⚠️ 세금계산서는 **메모만** 고칠 수 있다 — 나머지는 파일이 원본이라 수정 폼이 없다.
 */
export default function TaxInvoiceDetail({ taxId }: { taxId: number }) {
  const router = useRouter();

  /**
   * 어떤 요청의 결과인지 `key` 로 들고 있는다 — 입출금 상세와 같은 방식이다.
   * 다시 읽는 동안 화면을 비우지 않고 직전 값을 그대로 둔다.
   */
  const [result, setResult] = useState<{
    key: string;
    row?: TaxInvoiceItem;
    hasFailed?: boolean;
  } | null>(null);
  const [reloadCount, setReloadCount] = useState(0);

  const requestKey = `${taxId} ${reloadCount}`;
  const current = result?.key === requestKey ? result : null;
  const row = current?.row ?? result?.row ?? null;
  const hasFailed = current?.hasFailed ?? false;

  const matchModal = useModal();
  const unmatchConfirm = useModal();
  const deleteConfirm = useModal();
  const [isBusy, setIsBusy] = useState(false);

  useEffect(() => {
    const controller = new AbortController();
    const { signal } = controller;

    findTaxInvoice(taxId, signal)
      .then((found) => {
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
  }, [taxId, requestKey]);

  function reload() {
    setReloadCount((count) => count + 1);
  }

  async function unmatch() {
    if (isBusy) return;
    setIsBusy(true);

    try {
      await unmatchTaxInvoice(taxId);
      notifyToast('정산 블록 연결을 해제했습니다.');
      reload();
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
      const deleted = await deleteTaxInvoices([taxId]);

      // 매칭된 건은 지워지지 않는다 — 사유를 그대로 알리고 화면에 남는다
      if (deleted.count === 0) {
        notifyToast(
          deleted.skippedItems[0]?.reason ?? '삭제하지 못했습니다.',
          'error',
        );
        return;
      }

      notifyToast('세금계산서를 삭제했습니다.');
      router.replace(FINANCE_ROUTES.taxInvoices);
    } catch (caught) {
      notifyToast(messageOf(caught, '삭제하지 못했습니다.'), 'error');
    } finally {
      setIsBusy(false);
      deleteConfirm.close();
    }
  }

  async function toggleExclusion() {
    if (isBusy || !row) return;
    setIsBusy(true);

    try {
      await updateTaxInvoiceExclusion([taxId], !row.isExcluded);
      notifyToast(
        row.isExcluded
          ? '연결 대상에 다시 넣었습니다.'
          : '연결 대상에서 제외했습니다.',
      );
      reload();
    } catch (caught) {
      notifyToast(messageOf(caught, '처리하지 못했습니다.'), 'error');
    } finally {
      setIsBusy(false);
    }
  }

  const crumbs = (
    <Breadcrumb
      items={[
        { label: '재무 관리', href: FINANCE_ROUTES.hub },
        { label: '세금계산서', href: FINANCE_ROUTES.taxInvoices },
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
            title="세금계산서를 찾을 수 없습니다."
            description="이미 삭제되었거나 조회에 실패했습니다."
            retryLabel="다시 시도"
            onRetry={reload}
          />
        </div>
      </>
    );
  }

  /**
   * ⚠️ **직전 값이 있으면 스켈레톤으로 덮지 않는다.** 메모 저장 · 연결 해제 · 제외를
   *    누를 때마다 다시 읽는데, 그때마다 화면이 통째로 사라졌다 나타나면 자리를 잃는다.
   *    처음 열 때(값이 아직 없을 때)만 스켈레톤을 그린다.
   */
  if (row === null) {
    return (
      <>
        {crumbs}
        <SkeletonGroup label="세금계산서 불러오는 중" className="mt-4">
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
            <span className={TAX_INVOICE_TYPE_BADGE[row.type]}>
              {TAX_INVOICE_TYPE_LABELS[row.type]}
            </span>
            <h2 className="text-heading-m font-bold text-text-primary">
              {formatAmount(row.totalAmount)}원
            </h2>
          </span>
          <p className="mt-1.5 text-caption text-text-secondary">
            {formatDate(row.issuedNo) || row.issuedNo || '-'} ·{' '}
            {row.buyerName || '-'}
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
              disabled={row.isExcluded}
              title={
                row.isExcluded ? '연결 대상에서 제외된 건입니다' : undefined
              }
              className="btn btn-sm btn-primary-outlined"
            >
              정산 블록 연결
            </button>
          )}
          {/* ⚠️ 연결된 건은 제외할 수 없다 — 서버가 막기 전에 화면에서 먼저 막는다 */}
          <button
            type="button"
            onClick={toggleExclusion}
            disabled={isBusy || isLinked}
            title={isLinked ? '연결된 건은 제외할 수 없습니다' : undefined}
            className="btn btn-sm btn-gray-outlined"
          >
            {row.isExcluded ? '제외 취소' : '연결 대상 제외'}
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
        <Card title="세금계산서 정보">
          <Row
            label="발행일"
            value={formatDate(row.issuedNo) || row.issuedNo || '-'}
          />
          <Row label="구분" value={TAX_INVOICE_TYPE_LABELS[row.type]} />
          {/* 중복 판정 기준이라 대사할 때 꼭 봐야 하는 값이다 */}
          <Row label="승인번호" value={row.approvalNo || '-'} />
          <Row label="공급받는자" value={row.buyerName || '-'} />
          <Row label="공급받는자 사업자번호" value={row.buyerBizNo || '-'} />
          <Row label="공급자 사업자번호" value={row.supplierBizNo || '-'} />
          <Row label="종사업장번호" value={row.subBizNo || '-'} />
          <Row label="대표자명" value={row.ceoName || '-'} />
          <Row label="품목명" value={row.itemName || '-'} />
          <Row label="공급가액" value={`${formatAmount(row.supplyAmount)}원`} />
          <Row label="세액" value={`${formatAmount(row.taxAmount)}원`} />
          <Row label="합계" value={`${formatAmount(row.totalAmount)}원`} />
          <Row label="수집 출처" value={row.sourceType || '-'} />
          <Row
            label="연결 대상 제외"
            value={row.isExcluded ? '제외됨' : '아니오'}
          />
        </Card>

        <div className="flex flex-col gap-4">
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

          <MemoCard taxId={taxId} memo={row.memo} onSaved={reload} />
        </div>
      </div>

      {matchModal.isOpen && (
        <TaxInvoiceMatchModal
          taxInvoice={row}
          onClose={matchModal.close}
          onMatched={() => {
            matchModal.close();
            notifyToast('정산 블록에 연결했습니다.');
            reload();
          }}
        />
      )}

      {unmatchConfirm.isOpen && (
        <AlertDialogTwoButton
          icon={DialogIcons.warning}
          title="정산 블록 연결을 해제할까요?"
          description="해제하면 이 세금계산서는 미연결 상태로 돌아갑니다. 다시 연결할 수 있습니다."
          confirmLabel="연결 해제"
          isBusy={isBusy}
          onConfirm={() => void unmatch()}
          onCancel={unmatchConfirm.close}
        />
      )}

      {deleteConfirm.isOpen && (
        <AlertDialogTwoButton
          icon={DialogIcons.danger}
          title="이 세금계산서를 삭제할까요?"
          description="삭제한 세금계산서는 되돌릴 수 없습니다. 정산 블록에 연결된 건은 먼저 연결을 해제해야 합니다."
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

/**
 * 메모.
 *
 * ⚠️ 세금계산서에서 **고칠 수 있는 것은 이것뿐이다** — 나머지는 파일이 원본이라
 *    화면에서 바꾸면 원본과 어긋난다 (직접 등록 API 자체가 없다).
 *    그래서 입출금처럼 `수정` 모달을 두지 않고 카드 안에서 바로 고친다.
 */
function MemoCard({
  taxId,
  memo,
  onSaved,
}: {
  taxId: number;
  memo: string | null;
  onSaved: () => void;
}) {
  const [draft, setDraft] = useState(memo ?? '');
  const [isSaving, setIsSaving] = useState(false);

  async function save() {
    if (isSaving) return;
    setIsSaving(true);

    try {
      await updateTaxInvoiceMemo(taxId, draft.trim());
      notifyToast('메모를 저장했습니다.');
      onSaved();
    } catch (caught) {
      notifyToast(messageOf(caught, '저장하지 못했습니다.'), 'error');
    } finally {
      setIsSaving(false);
    }
  }

  return (
    <section className="rounded-base border border-border-default bg-bg-card p-6">
      <label
        htmlFor="taxInvoiceMemo"
        className="mb-4 block text-label font-bold text-text-primary"
      >
        메모
      </label>
      <textarea
        id="taxInvoiceMemo"
        value={draft}
        onChange={(event) => setDraft(event.target.value)}
        rows={3}
        placeholder="확인할 내용 입력"
        className="w-full resize-y rounded-lg border border-border-default bg-bg-surface px-3.5 py-2.5 text-caption leading-relaxed text-text-primary placeholder:text-text-secondary focus:outline-2 focus:outline-offset-2 focus:outline-border-primary"
      />
      <div className="mt-3 flex justify-end">
        <button
          type="button"
          onClick={save}
          disabled={isSaving || draft === (memo ?? '')}
          className="btn btn-sm btn-primary"
        >
          {isSaving ? '저장 중…' : '메모 저장'}
        </button>
      </div>
    </section>
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
