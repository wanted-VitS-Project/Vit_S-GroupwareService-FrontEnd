import { ENDPOINTS } from '@/constants/endpoints';
import { api } from '@/lib/api';

import type { MasterItem, MasterItemKind } from './types';

/**
 * 전공 · 자격증 마스터 API.
 *
 * 두 도메인이 경로만 다르고 요청 · 응답이 같아 **종류를 받아 갈라 쓴다** —
 * 함수를 두 벌 두면 한쪽만 고치는 사고가 난다.
 *
 * ⚠️ 응답 필드 이름은 도메인마다 다르다 (`majorId`/`majors`, `certificateId`/`certificates`).
 *    여기서 공용 모양(`MasterItem`)으로 바꿔 화면에는 한 가지만 넘긴다.
 */

interface MajorResponse {
  majorId: number;
  name: string;
  employeeCount: number;
  deletable: boolean;
}

interface CertificateResponse {
  certificateId: number;
  name: string;
  employeeCount: number;
  deletable: boolean;
}

function pathOf(kind: MasterItemKind) {
  return kind === 'major' ? ENDPOINTS.majors : ENDPOINTS.certificates;
}

function toItem(source: MajorResponse | CertificateResponse): MasterItem {
  return {
    id:
      'majorId' in source
        ? source.majorId
        : (source as CertificateResponse).certificateId,
    name: source.name,
    employeeCount: source.employeeCount,
    deletable: source.deletable,
  };
}

/** 목록 — 페이징이 없다. 응답이 `{ majors: [] }` · `{ certificates: [] }` 로 감싸져 온다 */
export function getMasterItems(kind: MasterItemKind, signal?: AbortSignal) {
  return api
    .get<{ majors?: MajorResponse[]; certificates?: CertificateResponse[] }>(
      pathOf(kind).root,
      signal,
    )
    .then((data) => (data.majors ?? data.certificates ?? []).map(toItem));
}

/** 생성 — 이름이 겹치면 409 (`*_NAME_DUPLICATED`) */
export function createMasterItem(
  kind: MasterItemKind,
  name: string,
  signal?: AbortSignal,
) {
  return api
    .post<MajorResponse | CertificateResponse>(
      pathOf(kind).root,
      { name },
      signal,
    )
    .then(toItem);
}

/** 이름 수정 */
export function updateMasterItem(
  kind: MasterItemKind,
  id: number,
  name: string,
  signal?: AbortSignal,
) {
  return api
    .patch<MajorResponse | CertificateResponse>(
      pathOf(kind).detail(id),
      { name },
      signal,
    )
    .then(toItem);
}

/**
 * 삭제.
 *
 * ⚠️ **쓰는 사원이 있으면 409**(`*_IN_USE`) 다. 목록의 `deletable` 로 미리 잠그지만
 *    그 사이 누가 그 항목으로 등록하면 여기서 막힌다 — 부르는 쪽이 409 를 안내해야 한다.
 */
export function deleteMasterItem(
  kind: MasterItemKind,
  id: number,
  signal?: AbortSignal,
) {
  return api.delete<void>(pathOf(kind).detail(id), signal);
}
