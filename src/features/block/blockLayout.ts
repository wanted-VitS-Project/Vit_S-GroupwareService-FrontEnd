// 블록 배치 계산 — 서버의 rowIndex·sortOrder 와 화면의 평면 배열을 서로 옮긴다.

import {
  BLOCK_COLUMNS,
  type BlockLayout,
  type BlockLayoutOrder,
  type StepBlock,
} from './types';

/** 범위를 벗어난 값이 와도 레이아웃이 깨지지 않게 1~3 으로 자른다 */
export function toSpan(colSpan: number) {
  return Math.min(Math.max(colSpan, 1), BLOCK_COLUMNS);
}

// 서버 응답을 rowIndex·sortOrder 순의 평면 배열로 편다.
// 보드는 행을 직접 들고 있지 않는다. 순서는 이 배열 하나뿐이고,
// 행은 computeRows() 가 매번 다시 만든다 — 이동이 배열 한 번 갈아끼우기로 끝난다.
export function toFlatOrder(blocks: StepBlock[]): StepBlock[] {
  return [...blocks].sort(
    (left, right) =>
      left.rowIndex - right.rowIndex || left.sortOrder - right.sortOrder,
  );
}

// 평면 순서를 앞에서부터 3칸씩 채워 행으로 묶는다.
// 남은 칸보다 넓은 블록이 오면 다음 행으로 넘긴다 — 한 행이 3칸을 넘지 않는다.
export function computeRows(blocks: StepBlock[]): StepBlock[][] {
  const rows: StepBlock[][] = [];
  let row: StepBlock[] = [];
  let usedColumns = 0;

  for (const block of blocks) {
    const span = toSpan(block.colSpan);

    if (usedColumns + span > BLOCK_COLUMNS) {
      if (row.length > 0) rows.push(row);
      row = [block];
      usedColumns = span;
    } else {
      row.push(block);
      usedColumns += span;
    }
  }
  if (row.length > 0) rows.push(row);

  return rows;
}

// 끄는 블록을 올려둔 블록의 자리로 옮긴다 (원본은 건드리지 않는다).
// 커서가 대상의 왼쪽인지 오른쪽인지를 보지 않고 끌어온 방향으로 정한다 —
// 뒤에서 왔으면 대상 앞, 앞에서 왔으면 대상 뒤. 결국 둘이 자리를 맞바꾼다.
// 좌우 절반으로 앞/뒤를 정하면 아무 일도 안 일어나는 사각지대가 생긴다.
// (바로 뒤 블록을 이웃의 오른쪽 절반에 놓으면 "이웃 뒤" = 원래 자리)
// 마지막 블록은 오른쪽에 칸이 없어 이 사각지대에만 걸려 "안 잡히는" 것처럼 보였다.
// 놓기 전 미리보기와 실제 확정에 같은 함수를 쓴다 — 보이는 대로 확정된다.
export function moveTo(
  blocks: StepBlock[],
  draggedId: number,
  targetId: number,
): StepBlock[] {
  if (draggedId === targetId) return blocks;

  const from = blocks.findIndex((block) => block.blockId === draggedId);
  const to = blocks.findIndex((block) => block.blockId === targetId);
  if (from === -1 || to === -1) return blocks;

  const next = [...blocks];
  const [dragged] = next.splice(from, 1);
  // 끄는 블록을 뺀 뒤라 to 는 앞에서 왔을 때 "대상 뒤", 뒤에서 왔을 때 "대상 앞" 이 된다
  next.splice(to, 0, dragged);

  return next;
}

// 끄는 블록을 지정한 블록 바로 뒤로 보낸다.
// 빈 칸 안내(DropSlot)처럼 자리가 딱 정해진 경우에만 쓴다 — 방향과 무관하다.
export function moveAfter(
  blocks: StepBlock[],
  draggedId: number,
  afterId: number,
): StepBlock[] {
  if (draggedId === afterId) return blocks;

  const dragged = blocks.find((block) => block.blockId === draggedId);
  if (!dragged) return blocks;

  const rest = blocks.filter((block) => block.blockId !== draggedId);
  const afterAt = rest.findIndex((block) => block.blockId === afterId);
  if (afterAt === -1) return blocks;

  const next = [...rest];
  next.splice(afterAt + 1, 0, dragged);

  return next;
}

