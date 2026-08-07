import { LINE_STATUS_CLASS, LINE_STATUS_LABELS } from './lineStatus';
import type { ApprovalDetailLine } from './types';

/** `2026-08-06T18:06:26` → `2026.08.06 18:06` — 처리 시각은 분까지 본다 */
function formatDateTime(value: string) {
  const [date, time] = value.split('T');
  return `${date.replaceAll('-', '.')} ${time?.slice(0, 5) ?? ''}`.trim();
}

/**
 * 결재선 타임라인. (AP-037·038·069·070)
 *
 * 세로로 이어진 단계마다 처리 결과 · 의견 · 처리 일시를 붙인다.
 * 상태를 색으로만 알리지 않고 **라벨을 함께 적는다** — 색만으로는 구분되지 않는 사용자가 있다.
 */
export default function ApprovalTimeline({
  lines,
  currentUserId,
}: {
  lines: ApprovalDetailLine[];
  currentUserId: string;
}) {
  const ordered = [...lines].sort((a, b) => a.order - b.order);

  return (
    <ol className="flex flex-col">
      {ordered.map((line, index) => (
        <li key={line.lineId} className="flex gap-3">
          <div className="flex flex-col items-center">
            <span
              aria-hidden
              className={`flex size-7 shrink-0 items-center justify-center rounded-full text-[11px] font-semibold ${LINE_STATUS_CLASS[line.status]}`}
            >
              {line.status === 'APPROVED'
                ? '✓'
                : line.status === 'REJECTED'
                  ? '✕'
                  : line.order}
            </span>
            {index < ordered.length - 1 && (
              <span className="w-px flex-1 bg-[#1C1F2A]/10" />
            )}
          </div>

          <div className="min-w-0 flex-1 pb-5">
            <p className="flex flex-wrap items-center gap-1.5">
              <span className="text-xs font-semibold text-[#1C1F2A]">
                {line.approverName}
              </span>
              {line.approverPosition && (
                <span className="text-[11px] text-[#6C7389]">
                  {line.approverPosition}
                </span>
              )}
              {line.approverId === currentUserId && (
                <span className="rounded bg-[#ECEEF4] px-1.5 py-0.5 text-[10px] text-[#6C7389]">
                  나
                </span>
              )}
              <span
                className={`rounded-full px-2 py-0.5 text-[10px] font-semibold ${LINE_STATUS_CLASS[line.status]}`}
              >
                {LINE_STATUS_LABELS[line.status]}
              </span>
            </p>

            {line.approverDepartment && (
              <p className="mt-0.5 text-[11px] text-[#6C7389]">
                {line.approverDepartment}
              </p>
            )}

            {line.opinion && (
              <p className="mt-1.5 rounded-lg bg-[#ECEEF4]/60 px-2.5 py-2 text-[11px] break-keep text-[#1C1F2A]">
                {line.opinion}
              </p>
            )}

            {line.processedAt && (
              <p className="mt-1 text-[10px] text-[#6C7389]">
                {formatDateTime(line.processedAt)}
              </p>
            )}
          </div>
        </li>
      ))}
    </ol>
  );
}
