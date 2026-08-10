'use client';

import { useState } from 'react';

import BlockCard from '@/features/block/BlockCard';
import type { StepBlock } from '@/features/block/types';

import SettlementForm from './SettlementForm';
import {
  readSettlementBlockDetail,
  SETTLEMENT_STATUS_LABELS,
  type SettlementBlockDetail,
  type SettlementItem,
} from './types';

/**
 * 정산 블록. (.ai/API.md 84 · 85)
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
        <p className="text-[10px] break-keep text-[#6C7389]">
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
  /** 저장 후 갈아끼우는 값. 없으면 블록 `detail` 의 것을 쓴다 */
  const [saved, setSaved] = useState<SettlementItem | null>(null);

  const item = saved ?? detail.item;

  if (isEditing) {
    return (
      <BlockCard block={block}>
        <SettlementForm
          settleId={detail.settleId}
          // 블록이 이미 타입을 알고 있으면 그걸 먼저 고른 상태로 연다
          initialType={detail.type}
          item={item}
          onClose={() => setIsEditing(false)}
          onSaved={(next) => {
            setSaved(next);
            setIsEditing(false);
          }}
        />
      </BlockCard>
    );
  }

  return (
    <BlockCard block={block}>
      <dl className="flex flex-col gap-1.5">
        <Row label="총금액" value={money(item?.totalAmount)} />
        <Row label="이번 정산 금액" value={money(item?.plannedAmount)} />
        <Row label="마감일" value={item?.plannedDate ?? '—'} />
        <Row label="보낸 사람" value={item?.traderName ?? '—'} />
        {/* 재무팀이 채우기 전까지 비어 있다 — 작성 직후에는 늘 `-` 다 */}
        <Row label="받은 금액" value={money(item?.actualAmount)} />
        {item && (
          <Row
            label="정산 상태"
            value={SETTLEMENT_STATUS_LABELS[item.status] ?? item.status}
          />
        )}
      </dl>

      <Progress ratio={item?.paidAmountRatio ?? 0} />

      <button
        type="button"
        onClick={() => setIsEditing(true)}
        className="mt-3 w-full cursor-pointer rounded-lg border border-[#4F39F6] py-2 text-[11px] font-semibold text-[#4F39F6] hover:bg-[#4F39F6]/5"
      >
        수정하기
      </button>
    </BlockCard>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-baseline justify-between gap-2">
      <dt className="shrink-0 text-[10px] text-[#6C7389]">{label}</dt>
      <dd className="min-w-0 truncate text-[10px] font-medium text-[#1C1F2A]">
        {value}
      </dd>
    </div>
  );
}

/** 수급 진행률. 작성 직후에는 0% 라 막대가 비어 있다 */
function Progress({ ratio }: { ratio: number }) {
  // 서버 값이 범위를 벗어나도 막대가 칸을 넘지 않게 한다
  const percent = Math.min(Math.max(ratio, 0), 100);

  return (
    <div className="mt-3">
      <div className="flex items-baseline justify-between">
        <span className="text-[10px] text-[#6C7389]">수급 진행률</span>
        <span className="text-[10px] text-[#6C7389]">
          {percent.toFixed(1)}%
        </span>
      </div>
      <div className="mt-1 h-1.5 overflow-hidden rounded-full bg-[#ECEEF4]">
        <div
          className="h-full rounded-full bg-[#4F39F6]"
          style={{ width: `${percent}%` }}
        />
      </div>
    </div>
  );
}

/** 금액 표기. 아직 없는 값은 `-` 로 자리만 남긴다 */
function money(value: number | null | undefined) {
  return typeof value === 'number' ? value.toLocaleString('ko-KR') : '—';
}
