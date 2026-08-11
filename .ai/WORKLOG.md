# 개발 완료 기록

> 📌 이 파일은 **끝낸 작업의 일지**예요.
> 작업(이슈)을 하나 완료할 때마다 AI에게 "완료" 또는 "WORKLOG에 기록해줘" 라고 하면 아래 양식으로 정리해줘요.
> 최신 기록이 위로 오도록 **위에 쌓아** 가세요.

---

## [2026-08-11] 사원 그룹 관리 · 직급별 사원 목록 ✅

브랜치: `feat/employee-group` · 이슈: #96 · #97

### 변경 파일

| 파일 | 변경 |
| ---- | ---- |
| `src/features/employeeGroup/types.ts` | 생성 (그룹 · 구성원 · 결과 타입 · 길이 상수) |
| `src/features/employeeGroup/errorCodes.ts` | 생성 (`GRP_*` 4개 · `ADD_MEMBER_REJECTED_CODES`) |
| `src/features/employeeGroup/api.ts` | 생성 (91~97 7개 함수) |
| `src/features/employeeGroup/EmployeeGroupList.tsx` | 생성 (목록 · 검색 · 케밥) |
| `src/features/employeeGroup/EmployeeGroupFormModal.tsx` | 생성 (추가 · 수정 겸용) |
| `src/features/employeeGroup/DeleteEmployeeGroupModal.tsx` | 생성 (공용 `AlertDialogTwoButton`) |
| `src/features/employeeGroup/GroupMembersModal.tsx` | 생성 (구성원 목록 · 추가 · 제거) |
| `src/app/settings/employee-groups/page.tsx` | 생성 (라우트) |
| `src/features/jobPosition/JobPositionEmployeesModal.tsx` | 생성 (직급별 사원 패널) |
| `src/features/jobPosition/types.ts` · `api.ts` | 수정 (`JobPositionEmployee` · `getJobPositionEmployees()`) |
| `src/features/jobPosition/JobPositionList.tsx` | 수정 (인원수를 링크 버튼으로) |
| `src/constants/endpoints.ts` | 수정 (`employeeGroups` 4개 · `jobPositions.employees`) |
| `src/features/pagePermission/catalog.ts` | 수정 (`PageRoute.label` 신설 — `ADMIN_CONSOLE` 라벨 덮기) |
| `src/app/settings/page.tsx` | 수정 (`그룹 관리` 준비 중 해제) |

### 주요 작업 내용

- **사원 그룹 관리 화면 신설** — 목록(그룹명 검색) · 생성 · 수정 · 삭제. 조회는 전체 사용자지만 변경은 ADMIN 이라 전사 관리 아래에 둔다
- **구성원 관리** — 검색해 고르면 목록에 `추가 예정` 으로 얹히고 `확인` 을 눌러야 전송된다. 제거는 `제거 예정` 으로 흐려지고 되돌릴 수 있다
- **직급별 사원 목록** — `JobPositionList` 의 인원수를 링크 버튼으로 바꿔 누르면 패널이 뜬다
- **사이드바 `관리자` → `전사 관리`** — `ADMIN_CONSOLE` 의 백엔드 이름이 사이드바에서 권한 등급으로 읽혀 이 코드만 라벨을 덮었다

### 부수 결정

- **추가 · 제거를 함께 미룬다** — 처음엔 추가만 즉시 반영했는데, 그러면 `취소` 를 눌러도 제거는 이미 끝나 있어 버튼이 거짓말을 한다. 둘 다 `확인` 시점에 보낸다
- **고른 사람을 칩이 아니라 목록에 얹는다** — 목록 밖에 따로 쌓이면 최종 결과를 한눈에 볼 수 없다
- **삭제는 공용 `AlertDialogTwoButton` 을 쓴다** — 확인을 받는 용도라 `PanelModal` 로 직접 짤 이유가 없다. 손으로 짰던 마크업 60줄이 사라졌다
- **삭제 문구가 "권한에 영향 없음" 을 명시한다** — 그룹은 권한이 아니라 선택용 인덱스인데, 안 적으면 "권한이 사라질까 봐" 못 지운다
- **0명 직급은 누를 것을 만들지 않는다** — 열어봐야 빈 목록이다. `미사용` 텍스트 그대로 둔다
- **`PageRoute.label` 은 꼭 필요한 코드에만** — 덮으면 백엔드가 이름을 바꿔도 배포 전까지 반영되지 않는다. 지금 덮은 건 `ADMIN_CONSOLE` 하나뿐

### 트러블슈팅

**1. 구성원 모달에 저장 버튼이 없어 미완성처럼 보였다**

추가 · 제거가 누르는 즉시 반영되는 구조라 하단 버튼이 아예 없었다. 고른 사람은 칩으로 따로 쌓여 목록과 따로 놀았다. **선택 즉시 목록에 얹고 `취소` · `확인` 을 두는 방식**으로 바꿨다.

**2. 저장 실패 시 화면을 믿을 수 없다**

추가는 없는 사번이 섞이면 전체 거부되고, 제거는 한 명씩이라 일부만 끝났을 수 있다. 어느 쪽이든 화면 상태와 서버가 어긋나므로 **실패하면 서버에서 다시 받는다.**

### 검증

- `tsc --noEmit` · `eslint` · `next build` · `prettier` 통과
- ⚠️ 화면 동작 확인 필요 — 그룹 CRUD · 구성원 추가/제거 확인 흐름 · 직급 인원수 패널

---

## [2026-08-10] 사원 엑셀 일괄 등록 — 템플릿 · 검증 · 등록 3단 스텝퍼 ✅

브랜치: `feat/employee-bulk-upload` · 이슈: #95

### 변경 파일

| 파일 | 변경 |
| ---- | ---- |
| `src/features/employee/BulkUploadModal.tsx` | 생성 (3단 스텝퍼 · 입력 형식표 · 행 오류 표 · 등록 확인) |
| `src/lib/download.ts` | 생성 (`saveResponseAsFile()` — 응답을 파일로 저장. 도메인 무관) |
| `src/features/employee/api.ts` | 수정 (`downloadBulkTemplate()` · `validateBulkEmployees()` · `registerBulkEmployees()`) |
| `src/features/employee/types.ts` | 수정 (`BulkRowError` · `BulkValidateResult` · `BulkRegisterResult`) |
| `src/features/employee/errorCodes.ts` | 수정 (파일 3종 + `EMP_HAS_ERRORS` · `BULK_FILE_CODES`) |
| `src/constants/endpoints.ts` | 수정 (`bulkTemplate` · `bulkValidate` · `bulk`) |
| `src/components/Modal.tsx` | 수정 (`dismissOnBackdrop` prop 신설) |
| `src/features/employee/EmployeeList.tsx` | 수정 (`BulkUploadButton` 제거 · 모달 연결 · `.btn` 전환 · `useModal`/`useModalTarget` 전환) |
| `EmployeeDetail` · `EmployeeCreateForm` · `EmployeeEditForm` · `RoleChangeModal` · `PasswordResetModal` | 수정 (하드코딩 버튼 → `.btn` 계열 14곳) |

### 주요 작업 내용