// 두 순서가 같은지 본다. 끌던 블록을 바로 뒤 블록 앞에 놓으면
// 배열은 새로 만들어져도 순서는 그대로다 — 이때 저장 요청을 아끼려고 쓴다.
export function hasSameOrder(left: StepBlock[], right: StepBlock[]) {
  return (
    left.length === right.length &&
    left.every((block, index) => block.blockId === right[index].blockId)
  );
}

// 화면에 그려진 행을 그대로 서버 좌표로 옮긴다 — 보이는 배치가 저장되는 배치다.
// 서버가 준 rowIndex·sortOrder 를 재활용하지 않고 0부터 다시 매긴다.
// 재패킹으로 행이 합쳐지거나 갈라지면 원래 값은 이미 화면과 맞지 않는다.
export function toLayouts(rows: StepBlock[][]): BlockLayout[] {
  return rows.flatMap((row, rowIndex) =>
    row.map((block, sortOrder) => ({
      blockId: block.blockId,
      rowIndex,
      sortOrder,
      colSpan: toSpan(block.colSpan),
    })),
  );
}

// 저장 요청용 배치 — 위치에 각 블록의 version 을 얹는다.
// version 이 하나라도 없으면 null 을 준다. 서버가 항목마다 락을 검사하고
// 하나만 어긋나도 요청 전체가 409 로 롤백되므로, 반쪽짜리 요청은 보내 봐야 전부 실패한다.
// (스테이지·스텝 순서 변경과 같은 방침 — StageManageModal.toStepOrders)
// 공통 값 하나로 채우면 안 된다. 컴파일도 되고 요청도 나가지만 전부 409 다.
export function toLayoutOrders(rows: StepBlock[][]): BlockLayoutOrder[] | null {
  const orders: BlockLayoutOrder[] = [];

  for (const [rowIndex, row] of rows.entries()) {
    for (const [sortOrder, block] of row.entries()) {
      if (block.version === undefined) return null;
      orders.push({
        blockId: block.blockId,
        rowIndex,
        sortOrder,
        colSpan: toSpan(block.colSpan),
        version: block.version,
      });
    }
  }

  return orders;
}

// 저장된 배치를 블록에 덮어쓴다.
// 이걸 건너뛰면 블록이 옛 좌표를 든 채 남아 다음 nextPosition() 이 엉뚱한 자리를 고른다.
export function applyLayouts(
  blocks: StepBlock[],
  layouts: BlockLayout[],
): StepBlock[] {
  const byId = new Map(layouts.map((layout) => [layout.blockId, layout]));

  return toFlatOrder(
    blocks.map((block) => {
      const layout = byId.get(block.blockId);
      return layout ? { ...block, ...layout } : block;
    }),
  );
}

// 새 블록이 들어갈 자리 — 초안과 같이 평면 순서의 맨 뒤다.
// 마지막 행에 칸이 남으면 그 행 오른쪽에 붙고, 모자라면 새 행으로 내려간다.
// 좌표는 서버가 준 값이 아니라 다시 패킹한 행 기준으로 매긴다.
// 보드는 computeRows() 로 행을 새로 만들기 때문에, 기존 rowIndex 를 이어 쓰면
// (예: 옛 좌표에 빈 행이 있어 번호가 띄엄띄엄한 경우) 서버 좌표와 화면 배치가 어긋난다.
// toLayouts() 가 저장할 때 쓰는 규칙과 같은 규칙이어야 한다.
export function nextPosition(blocks: StepBlock[], colSpan: number) {
  const rows = computeRows(toFlatOrder(blocks));
  const lastRow = rows.at(-1);
  if (!lastRow) return { rowIndex: 0, sortOrder: 0 };

  const usedColumns = lastRow.reduce(
    (total, block) => total + toSpan(block.colSpan),
    0,
  );

  return usedColumns + toSpan(colSpan) <= BLOCK_COLUMNS
    ? { rowIndex: rows.length - 1, sortOrder: lastRow.length }
    : { rowIndex: rows.length, sortOrder: 0 };
}
