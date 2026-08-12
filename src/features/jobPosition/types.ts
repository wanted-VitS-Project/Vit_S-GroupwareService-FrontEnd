export const JOB_POSITION_NAME_MAX_LENGTH = 30;

/** 직급 — 사원에게 지정하는 직위 분류 (.ai/API.md 26~29) */
export interface JobPosition {
  jobPositionId: number;
  name: string;
  /** 노출 순서. UNIQUE 가 아니라 값이 겹칠 수 있다 */
  sortOrder: number;
  /** 사용 인원 (시스템 계정 · 퇴사자 제외). 0 이 아니면 삭제할 수 없다 */
  employeeCount: number;
}

export interface CreateJobPositionRequest {
  name: string;
  /** 생략하면 백엔드가 마지막 + 1 로 넣는다 */
  sortOrder?: number;
}

/** 보낸 필드만 바뀐다. 둘 다 없으면 400 */
export interface UpdateJobPositionRequest {
  name?: string;
  sortOrder?: number;
}

/** 직급별 사원 한 줄 (.ai/API.md 90) */
export interface JobPositionEmployee {
  userId: string;
  name: string;
  departmentName: string | null;
  /** 2단 경로 (예: `기술본부 / 개발팀`) */
  departmentPath: string | null;
}

/**
 * 직급별 사원 목록 응답.
 * `employeeCount` 와 같은 기준이다 — **재직자만** (시스템 계정 · 퇴사자 제외).
 */
export interface JobPositionEmployeePage {
  jobPositionId: number;
  jobPositionName: string;
  content: JobPositionEmployee[];
}
