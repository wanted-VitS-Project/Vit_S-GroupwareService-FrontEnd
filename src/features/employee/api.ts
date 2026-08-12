import { ENDPOINTS } from '@/constants/endpoints';
import { api, postForm, requestRaw } from '@/lib/api';
import { saveResponseAsFile } from '@/lib/download';

import type {
  AccountStatus,
  BulkRegisterResult,
  BulkValidateResult,
  CreateEmployeeRequest,
  CreateEmployeeResult,
  EmployeeDetail,
  EmployeeListQuery,
  EmployeePage,
  EmployeeSearchResult,
  ManagedRole,
  PasswordResetResult,
  ResignationResponse,
  UpdateAccountStatusResponse,
  UpdateEmployeeRequest,
  UpdateRoleResponse,
} from './types';

/** 값이 있는 필터만 실어 보낸다 — 빈 문자열을 보내면 그 값으로 검색한다 */
function toSearchParams(query: EmployeeListQuery) {
  const params = new URLSearchParams();

  if (query.keyword) params.set('keyword', query.keyword);
  if (query.departmentId)
    params.set('departmentId', String(query.departmentId));
  if (query.role) params.set('role', query.role);
  if (query.status) params.set('status', query.status);
  if (query.resigned) params.set('resigned', 'true');
  if (query.page) params.set('page', String(query.page));
  if (query.size) params.set('size', String(query.size));

  return params.toString();
}

/** 인사관리용 목록 (ADMIN). 결재선 검색(`/employees/search`)과 다른 API 다 */
export function getEmployees(query: EmployeeListQuery, signal?: AbortSignal) {
  const search = toSearchParams(query);

  const path = search
    ? `${ENDPOINTS.employees.root}?${search}`
    : ENDPOINTS.employees.root;

  return api.get<EmployeePage>(path, signal);
}

/**
 * 이름 검색 (로그인 사용자 전체 — **ADMIN 전용 아님**). 결재선 지정에서 쓴다.
 *
 * ⚠️ 응답이 `content` 래퍼 없는 **배열**이고, 빈 `name` 은 400 이라 호출 측이 막아야 한다.
 * 시스템 계정 · 퇴사자는 후보에 나오지 않는다.
 */
export function searchEmployees(name: string, signal?: AbortSignal) {
  const search = new URLSearchParams({ name }).toString();

  return api.get<EmployeeSearchResult[]>(
    `${ENDPOINTS.employees.search}?${search}`,
    signal,
  );
}

/** 사원 상세 (ADMIN). 목록 필드에 연락처 · 입사일 · 소속 그룹이 더 붙는다 */
export function getEmployee(userId: string, signal?: AbortSignal) {
  return api.get<EmployeeDetail>(ENDPOINTS.employees.detail(userId), signal);
}

/** 사원 등록. 계정이 항상 함께 발급된다 — 메일 실패도 201 이라 응답을 봐야 한다 */
export function createEmployee(body: CreateEmployeeRequest) {
  return api.post<CreateEmployeeResult>(ENDPOINTS.employees.root, body);
}

/**
 * 사원 정보 수정. 보낸 필드만 바뀐다 —
 * 호출 측이 바뀐 필드만 담아야 한다 (`null` 은 "지움" 이라 생략과 다르다).
 */
export function updateEmployee(userId: string, body: UpdateEmployeeRequest) {
  return api.patch<EmployeeDetail>(ENDPOINTS.employees.detail(userId), body);
}

/** 전역 권한 변경. ADMIN 은 부여할 수 없고 자기 자신도 못 바꾼다 */
export function updateEmployeeRole(userId: string, role: ManagedRole) {
  return api.patch<UpdateRoleResponse>(ENDPOINTS.accounts.role(userId), {
    role,
  });
}

/** 계정 활성 · 정지 토글. 퇴사 처리와 다른 API 다 */
export function updateAccountStatus(userId: string, status: AccountStatus) {
  return api.patch<UpdateAccountStatusResponse>(
    ENDPOINTS.accounts.status(userId),
    { status },
  );
}

/** 퇴사 처리 — 퇴사일 기록과 계정 비활성을 한 번에 한다 (.ai/API.md 34) */
export function resignEmployee(userId: string, resignedAt: string) {
  return api.patch<ResignationResponse>(
    ENDPOINTS.employees.resignation(userId),
    { resignedAt },
  );
}

/**
 * 비밀번호 재설정 — 1명이든 여러 명이든 같은 API 다.
 * 실패가 섞여도 200 이라 집계를 화면에 보여줘야 한다.
 */
export function resetPasswords(userIds: string[]) {
  return api.post<PasswordResetResult>(ENDPOINTS.accounts.passwordResets, {
    userIds,
  });
}

/**
 * 엑셀 템플릿 다운로드 (.ai/API.md 87).
 *
 * ⚠️ 응답이 공통 봉투가 아니라 **`.xlsx` 바이너리**라 `api.get` 을 쓸 수 없다.
 */
export async function downloadBulkTemplate(signal?: AbortSignal) {
  const response = await requestRaw(ENDPOINTS.employees.bulkTemplate, signal);

  await saveResponseAsFile(response, '사원_일괄등록_템플릿.xlsx');
}

/**
 * 일괄 등록 검증 (.ai/API.md 88) — 등록하지 않고 행 오류만 받는다.
 *
 * ⚠️ **오류 행이 있어도 200** 이다. 호출 측이 `errorCount` 로 분기해야 한다.
 * 던져지는 400 은 파일 자체 문제 3종뿐이다 (`BULK_FILE_CODES`).
 */
export function validateBulkEmployees(file: File, signal?: AbortSignal) {
  const form = new FormData();
  form.append('file', file);

  return postForm<BulkValidateResult>(
    ENDPOINTS.employees.bulkValidate,
    form,
    signal,
  );
}

/**
 * 일괄 등록 (.ai/API.md 89).
 *
 * `skipErrors` 를 켜면 오류 행을 건너뛰고 나머지만 등록한다 —
 * 끄면 오류가 하나라도 있을 때 400(`EMP_HAS_ERRORS`) 으로 전체가 거부된다.
 * 행마다 독립 트랜잭션이라 **부분 등록이 정상 동작**이다.
 */
export function registerBulkEmployees(
  file: File,
  skipErrors: boolean,
  signal?: AbortSignal,
) {
  const form = new FormData();
  form.append('file', file);
  form.append('skipErrors', String(skipErrors));

  return postForm<BulkRegisterResult>(ENDPOINTS.employees.bulk, form, signal);
}
