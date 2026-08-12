/**
 * 프로젝트 문서함 · 휴지통의 평면 목록을 **스텝 → 블록 트리**로 조합한다. (명세 105 · 106번)
 *
 * 서버가 트리를 주지 않고 `stepId` → `blockId` → 연결일 순으로 정렬된 평면 배열을 준다 —
 * 이미 정렬돼 있으므로 **순서를 유지하며 훑기만** 하면 된다 (다시 정렬하지 않는다).
 */

import type { FileLocation } from '@/features/file/types';

/** 블록이 지워진 고아 파일을 모을 가상 블록 키 */
const ORPHAN_BLOCK_KEY = 'orphan';

export interface FileBlockGroup<T> {
  /** `blockId` 또는 고아 묶음 키 — React `key` 로 그대로 쓴다 */
  key: string;
  blockId: number | null;
  blockTitle: string | null;
  blockDeleted: boolean;
  files: T[];
}

export interface FileStepGroup<T> {
  stepId: number;
  stepName: string;
  /** 이 스텝의 전체 문서 수 — 머리에 그대로 표시한다 */
  fileCount: number;
  blocks: FileBlockGroup<T>[];
}

/**
 * 스텝 → 블록으로 묶는다.
 *
 * 고아 파일(`blockDeleted: true`)은 **블록마다 흩어 두지 않고 스텝당 한 묶음**으로 모은다 —
 * 삭제된 블록은 제목이 `null` 로 와서 서로 구분할 수 없기 때문이다.
 */
export function groupFilesByStep<T extends FileLocation>(
  files: T[],
): FileStepGroup<T>[] {
  const steps = new Map<number, FileStepGroup<T>>();
  const blocks = new Map<string, FileBlockGroup<T>>();

  for (const file of files) {
    let step = steps.get(file.stepId);
    if (!step) {
      step = {
        stepId: file.stepId,
        stepName: file.stepName,
        fileCount: 0,
        blocks: [],
      };
      steps.set(file.stepId, step);
    }
    step.fileCount += 1;

    // 블록이 지워졌으면 ID 가 없거나 믿을 수 없다 — 스텝 단위 고아 묶음으로 보낸다
    const isOrphan = file.blockDeleted || file.blockId === null;
    const blockKey = `${file.stepId}:${
      isOrphan ? ORPHAN_BLOCK_KEY : file.blockId
    }`;

    let block = blocks.get(blockKey);
    if (!block) {
      block = {
        key: blockKey,
        blockId: isOrphan ? null : file.blockId,
        blockTitle: isOrphan ? null : file.blockTitle,
        blockDeleted: isOrphan,
        files: [],
      };
      blocks.set(blockKey, block);
      step.blocks.push(block);
    }
    block.files.push(file);
  }

  /*
   * 고아 묶음은 스텝 안에서 **맨 뒤**로 보낸다.
   * 서버 정렬(`blockId` 순)을 따르면 `null` 블록이 어디에 끼일지 응답마다 달라진다.
   */
  for (const step of steps.values()) {
    step.blocks.sort(
      (left, right) => Number(left.blockDeleted) - Number(right.blockDeleted),
    );
  }

  return [...steps.values()];
}