- **3단 스텝퍼** — 템플릿 다운로드 → 검증 → 등록. 검증과 등록을 나눈 이유는 등록이 행마다 독립 트랜잭션이라 되돌릴 수 없어서다. 무엇이 들어갈지 먼저 보여준다
- **입력 형식표** — 템플릿 파일에 헤더 줄만 있어 형식을 알 수 없다. 8개 열의 필수 여부 · 형식을 1단계에 표로 띄운다
- **등록 확인 단계** — 되돌릴 수 없는 데다 초기 비밀번호 메일이 즉시 나가 `AlertDialogTwoButton` 으로 한 번 더 묻는다
- **`BulkUploadButton` "준비 중" 제거** — 백엔드(#245) 머지 완료로 해제

### 부수 결정

- **`lib/api.ts` 를 건드리지 않았다** — 이슈엔 "blob 경로 필요" 로 적혀 있었지만 `requestRaw()`(Response 그대로 반환) · `postForm()`(multipart) 이 이미 그 용도였다
- **파일 저장은 `lib/download.ts` 로 뺐다** — 앵커 클릭 · `Content-Disposition` 파싱을 `api.ts` 에 두면 데이터 계층이 DOM 을 만진다. 도메인을 모르는 코드라 `lib/` 이 맞다 (`.ai/STRUCTURE.md` §3)
- **`skipErrors` 는 FormData 에 담는다** — 명세가 `multipart/form-data` 요청 필드로 규정한다(쿼리스트링이 아니다)
- **등록 버튼을 미리 막는다** — `validCount === 0` 이거나 `errorCount > 0 && !skipErrors` 면 서버가 `EMP_HAS_ERRORS` 로 전체를 거부한다. 400 을 받고 나서야 아는 상황을 없앴다
- **파일 크기는 프론트에서도 본다** — 5MB 는 서버 상한과 같은 값이라 왕복 전에 막는다
- **일괄 등록 모달은 배경 클릭으로 닫지 않는다** — `Modal` 에 `dismissOnBackdrop` 을 추가했다(기본 `true`). 검증 표를 훑다 바깥을 잘못 눌러 처음부터 다시 하게 되면 곤란하다. 닫기 · Esc 는 살아 있다
- **초기 비밀번호 즉시 발송은 백엔드 설계다** — 단건 등록(32)도 같다. 끄는 옵션이 명세에 없어 화면은 **등록 전에 알리는 것**까지만 한다
- **ghost 버튼(`취소` · `닫기` · `선택 해제`)은 `.btn` 으로 바꾸지 않았다** — `globals.css` 에 대응 변형이 없고, 테두리가 생기면 주버튼과 무게가 같아진다
- **모달 여닫이를 `lib/useModal` 로 맞췄다** — 훅이 `develop`(#102)에 들어온 뒤 전환했다. `EmployeeList` 는 가이드 §8 의 "남은 호출부(A + B형)" 에 잡혀 있던 파일이라 이번에 같이 처리했다. 훅이 없던 동안 쓴 `useState(false)` 는 남기지 않았다

### 트러블슈팅

**1. 검증 오류를 고쳤는데 새 오류가 나왔다**

입사일 형식 오류를 고치자 이번엔 권한 오류가 나왔다. **한 행에 문제가 여러 개여도 응답은 하나만 준다**(2026-08-10 실측). 모르면 "고쳤는데 또 걸린다"로 읽혀 파일이 잘못됐다고 오해한다 — 검증 화면에 안내 문구를 넣었다.

**2. 엑셀이 입사일을 날짜 서식으로 바꾼다**

`2026-04-05` 를 입력하면 엑셀이 `2026.04.05` 로 표시하고 그대로 저장돼 검증에 걸린다. 형식표에 "셀 서식을 `텍스트`로" 를 명시했다.

**3. 권한 열은 한글이 아니라 영문이다**

`사원` 을 넣어도 통과하는 것처럼 보였으나(입사일 오류에 가려짐) 실제로는 `MASTER` · `MEMBER` 만 받는다. 화면 라벨(`사원` · `관리자`)과 파일 값이 다르다는 뜻이라 형식표에 명시했다.

**4. 단계를 오가면 선택한 파일 표시가 갈렸다**

| 항목 | 내용 |
| ---- | ---- |
| 문제 | `파일 다시 선택` 후 네이티브 input 은 "선택된 파일 없음", 아래 문구는 파일명을 표시 |
| 원인 | 단계 전환으로 input 이 새 DOM 요소로 다시 그려지는데 `input[type=file]` 의 값은 **보안상 JS 로 되돌릴 수 없다** |
| 해결 | 네이티브 표시를 쓰지 않는다 — `sr-only` input + `label` 버튼으로 두고 파일명은 우리 state 한 줄로만 보여준다 |

### 검증

- `tsc --noEmit` · `eslint` · `next build` · `prettier` 통과
- 실제 화면에서 템플릿 다운로드 · 검증(오류 2건) · 형식 오류 문구까지 확인
- ⚠️ 실제 등록은 **초기 비밀번호 메일이 발송되므로** 테스트 계정으로만 확인 필요

---

## [2026-08-10] 체크리스트 편집 모드 · 블록 배치 편집 모드 · 모달 상태 훅 일원화 ✅

브랜치: `user/project` · 이슈: #102

### 변경 파일

| 파일                                              | 변경                                                                             |
| ------------------------------------------------- | -------------------------------------------------------------------------------- |
| `src/lib/useModal.ts`                             | **생성** (`useModal` · `useModalRouter` · `useModalTarget`)                      |
| `src/features/block/ChecklistBlock.tsx`           | 수정 (읽기/편집 모드 분리 · 낙관적 갱신 · 삭제 확인)                             |
| `src/features/block/ChecklistItemDeleteModal.tsx` | **생성** (항목 삭제 확인)                                                        |
| `src/features/block/ArrangeBlocksButton.tsx`      | **생성** (`배치 편집` / `배치 완료` 토글)                                        |
| `src/features/block/BlockArrangeExitModal.tsx`    | **생성** (배치 저장 확인)                                                        |
| `src/features/block/BlockArrangeBlockedModal.tsx` | **생성** (편집 중 블록 추가 경고)                                                |
| `src/features/block/BlockBoard.tsx`               | 수정 (드래그를 편집 모드로 제한 · 드롭 시 자동 저장 제거 · `ArrangeHandle` 노출) |
| `src/features/block/StepBlocks.tsx`               | 수정 (편집 모드 소유 · 두 모달 배치)                                             |
| `src/features/block/AddBlockButton.tsx`           | 수정 (`isBlocked` / `onBlocked` · `useModal`)                                    |
| `src/features/block/BlockCard.tsx`                | 수정 (패널 · 메뉴 모달을 `useModalRouter` 로)                                    |
| `src/features/block/ImageBlock.tsx`               | 수정 (`useModalRouter` + `useModal`)                                             |
| `src/features/block/FileBlock.tsx`                | 수정 (`useModalTarget` ×3)                                                       |
| `src/features/department/DepartmentList.tsx`      | 수정 (`useModalTarget` ×2)                                                       |
| `src/features/jobPosition/JobPositionList.tsx`    | 수정 (`useModalTarget` ×2)                                                       |
| `src/features/businessCategory/CategoryList.tsx`  | 수정 (`useModalTarget` ×2)                                                       |
| `src/features/employee/EmployeeDetail.tsx`        | 수정 (`useModalRouter` — 모달 4개)                                               |
| `.ai/STRUCTURE.md`                                | 수정 (§6 `src/lib` 표에 훅 2개 추가 · lib/features 훅 분기 기준 명시)            |

### 주요 작업 내용

- **체크리스트를 읽기 전용으로 되돌리고 `편집` 을 붙였다** — 평소에는 진척률과 상태만 보이고, 편집 모드에서만 체크 · 내용 수정 · 추가 · 삭제가 열린다
- **체크리스트 변경을 낙관적 갱신으로** — 화면에 먼저 반영하고 요청은 뒤에서 처리한다. 실패하면 **그 항목만** 원래대로 되돌린다 (삭제는 원래 인덱스로 재삽입)
- **블록 이동도 같은 구조로** — `Block 추가` 옆 `배치 편집` 버튼으로 들어가야 드래그가 살아난다. 저장은 `배치 완료` 때 **한 번만** 나간다 (드롭할 때마다 보내던 debounce 저장 제거)
- **모달 여닫이 상태를 훅 3형으로 통일** — 이미 4개 feature 가 각자 손으로 쓰던 모양(`formTarget` · `openModal` · `confirmation` · `modal`)을 `useModal` · `useModalTarget` · `useModalRouter` 로 모았다

### 동일 배치 · 동일 값이면 요청하지 않는다 (3중 방어)

| 층  | 위치                                     | 막는 것                                                         |
| --- | ---------------------------------------- | --------------------------------------------------------------- |
| 1   | `ArrangeHandle.hasChanges()`             | 편집만 켰다 끄기 / 옮겼다 제자리 복귀 → **확인 모달도 안 뜬다** |
| 2   | `BlockBoard.finish()`                    | 잡았다 그대로 놓기                                              |
| 3   | `useLayoutSaver.send()` 지문 비교 (기존) | 서버가 확인한 배치와 동일                                       |

체크리스트 내용 수정도 `content === item.content` 로 같은 값이면 보내지 않는다 (`trim()` 후 비교).

### 트러블슈팅

**1. 체크박스를 연타하면 최종 상태가 뒤집혔다**

| 항목 | 내용                                                                                                                                                     |
| ---- | -------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 원인 | 요청이 여러 개 나가고 **보낸 순서대로 돌아오지 않는다.** 늦게 도착한 옛 응답의 `.then` 이 화면을 덮어썼다                                                |
| 해결 | 성공 시 `.then` 패치를 없앴다 (낙관값이 이미 정답이라 다시 그릴 이유가 없다) + 항목별 변경 번호(`revisions`)를 두고 **자기 번호가 최신일 때만** 롤백한다 |

**1-2. 같은 문제가 내용 수정에도 있었다** (코드 리뷰 지적)

| 항목    | 내용                                                                                                                                                                                |
| ------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 원인    | 번호 검사를 토글에만 걸었다. 한 항목을 A → B 로 연달아 고치면 A 의 늦은 응답이 B 를 덮어쓴다. 실패 롤백도 마찬가지                                                                  |
| 해결    | 번호를 **모든 변경 경로**(토글 · 수정 · 삭제)로 올리고, 수정은 성공·실패 양쪽에 검사를 걸었다                                                                                       |
| 추가    | 번호 검사는 화면만 지킨다 — 서버가 역순으로 처리하면 새로고침 후 옛 값이 남는다. **같은 항목의 요청을 직렬화**(`queues`)해 겹칠 여지를 없앴다. 다른 항목끼리는 그대로 동시에 나간다 |
| 남은 것 | 다중 사용자 동시 수정은 API 에 버전 필드가 없어 마지막 요청이 이긴다 → BE 협의 대상으로 백로그 등록                                                                                 |

**2. 편집 기준을 effect 로 잡으니 린트에 걸렸다**

`react-hooks/set-state-in-effect` · `react-hooks/refs` 두 규칙에 연달아 걸렸다. 기준을 ref 가 아니라 **state(`arrangeBase`)** 로 바꾸고 렌더 중 상태 조정(`TextBlock` 의 `autoEdit` 과 같은 방식)으로 세웠다. 덤으로 `되돌리기` 노출 여부를 파생값으로 계산할 수 있게 됐다.

**3. `CategoryList.tsx` 가 develop 병합에서 binary 충돌로 잡혔다**

| 항목 | 내용                                                                                                                                                    |
| ---- | ------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 원인 | 파일 안에 캐시 키 구분자로 쓰는 **NUL 바이트 2개**가 있어 git 이 binary 로 취급한다 (`Bin 15679 -> 15686 bytes`). 3-way 병합이 불가능해 통째로 충돌난다 |
| 해결 | develop 버전을 바닥에 깔고 우리 변경 7곳만 다시 얹었다. develop 쪽 변경은 브레드크럼 `설정` → `전사 관리` 하나뿐이라 손실 없음                          |

### 부수 결정

- **확인 모달의 취소는 `되돌리기` 가 아니라 `계속 편집`** — `AlertDialog` 는 Esc · 배경 클릭도 취소로 흘린다. 거기에 되돌리기를 걸면 실수로 누른 Esc 하나에 옮겨둔 배치가 통째로 날아간다. 되돌리기는 보드 안내줄의 별도 버튼으로 뺐다
- **편집 중에는 `Block 추가` 를 막고 경고 모달로 알린다** — 블록을 만들면 재조회가 돌아 저장 안 된 이동이 서버 배치로 덮인다. `disabled` 로 두면 왜 안 되는지 알 수 없어 모달로 이유를 말한다
- **항목 삭제 확인 모달은 요청을 보내지 않는다** — 낙관적 갱신이라 확인 즉시 목록에서 빼고, 요청은 블록이 뒤에서 처리한다. `BlockDeleteModal` · `TrashFileModal` 과 달리 `isBusy` 도 실패 안내도 없는 이유다
- **모달 훅은 `src/lib` 에 둔다** — 도메인을 모르는 훅은 `lib`(`useFlipReorder` 선례), 도메인 타입 · API 를 아는 훅은 `features`(`useLayoutSaver` · `useCurrentUser`). 기존 훅 8개가 예외 없이 이 선으로 갈려 있다
- **여닫이는 모달 종류로 나누지 않는다** — "AlertDialog 만 훅" 안을 검토했으나 ① `BlockMenu` 가 기능 모달 + AlertDialog 를 한 라우터로 들고 ② AlertDialog 8개가 폼 모달 **안에** 중첩돼 있고 ③ AlertDialog 호출부 자체가 3형으로 갈려 성립하지 않았다. 대신 **관심사별**로 나눈다 (여닫이 / 이탈·저장 확인 / 요청 진행)
- **인라인 편집은 훅 대상이 아니다** — `FileBlock.editingFileId` · `ChecklistBlock.editingId` 는 모달이 아니라 행 안의 편집 상태다

### 검증

- `tsc --noEmit` · `eslint src` · `prettier --check` · `next build` 통과
- ⚠️ 화면 동작 확인 필요 — 체크박스 연타 후 최종 상태 · 배치 편집 진입/이탈 · 설정 3개 화면(부서 · 직급 · 카테고리) 모달 · 사원 상세 모달 4개 · 이미지/문서 블록 모달

---

## [2026-08-10] 페이지 권한 후속 — 하이브리드 메뉴 해소 · 순서 기준 일원화 ✅

브랜치: `feat/page-permission` · 이슈: #98 (같은 브랜치 후속 커밋)

### 변경 파일

| 파일                                              | 변경                                                                    |
| ------------------------------------------------- | ----------------------------------------------------------------------- |
| `src/features/pagePermission/catalog.ts`          | 수정 (`PAGE_ROUTES` 4개 → 7개 · `UNROUTED_PAGES` 신설 · 내부 정렬 제거) |
| `src/features/pagePermission/useMyPages.ts`       | 수정 (`MENU_ORDER` 정렬로 고정 · 동적 병합)                             |
| `src/features/pagePermission/MyPagesProvider.tsx` | 수정 (`/my/pages` 응답 dev 로그)                                        |
| `src/features/pagePermission/PageAccessGate.tsx`  | 수정 (`isPageGated()` 로 대상 축소 · 조회 실패 시 재시도)               |
| `src/constants/menu.ts`                           | 수정 (`MENU_ORDER` 신설 · `FIXED_HEAD`/`FIXED_TAIL` → `FIXED_BY_ROLE`)  |

### 주요 작업 내용

- **하이브리드 메뉴를 걷어냈다** — 실제 응답으로 `pageCode` 11개를 확인해 화면이 있는 7개를 `PAGE_ROUTES` 로 옮겼다. 대시보드 · 결재 관리 · 전사 관리까지 전부 `/my/pages` 가 그린다
- **고정으로 남은 건 `프로젝트 조회` 하나** — ADMIN 은 시스템 계정이라 `MY_PROJECT` 를 받지 못한다. 전사 프로젝트 조회는 그와 별개 화면이라 `FIXED_BY_ROLE` 에 남겼다
- **`UNROUTED_PAGES` 신설** — 화면이 없어 일부러 빼는 코드에 이유를 적어 콘솔 경고를 막는다. **처음 보는 코드만** 경고가 뜬다
- **순서 기준을 `MENU_ORDER` 한 곳으로** — 합친 뒤 `href` 배열 순서로 정렬한다. 배열에 없는 항목은 뒤로 밀릴 뿐 사라지지 않는다

### 부수 결정

- **`ADMIN_CONSOLE(관리자)` 이 `/settings` 전사 관리 허브다** — 이름만으로는 `SETTINGS(설정)` 과 구분이 안 됐다. `source` 가 갈랐다: `ADMIN_CONSOLE` 은 `ADMIN_ONLY`, `SETTINGS` 는 전원(`DEFAULT`)이다. `/settings` 하위가 사원 · 부서 · 카테고리 · 페이지 권한이라 관리자 전용이 맞다
- **`SETTINGS(설정)` 은 개인 설정으로 본다** — 전원에게 내려오고 대응 화면이 없어 `UNROUTED_PAGES` 에 남겼다
- **사이드바 라벨이 `전사 관리` → `관리자` 로 바뀐다** — 라벨은 백엔드 `name` 을 쓴다는 원칙의 결과다. 이름을 프론트가 덮으면 백엔드가 바꿔도 배포 전까지 반영되지 않는다
- **고정 앞/뒤(head · tail) 구분을 없앴다** — 정렬을 `MENU_ORDER` 가 하니 붙이는 위치가 의미를 잃는다. `FIXED_HEAD` 는 이미 전 역할 빈 배열이었다
- **정렬 위치를 `toMenuItems()` 에서 `useMenuItems()` 로 옮겼다** — 고정 항목까지 섞인 뒤에 세워야 `프로젝트 조회` 를 `관리자` 앞에 둘 수 있다

### 트러블슈팅

**1. dev 로그가 콘솔에 안 떴다**

`pageCode` 가 어느 화면인지 판단하려고 `/my/pages` 응답을 `console.info` 로 찍었는데 아무것도 보이지 않았다.

| 항목 | 내용                                                                                                          |
| ---- | ------------------------------------------------------------------------------------------------------------- |
| 원인 | `[browser]` 로 터미널에 전달되는 로그는 **warn · error 뿐**이다. DevTools 도 Info 레벨을 접어두면 같이 묻힌다 |
| 해결 | 개발 중 눈으로 확인할 로그는 `console.warn` 으로 남긴다                                                       |

**2. 매핑을 넓히자 모든 화면이 `/my/pages` 를 기다리게 됐다** (코드 리뷰 지적)

| 항목 | 내용                                                                                                                                                                                            |
| ---- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 원인 | `PageAccessGate` 가 `findPageCode(pathname) !== undefined` 로 대상을 판단했다. 매핑이 4개일 땐 사실상 `BIDDING` · `FINANCE` 뿐이었지만 7개로 넓히자 대시보드 · 결재 관리 · 전사 관리까지 걸렸다 |
| 해결 | `PageRoute` 에 `requiresPermission` 을 두고 `isPageGated()` 로 갈랐다. **메뉴에 그리는 것과 접근을 막는 것은 다른 문제**다                                                                      |

**3. 권한 조회에 실패하면 대상 화면 본문이 그려졌다** (코드 리뷰 지적)

`status === 'failed'` 를 통과시키고 있었다. 실패는 _권한 없음_ 이 아니라 _알 수 없음_ 이라, 판단 근거 없이 본문을 그리는 대신 `ErrorStateTwoButton` 으로 재시도하게 바꿨다. 대상이 `/notices` · `/finance/*` 둘뿐이라 나머지 화면 UX 에는 영향이 없다.

**4. 매핑만 옮기면 메뉴 순서가 뒤틀렸다**

`ADMIN_CONSOLE` 을 `PAGE_ROUTES` 로 옮기자 `관리자` 가 `프로젝트 조회` 위로 올라갔다. 동적 항목이 고정 tail 보다 먼저 붙기 때문인데, 순서 기준이 `PAGE_ORDER`(동적) · head/tail(고정) 두 군데로 갈려 있어 그 구조로는 해결할 수 없었다. `MENU_ORDER` 하나로 합치고 병합 후 정렬로 바꿨다.

### 검증

- `tsc --noEmit` · `eslint` · `next build` 통과
- dev 콘솔로 `/my/pages` 응답 11개 코드 · 이름 · 등급 확인. 경로 미매핑 경고가 사라진 것으로 매핑 누락 없음 확인
- ⚠️ 사이드바 렌더 결과(순서 · 라벨)는 사용자 화면에서 확인 필요

---

## [2026-08-10] 페이지 권한 연동 — 사이드바 `/my/pages` 전환 · 권한 부여 화면 ✅

브랜치: `feat/page-permission` · 이슈: 확인 필요

### 변경 파일

| 파일                                                    | 변경                                                                        |
| ------------------------------------------------------- | --------------------------------------------------------------------------- |
| `src/features/pagePermission/types.ts`                  | 생성 (등급 3값 · 근거 4종 · 응답 타입)                                      |
| `src/features/pagePermission/errorCodes.ts`             | 생성 (`PAGE_*` 4개)                                                         |
| `src/features/pagePermission/api.ts`                    | 생성 (98~102 5개 함수)                                                      |
| `src/features/pagePermission/catalog.ts`                | 생성 (`pageCode` ↔ 라우트 매핑 · `toMenuItems()` · `isPageDenied()`)        |
| `src/features/pagePermission/display.ts`                | 생성 (라벨 · 배지 · 회수 불가 사유)                                         |
| `src/features/pagePermission/MyPagesProvider.tsx`       | 생성 (`/my/pages` 1회 조회 컨텍스트)                                        |
| `src/features/pagePermission/useMyPages.ts`             | 생성 (`useMyPages()` · `useMenuItems()`)                                    |
| `src/features/pagePermission/PageAccessGate.tsx`        | 생성 (`NONE` 진입 차단)                                                     |
| `src/features/pagePermission/PagePermissionList.tsx`    | 생성 (페이지 탭 + 접근 가능자 표)                                           |
| `src/features/pagePermission/GrantPermissionModal.tsx`  | 생성 (부여 · 등급 변경 겸용)                                                |
| `src/features/pagePermission/RevokePermissionModal.tsx` | 생성 (회수 확인 + 계속 보임 안내)                                           |
| `src/app/settings/page-permissions/page.tsx`            | 생성 (라우트)                                                               |
| `src/constants/endpoints.ts`                            | 수정 (`pages` 블록 추가)                                                    |
| `src/constants/menu.ts`                                 | 수정 (`MENU_BY_ROLE` 제거 → 고정 앞/뒤 + `findActiveMenu(pathname, items)`) |
| `src/components/Sidebar.tsx`                            | 수정 (동적 메뉴 · 로딩 · 실패 재시도)                                       |
| `src/components/Header.tsx`                             | 수정 (제목을 같은 목록에서 뽑음)                                            |
| `src/components/AppShell.tsx`                           | 수정 (`MyPagesProvider` + `PageAccessGate`)                                 |
| `src/components/settings/SettingsSkeletons.tsx`         | 수정 (`PagePermissionTableSkeleton`)                                        |
| `src/app/settings/page.tsx`                             | 수정 (페이지 권한 항목 활성 · `전사 관리` 로 개칭)                          |
| `src/components/AlertDialog.tsx`                        | 수정 (`warning` 아이콘 파랑 → 빨강)                                         |
| `src/constants/status.ts`                               | 수정 (`ROLE_LABELS` — MASTER `관리자` · ADMIN `시스템 관리자`)              |
| 브레드크럼 7개 화면                                     | 수정 (`설정` → `전사 관리`)                                                 |
| `.ai/API.md`                                            | 수정 (미연동 16건 명세 추가 · 98~102 연동 표시)                             |

### 주요 작업 내용

- **사이드바가 `GET /my/pages` 응답을 그린다** — 메뉴 노출 규칙을 프론트가 갖지 않는다. `pageCode` → 경로 · 아이콘만 프론트 몫이고 라벨은 백엔드 `name` 을 쓴다
- **`permission: NONE` 접근 차단** — `PageAccessGate` 가 본문만 감싸 `/forbidden` 으로 보낸다. 셸은 감싸지 않아 사이드바 · 헤더가 깜빡이지 않는다
- **권한 부여 화면** — 부여 대상이 `BIDDING` · `FINANCE` 둘뿐이라 목록 화면 대신 탭으로 고른다. 표에는 명시 부여자 + 전역 권한 열람자가 함께 나오고, 회수 불가 행은 이유를 붙인다
- **부여 · 회수 모달** — 부여/등급 변경은 `PanelModal`, 저장 직전 확인과 회수 확인은 공용 `AlertDialogTwoButton`. 버튼은 `globals.css` 의 `.btn` 계열을 쓴다
- **저장 전 확인 단계** — 권한은 눌러서 바로 바뀌면 안 되는 값이라 `부여` · `변경` 을 누르면 대상 · 등급을 요약해 한 번 더 묻는다. 실패하면 확인 창을 닫고 폼으로 되돌린다(고칠 곳이 폼에 있다)

### 부수 결정

- **하이브리드 전환** — 카탈로그 11개 중 코드가 확인된 건 4개뿐이라, 대시보드 · 결재 관리 · 프로젝트 조회 · 전사 관리는 `constants/menu.ts` 고정 항목으로 남겼다. 전면 전환하면 코드를 모르는 메뉴가 통째로 사라진다
- **매핑 없는 `pageCode` 는 메뉴에서 제외** — 갈 곳 없는 버튼을 그리는 것보다 낫다. 개발 모드에서 콘솔로 알린다
- **목록 조회 실패는 통과** — 이 가드는 편의지 통제가 아니다. 실제 차단은 백엔드 403 이 한다
- **`설정` → `전사 관리`** — 표시 문구만 바꾸고 라우트(`/settings`)는 유지했다. 경로까지 바꾸면 북마크 · 이력이 깨진다
- **전역 권한 사용자도 케밥을 그린다** — 부여 API 가 막는 건 ADMIN 뿐이라 MASTER 에게도 등급은 줄 수 있다. 회수 항목만 빠지고, 그 이유는 `권한 출처` 열의 자물쇠 + 툴팁으로 알린다
- **공용 `warning` 아이콘을 빨강으로** — 파랑이면 안내처럼 읽혀 경고가 지나쳐진다. `danger` 와 색은 같고 **모양(삼각형 vs 팔각형+X)으로 위험도를 가른다.** `warning` 을 쓰는 다른 8곳도 함께 바뀐다
- **접근 가드는 권한이 걸린 경로에서만 기다린다** — 모든 화면이 `/my/pages` 응답을 기다리면 첫 렌더가 통째로 느려진다
- **전역 권한 라벨을 `관리자` · `사원` 으로** — `MASTER` 가 화면에서 부르는 이름이 관리자다. 이름이 겹치는 `ADMIN` 은 `시스템 관리자` 로 밀었다 (`ROLE_LABELS` 한 곳)
- **하이브리드 메뉴를 유지한다** — 백엔드 확인 결과 권한 부여 대상은 `BIDDING` · `FINANCE` 둘뿐이고 나머지 페이지는 전원 열람이다. 나머지 `pageCode` 를 받아 동적으로 옮길 이유가 없다

### 트러블슈팅

**1. `react-hooks/set-state-in-effect` 로 lint 실패**

이펙트 안에서 `setStatus('loading')` · `setAccessors(null)` 로 상태를 비우자 규칙 위반이 났다.

| 항목 | 내용                                                                                                                                                           |
| ---- | -------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 원인 | 이펙트 본문의 동기 `setState` 는 렌더를 한 번 더 돌린다                                                                                                        |
| 해결 | 로딩 전환은 이벤트 핸들러(`refetch`)로 옮기고, 목록은 `key` 로 요청을 구분해 **키가 어긋나면 자동으로 로딩 상태**가 되게 했다 (`JobPositionList` 와 같은 방식) |

**2. 표가 깨지고 등급 배지를 눌러도 반응이 없었다**

`회수 불가` 를 `w-14`(56px) 열에 넣어 글자마다 줄바꿈됐고, 사용자는 등급 배지(`편집`)를 버튼으로 오해했다.

| 항목 | 내용                                                                                                                           |
| ---- | ------------------------------------------------------------------------------------------------------------------------------ |
| 원인 | ① 좁은 열에 텍스트 ② `revocable: false` 행은 케밥을 아예 안 그려 누를 것이 없었다                                              |
| 해결 | `회수 불가` 를 `권한 출처` 열의 자물쇠 아이콘 + 툴팁으로 옮기고, 케밥은 `ADMIN_ONLY` 가 아니면 항상 그린다(회수 항목만 조건부) |

**3. 스켈레톤이 출렁였다**

재조회마다 표를 비워 8줄 스켈레톤 → 1줄 표로 높이가 크게 튀었다. 같은 페이지의 재조회면 **직전 목록을 유지**하고(탭 이동은 비운다), 스켈레톤 줄 수를 4로 줄였다. 표 컨테이너에는 `overflow-hidden` 이 없어 sticky 헤더의 각진 흰 배경이 둥근 모서리 위로 튀어나오던 것도 함께 고쳤다.

**4. `.ai/API.md` 에 prettier 를 돌렸다가 687줄이 뒤집혔다**

`--write` 로 명세 문서를 포맷하니 기존 표 정렬이 전부 바뀌어 diff 가 1,800줄이 됐다. 되돌리고 추가분만 손으로 정렬했다 (STATE.md 2026-08-07 기록과 같은 함정).

### 검증

- `tsc --noEmit` · `eslint` · `next build` 통과
- ⚠️ 브라우저 확인은 못 했다 — ADMIN 로그인이 필요해 화면 동작은 미검증이다

---

## [2026-08-10] 프로젝트 사이드바 접기/펼치기 · 시안 크기 반영 · 아이콘 정비 ✅

브랜치: `feat/project-sidebar-collapse` · 이슈: #99

### 변경 파일

| 파일                                       | 변경                                                            |
| ------------------------------------------ | --------------------------------------------------------------- |
| `src/features/project/SidebarCollapse.tsx` | 생성 (접힘 상태 컨텍스트 · 폭 상수)                             |
| `src/components/AppShell.tsx`              | 수정 (`ProjectSidebarCollapseProvider` 로 셸 감쌈)              |
| `src/components/ProjectSidebar.tsx`        | 수정 (접힘 뷰 · 크기 시안 반영 · 스텝 점 색 · 톱니 아이콘)      |
| `src/components/Header.tsx`                | 수정 (로고 칸 폭이 사이드바를 따라감 · 접히면 `S`)              |
| `src/components/Sidebar.tsx`               | 수정 (로고 22px)                                                |
| `src/components/StepTabs.tsx`              | 수정 (탭 상단 여백 10px · `블록` · `일정` 아이콘)               |
| `src/app/globals.css`                      | 수정 (`--text-logo` · `--color-step-*` · `--animate-panel-in`)  |
| `src/components/Modal.tsx`                 | 수정 (`SIDE_PANEL` 곁패널 크기 상수 공개)                       |
| `src/features/block/BlockTypeIcon.tsx`     | 수정 (선 굵기 통일 · 4종 아이콘 모양 수정)                      |
| `src/features/block/BlockCard.tsx`         | 수정 (패널 로딩 폴백을 실물과 동일하게)                         |
| `src/components/ModalLoadingFallback.tsx`  | 수정 (`header` 전달 · `mt-5` 를 기본 `bodyClassName` 으로 이동) |
| `src/features/block/BlockIssuesPanel.tsx`  | 수정 (`bodyClassName` 에 `mt-5` 명시)                           |
| `src/features/block/ImageBlock.tsx`        | 수정 (동일)                                                     |
| `src/features/block/TextBlock.tsx`         | 수정 (동일)                                                     |
| `src/features/issue/IssueBoard.tsx`        | 수정 (동일)                                                     |
| `src/features/vitamate/AiBlock.tsx`        | 수정 (동일)                                                     |

### 주요 작업 내용

- **시안 크기 반영** — 프로젝트 사이드바의 줄 높이(48→52px) · 글자 크기(발주처 16px · 기간 14px · 스테이지 16px · 스텝명 14px)와 스텝 탭바 상단 여백 10px(탭 42px), 로고 22px 을 시안 값으로 맞췄다
- **사이드바 접기/펼치기** — 접으면 58px 로 줄어 스테이지 이름과 스텝 상태 점만 남는다. 스테이지를 누르면 펼쳐지면서 그 스테이지가 열린다
- **스텝 상태 점** — `GET /projects/{projectId}/steps` 의 `status` 로 색을 정한다(진행 전 회색 · 진행 중 노랑 · 완료 파랑). 접힘 · 펼침 · 범례가 `STEP_DOT_COLOR` 한 표를 본다
- **아이콘 정비** — 블록 아이콘 선 굵기를 탭바 · 메뉴와 같은 `1.6` 으로 통일하고, 찌그러지거나 뭉개지던 6종(체크리스트 · 입금확인 · 입찰공고 · 문서업로드 · 블록탭 · 일정탭)의 좌표를 다시 잡았다
- **패널 로딩 스켈레톤** — `연결된 이슈` · `블록 활동 로그` 의 동적 청크 폴백을 실물 패널과 같은 자리 · 크기 · 헤더로 맞췄다
- **하드코딩 정리** — 색 · 글자 크기 · 치수를 전부 글로벌 토큰과 스페이싱 스케일로 옮겼다 (아래 표)

### 하드코딩 → 글로벌 대체

| 대상             | 이전                                                 | 이후                                  |
| ---------------- | ---------------------------------------------------- | ------------------------------------- |
| 스텝 상태 색     | `#D1D5DB` · `#FFB900` · `#2563EB` · `#2B7FFF` 인라인 | `--color-step-*` → `bg-step-*` 클래스 |
| 워드마크 크기    | `text-[22px] leading-[33px]` (2개 파일)              | `--text-logo` → `text-logo`           |
| 최소 보조 글자   | `text-[10px]` · `text-[9px]`                         | `text-caption`                        |
| 접힌 사이드바 폭 | `w-[58px]`                                           | `w-14.5`                              |
| 설정 줄 높이     | `h-[46px]`                                           | `h-11.5`                              |
| 스테이지 칸 높이 | `min-h-[78px]`                                       | `min-h-19.5`                          |
| 진행률 바 두께   | `h-[5px]`                                            | `h-1.25`                              |
| 곁패널 크기      | 3개 파일에 같은 문자열 중복                          | `Modal` 의 `SIDE_PANEL` 상수          |
| 참여자 아바타    | `MEMBER_COLORS` 자체 팔레트 + 자체 마크업            | 공용 `MemberAvatar` (사번 기준 색)    |

### 트러블슈팅

**1. 사이드바를 접으면 헤더 로고 칸과 경계선이 어긋났다**

| 항목 | 내용                                                                                                |
| ---- | --------------------------------------------------------------------------------------------------- |
| 문제 | 사이드바만 58px 로 줄고 헤더 왼쪽 로고 칸은 280px 그대로라 두 오른쪽 경계선이 한 줄로 이어지지 않음 |
| 원인 | 접힘 상태를 `ProjectSidebar` 지역 상태로 들고 있어 `Header` 가 알 수 없었음                         |
| 해결 | `SidebarCollapse` 컨텍스트를 두 컴포넌트의 공통 조상인 `AppShell` 에 올리고 폭을 상수로 공유        |

**2. 폭 전환 중 사이드바 내용이 매 프레임 다시 배치됐다**

| 항목 | 내용                                                                                      |
| ---- | ----------------------------------------------------------------------------------------- |
| 문제 | 폭 애니메이션 동안 말줄임 · 줄바꿈이 프레임마다 재계산돼 끊겨 보임                        |
| 원인 | 안쪽 트리까지 바깥 폭을 따라가게 둠                                                       |
| 해결 | 바깥 상자만 `transition-[width]`, 안쪽 트리는 **고정 폭 + `overflow-hidden`** 으로 잘라냄 |

**3. `연결된 이슈` · `활동 로그` 를 열면 다른 화면이 잠깐 떴다**

| 항목 | 내용                                                                                            |
| ---- | ----------------------------------------------------------------------------------------------- |
| 문제 | 화면 가운데 760px 짜리 큰 판이 떴다가 오른쪽 아래 380px 패널로 튐                               |
| 원인 | `BlockCard` 의 `dynamic` 폴백 크기 · 위치 · 헤더가 실제 패널과 전혀 달랐음                      |
| 해결 | 폴백에 실물과 같은 `className` 을 쓰고, `ModalLoadingFallback` 에 `header` 를 넘길 수 있게 확장 |

**4. 접힌 사이드바가 스텝 수만큼 한없이 길어졌다**

| 항목 | 내용                                                                       |
| ---- | -------------------------------------------------------------------------- |
| 문제 | 스텝 20개 스테이지면 점만 240px — 접은 이유(한눈에 보기)가 사라짐          |
| 원인 | 점을 세로 1열로만 쌓음                                                     |
| 해결 | 한 줄에 3개씩 접고(`max-w-8`) 최대 9개까지만 그린다. 넘치면 `+N` 으로 표시 |

### 부수 결정

- **접힘 상태는 `localStorage` 에 저장하지 않는다** — `AppShell` 이 루트 레이아웃에 있어 화면 이동에는 이미 유지되고, 저장하면 하이드레이션 불일치를 따로 막아야 한다
- **접힘 · 펼침의 스텝 점 색은 한 표(`STEP_DOT_COLOR`)로 관리한다** — 시안은 접힘 쪽에 다른 색(완료 초록)을 썼지만, 접었다 펴는 것만으로 색 뜻이 달라지면 안 되므로 범례 색으로 통일
- **아이콘 선 굵기는 크기별로 다르게 둔다** — 16px 아이콘은 `1.6`, `size-2.5`(10px) 짜리 소형 아이콘은 `2` 를 유지한다 (얇으면 선이 사라짐)
- **입찰공고 아이콘의 은유를 의사봉 → 확성기로 바꿨다** — 16px 에서 머리 · 자루 · 받침이 뭉쳐 형태를 알 수 없었음
- **접힘 폭에 `VitaS` 가 안 들어가 `S` 한 글자만 남긴다**

### 검증

| 명령               | 결과                       |
| ------------------ | -------------------------- |
| `npx next build`   | ✅ 성공 · 라우트 25개 등록 |
| `npx tsc --noEmit` | ✅ 에러 0                  |
| `npx eslint`       | ✅ 에러 0 · 경고 0         |
| `npx prettier`     | ✅ 포맷 일치               |

---

## [2026-08-10] 정산 블록 구현 — 정산 항목 조회 · 작성/수정 ✅

브랜치: `feat/settlement` · 이슈: #89

### 변경 파일

| 파일                                          | 변경                                                       |
| --------------------------------------------- | ---------------------------------------------------------- |
| `src/features/settlement/types.ts`            | 생성 (타입 · `detail` 런타임 검증 · 폼 검증)               |
| `src/features/settlement/api.ts`              | 생성 (`getSettlementDraft()` · `saveSettlement()`)         |
| `src/features/settlement/SettlementBlock.tsx` | 생성 (요약 카드 + 진행률 + 수정 전환)                      |
| `src/features/settlement/SettlementForm.tsx`  | 생성 (작성/수정 폼 · 입금·출금 탭 · 추천값 안내)           |
| `src/constants/endpoints.ts`                  | 수정 (`blocks.settlementItems` 추가)                       |
| `src/features/block/types.ts`                 | 수정 (`SETTLEMENT` 유형 등록 · `defaultColSpan` · 배지 색) |
| `src/features/block/BlockBoard.tsx`           | 수정 (`SETTLEMENT` → `SettlementBlock` 연결)               |
| `src/features/block/BlockTypeIcon.tsx`        | 수정 (정산 아이콘 추가)                                    |
| `.ai/API.md`                                  | 수정 (85 · 86 절 + 정산 도메인 공통 절)                    |

### 주요 작업 내용

- **정산 항목 조회(85) · 작성/수정(86) 연동** — 두 API 가 경로를 공유하고 `?type=INCOME|OUTCOME` 이 필수라 `itemsPath()` 한 곳에서 쿼리를 붙인다
- **요약 카드** — 회차 · 금액 3종 · 예정일 · 거래처를 위에, 재무팀이 채우는 실제 금액 · 일자 · 상태를 구분선 아래에 둔다. 아직 없는 값은 `—` 로 자리만 남긴다
- **작성/수정 폼** — 입금 · 출금 탭을 고른 뒤 추천 회차 · 총액을 받아 컬럼 옆 안내로 표시한다. 출금이면 계좌 3종을 노출하고 셋 다 필수로 막는다
- **저장 전 검증** — `Number('')` 가 `0` 이라 빈 칸을 그대로 보내면 **0원짜리 정산이 조용히 저장된다.** `findBlocker()` 로 필수값 · 회차 범위 · 계좌 3종을 화면에서 먼저 막는다

### 트러블슈팅

**1. 저장 직후 출금 정산이 입금으로 보였다**

첫 작성에서 출금을 골라 저장하면 요약 카드 라벨이 `입금 거래처` 로 뜨고 계좌 3줄이 사라졌다.

| 항목 | 내용                                                                                        |
| ---- | ------------------------------------------------------------------------------------------- |
| 원인 | 86번 응답에 `type` 이 없고, 블록 `detail.type` 은 목록을 다시 받을 때까지 `null` 이다       |
| 해결 | `saved` state 를 `{ item, type }` 으로 바꿔 저장 시 고른 타입을 함께 보관, 카드가 그걸 본다 |

**2. 조회(GET)인데 409 가 온다**

이미 `OUTCOME` 으로 저장된 블록에서 `INCOME` 탭을 누르면 그 자리에서 `SETL-006` 이 떨어진다. 탭을 되돌리지 않으면 화면은 `입금`, 서버는 `출금` 인 채로 어긋나 저장도 같은 이유로 막힌다 → 409 를 받으면 `setType(initialType)` 으로 탭을 되돌린다.

**3. 첫 정산 블록이면 `recommendTotalAmount` 가 `null`**

기준 삼을 다른 블록이 없어서다. 그대로 `toLocaleString()` 을 부르면 화면이 통째로 죽는다 → `hintOf()` 가 숫자가 아니면 `null` 을 돌려주고, 첫 블록에는 대신 안내 문구를 띄운다.

### 부수 결정

- **작성 값을 주는 조회 API 가 없다** — 85번은 추천값과 원본 계좌번호만 준다. 그래서 요약 카드는 블록 목록(10번)의 `detail` 로만 그리고, `readSettlementBlockDetail()` 로 런타임 검증한다. 추측해서 API 를 부르면 **남의 정산 블록을 고친다**
- **계좌번호는 응답을 폼에 되돌려 넣지 않는다** — 목록 · 저장 응답 모두 마스킹된 값(`100******444`)이라 그대로 저장하면 `*` 가 계좌번호가 된다. 폼에 채우는 원본은 85번의 `originalAccountNumber` 뿐이다
- **`traderName` 은 방향에 따라 부르는 이름이 다르다** — 돈을 **보내는 쪽**이라 입금이면 상대 클라이언트, 출금이면 우리 회사다. 계좌 3종은 반대로 **받는 쪽**(외주 업체) 것이다. 라벨 · 검증 문구가 갈리지 않게 `traderLabel()` 한 곳에서 만든다
- **생성 직후에도 폼을 바로 열지 않는다** — 추천값은 타입을 골라야 받을 수 있어서, 폼을 먼저 열면 채울 것이 없다. 빈 요약 + `수정하기` 만 보여준다
- **`recommendTotalAmount` 는 이름과 달리 '맞춰야 하는 값'** — 다른 정산 블록과 어긋나면 저장이 409(`SETL-008`)로 막힌다. 그래서 `추천` 이 아니라 `맞출 금액` 으로 적는다
- **폼 값의 모양과 검증을 `types.ts` 에 함께 뒀다** — 숫자 칸도 문자열로 들고 있어야(지웠을 때 0 이 되면 안 된다) 하고, 검증이 그 모양을 그대로 본다. 둘이 갈리면 조용히 어긋난다
- **`defaultColSpan` 을 2 → 1 로 내렸다** — 라벨 · 값을 한 줄씩 쌓는 구조라 2칸이 필요 없다. 표를 늘어놓는 다른 정산 계열(`입금 확인` · `세금계산서 조회`)은 2칸 그대로다. ⚠️ 이미 만들어진 블록의 `colSpan` 은 서버 값이라 안 바뀐다 (폭 변경 UI 가 없다)
- **`BLOCK_TYPES` 배지 색은 정산 항목만 토큰으로 옮겼다** — 인라인 `style` 값이라 `var(--color-purple-*)` 로 읽는다. 나머지 9개 유형은 hex 그대로 뒀다: 유형을 구별하는 **고유 액센트**라 시맨틱 토큰으로 뭉갤 수 없고, `세금계산서`(cyan) · `입찰`(orange) 은 globals.css 에 팔레트가 아예 없다. 팔레트 신설은 별도 이슈로 미뤘다
- **`paidAmountRatio` 단위는 미확정** — 명세에 작성 직후 값(`0`)만 있다. 화면은 **0~100** 으로 보고 그린다. 0~1 이면 절반 정산이 `0.5%` 로 보여 바로 드러난다 (STATE.md 액션 아이템 등록)
- **검증은 `tsc` · `eslint` · `prettier` 까지** — 로그인 게이트 때문에 AI 쪽 브라우저 확인이 막혀 있다

---

## [2026-08-10] 프로젝트·블록 공용 모달 적용 및 이탈 방지 ✅

브랜치: `ref-ys` · 이슈: #92

### 변경 파일

| 파일                                       | 변경                                       |
| ------------------------------------------ | ------------------------------------------ |
| `src/components/AlertDialog.tsx`           | 수정 (비동기 상태·오류·복합 설명 지원)     |
| `src/components/Modal.tsx`                 | 수정 (중첩 모달 스크롤 잠금 안전성 보강)   |
| `src/app/projects/error.tsx`               | 생성 (프로젝트 라우트 오류 경계)           |
| `src/features/project/MyProjectList.tsx`   | 수정 (목록 실패 → 공용 오류 화면)          |
| `src/features/block/StepBlocks.tsx`        | 수정 (블록 조회 실패 → 공용 오류 화면)     |
| `src/features/block/BlockDeleteModal.tsx`  | 수정 (공용 투버튼 다이얼로그 적용)         |
| `src/features/issue/DeleteIssueModal.tsx`  | 수정 (공용 투버튼 다이얼로그 적용)         |
| `src/features/file/TrashFileModal.tsx`     | 수정 (공용 투버튼 다이얼로그 적용)         |
| `src/features/file/DuplicateNameModal.tsx` | 수정 (공용 투버튼 다이얼로그 적용)         |
| `src/features/block/BlockEditModal.tsx`    | 수정 (저장 확인·변경사항 이탈 경고)        |
| `src/features/block/TextBlockModal.tsx`    | 수정 (저장 확인·변경사항 이탈 경고)        |
| `src/features/block/MarkdownEditor.tsx`    | 수정 (최초 Markdown 정규화 값 전달)        |
| `src/features/block/ImageEditModal.tsx`    | 수정 (저장·삭제 확인·변경사항 이탈 경고)   |
| `src/features/block/ImageUploadModal.tsx`  | 수정 (선택 이미지 이탈 경고)               |
| `src/features/block/AddBlockModal.tsx`     | 수정 (입력 중 이탈 경고·요청 중 닫기 방지) |

### 주요 작업 내용

- 블록·이슈 삭제, 문서 휴지통 이동, 중복 문서 확인을 공용 `AlertDialogTwoButton`으로 통일
- 블록 기본정보·텍스트·이미지 수정 저장 전에 공용 확인 모달을 표시하고 이미지 삭제 예정 수를 함께 안내
- 닫기 버튼·취소·ESC·배경 클릭을 하나의 `requestClose` 경로로 통합하고 변경사항이 있으면 이탈 경고 표시
- 프로젝트 라우트 오류 경계와 프로젝트 목록·블록 목록 조회 실패 화면을 공용 `ErrorStateTwoButton`에 연결
- 편집 모달 위에 확인 모달이 겹쳐도 배경 스크롤 잠금이 먼저 해제되지 않도록 열린 모달 수를 추적
- TipTap 최초 직렬화 결과를 본문 변경 기준으로 사용해 Markdown 표기 차이에 따른 이탈 경고 오탐 방지

### 트러블슈팅

- **문제**: 원문의 공백·줄바꿈·Markdown 표기가 TipTap 직렬화 결과와 다르면 수정하지 않아도 `isDirty`가 될 수 있음
- **원인**: 서버 원문과 에디터가 정규화한 Markdown을 직접 비교함
- **해결**: `MarkdownEditor`의 `onCreate`에서 최초 직렬화 값을 전달하고 본문과 dirty 기준을 함께 정규화

### 부수 결정

- 저장 요청 중에는 확인·이탈 모달을 열지 않고 기존 모달의 모든 닫기 경로를 차단한다
- 변경하지 않은 편집 화면에서 저장 또는 닫기를 누르면 확인 없이 종료한다
- 이미지 등록과 블록 추가는 저장 확인 대상이 아니라 생성 전 입력을 잃지 않도록 이탈 경고만 적용한다

---

## [2026-08-10] 프로젝트 블록 코드 스플리팅 ✅

브랜치: `ref-ys` · 이슈: #90

### 변경 파일

| 파일                                      | 변경                                      |
| ----------------------------------------- | ----------------------------------------- |
| `src/components/ModalLoadingFallback.tsx` | 생성 (동적 모달 고정 크기 로딩 화면)      |
| `src/features/block/BlockBoard.tsx`       | 수정 (결재 제외 블록 유형별 동적 로딩)    |
| `src/features/block/AddBlockButton.tsx`   | 수정 (블록 추가 모달 동적·선행 로딩)      |
| `src/features/block/BlockCard.tsx`        | 수정 (편집·삭제·이슈·활동 로그 동적 로딩) |
| `src/features/block/TextBlock.tsx`        | 수정 (TipTap 읽기·편집 청크 분리)         |
| `src/features/issue/IssueBoard.tsx`       | 수정 (이슈 생성·수정·상세 모달 동적 로딩) |
| `src/features/block/BlockIssuesPanel.tsx` | 수정 (이슈 상세 모달 동적 로딩)           |
| `src/features/block/ImageBlock.tsx`       | 수정 (등록·수정·라이트박스 동적 로딩)     |
| `src/features/block/FileBlock.tsx`        | 수정 (중복 확인·휴지통 모달 동적 로딩)    |
| `src/features/vitamate/AiBlock.tsx`       | 수정 (분석 실행·이력 패널 동적 로딩)      |

### 주요 작업 내용

- 결재 블록은 기존 정적 로딩을 유지하고 나머지 구현 블록을 유형별 청크로 분리
- 사용자 동작 후 열리는 블록 추가·편집·삭제·이슈·로그·이미지·파일·AI 모달을 동적 로딩으로 전환
- 이슈 보드의 생성·수정·상세 모달과 블록 이슈 패널 내부 상세 모달을 별도 청크로 분리
- 버튼 hover/focus 또는 카드 pointer 진입 시 청크를 선행 로딩해 클릭 시 체감 지연 최소화
- 블록과 모달 청크 로딩 중 기존 크기를 유지하는 fallback을 제공해 화면 접힘·흔들림 방지
- 최대 JS 청크를 빌드 기준 약 648KB에서 505KB로 축소

### 부수 결정

- 즉시 노출되는 블록 본문은 SSR을 유지해 첫 렌더 결과와 접근성 구조를 보존
- 작은 아이콘·상태 컴포넌트는 청크 요청 오버헤드가 더 커 동적 로딩 대상에서 제외
- 결재 블록은 사용자 요청에 따라 이번 코드 스플리팅 범위에서 제외

---

## [2026-08-10] 공용 다이얼로그 · 오류 화면 · 헤더/사이드바 정리 ✅

브랜치: `feat/common-dialog` · 이슈: #87

### 변경 파일

| 파일                                             | 변경                                            |
| ------------------------------------------------ | ----------------------------------------------- |
| `src/components/AlertDialog.tsx`                 | 생성 (공용 다이얼로그 2종 + 아이콘 4종)         |
| `src/components/ErrorState.tsx`                  | 생성 (전체 화면 오류 안내 2종)                  |
| `src/components/ProfileMenu.tsx`                 | 생성 (헤더 프로필 드롭다운)                     |
| `src/app/globals.css`                            | 수정 (`.btn-danger` 추가 — 삭제 확인 버튼)      |
| `src/components/Header.tsx`                      | 수정 (로그아웃 분리 · 프로젝트 헤더 · 로고 칸)  |
| `src/components/Sidebar.tsx`                     | 수정 (프로필 크기 · 메뉴 대비 · 소속 없는 계정) |
| `src/features/notification/NotificationBell.tsx` | 수정 (`isDark` prop)                            |
| `.ai/STRUCTURE.md`                               | 수정 (공용 컴포넌트 표 + 모달 사용법 3-1 신설)  |
| `src/app/error.tsx`                              | 수정 (`ErrorStateTwoButton` 적용)               |
| `src/app/not-found.tsx`                          | 수정 (`ErrorStateOneButton` 적용)               |
| `src/app/forbidden/page.tsx`                     | 수정 (stub → `ErrorStateOneButton`)             |

### 주요 작업 내용

- **공용 다이얼로그** — `AlertDialogOneButton`(알리기) · `AlertDialogTwoButton`(고르기). 아이콘은 `DialogIcons` 4종(info · success · warning · danger)을 쓰는 쪽에서 골라 넘긴다
- **공용 오류 화면** — `ErrorStateOneButton` · `ErrorStateTwoButton`. `error.tsx` · `not-found.tsx` · `/forbidden` 세 화면을 여기에 얹었다
- **로그아웃을 프로필 드롭다운으로** — `ProfileMenu` 신설(마이페이지 · 로그아웃). 바깥 클릭 · Esc 닫기는 `NotificationBell` 과 같은 규칙
- **프로젝트 상세 헤더를 어둡게 + 로고 칸(`w-70`)** — 색 분기는 `isDark` prop 하나로, 값은 기존 토큰 유틸리티만 쓴다
- **사이드바 · 헤더 프로필 통일** — 명세대로 이름 18/600 · 부가정보 14/400, 헤더 제목 20/600. 메뉴 보조색은 `text-muted`
- **소속 없는 계정 대응** — 직급 · 부서가 `null` 인 계정(ADMIN 등)은 빈 줄을 그리지 않고 이름을 16px 한 줄로 떨어뜨린다

### 부수 결정

- **다이얼로그와 오류 화면을 나눴다** — 하나는 화면 위에 **덮어서** 확인을 받고(`AlertDialog`), 하나는 보여줄 것이 없어 그 자리에 **대신 놓인다**(`ErrorState`). 껍데기가 비슷해 보여도 쓰임이 달라 합치지 않았다
- **아이콘은 색만이 아니라 모양도 다르게** — 색을 구별하지 못하는 사용자에게 색만 다른 아이콘은 전부 같아 보인다 (원+느낌표 · 체크 · 삼각형)
- **프로젝트 상세 헤더를 어둡게** — `ProjectSidebar` 가 흰색이라 화면에서 어두운 면이 사라진다. 헤더가 그 자리를 대신 든다
- **⚠️ 색 분기를 CSS 클래스가 아니라 `isDark` prop 으로 되돌렸다.** 처음엔 `globals.css` 에 `.app-header` · `.header-profile*` 등 컴포넌트 클래스 9개(171줄)를 만들었는데, **한 곳에서만 쓰는 스타일이 전역 파일만 불린다.** 기존 토큰 유틸리티로 되돌리니 globals.css 추가분은 `.btn-danger` 14줄뿐이다
- **로고 칸 폭 `w-70` 은 `ProjectSidebar` 와 묶여 있다** — 오른쪽 선이 사이드바 경계선과 한 줄로 이어져야 해서, 폭을 바꿀 때는 둘을 함께 고친다
- **사이드바 메뉴 보조색을 시안 값에서 올렸다** — `#6B7280` 은 `#111827` 위에서 대비 4.1:1 로 WCAG AA(4.5:1) 미달. `#9CA3AF` 로 올려 7:1
- **타이포는 디자인 명세를 기준으로 맞췄다** — 헤더 제목 20/600, 프로필 이름 18/600, 부가정보 14/400 (한때 16/12 로 줄였다가 명세 확인 후 되돌림)
- **모달 · 다이얼로그 · 오류 화면 선택 기준을 `.ai/STRUCTURE.md` §3-1 에 정리** — 셋의 껍데기가 닮아 쓰는 쪽이 헷갈린다
- **검증은 `tsc` · `eslint` · `prettier` 까지** — 로그인 게이트 때문에 AI 쪽 브라우저 확인이 막혀 있다

---

## [2026-08-09] 글로벌 디자인 토큰 도입 · 하드코딩 색상 일괄 교체 ✅

브랜치: `style` · 이슈: #85

### 변경 파일

| 파일                             | 변경                                                   |
| -------------------------------- | ------------------------------------------------------ |
| `src/app/globals.css`            | 수정 (디자인 토큰 · 컴포넌트 클래스 전면 작성)         |
| `src/app/layout.tsx`             | 수정 (Geist 제거 → Pretendard)                         |
| `src/**/*.tsx` · `*.ts` (102 개) | 수정 (하드코딩 색상 1,864 곳 → 토큰 클래스, 순수 치환) |

### 주요 작업 내용

- 폰트를 **Pretendard Variable** 로 교체 (jsDelivr 동적 서브셋). `next/font` 의 Geist 제거
- `@theme` 에 디자인 토큰 정의 — Typography Scale 8 단계 · Weight 4 종 · Text/BG/Border 색 · Radius 7 종 · Badge/Tag/IconBox 팔레트 · Button 팔레트
- `@layer components` 로 반복 UI 고정 — `.btn`(4 종 × 크기 3), `.badge`(6 색), `.tag`(6 색), `.icon-box`(6 색), `.input` / `.textarea`
- 하드코딩 hex 1,700여 곳 + Tailwind 기본 팔레트 클래스 160 곳을 토큰 클래스로 일괄 교체

### 트러블슈팅

| 문제                                                   | 원인                                                                                                | 해결                                          |
| ------------------------------------------------------ | --------------------------------------------------------------------------------------------------- | --------------------------------------------- |
| `@import rules must precede all rules` 빌드 에러       | `@import 'tailwindcss'` 가 실제 CSS 규칙으로 펼쳐져, 그 아래 Pretendard `@import` 가 규칙 뒤로 밀림 | Pretendard `@import` 를 **파일 첫 줄**로 이동 |
| `border-[#1C1F2A]/[0.05]` 형태가 알파 없는 것으로 잡힘 | 임의 알파 표기(`/[0.05]`)를 정규식이 인식 못 함                                                     | 알파 패턴에 `\[[0-9.]+\]` 추가                |

### 부수 결정

- **알파 합성색은 불투명 토큰으로 흡수.** `border-[#1C1F2A]/10` (흰 배경 위 ≈ `#E8E9EB`) → `border-border-default`(`#E5E7EB`). `bg-[#ECEEF4]/50` → `bg-bg-surface` 등. 눈에 보이는 색은 사실상 같고 토큰 수는 줄어든다
- **`#2B3A67` / hover `#22305a` (설정 영역 남색 버튼) → Primary 버튼으로 통합.** 앱 전체 주요 버튼 색을 `#2563EB` 하나로 맞춤
- **`#4F39F6` (결재 · 비타메이트 인디고, 44 곳) 는 하드코딩 유지.** 명세에 없는 결이라 토큰화하지 않음
- `bg-white` · `text-white` 는 값이 토큰과 같아(`#FFFFFF`) 그대로 둠 — diff만 늘고 얻는 게 없음
- 밝은 초록(`#12B76A` 등 17 곳) · danger hover(`#C10007` 등 15 곳) · `text-slate-300`(사이드바 위 텍스트 2 곳) 도 대응 토큰이 없어 유지

---

## [2026-08-09] 내 프로젝트 목록 화면 ✅

브랜치: `user/project` · 이슈: #83

### 변경 파일

| 파일                                             | 변경 |
| ------------------------------------------------ | ---- |
| `src/features/project/MyProjectList.tsx`         | 생성 |
| `src/features/project/ProjectCard.tsx`           | 생성 |
| `src/features/project/projectStatus.ts`          | 생성 |
| `src/features/project/routes.ts`                 | 생성 |
| `src/components/project/ProjectListSkeleton.tsx` | 생성 |
| `src/app/projects/page.tsx`                      | 수정 |
| `src/features/project/api.ts`                    | 수정 |
| `src/features/project/types.ts`                  | 수정 |
| `src/constants/endpoints.ts`                     | 수정 |
| `src/constants/status.ts`                        | 수정 |
| `.ai/API.md`                                     | 수정 |

### 주요 작업 내용

- `GET /api/v1/projects` 연동 — `getProjects()` · 상태별 건수용 `getProjectCount()`
- `/projects` 화면 구현 — 상태 요약 카드 5개 · 검색 · 상태 탭 · 카테고리/기간 필터 · 카드 목록 · 페이지네이션
- 필터 상태를 URL 쿼리에 두어 뒤로가기 · 링크 공유가 되게 함 (결재 목록과 같은 방식)
- 프로젝트 상태 라벨·색을 `constants/status.ts` + `features/project/projectStatus.ts` 로 단일화
- 카드 접기/펼치기 — 펼치면 설명 · 내 이슈 · 내 결재 건수 · `프로젝트 전체 보기` · **스테이지 박스(그 안에 스텝 타임라인)** 노출
- 스테이지 박스도 개별 접기/펼치기. 기간(시작일 범위) · 사업분류 칩 필터바 추가

### 부수 결정

- 시안의 `현재 단계` · `완료/전체` 는 목록 응답에 없다 → 발주처, `myIssueInProgressCount`·`myApprovalOpenCount` 뱃지로 대체
- 시안 상태 탭(`검토중` 등)을 API enum 5종으로 교체. 통계 카드는 시안대로 5장 유지하고 `CLOSED` 는 탭으로만 조회
- 집계 API 가 없어 통계 카드는 상태마다 `size=1` 요청 — 목록 필터와 무관하게 **마운트 시 1회만** 호출
- 스테이지 API(7번)에 상태 필드가 없어 **스텝 상태에서 스테이지 상태를 파생** (전부 DONE → 완료 / 하나라도 진행 → 진행중 / 그 외 대기)
- 상세·스테이지·스텝 조회는 카드를 **펼칠 때 최초 1회만** — 목록 로드 시 전부 부르면 10건 페이지에서 31콜이 된다
- 시안의 카드 `description` 은 목록 응답에 없어 **상세(6번)를 펼칠 때 함께** 호출
- `stageId === null` 인 스텝은 감추지 않고 `스테이지 미지정` 박스로 모아 표시

---

## [2026-08-09] 비타메이트 AI 블록 구현 ✅

브랜치: `user/project` · 이슈: #80

### 변경 파일

| 파일                                               | 변경 |
| -------------------------------------------------- | ---- |
| `src/features/vitamate/types.ts`                   | 생성 |
| `src/features/vitamate/api.ts`                     | 생성 |
| `src/features/vitamate/useAnalysisPolling.ts`      | 생성 |
| `src/features/vitamate/AiBlock.tsx`                | 생성 |
| `src/features/vitamate/AnalysisResultView.tsx`     | 생성 |
| `src/features/vitamate/AnalysisRunModal.tsx`       | 생성 |
| `src/features/vitamate/FileVersionPickerModal.tsx` | 생성 |
| `src/features/vitamate/AnalysisHistoryPanel.tsx`   | 생성 |
| `src/features/vitamate/StatusBadge.tsx`            | 생성 |
| `src/features/file/projectFileVersionsStore.ts`    | 생성 |
| `src/features/file/useProjectFileVersions.ts`      | 생성 |
| `src/features/block/BlockBoard.tsx`                | 수정 |
| `src/features/file/api.ts`                         | 수정 |
| `src/features/file/types.ts`                       | 수정 |
| `src/constants/endpoints.ts`                       | 수정 |
| `src/lib/api.ts`                                   | 수정 |
| `.ai/API.md`                                       | 수정 |

### 주요 작업 내용

- **AI 블록 본문**(`AiBlock`) — 분석 없음 / 진행 중 / 실패 / 완료 4갈래. 카테고리 칩 · REFERENCE·TARGET 문서 · 확정 프롬프트 · 결과 · 재실행 · 수정 · 이력을 한 카드에 담는다
- **실행·수정 모달**(`AnalysisRunModal`) — 검토 유형 탭 + 세부 카테고리 다중 선택 + 기준/대상 문서 선택 + 프롬프트. 카테고리를 고르면 `exampleText` 가 자동으로 채워지고, 사용자가 손댄 뒤에는 덮어쓰지 않는다
- **문서 선택 모달**(`FileVersionPickerModal`) — 프로젝트 전체 파일 **버전** 목록. `indexStatus !== COMPLETED` 와 반대 역할이 이미 가져간 버전을 비활성화
- **폴링 훅**(`useAnalysisPolling`) — 요청 후 15초 대기 → 3초 간격 → 종료 시 중단, 2분 초과 시 문구 전환
- **결과 파서**(`parseResult`) — 자유 문자열인 `result` 를 요약 · 지적사항(심각도 색 막대) · 경고로 나눈다. 못 나누면 마크다운 원문으로 폴백
- **요청량 점검 · 절감** — 프로젝트 파일 버전 목록을 컴포넌트마다 중복 조회하던 것을 공유 스토어(`projectFileVersionsStore`)로 묶고, 검토 템플릿 캐시 · 이력 상세 캐시 · 백그라운드 탭 폴링 정지를 넣었다

### 요청량 (문서 블록 2 + AI 블록 1 기준)

| 구간                    | 전  | 후  |
| ----------------------- | --- | --- |
| 스텝 진입               | 3   | 2   |
| 인덱싱 폴링 1분         | 36  | 12  |
| 실행 모달 열기 (2회차~) | 2   | 0   |
| 백그라운드 탭 1분       | 36  | 0   |

### 트러블슈팅

| 문제                                           | 원인                                                                     | 해결                                                                                |
| ---------------------------------------------- | ------------------------------------------------------------------------ | ----------------------------------------------------------------------------------- |
| `Idempotency-Key` 를 실을 곳이 없음            | `lib/api.ts` 의 `request()` 가 헤더를 고정으로 넣고 있었다               | `headers?` 선택 인자를 `request`·`api.post` 에 추가 (기존 호출부는 그대로 동작)     |
| eslint `react-hooks/set-state-in-effect` 2건   | 폴링 훅의 상태 초기화 · 실행 모달의 단일 유형 자동 선택을 effect 에서 함 | 초기화는 **렌더 중 상태 조정** 패턴으로, 자동 선택은 `effectiveType` **계산값**으로 |
| 문서 목록을 실행 모달·선택 모달이 각각 받아 옴 | 선택 모달이 스스로 fetch 하고 있었다                                     | 실행 모달이 한 번만 받아 두 역할이 나눠 쓰도록 선택 모달을 표현 전용으로 전환       |
| 재실행이 새 분석을 만들지 않을 수 있음         | 같은 `Idempotency-Key` + 같은 내용이면 서버가 기존 `analysisId` 를 준다  | `재실행` 은 키를 **새로 뽑고**, 실행 모달은 내용이 그대로면 키를 **유지**한다       |
| 모달 크기가 내용에 따라 흔들림                 | `max-h-*` 만 걸어 두어 템플릿 도착 · 칩 증감마다 높이가 바뀜             | 높이를 고정(`h-[560px]`/`h-[520px]`)하고 본문만 내부 스크롤                         |
| 인덱싱이 끝나도 문서가 계속 회색               | 문서 목록을 열 때 한 번만 받아 `indexStatus` 가 갱신되지 않음            | 읽는 중인 문서가 있는 동안만 5초 폴링 → 전부 끝나면 스스로 중단                     |
| 전송 중 `취소` 를 누르면 분석이 유실됨         | `202` 응답이 이미 언마운트된 모달의 콜백으로 돌아옴                      | `requestClose()` 로 ESC · 배경 클릭까지 묶어 전송 중 닫기를 막음                    |
| 같은 목록을 여러 컴포넌트가 각자 조회·폴링     | 훅이 컴포넌트마다 자기 fetch·타이머를 가짐                               | 구독형 공유 스토어로 **프로젝트당 조회 1회 · 타이머 1개**                           |

### 부수 결정

| 결정                                                     | 근거                                                                                                    | 트레이드오프                                                        |
| -------------------------------------------------------- | ------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------- |
| API 계약은 **5필드**(`.ai/api` SCREENS 메모 기준)로 확정 | 첨부 목업의 REFERENCE·TARGET 구분과 카테고리 칩은 구버전 2필드 계약으로 표현이 불가능                   | 백엔드 배포가 늦으면 400 이 난다 — 폴백은 두지 않았다               |
| `result` 를 프론트에서 파싱                              | 서버가 형식을 보장하지 않는데 목업은 요약·지적사항·경고 구조를 요구                                     | 파싱 실패 시 마크다운 원문 폴백. 구조화 필드가 생기면 파서를 지운다 |
| 블록 최신 분석은 **이력 목록 첫 건**으로 대체            | "블록 최신 분석" 전용 API 가 명세에 없다                                                                | 블록마다 조회가 1회 더 나간다 — 전용 API 요청 필요                  |
| 검토 유형/카테고리 UI 는 **탭 + 체크박스 칩**            | 유형은 단일, 카테고리는 다중이라 선택 규칙이 눈에 보인다. 아코디언은 카테고리를 다 펴 봐야 개수를 안다  | 유형이 많아지면 탭이 줄바꿈된다                                     |
| 이력은 **드로어 패널**(활동 로그와 같은 자리·크기)       | 블록 안 펼침으로 두면 카드 높이가 행 전체를 밀어 올린다                                                 | 결과와 이력을 나란히 못 본다                                        |
| citation 은 MVP 에 **포함**하되 기본 접힘                | 근거 확인이 이 블록의 핵심 가치인데, 항상 펴 두면 결과보다 길어진다                                     | 한 번 더 눌러야 보인다                                              |
| 검토 템플릿을 **모듈 캐시**로 (세션당 1회)               | 운영자가 바꾸기 전까지 고정인 참조 데이터인데 모달을 열 때마다 받고 있었다                              | 운영 중 템플릿이 바뀌면 새로고침 전까지 옛 값을 쓴다                |
| 백그라운드 탭에서는 폴링을 **멈춘다**                    | 안 보는 탭에서 3초·5초마다 찔러 봐야 쓸모가 없다. 돌아오는 순간 즉시 따라잡는다                         | 탭을 오래 가려 두면 복귀 시점에 한 박자 늦게 반영된다               |
| **문서 업로드 블록의 AI 준비 배지는 넣었다가 되돌림**    | 인덱싱 대기를 업로드 화면으로 앞당기려 했으나, 문서 블록이 AI 도메인·프로젝트 전체 목록에 의존하게 된다 | 업로드 직후 바로 분석하면 문서 선택 모달에서 대기를 다시 만난다     |

### 남은 것

- 백엔드에 요청할 것 — "블록 최신 분석 단건 조회" API, `result` 구조화 계약, 이력 응답 감싸는 키 확정, `prompt` 길이 상한
- 실제 서버 붙여 폴링 타이밍(15초/3초)과 409 문구 검증
- `POLL_DELAY_MS = 15초` 는 팀 합의값이라 그대로 뒀다 — 빠른 분석에서 체감이 나쁘면 8초로 낮추는 것을 논의
- 인덱싱 대기 근본 해결(B안) — 인덱싱 중 문서도 선택 허용 + 서버가 준비되면 자동 실행. 백엔드 합의 필요

---

## [2026-08-08] PDF 미리보기 뷰어 로딩 속도 개선 ✅

브랜치: `user/project` · 이슈: #78

### 변경 파일

| 파일                                              | 변경 |
| ------------------------------------------------- | ---- |
| `src/features/file/pdfViewer.ts`                  | 생성 |
| `src/features/file/previewCache.ts`               | 생성 |
| `src/features/file/PdfPages.tsx`                  | 수정 |
| `src/features/file/FileViewerModal.tsx`           | 수정 |
| `src/features/approval/ApprovalDocumentModal.tsx` | 수정 |
| `src/features/block/FileBlock.tsx`                | 수정 |
| `.ai/local/STATE.md`                              | 수정 |

### 주요 작업 내용

- **코드 스플리팅** — `react-pdf`/`pdfjs-dist`(~350KB gz)를 초기 번들에서 분리(`next/dynamic`, `ssr: false`). 문서를 열지 않는 사용자는 내려받지 않는다
- **hover 프리로드** — 문서 목록에 마우스가 닿으면 뷰어 청크와 pdf.js 워커(`<link rel="prefetch">`)를 미리 받아, 스플리팅으로 늘어날 대기를 상쇄
- **뷰포트 렌더** — `LazyPage` 로 화면에 들어온 페이지만 그린다. pdf.js 워커가 하나뿐이라 5장을 한꺼번에 마운트하면 1페이지가 나머지와 큐를 다투던 문제 해결
- **DPR 상한 2** — 3x 화면의 픽셀 9배 → 4배. 래스터화 시간과 캔버스 메모리(85MB → 37MB)를 함께 절감
- **미리보기 프리페치 · LRU 캐시** — `previewCache.ts`. 문서 행에 150ms 이상 머물면 `getPreview` 를 미리 시작하고, 클릭이 그 요청을 이어받는다

### 트러블슈팅

| 문제                                            | 원인                                                                               | 해결                                                                                    |
| ----------------------------------------------- | ---------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------- |
| 1페이지가 뜨기까지 오래 걸림                    | 5페이지를 한꺼번에 마운트해 워커 큐에서 경쟁                                       | `IntersectionObserver` 로 화면에 들어온 페이지만 마운트                                 |
| 자리표시자 높이가 0 이면 5장이 동시에 교차 판정 | 렌더 전에는 페이지 크기를 모름                                                     | `pdf.getPage(1).getViewport()` 로 **메타데이터만** 읽어 비율 확보 (실패 시 A4 기본값)   |
| `rootMargin` 이 먹지 않음                       | 스크롤을 모달 본문이 갖는데 `root` 가 뷰포트였음                                   | `findScrollParent()` 로 실제 스크롤 조상을 찾아 `root` 로 지정                          |
| 프리페치를 붙여도 캐시가 비어 다시 받음         | 모달 언마운트 시 `controller.abort()` 가 공유 중인 요청을 끊음                     | 두 모달의 정리 함수를 `abort` → `isStale` 플래그로 교체 — 요청은 살리고 **결과만 무시** |
| 청크 로드 중 화면이 비어 클릭이 안 먹은 듯 보임 | `next/dynamic` 은 `loading` 이 없으면 `null` 을 렌더                               | 두 동적 컴포넌트에 `role="status"` 로딩 fallback 추가 (리뷰 반영)                       |
| 캔버스가 나오기 직전 슬롯이 0 으로 주저앉음     | `isVisible`(관찰 진입)로 높이를 풀었는데 `loading={null}` 이라 그 사이 내용이 없음 | `onRenderSuccess` 로 `isRendered` 를 따로 두고 그전까지 `minHeight` 유지 (리뷰 반영)    |
| 실패한 옛 요청이 같은 키의 새 요청을 지움       | `evictOverflow` 로 밀려난 Promise 의 `catch` 가 키만 보고 삭제                     | 삭제 전 `cache.get(key) === pending` 동일성 확인 (리뷰 반영)                            |

### 부수 결정

| 결정                                                  | 근거                                                                                                       | 트레이드오프                                                                  |
| ----------------------------------------------------- | ---------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------- |
| 한 번 그린 캔버스는 **버리지 않는다** (윈도잉 미도입) | 미리보기가 최대 5페이지라 점유가 ~37MB 로 예측 가능. 되돌아올 때마다 재래스터화하는 쪽이 훨씬 비싸다       | 20페이지 이상으로 늘면 윈도잉 전환 필요 → 백로그 등록                         |
| 캐시에 결과가 아닌 **Promise** 를 담는다              | 프리페치가 시작한 요청을 클릭이 그대로 await → 같은 문서를 두 번 받지 않음                                 | 실패 Promise 를 남기면 재시도가 막혀, `catch` 에서 항목을 지운다              |
| LRU 상한 4개 · `FileRow` 단위 hover · 150ms 체류 조건 | 캐시가 모듈 전역이라 문서 블록 수에 비례해 누적됨. `<ul>` 에 걸면 목록을 스쳐 지나가기만 해도 N개를 받는다 | 가드 4개만큼 구현이 복잡해짐. 대신 점유가 블록 수와 무관하게 ~4MB 로 고정     |
| 프리페치 요청은 hover 가 끝나도 **중단하지 않는다**   | 중단하면 프리페치 자체가 무의미                                                                            | 모달을 즉시 닫아도 요청 하나가 끝까지 돈다 (5페이지 미리보기라 크기가 제한적) |

### 남은 것

- 미리보기 fetch(`getPreview`) 자체는 **서버가 요청마다 원본을 잘라 주는 구조**라 프론트에서 줄일 수 없다. DevTools Timing 의 TTFB 측정 후 백엔드에 서버 캐시 · `Cache-Control: private, immutable` 요청 필요
- `ApprovalDocumentModal` 미리보기 영역 `scrollbar-gutter: stable` (문서 블록 뷰어에는 이미 적용됨)

---

## [2026-08-08] 스텝 활동 기록(`/log`) 화면 구현 ✅

브랜치: `log` · 이슈: #74 + #75

### 변경 파일

| 파일                                                 | 변경 |
| ---------------------------------------------------- | ---- |
| `src/features/activityLog/types.ts`                  | 생성 |
| `src/features/activityLog/api.ts`                    | 생성 |
| `src/features/activityLog/time.ts`                   | 생성 |
| `src/features/activityLog/ActivityLogItem.tsx`       | 생성 |
| `src/features/activityLog/ActivityLogSkeletons.tsx`  | 생성 |
| `src/features/activityLog/StepActivityLog.tsx`       | 생성 |
| `src/features/activityLog/useActivityLogFeed.ts`     | 생성 |
| `src/features/activityLog/BlockActivityLogPanel.tsx` | 생성 |
| `src/features/block/BlockCard.tsx`                   | 수정 |
| `src/app/projects/[id]/steps/[stepId]/log/page.tsx`  | 수정 |
| `src/app/projects/[id]/steps/[stepId]/layout.tsx`    | 수정 |
| `src/constants/endpoints.ts`                         | 수정 |
| `.ai/API.md`                                         | 수정 |
| `.ai/local/STATE.md`                                 | 수정 |

### 주요 작업 내용

- 초안(`비타s초안`)의 `LogsTab` 타임라인 디자인을 현재 화면 톤(색 · 글자 크기 · 스켈레톤)에 맞춰 구현 — 날짜 그룹 머리 + 세로선 타임라인 + 동작 아이콘
- 활동 기록 조회 API(72번) 연동 — 커서 기반 무한 스크롤(`IntersectionObserver`, 바닥 200px 전에 선조회)
- 블록 필터 — `GET /steps/{id}/blocks` 로 선택지를 채우고, 바꾸면 목록 · 커서를 초기화한 뒤 재조회
- 문장 조립을 화면에서 전부 처리 — 윗줄 `수행자 + 블록(제목 · 유형 아이콘) + 동작 배지`, 아랫줄 `displayName + 동작 + 변경 값`
- `fieldName` 별 표시 규칙 구현 — `title`·`content`·`caption` 은 펼쳐서 전문, `orderIndex` 는 `N번째 → M번째`, `isCompleted`·`status` 는 값 사전 매칭, `lines` 는 그대로
- **블록별 활동 로그 팝업** — 블록 카드 `⋯` → `활동 로그`. 같은 API 에 `?blockId=` 를 붙여 조회 (연결 이슈 패널과 같은 자리 · 크기)
- 목록 조회 · 커서 이어 읽기를 `useActivityLogFeed` 훅으로 추출 — 스텝 화면과 블록 팝업이 같은 규칙(중복 제거 · 조건 전환 시 직전 목록 유지 · 실패 처리)을 공유

### 트러블슈팅

| 문제                                        | 원인                                                                           | 해결                                                                                    |
| ------------------------------------------- | ------------------------------------------------------------------------------ | --------------------------------------------------------------------------------------- |
| `react-hooks/set-state-in-effect` 린트 오류 | 스텝 변경 시 필터를 되돌리려고 effect 안에서 `setState` 를 동기 호출           | 필터 · 블록 목록에 **어느 스텝의 값인지**를 함께 담아 렌더 중 파생값으로 계산           |
| 무한 스크롤이 같은 커서를 두 번 조회        | 감시 지점이 스크롤 중 여러 번 걸리는데 `state` 플래그는 반영이 한 박자 늦음    | `loadingMoreRef` 로 진행 중 여부를 즉시 잠그고 응답 후 해제                             |
| 이어 읽기 실패 후 자동 재시도가 무한 반복   | 감시 지점이 계속 화면에 남아 있어 실패하자마자 다시 호출                       | 오류 상태에서는 observer 를 붙이지 않고 `다시 시도` 버튼으로만 재호출                   |
| 스크롤바가 생길 때마다 화면이 좌우로 흔들림 | 목록이 늘어나며 스크롤바가 생기는 순간 본문 폭이 줄어듦 (무한 스크롤이라 반복) | 스텝 레이아웃 본문에 `scrollbar-gutter: stable` — 스크롤바는 그대로 보인다              |
| 블록 필터를 바꿀 때마다 화면 전체가 깜빡임  | 조회 조건이 바뀌는 즉시 목록을 버리고 스켈레톤을 다시 띄움                     | 직전 목록을 띄운 채 새 조건을 조회하고, 도착하면 갈아끼움 (`isSwitching` 동안만 흐리게) |
| 목록 바닥이 깜빡임                          | 이어 읽는 동안 `마지막 기록입니다` 문구와 스켈레톤이 번갈아 나타남             | 이어 읽는 중에는 마무리 문구를 감춤                                                     |

### 리뷰 반영

- 시각을 못 읽으면 빈칸 대신 `시각 미상` + 원본 값 툴팁 — 왜 시각이 없는지 알 수 있게
- 날짜 검증 강화 — 정규식을 끝까지 잠그고(타임존 붙은 값 차단), `Date` 가 정규화한 값이 입력과 다르면 거부 (`2026-02-30` 이 3월로 넘어가던 문제)
- 긴 변경 내용(`<pre>`)에 `tabIndex` · `role="region"` — 키보드로도 내부 스크롤 가능
- 첫 조회 중 `aria-busy` — 스켈레톤은 눈으로만 보이는 신호라 보조기술에 따로 알린다
- 블록 목록(필터) 조회 실패를 문구 + `다시 시도` 로 노출 — 이전에는 조용히 삼켰다
- `ActivityIcon` 을 공용 컴포넌트로 분리 (`BlockActivityLogPanel` · `BlockCard` 중복 제거)
- 이어 읽기 요청에 `AbortController` + 조건 전환 시 진행 상태 초기화 — A 조건 요청이 끝날 때까지 잠금이 풀리지 않아 **B 조건의 자동 이어 읽기가 멈추던** 문제
- 첫 페이지 응답도 `signal.aborted` 확인 후에만 반영 — 지난 조건의 응답이 새 목록을 덮지 않게

### 부수 결정

- `createdAt` 에 타임존 표기가 없어(`2026-08-02T14:32:00`) `new Date(문자열)` 대신 **직접 쪼개 로컬 시각**으로 만든다 — 브라우저별 UTC 해석 차이로 날짜가 밀리는 것을 막는다
- 날짜 그룹은 밀리초 차가 아니라 **달력 날짜**로 비교한다 — 자정 직후 기록이 '어제' 로 밀리지 않게
- 상대 시간(`방금` · `N분 전` · `N시간 전`)은 **24시간 이내만** 쓰고, 그 이후는 시각(`14:32`)을 그대로 보여준다
- 페이지네이션 중 새 기록이 쌓여도 같은 항목이 두 번 그려지지 않게 `activityLogId` 로 걸러 이어 붙인다
- 블록 필터가 걸린 목록에서는 줄마다 반복되는 블록 칩을 감춘다 (`showBlock`) — 단 **지금 그려진 목록의 필터**를 따른다 (조회 중인 새 조건이 아니라)
- 필터를 바꾸면 목록 맨 위로 스크롤을 되돌린다 — 목록이 통째로 갈리는데 스크롤이 중간에 남으면 아무 데나 떨어진다
- `ActivityLogItem` 은 `memo` — 이어 읽기마다 이미 그린 줄까지 다시 그리면 펼친 `<details>` 가 접히고 스크롤이 끊긴다
- 팝업의 감시 지점은 **팝업 자신**(`root`)을 기준으로 잰다 — 화면 기준으로 재면 목록이 짧을 때 계속 걸려 이어 읽기가 멈추지 않는다
- 블록 팝업은 줄마다 블록 이름을 반복하지 않는다 (`showBlock={false}`) — 헤더에 이미 블록명이 있다
- 명세 예시의 `fieldName` 이 `completed`, 단어 사전은 `isCompleted` 라 **두 이름 모두** 값 사전에 등록 — 실제 값은 백엔드 확인 필요

---

## [2026-08-07] 이미지 블록 구현 ✅

브랜치: `user/project` · 이슈: #72

### 변경 파일

| 파일                                      | 변경 |
| ----------------------------------------- | ---- |
| `src/features/block/ImageBlock.tsx`       | 생성 |
| `src/lib/useFlipReorder.ts`               | 생성 |
| `src/features/block/useDragAutoScroll.ts` | 수정 |
| `src/features/issue/IssueCard.tsx`        | 수정 |
| `src/features/issue/IssueBoard.tsx`       | 수정 |
| `src/features/block/ImageUploadModal.tsx` | 생성 |
| `src/features/block/ImageEditModal.tsx`   | 생성 |
| `src/features/block/ImageLightbox.tsx`    | 생성 |
| `src/features/block/api.ts`               | 수정 |
| `src/features/block/types.ts`             | 수정 |
| `src/features/block/BlockBoard.tsx`       | 수정 |
| `src/features/block/StepBlocks.tsx`       | 수정 |
| `src/constants/endpoints.ts`              | 수정 |
| `src/lib/api.ts`                          | 수정 |
| `.ai/API.md`                              | 수정 |
| `.ai/local/STATE.md`                      | 수정 |

### 주요 작업 내용

- 초안(`비타s초안`)의 이미지 블록을 현재 블록 카드 · 공용 모달 구조에 맞춰 구현 (캐러셀 · 캡션 · 장수 표기)
- 이미지 API 6종 연동 (66 한 장 조회 · 67 생성 · 68 순서/캡션 수정 · 69 삭제 · 70 다운로드 · 71 전체 조회)
- 첫 장은 블록 목록 조회(10번) `detail` 로 함께 받아 카드가 뜨자마자 그리고, 두 번째 장부터 66번으로 한 장씩 받아 정렬 번호로 캐싱
- 카드 · 전체보기의 캡션 줄을 항상 한 줄 자리로 고정해 캡션 작성/삭제 시 블록 높이가 흔들리지 않게 처리
- 등록 모달 — 드래그&드롭 · 다중 선택 · 장별 캡션 · **드래그로 순서 변경**(보낸 순서가 곧 정렬 번호) · `image/*` · 10MB 선검증, `multipart/form-data` 전송
- 수정 모달 — 드래그 순서 변경 · 캡션 편집 · 삭제 표시 후 저장 시 일괄 반영 (열 때 71번으로 전체 목록 1회 조회)
- 등록 · 수정 모달 스크롤바를 감추고(`no-scrollbar`), 드래그로 위·아래 끝에 닿으면 목록이 따라 굴러가게 연결 (`useDragAutoScroll` 재사용 — 모달용 가장자리 · 속도 옵션 추가)
- 등록 · 수정 모달의 순서 변경에 FLIP 미끄러짐 효과 추가 (`src/lib/useFlipReorder.ts` 신설) — 바뀌는 순간에만 측정, 화면 밖 · 100개 초과 · 모션 감소 · 숨겨진 탭 제외
- 크게 보기(라이트박스)와 단일 · 전체(zip) 다운로드 연결 — 카드 · 전체보기 모두 마지막 ↔ 첫 장 순환 이동 지원
- 이미지 블록을 새로 만들면 텍스트 블록처럼 등록 모달이 바로 열리도록 `StepBlocks` 자동 편집 대상에 추가

### 함께 정리한 것

- 이슈 카드 `⋯` 메뉴에서 `~(으)로 이동`(상태 변경) 항목 제거 — **상태 변경은 드래그&드롭 하나로만** 한다
  - `IssueCard` 의 `onChangeStatus` prop 과 `IssueBoard` 의 `requestStatus` · `changeStatusRef` 도 함께 정리 (드롭 경로는 `changeStatus` 직접 호출)
  - ⚠️ 드래그를 쓸 수 없는 사용자는 상태를 바꿀 수단이 없어진다

### 리뷰 반영

- `detail` 숫자 파싱을 `Number.isSafeInteger` 기반으로 강화 — `NaN` · `Infinity` · 음수 · 소수를 걸러 `/items/NaN` 요청과 캐시 미스를 막음. 빈 `imageUrl` 도 제외
- 업로드 대기 목록 key 를 배열 길이 → **일련번호**로 변경 (뺐다 다시 담을 때 key 충돌 → 오삭제 · 오이동)
- 허용 형식을 안내 문구와 같은 `image/jpeg · png · gif · webp` 화이트리스트로 제한 (`accept` 포함) — 서버 독립 검증은 백엔드에 요청
- 수정 저장이 부분 실패하면 71번으로 서버 목록을 다시 읽어 모달 · 카드를 재동기화하고 재시도를 허용
- 전체보기에서 다운로드 실패 문구를 모달 안에 표시 (기존에는 모달 뒤 카드에만 떠서 안 보였음)
- `BlockImage.altText`(선택) 계약 추가 + `imageAltText()` 로 대체 텍스트 일원화 — 백엔드 필드 추가 요청
- 첫 조회 실패를 **빈 상태와 분리** — 실패 시 재시도 UI, 빈 상태는 서버가 0장이라고 한 경우만
- 삭제 시 `totalCount` 를 모르면 0장으로 단정하지 않고 앞 장을 다시 조회해 서버 값으로 확정

### 부수 결정

- `lib/api.ts` 에 `postForm()` 추가 — 기존 래퍼가 JSON `Content-Type` 을 고정해 multipart 전송이 불가능했다
- 다운로드는 presigned 가 아니라 서버 바이너리라 `requestRaw()` 로 blob 을 받아 앵커로 저장한다 (세션 쿠키 필요)
- 수정 모달의 삭제는 저장 시점에 실행한다 — 취소로 닫으면 아무것도 바뀌지 않아야 한다
- 양 끝에서의 `prev`/`next` 동작이 명세에 없어 1번 · 마지막 장에서는 버튼을 아예 노출하지 않는다

### 검증

| 명령                               | 결과               |
| ---------------------------------- | ------------------ |
| `npx tsc --noEmit`                 | ✅ 에러 0          |
| `npm run lint -- --max-warnings=0` | ✅ 에러 0 · 경고 0 |
| `npm run build`                    | ✅ 성공            |

> 🚧 백엔드 실동작 미확인 — `detail` 의 첫 이미지 키 이름, `items/0?direction=next` 예비 경로 확인 후 마감한다.

---

## [2026-08-07] 이슈-블록 연결 · 이동 애니메이션 최적화 ✅

브랜치: `issue` · 이슈: #68

### 변경 파일

| 파일                                          | 변경 |
| --------------------------------------------- | ---- |
| `src/features/block/BlockIssuesPanel.tsx`     | 생성 |
| `src/features/block/BlockCard.tsx`            | 수정 |
| `src/features/block/BlockBoard.tsx`           | 수정 |
| `src/features/block/useSlideOnReorder.ts`     | 수정 |
| `src/features/issue/IssueBoard.tsx`           | 수정 |
| `src/features/issue/useIssueMoveAnimation.ts` | 생성 |
| `.ai/local/STATE.md`                          | 수정 |

### 주요 작업 내용

- 블록 카드 메뉴와 푸터의 이슈 완료/전체 카운트에서 연결 이슈 패널을 열도록 연결
- 초안의 우측 하단 패널 디자인을 현재 공용 모달·배지·아바타 컴포넌트에 맞게 적용
- 패널을 열 때만 `GET /steps/{stepId}/issues?blockId={blockId}`를 호출해 블록별 연결 이슈 조회
- 마감일 정렬, 로딩 스켈레톤, 빈 상태, 실패 후 재시도 UI 구현
- 전체·시작 전·진행 중·완료 아이콘 필터와 상태별 건수 배지, 필터 결과 빈 상태 구현
- 필터 결과 개수에 따라 패널 높이와 위치가 흔들리지 않도록 `72vh` 고정 높이·`560px` 상한과 내부 스크롤 적용
- 로딩 UI를 실제 헤더 건수·상태 필터·이슈 카드 내부 구조와 같은 형태로 세분화해 데이터 도착 시 레이아웃 이동 축소
- 연결 이슈 카드를 클릭하면 이슈 보드의 `IssueDetailModal`을 조회 전용으로 재사용해 상세 API를 호출하도록 연결
- 이슈 상태 드롭 시 이동 카드와 양쪽 열의 카드가 자연스럽게 자리를 메우는 FLIP 애니메이션 적용
- 상태 변경 직전·직후에만 화면에 보이는 카드 위치를 측정하고 `transform`으로 합성해 드래그 중 반복 연산 방지
- 애니메이션 처리 100개 상한, 숨겨진 탭·모션 감소 설정 제외, API 실패 롤백 애니메이션 적용
- 블록 FLIP을 매 렌더 전체 측정에서 실제 순서 변경 직전 `capture()` 방식으로 변경하고 가시 블록·100개 상한 적용
- 블록 배치 저장 실패 롤백도 같은 FLIP 경로로 연결하고, `will-change`는 애니메이션 동안만 유지
- 연결 이슈 완료 현황 버튼에 패널 기능과 완료 수를 함께 전달하는 `aria-label` 추가
- 블록 가시성을 `IntersectionObserver`로 별도 추적해 화면 밖 노드의 `getBoundingClientRect()` 호출 제거
- 삭제된 이슈의 DOM 노드와 ID별 ref callback 캐시를 함께 정리해 장시간 생성·삭제 시 closure 누적 방지

### 트러블슈팅

- **문제**: 첫 프로덕션 빌드에서 Google Fonts `Geist` 다운로드 실패
- **원인**: 샌드박스 네트워크 제한으로 `fonts.googleapis.com` 연결 불가
- **해결**: 네트워크 허용 환경에서 재실행하여 프로덕션 빌드 성공 확인

### 부수 결정

- 초안처럼 보드에서 모든 이슈를 들고 블록마다 `filter`하지 않고, 패널이 열린 블록만 서버의 `blockId` 필터로 지연 조회한다
- 연결 이슈가 0건이어도 카드 메뉴에서는 패널을 열어 빈 상태와 연결 방법을 확인할 수 있게 한다

### 검증

| 명령                               | 결과                  |
| ---------------------------------- | --------------------- |
| `npx tsc --noEmit`                 | ✅ 에러 0             |
| `npm run lint -- --max-warnings=0` | ✅ 에러 0 · 경고 0    |
| `npm run build`                    | ✅ 프로덕션 빌드 성공 |

---

## [2026-08-07] 블록 수정 · 삭제 즉시 반영 · 복귀 시 목록 동기화 ✅

브랜치: `user/project` · 이슈: #65

### 변경 파일

| 파일                                         | 변경                                                      |
| -------------------------------------------- | --------------------------------------------------------- |
| `src/features/block/BlockActionsContext.tsx` | 생성 — 보드 → 카드 `patch` · `remove` 배선                |
| `src/features/block/BlockBoard.tsx`          | `patch` · `remove` 구현 · 프로바이더 · `isEcho` 판정 교체 |
| `src/features/block/BlockCard.tsx`           | 수정 · 삭제를 컨텍스트로 라우팅 (없으면 이벤트 폴백)      |
| `src/features/block/BlockEditModal.tsx`      | `onUpdated(updated)` — 응답을 그대로 넘김                 |
| `src/features/block/BlockDeleteModal.tsx`    | `onDeleted(blockId)`                                      |
| `src/features/block/StepBlocks.tsx`          | 이탈 시 대기 배치 flush · 복귀 시 재조회                  |
| `.ai/API.md`                                 | 44번 동시 편집 한계 · 확인 대기 항목 추가                 |

### 주요 작업 내용

- **이름 · 담당자 수정 즉시 반영** — 재조회 대신 응답을 그 블록에만 꽂는다. `rowIndex` · `sortOrder` · `colSpan` · `detail` 은 건드리지 않아 자리도 본문도 그대로다
- **삭제 즉시 반영** — 목록에서 빼기만 한다. 남은 블록의 서버 좌표는 그대로지만 화면도 서버도 같은 패킹 규칙을 써서 순서가 달라지지 않는다. 빈자리는 FLIP 이 메운다
- **복귀 시 동기화** — `visibilitychange` 로 나갈 때 대기 배치를 보내고, 돌아올 때 목록을 다시 읽는다

### 트러블슈팅

- **문제**: 이름 · 담당자를 바꾸면 반영이 느리고 배치가 흔들린다
- **원인**: 전역 `block:changed` → 전체 재조회. ① `PATCH` + 목록 `GET` 왕복 2번이 끝나야 보이고 ② 새 배열이 `toFlatOrder()` 로 **서버 좌표에 맞춰 다시 정렬**돼 아직 저장 전인 배치가 튀며 ③ `saver.reset()` 이 대기 중이던 배치까지 버린다
- **해결**: `BlockActionsContext` 로 응답을 해당 블록에만 반영. 전역 이벤트는 **블록이 생기는 변화**에만 남겼다

- **문제**: 다른 사람이 이름 · 담당자만 바꾼 목록을 통째로 무시한다
- **원인**: `isEcho` 를 **블록 ID 나열 비교**로 판정했다. ID 순서가 같으면 "내가 올린 목록" 으로 오인한다
- **해결**: `blocks === echoed` 참조 비교로 바꿨다. 우리가 올려보낸 배열을 state 로 들고 비교한다 (렌더 중 ref 접근 금지 규칙 회피)

### 부수 결정

- **삭제 후 배치를 다시 보내지 않는다** — 남은 좌표에 빈 번호가 생겨도 평면 순서 → 3칸 패킹 결과는 같다. 불필요한 전량 덮어쓰기를 만들지 않는다
- **실시간 동기화는 백엔드 대기로 미룬다** — SSE(변경 알림) + 배치 버전(`If-Match` → 409)이 필요하다. 요청서 `.ai/local/REQUEST-realtime-layout.md`, 착수 계획 `.ai/local/PLAN-realtime-layout.md`
- **폴백은 유지** — SSE 가 붙어도 `visibilitychange` 재조회는 연결이 끊긴 동안의 공백을 메우므로 남긴다

---

## [2026-08-07] 스텝 이슈 보드 화면 · 이슈 API 연동 · 드래그 성능 개선 ✅

브랜치: `issue` · 이슈: #63

### 변경 파일

| 파일                                                  | 변경                                                                               |
| ----------------------------------------------------- | ---------------------------------------------------------------------------------- |
| `src/features/issue/types.ts`                         | 생성 — 이슈 응답·요청 타입 · 상태/우선순위 라벨·색 · `byDueDate` · `overdueDays`   |
| `src/features/issue/api.ts`                           | 생성 — 목록 · 생성 · 상세 · 부분수정 · 상태변경 · 삭제 6종 + `toCreateDueDate`     |
| `src/features/issue/events.ts`                        | 생성 — `issue:changed` 전역 이벤트 (사이드바 진척률 갱신용)                        |
| `src/features/issue/IssueBoard.tsx`                   | 생성 — 상태 3열 칸반 · 드래그 상태 변경 · 모달 오케스트레이션 · 스텝 `EDITOR` 가드 |
| `src/features/issue/IssueCard.tsx`                    | 생성 — 카드 (우선순위 · 마감 경과 · 담당자 · 연결 블록 수 · 마감일), `memo`        |
| `src/features/issue/IssueBadges.tsx`                  | 생성 — 상태/우선순위/마감경과 배지 · 담당자 아바타 목록 · 블록 아이콘 상자         |
| `src/features/issue/IssueDetailModal.tsx`             | 생성 — 상세 재조회 · 상태 표시(변경 불가) · 연결 블록 · 마감/종료일                |
| `src/features/issue/IssueFormModal.tsx`               | 생성 — 생성·수정 공용 폼 (담당자 · 관련 블록 선택), 바뀐 필드만 PATCH              |
| `src/features/issue/DeleteIssueModal.tsx`             | 생성 — 삭제 확인 · 오류 안내                                                       |
| `src/features/issue/IssueSkeletons.tsx`               | 생성 — 보드 로딩 Skeleton                                                          |
| `src/components/MemberAvatar.tsx`                     | 생성 — 담당자 아바타 공용화 (사번 기준 색 고정)                                    |
| `src/app/projects/[id]/steps/[stepId]/issue/page.tsx` | 수정 — 스텁 → `IssueBoard` 연결                                                    |
| `src/constants/endpoints.ts`                          | 수정 — `steps.issues` · `issues.detail` · `issues.status`                          |
| `src/components/ProjectSidebar.tsx`                   | 수정 — `issue:changed` 구독(디바운스 300ms) · 진척률 막대 전환                     |
| `src/features/block/BlockBoard.tsx`                   | 수정 — 드래그 컨텍스트·강조 상태 리렌더 범위 축소, `BlockBody` `memo`              |
| `src/features/block/BlockEditModal.tsx`               | 수정 — 담당자 `select` → 칩 + 후보 버튼 (이슈와 동일 스타일)                       |
| `src/features/block/BlockCard.tsx`                    | 수정 — 자체 아바타 → `MemberAvatar`                                                |
| `src/features/file/FileViewerModal.tsx`               | 수정 — 미리보기 영역 `scrollbar-gutter: stable`                                    |
| `.ai/API.md`                                          | 수정 — 이슈 도메인 공통 절 + 55~60번 추가                                          |

### 주요 작업 내용

- 이슈 보드를 상태 3열 칸반으로 구현하고 **드래그로만** 상태를 바꾼다 — 화면을 먼저 옮기고 `PATCH /issues/{id}/status` 호출, 실패 시 원래 자리로 복구
- 서버가 정렬·필터를 하지 않아 **첫 조회만 마감일 순(미지정 마지막)**, 이후 생성·이동한 이슈는 열 맨 위로 올린다
- 생성은 항상 `TODO`(시작 전) 고정, 상세 모달은 상태를 표시만 한다 — 변경 진입점을 드래그 하나로 통일
- 수정은 **바뀐 필드만** `PATCH`, 담당자·연결 블록은 최종 전체 목록으로 동기화
- 마감일이 지나면 경과 일수를 `D+N` · `N일 지남` 으로 표시 (완료 이슈는 제외), 종료일은 `completedAt` 날짜, 없으면 `-`
- 이슈 변경 시 `issue:changed` 로 사이드바의 스텝 진척률·전체 진척률을 **스켈레톤 없이** 갱신
- 담당자 지정 UI 를 이슈·블록 양쪽 동일하게 맞추고 아바타를 `MemberAvatar` 로 공용화

### 트러블슈팅

- **드래그 중 화면 흔들림** — 열 상단에 드롭 자리표시자를 끼워 넣어 카드가 밀렸고, 호버 카드에 `translate`, 드래그 카드에 `scale`·`rotate` 가 걸려 있었다. 자리표시자를 없애고 강조를 **배경 · ring** 으로만 처리, 크기·위치를 바꾸는 효과를 제거해 레이아웃이 고정되게 했다.
- **`dragover` 리렌더 폭주 (과부하 의심 지점)** — `dragover` 는 커서를 멈춰도 계속 들어오는데 매번 `setState` 를 불러 열 3개 + 카드 전부가 초당 수십 번 다시 그려졌다. 같은 코드베이스의 `BlockBoard` 는 이미 값 비교 가드를 두고 있었고(`if (slot !== activeSlot)`), 같은 규칙을 이슈 보드에도 적용했다. 추가로 `IssueCard` 를 `memo` 로 감싸고 콜백을 고정, 보이지 않는 `didDrag` 플래그를 state → ref 로 옮겼다.
- **블록 보드 이동 재검증** — 이동 규칙(방향 기반 swap · 머무름 110ms · 정착 180ms · 꼬리 슬롯 · 캡처 단계 판정 · 저장 세대 가드)에는 결함이 없었고, 드래그 컨텍스트 객체가 매 렌더 새로 만들어져 모든 `BlockCard` 가 다시 그려지던 것이 병목이었다. 컨텍스트 값을 `draggingId` 기준으로만 갱신하고 강조 상태에 ref 가드를 붙였다.
- **PDF 미리보기 캔버스 재렌더** — 페이지가 그려지며 스크롤바가 생겨 폭이 줄고 `ResizeObserver` 가 다시 돌아 캔버스 전체를 한 번 더 그렸다. 스크롤 영역에 `scrollbar-gutter: stable` 을 넣어 왕복을 없앴다.

### 부수 결정

- 화면 표기 ID 는 `#{issueId}` — 명세(57번)가 `issueKey` 를 주지 않는다고 명시했다. 시안의 `I-003` 형식은 쓰지 않는다.
- `dueDate` 형식이 생성(`yyyy-MM-ddTHH:mm:ss`)과 수정·조회(`YYYY-MM-DD`)에서 다르다 → 생성 시 `T00:00:00` 을 붙여 보낸다(`toCreateDueDate`). **백엔드 확인 필요.**
- 블록 선택지는 명세가 안내한 `GET /steps/{stepId}/blocks/options` 절이 없어 **10번 `/blocks`** 를 쓴다. **백엔드 확인 필요.**
- 목록 응답 예시의 `assignees[].profileImageUrl` 은 명세 표에 없어 쓰지 않는다.
- 스텝 권한·이름은 스텝 상세 API 가 없어 프로젝트 스텝 목록(`myPermission` · `name`)에서 찾는다.
- 이슈 필터·검색 UI 는 이번 범위에서 제외하고 백로그로 넘긴다 (명세상 전부 프론트 처리).

### 검증

| 명령                       | 결과                       |
| -------------------------- | -------------------------- |
| `npx tsc --noEmit`         | ✅ 에러 0                  |
| `npx eslint src`           | ✅ 에러 0 · 경고 0         |
| `npx prettier --check`     | ✅ 규칙 준수               |
| `npm run build`            | ✅ 성공 · 라우트 31개      |
| 실제 백엔드 대상 동작 확인 | ⬜ 미완 (사용자 확인 대기) |

---

## [2026-08-06] 설정 · 인사 · 카테고리 Skeleton UI 적용 ✅

브랜치: `user/project` · 이슈: 확인 필요

### 변경 파일

| 파일                                                                    | 변경                                                 |
| ----------------------------------------------------------------------- | ---------------------------------------------------- |
| `src/components/Skeleton.tsx`                                           | 생성 — 공용 Skeleton primitive · 그룹 · 표 · 필드    |
| `src/components/settings/SettingsSkeletons.tsx`                         | 생성 — 설정 목록·상세·폼 조합 Skeleton               |
| `src/components/project/ProjectSkeleton.tsx`                            | 수정 — 공용 Skeleton primitive 재사용                |
| `src/features/{employee,department,jobPosition,businessCategory}/*.tsx` | 수정 — 텍스트 로딩을 화면 구조형 Skeleton으로 교체   |
| `src/app/settings/employees/page.tsx`                                   | 수정 — Suspense fallback을 사원 표 Skeleton으로 교체 |

### 주요 작업 내용

- 설정 목록 4종의 에러 → 로딩 → 빈 상태 → 목록 분기 순서를 유지하면서 표 형태 Skeleton 적용
- 사원 목록은 실제 페이지 크기 20행과 7열 구조, 부서는 트리 들여쓰기를 반영
- 사원 상세·수정 폼은 카드·필드 구조를 본뜬 Skeleton 적용
- 사원 등록은 부서·직급 옵션을 기다리는 셀렉트 2개만 Skeleton 처리
- 프로젝트 전용 Skeleton도 새 공용 primitive를 사용하도록 중복 제거

### 부수 결정

- PrimeNG는 Angular 전용이라 설치하지 않고 형태·접근성 규칙만 React/Tailwind 공용 컴포넌트로 구현한다.
- API 호출이 없는 설정 허브는 Skeleton 대상에서 제외한다.

### 검증

| 명령               | 결과    |
| ------------------ | ------- |
| `npm run lint`     | ✅ 성공 |
| `npx tsc --noEmit` | ✅ 성공 |
| `npm run build`    | ✅ 성공 |

---

## [2026-08-08] 알림 드롭다운 · 전체 목록 ✅

브랜치: `feat/notifications` · 이슈: #20

### 변경 파일

| 파일                                                | 변경                                              |
| --------------------------------------------------- | ------------------------------------------------- |
| `src/features/notification/types.ts`                | 생성 — 알림 타입 · `isUnread()`                   |
| `src/features/notification/api.ts`                  | 생성 — 목록 · 이동 대상 · 읽음 · 전체 읽음 · 삭제 |
| `src/features/notification/display.ts`              | 생성 — 종류별 아이콘 · 이동 경로 조립             |
| `src/features/notification/time.ts`                 | 생성 — `10분 전` · `어제` · `3일 전`              |
| `src/features/notification/events.ts`               | 생성 — `notification:changed` 창 이벤트           |
| `src/features/notification/routes.ts`               | 생성 — 화면 경로 단일 소스                        |
| `src/features/notification/NotificationBell.tsx`    | 생성 — 헤더 종 · 배지 · 드롭다운                  |
| `src/features/notification/NotificationRow.tsx`     | 생성 — 알림 한 줄 (드롭다운 · 페이지 공용)        |
| `src/features/notification/NotificationMenu.tsx`    | 생성 — 케밥 메뉴(삭제 · 읽음 · 취소)              |
| `src/features/notification/NotificationSection.tsx` | 생성 — `미확인` · `확인` 구역                     |
| `src/features/notification/NotificationList.tsx`    | 생성 — 알림 페이지 껍데기                         |
| `src/app/notifications/page.tsx`                    | 수정 — stub → 실제 화면                           |
| `src/components/Header.tsx`                         | 수정 — `알림` 텍스트 링크 → 종 아이콘             |
| `src/constants/endpoints.ts`                        | 수정 — `notifications` 5개 경로                   |
| `.ai/API.md`                                        | 수정 — 74~78번 절 · 알림 도메인 공통 신설         |

### 주요 작업 내용

- 헤더 종 — 안 읽은 건수 배지, 최근 5개 드롭다운, `모두 읽음`, `알림 전체 보기`
- 알림 페이지 — `미확인` · `확인` 두 구역을 한 화면에 위아래로, 구역마다 페이지 이동
- 알림 한 줄에 케밥 메뉴(삭제 · 읽음 · 취소) — `취소` 는 메뉴를 닫기만 한다
- 알림 클릭 시 이동 대상을 받아 결재 상세로 이동, 갈 곳이 없으면 읽음만 처리
- 읽지 않은 알림은 **배경색과 점** 두 가지로 표시
- 유형 필터 칩(전체 · 결재 · 이슈 · 댓글 · 시스템) — `category` 값 하나만 바꿔 조회
- 날짜 그룹 머리(`오늘` · `어제` · 날짜)와 절대 시각 표기 — 전체 목록 한정

### 트러블슈팅

- **헤더 배지가 실시간으로 안 바뀐다** — 마운트 때 한 번만 물어봤고, 헤더 종과 알림 페이지는 부모-자식이 아니라 서로의 처리를 몰랐다. `notification:changed` 창 이벤트(블록의 `block:changed` 와 같은 방식) + 탭 복귀(`visibilitychange`) + 60초 주기 조회 셋을 붙였다. 숨어 있는 탭에서는 세지 않는다
- **케밥 메뉴가 상자에 잘렸다** — 목록에 스크롤을 걸면 마지막 줄의 메뉴가 상자 밖으로 나간다. 결국 스크롤을 걷어내며 함께 사라진 문제다
- **Swagger 응답 예시가 또 달랐다** — 목록 예시에 `readAt` 이 항상 값으로 채워져 있었지만 실제로는 `null` 이 온다(= 안 읽음). 실행 결과 기준으로 타입을 만들었다
- **알림 페이지에서 이동하면 헤더 배지가 낡은 채로 남았다** — 이동 대상 조회가 읽음까지 끝냈는데 알리지 않고 화면을 떠났다. `router.push` 앞에서 신호를 보내도록 고쳤다 (드롭다운은 원래 그렇게 하고 있었다)
- **필터를 바꾸면 빈 목록이 떴다** — 3페이지를 보다 유형을 바꾸면 없는 페이지에 떨어진다. `setPage(0)` 을 이펙트에서 부르면 `react-hooks/set-state-in-effect` 에 걸려, 구역에 `key` 를 걸어 새로 만드는 쪽으로 처리했다

### 부수 결정

- **읽음 판정은 `readAt` 하나로만 한다** — 응답에 `isRead` 같은 boolean 이 없다(쿼리에만 있다). 판정을 `isUnread()` 한 곳에 모아 화면마다 갈리지 않게 했다
- **클릭 이동은 읽음 API 를 부르지 않는다** — 이동 대상 조회가 읽음 처리를 겸한다(AP 아님, 알림 도메인 규칙). 따로 부르면 요청만 두 번이다
- **경로 조립은 프론트 몫** — 서버는 도메인 무관한 `type` · `targetId` 만 준다. 모르는 `type` 은 `routeOf()` 가 `null` 로 떨어뜨려 이동하지 않고 읽음만 남긴다
- **`notificationType` 은 열린 유니온**(`string & {}`) — 전체 목록을 받지 못했다. 모르는 값이 와도 기본 아이콘으로 떨어져 화면이 비지 않는다
- **`미확인` · `확인` 을 탭이 아니라 한 화면에 나란히** 둔다 — 탭이면 방금 읽은 알림이 어디로 갔는지 보이지 않는다. 서버 필터는 `isRead` 하나만 다르다
- **상자 스크롤 · 페이지 스크롤을 모두 두지 않는다** — 둘이 겹치면 어느 쪽을 굴려야 할지 알 수 없다. 대신 한 구역에 5개만 담고 페이지로 넘긴다
- **`모두 읽음` 은 헤더 드롭다운에만** 둔다 — 알림 페이지는 한 건씩 처리하는 곳이다
- **이미 읽은 알림에는 케밥의 `읽음` 을 그리지 않는다** — 누를 수 없는 항목이 떠 있으면 왜 안 되는지 알 수 없다
- **배지 숫자는 `totalElements`** — 목록 길이는 `size` 에 잘려 실제와 다르다
- 시간 파싱 · 날짜 묶기는 활동 기록의 `parseActivityTime()` · `groupByDate()` 를 그대로 쓴다 — 타임존 없는 문자열도, 달력에 없는 값도 같은 사정이다. 하루가 지난 뒤 표기만 다르다(활동 기록은 시각, 알림은 `3일 전`)
- **전체 목록은 절대 시각, 드롭다운은 상대 시간** — 목록은 날짜 머리에 이미 `어제` 가 있어 줄에도 적으면 같은 말이 두 번이다. 머리는 날짜, 줄은 시각으로 나눴다
- **유형 칩 값은 추론이다** — `category` 는 `notificationType` 의 접두어인데 확인된 값이 `APPROVAL` 뿐이라, 시안의 칩 이름에서 `ISSUE` · `COMMENT` · `SYSTEM` 을 추론했다. 틀리면 그 칩만 빈 목록이 되고 `display.ts` 의 상수 한 줄만 고치면 된다
- **연결 위치 정보(`프로젝트 > Step`)는 넣지 못했다** — 목록 응답에 없다. 이동 대상 조회로 얻을 수는 있지만 **그 호출이 읽음 처리를 겸해서**, 목록을 여는 것만으로 전부 읽음이 되어버린다. 백엔드에 목록 응답 확장을 요청해야 한다

---

## [2026-08-07] 결재 회차 이력 조회 · 회차 전환 ✅

브랜치: `feat/approval-detail` · 이슈: #62

### 변경 파일

| 파일                                           | 변경                                                         |
| ---------------------------------------------- | ------------------------------------------------------------ |
| `src/features/approval/types.ts`               | 수정 — `ApprovalRevisionSummary` · `ApprovalRevisionHistory` |
| `src/features/approval/api.ts`                 | 수정 — `getRevisions()`                                      |
| `src/features/approval/ApprovalDetailView.tsx` | 수정 — 회차 전환 탭 · 지난 회차 열람 · 본문 분리             |
| `.ai/API.md`                                   | 수정 — 66번 절 신설 · 대기표에서 제거                        |

### 주요 작업 내용

- `GET /approvals/{approvalId}/revisions` 연동 — 전체 회차를 회차 번호 오름차순으로 받는다
- 상세 화면에 회차 전환 탭 추가, 회차가 2개 이상일 때만 그린다
- 지난 회차를 고르면 회차 상세(48번)를 따로 받아 같은 본문(`RevisionBody`)으로 그린다
- 지난 회차에서는 승인 · 반려 버튼을 아예 노출하지 않는다

### 트러블슈팅

- **`setState` 를 이펙트에서 부른다는 lint 오류** (`react-hooks/set-state-in-effect`) — 회차를 바꿀 때 직전 내용·실패 문구를 이펙트 안에서 비우고 있었다. 초기화를 클릭 핸들러(`selectRevision`)로 옮겨 렌더가 한 번 더 도는 것도 함께 없앴다
- **지난 회차를 받는 동안 머리말이 어긋났다** — 상태 배지와 회차 번호가 현재 회차 값을 그대로 보여줬다. 이력 요약에 `status` · `revisionNo` 가 있어 그것으로 채우고, 이력에 없는 제목만 `불러오는 중…` 으로 둔다
- **Swagger 응답 예시가 사원 스키마**(`userId` · `departmentPath`)로 잘못 표기돼 있었다 — 실행 결과 기준으로 타입을 만들고 `API.md` 의 명세·실물 차이 표에 남겼다

### 부수 결정

- **응답 봉투에 기존 `ApprovalPage<T>` 를 쓰지 않았다** — 이력 응답에는 `totalElements` · `totalPages` 가 없다. 없는 필드를 타입에 넣으면 `undefined` 가 화면으로 샌다
- **현재 회차 판정은 `isCurrent` 로 한다** — `revisionNo` 최댓값으로 짚으면 재상신 DRAFT 가 생겼을 때 어긋난다
- **현재 회차는 다시 부르지 않는다** — `pastRevisionId === null` 을 현재 회차로 두고 이미 받아 둔 결재 상세를 그대로 쓴다
- **이력 조회 실패는 화면을 접지 않는다** — 곁다리라 못 받으면 전환 탭만 빠지고 현재 회차는 그대로 보인다
- **결재 블록에는 회차 전환을 넣지 않았다** — 블록이 3열 그리드의 1칸이라 탭을 놓을 폭이 없다. `N회차` 배지로 재상신 사실만 알리고 이력 열람은 상세에 맡긴다
- `ViewedRevision = Omit<ApprovalDetail, 'blockOrigin'>` — 결재 상세와 회차 상세가 `blockOrigin` 만 빼고 필드가 같아 본문을 한 컴포넌트로 공유한다

---

## [2026-08-07] 결재 관리 상세 · 승인/반려 · 결재 블록 ✅

브랜치: `feat/approval-page` → `feat/approval-detail` · 이슈: #61

### 변경 파일

| 파일                                              | 변경                                               |
| ------------------------------------------------- | -------------------------------------------------- |
| `src/app/approvals/[approvalId]/page.tsx`         | 생성 — 상세 라우트(숫자 아닌 세그먼트는 404)       |
| `src/features/approval/ApprovalDetailView.tsx`    | 생성 — 상세 본문 · 상태별 분기                     |
| `src/features/approval/ApprovalTimeline.tsx`      | 생성 — 결재선 타임라인(의견 · 처리 일시)           |
| `src/features/approval/ApprovalProcessModal.tsx`  | 생성 — 승인 · 반려 공용 모달                       |
| `src/features/approval/ApprovalDocumentModal.tsx` | 생성 — 결재 문서 뷰어(버전 전환 없음)              |
| `src/components/approval/ApprovalSkeletons.tsx`   | 수정 — 상세 스켈레톤 추가                          |
| `src/features/file/{api,types}.ts`                | 수정 — `getFileVersion()` · `FileVersionDetail`    |
| `src/constants/endpoints.ts`                      | 수정 — `fileVersions.detail`                       |
| `src/components/Pagination.tsx`                   | 수정 — `showTotal` · `unit` 옵션 추가              |
| `src/features/approval/ApprovalList.tsx`          | 수정 — 열 너비 고정, 기안 탭 액션 버튼 제거        |
| `src/features/approval/format.ts`                 | 생성 — `formatDateTime()` (타임라인 · 블록 공용)   |
| `src/features/approval/ApprovalBlock.tsx`         | 수정 — 반려 배너 · 완료 안내 · DRAFT 수정 진입     |
| `src/features/approval/ApprovalDraftForm.tsx`     | 수정 — 결재선 순서 이동(↑↓) · 안내 문구 정리       |
| `src/features/approval/ApprovalProgress.tsx`      | 수정 — 상태별 마커 · 완료 카운트 · 스크린리더 라벨 |

### 주요 작업 내용

- `GET /approvals/{approvalId}` 연동 — 항상 현재 회차를 보여준다
- 결재선 타임라인에 승인 · 반려 · 대기와 의견 말풍선 · 처리 일시 표시
- 승인 · 반려 처리(`POST /approval-lines/{lineId}/approve|reject`)와 의견 입력
- 결재 문서 뷰어 — 미리보기(PDF 앞 5페이지) · 다운로드 · `결재 이후 새 버전` 안내
- 결재 블록 진행 현황을 상태별(승인 ✓ · 반려 ✕ · 현재 차례 · 대기)로 칠하고 완료 수 표시
- 결재선 순서를 ↑↓ 버튼으로 바꾸는 기능 — `PUT lines` 가 전체 치환이라 배열만 바꿔 보낸다
- 반려 사유를 **재상신 회차를 만든 뒤에도** 유지하고 `내용을 수정한 뒤 다시 상신해주세요` 안내 추가
- 최종 승인 완료 안내와 `결재 승인 확인` 버튼(표시 전용) 추가

### 트러블슈팅

- **결재 문서 미리보기가 403 으로 막힌다** — 파일 API 가 스텝 참여 여부를 본다. 결재자 지정은 프로젝트 참여와 별개(AP-019)라 프로젝트에 없는 MASTER 는 자기가 결재할 문서를 열 수 없다. 화면에는 전용 안내를 띄우고 백엔드에 권한 기준 확장을 요청함
- **모달 제목이 두 번 나왔다** — `Modal` 에 `header` 를 넘기지 않아 기본 제목 줄과 커스텀 헤더가 함께 그려졌다
- **재상신하면 반려 사유가 사라졌다** — 새 회차의 결재선은 아무도 처리하지 않아 `REJECTED` 줄이 없다. 무엇을 고쳐야 하는지가 그 문구에 있어서, 회차를 갈아타기 **직전에** 값을 따로 확보해 두도록 바꿨다
- **상신 직후 진행 현황이 비어 보였다** — 응답의 `status` 만 갈아끼우니 결재선이 상신 전(전부 대기) 그대로였다. 1번 결재선이 `ACTIVE` 로 바뀐 회차를 다시 받도록 변경
- **`prettier --write` 로 `.ai/API.md` 전체(673줄)가 뒤집혔다** — 내용까지 손상(`55~60` → `55~~60`). `git checkout` 으로 되돌리고 의도한 3줄만 다시 적용했다. **팀 공용 md 는 prettier 대상이 아니다** (백로그에 일괄 포맷 항목이 따로 있다)

### 부수 결정

- **처리 후 재조회하지 않는다** — 승인 응답의 `nextActiveLineId` · `approvalCompleted` 로 다음 상태를 알 수 있어, 타임라인을 그 자리에서 갱신한다
- 빈 의견은 **키 자체를 빼서** 보낸다 — 빈 문자열이 저장되면 타임라인에 빈 말풍선이 뜬다
- 결재 문서 뷰어에 **버전 전환 패널을 두지 않았다** — 결재 대상은 상신 시점에 확정된 한 버전이라(AP-013·014) 다른 버전을 열 수 있으면 무엇을 결재하는지 흐려진다
- **`원본 블록 보기`(AP-079) 미구현** — 쓰지 않기로 결정. 응답의 `blockOrigin` 은 그대로 받되 화면에서 소비하지 않는다
- **차례 전 결재자 전용 화면(AP-039·075) 미구현** — 목록에 노출되지 않아 눌러서 갈 길이 없다. URL 직접 접근만 남고 그때는 백엔드 문구를 그대로 보여준다
- 목록 행의 회차 · 진행 · 날짜 · 아바타 칸 **너비를 고정**했다 — 회차 배지와 결재자 수가 행마다 달라 열이 어긋났다
- **반려 사유를 화면에서는 필수로 막는다** — 서버는 선택으로 받지만(AP-054), 사유 없이 반려되면 기안자가 무엇을 고쳐 재상신할지 알 수 없다(AP-059·060). 승인 의견은 선택 그대로
- **결재선 순서 변경은 드래그가 아니라 ↑↓ 버튼**으로 간다 — 블록이 3열 그리드의 1칸이라 좁고, 블록 자체의 HTML5 드래그와 겹친다. 넓은 화면에서 결재선을 편집하게 되면 그때 드래그를 얹는다
- **AP-026(마지막 결재자 = MASTER) 사전 검증은 하지 않는다** — 결재선 응답에도 사원 검색 응답에도 `role` 이 없고 추가 예정도 없다(2026-08-07 백엔드 협의). `approverPosition`("팀장"·"대표")은 회사가 바꾸는 직급명이라 판정 근거가 못 된다. **지킬 수 없는 안내 문구는 화면에서 걷어내고** 위반은 상신 시 서버 400 문구로만 알린다
- `formatDateTime()` 을 `format.ts` 로 분리 — 상세는 `-`, 블록은 빈 값(줄 접기)이라 `fallback` 인자를 받는다
- 결재 진행 현황 마커에 `role="img"` + `aria-label` 을 붙였다 — ✓ · ✕ 와 색만으로는 보조기술이 상태를 읽을 수 없다

---

## [2026-08-07] 결재 관리 목록 화면 🚧

브랜치: `feat/approval-page` · 이슈: #60

### 변경 파일

| 파일                                            | 변경                                                 |
| ----------------------------------------------- | ---------------------------------------------------- |
| `src/app/approvals/page.tsx`                    | 생성 — 라우트 + Suspense 경계                        |
| `src/features/approval/ApprovalList.tsx`        | 생성 — 목록 본체(탭 · 필터 · 행 · 페이징)            |
| `src/features/approval/ApprovalStatusBadge.tsx` | 생성 — 결재 상태 배지 4종                            |
| `src/features/approval/lineStatus.ts`           | 생성 — 결재선 상태 라벨 · 색 공용                    |
| `src/features/approval/routes.ts`               | 생성 — 결재 화면 경로 단일 소스                      |
| `src/components/approval/ApprovalSkeletons.tsx` | 생성 — 목록 로딩 스켈레톤                            |
| `src/features/approval/{types,api}.ts`          | 수정 — 목록 · 상세 · 승인 · 반려 타입과 함수         |
| `src/features/approval/errorCodes.ts`           | 수정 — 결재선 처리 코드 2종                          |
| `src/constants/endpoints.ts`                    | 수정 — `approvals.root` · `detail` · `approvalLines` |
| `.ai/API.md`                                    | 수정 — 55~58 절 추가, 명세·실물 차이표 정리          |

### 주요 작업 내용

- `GET /approvals` 연동 — 탭이 곧 `scope`(`pending` · `drafted` · `all`)이고 대상은 서버가 정한다
- 상태 · 기간 · 키워드 필터와 페이징을 **URL 쿼리**로 관리 (사원 목록과 동일)
- 목록 행 — 상태 배지 · `프로젝트 > Step` 경로 · 회차 · 진행 카운트 · 결재선 아바타 · 자기 차례 강조
- 로딩 스켈레톤 · 빈 상태 · 실패 재시도 처리

### 트러블슈팅

- **응답 스키마가 명세와 달랐다** — Swagger 의 `content[]` 가 파일 버전 스키마로 표기돼 있었다. 실제 실행 결과로 타입을 만들었고, 명세·실물 차이를 `.ai/API.md` 결재 절에 표로 남겼다
- **`scope=drafted` 가 계속 빈 배열이었다** — Swagger 세션 계정과 앱 로그인 계정이 달랐다. 그 결재의 기안자는 `ADMIN001` 이었다

### 부수 결정

- **`전체` 탭은 MASTER · ADMIN 에게 렌더 자체를 하지 않는다** — 403 `APPROVAL_SCOPE_ALL_FORBIDDEN` 을 받고 숨기면 늦다
- 기간 필터는 URL 에 `period=30`(최근 N일)으로 두고 요청 직전 `fromDate` 로 바꾼다 — 날짜를 URL 에 박으면 내일 열었을 때 어제 기준이 된다
- 탭 옆 건수는 **현재 탭만** 표시한다 — 다른 탭 건수를 채우려면 요청이 3배가 된다
- 결재선 상태 라벨 · 색을 `lineStatus.ts` 로 뺐다 — 목록 아바타 · 블록 스텝퍼 · 상세 타임라인이 같은 색을 써야 한다

---

## [2026-08-06] 결재 블록 초안 작성 · 상신 🚧

브랜치: `feat/approval-block` · 이슈: #51

### 변경 파일

| 파일                                          | 변경                                                           |
| --------------------------------------------- | -------------------------------------------------------------- |
| `src/features/approval/types.ts`              | 생성 — 회차 · 결재선 · 문서 타입 + `readApprovalBlockDetail()` |
| `src/features/approval/errorCodes.ts`         | 생성 — 결재 응답 코드 단일 소스                                |
| `src/features/approval/api.ts`                | 생성 — 회차 · 문서 · 결재선 · 상신 7개 래핑                    |
| `src/features/approval/ApprovalBlock.tsx`     | 생성 — 상태별 화면 분기(초안 · 진행 · 반려)                    |
| `src/features/approval/ApprovalDraftForm.tsx` | 생성 — 제목 · 내용 · 문서 · 결재선 편집                        |
| `src/features/approval/ApprovalProgress.tsx`  | 생성 — 결재 진행 현황 스텝퍼                                   |
| `src/features/approval/ErrorText.tsx`         | 생성 — 결재 화면 공용 실패 안내                                |
| `src/features/approval/submitCheck.ts`        | 생성 — 상신 전 검증 · 검증 코드 → 문구 변환                    |
| `src/features/block/BlockBoard.tsx`           | 수정 — `APPROVAL` 분기 연결 (stub 교체)                        |
| `src/constants/endpoints.ts`                  | 수정 — `approvals` 경로 6종                                    |
| `src/constants/status.ts`                     | 수정 — `APPROVAL_STATUS_LABELS`                                |
| `src/lib/api.ts`                              | 수정 — `api.put` 추가                                          |
| `.ai/API.md`                                  | 수정 — 결재 API 45~51 절 · 결재 도메인 공통 절 추가            |

### 주요 작업 내용

- 결재 = **결재 > 상신 회차 > 결재선 · 문서** 3계층으로 타입 설계, 회차는 덮어쓰지 않고 이력으로 쌓는다
- 제목 · 내용은 **블러 시 즉시 `PATCH`**, 문서 · 결재선은 조작 즉시 각자 API 호출 — 별도 저장 버튼 없음
- 문서는 공용 파일 API 로 올린 뒤 `fileVersionId` 만 연결 (AP-009·010)
- 반려 시 `수정` → 재상신 회차 생성(멱등) → 새 DRAFT 에서 재편집
- 상신 전 검증(AP-022~024) — 사유가 있으면 상신 버튼을 잠그고 버튼 아래에 이유를 적는다
- 상신 400 은 사전 차단과 **같은 문구**로 통일 (`SUBMIT_BLOCKER_LABELS`), 나머지는 백엔드 문구를 그대로 노출
- 작성 중 이탈 확인 — 저장 안 된 입력이 있을 때만 `beforeunload` 를 건다

### 트러블슈팅

- **결재 블록이 "정보를 불러올 수 없습니다" 로만 표시됨** — 블록 목록 응답의 `detail` 이 `null` 로 와서 `approvalId` 를 알 수 없었다. 백엔드(Swagger) 쪽 문제였고 수정 후 정상 동작. 프론트는 `readApprovalBlockDetail()` 이 런타임 검증으로 걸러내 잘못된 ID 로 API 를 부르지 않는다

### 부수 결정

- **`blockId` 를 `approvalId` 로 폴백하지 않는다** — 다른 값이라 추측해서 부르면 남의 결재를 열거나 404 가 된다. 값이 없으면 안내만 띄운다
- `lines[].status` 가 없으면 **진행 카운트를 아예 숨긴다** — 늘 `0 / 3` 으로 보이면 실제와 어긋난 화면이 된다
- 재상신 회차 생성은 서버가 **멱등**이라 프론트에서 중복 생성을 막지 않는다
- `APPROVAL_LINE_NOT_VIEWABLE`(403)은 `PERMISSION_CODES` 에 넣지 않는다 — 차례가 오면 볼 수 있어 `/forbidden` 이 아니라 화면 안에서 안내한다
- 회차 배지는 `detail.revisionNo` 가 아니라 **방금 받은 회차**로 판단한다 — `detail` 쪽은 선택 필드라 없으면 2회차도 배지가 안 뜬다
- 상신 전 검증이 **서버와 같은 코드**(`APPROVAL_CODES`)를 돌려준다 — 사전 차단이든 400 응답이든 화면 문구가 하나로 유지된다
- `saved` 를 ref 가 아니라 state 로 뒀다 — 이탈 확인이 렌더 중에 읽어야 하는데 `react-hooks/refs` 가 ref 접근을 막는다
- 제목 · 내용도 저장 성공 시 `onChanged` 로 상위에 올린다 — 안 그러면 상신 버튼이 옛 값으로 계속 잠긴다

---

## [2026-08-06] 결재선 사원 검색 컴포넌트 🚧

브랜치: `feat/approval-block` · 이슈: #41

### 변경 파일

| 파일                                            | 변경                                                       |
| ----------------------------------------------- | ---------------------------------------------------------- |
| `src/features/employee/EmployeeSearchInput.tsx` | 생성 — 자동완성 입력 + 결과 리스트 (combobox)              |
| `src/features/employee/api.ts`                  | 수정 — `searchEmployees()` 추가                            |
| `src/features/employee/types.ts`                | 수정 — `EmployeeSearchResult` 추가                         |
| `src/features/approval/ApprovalDraftForm.tsx`   | 수정 — 결재선 지정의 사번 직접 입력을 검색 컴포넌트로 교체 |

### 주요 작업 내용

- `GET /employees/search` 연동 (응답이 `content` 래퍼 없는 배열)
- 250ms 디바운스 + `AbortController` 로 이전 요청 취소
- 빈 입력이면 호출하지 않음 (400 `EMP_INVALID_PARAMETER` 사전 차단)
- 키보드 조작(↑↓ · Enter · Esc), 검색 중 · 결과 없음 · 오류 3가지 빈 상태
- 이미 결재선에 있는 사원은 `excludedIds` 로 후보에서 제외

### 부수 결정

- **`src/components` 가 아니라 `features/employee` 에 뒀다** — 사원 도메인 API 를 직접 부르는 컴포넌트라 도메인 밖으로 빼면 의존이 거꾸로 흐른다
- `추가` 버튼을 없애고 **선택 즉시 결재선에 반영**한다 — `PUT` 이 어차피 전체 치환이라 중간 단계가 의미 없다
- 중복 선택 검사를 결재선 쪽에서 빼고 컴포넌트의 `excludedIds` 로 옮겼다 — 고를 수 없게 막는 편이 고른 뒤 에러를 띄우는 것보다 낫다
- 이미 추가된 사람을 **목록에서 숨기지 않고 `이미 추가됨` 으로 비활성** 표시한다 — 사라지면 "검색이 안 되는 것" 처럼 보인다
- 결과 개수(`n명`)와 `성만 입력해도 돼요` 안내를 넣었다 — 참여자 목록 API 가 없어 목록을 못 펼치는 대신, 한 글자 부분 일치로 훑을 수 있다는 걸 알린다
- 인사관리 목록과 **필드 이름이 달라** 타입을 합치지 않고 `EmployeeSearchResult` 를 따로 뒀다 (`department`·`position` vs `departmentPath`·`jobPositionName`)
- `isLoading` 을 effect 안이 아니라 `onChange` 에서 켠다 — effect 본문의 동기 `setState` 가 `react-hooks/set-state-in-effect` 에 걸린다

---

## [2026-08-06] 프로젝트 참여자 · 블록 수정/삭제 API 연동 ✅

브랜치: `user/project` · 이슈: #55

### 변경 파일

| 파일                                                                  | 변경                                                         |
| --------------------------------------------------------------------- | ------------------------------------------------------------ |
| `src/constants/endpoints.ts`                                          | 수정 — 참여자 · 블록 상세 경로 추가                          |
| `src/features/project/{api,types}.ts`                                 | 수정 — 프로젝트 참여자 조회 함수와 타입 추가                 |
| `src/components/ProjectSidebar.tsx`                                   | 수정 — 목 참여자를 실제 API 응답으로 교체                    |
| `src/components/project/{ProjectSkeleton,ProjectSidebarSkeleton}.tsx` | 생성 — 프로젝트 Skeleton primitive · 사이드바 조합 UI        |
| `src/features/block/{api,types}.ts`                                   | 수정 — 블록 부분 수정 · 삭제 요청/응답 추가                  |
| `src/features/block/BlockEditModal.tsx`                               | 생성 — 제목 · 담당자 수정/해제 및 기존 블록 모달 스타일 적용 |
| `src/features/block/BlockDeleteModal.tsx`                             | 생성 — 삭제 확인 · 잠금 오류 안내 모달                       |
| `src/features/block/BlockCard.tsx`                                    | 수정 — 수정 모달 · 삭제 확인/재조회 연결                     |
| `src/features/block/AddBlockModal.tsx`                                | 수정 — 생성자를 기본 담당자로 전송                           |
| `src/features/block/StepBlocks.tsx`                                   | 수정 — 블록 변경 후 목록 재조회                              |
| `src/features/block/BlockSkeletons.tsx`                               | 생성 — 블록 보드 · 문서 목록 Skeleton UI                     |
| `.ai/API.md`                                                          | 수정 — 45~47번 확정 명세 추가                                |

### 주요 작업 내용

- 프로젝트 참여자 목록을 사이드바와 블록 담당자 선택에 공용 연동
- PrimeNG Skeleton의 형태·접근성 규칙을 React/Tailwind 프로젝트 전용 컴포넌트로 적용
- 사이드바 개요·단계·참여자와 블록 보드·문서 목록 로딩 UI를 실제 콘텐츠 구조에 맞게 분리
- 프로젝트 사이드바의 고정 메뉴·정보 영역·스테이지 행 높이와 묶음별 상하 간격을 정돈
- 블록 제목·담당자 부분 수정과 `null` 담당자 해제 규칙 반영
- 블록 수정 모달의 헤더·입력 영역·푸터·저장 상태를 기존 블록 UI와 통일
- 블록 soft delete와 삭제 잠금 오류 메시지 노출, 성공 후 목록 동기화
- 참여자 요청을 핵심 프로젝트 로딩과 분리하고 로딩·실패·빈 목록·재시도 상태 처리
- 브라우저 기본 확인창 대신 접근 가능한 프로젝트 공통 삭제 모달 적용
- 블록 생성 요청의 `owner`에 현재 로그인 사용자 사번을 기본 지정

### 트러블슈팅

- **문제**: 샌드박스 빌드에서 Google Fonts 다운로드 실패
- **원인**: `next/font`의 Geist 다운로드에 외부 네트워크가 필요함
- **해결**: 승인된 네트워크 환경에서 재실행하여 빌드 성공 확인

### 부수 결정

- 수정 요청은 실제 변경된 필드만 보내고, 빈 제목·담당자 없음은 명세에 따라 `null`로 보낸다.
- 블록 변경 후 서버 응답을 기준으로 보드를 맞추기 위해 목록을 재조회한다.

### 검증

| 명령            | 결과    |
| --------------- | ------- |
| `npm run lint`  | ✅ 성공 |
| `npm run build` | ✅ 성공 |

---

## [2026-08-06] 블록 이동 · 생성 위치 (초안 방식 반영 + 배치 변경 API) 🚧

브랜치: `user/project` · 이슈: #53

### 변경 파일

| 파일                                      | 변경                                                          |
| ----------------------------------------- | ------------------------------------------------------------- |
| `src/features/block/blockLayout.ts`       | 생성 — 평면 순서 · 3칸 패킹 · 이동 · 배치 변환 · 새 자리 계산 |
| `src/features/block/BlockDragContext.tsx` | 생성 — 보드 → 카드 드래그 배선 컨텍스트 · 커서 알약 이미지    |
| `src/features/block/useSlideOnReorder.ts` | 생성 — FLIP 이동 애니메이션 (의존성 없이 Web Animations API)  |
| `src/features/block/useLayoutSaver.ts`    | 생성 — 조용해지면 저장 · 동일 배치 스킵 · 이탈 시 flush       |
| `src/features/block/useDragAutoScroll.ts` | 생성 — 드래그 중 가장자리 자동 스크롤                         |
| `src/features/block/errorCodes.ts`        | 생성 — `BLOCK_*` · `STEP_EDIT_DENIED` 코드 · 배치 실패 문구   |
| `src/features/block/BlockBoard.tsx`       | 평면 순서 + 재패킹 · 드래그 미리보기 · 배치 저장(낙관 + 롤백) |
| `src/features/block/BlockCard.tsx`        | 드래그 핸들 활성 · 드롭 타깃 · 끄는 중 반투명                 |
| `src/features/block/api.ts`               | `updateBlockLayout()` 추가                                    |
| `src/features/block/types.ts`             | `BlockLayout` · 배치 변경 요청/응답 타입                      |
| `src/features/block/AddBlockModal.tsx`    | `rowIndex` · `sortOrder` 계산해 전송                          |
| `src/features/block/AddBlockButton.tsx`   | `blocks` 전달 통로                                            |
| `src/features/block/StepBlocks.tsx`       | 현재 목록 전달 · 저장된 배치 반영                             |
| `src/constants/endpoints.ts`              | `steps.blocksLayout` 등록                                     |
| `.ai/API.md`                              | 44번 신설 · 9 · 10번 배치 규칙 갱신                           |

### 주요 작업 내용

- **평면 순서 모델** — 초안(`비타s초안/src/app/App.tsx` `BlocksTab`)과 같이 순서를 배열 하나로 들고 `computeRows()` 가 앞에서부터 3칸씩 채워 행을 만든다. 서버 `rowIndex` 는 정렬 키로만 쓴다
- **드래그 이동** — 핸들에서 시작 → 지나는 블록 앞으로 끼운 **미리보기**를 즉시 그리고, 놓으면 그 순서를 그대로 확정한다
- **배치 저장** — 화면은 놓는 즉시 확정하고, `PATCH /steps/{stepId}/blocks/layout` 은 **마지막 이동 후 0.8초 조용할 때** 한 번만 보낸다. 결과가 마지막 저장분과 같으면 요청을 건너뛰고, 실패하면 마지막 저장 배치로 되돌린 뒤 이유를 띄운다
- **생성 위치** — `nextPosition()` 이 마지막 행에 칸이 남으면 그 오른쪽, 모자라면 새 행으로 계산해 `rowIndex` · `sortOrder` 를 함께 보낸다

### 트러블슈팅

- **문제**: 블록을 옮기는 내내 블록이 깜빡인다
- **원인**: 행마다 래퍼 `<div>` 를 두고 `key` 를 그 행 첫 블록 ID 로 줬다. 순서가 바뀌면 행 `key` 가 달라져 **행 전체가 언마운트 → 재마운트**된다
- **해결**: 행 래퍼를 없애고 3열 grid 하나에 블록을 직접 넣는다. grid 자동 배치가 `computeRows()` 와 같은 규칙(안 들어가면 다음 줄, 되돌아가 채우지 않음)이고 같은 행 높이 공유도 grid 가 한다. `computeRows()` 는 저장 좌표 계산용으로만 남았다

- **문제**: 순서가 바뀔 때 블록이 순간이동해서 어디로 갔는지 눈으로 못 따라간다
- **원인**: 재배치가 한 프레임에 끝난다
- **해결**: `useSlideOnReorder()` (FLIP) — 그리기 전 위치를 기억해 뒀다가 그린 직후 차이만큼 되돌리고 0 까지 애니메이션한다. 끌고 있는 블록과 `prefers-reduced-motion` 은 건너뛴다

- **문제**: 마지막 행 · 마지막 열 블록이 "안 잡히는" 것처럼 아무 반응이 없다
- **원인**: 좌우 절반으로 앞/뒤를 정하니 **사각지대**가 생긴다. 바로 뒤 블록을 왼쪽 이웃의 **오른쪽 절반**에 놓으면 "이웃 뒤" = 원래 자리라 결과가 같고, `hasSameOrder` 가 걸러 요청도 미리보기도 없다. 마지막 블록은 오른쪽에 칸이 없어 자연스러운 제스처가 전부 이 사각지대에 걸린다
- **해결**: 좌우 절반을 버리고 **끌어온 방향**으로 정한다 — 뒤에서 왔으면 대상 앞, 앞에서 왔으면 대상 뒤(= 자리 맞바꿈). 다른 블록 위에 올리면 항상 실제로 움직인다. 자리가 정해진 빈 칸 안내만 `moveAfter()` 로 못박는다

- **문제**: 2칸 블록 위로 끌면 미리보기가 반응하지 않는다 (1칸 블록끼리는 정상)
- **원인**: 드롭 판정을 `BlockCard` 의 `<article>` 에 단 `onDragOver`(버블 단계)로 했다. 카드 안에는 파일 목록 · 에디터처럼 **자체 드래그 처리를 갖는 자식**이 있어, 그 위에서는 이벤트가 카드까지 올라오지 않는다. 구현된 2칸 블록이 문서(FILE) 블록이라 2칸에서만 증상이 보였다. (순서 계산 자체는 정상 — `moveTo` 로 `1(1) 2(2)` → `2(2) 1(1)` 확인)
- **해결**: 판정을 보드 하나로 모으고 **캡처 단계**(`onDragOverCapture` · `onDropCapture`)에서 받는다. 칸에 `data-drop-block` / `data-drop-after` 를 남겨 `closest()` 로 거슬러 찾으므로 카드 내부 구조와 무관해졌다

- **문제**: 핸들을 잡아도 드래그가 시작되지 않는 경우가 있다
- **원인**: ① Firefox 는 `dataTransfer` 에 데이터가 실리지 않은 드래그를 취소한다 ② 핸들이 점 6개(약 12×10px)뿐이라 조준이 어렵다
- **해결**: `setData('text/plain', …)` 를 싣고, 핸들에 `-m-1 p-1` 로 클릭 영역을 넓히고 hover 배경을 줘 잡을 곳을 드러냈다

- **문제**: 미리보기가 심하게 떨리고, **맨 뒤 블록은 아예 옮겨지지 않는다**
- **원인**: 한 번 옮겨지면 끌던 블록이 커서 아래로 들어와 **자기 자신 위에서** `dragover` 가 뜬다. 이걸 받으면 `moveTo(self, self)` 가 원본을 그대로 돌려줘 원위치로 되돌아가고, 다시 이동 → 되돌림이 반복된다. 놓는 순간의 값이 원위치라 맨 뒤 블록은 결과가 항상 제자리였다
- **해결**: `hover()` 에서 `blockId === draggingId` 를 버린다. 옮겨진 뒤에는 커서가 자기 위에 있어 더 이상 상태가 바뀌지 않아 미리보기가 멈춘다

- **문제**: 블록이 없는 칸(행 끝의 빈 칸 · 맨 뒤)에는 놓을 수가 없다
- **원인**: 드롭 타깃이 블록 카드뿐이라 빈 칸에는 이벤트가 없다
- **해결**: 드래그 중에만 나타나는 `DropSlot` 을 행의 남은 칸 수만큼 깔고, 마지막 행이 꽉 찼을 때만 3칸짜리 꼬리 슬롯을 추가한다 (항상 깔면 레이아웃이 크게 출렁인다)

- **문제**: 빠르게 드래그하면 배치가 통째로 무너진다
- **원인**: `dragover` 마다 즉시 교환한다. 여러 블록을 훑고 지나가면 그 수만큼 교환이 **연쇄**되고, 앞선 이동이 미끄러지는 중에도 다음 판정이 들어간다
- **해결**: 두 단계 — ① **머무름**(`HOVER_DWELL_MS` 110ms) 동안 같은 대상 위에 있어야 옮긴다. 지나쳐 간 대상의 타이머는 버린다 ② **정착 대기**(`SETTLE_MS` = 이동 애니메이션 180ms) 동안 새 판정을 받지 않는다. 기다리는 사이에 놓으면 적용하지 않는다(보이는 대로만 확정). 기다리는 동안 대상에 링을 그려 반응이 없어 보이지 않게 했다

- **문제**: 딜레이를 넣어도 빠르게 드래그하면 블록이 엉뚱한 곳에서 날아오며 배치가 무너진다
- **원인**: FLIP 이 위치를 잴 때 **진행 중인 이동의 `transform` 이 섞여 들어갔다.** `getBoundingClientRect()` 는 변형이 반영된 값을 주는데 그걸 다음 계산의 기준으로 저장하니, 이동이 겹칠수록 오차가 누적된다. 게다가 측정 의존성을 순서(`keys`)로 묶어 둬서, 순서는 그대로인데 빈 칸 안내가 생겼다 사라지며 위치가 바뀐 경우를 놓쳤다
- **해결**: 재기 전에 `node.getAnimations()` 를 **취소해 변형을 걷어내고** 읽는다. 가던 중이던 블록은 취소 전 '보이던' 위치를 잡아 두었다가 거기서 이어 가게 해 끊김도 없앴다. 측정은 의존성 없이 매 렌더 수행한다 — 위치가 그대로면 애니메이션 없이 넘어가 비용은 측정뿐이다

- **문제**: 미리보기가 움직일 때 사이드바까지 함께 밀린다
- **원인**: `findScrollParent()` 가 "지금 넘치는 영역" 만 인정해서, 내용이 짧으면 탐색이 위로 새어 나가 **창 스크롤**까지 올라갔다. 사이드바는 본문 스크롤 영역 밖(`projects/[id]/layout.tsx`)이라 창이 굴러가면 같이 밀린다
- **해결(1차, 과했음)**: 넘치는지 보지 않고 첫 스크롤 영역에서 멈추게 했다 → **자동 스크롤이 아예 안 따라오는 회귀**를 만들었다
- **해결(최종)**: 이 앱은 본문 래퍼에 `overflow-y-auto` 가 달려 있어도 **실제로는 문서가 굴러간다** (`min-h-screen` 아래의 `h-full` 이 auto 로 풀려 래퍼가 넘치지 않는다). 그래서 `scrollHeight > clientHeight` 로 **정말 굴릴 수 있는** 조상만 고르고, 없으면 문서를 굴린다. 좌우 제한은 별도 스크롤 영역이 있을 때만 건다 (문서가 굴러갈 땐 화면 전체가 대상이라 의미가 없다). 드래그 중 높이가 바뀌면 대상을 다시 찾는다
- **이어서**: 문서가 굴러가는 구조 자체를 바꿨다 — 아래 "셸 높이 고정" 항목 참고

- **문제**: 옮길 때마다 보드 높이가 출렁여 자리를 눈으로 좇기 어렵다
- **원인**: "맨 뒤" 빈 행을 마지막 행이 꽉 찼을 때만 깔아, 블록을 옮길 때마다 행 수가 오르내렸다
- **해결**: 드래그 중에는 꼬리 자리를 **항상** 둔다(`맨 뒤로 보내기`). 대신 마지막 행의 빈 칸 안내는 빼서 같은 뜻의 자리가 둘로 보이지 않게 했다

- **문제**: 드래그 중에는 휠이 먹지 않아 보이는 범위 밖으로 블록을 옮길 수 없다
- **원인**: HTML5 드래그가 진행 중이면 스크롤 입력이 막힌다
- **해결**: `useDragAutoScroll()` — `dragover` 의 커서 Y 를 보고 스크롤 영역 위·아래 96px 안에서 rAF 로 직접 굴린다. 가장자리에 가까울수록 빨라진다

- **문제**: 저장 응답이 늦게 도착하면 앞선 드래그의 결과가 최신 배치를 덮는다
- **원인**: 드래그를 연달아 하면 요청이 겹치고 응답 순서는 보장되지 않는다
- **해결(1차)**: 카운터로 최신 요청만 화면에 반영 → **화면만** 지켜진다. 서버가 요청 2를 먼저, 요청 1을 나중에 처리하면 **서버 최종 상태는 옛 배치**가 된다
- **해결(최종)**: 요청을 **직렬화**한다. 나가 있는 요청이 끝나야 다음이 나가고, 기다리는 사이에 또 옮기면 마지막 배치 하나만 이어서 보낸다. 동시에 두 개가 뜨지 않으므로 서버가 순서를 보장하지 않아도 최종 상태가 어긋나지 않는다

- **문제**: 저장 응답이 부모를 갱신하면, **응답을 기다리는 동안 한 이동이 되돌아가고 전송도 취소된다**
- **원인**: `onSaved` → 부모 `setLoaded` → `blocks` prop 참조 변경 → 보드의 "재조회 동기화" 가 실행돼 `setOrder(toFlatOrder(blocks))` + `saver.reset()`. `toFlatOrder()` 는 아직 저장 전인 옛 좌표로 다시 정렬하므로 방금 옮긴 결과가 뒤집히고, `reset()` 이 대기 중이던 배치까지 버린다
- **해결**: 우리가 올려보낸 순서가 그대로 돌아온 것인지(블록 ID 나열 비교) 판별해 **재조회일 때만** 동기화한다. `reset()` 은 타이머를 건드리는 부수 효과라 렌더 중에 부르지 않고 effect 로 옮겼다

- **문제**: 블록 생성과 지연된 배치 저장이 엇갈리면 새 블록이 사라지거나 배치에서 누락된다
- **원인**: ① 생성 후 재조회가 끝난 뒤 옛 저장 응답이 도착하면 새 블록이 없는 목록으로 덮인다 ② 0.8초 미뤄둔 전체 배치 PATCH 가 생성 **뒤에** 나가면 새 블록이 빠진 목록을 스텝 전체 배치로 보낸다
- **해결**: ① 목록 **세대**(`generation`)를 두고, 보내는 사이에 `reset()` 이 있었으면 응답을 적용하지 않는다 ② 생성 요청 직전에 대기 중인 배치를 먼저 흘려보낸다 (`onBeforeCreate` → `flushNow()`)

- **문제**: 새 블록 좌표가 화면 배치와 어긋날 수 있다
- **원인**: `nextPosition()` 이 **마지막 블록의 기존 좌표**를 +1 했는데, 보드는 `computeRows()` 로 행을 다시 만든다. 옛 좌표에 빈 행이 있으면(예: `rowIndex` 가 0, 5) 화면은 2행인데 `rowIndex: 6` 을 보내게 된다
- **해결**: 재패킹한 행 기준으로 매긴다 — 마지막 행에 들어가면 `rows.length - 1` · `lastRow.length`, 새 행이면 `rows.length` · `0`. `toLayouts()` 가 저장할 때 쓰는 규칙과 같아졌다

- **문제**: 개발 모드에서 저장 성공 · 실패 콜백이 호출되지 않는다
- **원인**: StrictMode 는 같은 ref 를 둔 채 effect 의 setup · cleanup 을 다시 도는데, cleanup 이 `isMounted` 를 `false` 로 만든 뒤 되살리지 않았다
- **해결**: effect setup 에서 `isMounted.current = true` 로 복원

- **문제**: 드래그를 시작해도 자동 스크롤이 조용히 멈춰 있다
- **원인**: 재탐색 조건이 `container && …` 이라 처음에 `null` 이면 드래그 내내 다시 찾지 않는다. 그런데 드래그를 시작해야 빈 칸 · 꼬리 자리가 붙어 보드가 넘치기 시작하므로, "시작 전엔 안 넘쳐서 `null`, 시작 후 넘침" 경로가 실제로 존재한다. 이때 문서를 굴리려 하는데 셸이 화면 높이에 고정돼 있어 문서는 움직이지 않는다
- **해결**: 조건에 `!container` 를 포함해 못 찾았을 때도 매번 다시 본다

- **문제**: 배치 저장 실패 시 백엔드 내부 문구가 그대로 노출된다
- **원인**: `layoutErrorMessage()` 가 `BLOCK_LAYOUT_INVALID` · `BLOCK_COL_SPAN_INVALID` 에서 `null` 을 돌려줘 `messageOf()` 의 백엔드 `message`("다른 스텝의 블록이 섞임" 등)로 떨어졌다
- **해결**: 두 코드는 사용자가 고칠 수 있는 게 아니라 우리 요청이 잘못된 경우다 — 새로고침 안내로 통일

- **문제**: 드래그로 배치를 바꾼 뒤 블록을 추가하면 새 블록이 엉뚱한 자리에 붙는다
- **원인**: 자리 계산(`nextPosition()`)이 `StepBlocks` 의 목록을 보는데, 그 목록은 저장 전 좌표 그대로다
- **해결**: 응답 배치를 `applyLayouts()` 로 덮어쓰고 `onLayoutSaved` 로 목록 주인에게 돌려준다

### 부수 결정

- **셸 높이 고정 — 헤더 · 사이드바는 스크롤에서 제외** (`AppShell.tsx` · `Sidebar.tsx` · `projects/[id]/layout.tsx`)
  기존에는 `min-h-screen` 이라 내용이 길어지면 **문서가 통째로** 굴러가 헤더 · 사이드바까지 화면 밖으로 밀렸다.
  셸을 `h-screen overflow-hidden` 으로 바꾸고, 스크롤은 본문 영역에서만 일어나게 했다.
  - 일반 화면 — `main` 이 `min-h-0 flex-1 overflow-y-auto`
  - 프로젝트 상세 — `main` 은 스크롤하지 않고 `ProjectLayout` 의 오른쪽 영역이 맡는다 (사이드바 고정)
  - 스텝 화면 — 탭바를 남기고 그 아래만 굴러간다 (원래 구조 그대로 동작하게 됨)
  - 사이드바 자신은 `overflow-y-auto` — 메뉴가 길면 사이드바 안에서 굴러간다
  - ⚠️ 중간 flex 래퍼에 `min-h-0` 이 없으면 자식이 내용만큼 부풀어 `overflow-y-auto` 가 걸린 영역이 넘치지 않는다 — 스크롤바가 안 생기는 원인이 된다
  - 덤으로 블록 드래그 자동 스크롤이 **본문 래퍼**를 정확히 집게 됐다 (문서 스크롤 폴백이 아니라)
- **드래그는 핸들에서만 시작** — 초안은 카드 전체가 `draggable` 이지만, 우리 블록에는 체크리스트 입력 · 문서 버튼이 있어 본문 조작이 막힌다
- **`framer-motion` 도입 안 함** — 초안의 `LayoutGroup`/`layoutId` 이동 애니메이션 대신 CSS 트랜지션만 쓴다. 의존성 하나를 이동 연출에만 쓰기엔 무겁다
- **행 초과 경고 제거** — 재패킹이 3칸을 넘기지 않으므로 경고할 상황 자체가 없어졌다
- **좌표는 화면 기준으로 다시 매긴다** — 서버가 준 `rowIndex` 를 재활용하지 않는다. 재패킹으로 행이 합쳐지거나 갈라지면 원래 값은 이미 화면과 맞지 않는다
- **`STEP_EDIT_DENIED` 는 전역 403 처리에서 뺀다** — 스텝 단위 권한이라 `/forbidden` 으로 보내면 프로젝트 화면 전체가 막힌다. 보드가 직접 안내하고 배치만 되돌린다
- **제자리 드롭은 요청하지 않는다** — 바로 뒤 블록 앞에 놓으면 배열은 새로 만들어져도 순서는 그대로다. `hasSameOrder()` 로 걸러낸다

---

## [2026-08-06] 사원 등록 화면 구현 🚧

브랜치: `feat/employee-create` · 이슈: #38

### 변경 파일

| 파일                                           | 변경                                                                            |
| ---------------------------------------------- | ------------------------------------------------------------------------------- |
| `src/features/employee/EmployeeCreateForm.tsx` | 생성 — 등록 폼 + 결과 화면(`emailSent` 분기)                                    |
| `src/features/employee/FormFields.tsx`         | 생성 — `TextField` · `SelectField` (등록 · 수정 폼 공용)                        |
| `src/features/employee/types.ts`               | 수정 — `CreateEmployeeRequest` · `CreateEmployeeResult` · `PasswordResetTarget` |
| `src/features/employee/errorCodes.ts`          | 수정 — `EMP_ADMIN_ROLE_NOT_ALLOWED` 추가                                        |
| `src/features/employee/api.ts`                 | 수정 — `createEmployee()` 추가                                                  |
| `src/features/employee/PasswordResetModal.tsx` | 수정 — `targets` 타입을 필요한 3필드로 완화                                     |
| `src/features/employee/EmployeeEditForm.tsx`   | 수정 — 입력 컴포넌트를 `FormFields` 에서 가져오게 변경                          |
| `src/app/settings/employees/new/page.tsx`      | `EmployeeCreateForm` 연결 (stub 교체)                                           |

### 주요 작업 내용

- 필수 5개(사번 · 이름 · 부서 · 입사일 · 권한) · 선택 3개(직급 · 이메일 · 연락처) 폼 구성
- 부서는 2단 트리, 직급 · 권한은 셀렉트. 권한은 `MASTER`/`MEMBER` 만 노출
- `POST /employees` 연동 후 **폼 대신 결과 화면**을 띄워 `emailRegistered` · `emailSent` 를 분기 안내
- 메일 발송 실패 시 결과 화면에서 바로 **재발송**(`PasswordResetModal` 재사용)

### 부수 결정

- **등록 후 자동 이동하지 않는다** (이슈 "확인 필요" 항목). 다음 할 일이 `계속 등록` · `상세 보기` · `목록으로` 세 갈래로 갈리고, 메일 실패 시에는 그 자리에서 재발송해야 해서 결과 화면에서 고르게 했다
- `PasswordResetModal` 의 `targets` 를 `EmployeeSummary[]` → **`Pick<..., 'userId' | 'name' | 'emailRegistered'>[]`** 로 완화했다 — 등록 응답에는 그 3필드만 있어 그대로 넘길 수 있어야 한다. 기존 호출부는 그대로 통과한다
- 선택 항목은 **값이 있을 때만 키를 싣는다** — 빈 문자열을 보내면 그 값으로 등록된다
- 권한 기본값은 `MEMBER` — 대부분이 일반 사원이고, 올릴 때 의식적으로 바꾸게 된다
- 입사일은 `type="date"` 로 받아 `yyyy-MM-dd` 형식을 브라우저가 보장하게 했다
- 필수값 검증은 **비어 있는 항목을 한 번에 모아** 표시한다 — 하나씩 알려주면 제출 왕복이 길어진다
- 입력 컴포넌트를 `FormFields.tsx` 로 분리했다. `SelectField` 의 빈 선택지 문구(`emptyLabel`)는 등록(`선택해주세요`)과 수정(`미지정`)에서 뜻이 달라 필수 prop 으로 뒀다
- 권한은 `as ManagedRole` 로 캐스팅하지 않고 `ROLE_OPTIONS.find()` 로 좁힌다 — 캐스팅하면 셀렉트 밖의 값(ADMIN 등)이 실려도 타입 검사를 통과한다
- 재발송에 성공하면 결과 화면의 실패 경고를 거둔다 — 그대로 두면 아직 실패 상태로 읽힌다
- 사번 최대 길이(20자)는 **명세에 없어 ERD 근거로 임시 설정**했다. `.ai/API.md` 확인 대기 항목으로 등록

### 검증

| 명령               | 결과               |
| ------------------ | ------------------ |
| `npx tsc --noEmit` | ✅ 에러 0          |
| `npx eslint src`   | ✅ 에러 0 · 경고 0 |
| 브라우저 동작 확인 | 담당자 직접 확인   |

---

## [2026-08-06] 문서 업로드 블록 · PDF 뷰어 구현 🚧

브랜치: `user/project` · 이슈: #48

### 변경 파일

| 파일                                       | 변경                                                 |
| ------------------------------------------ | ---------------------------------------------------- |
| `src/features/file/types.ts`               | 생성 — 문서 · 버전 응답 타입 · 50MB · 255자 상한     |
| `src/features/file/errorCodes.ts`          | 생성 — `FILE_*` 코드 단일 소스                       |
| `src/features/file/api.ts`                 | 생성 — 호출 8종 + presigned `PUT` + 미리보기 blob    |
| `src/features/file/upload.ts`              | 생성 — 업로드 3단계 오케스트레이션 · 끊긴 지점 구분  |
| `src/features/file/format.ts`              | 생성 — `5.8 MB` 표기 · 확장자별 색                   |
| `src/features/file/PdfPages.tsx`           | 생성 — 툴바 없는 PDF 페이지 렌더 (폭 맞춤)           |
| `src/features/file/FileViewerModal.tsx`    | 생성 — 문서 뷰어 · 버전 패널 토글                    |
| `src/features/file/TrashFileModal.tsx`     | 생성 — 휴지통 이동 확인                              |
| `src/features/file/DuplicateNameModal.tsx` | 생성 — 동명 문서 확인                                |
| `src/features/block/FileBlock.tsx`         | 생성 — 문서 목록 카드 · 업로드 · 인라인 이름 수정    |
| `src/features/block/BlockBoard.tsx`        | `FILE` 분기 추가                                     |
| `src/features/block/types.ts`              | `defaultColSpan` 신설 — 유형별 가로 칸 수 (9종 전부) |
| `src/features/block/AddBlockModal.tsx`     | 생성 시 `colSpan` 전송                               |
| `src/constants/endpoints.ts`               | `blocks.files` · `files.*` · `fileVersions.*` 등록   |
| `src/lib/api.ts`                           | `requestRaw` 추가 · 실패 처리(`throwFailure`) 공통화 |
| `package.json`                             | `react-pdf` 추가                                     |
| `.ai/API.md` · `.ai/LIBRARIES.md`          | 36~43번 명세 · 파일 도메인 공통 절 · 의존성 표       |

### 주요 작업 내용

- **문서 업로드 블록** — 목록 조회 · 업로드 · 새 버전 · 문서명 인라인 수정 · 휴지통 이동 · 버전 이력. 편집 버튼 노출은 응답의 `canEdit`(스텝 권한 상속)을 따른다
- **업로드 3단계** — `POST /files/uploads`(presigned 발급) → 저장소 직접 `PUT` → `POST .../complete`(서버가 저장소 확인). 끊긴 지점을 `stage` 로 구분해 안내
- **PDF 뷰어 모달** — `react-pdf` 로 페이지만 그린다. 툴바 없음 · 컨테이너 폭에 맞춤 · 자체 스크롤 없이 모달이 스크롤. 버전 패널을 펼쳐 과거 버전 미리보기로 전환
- **유형별 가로 칸 수 정의** — 1칸(텍스트 · 이미지 · 체크리스트 · 결재) / 2칸(문서 업로드 · 입금 확인 · 세금계산서 · 입찰 · AI)

### 트러블슈팅

- **문제**: 미리보기 응답이 JSON 이 아니라 PDF 바이너리라 `lib/api.ts` 래퍼를 쓸 수 없다
- **원인**: 래퍼가 `response.json()` 으로 봉투를 벗기는 것을 전제한다
- **해결**: 실패 처리를 `throwFailure()` 로 뽑아 JSON · 바이너리가 공유하게 하고 `requestRaw()` 를 추가. 403 → `FORBIDDEN_EVENT` 발행도 그대로 탄다

- **문제**: presigned `PUT` 에 세션 쿠키가 실리면 안 된다
- **원인**: 우리 백엔드가 아니라 S3 로 나가는 요청이고 응답도 우리 봉투가 아니다
- **해결**: `putToStorage()` 에서 래퍼를 우회해 `fetch` 를 직접 쓰고, 이유를 주석으로 박음

- **문제**: `<iframe>` 으로는 브라우저 PDF 툴바를 없애거나 스크롤을 모달로 넘길 수 없다
- **원인**: `#toolbar=0` 는 브라우저마다 다르고, iframe 은 자체 스크롤을 갖는다
- **해결**: `react-pdf` 로 페이지를 직접 렌더. `ResizeObserver` 로 폭을 재고, 자체 스크롤을 만들지 않아 모달 본문이 스크롤된다. `Blob` 을 그대로 받아 object URL 생성 · 해제도 없어졌다

- **문제**: 문서 행의 `⋯` 메뉴가 블록 안에서 잘린다
- **원인**: 문서 목록 컨테이너에 `overflow-y-auto` 가 걸려 있어 자식을 잘라낸다. `z-index` 로는 해결되지 않는다
- **해결**: `createPortal` 로 `document.body` 에 띄우고 트리거 좌표를 재서 `fixed` 로 붙임. 아래 공간이 부족하면 위로 뒤집고, 스크롤 · 리사이즈 시에는 좌표가 어긋나므로 닫는다

- **문제**: `setPreview` 를 effect 본문에서 부르니 `react-hooks/set-state-in-effect` 에 걸린다
- **원인**: 버전을 바꿀 때 로딩 상태로 되돌리려 했다
- **해결**: `{ versionId, preview }` 로 태그해 보관하고, 버전이 다르면 렌더 시점에 로딩으로 판단한다 (이 프로젝트에서 반복해 쓰는 패턴)

### 부수 결정

- **파일 도메인을 `features/file/` 로 분리** — 엔드포인트 12개에 자체 생명주기(업로드 3단계 · 버전 · 휴지통)가 있어 `features/block/api.ts` 에 넣으면 비대해진다. 블록 본문(`FileBlock.tsx`)만 다른 블록들과 함께 둔다
- **`blockId` 로 목록 조회** — 체크리스트(`chkBlockId`) · 텍스트(`txtId`)와 달리 상세 ID 가 필요 없다. `detail` 의 키 이름 확인 대기가 없는 유일한 블록
- **`canEdit` 을 프론트가 판단하지 않는다** — 파일 단위 권한이 없고 스텝 권한을 상속하므로 응답 값을 그대로 따른다
- **409 `FILE_NAME_DUPLICATED` 는 실패가 아니라 확인 요청** — `DuplicateNameError` 로 분리해 확인 모달을 띄우고, 확인 시 `allowDuplicateName: true` 로 한 번만 재시도
- **`window.confirm` 대신 모달** — 프로젝트에 이미 `Modal` 규약이 있어 네이티브 대화상자를 쓰지 않는다
- **`defaultColSpan` 은 선택 필드가 아니라 필수(`1 | 2`)** — 새 유형을 추가하면 폭을 정하지 않으면 컴파일이 실패한다
- **`colSpan` 을 렌더에서 강제하지 않는다** — 생성 시점에만 보낸다. 화면에서 덮어쓰면 나중에 사용자가 크기를 바꿔도 되돌아간다
- **텍스트 레이어 비활성** — 페이지 이미지만 필요해 `renderTextLayer={false}`. 미리보기 본문은 복사할 수 없다
- **워커는 `import.meta.url` 로 번들에 포함** — CDN 을 쓰면 오프라인 · 사내망에서 깨진다
- **문서 행 기본 스타일은 이전과 동일** — 시안의 회색 카드 · 아이콘 버튼은 호버에서만 드러낸다. 버튼은 `opacity-0` 으로 자리를 유지해 나타날 때 레이아웃이 밀리지 않는다
- **셀 전체가 뷰어 진입점** — `absolute inset-0` 버튼 + 내용 `pointer-events-none`. 체크리스트 · 텍스트 블록과 같은 패턴

### 검증

| 명령               | 결과                              |
| ------------------ | --------------------------------- |
| `npm run build`    | ✅ 성공 (PDF 워커 자산 포함 확인) |
| `npx tsc --noEmit` | ✅ 에러 0                         |
| `npx eslint .`     | ✅ 에러 0 · 경고 0                |
| `prettier --check` | ✅ 통과                           |

> ⚠️ 실제 동작 확인은 **백엔드 `PR #190` 머지 후** 가능하다.

### 남은 일 / 확인 필요

- ❗ **파일 API `PR #190` 머지 대기** — 업로드 왕복 · 미리보기 렌더를 실제로 확인해야 한다
- ⏸ **휴지통 화면** — 복구 · 영구 삭제 API(2개)는 목업 대기로 미뤘다. 목록 조회는 `deleted=true` 로 이미 지원
- ⏸ **AI 분석용 버전 목록** — `#138` AI 경계 확정 후
- 업로드 진행률 표시 없음 — `fetch` 로는 못 읽어 `XMLHttpRequest` 가 필요하다
- `checksum` 미전송 — 선택 필드. 무결성 검증이 필요하면 브라우저에서 SHA 계산 추가
- 이미 만들어진 `FILE` 블록은 1칸으로 남는다 — 블록 수정 API 가 나오면 폭 변경 가능

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
