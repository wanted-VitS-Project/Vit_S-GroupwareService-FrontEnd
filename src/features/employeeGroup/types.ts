/**
 * 사원 그룹 타입. (.ai/API.md 91~97 · `사원 그룹 도메인 — 공통`)
 *
 * ⚠️ 그룹은 **권한이 아니다** — 멤버 선택 · 페이지 권한 부여를 돕는 선택용 인덱스다.
 *    권한은 부여 시점에 개인 단위 스냅샷으로 저장되므로, 그룹을 지우거나 구성원을 빼도
 *    **이미 부여된 권한은 그대로다.** 화면 문구가 이 사실을 흐리지 않아야 한다.
 */

/** 서버 상한과 같은 값 — `maxLength` 로 미리 막아 400 왕복을 줄인다 */
export const GROUP_NAME_MAX_LENGTH = 50;
export const GROUP_DESCRIPTION_MAX_LENGTH = 500;

export interface EmployeeGroup {
  groupId: number;
  name: string;
  description: string | null;
  /** 시스템 계정 · 퇴사자를 제외한 수 */
  memberCount: number;
  createdByName: string;
  createdAt: string;
}

/** 생성 · 수정 공용 폼 값 — 수정은 바뀐 필드만 골라 보낸다 */
export interface EmployeeGroupForm {
  /** 최대 50자 */
  name: string;
  /** 최대 500자 */
  description: string;
}

export interface CreateEmployeeGroupRequest {
  name: string;
  description?: string;
}

/** 보낸 필드만 바뀐다 — 수정할 필드가 하나도 없으면 400 이다 */
export type UpdateEmployeeGroupRequest = Partial<CreateEmployeeGroupRequest>;

export interface GroupMember {
  userId: string;
  name: string;
  /** 2단 부서 경로 (예: `기술본부 / 개발팀`) */
  departmentPath: string | null;
  jobPositionName: string | null;
  addedAt: string;
}

/** 구성원 목록 응답 — 그룹 정보가 함께 온다 */
export interface GroupMemberPage {
  groupId: number;
  name: string;
  content: GroupMember[];
}

/**
 * 구성원 추가 결과.
 * 멱등이라 이미 소속인 사번은 조용히 skip 되고 `alreadyMemberCount` 로만 잡힌다 —
 * 요청 수와 추가 수가 다른 게 정상이므로 화면이 집계를 보여줘야 한다.
 */
export interface AddMembersResult {
  groupId: number;
  requestedCount: number;
  addedCount: number;
  alreadyMemberCount: number;
  memberCount: number;
}

/** 구성원 제거 결과 — 갱신된 인원수만 온다 */
export interface RemoveMemberResult {
  groupId: number;
  memberCount: number;
}
