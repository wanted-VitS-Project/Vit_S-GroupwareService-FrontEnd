# 개발 완료 기록

> 📌 이 파일은 **끝낸 작업의 일지**예요.
> 작업(이슈)을 하나 완료할 때마다 AI에게 "완료" 또는 "WORKLOG에 기록해줘" 라고 하면 아래 양식으로 정리해줘요.
> 최신 기록이 위로 오도록 **위에 쌓아** 가세요.

---

## [2026-08-06] 사원 정보 수정 화면 구현 🚧

브랜치: `feat/employee-detail-edit` · 이슈: #39

### 변경 파일

| 파일                                               | 변경                                                             |
| -------------------------------------------------- | ---------------------------------------------------------------- |
| `src/features/employee/types.ts`                   | 수정 — `UpdateEmployeeRequest` 추가                              |
| `src/features/employee/errorCodes.ts`              | 수정 — `EMP_DEPARTMENT_NOT_FOUND` · `EMP_JOB_POSITION_NOT_FOUND` |
| `src/features/employee/api.ts`                     | 수정 — `updateEmployee()` 추가                                   |
| `src/features/employee/EmployeeEditForm.tsx`       | 생성 — 폼 · 변경분 diff · 이탈 확인 · 에러 분기                  |
| `src/features/employee/EmployeeDetail.tsx`         | 수정 — 헤더에 `정보 수정` 진입점 추가                            |
| `src/features/employee/EmployeeList.tsx`           | 수정 — `toDepartmentOptions` 를 공용 모듈에서 가져오게 변경      |
| `src/features/department/options.ts`               | 생성 — 2단 트리 → 셀렉트 옵션 변환 (목록 · 폼 공용)              |
| `src/app/settings/employees/[id]/edit/page.tsx`    | 생성 — `EmployeeEditForm` 연결                                   |
| `src/app/settings/employees/[id]/account/page.tsx` | **삭제** — 쓰지 않는 stub 라우트                                 |

### 주요 작업 내용

- 상세 조회로 폼 초기값을 채우고, **바뀐 필드만** `PATCH /employees/{userId}` 로 전송
- 직급 · 부서 `미지정` 선택은 `null` 명시 전송, 손대지 않은 필드는 키 자체를 생략
- 사번 · 권한은 읽기 전용 카드로 분리하고 권한은 상세 화면으로 안내
- 변경 없음 → 저장 버튼 비활성, 이름 빈값 · 입사일 비움은 제출 전 차단
- 404(부서 · 직급)는 해당 셀렉트에 인라인 에러 + 옵션 재조회, 사원 404 는 상세로 보내 안내를 맡긴다

### 트러블슈팅

- **`tsc` 가 삭제한 `account` 라우트를 찾지 못한다고 실패** — `.next/types/validator.ts` 가 이전 라우트를 참조하는 생성 캐시였다. `.next/types` 삭제 후 통과
- **PowerShell 에서 `[id]` 경로 삭제 실패** — 대괄호를 와일드카드로 해석한다. `Remove-Item -LiteralPath` 로 처리

### 부수 결정

