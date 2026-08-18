import type { Role } from '@/features/auth/types';
import type {
  CertificateValue,
  CertificateView,
  EducationValue,
  EducationView,
} from '@/features/masterItem/types';

/** 목록 필터의 상태 값 — `accountStatus` · `passwordStatus` 를 서버가 하나로 받는다 */
export type EmployeeStatusFilter = 'ACTIVE' | 'RESET_REQUIRED' | 'INACTIVE';

/** 인사관리 목록에 나오는 권한 — ADMIN 은 대상이 아니다 */
export type ManagedRole = Extract<Role, 'MASTER' | 'MEMBER'>;

/** 계정 활성 여부. 배지의 `passwordStatus` 와 달리 관리자가 직접 토글한다 */
export type AccountStatus = 'ACTIVE' | 'INACTIVE';

/** 사원 목록 한 줄 (.ai/API.md 30) */
export interface EmployeeSummary {
  userId: string;
  name: string;
  email: string | null;
  /** false 면 로그인도 비밀번호 재설정도 못 한다 */
  emailRegistered: boolean;
  departmentName: string | null;
  /** 상위 조직까지 포함한 경로 — 예: '기술본부 / 개발팀' */
  departmentPath: string | null;
  jobPositionName: string | null;
  role: ManagedRole;
  accountStatus: AccountStatus;
  passwordStatus: 'NORMAL' | 'RESET_REQUIRED';
  /** 퇴사일. null 이면 재직 중 */
  resignedAt: string | null;
  /**
   * 사진 서빙 경로 (`/api/v1/employees/{userId}/profile-image`). 사진이 없으면 `null`.
   *
   * ⚠️ presigned 가 아니라 **만료되지 않는 우리 경로**다 — 그대로 `<img src>` 에 넣는다.
   * ℹ️ 2026-08-17 추가. 이전에는 화면이 사번으로 경로를 만들어 붙였고, 사진이 없는 사람은
   *    매번 404 를 받았다.
   */
  profileImageUrl: string | null;
}

/** 사원 상세 (.ai/API.md 31) — 목록 필드 + 수정 폼 초기값 */
export interface EmployeeDetail extends EmployeeSummary {
  /** 수정 폼 초기값. 미지정이면 null */
  departmentId: number | null;
  jobPositionId: number | null;
  phone: string | null;
  /** yyyy-MM-dd */
  hiredAt: string | null;
  /** yyyy-MM-dd HH:mm:ss */
  lastLoginAt: string | null;
  /**
   * 학력 · 자격증. 마스터를 조인해 **표시명이 함께** 온다.
   * ⚠️ 예전 응답에는 없던 필드라 선택으로 둔다 — 없으면 빈 목록으로 본다.
   */
  educations?: EducationView[];
  certificates?: CertificateView[];
}

/**
 * 이름 검색 결과 한 명 (.ai/API.md 35) — 결재선 지정용.
 *
 * ⚠️ 인사관리 목록(`EmployeeSummary`)과 **필드 이름이 다르다.**
 * 부서 · 직급이 `departmentPath` · `jobPositionName` 이 아니라
 * `department` · `position` 으로 오고, 민감 정보 없이 4개 필드뿐이다.
 */
export interface EmployeeSearchResult {
  userId: string;
  name: string;
  /** 동명이인 구분용. 미지정이면 null */
  department: string | null;
  position: string | null;
  /** 사진 서빙 경로. 없으면 null (2026-08-17 추가) */
  profileImageUrl: string | null;
}

export interface EmployeeListQuery {
  /** 이름 또는 사번 부분 검색 — 서버가 하나로 받는다 */
  keyword?: string;
  departmentId?: number;
  role?: ManagedRole;
  status?: EmployeeStatusFilter;
  /** 미지정이면 재직자만 나온다 */
  resigned?: boolean;
  page?: number;
  size?: number;
}

export interface EmployeePage {
  content: EmployeeSummary[];
  page: number;
  size: number;
  totalElements: number;
  totalPages: number;
}

/**
 * 사원 등록 (.ai/API.md 32) — 계정이 **항상 함께** 발급된다.
 * 사원만 등록하는 경로는 없다.
 */
export interface CreateEmployeeRequest {
  /** 사번 = 로그인 아이디. 등록 후 바꿀 수 없다 (PK) */
  userId: string;
  name: string;
  departmentId: number;
  /** yyyy-MM-dd */
  hiredAt: string;
  /** ADMIN 은 부여할 수 없다 */
  role: ManagedRole;
  jobPositionId?: number;
  /** 초기 비밀번호를 이 주소로 보낸다. 없으면 로그인할 수 없는 계정이 된다 */
  email?: string;
  phone?: string;
  /**
   * 학력 · 자격증 — **마스터 항목에서 고른 id** 를 보낸다 (자유입력이 아니다).
   * 없는 id 를 보내면 404 `MAJOR_NOT_FOUND` · `CERT_NOT_FOUND` 가 온다.
   */
  educations?: EducationValue[];
  certificates?: CertificateValue[];
}

