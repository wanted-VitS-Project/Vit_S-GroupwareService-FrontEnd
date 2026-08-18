import { ENDPOINTS } from '@/constants/endpoints';
import { api } from '@/lib/api';

import type { MasterItem, MasterItemKind } from './types';

/**
 * 전공 · 자격증 마스터 API. 경로만 다르고 요청 · 응답이 같아 종류를 받아 갈라 쓴다.
 * 응답 필드 이름은 도메인마다 달라 여기서 공용 모양(MasterItem)으로 바꾼다.
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

/** 목록. 페이징이 없고 응답이 한 겹 감싸져 온다 */
export function getMasterItems(kind: MasterItemKind, signal?: AbortSignal) {
  return api
    .get<{ majors?: MajorResponse[]; certificates?: CertificateResponse[] }>(
      pathOf(kind).root,
      signal,
    )
    .then((data) => (data.majors ?? data.certificates ?? []).map(toItem));
}

/** 생성. 이름이 겹치면 409 다 */
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
 * 삭제. 쓰는 사원이 있으면 409 다.
 * deletable 로 미리 잠그지만 그 사이 등록되면 막히므로 부르는 쪽이 안내한다.
 */
export function deleteMasterItem(
  kind: MasterItemKind,
  id: number,
  signal?: AbortSignal,
) {
  return api.delete<void>(pathOf(kind).detail(id), signal);
}