- **수정 화면 라우트를 `/settings/employees/[id]/edit` 로 확정**하고 기존 `[id]/account` stub 은 삭제했다 — 계정이 아니라 인사 정보를 다루는 화면이고, 계정 관련 동작은 이미 상세 카드에 있다
- **부서에도 `미지정` 옵션을 둔다** — 명세 33 이 `departmentId: null` 클리어를 허용하고, 상세 화면도 `부서 미지정` 을 표시하고 있어 UI 가 그 상태를 만들 수 있어야 일관된다 (등록(#38)에서는 필수)
- `email` · `phone` 삭제는 **빈 문자열**로 보낸다 — 명세에 `null` 표기가 없다. 백엔드 확인 대기 항목으로 `.ai/API.md` 에 등록
- 이메일을 비우면 로그인 불가라 **입력 아래에 경고 문구**를 띄운다 (막지는 않는다)
- 이탈 확인은 `beforeunload`(새로고침 · 탭 닫기) + 취소 버튼 `confirm` 두 갈래다 — App Router 에 라우팅 차단 API 가 없어 브라우저 뒤로가기는 막지 못한다
- `toDepartmentOptions` 를 `features/department/options.ts` 로 올렸다 — 목록 필터와 수정 폼이 같은 변환을 쓴다

### 검증

| 명령                           | 결과               |
| ------------------------------ | ------------------ |
| `npx tsc --noEmit`             | ✅ 에러 0          |
| `npx eslint src/features/... ` | ✅ 에러 0 · 경고 0 |
| 브라우저 동작 확인             | 담당자 직접 확인   |

---

## [2026-08-06] 사원 상세 화면 구현 🚧

브랜치: `feat/employee-detail-edit` · 이슈: #5

### 변경 파일

| 파일                                           | 변경                                                                        |
| ---------------------------------------------- | --------------------------------------------------------------------------- |
| `src/features/employee/types.ts`               | 수정 — `AccountStatus` · `EmployeeDetail` · `EmployeeGroup` · 응답 타입 3종 |
| `src/features/employee/errorCodes.ts`          | 수정 — `ACC_*` 권한/상태 코드 5종 · `EMP_ALREADY_RESIGNED`                  |
| `src/features/employee/api.ts`                 | 수정 — 상세 조회 · 권한 변경 · 계정 상태 · 퇴사 처리 추가                   |
| `src/features/employee/EmployeeDetail.tsx`     | 생성 — 인사 · 계정 카드 · 그룹 칩 · 퇴사 구역                               |
| `src/features/employee/RoleChangeModal.tsx`    | 생성 — 권한 변경 (ADMIN 옵션 제외)                                          |
| `src/features/employee/AccountStatusModal.tsx` | 생성 — 계정 정지 · 활성화 토글                                              |
| `src/features/employee/ResignationModal.tsx`   | 생성 — 퇴사일 입력 · 계정 동시 정지 안내                                    |
| `src/app/settings/employees/[id]/page.tsx`     | `EmployeeDetail` 연결 (stub 교체)                                           |
| `src/features/employee/EmployeeList.tsx`       | 수정 — 목록 행 전체를 눌러 상세로 진입                                      |
| `src/features/employee/routes.ts`              | 생성 — 사원 화면 경로 단일 소스                                             |

### 주요 작업 내용

- 사원 상세 조회 연동 — 인사 정보 · 계정 정보 · 소속 그룹 칩 카드 구성
- 목록에서 상세로 들어가는 동선 개선 — 이름 링크만이 아니라 **행 아무 곳이나** 클릭
- 권한 변경(`PATCH /accounts/{id}/role`) · 계정 상태 토글(`PATCH /accounts/{id}/status`) 모달 연결
- 퇴사 처리(`PATCH /employees/{id}/resignation`) — 퇴사일 입력 + 계정 즉시 정지 안내
- 비밀번호 초기화는 목록의 `PasswordResetModal` 을 `targets={[employee]}` 로 그대로 재사용

### 트러블슈팅

- **행 전체 클릭 + 이름 링크가 겹쳐 `Ctrl+클릭` 이 새 탭과 현재 탭 이동을 동시에 일으켰다** — 링크의 클릭이 `tr` 로 전파돼 `router.push` 까지 실행됐다. 이름 칸 `td` 에 `stopPropagation` 을 걸어 해결 (PR #47 리뷰 지적)
- **PowerShell 로 일괄 치환하다 `EmployeeDetail.tsx` 의 한글이 깨졌다** — `Get-Content` 가 UTF-8 파일을 ANSI 로 읽는다. 추적 전 파일이라 복구가 안 돼 다시 작성. **문자열 치환을 PowerShell 파이프로 하지 않는다**

### 부수 결정

- **자기 자신 · 퇴사자는 권한 · 계정 상태 버튼을 미리 비활성화**한다 — `ACC_SELF_MODIFICATION_NOT_ALLOWED` 를 사후에 받는 것보다 낫고, 비활성 이유는 `title` 툴팁으로 알린다
- **동작 성공 후에는 응답을 부분 반영하지 않고 상세를 재조회**한다 — 권한 변경 응답에 `accountStatus` 가 없어 배지가 어긋날 수 있다
- `ACC_STATUS_UNCHANGED` · `EMP_ALREADY_RESIGNED` · `*_NOT_FOUND` 는 **에러로 띄우지 않고 재조회 후 모달을 닫는다** — 화면이 뒤처졌다는 신호라 사용자가 할 일이 없다
- 404 는 "다시 시도" 대신 **"목록으로"** 를 준다 — 재시도해도 결과가 같다
- **이메일 미등록 사원은 비밀번호 초기화 버튼을 비활성화**하고 상단에 경고 배너를 띄운다 — 메일로 임시 비밀번호를 보내는 기능이라 주소가 없으면 반드시 실패한다
- **퇴사자 상세의 액션 정책**: 권한 변경 · 계정 상태는 비활성(퇴사로 이미 정지됨), 비밀번호 초기화는 활성 유지(재입사 · 인수인계 대비)
- 인사 정보 카드는 2열, 계정 정보 카드는 1열 — 계정 쪽은 값 우측에 동작 버튼이 붙어 2열로 만들면 좁다
- 화면 경로를 `features/employee/routes.ts` 한 곳으로 모았다 — 목록 · 상세 · 수정 5곳에 같은 리터럴이 흩어져 있었다
- 행 전체를 클릭 대상으로 삼되 **이름 칸의 `Link` 는 남겼다** — 행 `onClick` 은 키보드로 닿지 않고 `Ctrl+클릭` 새 탭도 안 된다. 체크박스 · 케밥 칸은 `stopPropagation` 으로 막고, 드래그 선택 중이면(`getSelection()`) 이동하지 않는다
- 퇴사일 기본값은 오늘. `toISOString()` 은 UTC 라 하루 밀려 로컬 필드로 조립한다. 입력 `min` 은 입사일
- 인사 정보 **수정 버튼은 이 이슈에 넣지 않았다** — #39 에서 화면과 함께 붙인다

### 검증

| 명령                                   | 결과               |
| -------------------------------------- | ------------------ |
| `npx tsc --noEmit`                     | ✅ 에러 0          |
| `npx eslint src/features/employee ...` | ✅ 에러 0 · 경고 0 |
| 브라우저 동작 확인                     | 담당자 직접 확인   |

---

## [2026-08-06] 사원 관리 목록 화면 구현 🚧

브랜치: `feat/employees` · 이슈: #4

### 변경 파일

| 파일                                            | 변경                                             |
| ----------------------------------------------- | ------------------------------------------------ |
| `src/features/employee/types.ts`                | 생성 — 목록 · 페이징 · 재설정 결과 타입          |
| `src/features/employee/errorCodes.ts`           | 생성 — `EMP_*` · `ACC_*` · 재설정 실패 사유 문구 |
| `src/features/employee/api.ts`                  | 생성 — 목록 조회 · 비밀번호 재설정               |
| `src/features/employee/EmployeeList.tsx`        | 생성 — 검색 · 필터 · 표 · 다중 선택 · 페이징     |
| `src/features/employee/EmployeeStatusBadge.tsx` | 생성 — 두 원본 값을 배지 하나로 합침             |
| `src/features/employee/PasswordResetModal.tsx`  | 생성 — 확인 → 결과 2단계 · 메일 재발송           |
| `src/components/Pagination.tsx`                 | 생성 — 공용 페이지 이동                          |
| `src/app/settings/employees/page.tsx`           | `EmployeeList` 연결 (`Suspense` 경계 포함)       |
| `src/constants/status.ts`                       | `EmployeeStatus` · 배지 라벨 추가                |
| `src/constants/endpoints.ts`                    | `employees` · `accounts` 엔드포인트 추가         |

### 주요 작업 내용

- 사원 목록 조회 · 검색(`keyword`) · 필터(부서 · 권한 · 상태 · 퇴사자 포함) 구현
- **필터 상태를 URL 쿼리로 관리** — 부서 관리의 "사원 보기" 링크, 새로고침, 뒤로가기가 같은 경로로 동작
- 체크박스 다중 선택 + 일괄 액션 바 → 비밀번호 일괄 초기화
- 재설정 결과 모달 — 요청 · 성공 · 실패 집계 + 실패 목록, `passwordChanged` 인 사원만 골라 **메일 재발송**
- 이메일 미등록 사원은 목록에서 `⚠ 이메일 미등록 · 로그인 불가` 배지로 구분

### 부수 결정

- 상태 배지는 `resignedAt` → `accountStatus` → `passwordStatus` 순으로 판정한다 — 퇴사자는 계정도 함께 비활성되므로 퇴사가 가장 바깥이다
- **권한 변경 · 계정 정지는 목록 케밥에서 뺐다** — 같은 UI 를 상세(#5)에서 또 만들게 된다. 목록 케밥은 `상세 보기` · `비밀번호 초기화` 두 개
- 이름 정렬(`localeCompare('ko')`)은 **지금 페이지 안에서만** 적용된다 — 서버가 페이징해서 주므로 전체 정렬은 백엔드 몫
- 페이지를 옮기거나 필터를 바꾸면 선택을 비운다 — 화면에 없는 대상까지 일괄 처리하면 위험하다
- 엑셀 일괄 등록은 버튼만 두고 `준비 중` 으로 비활성 (백엔드 미구현)
- `useSearchParams` 를 쓰는 화면이라 `page.tsx` 에 `Suspense` 경계를 둔다 (없으면 프리렌더 실패)

### 검증

| 명령               | 결과               |
| ------------------ | ------------------ |
| `npx tsc --noEmit` | ✅ 에러 0          |
| `npx eslint src`   | ✅ 에러 0 · 경고 0 |
| 브라우저 동작 확인 | 담당자 직접 확인   |

---

## [2026-08-06] 부서 관리 화면 구현 🚧

브랜치: `feat/departments` · 이슈: #6

### 변경 파일

| 파일                                                | 변경                                             |
| --------------------------------------------------- | ------------------------------------------------ |
| `src/features/department/types.ts`                  | 생성 — `Department` 트리 · 요청 타입 · 길이 제한 |
| `src/features/department/errorCodes.ts`             | 생성 — 400 · 404 · 409 응답 코드 단일 소스       |
| `src/features/department/api.ts`                    | 생성 — 목록 · 생성 · 수정 · 삭제 호출            |
| `src/features/department/DepartmentList.tsx`        | 생성 — 2단 트리 표 · 권한별 액션 노출            |
| `src/features/department/DepartmentFormModal.tsx`   | 생성 — 추가(최상위 · 하위) · 부서명 수정         |
| `src/features/department/DeleteDepartmentModal.tsx` | 생성 — 삭제 확인 · 사원/하위 부서 차단 안내      |
| `src/app/settings/departments/page.tsx`             | `DepartmentList` 연결 (stub 교체)                |
| `src/constants/endpoints.ts`                        | `departments` 엔드포인트 추가                    |

### 주요 작업 내용

- 부서 2단 트리 표 구현 — 하위 부서는 들여쓰기 + `└` 기호 + 옅은 색으로 구분
- 부서 추가 모달을 최상위 · 하위 공용으로 구현 (`parentId` 유무로 갈림)
- 삭제 차단 2단 방어 — 목록 값(`directEmployeeCount` · `children`)으로 먼저 막고, 409(`DEPT_HAS_EMPLOYEES` · `DEPT_HAS_CHILDREN`)로 다시 막는다
- 행마다 "사원 보기" → `/settings/employees?departmentId={id}` 로 연결

### 부수 결정

- **상위 부서 이동 메뉴를 만들지 않는다** — 수정 API 가 `name` 만 받는다. 타입(`UpdateDepartmentRequest`)에도 이름만 두어 못 박았다
- 하위 부서 행에는 **"하위 부서 추가" 메뉴를 숨긴다** — 2단이 한계라 누르면 `DEPT_MAX_DEPTH_EXCEEDED` 로 실패한다
- 인원 표시는 `totalEmployeeCount`, 삭제 차단 판정은 `directEmployeeCount` — 두 값을 섞지 않는다
- 조회는 전체 사용자라 화면 자체는 열되, **추가 · 수정 · 삭제 버튼은 ADMIN 에게만** 보인다 (실제 차단은 백엔드)
- 부서명 중복 · 길이 오류(`DEPT_NAME_DUPLICATED` · `DEPT_INVALID_REQUEST`)는 입력 아래 인라인, 그 외는 하단 공통 문구

### 검증

| 명령               | 결과               |
| ------------------ | ------------------ |
| `npx tsc --noEmit` | ✅ 에러 0          |
| `npx eslint src`   | ✅ 에러 0 · 경고 0 |
| 브라우저 동작 확인 | 담당자 직접 확인   |

---

## [2026-08-06] 직급 관리 화면 구현 🚧

브랜치: `feat/job-positions` · 이슈: #40

### 변경 파일

| 파일                                                    | 변경                                            |
| ------------------------------------------------------- | ----------------------------------------------- |
| `src/features/jobPosition/types.ts`                     | 생성 — `JobPosition` · 요청 타입 · 길이 제한    |
| `src/features/jobPosition/errorCodes.ts`                | 생성 — 400 · 404 · 409 응답 코드 단일 소스      |
| `src/features/jobPosition/api.ts`                       | 생성 — 목록 · 생성 · 수정 · 삭제 호출           |
| `src/features/jobPosition/JobPositionList.tsx`          | 생성 — 목록 · 순서 변경 · 로딩/빈/실패 상태     |
| `src/features/jobPosition/JobPositionFormModal.tsx`     | 생성 — 추가 · 수정 폼 (이름만 전송)             |
| `src/features/jobPosition/DeleteJobPositionModal.tsx`   | 생성 — 삭제 확인 · 사용 중 차단 안내            |
| `src/app/settings/job-positions/page.tsx`               | 생성 — `JobPositionList` 연결                   |
| `src/components/RowMenu.tsx`                            | 생성 — 표 행 케밥 메뉴 (카테고리 화면에서 승격) |
| `src/components/PanelModal.tsx`                         | 생성 — 설정 화면 공통 모달 껍데기 · 푸터        |
| `src/features/businessCategory/CategoryModal.tsx`       | 삭제 — `PanelModal` 로 이동                     |
| `src/features/businessCategory/CategoryFormModal.tsx`   | `PanelModal` 로 import 교체                     |
| `src/features/businessCategory/DeleteCategoryModal.tsx` | `PanelModal` 로 import 교체                     |
| `src/app/settings/page.tsx`                             | 직급 관리 메뉴 항목 · 아이콘 추가               |
| `src/constants/endpoints.ts`                            | `jobPositions` 엔드포인트 추가                  |

### 주요 작업 내용

- 직급 CRUD 화면 구현 (목록 · 추가 · 수정 · 삭제)
- 위 · 아래 버튼으로 노출 순서 변경 — `sortOrder` 를 이웃과 맞바꾸는 방식
- 사용 인원이 있는 직급은 삭제 차단 (`POS_IN_USE`) · 직급명 중복은 입력 아래 인라인 표시
- 행 케밥 메뉴 · 모달 껍데기를 `components/` 로 승격해 카테고리 화면과 공유

### 부수 결정

- **순서 입력 필드를 만들지 않는다** — 추가 시 `sortOrder` 를 생략하면 백엔드가 마지막+1 로 넣고, 변경은 목록의 ↑↓ 버튼으로 한다. 숫자 입력과 버튼이 기능이 겹친다
- `sortOrder` 는 UNIQUE 가 아니라 이웃과 값이 같을 수 있다 — 그때는 맞바꿔도 순서가 그대로여서 `이웃값 ± 1` 을 넣어 확실히 넘긴다
- 순서 변경은 성공 · 실패 모두 목록을 다시 불러 **서버 순서를 진실로 삼는다** (두 번째 PATCH 만 실패하면 어긋난 채로 남기 때문)
- 정렬은 백엔드가 `sortOrder` → 직급명 순으로 주므로 화면에서 다시 정렬하지 않는다
- 성공 토스트는 이번 범위에서 제외 — 모달이 닫히고 목록이 갱신되는 것으로 대신한다 (전역 토스트는 백로그)

### 코드 리뷰 반영 (CodeRabbit)

- **순서 변경이 동률 3개 이상에서 깨졌다** — 이웃과 값만 맞바꾸면 `[5,5,5]` 에서 한 칸이 아니라 목록 끝까지 밀린다. 옮긴 뒤의 화면 순서대로 1부터 다시 매기고 **값이 달라진 직급만** 보내는 방식으로 교체
- 순서 변경 실패 시 안내 문구가 없었다 → 표 위에 `role="alert"` 문구 추가
- 재조회 때마다 표가 사라지고 `불러오는 중…` 으로 바뀌어 스크롤이 튀었다 → 갱신 중에는 **직전 목록을 유지**
- 폼 모달에서 값을 고쳐도 일반 오류 문구가 남았다 → `changeName` 이 `nameError` 와 `error` 를 함께 지운다
- 오류 문구 요소를 조건부로 렌더하면 스크린리더가 놓친다 → 요소는 항상 두고 `empty:hidden` 으로 감춘다 (두 모달 방식 통일)
- 케밥 메뉴가 `body` 에 떠서 Tab 으로 닿지 않았다 → 열면 첫 항목에 포커스, ESC · 항목 선택 시 트리거로 복귀. `role="menu"` · `role="menuitem"` 추가

### 검증

| 명령               | 결과               |
| ------------------ | ------------------ |
| `npx tsc --noEmit` | ✅ 에러 0          |
| `npx eslint src`   | ✅ 에러 0 · 경고 0 |
| 브라우저 동작 확인 | 담당자 직접 확인   |

---

## [2026-08-06] 스텝 화면 탭 내비게이션 · 화면 전환 깜빡임 수정 🚧

브랜치: `user/project` · 이슈: #42

### 변경 파일

| 파일                                                         | 변경                                            |
| ------------------------------------------------------------ | ----------------------------------------------- |
| `src/components/StepTabs.tsx`                                | 생성 — 블록 · 일정 · 활동 기록 탭               |
| `src/app/projects/[id]/steps/[stepId]/layout.tsx`            | 생성 — 탭바를 3개 화면에 공통 노출              |
| `src/app/projects/[id]/steps/[stepId]/issue/page.tsx`        | 생성 — 일정 화면 스텁                           |
| `src/app/projects/[id]/steps/[stepId]/log/page.tsx`          | 생성 — 활동 기록 화면 스텁                      |
| `src/app/projects/[id]/layout.tsx`                           | 본문 여백(`p-6`) 제거 — 각 화면이 직접 잡는다   |
| `src/app/projects/[id]/page.tsx` · `settlement` · `settings` | `p-6` 추가 (여백 이관에 맞춤)                   |
| `src/app/globals.css`                                        | `html { scrollbar-gutter: stable }`             |
| `src/features/block/StepBlocks.tsx`                          | 조회 중 문구 한 줄 → 보드 스켈레톤              |
| `src/components/ProjectSidebar.tsx`                          | 프로젝트 정보 조회 중 문구 한 줄 → 스켈레톤 5줄 |

### 주요 작업 내용

- **스텝 탭 내비게이션** — `블록`(`/`) · `일정`(`/issue`) · `활동 기록`(`/log`) 3개 탭. 활성 탭은 `border-b-2 #3B5BDB`, `aria-current="page"` 로 표시
- **탭바 높이를 사이드바 `홈으로 돌아가기` 줄과 통일** — `h-13`(52px) 고정 + `items-stretch` 로 활성 밑줄이 바 하단에 붙게 함. 두 요소의 하단 경계선이 가로로 맞는다
- **경로 이동 시 깜빡임 3건 수정** (아래 트러블슈팅)

### 트러블슈팅

- **문제**: 사이드바 · 탭으로 경로를 옮기면 콘텐츠가 좌우로 흔들린다
- **원인**: `AppShell` 이 `min-h-screen` 인데 화면마다 스크롤 주체가 다르다. 목록 화면은 문서가 길어져 스크롤바가 생기고, 프로젝트 상세는 내부 `overflow-y-auto` 라 문서 스크롤바가 없다 → 오갈 때마다 폭이 스크롤바 너비만큼 변한다
- **해결**: `html { scrollbar-gutter: stable }` — 스크롤바 자리를 항상 비워 둔다

- **문제**: 스텝 탭을 왕복하면 블록 보드가 사라졌다 다시 나타난다
- **원인**: `StepBlocks` 는 `블록` 탭 페이지에만 있어 탭을 옮기면 언마운트되고, 되돌아오면 재마운트 → `/blocks` 재요청. 그동안 화면이 `불러오는 중…` 한 줄로 줄어 높이가 수백 px 급변한다
- **해결**: 조회 중에도 자리를 지키는 3칸 스켈레톤으로 교체. 재요청 자체를 없애려면 서버 상태 캐시가 필요해 백로그로 남긴다

- **문제**: 프로젝트 진입 시 사이드바 아래쪽(`진행 단계`)이 한 번 아래로 밀린다
- **원인**: 프로젝트 정보 블록이 `불러오는 중…` 한 줄이었다가 로드 후 5줄로 커진다
- **해결**: 최종 높이에 맞춘 스켈레톤 5줄(제목 · 발주처 · 설명 · 진행률 바 · 기간)

- **문제**: 새 레이아웃을 추가한 직후 `tsc` 가 `Type 'Route' does not satisfy the constraint 'LayoutRoutes'` 로 실패
- **원인**: Next 가 생성한 `.next/types/routes` 가 새 레이아웃 경로를 아직 모른다
- **해결**: `npm run build` 로 타입을 재생성한 뒤 검사한다 (코드 문제가 아니다)

### 부수 결정

- **여백 책임을 레이아웃 → 화면으로 옮김** — 탭바가 사이드바 오른쪽 끝까지 닿아야 하는데 `projects/[id]/layout.tsx` 의 `p-6` 이 안쪽으로 밀어냈다. 음수 마진(`-m-6`)으로 상쇄하면 부모 패딩 값에 결합돼 조용히 깨진다. 본문 영역은 full-bleed 로 두고 각 화면이 여백을 잡는다
- **탭 활성 판정은 `pathname === href`** — `startsWith` 면 `/issue` 에서 `블록` 탭도 함께 활성된다
- **`StepTabs` 는 `components/`** — `Sidebar` · `ProjectSidebar` 와 같은 레이아웃 크롬이라 도메인 폴더로 두지 않았다
- **스켈레톤은 `role="status"` + `aria-label`**, 개별 자리표시 `<span>` 은 `aria-hidden` — 스크린리더가 빈 상자를 읽지 않고 상태만 안내한다
- **`활동 기록` 아이콘은 시계로 그림** — 시안 vector 가 원 하나뿐이라 그대로는 의미가 안 읽힌다. 바늘을 더해 이력 아이콘으로 만들었다

### 검증

| 명령               | 결과                           |
| ------------------ | ------------------------------ |
| `npm run build`    | ✅ 성공 (라우트 3개 생성 확인) |
| `npx tsc --noEmit` | ✅ 에러 0                      |
| `npx eslint .`     | ✅ 에러 0 · 경고 0             |
| `prettier --check` | ✅ 통과                        |

### 남은 일 / 확인 필요

- ❗ **`일정` 탭이 `/issue` 로 간다** — 라벨과 경로가 달라 의도 확인 필요
- `issue` · `log` 화면은 스텁 (`<div>스텝별 이슈페이지</div>`) — 기획 · API 확정 후 구현
- 탭 왕복 시 재요청 제거 — 서버 상태 캐시 도입 시 해결
- `loading.tsx` 도입 검토 — 라우트 전환 중 스켈레톤을 Next 가 대신 그려준다

---

## [2026-08-05] 사업 카테고리 관리 · 설정 허브 구현 🚧

브랜치: `feat/business-category` · 이슈: #22

### 변경 파일

| 파일                                                    | 변경                                              |
| ------------------------------------------------------- | ------------------------------------------------- |
| `src/features/businessCategory/api.ts`                  | 생성 — 목록 · 생성 · 수정 · 삭제 호출             |
| `src/features/businessCategory/types.ts`                | 생성 — `BusinessCategory` · 요청 타입 · 길이 제한 |
| `src/features/businessCategory/errorCodes.ts`           | 생성 — 409 · 404 응답 코드 단일 소스              |
| `src/features/businessCategory/CategoryList.tsx`        | 생성 — 목록 · 검색 · 삭제분 포함 토글             |
| `src/features/businessCategory/CategoryModal.tsx`       | 생성 — 카테고리 모달 공통 껍데기 · 푸터           |
| `src/features/businessCategory/CategoryFormModal.tsx`   | 생성 — 추가 · 수정 폼 (변경 필드만 전송)          |
| `src/features/businessCategory/DeleteCategoryModal.tsx` | 생성 — 삭제 확인 · 사용 중 차단 안내              |
| `src/app/settings/page.tsx`                             | 설정 허브 화면 구현 (섹션 · 행 · 준비 중 표시)    |
| `src/app/settings/categories/page.tsx`                  | `CategoryList` 연결                               |
| `src/constants/endpoints.ts`                            | `businessCategories` 엔드포인트 추가              |
| `src/constants/menu.ts`                                 | 설정 허브 진입 주석                               |
| `src/features/auth/errorCodes.ts`                       | `ADMIN_REQUIRED_CODE` → `isPermissionCode` 목록화 |
| `src/features/auth/CurrentUserProvider.tsx`             | 권한 부족 403 판정을 `isPermissionCode` 로 교체   |
| `.ai/API.md`                                            | 사업 카테고리 API 명세 추가                       |

### 주요 작업 내용

- 사업 카테고리 CRUD 화면 구현 (목록 · 검색 · 추가 · 수정 · 삭제)
- 설정 허브 화면 구현 — 하위 관리 화면 진입점을 한 곳에 모으고, 화면 없는 항목은 `준비 중` 비활성 표시
- 권한 부족 403 코드를 목록(`PERMISSION_CODES`)으로 바꿔 도메인별 코드(`BUSINESS_CATEGORY_ADMIN_ONLY`) 대응

### 부수 결정

- 수정은 **바뀐 필드만** 전송 — 셋 다 없으면 백엔드 400
- 검색은 백엔드 `keyword` 를 쓰고 화면에서 다시 필터링하지 않는다
- 삭제는 `deletable === false` 면 미리 차단하되, 목록 조회 이후 연결될 수 있어 409 도 같은 화면에서 받는다

### 코드 리뷰 반영 (CodeRabbit)

- 이름 · 업무코드를 고치면 해당 필드의 서버 오류(409)를 즉시 지운다 — 고친 값이 계속 틀린 것처럼 보였다
- 저장 · 삭제 중에는 모달을 닫지 못하게 한다(취소 · ✕ · ESC · 배경) — 요청은 계속 날아가 목록에 반영된다
- 목록 조회 결과를 `{ key, list | hasFailed }` 로 들고 조건 키가 바뀌면 자동으로 로딩 상태가 되게 함 — 효과 본문에서 상태를 되돌리면 `react-hooks/set-state-in-effect` 에 걸린다

### 남은 일 (이슈 #22 체크리스트 대비)

- 생성일 컬럼 — 목록 API 응답에 `createdAt` 이 없어 보류 (백엔드 확인 필요)
- 페이지네이션 — 목록 API 에 페이징 파라미터가 없어 스크롤로 대체
- 삭제된 행 흐림 처리 — 현재는 `삭제됨` 배지 + 케밥 숨김만 적용
- `deletable === false` 행의 삭제 항목 비활성 + 자물쇠 툴팁 — 삭제 모달 차단 안내로 대체

---

## [2026-08-05] 텍스트 블록 — WYSIWYG 마크다운 에디터 🚧

브랜치: `user/project` · 이슈: #35

> 스텝 블록 보드 · 체크리스트 블록은 아래 항목 참고. 이 항목은 **텍스트 블록만** 다룬다.

### 변경 파일

| 파일                                    | 변경                                                        |
| --------------------------------------- | ----------------------------------------------------------- |
| `src/features/block/MarkdownEditor.tsx` | 생성 — TipTap WYSIWYG 에디터 · 서식 툴바 · `MARKDOWN_CLASS` |
| `src/features/block/MarkdownView.tsx`   | 생성 — 읽기 전용 마크다운 렌더 (카드 미리보기)              |
| `src/features/block/TextBlock.tsx`      | 생성 — 카드 본문 · 글자수 · 편집 진입                       |
| `src/features/block/TextBlockModal.tsx` | 생성 — 편집 모달 · 본문 저장                                |
| `src/features/block/types.ts`           | `TextBlockDetail` · `readTextBlockDetail` · 수정 응답 타입  |
| `src/features/block/api.ts`             | `updateTextBlock` 추가                                      |
| `src/features/block/BlockBoard.tsx`     | `TEXT` 분기 · `autoEditBlockId` 전달                        |
| `src/features/block/StepBlocks.tsx`     | 생성 직후 새 `TEXT` 블록을 찾아 편집창 자동 오픈            |
| `src/constants/endpoints.ts`            | `blocks.text` 등록                                          |
| `package.json` · `package-lock.json`    | TipTap 4종 추가                                             |
| `.ai/API.md`                            | 11번 명세 추가 · 목차 신설 · 섹션 번호 정리 (9~14)          |
| `.ai/LIBRARIES.md`                      | §1 TipTap 4종 · §6 변경 이력                                |

### 주요 작업 내용

- **WYSIWYG 마크다운 에디터** — TipTap + `tiptap-markdown`. 마크다운 원문은 화면에 노출되지 않고 서식 결과만 보인다. `## ` 를 입력하면 즉시 제목으로 바뀌고 기호는 사라진다
- **서식 툴바** — B · I / H1 · H2 · H3 · P / 글머리 · 번호 목록 / 인용 · 코드 · 구분선 / 서식 지우기. 활성 버튼은 `aria-pressed` 로 상태 전달. `Ctrl+B` · `Ctrl+I` 지원
- **본문 저장 연동** — `PATCH /blocks/texts/{txtId}` (전체 내용 전송)
- **생성 → 자동 편집** — 텍스트 블록을 만들면 빈 카드가 생기고 편집 모달이 곧바로 열린다
- **카드 미리보기** — 편집 화면과 같은 렌더러(TipTap 읽기 전용)를 써서 서식이 어긋나지 않는다. `max-h-40` 로 잘리고 하단에 `{n}자` · `편집` 이 붙는다

### 트러블슈팅

- **문제**: `editor.storage.markdown` 이 타입 에러 (`Property 'markdown' does not exist on type 'Storage'`)
- **원인**: `tiptap-markdown@0.9.0` 이 `editor.storage` 타입을 확장하지 않는다
- **해결**: `toMarkdown(editor)` 접근자 한 곳에서만 좁혀 쓰고 나머지 코드는 타입 안전하게 유지

- **문제**: 블록 생성 직후 어느 블록의 편집창을 열어야 할지 알 수 없다
- **원인**: 블록 생성 응답 `data` 스키마가 미확정이라 새 `blockId` 를 받지 못한다
- **해결**: 생성 직전 `blockId` 목록을 ref 에 담아두고, 재조회 결과와 비교해 새로 생긴 `TEXT` 블록을 찾아 편집창을 연다. 응답에 ID 가 포함되면 이 비교는 제거한다

- **문제**: 저장 후에도 카드 미리보기가 이전 내용을 보여준다
- **원인**: TipTap 인스턴스는 초기 `content` 만 읽고, 이후 prop 변경을 반영하지 않는다
- **해결**: `MarkdownView` 에 `key={content}` 를 줘서 저장 직후에만 다시 마운트한다. effect 로 `setContent` 를 부르는 방식은 `react-hooks/set-state-in-effect` 에 걸린다

### 부수 결정

- **에디터는 TipTap 채택** — `@uiw/react-md-editor` 는 분할 미리보기라 "원문 비노출" 요구를 못 맞추고, Lexical 은 툴바 상태 동기화를 직접 짜야 한다. 직접 구현은 선택 복원 · 붙여넣기 정제 · 목록 중첩 · IME 조합 때문에 버그 리스크가 크다
- **`@tailwindcss/typography` 미도입** — 시안 폰트 크기가 기본값과 많이 달라 덮어쓰기가 오히려 늘어난다. `MARKDOWN_CLASS` 로 필요한 요소만 지정하고 편집 · 미리보기가 공유한다
- **카드 미리보기도 TipTap 읽기 전용 인스턴스** — 별도 렌더러를 쓰면 편집 화면과 모습이 어긋난다. 텍스트 블록마다 인스턴스가 하나 늘어나는 비용을 감수한다
- **`txtId` 는 `blockId` 로 폴백하지 않는다** — 값이 달라서 폴백하면 **다른 블록의 본문이 수정된다.** `detail.txtId` 가 없으면 편집 버튼 대신 `편집 불가` 를 노출한다
- **`immediatelyRender: false`** — SSR 에서 즉시 렌더하면 하이드레이션이 어긋난다

### 검증

| 명령               | 결과               |
| ------------------ | ------------------ |
| `npm run build`    | ✅ 성공            |
| `npx tsc --noEmit` | ✅ 에러 0          |
| `npx eslint .`     | ✅ 에러 0 · 경고 0 |
| `prettier --check` | ✅ 통과            |

> ⚠️ 실제 백엔드 대상 동작 확인은 **확인 필요** (`detail.txtId` · `detail.content` 가 내려와야 편집 가능)

### 남은 일 / 확인 필요

- ❗ **`detail.txtId` · `detail.content` 키 이름 확인 필요** — 없으면 카드가 빈 상태로만 보인다
- ❗ **블록 생성 응답 `data` 스키마** — `blockId` 가 오면 자동 편집 로직이 단순해진다
- 이미지 · 표 미지원 — StarterKit 범위 밖. 필요해지면 TipTap 확장 추가
- 마크다운 붙여넣기 · 드래그 앤 드롭 동작 미검증

---

## [2026-08-05] 스텝 블록 보드 · 체크리스트 블록 구현 🚧

브랜치: `user/project` · 이슈: #31

### 변경 파일

| 파일                                            | 변경                                                |
| ----------------------------------------------- | --------------------------------------------------- |
| `src/features/block/types.ts`                   | 생성 — 블록 유형 9종 · 조회/생성/체크리스트 타입    |
| `src/features/block/api.ts`                     | 생성 — 블록 조회·생성, 체크리스트 항목 CRUD         |
| `src/features/block/BlockTypeIcon.tsx`          | 생성 — 유형별 인라인 SVG 아이콘                     |
| `src/features/block/StepBlocks.tsx`             | 생성 — 목록 조회 · 재조회 · 헤더 컨테이너           |
| `src/features/block/BlockBoard.tsx`             | 생성 — 행 단위 3칸 그리드 배치                      |
| `src/features/block/BlockCard.tsx`              | 생성 — 블록 공통 껍데기 (헤더 · 본문 · 담당자 푸터) |
| `src/features/block/ChecklistBlock.tsx`         | 생성 — 체크리스트 본문 · 항목 CRUD                  |
| `src/features/block/AddBlockButton.tsx`         | 생성 — `Block 추가` 버튼                            |
| `src/features/block/AddBlockModal.tsx`          | 생성 — 유형 선택 · 이름 입력 모달                   |
| `src/app/projects/[id]/steps/[stepId]/page.tsx` | `StepBlocks` 연결                                   |
| `src/components/Modal.tsx`                      | `header` · `className` 옵션 추가 (하위 호환)        |
| `src/constants/endpoints.ts`                    | `steps.blocks` · `blocks.checklistItems/Item` 등록  |
| `src/lib/api.ts`                                | `api.delete` 추가                                   |
| `.ai/API.md`                                    | 9 · 9-1 · 10 · 11 · 12번 명세 추가                  |

### 주요 작업 내용

- **블록 보드 레이아웃** — 가로 3칸 고정 · 세로 무제한. `rowIndex` 로 행을 묶고 행마다 별도 grid 를 만들어 **같은 행이 높이를 공유**하게 함 (`items-stretch` + 카드 `h-full`)
- **블록 생성 모달** — ERD `block.type` enum 9값을 카드로 노출. `PAYMENT_CONFIRM` 은 이름 라벨이 `회차명` 으로 바뀐다
- **스텝 블록 일괄 조회 연동** — 블록 추가 성공 시 목록을 재조회해 보드에 즉시 반영
- **체크리스트 블록** — 완료 토글 · 내용 인라인 수정 · 항목 추가 · 항목 삭제를 각각 API 로 즉시 반영

### 트러블슈팅

- **문제**: `<Link>` 안에 `⋯` 버튼을 넣을 수 없고, 스테이지 토글 `<button>` 안에도 버튼을 못 넣는다
- **원인**: 앵커·버튼 중첩은 유효하지 않은 HTML 이다
- **해결**: 카드 전체를 덮는 `absolute inset-0` 링크를 깔고 내용은 `pointer-events-none`, 메뉴만 `pointer-events-auto` 로 되살림

- **문제**: Tailwind 가 `col-span-${n}` · `group-hover/step:opacity-100` 을 생성하지 않음
- **원인**: Tailwind 는 조합된 클래스명을 읽지 못한다. 소스에 **완성된 문자열**이 있어야 한다
- **해결**: `COL_SPAN_CLASS` 매핑 객체 · `revealClass` prop 으로 완성 문자열을 넘김

- **문제**: 스텝을 옮기면 이전 스텝의 블록이 새 경로에 남는다
- **원인**: effect 가 새 요청만 시작하고 이전 상태를 비우지 않았다
- **해결**: 응답을 `{ stepId, blocks }` 로 묶어 보관하고 경로와 일치할 때만 사용 (사이드바와 같은 패턴)

### 부수 결정

- **`Modal` 을 새로 만들지 않고 확장** — `header` · `className` 옵션 2개를 **선택**으로 추가. `<dialog>` 포커스 트랩 · ESC · 백드롭 · 스크롤 락을 재사용하고 `ChangePasswordModal` 은 무수정
- **행마다 grid 를 따로 만든다** — 하나의 grid 에 자동 배치하면 `1,1,2` 에서 구멍이 생기고 행 경계가 백엔드 `rowIndex` 와 어긋난다
- **`colSpan` 은 1~3 을 모두 그린다** — 기획은 1·2칸이지만 명세가 1~3 이라 `Math.min/max` 로 잘라 레이아웃 붕괴를 막는다
- **`detail` 은 `unknown` + 런타임 검증** — 타입마다 구조가 달라 `readChecklistItems()` 로 형태를 확인하고, 다르면 빈 목록으로 떨어뜨린다
- **진척률은 화면 목록에서 계산** — 세 API 가 `completedCount`/`totalCount` 를 주지만, 서버 숫자와 목록이 어긋나면 사용자에게 버그로 보인다
- **항목 삭제 버튼은 행 호버 `✕`** — `DELETE` 가 항목 단위인데 시안에 삭제 UI 가 없었다. 헤더 `⋯` 는 블록 단위다
- **아바타 색은 사번 문자코드 합으로 배정** — 새로고침해도 같은 사람이 같은 색으로 보인다
- **`title` 은 선택 필드로 처리** — 명세가 `필수 N` 이라 유형만 골라도 생성된다. 비면 `undefined` 로 아예 보내지 않는다

### 검증

| 명령               | 결과               |
| ------------------ | ------------------ |
| `npm run build`    | ✅ 성공            |
| `npx tsc --noEmit` | ✅ 에러 0          |
| `npx eslint .`     | ✅ 에러 0 · 경고 0 |
| `prettier --check` | ✅ 통과            |

> ⚠️ 실제 백엔드 대상 동작 확인은 **확인 필요** (스텝·블록 시드 데이터 필요)

### 남은 일 / 확인 필요

- ❗ **`detail` 스키마** — `FILE` 의 `{ fileCount }` 만 확인됨. `CHECKLIST` 항목 배열 키가 `items` 인지 확인 필요
- 블록 수정 · 삭제 · 순서 변경 API 미확정 → `⋯` 메뉴 · 드래그 핸들은 UI 만 존재
- `CHECKLIST` 외 8종 블록 본문 미구현 (`준비 중인 블록입니다.` 껍데기)
- 스텝 이름 하드코딩 — 스텝 상세 조회 연동 후 교체
- 스텝 `EDITOR` 권한 가드 없음 → `VIEWER` 도 `Block 추가` 버튼이 보이고 403 을 맞는다

---

## [2026-08-05] 최초 로그인 게이트 분기 수정 ✅

브랜치: `fix/auth-gate` · 이슈: 확인 필요 (생성 후 번호 기입)

### 변경 파일

| 파일                                          | 변경                                                  |
| --------------------------------------------- | ----------------------------------------------------- |
| `src/features/auth/AuthGates.tsx`             | 생성 — 남은 게이트를 단계로 노출 (이전/다음)          |
| `src/features/auth/TermsGate.tsx`             | 생성 — 약관 단계 (`FirstLoginFlow` 대체)              |
| `src/features/auth/errorCodes.ts`             | 생성 — 게이트 · 권한 · 로그인 실패 코드 단일 소스     |
| `src/features/auth/FirstLoginFlow.tsx`        | 삭제 — 약관+비밀번호를 세트로 묶고 있었음             |
| `src/features/auth/CurrentUserProvider.tsx`   | 게이트 분리 · `/me` 403 대응 · 403 이벤트 구독        |
| `src/features/auth/ChangePasswordModal.tsx`   | `stepLabel` · `onBack` · 눈 아이콘 추가               |
| `src/features/auth/types.ts`                  | `TermsStatus` · `termsStatus` 추가                    |
| `src/components/PasswordVisibilityToggle.tsx` | 생성 — 로그인 화면의 눈 아이콘을 공용화               |
| `src/components/Modal.tsx`                    | `stepLabel` (제목 위 진행 표시)                       |
| `src/lib/api.ts`                              | 403 을 `FORBIDDEN_EVENT` 로 방송                      |
| `src/app/login/page.tsx`                      | status → `code` 분기 · 게이트 코드면 게이트로 이동    |
| `src/app/globals.css`                         | `word-break: keep-all` (한글 어절 단위 줄바꿈)        |
| `.ai/API.md`                                  | `/me` 의 `termsStatus` · 공통 403 표 · 세션 정책 추가 |

### 주요 작업 내용

- `termsStatus` · `passwordStatus` 를 **독립 게이트**로 분리 — 약관만 남은 계정이 모든 API 403 으로 막히던 문제 해결
- 두 게이트가 모두 남으면 `1 / 2` → `2 / 2` 단계로 보여주고 이전/다음으로 오갈 수 있게 함
- 403 을 화면마다 처리하지 않고 `lib/api` → `CurrentUserProvider` 한 곳에서 받도록 통일
- 에러 분기를 `status` 에서 **`code`** 로 전환 (403 하나에 비활성 · 게이트 · 권한 세 의미가 실림)

### 트러블슈팅

- **문제**: 약관 동의 후 뒤로가기 → 재로그인하면 비밀번호 변경 모달이 안 뜨고 "내 정보를 불러오지 못했습니다"
- **원인**: 게이트 상태를 `/me` **응답에서만** 읽었는데, 게이트 미통과 시 `/me` 자체가 403 으로 막힌다
- **해결**: 403 의 `code` 로 어느 게이트인지 판단(`blockedBy`) — 사용자 정보 없이도 게이트 화면을 띄운다

- **문제**: 재로그인 시 "초기 비밀번호를 먼저 변경해 주세요." 만 뜨고 변경할 방법이 없음
- **원인**: 백엔드가 `RESET_REQUIRED` 계정의 로그인을 게이트 코드로 거부하는데, 프론트가 이를 일반 에러로 표시
- **해결**: 로그인 실패 코드가 게이트 코드면 에러 대신 `/` 로 보내 기존 세션으로 게이트를 통과시킨다

- **문제**: 모달 안내 문구가 단어 중간에서 잘림 (`변|경해주세요`)
- **원인**: 한글은 `word-break` 기본값에서 어느 글자에서나 줄바꿈된다
- **해결**: `body` 에 `word-break: keep-all` + `overflow-wrap: break-word`

### 부수 결정

- 게이트 차단은 라우팅이 아니라 `CurrentUserProvider` 에서 한다 — 어느 경로로 들어와도 막아야 한다
- **비밀번호 단계가 남아 있으면 약관은 이미 동의했어도 1단계로 남긴다** — 새로고침해도 `2 / 2` 가 유지되고 약관을 다시 읽을 수 있다
- 두 게이트가 모두 남을 때 중간 `/me` 재조회를 하지 않는다(로컬 단계 전환) — 로딩 화면이 끼어들지 않는다
- 게이트 403 은 같은 코드에 **한 번만** 반응한다(`handledGates`) — `/me` 와 백엔드 판단이 어긋나면 무한 재요청이 된다
- 뒤로가기로 `/login` 이탈은 막지 않는다 — 재로그인하면 게이트로 돌아오므로 굳이 히스토리를 가둘 필요가 없다
- 눈 아이콘은 `components/PasswordVisibilityToggle` 로 공용화 — 로그인 화면과 모달이 같은 것을 쓴다

### 검증

| 명령                       | 결과                                           |
| -------------------------- | ---------------------------------------------- |
| `npx tsc --noEmit`         | ✅ 이번 변경분 에러 0                          |
| `npx eslint src`           | ✅ 에러 0 · 경고 0                             |
| `npx prettier --check src` | ✅ 통과                                        |
| 브라우저 동작 확인         | ✅ 사용자 확인 (게이트 · 단계 이동 · 재로그인) |

### 남은 일

- ⚠️ 약관 실제 문구 교체 (배포 전 필수 — 현재 placeholder)
- 백엔드 확인: `RESET_REQUIRED` 계정 재로그인 거부가 의도인지 (브라우저를 닫아 세션이 사라지면 관리자 재설정 외 방법이 없음)
- `src/app/mypage/page.tsx` 타입 에러 4건 (`string | null` vs `string | undefined`) — 별도 처리

---

## [2026-08-05] #27 프로젝트 상세 사이드바 구현 ✅

브랜치: `user/project`

### 변경 파일

| 파일                                | 변경                                                          |
| ----------------------------------- | ------------------------------------------------------------- |
| `src/components/ProjectSidebar.tsx` | 생성 — 개요 · 진행률 · 진행 단계 · 참여자 · 설정              |
| `src/features/project/types.ts`     | 생성 — `ProjectDetail` · `ProjectStage` · `ProjectStep`       |
| `src/features/project/api.ts`       | 생성 — `getProject` · `getProjectStages` · `getProjectSteps`  |
| `src/app/projects/[id]/layout.tsx`  | `ProjectSidebar` 연결 (하위 화면 공통 노출)                   |
| `src/components/AppShell.tsx`       | 프로젝트 상세는 공통 사이드바 제거, 헤더만 유지               |
| `src/constants/menu.ts`             | `isProjectScope()` 경로 판별 추가                             |
| `src/constants/endpoints.ts`        | `projects.detail` · `stages` · `steps` 등록                   |
| `src/lib/format.ts`                 | `formatDateRange` 추가                                        |
| `src/app/mypage/page.tsx`           | `Field` 의 `value` 타입 `string \| null` 허용 (타입체크 복구) |
| `.ai/API.md`                        | 6 · 7 · 8번 명세 추가                                         |

### 주요 작업 내용

- 프로젝트 상세 조회 · 스테이지 목록 · 스텝 목록 **3종 API 를 `Promise.all` 로 병렬 조회**해 사이드바를 채움
- `/projects/{id}/**` 에서는 공통(전역) 사이드바를 빼고 `ProjectSidebar` + 헤더만 쓰도록 `AppShell` 분기
- `/projects/{id}/steps/{stepId}` 진입 시 해당 스텝을 선택 상태로 표시하고 소속 스테이지를 자동으로 펼침
- 스테이지 · 스텝 행 호버 시 스텝 추가 버튼과 `⋯` 메뉴(이름 수정 · 삭제) 노출 — 동작은 API 대기

### 트러블슈팅

- **문제**: `develop` 을 merge 한 뒤 `src/app/mypage/page.tsx` 에서 타입체크 4건 실패
- **원인**: `develop`(`fc1e155`) 에서 `CurrentUser` 필드가 `string | null` 로 바뀌었는데 `Field` 의 `value` 는 `string | undefined` 로 남아 있었다. 이 브랜치 변경과 무관한 **develop 자체 문제**
- **해결**: `Field` 의 `value` 타입을 `string | null` 까지 허용하도록 넓힘 (표시 로직은 `value || '-'` 라 그대로 동작)

- **문제**: `git stash pop` 시 `src/lib/format.ts` 충돌
- **원인**: 같은 시점에 develop 이 `formatDate` 를 정규식 검증 방식으로 재작성하고 `formatDateTime` 을 추가했다
- **해결**: develop 구현을 채택하고 이 브랜치가 추가한 `formatDateRange` 만 얹음. `formatDateRange` 내부도 develop 의 `formatDate` 를 호출하게 해 검증 로직을 공유

- **문제**: 스테이지 행을 클릭하면 `+` 버튼이 마우스를 벗어난 뒤에도 계속 보임
- **원인**: `group-focus-within:opacity-100` — 클릭으로 토글 버튼에 포커스가 남아 조건이 계속 참
- **해결**: `group-focus-within` 을 제거하고 버튼 자신의 `focus-visible` 만 사용

- **문제**: 프로젝트 A → B 로 이동하면 B 경로에서 A 의 이름 · 발주처 · 진행률 · 스테이지 목록이 그대로 보임. B 요청이 실패하면 실패 문구 대신 A 의 스테이지 목록이 계속 그려짐
- **원인**: effect 가 새 요청만 시작하고 이전 상태를 비우지 않았다. `hasFailed` 도 프로젝트 구분 없는 단일 boolean 이었다
- **해결**: 응답을 `{ projectId, project, stages, steps }` 로 묶어 보관하고, `loaded.projectId === projectId` 일 때만 화면에 쓴다. 실패도 `failedProjectId` 로 프로젝트별로 기록한다

- **문제**: 스텝이 0개인 스테이지를 펼치면 화면에 아무 변화가 없어 동작 실패로 보임
- **원인**: `isOpen && stageSteps.length > 0` 조건이라 빈 스테이지는 펼침 UI 자체가 없었다. `aria-expanded` 만 `true` 로 바뀐다
- **해결**: `등록된 스텝이 없습니다.` 빈 상태 문구 추가

### 부수 결정

- **경로 판별은 상수 배열이 아니라 함수로** — `/projects/new` 는 공통 사이드바를 써야 해서 prefix 매칭으로 구분 불가
- **스테이지 · 스텝은 별도 API 2개**를 받아 프론트에서 `stageId` 로 묶는다. 백엔드가 중첩 구조로 주지 않음
- **`stageId: null` 스텝은 `미분류` 가상 스테이지**로 묶어 노출. 응답에 실제로 존재하는 값이라 누락시킬 수 없음
- **스텝 진척률 바는 이슈 개수 비율**(`inProgressIssueCount` · `doneIssueCount` · 나머지)로 그린다. 응답이 상태 배열이 아님
- **선택 스텝은 URL 우선**, 없으면 `status === 'IN_PROGRESS'` 인 첫 스텝
- **편집 버튼이 없어도 자리를 비워둔다** — `미분류` 행과 `VIEWER` 스텝에서 숫자 · `%` 위치가 밀리지 않게 `size-5` 스페이서 삽입
- **참여자 영역은 `MOCK_MEMBERS` 유지** — 조회 API 미확정
- **`lib/api.ts` 에 `AbortSignal` 을 선택 인자로 추가** — 취소는 `ApiError` 로 감싸지 않고 그대로 던진다(`isAbortError`). 기존 호출부는 인자를 안 넘기면 동작이 그대로다
- **응답에 `projectId` 를 함께 담아 보관** — effect 진입 시 `setState` 로 초기화하는 방식은 `react-hooks/set-state-in-effect` 에 걸린다. 경로와 `projectId` 가 다르면 데이터를 아예 쓰지 않는 쪽이 렌더 한 번을 덜 돌고 잔류 데이터도 원천 차단된다
- **실패도 `failedProjectId` 로 프로젝트별 기록** — 전역 `hasFailed` 면 A 성공 후 B 실패 시 A 데이터가 실패 문구를 덮는다

### 검증

| 명령               | 결과               |
| ------------------ | ------------------ |
| `npm run build`    | ✅ 성공            |
| `npx tsc --noEmit` | ✅ 에러 0          |
| `npx eslint .`     | ✅ 에러 0 · 경고 0 |
| `prettier --check` | ✅ 통과            |

### 남은 일

- 참여자 목록 조회 API 연동 → `MOCK_MEMBERS` 제거
- 스테이지 · 스텝 이름 수정 / 삭제 / 추가 API 연동 → `RowMenu` · `+` 버튼 동작
- 사이드바 접기 버튼 동작 정의 (폭 축소 vs 완전 숨김)
- `stageId: null` (`미분류`) 노출 정책 기획 확인

---

## [2026-08-05] #28 마이페이지 구현 ✅

브랜치: `feat/mypage`

### 변경 파일

| 파일                           | 변경                            |
| ------------------------------ | ------------------------------- |
| `src/app/mypage/page.tsx`      | 인사 정보 · 계정 정보 화면 구현 |
| `src/constants/status.ts`      | `ROLE_LABELS` 권한 라벨 매핑    |
| `src/lib/format.ts`            | `formatDate` · `formatDateTime` |
| `.gitignore` · `.ai/README.md` | `STATE.md` 개인 노트 처리       |
| `.env.example`                 | 생성 — 로컬 환경변수 예시       |

### 주요 작업 내용

- 인사 정보(사번 · 이름 · 이메일 · 연락처 · 부서 · 직급 · 입사일)와 계정 정보(권한 · 마지막 로그인)를 카드 두 개로 구성
- `ChangePasswordButton` 을 `PageTitle` 이 아닌 **계정 정보 카드 액션 영역**에 연결 (디자인 기준)
- 권한 라벨 · 날짜 표기를 `constants` · `lib` 으로 분리해 다른 화면과 표기가 갈리지 않게 함

### 트러블슈팅

- **문제**: 팀원 PC 에서 로그인 시 `POST /api/v1/auth/login` 404
- **원인**: `.env.local` 이 gitignore 대상이라 클론 후 `NEXT_PUBLIC_API_BASE_URL` 이 빈 문자열 → 요청이 프론트 서버(`:3000`)로 감
- **해결**: `.env.example` 을 커밋 대상으로 추가(`.gitignore` 에 `!.env.example`), 복사 안내 주석 포함

- **문제**: '마지막 로그인' 라벨이 두 줄로 접힘
- **원인**: 라벨 폭 `w-20`(80px)이 6글자를 못 담음
- **해결**: `w-24` + `whitespace-nowrap`. 폭을 고정하는 이유는 값의 시작선을 세로로 맞추기 위함

### 부수 결정

- `/me` 를 화면에서 다시 부르지 않는다 — `CurrentUserProvider` 가 이미 불러둔 컨텍스트 값을 쓴다
- 날짜는 `Date` 로 파싱하지 않고 문자열을 자른다 — `YYYY-MM-DD` 를 `Date` 로 바꾸면 **타임존 때문에 하루 밀릴 수 있다**
- `ROLE_LABELS` 는 `Record<Role, string>` — 역할이 추가되면 컴파일 단계에서 누락이 잡힌다
- 이메일 · 연락처가 비어 오면 `-` 로 표시하고, 포맷터도 빈 값을 받으면 빈 문자열을 돌려준다
- `Card` · `Field` 는 이 화면 전용이라 `components/` 로 빼지 않는다
- **`.ai/STATE.md` 는 개인 작업 노트라 gitignore 처리한다** — 팀원마다 진행 상황이 달라 공유하면 충돌만 난다. 초기값은 `template/STATE.template.md`

### 검증

| 명령               | 결과               |
| ------------------ | ------------------ |
| `npm run build`    | ✅ 성공            |
| `npx tsc --noEmit` | ✅ 에러 0          |
| `npx eslint .`     | ✅ 에러 0 · 경고 0 |

### 남은 일

- 프로필 이미지 — `/me` 응답에 필드가 없어 제외
- 인사 정보 수정 — 관리자(사원 관리) 화면에서 처리

---

## [2026-08-05] #3 비밀번호 변경 모달 구현 ✅

브랜치: `feat/change-password-modal`

### 변경 파일

| 파일                                               | 변경                              |
| -------------------------------------------------- | --------------------------------- |
| `src/components/Modal.tsx`                         | 생성 — 공용 모달 껍데기           |
| `src/features/auth/ChangePasswordModal.tsx`        | 생성 — 강제 · 일반 두 모드        |
| `src/features/auth/ChangePasswordButton.tsx`       | 생성 — 마이페이지 진입점          |
| `src/features/auth/FirstLoginFlow.tsx`             | 생성 — 약관 동의 → 비밀번호 변경  |
| `src/features/auth/password.ts`                    | 생성 — 비밀번호 정책 3종          |
| `src/features/auth/api.ts`                         | `agreeToTerms` · `changePassword` |
| `src/constants/endpoints.ts`                       | `termsAgreements` 경로 추가       |
| `src/features/auth/CurrentUserProvider.tsx`        | 최초 로그인 차단 · `refetch` 추가 |
| `src/app/mypage/page.tsx`                          | 비밀번호 변경 버튼 연결           |
| `src/lib/api.ts`                                   | `messageOf` 추가                  |
| `src/features/auth/types.ts` · `constants/menu.ts` | `Role` 타입 위치 이동             |
| `.ai/API.md`                                       | 약관 동의 API 추가                |

### 주요 작업 내용

- `ChangePasswordModal` — 강제 · 일반 모드를 한 컴포넌트로. 강제면 현재 비밀번호를 묻지 않고 닫을 수도 없다
- `Modal` — 네이티브 `<dialog>` 기반 공용 껍데기. `onClose` 유무로 닫기 버튼 · 백드롭 클릭 · ESC 동작이 갈린다
- `FirstLoginFlow` — 최초 로그인 시 약관 동의(`POST /auth/terms-agreements`) 후 비밀번호 변경으로 넘어간다
- `password.ts` — 정책 3종(8자 이상 · 영문+숫자 · 특수문자)을 배열 한 곳에 두고 **화면 체크리스트와 제출 검증에 함께** 사용
- 마이페이지 `PageTitle` 액션 슬롯에 일반 모드 진입점 연결

### 부수 결정

- 강제 · 일반을 **한 컴포넌트로** 둔다 — 폼 본체가 같아 분리하면 규칙 체크리스트가 두 벌이 된다
- 강제 상태 차단은 라우팅이 아니라 `CurrentUserProvider` 에서 한다 — 어느 경로로 들어와도 막아야 하고, 라우팅이면 우회 경로가 생긴다
- 변경 성공 후 `refetch()` 로 `/me` 를 다시 부른다 — `passwordStatus` 가 갱신돼야 모달이 닫힌다
- 모달은 **네이티브 `<dialog>` + `showModal()`** 로 만든다 — 포커스 트랩 · 초기 포커스 · 닫힐 때 트리거 복귀 · 배경 비활성화를 브라우저가 처리한다. 직접 구현하면 강제 모드에서 Tab 으로 배경에 접근할 수 있다
- 강제 모드는 `onCancel` 에서 `preventDefault()` 로 ESC 를 막는다
- 백드롭 클릭은 `event.target === dialogRef.current` 일 때만 닫는다 — 내용 영역 클릭으로 닫히면 안 된다
- 변경 성공 시 **`onDone()` 을 즉시** 부른다 — 완료 화면을 X · ESC · 백드롭으로 닫아도 상위 재조회가 유실되지 않아야 한다
- 새 비밀번호 확인 불일치는 **입력 중에** 알린다 (`aria-invalid` · `aria-describedby`). 제출해야 알 수 있으면 늦다
- 현재 비밀번호 불일치 · 정책 위반 문구는 백엔드 `message` 를 그대로 쓴다. 어떤 정책에 걸렸는지 프론트가 판단하지 않는다
- 에러 문구 추출은 `lib/api.ts` 의 `messageOf(error, fallback)` 하나로 모았다
- `Role` 타입은 백엔드 응답에서 오는 값이라 `features/auth/types.ts` 가 자리다. `constants/menu.ts` 가 가져다 쓴다
- **토스트는 범위에서 제외** — 토스트 시스템이 없어 성공 안내는 모달 내 문구로 처리했다

### 검증

| 명령               | 결과               |
| ------------------ | ------------------ |
| `npx tsc --noEmit` | ✅ 에러 0          |
| `npx eslint .`     | ✅ 에러 0 · 경고 0 |
| `npx prettier`     | ✅ 포맷 일치       |

### 남은 일

- ⚠️ **약관 실제 문구 — 배포 전 필수.** 현재 자리표시(`약관 내용 추가 예정입니다.`) 상태로는 유효한 동의 기록이 아니다
- 변경 성공 토스트 — UI 라이브러리 도입 후

---

## [2026-08-04] #2 로그인 화면 구현 ✅

브랜치: `feat/login`

### 변경 파일

| 파일                                        | 변경                             |
| ------------------------------------------- | -------------------------------- |
| `src/lib/api.ts`                            | fetch 래퍼 구현                  |
| `src/constants/endpoints.ts`                | `auth` 경로 4종 등록             |
| `src/features/auth/types.ts`                | 생성                             |
| `src/features/auth/api.ts`                  | 생성                             |
| `src/features/auth/CurrentUserProvider.tsx` | 생성 — `/me` 조회 컨텍스트       |
| `src/features/auth/useCurrentUser.ts`       | 임시 값 → 컨텍스트 기반 교체     |
| `src/app/login/page.tsx`                    | 로그인 폼 구현                   |
| `src/proxy.ts`                              | 생성 — 인증 가드                 |
| `src/components/Header.tsx`                 | 로그아웃 버튼 · `/me` 연동       |
| `src/components/Sidebar.tsx`                | 프로필 · 메뉴를 실제 응답으로    |
| `src/components/AppShell.tsx`               | Provider 연결                    |
| `src/app/page.tsx`                          | 주석 수정                        |
| `src/features/auth/FirstLoginFlow.tsx`      | 생성 — 약관 동의 · 비밀번호 변경 |
| `src/features/auth/password.ts`             | 생성 — 비밀번호 정책             |
| `src/features/auth/.gitkeep`                | 삭제 (실제 파일 생겨 역할 종료)  |
| `.ai/API.md`                                | 인증 API 5종 명세 작성           |

### 주요 작업 내용

- `src/lib/api.ts` — `get` · `post` · `patch` 래퍼. 공통 응답 봉투에서 `data` 만 꺼내 반환하고, 실패는 `ApiError(status, message)` 로 통일
- `src/features/auth` — `login()` · `logout()` · `getMe()` 와 타입 정의. `CurrentUser extends LoginResponse` 로 `/me` 추가 필드(`email` · `phone` · `hiredAt` · `lastLoginAt`) 표현
- 로그인 화면 — 아이디(사번) · 비밀번호 폼, 비밀번호 보기 토글 아이콘, 상태코드별 안내 문구, 로딩 중 버튼 비활성
- `passwordStatus === 'RESET_REQUIRED'` 면 대시보드 대신 비밀번호 변경 경로로 분기 (현재 `/mypage` 임시)
- `src/proxy.ts` 인증 가드 — 세션 쿠키 없으면 `/login`, 있는 채로 `/login` 진입 시 대시보드로
- `CurrentUserProvider` 로 `/me` 를 한 번만 불러 사이드바 프로필 · 역할별 메뉴 · 헤더 제목에 공급

### 부수 결정

- **인증은 HttpOnly 세션 쿠키.** 응답 본문에 토큰이 없어 프론트가 저장·갱신할 것이 없다 → 모든 요청에 `credentials: 'include'` 만 붙인다
- 401 문구는 "아이디 또는 비밀번호가 올바르지 않습니다." 한 문장으로 고정 — **사번 존재 여부를 노출하지 않기 위해**
- 423(계정 잠금)은 해제 시각이 담긴 백엔드 `message` 를 그대로 노출 — 프론트 상수로 덮지 않는다
- 에러 문구 자리를 `min-h-10` 으로 미리 잡아 에러 발생 시 버튼이 밀리지 않게 함
- 응답이 오지 않은 경우(네트워크 단절 · CORS 차단)는 `status: 0` 의 `ApiError` 로 감싼다
- **실패 봉투는 `data` 가 아니라 `code` 를 준다** — `ApiError(status, message, code)` 로 함께 담는다
- 백엔드 `message` 가 사용자에게 보여줄 한국어 문구라 그대로 노출한다. 상수로 덮는 것은 401 처럼 정보 노출을 막을 때만
- 초기 비밀번호와 같은 값으로 변경하는 것은 **백엔드가 막는다**(`AUTH_PASSWORD_UNCHANGED`). 막자고 평문 비밀번호를 메모리에 들고 있지 않는다
- **인증 가드는 서버(`src/proxy.ts`)에서 한다.** HttpOnly 쿠키는 JS 로 못 읽어 클라이언트 분기가 불가능하다
- **Next 16 부터 `middleware.ts` 규약이 deprecated** — `proxy.ts` + `export default function proxy` 로 작성한다
- 가드는 쿠키 **존재 여부만** 본다 — 유효성은 백엔드 몫, 만료 쿠키는 API 401 로 걸러진다
- `/` 를 `/login` 으로 무조건 리다이렉트하지 않는다 — 로그인 성공 후 `/` 로 돌아와 **무한루프**가 된다
- 로그아웃은 **성공 · 401 일 때만** 로그인 화면으로 보낸다. 그 외 실패는 쿠키가 살아 있어 이동해도 되돌아온다
- 로그아웃 후 `router.refresh()` 를 함께 호출한다 — 라우터 캐시를 비워야 프록시가 쿠키를 다시 판단한다
- **프록시는 쿠키가 있어도 `/login` 진입을 막지 않는다.** 만료 여부를 알 수 없어 막으면 `/login` ↔ `/` 루프가 된다
  → 로그인 상태로 `/login` 에 직접 들어가면 로그인 폼이 그대로 보인다. **의도된 동작이니 프록시에 분기를 되살리지 말 것.**
  막으려면 쿠키 존재가 아니라 `getMe()` 로 **세션 유효성**을 확인해야 한다
- `CurrentUserProvider` 는 `/me` **401 일 때만** `/login` 으로 보낸다. 네트워크 오류는 재시도 화면을 띄운다
- 프로바이더가 확인을 마치기 전에는 `children` 을 그리지 않는다 — 만료 쿠키는 프록시를 통과해 보호 화면이 잠깐 노출된다
- 로그인 사용자는 **컨텍스트로 한 번만** 불러온다 — 서버 상태 라이브러리 도입 전 임시 방식. Sidebar · Header 가 각자 부르면 요청이 2번이다
- `CurrentUserProvider` 는 사이드바 있는 레이아웃에만 붙인다 — 로그인 화면에서 `/me` 를 부르지 않게
- `/me` 가 401 이면 프로바이더가 `/login` 으로 보낸다 — **쿠키는 남았는데 세션만 만료된 구간**은 미들웨어가 못 잡는다

### 검증

| 명령               | 결과                    |
| ------------------ | ----------------------- |
| `npm run build`    | ✅ 성공 · 미들웨어 등록 |
| `npx tsc --noEmit` | ✅ 에러 0               |
| `npx eslint src`   | ✅ 에러 0 · 경고 0      |
| `npx prettier`     | ✅ 포맷 일치            |

### 남은 일

- 비밀번호 변경 모달 · 최초 로그인 흐름 → #3
- 403 응답 시 `/forbidden` 이동 처리

---

## [2026-08-04] #1 공통 레이아웃 구성 ✅

브랜치: `feat/login-page`

### 변경 파일

| 파일                                              | 변경             |
| ------------------------------------------------- | ---------------- |
| `src/components/AppShell.tsx`                     | 생성             |
| `src/components/MenuIcon.tsx`                     | 생성             |
| `src/components/Sidebar.tsx`                      | 구현             |
| `src/components/Header.tsx`                       | 구현             |
| `src/components/PageTitle.tsx`                    | 구현             |
| `src/features/auth/useCurrentUser.ts`             | 생성             |
| `src/constants/menu.ts`                           | 역할별 메뉴 정의 |
| `src/app/approvals/page.tsx` · `mypage/page.tsx`  | 생성             |
| `src/app/layout.tsx` · `page.tsx` · `globals.css` | 수정             |

### 주요 작업 내용

- `AppShell` 로 공통 레이아웃 분기 — 사이드바 280px · 헤더 72px, `/login` `/forbidden` 은 레이아웃 제외
- 사이드바에 프로필 영역(이미지 자리 · 이름 · 직급 · 부서)과 역할별 메뉴, 현재 화면 활성 표시 구현
- 헤더가 경로로 현재 화면 제목을 판단하도록 구성, 알림 · 내 정보 진입점 배치
- `MENU_BY_ROLE` 로 ADMIN / MASTER · MEMBER 메뉴 분기, `/approvals` `/mypage` 라우트 추가

### 트러블슈팅

- **문제**: 루트 `layout.tsx` 에 사이드바를 넣으면 로그인 화면에도 사이드바가 표시됨
- **원인**: App Router 의 `layout.tsx` 는 하위 전체에 적용된다
- **해결**: 라우트 그룹 분리 대신 `AppShell` 에서 `usePathname` 으로 분기 — 기존 폴더를 옮기지 않아 diff 를 줄였다

- **문제**: 본문 폰트가 Geist 로 적용되지 않음
- **원인**: `globals.css` 의 `body { font-family: Arial, ... }` (Next 기본 템플릿 잔재)가 덮어씀
- **해결**: `var(--font-sans)` 로 교체. 함께 남아 있던 다크모드 블록도 제거 (현재 디자인이 라이트 기준)

- **문제**: 헤더 경계선이 진한 색으로 보임
- **원인**: Tailwind v4 는 `border` 기본색이 `currentColor` 다 (v3 의 gray-200 아님)
- **해결**: `border-slate-200` 명시

### 부수 결정

- 메뉴 노출은 화면 편의일 뿐 **권한 통제가 아니다.** 실제 차단은 백엔드 403 → `/forbidden`
- MASTER · MEMBER 는 메뉴가 동일해 `STAFF_MENU` 하나로 공유
- 로그인 사용자는 `useCurrentUser` 임시 값 — `GET /api/v1/auth/me` 연동 시 이 파일만 교체
- 내 정보는 `/settings`(조직 설정)와 분리해 `/mypage` 신설
- `/` 는 `/login` 리다이렉트를 걷어내고 대시보드로 전환 (인증 가드는 인증 방식 확정 후)
- CSS 는 크기·구분에 필요한 최소만 작성 — 디자인 확정 후 다시 입힌다

---

## [2026-08-04] #21 프로젝트 폴더 구조 · 라우트 골격 구성 ✅

브랜치: `feat/project-structure`

### 변경 파일

| 파일                                                                       | 변경 |
| -------------------------------------------------------------------------- | ---- |
| `src/app/**/page.tsx` (라우트 25개)                                        | 생성 |
| `src/app/error.tsx` · `not-found.tsx`                                      | 생성 |
| `src/app/projects/[id]/layout.tsx`                                         | 생성 |
| `src/app/layout.tsx` · `page.tsx` · `globals.css`                          | 수정 |
| `src/components/*.tsx` (Header·Sidebar·ProjectSidebar·PageTitle·DataTable) | 생성 |
| `src/features/*/.gitkeep` (도메인 9개)                                     | 생성 |
| `src/constants/{endpoints,menu,status}.ts`                                 | 생성 |
| `src/lib/{api,format}.ts`                                                  | 생성 |
| `src/app/favicon.ico` · `public/*.svg` (Next 샘플 5개)                     | 삭제 |
| `.prettierrc` · `.prettierignore` · `.gitattributes`                       | 생성 |
| `.ai/STRUCTURE.md`                                                         | 생성 |
| `.ai/README.md` · `LIBRARIES.md` · `STATE.md` · `.gitignore`               | 수정 |
| `package.json` (의존성 9종 제거)                                           | 수정 |

### 주요 작업 내용

- App Router 기준 라우트 25개 스캐폴딩 (공고 · 프로젝트 · 재무 · 알림 · 설정) + Next 예약 파일 배치
- `projects/[id]/layout.tsx` 로 프로젝트 상세 하위 화면의 사이드바 공유 구조 확보
- `components` · `features` · `constants` · `lib` 4개 레이어 신설 — 어디에 무엇을 둘지 경계 확정
- 포맷 규칙 확정 — `.prettierrc`(작은따옴표 · tailwind 클래스 자동 정렬), `.gitattributes`(줄바꿈 LF 고정)
- 폴더 구조 · 네이밍 규칙 문서 `.ai/STRUCTURE.md` 작성, 문서 인덱스 · 라이브러리 인벤토리 반영

### 트러블슈팅

- **문제**: `src/features/` 9개 폴더가 `git status` 에 잡히지 않음
- **원인**: git 은 폴더가 아니라 파일 경로를 추적한다. 빈 폴더는 추적 대상이 아님
- **해결**: 각 폴더에 `.gitkeep` 추가 — 실제 파일이 생기면 제거

- **문제**: `src/lib/format.ts` 타입 체크 실패 (`Cannot find name 'l'`)
- **원인**: 파일 첫 줄에 오타 `l;` 가 남아 있었음
- **해결**: 해당 문자 제거, `npx tsc --noEmit` 통과 확인

- **문제**: `git status` 마다 `LF will be replaced by CRLF` 경고가 대량 출력
- **원인**: Git for Windows 기본값 `core.autocrlf=true` 가 LF 파일을 CRLF 로 변환하려 함
- **해결**: `.gitattributes` 에 `* text=auto eol=lf` 지정 후 `git add --renormalize .` — 개인 설정과 무관하게 팀 전체 LF 고정

- **문제**: `npx prettier --write .` 이 이번 작업과 무관한 팀 공용 파일 15개(145줄)까지 재포맷
- **원인**: 경로를 `.` 으로 줘서 저장소 전체가 대상이 됨
- **해결**: 해당 변경 전부 되돌리고, 일괄 포맷은 별도 `[CHORE]` PR 로 분리 (백로그 등록)

### 부수 결정

- **폴더 구조 단계에서는 라이브러리를 미리 설치하지 않는다.** 실제로 쓰는 이슈에서 설치한다
  → `primereact` · `@primeuix/themes` · `primeicons` · `@tanstack/react-query` · `zustand` · `react-hook-form` · `@hookform/resolvers` · `zod` · `date-fns` 9종 제거
- 같은 이유로 `providers.tsx` · `Toaster` · 컴포넌트 미리보기 페이지(`/preview`)도 이번 범위에서 제외
- 공용 컴포넌트는 **확정된 5개만** 생성 — `FilterBar` · `SummaryCard` · `Loading` · `Empty` · `ErrorBox` 는 화면 요구사항 확정 후
- `features/` 는 라우팅이 아닌 도메인 로직 계층 — `page.tsx` 를 두지 않는다 (App Router 예약어와 혼동 방지)
- 공용/도메인 컴포넌트 판단 기준: "다른 도메인 화면에 그대로 옮겨도 말이 되나" → 예면 `components`
- HTTP 클라이언트는 axios 미도입, `fetch` + `src/lib/api.ts` 래퍼로 간다
- `.claude/` 는 전체 gitignore 처리 (로컬 전용)
- 파비콘은 추후 추가 예정 (현재 삭제 상태 유지)

### 검증

| 명령               | 결과                       |
| ------------------ | -------------------------- |
| `npm run build`    | ✅ 성공 · 라우트 25개 등록 |
| `npx tsc --noEmit` | ✅ 에러 0                  |
| `npx eslint .`     | ✅ 에러 0 · 경고 0         |

---

## [YYYY-MM-DD] #이슈번호 [작업 제목] ✅

### 변경 파일

| 파일                      | 변경 |
| ------------------------- | ---- |
| `src/pages/LoginPage.tsx` | 생성 |
| `src/api/auth.ts`         | 수정 |
| `src/hooks/useLogin.ts`   | 생성 |

### 주요 작업 내용

- [구현한 화면/기능 요약 1]
- [구현한 화면/기능 요약 2]

### 트러블슈팅

> 발생한 문제 + 원인 + 해결방법 (있을 때만)

- **문제**: [예: 토큰 갱신 후 화면이 안 바뀜]
- **원인**: [예: 쿼리 캐시 무효화 누락]
- **해결**: [예: `queryClient.invalidateQueries` 호출]

### 부수 결정

> 작업 중 내린 판단·컨벤션 (있을 때만)

- [예: 서버 상태는 react-query, 클라 상태는 zustand로 분리]

---

> ✏️ 위 양식을 복사해서 작업마다 새 블록을 **맨 위에** 추가하세요.
> 트러블슈팅·부수 결정은 없으면 생략해도 돼요.
