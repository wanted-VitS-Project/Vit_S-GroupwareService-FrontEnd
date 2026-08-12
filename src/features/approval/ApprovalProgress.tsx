import { LINE_STATUS_LABELS } from './lineStatus';
import type { ApprovalDetailLine, ApprovalLineStatus } from './types';

/**
 * 결재 진행 현황 스텝퍼. (AP-046)
 *
 * 결재자별로 승인 ✓ · 반려 ✕ · 현재 차례 · 대기를 칠하고 완료 수를 센다.
 * 상신 전(DRAFT)에는 전부 대기라 순서와 이름만 보인다.
 */
export default function ApprovalProgress({
  lines,
}: {
  lines: ApprovalDetailLine[];
}) {
  if (lines.length === 0) {
    return (
      <p className="text-caption text-text-secondary">
        지정된 결재자가 없습니다.
      </p>
    );
  }

  const ordered = [...lines].sort((a, b) => a.order - b.order);
  const doneCount = ordered.filter((line) => line.status === 'APPROVED').length;

  return (
    <div>
      <div className="flex items-center justify-between gap-2">
        <span className="text-caption font-semibold text-text-primary">
          결재 진행 현황
        </span>
        <span className="text-caption text-text-primary-blue">
          {doneCount} / {ordered.length} 완료
        </span>
      </div>

      <ol className="mt-2 flex items-start">
        {ordered.map((line, index) => (
          <li
            key={line.lineId}
            className="flex min-w-0 flex-1 flex-col items-center"
          >
            <div className="flex w-full items-center">
              {/* 앞뒤 연결선. 양 끝은 자리만 차지해 동그라미 간격이 균일해진다 */}
              <span
                className={`h-px flex-1 ${index === 0 ? 'bg-transparent' : connectorClass(ordered[index - 1])}`}
              />
              <Marker line={line} step={index + 1} />
              <span
                className={`h-px flex-1 ${
                  index === ordered.length - 1
                    ? 'bg-transparent'
                    : connectorClass(line)
                }`}
              />
            </div>
            <span className="mt-1 w-full truncate px-0.5 text-center text-[9px] text-text-secondary">
              {line.approverName}
            </span>
          </li>
        ))}
      </ol>
    </div>
  );
}

/** 앞 단계가 끝났으면 선을 채워 어디까지 왔는지 보이게 한다 */
function connectorClass(line: ApprovalDetailLine) {
  return line.status === 'APPROVED' ? 'bg-[#12B76A]' : 'bg-bg-sidebar/10';
}

/** 동그라미 색. 승인만 채우고 나머지는 테두리로 구분한다 */
const MARKER_CLASS: Record<ApprovalLineStatus, string> = {
  APPROVED: 'border-[#12B76A] bg-[#12B76A] text-text-white',
  REJECTED: 'border-border-danger bg-bg-card text-text-danger',
  ACTIVE: 'border-border-primary bg-bg-card text-text-primary-blue',
  WAITING: 'border-border-default bg-bg-card text-text-secondary',
  CANCELED: 'border-border-default bg-bg-card text-text-muted',
};

function Marker({ line, step }: { line: ApprovalDetailLine; step: number }) {
  const symbol =
    line.status === 'APPROVED' ? '✓' : line.status === 'REJECTED' ? '✕' : step;

  return (
    // 기호와 색만으로는 상태를 알 수 없다 — 보조기술에는 이름과 상태를 문장으로 준다
    <span
      role="img"
      aria-label={`${line.approverName} ${LINE_STATUS_LABELS[line.status]}`}
      className={`flex size-5 shrink-0 items-center justify-center rounded-pill border text-[9px] font-semibold ${MARKER_CLASS[line.status]}`}
    >
      {symbol}
    </span>
  );
}
