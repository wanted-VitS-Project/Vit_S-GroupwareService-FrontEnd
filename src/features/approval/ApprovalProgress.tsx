import type { ApprovalLine } from './types';

/**
 * 결재 진행 현황 스텝퍼. (AP-046)
 *
 * ❗ 회차 상세 응답의 `lines[]` 에 아직 처리 상태가 없다.
 * `status` 가 오면 ✓ · ✗ · 현재 차례를 칠하고, 없으면 순서와 이름만 그린다 —
 * 없는 값을 추측해 완료로 표시하면 실제와 어긋난 화면이 된다.
 */
export default function ApprovalProgress({ lines }: { lines: ApprovalLine[] }) {
  if (lines.length === 0) {
    return (
      <p className="text-[10px] text-[#6C7389]">지정된 결재자가 없습니다.</p>
    );
  }

  const ordered = [...lines].sort((a, b) => a.order - b.order);
  const doneCount = ordered.filter((line) => line.status === 'APPROVED').length;
  /** 상태가 하나도 없으면 카운트가 늘 0이라 오해를 부른다 — 아예 숨긴다 */
  const hasStatus = ordered.some((line) => line.status !== undefined);

  return (
    <div>
      <div className="flex items-center justify-between gap-2">
        <span className="text-[10px] font-semibold text-[#1C1F2A]">
          결재 진행 현황
        </span>
        {hasStatus && (
          <span className="text-[10px] text-[#3B5BDB]">
            {doneCount} / {ordered.length} 완료
          </span>
        )}
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
            <span className="mt-1 w-full truncate px-0.5 text-center text-[9px] text-[#6C7389]">
              {line.approverName}
            </span>
          </li>
        ))}
      </ol>
    </div>
  );
}

/** 앞 단계가 끝났으면 선을 채워 어디까지 왔는지 보이게 한다 */
function connectorClass(line: ApprovalLine) {
  return line.status === 'APPROVED' ? 'bg-[#12B76A]' : 'bg-[#1C1F2A]/10';
}

function Marker({ line, step }: { line: ApprovalLine; step: number }) {
  const base =
    'flex size-5 shrink-0 items-center justify-center rounded-full border text-[9px] font-semibold';

  if (line.status === 'APPROVED') {
    return (
      <span
        className={`${base} border-[#12B76A] bg-[#12B76A] text-white`}
        title={`${line.approverName} 승인`}
      >
        ✓
      </span>
    );
  }
  if (line.status === 'REJECTED') {
    return (
      <span
        className={`${base} border-[#E7000B] bg-white text-[#E7000B]`}
        title={`${line.approverName} 반려`}
      >
        ✕
      </span>
    );
  }
  if (line.status === 'ACTIVE') {
    return (
      <span
        className={`${base} border-[#3B5BDB] bg-white text-[#3B5BDB]`}
        title={`${line.approverName} 결재 차례`}
      >
        {step}
      </span>
    );
  }
  return (
    <span className={`${base} border-[#1C1F2A]/15 bg-white text-[#6C7389]`}>
      {step}
    </span>
  );
}
