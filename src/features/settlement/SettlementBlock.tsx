'use client';

import { useState } from 'react';

import BlockCard from '@/features/block/BlockCard';
import { notifyBlockChanged } from '@/features/block/events';
import type { StepBlock } from '@/features/block/types';
import { formatDate, formatDateTime } from '@/lib/format';

import SettlementForm from './SettlementForm';
import {
  isLockedSettlement,
  readSettlementBlockDetail,
  SETTLEMENT_STATUS_LABELS,
  TRADER_LABEL,
  type SettlementBlockDetail,
  type SettlementItem,
  type SettlementStatus,
  type SettlementType,
} from './types';

/**
 * 정산 블록. 요약과 수정 폼으로 화면이 갈린다.
 * 추천값은 타입을 골라야 받을 수 있어 생성 직후에도 요약부터 보여준다.
 */
export default function SettlementBlock({ block }: { block: StepBlock }) {
  const detail = readSettlementBlockDetail(block.detail);

  // 어느 정산 블록인지 모르면 아무것도 부를 수 없다
  if (!detail) {
    return (
      <BlockCard block={block}>
        <p className="text-caption break-keep text-text-secondary">
          정산 정보를 불러올 수 없습니다. 블록을 다시 만들어주세요.
        </p>
      </BlockCard>
    );
  }

  return <Loaded block={block} detail={detail} />;
}

function Loaded({
  block,
  detail,
}: {
  block: StepBlock;
  detail: SettlementBlockDetail;
}) {
  const [isEditing, setIsEditing] = useState(false);
  /** 저장 후 갈아끼우는 값. 저장 응답에 type 이 없어 타입도 함께 들고 있는다 */
  const [saved, setSaved] = useState<{
    item: SettlementItem;
    type: SettlementType;
  } | null>(null);
  /** 저장이 막혀 목록을 다시 읽었다는 안내. 폼이 닫힌 뒤 요약 화면에서 보여준다 */
  const [staleNotice, setStaleNotice] = useState('');
  /** 저장이 잠금으로 막혔다는 사실. 상태만으로 못 걸러낸 경우의 보조 수단이다 */
  const [wasRejected, setWasRejected] = useState(false);
  /** 지난 거절이 어느 블록 값의 것인지. 새 값이 오면 무효로 본다 */
  const [rejectedFor, setRejectedFor] = useState('');
  const detailKey = `${detail.version ?? ''} ${detail.item?.status ?? detail.status ?? ''} ${detail.item?.actualDate ?? ''}`;

  if (wasRejected && rejectedFor !== detailKey) {
    setWasRejected(false);
  }

  const item = saved?.item ?? detail.item;
  const type = saved?.type ?? detail.type;
  const { status } = detail;
  /** 저장에 실을 낙관적 락 버전. 저장 응답의 새 값이 있으면 그쪽이 최신이다 */
  const version = saved?.item.version ?? detail.version;

  /**
   * 수정이 막힌 블록인지. 연결 여부 플래그가 없어 상태와 금액으로 가늠한다.
   * 그래도 못 걸러지는 경우는 저장이 한 번 막힌 뒤 기록으로 받아 준다.
   */
  const isLocked =
    wasRejected || isLockedSettlement(item?.status ?? status, item);

  if (isEditing) {
    return (
      <BlockCard block={block}>
        <SettlementForm
          settleId={detail.settleId}
          // 블록이 이미 타입을 알고 있으면 그것을 고른 상태로 연다
          initialType={type}
          item={item}
          version={version}
          onClose={() => setIsEditing(false)}
          onSaved={(next, savedType) => {
            setSaved({ item: next, type: savedType });
            setIsEditing(false);
          }}
          onStale={(reason, locked) => {
            /* 화면 값이 낡았으므로 저장 응답으로 갈아끼운 값까지 버리고 다시 읽는다 */
            setSaved(null);
            setIsEditing(false);
            setStaleNotice(reason);
            setWasRejected(locked);
            setRejectedFor(detailKey);
            notifyBlockChanged();
          }}
        />
      </BlockCard>
    );
  }

  return (
    <BlockCard block={block}>
      {/* 작성 · 수정으로 넣는 값 */}
      <dl className="flex flex-col gap-1.5">
        <Row label="정산 회차" value={item ? `${item.roundNo}회차` : '—'} />
        <Row label="정산 예정 총 금액" value={money(item?.totalAmount)} />
        <Row label="이번 회차 예정 금액" value={money(item?.plannedAmount)} />
        <Row label="예정 세금" value={money(item?.plannedTaxAmount)} />
        <Row label="입출금 기한" value={formatDate(item?.plannedDate) || '—'} />
        {/* 면세 회차는 기한이 없다. 값이 없으면 받지 않는 회차라는 뜻이다 */}
        <Row
          label="세금계산서 기한"
          value={formatDate(item?.taxInvoiceDueDate) || '없음'}
        />
        {/* 돈을 보내는 쪽. 입금이면 상대 클라이언트, 출금이면 우리 회사다 */}
        <Row label={TRADER_LABEL} value={item?.traderName ?? '—'} />

        {/* 계좌는 출금일 때만 쓴다 */}
        {type === 'OUTCOME' && (
          <>
            <Row label="은행명" value={item?.bankName ?? '—'} />
            {/* 목록 · 저장 응답 모두 마스킹된 값이다 */}
            <Row label="계좌번호" value={item?.accountNumber ?? '—'} />
            <Row label="예금주" value={item?.accountHolder ?? '—'} />
          </>
        )}
      </dl>

      {/* 재무팀이 채우는 값. 작성 직후에는 비어 있다 */}
      <dl className="mt-2 flex flex-col gap-1.5 border-t border-border-default pt-2">
        <Row label="실제 정산 금액" value={money(item?.actualAmount)} />
        <Row
          label="실제 정산 일자"
          value={formatDateTime(item?.actualDate) || '—'}
        />
        {/* 상태는 작성 전에도 온다. 저장한 값이 있으면 그쪽이 최신이다 */}
        <Row
          label="정산 상태"
          value={statusLabel(item?.status ?? status)}
          trailing={
            // 작성 전에는 다른 칸이 모두 비어 있어 배지만 홀로 뜨지 않게 한다
            item ? (
              <TaxInvoiceBadge isLinked={detail.isTaxInvoiceLinked} />
            ) : null
          }
        />
      </dl>

      <Progress ratio={item?.paidAmountRatio ?? 0} />

      {staleNotice !== '' && (
        <p
          role="status"
          className="mt-2 rounded-lg bg-yellow-bg-soft px-2.5 py-2 text-caption break-keep text-yellow-text"
        >
          {staleNotice}
        </p>
      )}

      {/* 비활성 버튼은 툴팁이 닿지 않아 사유를 화면에 적고 버튼과 잇는다 */}
      {isLocked && (
        <p
          id={`settlementLock-${detail.settleId}`}
          className="mt-2 rounded-lg bg-bg-surface px-2.5 py-2 text-caption break-keep text-text-secondary"
        >
          세금계산서 · 입출금 내역이 연결돼 있어 수정할 수 없습니다. 연결을
          해제하면 다시 수정할 수 있어요.
        </p>
      )}

      <button
        type="button"
        disabled={isLocked}
        aria-describedby={
          isLocked ? `settlementLock-${detail.settleId}` : undefined
        }
        onClick={() => {
          // 다시 열 때 지난 안내는 지운다
          setStaleNotice('');
          setIsEditing(true);
        }}
        className={`mt-3 w-full rounded-lg border py-2 text-detail font-semibold ${
          isLocked
            ? 'cursor-not-allowed border-border-default text-text-muted'
            : 'cursor-pointer border-border-primary text-text-primary-blue hover:bg-bg-hover'
        }`}
      >
        수정하기
      </button>
    </BlockCard>
  );
}

