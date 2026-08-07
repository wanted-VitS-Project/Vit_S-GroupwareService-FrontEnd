# 개발 완료 기록

> 📌 이 파일은 **끝낸 작업의 일지**예요.
> 작업(이슈)을 하나 완료할 때마다 AI에게 "완료" 또는 "WORKLOG에 기록해줘" 라고 하면 아래 양식으로 정리해줘요.
> 최신 기록이 위로 오도록 **위에 쌓아** 가세요.

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

## [2026-08-07] 블록 수정 · 삭제 즉시 반영 · 복귀 시 목록 동기화 🚧

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

## [2026-08-07] 결재 관리 목록 화면 🚧

브랜치: `feat/approval-page` · 이슈: #60

### 변경 파일

| 파일                                            | 변경                                          |
| ----------------------------------------------- | --------------------------------------------- |
| `src/app/approvals/page.tsx`                    | 생성 — 라우트 + Suspense 경계                 |
| `src/features/approval/ApprovalList.tsx`        | 생성 — 목록 본체(탭 · 필터 · 행 · 페이징)     |
| `src/features/approval/ApprovalStatusBadge.tsx` | 생성 — 결재 상태 배지 4종                     |
| `src/features/approval/lineStatus.ts`           | 생성 — 결재선 상태 라벨 · 색 공용             |
| `src/features/approval/routes.ts`               | 생성 — 결재 화면 경로 단일 소스               |
| `src/components/approval/ApprovalSkeletons.tsx` | 생성 — 목록 로딩 스켈레톤                     |
| `src/features/approval/{types,api}.ts`          | 수정 — 목록 · 상세 · 승인 · 반려 타입과 함수  |
| `src/features/approval/errorCodes.ts`           | 수정 — 결재선 처리 코드 2종                   |
| `src/constants/endpoints.ts`                    | 수정 — `approvals.root` · `detail` · `approvalLines` |
| `.ai/API.md`                                    | 수정 — 55~58 절 추가, 명세·실물 차이표 정리   |

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
