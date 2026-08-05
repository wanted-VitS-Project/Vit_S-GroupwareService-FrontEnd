'use client';

import BlockCard from './BlockCard';
import ChecklistBlock from './ChecklistBlock';
import { BLOCK_COLUMNS, type StepBlock } from './types';

/** Tailwind 가 조합된 클래스명을 못 읽으므로 완성된 문자열로 매핑한다 */
const COL_SPAN_CLASS: Record<number, string> = {
  1: 'col-span-1',
  2: 'col-span-2',
  3: 'col-span-3',
};

/**
 * 스텝 화면의 블록 보드.
 *
 * 가로는 3칸 고정, 세로는 제한 없이 늘어난다.
 * `rowIndex` 가 같은 블록끼리 한 행을 이루고, **같은 행은 높이를 공유한다**
 * (grid 행 높이가 가장 긴 블록에 맞춰지고 각 블록이 `h-full` 로 늘어난다).
 */
export default function BlockBoard({ blocks }: { blocks: StepBlock[] }) {
  // 응답이 이미 정렬되어 오지만, 행 경계를 확실히 하려고 여기서도 묶고 정렬한다
  const rows = [...new Set(blocks.map((block) => block.rowIndex))]
    .sort((a, b) => a - b)
    .map((rowIndex) => ({
      rowIndex,
      blocks: blocks
        .filter((block) => block.rowIndex === rowIndex)
        .sort((a, b) => a.sortOrder - b.sortOrder),
    }));

  if (rows.length === 0) {
    return (
      <p className="rounded-lg border border-dashed border-[#1C1F2A]/10 px-4 py-10 text-center text-xs text-[#6C7389]">
        아직 블록이 없습니다. `Block 추가` 로 시작해보세요.
      </p>
    );
  }

  return (
    <div className="flex flex-col gap-4">
      {rows.map((row) => (
        <div
          key={row.rowIndex}
          className="grid grid-cols-3 items-stretch gap-4"
        >
          {row.blocks.map((block) => {
            // 범위를 벗어난 값이 와도 레이아웃이 깨지지 않게 1~3 으로 자른다
            const span = Math.min(Math.max(block.colSpan, 1), BLOCK_COLUMNS);

            return (
              <div
                key={block.blockId}
                className={`min-w-0 ${COL_SPAN_CLASS[span]}`}
              >
                <BlockBody block={block} />
              </div>
            );
          })}
        </div>
      ))}
    </div>
  );
}

/** 유형별 본문 분기. 아직 구현되지 않은 유형은 껍데기만 그린다 */
function BlockBody({ block }: { block: StepBlock }) {
  if (block.type === 'CHECKLIST') return <ChecklistBlock block={block} />;

  // TODO: 유형별 블록 구현 (TEXT · IMAGE · FILE · APPROVAL · …)
  return (
    <BlockCard block={block}>
      <p className="text-[10px] text-[#6C7389]">준비 중인 블록입니다.</p>
    </BlockCard>
  );
}
