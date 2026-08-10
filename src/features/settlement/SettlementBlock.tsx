'use client';

import { useState } from 'react';

import BlockCard from '@/features/block/BlockCard';
import type { StepBlock } from '@/features/block/types';
import { formatDate, formatDateTime } from '@/lib/format';

import SettlementForm from './SettlementForm';
import {
  readSettlementBlockDetail,
  SETTLEMENT_STATUS_LABELS,
  traderLabel,
  type SettlementBlockDetail,
  type SettlementItem,
  type SettlementStatus,
  type SettlementType,
} from './types';

/**
 * 정산 블록. (.ai/API.md 85 · 86)
 *
 * 화면이 둘로 갈린다.
 * - **요약** — 작성된 값을 늘어놓는다. 아직 없으면 항목만 두고 값은 `-` 다
 * - **수정** — `수정하기` 로 연다. 타입을 고르면 추천 회차 · 금액을 받아 안내한다
 *
 * ⚠️ 생성 직후에도 **입력 폼을 바로 열지 않는다.** 빈 요약 + `수정하기` 만 보여준다 —
 * 추천값은 타입을 골라야 받을 수 있어서, 폼을 먼저 열면 채울 것이 없다.
 */
export default function SettlementBlock({ block }: { block: StepBlock }) {
  const detail = readSettlementBlockDetail(block.detail);

  // 어느 정산 블록인지 모르면 아무것도 부를 수 없다
  if (!detail) {
    return (
      <BlockCard block={block}>
        <p className="text-[10px] break-keep text-text-secondary">
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
  /**
   * 저장 후 갈아끼우는 값. 없으면 블록 `detail` 의 것을 쓴다.
   *
   * ⚠️ **타입을 항목과 함께 들고 있어야 한다** — 저장 응답(86번)에 `type` 이 없고
   * 블록 `detail.type` 은 목록을 다시 받을 때까지 `null` 이다. 항목만 갈아끼우면
   * 첫 출금 정산이 저장 직후 `입금 거래처` 로 보이고 계좌 3줄이 사라진다.
   */
  const [saved, setSaved] = useState<{
    item: SettlementItem;
    type: SettlementType;
  } | null>(null);

  const item = saved?.item ?? detail.item;
  const type = saved?.type ?? detail.type;
  const { status } = detail;

  if (isEditing) {
    return (
      <BlockCard block={block}>
        <SettlementForm
          settleId={detail.settleId}
          // 블록이 이미 타입을 알고 있으면 그걸 먼저 고른 상태로 연다
          initialType={type}
          item={item}
          onClose={() => setIsEditing(false)}
          onSaved={(next, savedType) => {
            setSaved({ item: next, type: savedType });
            setIsEditing(false);
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
        <Row label="정산 예정일" value={formatDate(item?.plannedDate) || '—'} />
        {/* 돈을 보내는 쪽 — 받을 때는 상대 클라이언트, 보낼 때는 우리 회사다 */}
        <Row label={traderLabel(type)} value={item?.traderName ?? '—'} />

        {/* 계좌는 출금일 때만 쓴다 — 입금 블록에 빈 줄 셋을 남기지 않는다 */}
        {type === 'OUTCOME' && (
          <>
            <Row label="은행명" value={item?.bankName ?? '—'} />
            {/* 목록 · 저장 응답 모두 마스킹된 값(`100******444`)이다 */}
            <Row label="계좌번호" value={item?.accountNumber ?? '—'} />
            <Row label="예금주" value={item?.accountHolder ?? '—'} />
          </>
        )}
      </dl>

      {/* 재무팀이 채우는 값 — 작성 직후에는 셋 다 비어 있다 */}
      <dl className="mt-2 flex flex-col gap-1.5 border-t border-border-default pt-2">
        <Row label="실제 정산 금액" value={money(item?.actualAmount)} />
        <Row
          label="실제 정산 일자"
          value={formatDateTime(item?.actualDate) || '—'}
        />
        {/*
          상태는 **작성 전에도** 온다 (`PENDING` = 미연결) — 저장한 값이 있으면 그쪽이 최신이다.
          모르는 값이 오면 라벨 대신 원문을 그려 화면에서 바로 드러나게 둔다.
        */}
        <Row label="정산 상태" value={statusLabel(item?.status ?? status)} />
      </dl>

      <Progress ratio={item?.paidAmountRatio ?? 0} />

      <button
        type="button"
        onClick={() => setIsEditing(true)}
        className="mt-3 w-full cursor-pointer rounded-lg border border-border-primary py-2 text-[11px] font-semibold text-text-primary-blue hover:bg-bg-hover"
      >
        수정하기
      </button>
    </BlockCard>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-baseline justify-between gap-2">
      <dt className="shrink-0 text-[10px] text-text-secondary">{label}</dt>
      <dd className="min-w-0 truncate text-[10px] font-medium text-text-primary">
        {value}
      </dd>
    </div>
  );
}

/**
 * 수급 진행률. 작성 직후에는 0% 라 막대가 비어 있다.
 *
 * ❗ **`paidAmountRatio` 단위가 확정되지 않았다** — 명세에 작성 직후 값(`0.0`)만 있다.
 * 여기서는 **0~100** 으로 본다. 0~1 이면 절반 정산이 `0.5%` 로 보이므로 바로 드러난다.
 */
function Progress({ ratio }: { ratio: number }) {
  /**
   * 서버 값이 범위를 벗어나도 막대가 칸을 넘지 않게 한다.
   *
   * ⚠️ `Number.isFinite` 를 먼저 본다 — 저장 응답(`saved`)은 `readItem` 을 거치지 않아
   * `NaN` 이 그대로 올 수 있고, `Math.min(Math.max(NaN, 0), 100)` 은 `NaN` 이다.
   * 그러면 `NaN%` 라고 적히고 막대 폭도 깨진다.
   */
  const percent = Number.isFinite(ratio)
    ? Math.min(Math.max(ratio, 0), 100)
    : 0;

  return (
    <div className="mt-3">
      <div className="flex items-baseline justify-between">
        <span className="text-[10px] text-text-secondary">수급 진행률</span>
        <span className="text-[10px] text-text-secondary">
          {percent.toFixed(1)}%
        </span>
      </div>
      <div className="mt-1 h-1.5 overflow-hidden rounded-full bg-bg-surface">
        <div
          className="h-full rounded-full bg-btn-primary"
          style={{ width: `${percent}%` }}
        />
      </div>
    </div>
  );
}

/** 상태 라벨. 모르는 값이면 원문을 그대로 둔다 — 조용히 비면 잘못을 알 수 없다 */
function statusLabel(status: SettlementStatus | null | undefined) {
  if (!status) return '—';

  return SETTLEMENT_STATUS_LABELS[status] ?? status;
}

/** 금액 표기. 아직 없는 값은 `-` 로 자리만 남긴다 */
function money(value: number | null | undefined) {
  return typeof value === 'number' ? value.toLocaleString('ko-KR') : '—';
}
