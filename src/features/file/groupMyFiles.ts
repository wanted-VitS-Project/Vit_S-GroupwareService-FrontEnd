/**
 * 내 파일(`GET /files/my`)의 평면 목록을 **프로젝트 묶음**으로 조합한다.
 *
 * 서버가 프로젝트 → 스텝 → 블록 순으로 정렬해 주므로 **순서를 유지하며 훑기만** 한다
 * (프로젝트 문서함의 `groupFiles.ts` 와 같은 방침 — 다시 정렬하지 않는다).
 */

import type { MyFile } from './types';

export interface MyFileProjectGroup {
  projectId: number;
  projectName: string;
  files: MyFile[];
}

/** 프로젝트별로 묶는다. 등장 순서가 곧 표시 순서다 */
export function groupMyFilesByProject(files: MyFile[]): MyFileProjectGroup[] {
  const groups = new Map<number, MyFileProjectGroup>();

  for (const file of files) {
    let group = groups.get(file.projectId);

    if (!group) {
      group = {
        projectId: file.projectId,
        projectName: file.projectName,
        files: [],
      };
      groups.set(file.projectId, group);
    }

    group.files.push(file);
  }

  return [...groups.values()];
}

export interface FilterOption {
  value: string;
  label: string;
}

/**
 * 프로젝트 · 확장자 필터의 선택지.
 *
 * ⚠️ **필터가 걸린 응답으로 만들면 안 된다** — 프로젝트 A 를 고른 순간 목록에 A 만 남아
 *    선택지도 A 하나가 되고, 다른 프로젝트로 되돌아갈 수 없다.
 *    그래서 화면은 **필터가 하나도 없을 때의 응답**만 여기에 넘긴다.
 */
export function toFilterOptions(files: MyFile[]) {
  const projects = new Map<number, string>();
  const extensions = new Set<string>();

  for (const file of files) {
    projects.set(file.projectId, file.projectName);
    if (file.extension) extensions.add(file.extension.toLowerCase());
  }

  return {
    projects: [...projects].map<FilterOption>(([projectId, name]) => ({
      value: String(projectId),
      label: name,
    })),
    // 확장자는 등장 순서에 의미가 없어 사전순으로 세운다
    extensions: [...extensions].sort().map<FilterOption>((extension) => ({
      value: extension,
      label: extension.toUpperCase(),
    })),
  };
}
