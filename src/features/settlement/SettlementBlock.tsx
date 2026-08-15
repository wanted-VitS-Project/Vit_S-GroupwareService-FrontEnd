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
  /**
   * 저장이 막혀 목록을 다시 읽었다는 안내.
   * 폼이 닫히면서 폼 안의 오류 문구가 함께 사라지므로 요약 화면에서 이어 말해 준다.
   */
  const [staleNotice, setStaleNotice] = useState('');
  /**
   * 저장이 `SETL-007` 로 막혔다는 사실 (이번 화면에서 확인한 것).
   * 상태만으로 못 걸러낸 경우를 받아 주는 **보조 수단**이다 — 새로고침하면 사라진다.
   */
  const [wasRejected, setWasRejected] = useState(false);
  /**
   * `wasRejected` 가 어느 블록 값의 것인지.
   *
   * ⚠️ 목록을 다시 읽어 **새 값이 오면 지난 거절은 무효**다 — 재무에서 연결을 해제했는데도
   *    `수정하기` 가 계속 잠겨 있으면 안 된다. 판정은 새 `detail` 로 다시 한다.
   */
  const [rejectedFor, setRejectedFor] = useState('');
  const detailKey = `${detail.version ?? ''} ${detail.item?.status ?? detail.status ?? ''} ${detail.item?.actualDate ?? ''}`;

  if (wasRejected && rejectedFor !== detailKey) {
    setWasRejected(false);
  }

  const item = saved?.item ?? detail.item;
  const type = saved?.type ?? detail.type;
  const { status } = detail;
  /**
   * 저장에 실을 낙관적 락 버전.
   *
   * ⚠️ 저장 응답의 새 값이 있으면 **그쪽이 최신**이다 — 블록 목록을 다시 읽지 않으므로
   *    `detail.version` 은 옛 값에 머문다. 연달아 두 번 저장할 때 두 번째가 409 가 되지 않게.
   */
  const version = saved?.item.version ?? detail.version;

  /**
   * 수정이 막힌 블록인지.
   *
   * ⚠️ 블록 응답에 **연결 여부 플래그가 없다.** 그래서 정산 상태로 가늠한다 —
   *    `부분 정산` · `정산 완료` 는 실제 입출금이 잡혔다는 뜻이라 서버가 `SETL-007` 로 막는다.
   * ⚠️ 판정은 `isLockedSettlement()` 한 곳에 있다 — 실제 정산 금액 · 일자(입출금이 붙으면
   *    채워진다)와 정산 상태를 함께 본다. 그래도 못 걸러지는 경우(세금계산서만 연결)는
   *    저장이 한 번 막힌 뒤 `wasRejected` 가 받아 준다.
   *
   * 🔧 백엔드가 `detail` 에 연결 여부를 내려주면 이 추정은 통째로 지운다.
   */
  const isLocked =
    wasRejected || isLockedSettlement(item?.status ?? status, item);

  if (isEditing) {
    return (
      <BlockCard block={block}>
        <SettlementForm
          settleId={detail.settleId}
          // 블록이 이미 타입을 알고 있으면 그걸 먼저 고른 상태로 연다
          initialType={type}
          item={item}
          version={version}
          onClose={() => setIsEditing(false)}
          onSaved={(next, savedType) => {
            setSaved({ item: next, type: savedType });
            setIsEditing(false);
          }}
          onStale={(reason, locked) => {
            /*
             * 화면이 든 값이 더 이상 맞지 않다 — 폼을 닫고 **블록 목록을 다시 읽는다.**
             * 저장 응답으로 갈아끼운 값(`saved`)도 버려야 새 목록이 화면에 드러난다.
             */
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
        {/* 돈을 보내는 쪽 — 받을 때는 상대 클라이언트, 보낼 때는 우리 회사다 */}
        <Row label={TRADER_LABEL} value={item?.traderName ?? '—'} />

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

      {staleNotice !== '' && (
        <p
          role="status"
          className="mt-2 rounded-lg bg-yellow-bg-soft px-2.5 py-2 text-caption break-keep text-yellow-text"
        >
          {staleNotice}
        </p>
      )}

      {/**
       * ⚠️ 사유를 `title` 에만 두지 않는다 — 비활성 버튼은 포커스를 받지 못해
       *    키보드 · 스크린리더 사용자에게 툴팁이 닿지 않는다. 화면에 적고 버튼과 잇는다.
       */}
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
          // 다시 열 때 지난 안내는 역할을 다했다
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

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-baseline justify-between gap-2">
      <dt className="shrink-0 text-caption text-text-secondary">{label}</dt>
      <dd className="min-w-0 truncate text-caption font-medium text-text-primary">
        {value}
      </dd>
    </div>
  );
}

/**
 * 수급 진행률. 작성 직후에는 0% 라 막대가 비어 있다.
 *
 * ⚠️ **`paidAmountRatio` 는 비율(0~1)이다** — 백분율이 아니다 (2026-08-14 확인).
 *    전액 정산이 `1.0` 으로 와서 `1.0%` 로 보이던 것을 100 을 곱해 바로잡았다.
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
    ? Math.min(Math.max(ratio * 100, 0), 100)
    : 0;

  return (
    <div className="mt-3">
      <div className="flex items-baseline justify-between">
        <span className="text-caption text-text-secondary">수급 진행률</span>
        {/* 숫자 · `%` 를 한 문자열로 — 나뉘면 좁은 칸에서 `100.0` / `%` 로 끊긴다 */}
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

/** 상태 라벨. 모르는 값이면 원문을 그대로 둔다 — 조용히 비면 잘못을 알 수 없다 */
function statusLabel(status: SettlementStatus | null | undefined) {
  if (!status) return '—';

  return SETTLEMENT_STATUS_LABELS[status] ?? status;
}

/** 금액 표기. 아직 없는 값은 `-` 로 자리만 남긴다 */
function money(value: number | null | undefined) {
  return typeof value === 'number' ? value.toLocaleString('ko-KR') : '—';
}