/** 등록 응답 (201) */
export interface CreateEmployeeResult {
  userId: string;
  name: string;
  /** 이메일을 넣지 않았으면 false — 그 계정은 로그인할 수 없다 */
  emailRegistered: boolean;
  /** ⚠️ 메일 발송이 실패해도 201 이다. false 면 재발송해야 로그인할 수 있다 */
  emailSent: boolean;
}

/**
 * 사원 정보 수정 (.ai/API.md 33) — **전달한 필드만** 바뀐다.
 *
 * ⚠️ `undefined`(키 생략) 와 `null` 이 다른 뜻이다.
 * 키를 빼면 "변경 안 함", `null` 을 보내면 "미지정으로 지움".
 * 사번 · 전역 권한은 이 API 로 바꿀 수 없다.
 */
export interface UpdateEmployeeRequest {
  /** 빈값 불가 */
  name?: string;
  phone?: string;
  email?: string;
  departmentId?: number | null;
  jobPositionId?: number | null;
  /** yyyy-MM-dd */
  hiredAt?: string;
  /**
   * 학력 · 자격증은 **부분 수정이 아니라 전체 교체**다.
   *
   * ⚠️ 보낸 배열이 최종 상태가 된다 — **생략하면 기존 유지, `[]` 면 전부 삭제**다.
   *    "안 건드림" 과 "다 지움" 이 다른 요청이라, 폼은 편집 여부를 구분해 보내야 한다.
   */
  educations?: EducationValue[];
  certificates?: CertificateValue[];
}

/** 권한 변경 응답 (.ai/API.md 19) */
export interface UpdateRoleResponse {
  userId: string;
  role: ManagedRole;
}

/** 계정 상태 변경 응답 (.ai/API.md 20) */
export interface UpdateAccountStatusResponse {
  userId: string;
  status: AccountStatus;
}

/** 퇴사 처리 응답 — 퇴사일 기록과 계정 비활성이 한 번에 일어난다 (.ai/API.md 34) */
export interface ResignationResponse {
  userId: string;
  resignedAt: string;
  accountStatus: AccountStatus;
}

/**
 * 비밀번호 재설정 대상. 모달이 실제로 쓰는 필드만 요구한다 —
 * 목록 행 · 상세뿐 아니라 **등록 직후 응답**(메일 실패 재발송)도 그대로 넘길 수 있어야 한다.
 */
export type PasswordResetTarget = Pick<
  EmployeeSummary,
  'userId' | 'name' | 'emailRegistered'
>;

/** 비밀번호 재설정 실패 사유 — 뒤처리가 달라 구분해야 한다 */
export type PasswordResetFailureReason =
  'EMAIL_NOT_REGISTERED' | 'MAIL_SEND_FAILED';

export interface PasswordResetFailure {
  userId: string;
  name: string;
  reason: PasswordResetFailureReason;
  /** true 면 비밀번호는 이미 바뀌었고 메일만 실패했다 — 재발송하지 않으면 로그인할 수 없다 */
  passwordChanged: boolean;
}

/** 실패가 섞여도 200 으로 온다 (.ai/API.md 21) */
export interface PasswordResetResult {
  requestedCount: number;
  successCount: number;
  failedCount: number;
  failures: PasswordResetFailure[];
}

/**
 * 엑셀 일괄 등록의 행 오류 (.ai/API.md 88 · 89).
 * 검증과 등록이 **같은 구조**를 쓴다 — 등록 후에도 실패한 행을 같은 표로 보여준다.
 */
export interface BulkRowError {
  /** 엑셀 행 번호 — 사용자가 파일에서 찾아갈 좌표라 그대로 보여준다 */
  row: number;
  /** 그 행을 못 읽었으면 비어 있다 */
  userId: string | null;
  name: string | null;
  validation: string;
  /** 백엔드 문구를 그대로 표시한다 */
  message: string;
}

/**
 * 일괄 등록 검증 결과 (.ai/API.md 88).
 *
 * ⚠️ **오류 행이 있어도 200** 이다 — `errorCount` 로 분기한다.
 * 400 은 파일 자체 문제 3종(없음 · 확장자 · 5MB 초과)뿐이다.
 */
export interface BulkValidateResult {
  totalRows: number;
  validCount: number;
  errorCount: number;
  errors: BulkRowError[];
  /** 이메일이 없는 행 수 — 오류가 아니라 **등록은 되고 메일만 못 간다** */
  emailNotRegisteredCount: number;
}

/** 일괄 등록 결과 (.ai/API.md 89) */
export interface BulkRegisterResult {
  totalRows: number;
  registeredCount: number;
  failedCount: number;
  /** 행마다 독립 트랜잭션이라 일부만 실패할 수 있다 */
  errors: BulkRowError[];
  emailSentCount: number;
  /** 이메일이 없어 초기 비밀번호를 못 보낸 사번 */
  emailNotRegistered: string[];
}