function Row({
  label,
  value,
  trailing,
}: {
  label: string;
  value: string;
  /** 값 오른쪽에 붙는 배지. 없으면 값만 그린다 */
  trailing?: React.ReactNode;
}) {
  return (
    <div className="flex items-baseline justify-between gap-2">
      <dt className="shrink-0 text-caption text-text-secondary">{label}</dt>
      <dd className="flex min-w-0 items-center gap-1.5">
        <span className="min-w-0 truncate text-caption font-medium text-text-primary">
          {value}
        </span>
        {trailing}
      </dd>
    </div>
  );
}

/**
 * 세금계산서 연결 여부. 연결과 미연결은 다음에 할 일이 달라 색으로 가른다.
 * 값을 받지 못한 옛 응답에서는 그리지 않는다. 미연결로 단정할 수 없다.
 */
function TaxInvoiceBadge({ isLinked }: { isLinked: boolean | null }) {
  if (isLinked === null) return null;

  return (
    <span
      className={`badge shrink-0 ${isLinked ? 'badge-green' : 'badge-gray'}`}
    >
      {isLinked ? '계산서 연결' : '계산서 미연결'}
    </span>
  );
}

/** 수급 진행률. 받는 값이 0~1 비율이라 100 을 곱해 백분율로 그린다 */
function Progress({ ratio }: { ratio: number }) {
  /** 서버 값이 범위를 벗어나거나 숫자가 아니어도 막대가 깨지지 않게 한다 */
  const percent = Number.isFinite(ratio)
    ? Math.min(Math.max(ratio * 100, 0), 100)
    : 0;

  return (
    <div className="mt-3">
      <div className="flex items-baseline justify-between">
        <span className="text-caption text-text-secondary">수급 진행률</span>
        {/* 좁은 칸에서 끊기지 않도록 숫자와 % 를 한 문자열로 둔다 */}
        <span className="text-caption whitespace-nowrap text-text-secondary">
          {`${percent.toFixed(1)}%`}
        </span>
      </div>
      <div className="mt-1 h-1.5 overflow-hidden rounded-pill bg-bg-surface">
        <div
          className="h-full rounded-pill bg-btn-primary"
          style={{ width: `${percent}%` }}
        />
      </div>
    </div>
  );
}

/** 상태 라벨. 모르는 값이면 원문을 그대로 둔다 */
function statusLabel(status: SettlementStatus | null | undefined) {
  if (!status) return '—';

  return SETTLEMENT_STATUS_LABELS[status] ?? status;
}

/** 금액 표기. 아직 없는 값은 자리만 남긴다 */
function money(value: number | null | undefined) {
  return typeof value === 'number' ? value.toLocaleString('ko-KR') : '—';
}
