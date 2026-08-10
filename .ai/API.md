# 연동 API 명세서

**최종 업데이트**: 2026-08-09 (내 프로젝트 목록 — 84 추가)
**최종 업데이트**: 2026-08-09 (비타메이트 AI 블록 연동 — 74~78 추가, 비타메이트 공통 절 신설)
**최종 업데이트**: 2026-08-07 (이미지 항목 전체 조회 — 71 추가, 수정 모달이 이걸로 교체)

> 📌 이 파일은 **프론트가 연동하는 백엔드 API**를 정리하는 곳이에요. (내가 만드는 게 아니라 **호출하는** 입장)
> AI는 API 연동 코드를 작성하기 전에 이 파일을 먼저 읽어요. (잘못된 경로/필드/타입으로 fetch 짜는 실수 방지)
>
> ⚠️ **`최종 업데이트` 줄은 최근 3건까지만 유지**한다. 그 이전 것은 삭제. (무한 누적 방지)

---

## 목차

| #                                         | API              | Method · Path                                  | 연동                                  |
| ----------------------------------------- | ---------------- | ---------------------------------------------- | ------------------------------------- |
| [1](#1-로그인)                            | 로그인           | `POST /auth/login`                             | ✅ `features/auth/api.ts`             |
| [2](#2-로그아웃)                          | 로그아웃         | `POST /auth/logout`                            | ✅ `features/auth/api.ts`             |
| [3](#3-내-정보-조회)                      | 내 정보 조회     | `GET /auth/me`                                 | ✅ `features/auth/api.ts`             |
| [4](#4-약관-동의)                         | 약관 동의        | `POST /auth/terms-agreements`                  | ✅ `features/auth/api.ts`             |
| [5](#5-비밀번호-변경)                     | 비밀번호 변경    | `PATCH /auth/password`                         | ✅ `features/auth/api.ts`             |
| [6](#6-프로젝트-상세-조회)                | 프로젝트 상세    | `GET /projects/{projectId}`                    | ✅ `features/project/api.ts`          |
| [7](#7-프로젝트-스테이지-목록)            | 스테이지 목록    | `GET /projects/{projectId}/stages`             | ✅ `features/project/api.ts`          |
| [8](#8-프로젝트-스텝-목록)                | 스텝 목록        | `GET /projects/{projectId}/steps`              | ✅ `features/project/api.ts`          |
| [9](#9-블록-생성)                         | 블록 생성        | `POST /steps/{stepId}/blocks`                  | ✅ `features/block/api.ts`            |
| [10](#10-스텝-블록-일괄-조회)             | 블록 일괄 조회   | `GET /steps/{stepId}/blocks`                   | ✅ `features/block/api.ts`            |
| [11](#11-텍스트-본문-수정)                | 텍스트 본문 수정 | `PATCH /blocks/texts/{txtId}`                  | ✅ `features/block/api.ts`            |
| [12](#12-체크리스트-항목-생성)            | 체크리스트 생성  | `POST /blocks/checklists/{chkBlockId}/items`   | ✅ `features/block/api.ts`            |
| [13](#13-체크리스트-항목-수정)            | 체크리스트 수정  | `PATCH /blocks/checklists/items/{chkId}`       | ✅ `features/block/api.ts`            |
| [14](#14-체크리스트-항목-삭제)            | 체크리스트 삭제  | `DELETE /blocks/checklists/items/{chkId}`      | ✅ `features/block/api.ts`            |
| [15](#15-사업-카테고리-목록-조회)         | 카테고리 목록    | `GET /business-categories`                     | ✅ `features/businessCategory/api.ts` |
| [16](#16-사업-카테고리-생성)              | 카테고리 생성    | `POST /business-categories`                    | ✅ `features/businessCategory/api.ts` |
| [17](#17-사업-카테고리-수정)              | 카테고리 수정    | `PATCH /business-categories/{categoryId}`      | ✅ `features/businessCategory/api.ts` |
| [18](#18-사업-카테고리-삭제)              | 카테고리 삭제    | `DELETE /business-categories/{categoryId}`     | ✅ `features/businessCategory/api.ts` |
| [19](#19-전역-권한-변경)                  | 권한 변경        | `PATCH /accounts/{userId}/role`                | ✅ `features/employee/api.ts`         |
| [20](#20-계정-상태-변경)                  | 계정 상태 변경   | `PATCH /accounts/{userId}/status`              | ✅ `features/employee/api.ts`         |
| [21](#21-비밀번호-재설정-개인--다중-공용) | 비밀번호 재설정  | `POST /accounts/password-resets`               | ✅ `features/employee/api.ts`         |
| [22](#22-부서-목록-조회)                  | 부서 목록        | `GET /departments`                             | ✅ `features/department/api.ts`       |
| [23](#23-부서-생성-최상위--하위-공용)     | 부서 생성        | `POST /departments`                            | ✅ `features/department/api.ts`       |
| [24](#24-부서명-수정)                     | 부서명 수정      | `PATCH /departments/{departmentId}`            | ✅ `features/department/api.ts`       |
| [25](#25-부서-삭제)                       | 부서 삭제        | `DELETE /departments/{departmentId}`           | ✅ `features/department/api.ts`       |
| [26](#26-직급-목록-조회)                  | 직급 목록        | `GET /job-positions`                           | ✅ `features/jobPosition/api.ts`      |
| [27](#27-직급-생성)                       | 직급 생성        | `POST /job-positions`                          | ✅ `features/jobPosition/api.ts`      |
| [28](#28-직급-수정-직급명--순서)          | 직급 수정        | `PATCH /job-positions/{jobPositionId}`         | ✅ `features/jobPosition/api.ts`      |
| [29](#29-직급-삭제)                       | 직급 삭제        | `DELETE /job-positions/{jobPositionId}`        | ✅ `features/jobPosition/api.ts`      |
| [30](#30-사원-목록-조회-인사관리)         | 사원 목록        | `GET /employees`                               | ✅ `features/employee/api.ts`         |
| [31](#31-사원-상세-조회)                  | 사원 상세        | `GET /employees/{userId}`                      | ✅ `features/employee/api.ts`         |
| [32](#32-사원-등록-계정-동시-발급)        | 사원 등록        | `POST /employees`                              | ✅ `features/employee/api.ts`         |
| [33](#33-사원-정보-수정)                  | 사원 수정        | `PATCH /employees/{userId}`                    | ✅ `features/employee/api.ts`         |
| [34](#34-퇴사-처리)                       | 퇴사 처리        | `PATCH /employees/{userId}/resignation`        | ✅ `features/employee/api.ts`         |
| [35](#35-사원-이름-검색-결재선-지정용)    | 사원 이름 검색   | `GET /employees/search`                        | ✅ `EmployeeSearchInput` (#41)        |
| [36](#36-블록-파일-목록-조회)             | 블록 파일 목록   | `GET /blocks/{blockId}/files`                  | ✅ `features/file/api.ts`             |
| [37](#37-파일-업로드-시작)                | 업로드 시작      | `POST /files/uploads`                          | ✅ `features/file/api.ts`             |
| [38](#38-업로드-완료-통보)                | 업로드 완료 통보 | `POST /files/uploads/{fileVersionId}/complete` | ✅ `features/file/api.ts`             |
| [39](#39-문서명-수정)                     | 문서명 수정      | `PATCH /files/{fileId}`                        | ✅ `features/file/api.ts`             |
| [40](#40-휴지통으로-이동)                 | 휴지통으로 이동  | `DELETE /files/{fileId}`                       | ✅ `features/file/api.ts`             |
| [41](#41-버전-이력-조회)                  | 버전 이력        | `GET /files/{fileId}/versions`                 | ✅ `features/file/api.ts`             |
| [42](#42-다운로드-url-발급)               | 다운로드 URL     | `GET /file-versions/{id}/download`             | ✅ `features/file/api.ts`             |
| [43](#43-미리보기-조회-pdf-바이너리)      | 미리보기 (PDF)   | `GET /file-versions/{id}/preview`              | ✅ `features/file/api.ts`             |
| [44](#44-블록-배치-변경)                  | 블록 배치 변경   | `PATCH /steps/{stepId}/blocks/layout`          | ✅ `features/block/api.ts`            |
| [45](#45-프로젝트-참여자-목록-조회)       | 참여자 목록      | `GET /projects/{projectId}/members`            | ✅ `features/project/api.ts`          |
| [46](#46-블록-수정)                       | 블록 수정        | `PATCH /blocks/{blockId}`                      | ✅ `features/block/api.ts`            |
| [47](#47-블록-삭제)                       | 블록 삭제        | `DELETE /blocks/{blockId}`                     | ✅ `features/block/api.ts`            |
| [48](#48-결재-회차-상세조회)              | 결재 회차 상세   | `GET /approvals/{id}/revisions/{revId}`        | ✅ `features/approval/api.ts`         |
| [49](#49-결재-제목--내용-수정)            | 제목 · 내용 수정 | `PATCH /approvals/{id}/revisions/{revId}`      | ✅ `features/approval/api.ts`         |
| [50](#50-재상신-회차-생성)                | 재상신 회차 생성 | `POST /approvals/{id}/revisions`               | ✅ `features/approval/api.ts`         |
| [51](#51-결재-상신)                       | 결재 상신        | `POST /approvals/{id}/revisions/{revId}/submit`| ✅ `features/approval/api.ts`         |
| [52](#52-결재-문서-추가)                  | 결재 문서 추가   | `POST /approvals/{id}/revisions/{revId}/documents` | ✅ `features/approval/api.ts`     |
| [53](#53-결재-문서-제거)                  | 결재 문서 제거   | `DELETE /approvals/{id}/revisions/{revId}/documents/{docId}` | ✅ `features/approval/api.ts` |
| [54](#54-결재선-등록--수정)               | 결재선 등록·수정 | `PUT /approvals/{id}/revisions/{revId}/lines`  | ✅ `features/approval/api.ts`         |
| [55](#55-스텝별-이슈-목록-조회)           | 이슈 목록        | `GET /steps/{stepId}/issues`                   | ✅ `features/issue/api.ts`            |
| [56](#56-이슈-생성)                       | 이슈 생성        | `POST /steps/{stepId}/issues`                  | ✅ `features/issue/api.ts`            |
| [57](#57-이슈-상세-조회)                  | 이슈 상세        | `GET /issues/{issueId}`                        | ✅ `features/issue/api.ts`            |
| [58](#58-이슈-부분-수정)                  | 이슈 부분 수정   | `PATCH /issues/{issueId}`                      | ✅ `features/issue/api.ts`            |
| [59](#59-이슈-상태-변경)                  | 이슈 상태 변경   | `PATCH /issues/{issueId}/status`               | ✅ `features/issue/api.ts`            |
| [60](#60-이슈-삭제)                       | 이슈 삭제        | `DELETE /issues/{issueId}`                     | ✅ `features/issue/api.ts`            |
| [61](#61-결재관리-목록조회)               | 결재 목록        | `GET /approvals`                               | ✅ `features/approval/api.ts`         |
| [62](#62-결재-상세조회)                   | 결재 상세        | `GET /approvals/{id}`                          | ✅ `features/approval/api.ts`         |
| [63](#63-결재-승인)                       | 결재 승인        | `POST /approval-lines/{lineId}/approve`        | ✅ `features/approval/api.ts`         |
| [64](#64-결재-반려)                       | 결재 반려        | `POST /approval-lines/{lineId}/reject`         | ✅ `features/approval/api.ts`         |
| [65](#65-버전-단건-조회-결재용)           | 버전 단건 조회   | `GET /file-versions/{fileVersionId}`           | ✅ `features/file/api.ts`             |
| [66](#66-이미지-항목-조회-한-장)          | 이미지 한 장 조회 | `GET /blocks/images/{id}/items/{orderIndex}`  | ✅ `features/block/api.ts`            |
| [67](#67-이미지-항목-생성)                | 이미지 생성      | `POST /blocks/images/{id}/items`               | ✅ `features/block/api.ts`            |
| [68](#68-이미지-순서--캡션-수정)          | 이미지 순서·캡션 | `PATCH /blocks/images/items/{imgBlockId}`      | ✅ `features/block/api.ts`            |
| [69](#69-이미지-항목-삭제)                | 이미지 삭제      | `DELETE /blocks/images/items/{imgId}`          | ✅ `features/block/api.ts`            |
| [70](#70-이미지-다운로드)                 | 이미지 다운로드  | `GET /blocks/images/{id}/download`             | ✅ `features/block/api.ts`            |
| [71](#71-이미지-항목-전체-조회)           | 이미지 전체 조회 | `GET /blocks/images/{id}/items`                | ✅ `features/block/api.ts`            |
| [73](#73-결재-이력조회)                   | 결재 이력        | `GET /approvals/{id}/revisions`                | ✅ `features/approval/api.ts`         |
| [74](#74-프로젝트-파일-버전-목록)         | 프로젝트 버전 목록 | `GET /projects/{projectId}/file-versions`    | ✅ `features/file/api.ts`             |
| [75](#75-검토-템플릿-목록)                | 검토 템플릿      | `GET /vitamate/review-templates`               | ✅ `features/vitamate/api.ts`         |
| [76](#76-비타메이트-분석-요청)            | 분석 요청        | `POST /blocks/{blockId}/vitamate/analyses`     | ✅ `features/vitamate/api.ts`         |
| [77](#77-비타메이트-분석-단건-조회)       | 분석 단건 조회   | `GET /vitamate/analyses/{analysisId}`          | ✅ `features/vitamate/api.ts`         |
| [78](#78-블록별-분석-이력)                | 분석 이력        | `GET /blocks/{blockId}/vitamate/analyses`      | ✅ `features/vitamate/api.ts`         |
| [79](#79-알림-목록-조회)                  | 알림 목록        | `GET /notifications`                           | ✅ `features/notification/api.ts`     |
| [80](#80-알림-이동-대상-조회)             | 알림 이동 대상   | `GET /notifications/{id}/target`               | ✅ `features/notification/api.ts`     |
| [81](#81-알림-읽음-처리)                  | 알림 읽음        | `PATCH /notifications/{id}/read`               | ✅ `features/notification/api.ts`     |
| [82](#82-알림-전체-읽음-처리)             | 알림 전체 읽음   | `PATCH /notifications/read-all`                | ✅ `features/notification/api.ts`     |
| [83](#83-알림-삭제)                       | 알림 삭제        | `DELETE /notifications/{id}`                   | ✅ `features/notification/api.ts`     |
| [84](#84-프로젝트-목록-조회)              | 프로젝트 목록    | `GET /projects`                                | ✅ `features/project/api.ts`          |
| [85](#85-정산-항목-수정-시-조회)          | 정산 수정 조회   | `GET /blocks/settlements/{id}/items`           | ✅ `features/settlement/api.ts`       |
| [86](#86-정산-항목-작성--수정)            | 정산 작성·수정   | `PATCH /blocks/settlements/{id}/items`         | ✅ `features/settlement/api.ts`       |
| [87](#87-사원-엑셀-템플릿-다운로드)       | 엑셀 템플릿      | `GET /employees/bulk-template`                 | ❌ 미연동                             |
| [88](#88-사원-엑셀-일괄-등록-검증)        | 일괄 등록 검증   | `POST /employees/bulk/validate`                | ❌ 미연동                             |
| [89](#89-사원-엑셀-일괄-등록)             | 일괄 등록        | `POST /employees/bulk`                         | ❌ 미연동                             |
| [90](#90-직급별-사원-목록)                | 직급별 사원 목록 | `GET /job-positions/{id}/employees`            | ❌ 미연동                             |
| [91](#91-사원-그룹-목록-조회)             | 그룹 목록        | `GET /employee-groups`                         | ❌ 미연동                             |
| [92](#92-사원-그룹-생성)                  | 그룹 생성        | `POST /employee-groups`                        | ❌ 미연동                             |
| [93](#93-사원-그룹-수정)                  | 그룹 수정        | `PATCH /employee-groups/{groupId}`             | ❌ 미연동                             |
| [94](#94-사원-그룹-삭제)                  | 그룹 삭제        | `DELETE /employee-groups/{groupId}`            | ❌ 미연동                             |
| [95](#95-그룹-구성원-목록-조회)           | 구성원 목록      | `GET /employee-groups/{groupId}/members`       | ❌ 미연동                             |
| [96](#96-그룹-구성원-추가)                | 구성원 추가      | `POST /employee-groups/{groupId}/members`      | ❌ 미연동                             |
| [97](#97-그룹-구성원-제거)                | 구성원 제거      | `DELETE /employee-groups/{id}/members/{userId}` | ❌ 미연동                            |
| [98](#98-내-페이지-목록-조회)             | 내 페이지 목록   | `GET /my/pages`                                | ✅ `features/pagePermission/api.ts` |
| [99](#99-페이지-목록-조회-권한-부여용)    | 페이지 목록      | `GET /pages`                                   | ✅ `features/pagePermission/api.ts` |
| [100](#100-페이지-접근-가능자-목록)       | 접근 가능자 목록 | `GET /pages/{pageCode}/permissions`            | ✅ `features/pagePermission/api.ts` |
| [101](#101-페이지-권한-부여--등급-변경)   | 권한 부여·변경   | `POST /pages/{pageCode}/permissions`           | ✅ `features/pagePermission/api.ts` |
| [102](#102-페이지-권한-회수)              | 권한 회수        | `DELETE /pages/{pageCode}/permissions/{userId}` | ✅ `features/pagePermission/api.ts` |

> `Base URL` 과 `/api/v1` 접두사는 생략했다. 실제 경로는 각 섹션 참고.
> 번호 없는 절 — [공통 규약](#공통-규약) · [공통 403 — 게이트 · 권한](#공통-403--게이트--권한) · [파일 도메인 — 공통](#파일-도메인--공통) · [결재 도메인 — 공통](#결재-도메인--공통) · [이미지 도메인 — 공통](#이미지-도메인--공통) · [사원 그룹 도메인 — 공통](#사원-그룹-도메인--공통) · [페이지 권한 도메인 — 공통](#페이지-권한-도메인--공통)

### ❗ 백엔드 확인 대기

| 항목                                              | 막힌 기능                        | 섹션  |
| ------------------------------------------------- | -------------------------------- | ----- |
| `block.type` enum 이 "10값" 인데 정리된 값은 9개  | 모르는 유형은 껍데기로 표시      | 9     |
| 블록 생성 응답 `data` 스키마                      | 생성 직후 해당 블록 지정         | 9     |
| `detail.chkBlockId` · `detail.items`              | 체크리스트 항목 추가 · 목록      | 10    |
| `detail.txtId` · `detail.content`                 | 텍스트 본문 편집                 | 10    |
| `detail` 의 첫 이미지 키 이름                     | 이미지 블록 (자세히는 이미지 절) | 10·66 |
| 배치 동시 편집 보호 (버전 · 변경 알림 채널)       | 마지막 저장이 남의 변경을 덮음   | 44    |
| 파일 API `PR #190` 머지 대기                      | 문서 블록 실동작 확인            | 36~43 |
| 휴지통 화면 목업                                  | 복구 · 영구 삭제 API 연동        | —     |

---

## 공통 규약

| 항목        | 내용                                                                         |
| ----------- | ---------------------------------------------------------------------------- |
| Base URL    | `NEXT_PUBLIC_API_BASE_URL` 환경변수 (`.env.local`)                           |
| 인증 방식   | **HttpOnly 세션 쿠키** `SESSION`. 응답 본문에 토큰이 없고 재발급 API 도 없다 |
| 프론트 처리 | 모든 요청에 `credentials: 'include'` — `src/lib/api.ts` 에서 일괄 처리       |
| 성공 봉투   | `{ httpStatus, message, data }` — 래퍼가 `data` 만 꺼내 반환한다             |
| 실패 봉투   | `{ httpStatus, message, code }` — **`data` 가 아니라 `code` 가 온다**        |
| 에러 처리   | `ApiError(status, message, code)` 로 던진다. 안내 문구는 `message` 우선      |

**실패 응답 예시** (실행으로 확인)

```json
{
  "httpStatus": 400,
  "message": "새 비밀번호가 현재 비밀번호와 같습니다.",
  "code": "AUTH_PASSWORD_UNCHANGED"
}
```

> ℹ️ `message` 는 **사용자에게 그대로 노출해도 되는 한국어 문구**다. 프론트가 상수로 덮는 것은 401 처럼 정보 노출을 막아야 할 때만 한다.

> ⚠️ 토큰을 localStorage 등에 저장하지 않는다. 쿠키는 브라우저가 알아서 싣는다.
> ℹ️ 쿠키 속성: `HttpOnly` · `SameSite=Lax` · 운영은 `Secure` · 만료 `Session`(브라우저 종료 시 소멸) — 로그인 유지 체크박스는 없다.
> ℹ️ 세션(Redis)은 **4시간 유휴 슬라이딩**(요청 시 자동 연장)이고 **단일 세션**이다 — 다른 기기에서 로그인하면 기존 세션이 끊겨 `/me` 가 401 로 떨어진다.
> ℹ️ 로그인 여부 판단은 서버(`src/proxy.ts`)에서만 가능하다. HttpOnly 라 JS 로 읽을 수 없다.
> ℹ️ 백엔드가 `deviceId` 쿠키(HttpOnly, 장기 만료)도 함께 내려준다. 프론트가 다루지 않는다.
> ⚠️ 백엔드 CORS 에 프론트 오리진 허용 + `allowCredentials=true` 가 설정돼 있어야 한다.

---

## 공통 403 — 게이트 · 권한

각 API 표에서는 생략한다. **status 가 아니라 `code` 로 구분**한다 (403 하나에 세 가지 의미가 실린다).

| code                            | 뜻                                          | 화면 처리                              |
| ------------------------------- | ------------------------------------------- | -------------------------------------- |
| `AUTH_TERMS_AGREEMENT_REQUIRED` | 약관 게이트 미통과 상태로 다른 API 호출     | 약관 동의 화면으로 유도 (`/me` 재조회) |
| `AUTH_PASSWORD_RESET_REQUIRED`  | 비밀번호 게이트 미통과 상태로 다른 API 호출 | 비밀번호 변경 화면으로 유도            |
| `ACC_ADMIN_REQUIRED`            | ADMIN 전용 API 에 MASTER · MEMBER 가 접근   | `/forbidden` 이동 (재조회 무의미)      |
| `BUSINESS_CATEGORY_ADMIN_ONLY`  | 사업 카테고리 쓰기 · 삭제분 조회에 비ADMIN  | `/forbidden` 이동                      |
| `AUTH_ACCOUNT_INACTIVE`         | 비활성 계정 (로그인 단계)                   | 관리자 문의 안내 — **423 잠금과 별개** |

> 처리 위치: `src/lib/api.ts` 가 403 을 `FORBIDDEN_EVENT` 로 흘리고 `src/features/auth/CurrentUserProvider.tsx` 한 곳에서 받는다.
> 코드 상수는 `src/features/auth/errorCodes.ts`. (2026-08-05 백엔드 정리본으로 철자 확인)

---

## 1. 로그인

| 항목          | 내용                                   |
| ------------- | -------------------------------------- |
| **Method**    | `POST`                                 |
| **Path**      | `/api/v1/auth/login`                   |
| **인증 필요** | ❌                                     |
| **사용 위치** | `src/features/auth/api.ts` → `login()` |

**Request Body**

```ts
interface LoginRequest {
  userId: string; // 사번 (화면에는 '아이디'로 노출)
  password: string;
}
```

**Response (200 OK)** — Swagger 실행으로 확인

```ts
{
  httpStatus: 200,
  message: '로그인 성공',
  data: {
    userId: string;           // 'EMP001'
    name: string;             // '김민준'
    role: 'ADMIN' | 'MASTER' | 'MEMBER';
    termsStatus: 'AGREED' | 'REQUIRED';        // ADMIN 은 항상 AGREED
    passwordStatus: 'NORMAL' | 'RESET_REQUIRED';
    departmentName?: string;  // '개발팀'
    departmentPath?: string;  // '기술본부 / 개발팀'
    jobPositionName?: string; // '대리'
  }
}
```

> ℹ️ 응답 본문에 **토큰이 없다.** 인증은 HttpOnly 세션 쿠키이며, Swagger UI 에 `Set-Cookie` 가 보이지 않는 것은 브라우저가 JS 에 노출하지 않기 때문이다.
> ℹ️ `passwordStatus === 'RESET_REQUIRED'` 면 비밀번호 변경 화면으로 보낸다.
> ℹ️ 비밀번호 해시(Argon2id) 때문에 응답에 **0.3~1.1초**가 걸리는 것이 정상이다. 로딩 상태를 반드시 표시한다.

**에러 응답**

| status | code                     | 화면 처리                                                                      |
| ------ | ------------------------ | ------------------------------------------------------------------------------ |
| 400    | `AUTH_INVALID_REQUEST`   | "아이디와 비밀번호를 모두 입력해주세요."                                       |
| 401    | `AUTH_LOGIN_FAILED`      | "아이디 또는 비밀번호가 올바르지 않습니다." (사번 존재 여부를 구분하지 않는다) |
| 403    | `AUTH_ACCOUNT_INACTIVE`  | "비활성화된 계정입니다. 관리자에게 문의해주세요."                              |
| 423    | `AUTH_ACCOUNT_LOCKED`    | `message` 그대로 노출 (해제 시각 포함)                                         |
| 429    | `AUTH_TOO_MANY_REQUESTS` | "요청이 너무 많습니다. 잠시 후 다시 시도해주세요."                             |
| 503    | `AUTH_HASHING_BUSY`      | "서버가 혼잡합니다. 잠시 후 다시 시도해주세요."                                |

---

## 2. 로그아웃

| 항목          | 내용                                    |
| ------------- | --------------------------------------- |
| **Method**    | `POST`                                  |
| **Path**      | `/api/v1/auth/logout`                   |
| **인증 필요** | ✅                                      |
| **사용 위치** | `src/features/auth/api.ts` → `logout()` |

세션을 종료하고 쿠키를 만료시킨다. 응답 `data` 없음.

| status | code                   | 화면 처리            |
| ------ | ---------------------- | -------------------- |
| 401    | `AUTH_UNAUTHENTICATED` | 로그인 화면으로 이동 |

---

## 3. 내 정보 조회

| 항목          | 내용                                   |
| ------------- | -------------------------------------- |
| **Method**    | `GET`                                  |
| **Path**      | `/api/v1/auth/me`                      |
| **인증 필요** | ✅                                     |
| **사용 위치** | `src/features/auth/api.ts` → `getMe()` |

**Response (200 OK)** — Swagger 스키마로 확인

```ts
{
  httpStatus: 200,
  message: '조회 성공',
  data: {
    userId: string;          // 'EMP001'
    name: string;            // '김민준'
    role: 'ADMIN' | 'MASTER' | 'MEMBER';
    termsStatus: 'AGREED' | 'REQUIRED';        // 로그인 응답과 동일
    passwordStatus: 'NORMAL' | 'RESET_REQUIRED';
    email: string;           // 'minjun@example.com'
    phone: string;           // '010-0000-0000'
    departmentName: string;  // '개발팀'
    departmentPath: string;  // '기술본부 / 개발팀'
    jobPositionName: string; // '대리'
    hiredAt: string;         // '2024-03-04'
    lastLoginAt: string;     // '2026-08-03 09:12:44'
  }
}
```

> ℹ️ **로그인 응답 + `email` · `phone` · `hiredAt` · `lastLoginAt` 4개** 구조다. (`termsStatus` 포함 — 백엔드 `MyInfoResponse` 로 2026-08-05 확인)
> ℹ️ 게이트 판단(`termsStatus` · `passwordStatus`)은 **`/me` 기준**으로 한다. 로그인 응답은 라우팅에 쓰지 않는다 — 새로고침·직접 진입에도 막아야 하기 때문.
> 타입도 `CurrentUser extends LoginResponse` 로 같은 관계를 유지한다. (`src/features/auth/types.ts`)
> ℹ️ 날짜는 문자열 그대로 온다 — 표시할 때 `src/lib/format.ts` 를 거친다.

| status | code                   | 화면 처리            |
| ------ | ---------------------- | -------------------- |
| 401    | `AUTH_UNAUTHENTICATED` | 로그인 화면으로 이동 |

---

## 4. 약관 동의

| 항목          | 내용                                          |
| ------------- | --------------------------------------------- |
| **Method**    | `POST`                                        |
| **Path**      | `/api/v1/auth/terms-agreements`               |
| **인증 필요** | ✅                                            |
| **요청 본문** | 없음                                          |
| **사용 위치** | `src/features/auth/api.ts` → `agreeToTerms()` |

이용약관 · 개인정보처리방침을 **하나로 묶어** 동의받는다. POST 호출 자체가 동의이며 응답 `data` 는 `null`. **재호출해도 무해(멱등)**.

- **최초 로그인 1회만** 받는다. 동의 후 비밀번호 변경 단계로 넘어간다.
- 비밀번호 재설정 후 로그인에서는 다시 받지 않는다.
- **ADMIN 은 대상이 아니다.**

| status | code                   | 화면 처리            |
| ------ | ---------------------- | -------------------- |
| 401    | `AUTH_UNAUTHENTICATED` | 로그인 화면으로 이동 |

> 화면 흐름: 로그인 → (`passwordStatus === 'RESET_REQUIRED'`) → 약관 동의 → 비밀번호 변경 → 서비스 진입

---

## 5. 비밀번호 변경

| 항목          | 내용                    |
| ------------- | ----------------------- |
| **Method**    | `PATCH`                 |
| **Path**      | `/api/v1/auth/password` |
| **인증 필요** | ✅                      |
| **사용 위치** | 미구현                  |

**Request Body**

```ts
interface ChangePasswordRequest {
  currentPassword?: string; // 최초 변경(passwordStatus=RESET_REQUIRED)이면 생략
  newPassword: string;
  newPasswordConfirm: string;
}
```

- 비밀번호 정책: **8자 이상 + 영문 · 숫자 · 특수문자 모두 포함**
- 변경 후에도 세션은 유지되고 `passwordStatus` 가 `NORMAL` 로 바뀐다 (재로그인 불필요)
- ⚠️ **현재 비밀번호 불일치는 401 이 아니라 400** (`AUTH_CURRENT_PASSWORD_INVALID`) — 401 로 오면 공통 인터셉터가 로그아웃시켜 버리기 때문
- 남의 비밀번호는 이 API 로 못 바꾼다. 관리자 재설정은 `POST /accounts/password-resets`

| status | code                                                                                                                                                                                          | 화면 처리            |
| ------ | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------- |
| 400    | `AUTH_INVALID_REQUEST` · `AUTH_CURRENT_PASSWORD_REQUIRED` · `AUTH_CURRENT_PASSWORD_INVALID` · `AUTH_PASSWORD_CONFIRM_MISMATCH` · `AUTH_PASSWORD_POLICY_VIOLATION` · `AUTH_PASSWORD_UNCHANGED` | 폼 필드 에러 표시    |
| 401    | `AUTH_UNAUTHENTICATED`                                                                                                                                                                        | 로그인 화면으로 이동 |

---

## 6. 프로젝트 상세 조회

| 항목          | 내용                                           |
| ------------- | ---------------------------------------------- |
| **Method**    | `GET`                                          |
| **Path**      | `/api/v1/projects/{projectId}`                 |
| **인증 필요** | ✅                                             |
| **사용 위치** | `src/features/project/api.ts` → `getProject()` |

**Response (200 OK)**

```ts
{
  httpStatus: 200,
  message: '요청이 성공적으로 처리되었습니다.',
  data: {
    projectId: number;
    name: string;              // 과업명
    description: string | null;
    clientName: string;        // 발주처
    status: string;            // 'IN_PROGRESS' 등 — enum 미확정
    startedOn: string;         // '2026-03-01'
    endedOn: string;           // '2026-12-31'
    contractAmount: number;    // 계약금액
    progressRate?: number;     // 진척률(%) — 스텝 0개면 응답에 없다
    stepCount: number;
    doneStepCount: number;
    businessCategories: { categoryId: number; name: string; code: string }[];
    bidNoticeId: number | null;
    closeReasonCode: string | null;  // 종결 건만
    closeReasonNote: string | null;
    myPermission: 'VIEWER' | 'EDITOR';
    createdAt: string;         // '2026-08-05T03:39:08'
  }
}
```

> ⚠️ `progressRate` 는 **선택 필드**다. 스텝이 0개면 아예 오지 않으므로 `?? 0` 로 받는다.
> ⚠️ `myPermission === 'VIEWER'` 면 수정·추가 버튼을 숨긴다. (실제 차단은 백엔드가 한다)
> ✅ 참여자 목록은 45번 API로 연동했다. 사이드바와 블록 담당자 지정이 같은 목록을 사용한다.

---

## 7. 프로젝트 스테이지 목록

| 항목          | 내용                                                 |
| ------------- | ---------------------------------------------------- |
| **Method**    | `GET`                                                |
| **Path**      | `/api/v1/projects/{projectId}/stages`                |
| **인증 필요** | ✅                                                   |
| **사용 위치** | `src/features/project/api.ts` → `getProjectStages()` |

**Response (200 OK)**

```ts
{
  httpStatus: 200,
  message: '요청이 성공적으로 처리되었습니다.',
  data: {
    stages: {
      stageId: number;
      name: string;      // '요구분석'
      sortOrder: number; // 정렬 순서
      stepCount: number; // 소속 스텝 수
    }[];
  }
}
```

> ℹ️ `data` 안에 `stages` 로 한 겹 더 감싸져 있다. `getProjectStages()` 가 벗겨서 배열만 반환한다.
> ℹ️ **`sortOrder` 오름차순으로 정렬되어 온다** — 프론트에서 다시 정렬하지 않는다.

---

## 8. 프로젝트 스텝 목록

| 항목          | 내용                                                |
| ------------- | --------------------------------------------------- |
| **Method**    | `GET`                                               |
| **Path**      | `/api/v1/projects/{projectId}/steps`                |
| **인증 필요** | ✅                                                  |
| **사용 위치** | `src/features/project/api.ts` → `getProjectSteps()` |

**Response (200 OK)**

```ts
{
  httpStatus: 200,
  message: '요청이 성공적으로 처리되었습니다.',
  data: {
    steps: {
      stepId: number;
      stageId: number | null;   // null = 스테이지 미배정
      name: string;
      status: 'NOT_STARTED' | 'IN_PROGRESS' | 'DONE';
      sortOrder: number;
      startedOn: string;        // '2026-03-01'
      endedOn: string;          // '2026-03-15'
      owner: { userId: string; name: string } | null;
      totalIssueCount: number;
      doneIssueCount: number;
      inProgressIssueCount: number;
      progressRate?: number;    // 이슈 0개면 응답에 없다
      myPermission: 'VIEWER' | 'EDITOR';
    }[];
  }
}
```

> ⚠️ **`stageId` 가 `null` 인 스텝이 있다.** 어느 스테이지에도 안 붙은 스텝이라, 사이드바는 `미분류` 묶음으로 따로 보여준다.
> ⚠️ `progressRate` 는 **선택 필드**다. 이슈가 0개면 오지 않으므로 `?? 0` 로 받는다.
> ℹ️ 스텝 진척률 바는 `inProgressIssueCount`(노랑) · `doneIssueCount`(파랑) · 나머지(회색) 비율로 그린다.
> ℹ️ 명세 표에는 없지만 실제 응답에 **`inProgressIssueCount`** 가 포함된다.

---

## 9. 블록 생성

| 항목          | 내용                                          |
| ------------- | --------------------------------------------- |
| **Method**    | `POST`                                        |
| **Path**      | `/api/v1/steps/{stepId}/blocks`               |
| **인증 필요** | ✅ (스텝 `EDITOR`)                            |
| **사용 위치** | `src/features/block/api.ts` → `createBlock()` |
| **요구사항**  | BLK-001 · BLK-002 · BLK-003                   |

> ⚠️ 경로가 `/projects/{id}/...` 아래가 아니라 **`/steps/{stepId}`** 최상위다.

**Request Body**

```ts
interface CreateBlockRequest {
  type: BlockTypeCode; // 필수 — 아래 enum 9값만
  title?: string; // 최대 200자. PAYMENT_CONFIRM 에서는 회차명
  owner?: string; // 담당자 사번 (VARCHAR(20)) — 선택 (BLK-012)
  rowIndex?: number; // 미지정 시 맨 아래
  sortOrder?: number; // 행 내 순서
  colSpan?: number; // 열 병합 수 1~3, 기본 1
}
```

**`type` 허용값 (ERD `block.type` enum 9값)**

| 값                 | 상세 테이블             | 카디널리티 | 화면 라벨       |
| ------------------ | ----------------------- | ---------- | --------------- |
| `TEXT`             | `text`                  | 1:1        | 텍스트          |
| `IMAGE`            | `image`                 | 1:N        | 이미지          |
| `CHECKLIST`        | `checklist`             | 1:N        | 체크리스트      |
| `FILE`             | `block_file`            | 1:N        | 문서 업로드     |
| `PAYMENT_CONFIRM`  | `block_payment_confirm` | 1:1        | 입금 확인       |
| `TAX_INVOICE_VIEW` | `tax_invoice_confirm`   | 1:1        | 세금계산서 조회 |
| `APPROVAL`         | `approval`              | 1:1        | 결재            |
| `AI`               | `vitamate_block`        | 1:1        | AI Block        |
| `BID_NOTICE`       | `bid_notice_block`      | 1:1        | 입찰 공고       |

> ⚠️ ERD Cloud 상 테이블명이 다른 항목이 있다 — `IMAGE` → `img_block`, `CHECKLIST` → `chk_block`.
> ℹ️ 화면 라벨 · 아이콘 색은 `src/features/block/types.ts` 의 `BLOCK_TYPES` 가 단일 소스다.
> ℹ️ **`rowIndex` · `sortOrder` 는 프론트가 계산해 보낸다** (`blockLayout.ts` → `nextPosition()`). 마지막 행에 칸이 남으면 그 행 오른쪽, 모자라면 새 행이다 — 서버 기본값(맨 아래 새 행)에 맡기면 남는 칸이 비어 보인다. 목록을 아직 못 불러왔을 때만 생략한다.
> ❗ **응답 `data` 스키마는 확인 필요.** 현재 프론트는 응답 본문을 쓰지 않는다.
> ❗ **에러 코드 목록도 확인 필요.** 지금은 백엔드 `message` 를 그대로 노출한다.

---

## 10. 스텝 블록 일괄 조회

| 항목          | 내용                                            |
| ------------- | ----------------------------------------------- |
| **Method**    | `GET`                                           |
| **Path**      | `/api/v1/steps/{stepId}/blocks`                 |
| **인증 필요** | ✅                                              |
| **사용 위치** | `src/features/block/api.ts` → `getStepBlocks()` |

**Response (200 OK)**

```ts
data: {
  blocks: {
    blockId: number;
    type: BlockTypeCode;
    title: string | null;
    owner: { userId: string; name: string } | null; // 미지정이면 null (BLK-012)
    rowIndex: number;   // 같은 값끼리 한 행
    sortOrder: number;  // 행 내 순서
    colSpan: number;    // 1~3
    detail: unknown;    // 타입별 상세 — 구조가 타입마다 다르다
    linkedIssueTotal: number;
    linkedIssueDone: number;
  }[];
}
```

> ℹ️ `data` 안에 `blocks` 로 한 겹 더 감싸져 있다. `getStepBlocks()` 가 벗겨서 배열만 반환한다.
> ℹ️ **`rowIndex` · `sortOrder` 순으로 정렬되어 온다.** 보드는 이 둘로 **평면 순서**를 만든 뒤 앞에서부터 3칸씩 채워 행을 다시 만든다 (`blockLayout.ts`). 서버 `rowIndex` 를 그대로 행으로 쓰지 않으므로 한 행이 3칸을 넘는 일이 없다.
> ⚠️ **`colSpan` 이 1~3 이다.** 블록 생성 명세와 같지만, 화면 기획상 1·2칸만 쓰이더라도 3까지 들어올 수 있어 보드는 3칸까지 그린다.
> ⚠️ **`type` 이 "ERD enum 10값" 으로 적혀 있다.** 9번에 정리된 enum 은 9값 — **나머지 1값 확인 필요.** 프론트는 모르는 값이 오면 `준비 중인 블록입니다.` 껍데기로 그린다.
> ℹ️ **`detail` 은 블록의 내용을 담는 하위 계층이다.** `blockId` 로 관리하는 것은 위 공통 필드까지고, 내용은 타입별 상세 ID(예: `CHECKLIST` 의 `chkBlockId`)로 관리한다.
> ❗ **`detail` 스키마는 `FILE` 의 `{ fileCount: 3 }` 만 확인됐다.**
> `CHECKLIST` 는 **`chkBlockId`(필수) 와 항목 배열**이 필요하다. 프론트는 `detail.chkBlockId` · `detail.items` 를 런타임 검증해서 읽고, 없거나 형태가 다르면 항목 추가를 막고 빈 목록으로 떨어뜨린다. **키 이름 확인 필요.**
> `IMAGE` 는 **`imgBlockId` 와 첫 이미지(필수)** 가 필요하다 — 목록 조회 API 가 없어 **첫 장은 이 응답으로 함께 내려준다** (2026-08-07 확정). 카드는 이 값으로 바로 그리고 두 번째 장부터 66번으로 받는다.
> ❗ **첫 이미지의 키 이름은 확인 필요.** `readImageBlockDetail()` 이 `images: [...]` · `firstImage: {...}` · `detail` 바로 아래 평면(`imgId` · `imageUrl` · `caption` · `orderIndex`) 세 모양을 모두 읽는다. 확정되면 해당 분기만 남긴다.
> ℹ️ `totalCount`(또는 `imageCount`)도 함께 주면 `1 / 5` 표기와 마지막 장 판정이 정확해진다. 없으면 프론트가 다음 장 버튼을 막지 않고 66번 응답의 `totalCount` 로 채운다.
> `APPROVAL` 은 **`approvalId` · `revisionId`(둘 다 필수)** 가 필요하다. 결재 API 가 전부 `approvalId` 로 시작해서, 이 둘이 없으면 `blockId` 만으로는 어느 결재인지 알 수 없다 — `readApprovalBlockDetail()` 이 런타임 검증하고 없으면 블록이 안내만 띄운다.

---

## 11. 텍스트 본문 수정

| 항목          | 내용                                              |
| ------------- | ------------------------------------------------- |
| **Method**    | `PATCH`                                           |
| **Path**      | `/api/v1/blocks/texts/{txtId}`                    |
| **인증 필요** | ✅                                                |
| **사용 위치** | `src/features/block/api.ts` → `updateTextBlock()` |

**Request Body**

```ts
{
  content: string; // 필수 — 마크다운 원문 전체
}
```

**Response (200 OK)**

```ts
data: {
  txtId: number;
  content: string;
  updatedAt: string;
}
```

> ⚠️ **`txtId` 는 `blockId` 와 다른 값이다.** `chkBlockId` 와 마찬가지로 **블록(`blockId`) > 블록의 내용(`txtId`)** 구조다.
> → 10번 블록 목록 응답의 **`detail.txtId`** 로 받는다. 값이 없으면 프론트는 편집 버튼을 막는다.
> ⚠️ `content` 는 부분 수정이 아니라 **전체 내용**을 보낸다.
> ℹ️ 본문은 **마크다운 원문**으로 주고받는다. 화면에는 WYSIWYG 로만 보이고 원문이 노출되지 않는다 (TipTap + `tiptap-markdown`).
> ❗ **`detail` 에 `txtId` 와 `content` 가 포함돼야 한다.** 키 이름 확인 필요 — 프론트는 `readTextBlockDetail()` 로 런타임 검증한다.

---

## 12. 체크리스트 항목 생성

| 항목          | 내용                                                  |
| ------------- | ----------------------------------------------------- |
| **Method**    | `POST`                                                |
| **Path**      | `/api/v1/blocks/checklists/{chkBlockId}/items`        |
| **인증 필요** | ✅                                                    |
| **사용 위치** | `src/features/block/api.ts` → `createChecklistItem()` |

**Request Body**

```ts
{
  content: string; // 필수
}
```

**Response (201 Created)**

```ts
data: {
  chkBlockId: number;
  chkId: number;
  content: string;
  completedCount: number;
  totalCount: number;
  createdAt: string; // '2026-07-31T15:20:00'
}
```

> ℹ️ 응답에 `isCompleted` 가 없다. 새 항목은 항상 미완료로 시작한다.
> ⚠️ **`chkBlockId` 는 `blockId` 와 다른 값이다.** 구성이 **블록(`blockId`) > 블록의 내용(`chkBlockId`)** 이라
> 항목 생성에는 `chkBlockId` 만 쓴다. `blockId` 로 대체하면 다른 체크리스트에 항목이 붙을 수 있다.
> → 이 값은 10번 블록 목록 응답의 **`detail.chkBlockId`** 로 받는다. 값이 없으면 프론트는 항목 추가를 막는다.

---

## 13. 체크리스트 항목 수정

| 항목          | 내용                                                  |
| ------------- | ----------------------------------------------------- |
| **Method**    | `PATCH`                                               |
| **Path**      | `/api/v1/blocks/checklists/items/{chkId}`             |
| **인증 필요** | ✅                                                    |
| **사용 위치** | `src/features/block/api.ts` → `updateChecklistItem()` |

**Request Body** — 두 필드 모두 nullable. 내용만 · 완료 여부만 · 둘 다 보낼 수 있다.

```ts
{
  content?: string;        // 수정한 부분을 포함한 전체 내용
  changeStatusTo?: boolean; // 목표 완료 여부
}
```

**Response (200 OK)**

```ts
data: {
  chkId: number;
  content: string;
  isCompleted: boolean;
  completedCount: number;
  totalCount: number;
  updatedAt: string;
}
```

> ⚠️ `content` 는 **부분 수정이 아니라 전체 내용**을 보낸다.

---

## 14. 체크리스트 항목 삭제

| 항목          | 내용                                                  |
| ------------- | ----------------------------------------------------- |
| **Method**    | `DELETE`                                              |
| **Path**      | `/api/v1/blocks/checklists/items/{chkId}`             |
| **인증 필요** | ✅                                                    |
| **사용 위치** | `src/features/block/api.ts` → `deleteChecklistItem()` |

**Response (200 OK)**

```ts
data: {
  completedCount: number;
  totalCount: number;
}
```

> ℹ️ 세 API 모두 `completedCount` · `totalCount` 를 돌려주지만, `ChecklistBlock` 은 **화면의 항목 목록에서 진척률을 계산**한다. 서버 카운트를 그대로 쓰면 목록과 숫자가 어긋나 보일 수 있다.
> ❗ **블록 수정 · 블록 삭제 API 가 없다.** 블록 헤더 `⋯` 메뉴는 UI 만 있다.
> ℹ️ 순서 변경은 [44번](#44-블록-배치-변경)으로 연동됐다 — 드래그 결과가 서버에 남는다.

---

## 15. 사업 카테고리 목록 조회

| 항목          | 내용                                                       |
| ------------- | ---------------------------------------------------------- |
| **Method**    | `GET`                                                      |
| **Path**      | `/api/v1/business-categories`                              |
| **인증 필요** | ✅                                                         |
| **사용 위치** | `src/features/businessCategory/api.ts` → `getCategories()` |

**Query**

| 이름             | 타입      | 내용                                                |
| ---------------- | --------- | --------------------------------------------------- |
| `keyword`        | `string`  | 이름 · 업무코드 **부분 일치** 검색 (선택)           |
| `includeDeleted` | `boolean` | 삭제분 포함. 기본 `false`, **ADMIN 만 `true` 가능** |

**Response (200 OK)**

```ts
data: {
  categories: {
    categoryId: number;
    name: string;
    code: string | null; // 업무코드 — 없을 수 있다
    description: string | null;
    deletable: boolean; // 연결된 프로젝트가 없으면 true
    deletedAt: string | null; // ISO — 논리 삭제 시각
  }
  [];
}
```

> ℹ️ **이름 오름차순 고정**이고 **페이징 · 정렬 파라미터가 없다** — 화면은 전체를 받아 스크롤로 보여준다.
> ℹ️ 0건이면 빈 배열. `data.categories` 로 한 겹 감싸져 있어 `api.ts` 에서 벗겨 반환한다.

| status | code                           | 화면 처리         |
| ------ | ------------------------------ | ----------------- |
| 403    | `BUSINESS_CATEGORY_ADMIN_ONLY` | `/forbidden` 이동 |

---

## 16. 사업 카테고리 생성

| 항목          | 내용                                                        |
| ------------- | ----------------------------------------------------------- |
| **Method**    | `POST`                                                      |
| **Path**      | `/api/v1/business-categories`                               |
| **인증 필요** | ✅ (ADMIN)                                                  |
| **사용 위치** | `src/features/businessCategory/api.ts` → `createCategory()` |

**Request Body**

```ts
{
  name: string;         // 필수 · 중복 불가 (최대 100자)
  code?: string;        // 선택 · 입력한 경우에만 중복 검사 (최대 30자)
  description?: string; // 선택
}
```

**Response (201 Created)** — `categoryId` · `name` · `code` · `description` · `deletable` · `createdAt`

| status | code                                                                      | 화면 처리         |
| ------ | ------------------------------------------------------------------------- | ----------------- |
| 400    | `BUSINESS_CATEGORY_NAME_REQUIRED` · `_FIELD_TOO_LONG` · `_CODE_INVALID`   | 폼 필드 에러      |
| 403    | `BUSINESS_CATEGORY_ADMIN_ONLY`                                            | `/forbidden` 이동 |
| 409    | `BUSINESS_CATEGORY_NAME_DUPLICATED` · `BUSINESS_CATEGORY_CODE_DUPLICATED` | 해당 입력에 표시  |

---

## 17. 사업 카테고리 수정

| 항목          | 내용                                                        |
| ------------- | ----------------------------------------------------------- |
| **Method**    | `PATCH`                                                     |
| **Path**      | `/api/v1/business-categories/{categoryId}`                  |
| **인증 필요** | ✅ (ADMIN)                                                  |
| **사용 위치** | `src/features/businessCategory/api.ts` → `updateCategory()` |

**Request Body** — 보낸 필드만 바뀐다

```ts
{
  name?: string;
  code?: string | null;  // null 을 보내면 업무코드를 지운다
  description?: string;
}
```

- ⚠️ `name` · `code` · `description` 이 **하나도 없으면 400** (`BUSINESS_CATEGORY_NO_FIELD_TO_UPDATE`)
- 응답은 생성과 같은 형태 (`createdAt` 포함)

| status | code                                                                                            | 화면 처리         |
| ------ | ----------------------------------------------------------------------------------------------- | ----------------- |
| 400    | `BUSINESS_CATEGORY_NO_FIELD_TO_UPDATE` · `_FIELD_TOO_LONG` · `_NAME_REQUIRED` · `_CODE_INVALID` | 폼 필드 에러      |
| 403    | `BUSINESS_CATEGORY_ADMIN_ONLY`                                                                  | `/forbidden` 이동 |
| 404    | `BUSINESS_CATEGORY_NOT_FOUND`                                                                   | 목록 재조회       |
| 409    | `BUSINESS_CATEGORY_NAME_DUPLICATED` · `BUSINESS_CATEGORY_CODE_DUPLICATED`                       | 해당 입력에 표시  |

---

## 18. 사업 카테고리 삭제

| 항목          | 내용                                                        |
| ------------- | ----------------------------------------------------------- |
| **Method**    | `DELETE`                                                    |
| **Path**      | `/api/v1/business-categories/{categoryId}`                  |
| **인증 필요** | ✅ (ADMIN)                                                  |
| **사용 위치** | `src/features/businessCategory/api.ts` → `deleteCategory()` |

**논리 삭제**다. 하드 삭제하지 않고, **이미 걸린 연결은 끊지 않는다** — 연결 해제는 프로젝트 쪽 API 소관.

| status | code                           | 화면 처리                                           |
| ------ | ------------------------------ | --------------------------------------------------- |
| 403    | `BUSINESS_CATEGORY_ADMIN_ONLY` | `/forbidden` 이동                                   |
| 404    | `BUSINESS_CATEGORY_NOT_FOUND`  | 이미 삭제됨 — 목록 재조회                           |
| 409    | `BUSINESS_CATEGORY_IN_USE`     | **삭제 차단 안내** — 건수가 `message` 문구에 포함됨 |

> ℹ️ 목록의 `deletable` 로 미리 걸러도 **경합(다른 사람이 그 사이 프로젝트를 연결)** 은 막을 수 없다. 409 를 반드시 처리한다.

---

## 19. 전역 권한 변경

| 항목          | 내용                                                    |
| ------------- | ------------------------------------------------------- |
| **Method**    | `PATCH`                                                 |
| **Path**      | `/api/v1/accounts/{userId}/role`                        |
| **인증 필요** | ✅ (ADMIN)                                              |
| **사용 위치** | `src/features/employee/api.ts` → `updateEmployeeRole()` |

**요청 Body**

| 필드   | 타입     | 필수 | 설명                             |
| ------ | -------- | ---- | -------------------------------- |
| `role` | `string` | ✅   | `MASTER` · `MEMBER` — ADMIN 불가 |

**응답 data** — `userId` · `role`

| status | code                                | 화면 처리                         |
| ------ | ----------------------------------- | --------------------------------- |
| 400    | `ACC_INVALID_ROLE`                  | 허용되지 않는 값                  |
| 400    | `ACC_ADMIN_ROLE_NOT_ALLOWED`        | ADMIN 부여 시도 — 셀렉트에서 제외 |
| 400    | `ACC_SELF_MODIFICATION_NOT_ALLOWED` | 자기 자신 변경 — 미리 비활성화    |
| 403    | `ACC_SYSTEM_ACCOUNT_NOT_ALLOWED`    | 시스템 계정 대상 불가             |
| 404    | `ACC_NOT_FOUND`                     | 계정 없음 — 목록 재조회           |

---

## 20. 계정 상태 변경

| 항목          | 내용                                                     |
| ------------- | -------------------------------------------------------- |
| **Method**    | `PATCH`                                                  |
| **Path**      | `/api/v1/accounts/{userId}/status`                       |
| **인증 필요** | ✅ (ADMIN)                                               |
| **사용 위치** | `src/features/employee/api.ts` → `updateAccountStatus()` |

**요청 Body**

| 필드     | 타입     | 필수 | 설명                  |
| -------- | -------- | ---- | --------------------- |
| `status` | `string` | ✅   | `ACTIVE` · `INACTIVE` |

**응답 data** — `userId` · `status`

| status | code                             | 화면 처리                      |
| ------ | -------------------------------- | ------------------------------ |
| 400    | `ACC_INVALID_STATUS`             | 허용되지 않는 값               |
| 400    | `ACC_STATUS_UNCHANGED`           | 이미 같은 상태 — 토글 비활성화 |
| 403    | `ACC_SYSTEM_ACCOUNT_NOT_ALLOWED` | 시스템 계정 대상 불가          |
| 404    | `ACC_NOT_FOUND`                  | 계정 없음                      |

> ⚠️ **퇴사 처리와 다른 API 다.** 퇴사는 [34](#34-퇴사-처리) 하나로 퇴사일 기록 + 계정 비활성을 함께 처리한다.

---

## 21. 비밀번호 재설정 (개인 · 다중 공용)

| 항목          | 내용                                                |
| ------------- | --------------------------------------------------- |
| **Method**    | `POST`                                              |
| **Path**      | `/api/v1/accounts/password-resets`                  |
| **인증 필요** | ✅ (ADMIN)                                          |
| **사용 위치** | `src/features/employee/api.ts` → `resetPasswords()` |

**요청 Body**

| 필드      | 타입       | 필수 | 설명                            |
| --------- | ---------- | ---- | ------------------------------- |
| `userIds` | `string[]` | ✅   | 대상 사번 목록 (1명이면 길이 1) |

**응답 data**

| 필드                         | 타입       | 설명                                             |
| ---------------------------- | ---------- | ------------------------------------------------ |
| `requestedCount`             | `int`      | 요청 건수                                        |
| `successCount`               | `int`      | 성공 건수                                        |
| `failedCount`                | `int`      | 실패 건수                                        |
| `failures[]`                 | `Object[]` | `userId` · `name` · `reason` · `passwordChanged` |
| `failures[].reason`          | `string`   | `EMAIL_NOT_REGISTERED` · `MAIL_SEND_FAILED`      |
| `failures[].passwordChanged` | `boolean`  | 메일 미등록 = `false` · 메일 실패 = `true`       |

| status | code                            | 화면 처리                      |
| ------ | ------------------------------- | ------------------------------ |
| 400    | `ACC_INVALID_REQUEST`           | `userIds` 비어 있음            |
| 403    | `ACC_ADMIN_ACCOUNT_NOT_ALLOWED` | 대상에 ADMIN 포함 — 전체 거부  |
| 404    | `ACC_NOT_FOUND`                 | 없는 사번 포함 — **전체 거부** |

> ⚠️ **실패가 섞여도 200** 이다. 집계를 결과 모달에 그려야 한다.
> ⚠️ `passwordChanged: true` 인 사원은 새 비밀번호를 모르는 상태 — **재발송(같은 API 재호출) 필수**.

---

## 22. 부서 목록 조회

| 항목          | 내용                                                                                           |
| ------------- | ---------------------------------------------------------------------------------------------- |
| **Method**    | `GET`                                                                                          |
| **Path**      | `/api/v1/departments`                                                                          |
| **인증 필요** | ✅ (전체 사용자 — 사원 등록 · 필터에 쓰임)                                                     |
| **사용 위치** | `src/features/department/api.ts` → `getDepartments()` (사원 목록 필터 셀렉트도 이 API 를 쓴다) |

**응답 data.content[]**

| 필드                  | 타입       | 설명                              |
| --------------------- | ---------- | --------------------------------- |
| `departmentId`        | `Long`     | 부서 번호                         |
| `name`                | `string`   | 부서명                            |
| `directEmployeeCount` | `int`      | 직속 인원 — **삭제 차단 판정용**  |
| `totalEmployeeCount`  | `int`      | 하위 포함 인원 — **화면 표시값**  |
| `children[]`          | `Object[]` | 하위 부서(같은 구성). 없으면 `[]` |

> ℹ️ 페이징 없음 · 생성 순 정렬 · **최대 2단** (`children` 안에 `children` 없음).
> ℹ️ 인원 수는 시스템 계정 · 퇴사자를 제외한 값이다.

---

## 23. 부서 생성 (최상위 · 하위 공용)

| 항목          | 내용                  |
| ------------- | --------------------- |
| **Method**    | `POST`                |
| **Path**      | `/api/v1/departments` |
| **인증 필요** | ✅ (ADMIN)            |

**요청 Body**

| 필드       | 타입     | 필수 | 설명                                        |
| ---------- | -------- | ---- | ------------------------------------------- |
| `name`     | `string` | ✅   | 최대 50자, 전체 중복 불가 (⚠️ 변경 요청 중) |
| `parentId` | `Long`   | —    | 생략하면 최상위. 하위 추가 시 고정 전송     |

**응답 data** — `departmentId` · `name` · `parentId` · `parentName` · `directEmployeeCount`(0) · `totalEmployeeCount`(0)

| status | code                      | 화면 처리                             |
| ------ | ------------------------- | ------------------------------------- |
| 400    | `DEPT_INVALID_REQUEST`    | 부서명 빈값 · 50자 초과               |
| 404    | `DEPT_PARENT_NOT_FOUND`   | 상위 부서 없음 — 목록 재조회          |
| 409    | `DEPT_NAME_DUPLICATED`    | 이름 입력 아래 인라인 에러            |
| 409    | `DEPT_MAX_DEPTH_EXCEEDED` | 2단 초과 — 하위 추가 메뉴를 미리 숨김 |

> ✅ **부서명은 같은 상위 부서(형제) 안에서 유니크다** (최상위 부서끼리는 전체 기준) — 2026-08-10 최종 명세로 확정.
> 그래서 `기술본부 > 개발팀` 과 `SI본부 > 개발팀` 을 함께 만들 수 있다. 409 문구는 백엔드 `message` 를 그대로 쓴다.

---

## 24. 부서명 수정

| 항목          | 내용                                                    |
| ------------- | ------------------------------------------------------- |
| **Method**    | `PATCH`                                                 |
| **Path**      | `/api/v1/departments/{departmentId}`                    |
| **인증 필요** | ✅ (ADMIN)                                              |
| **사용 위치** | `src/features/department/api.ts` → `updateDepartment()` |

**요청 Body** — `name` (✅, 최대 50자)

**응답 data** — `departmentId` · `name` · `parentId` · `parentName`

| status | code                   | 화면 처리                  |
| ------ | ---------------------- | -------------------------- |
| 400    | `DEPT_INVALID_REQUEST` | 부서명 빈값 · 50자 초과    |
| 404    | `DEPT_NOT_FOUND`       | 부서 없음 — 목록 재조회    |
| 409    | `DEPT_NAME_DUPLICATED` | 이름 입력 아래 인라인 에러 |

> ⚠️ **상위 부서(`parentId`)는 바꿀 수 없다** — 부서 이동 기능이 없다. 메뉴에 넣지 않는다.
> ℹ️ 부서명을 바꿔도 소속 사원 배정은 그대로다.

---

## 25. 부서 삭제

| 항목          | 내용                                 |
| ------------- | ------------------------------------ |
| **Method**    | `DELETE`                             |
| **Path**      | `/api/v1/departments/{departmentId}` |
| **인증 필요** | ✅ (ADMIN)                           |

**하드 삭제**다 (논리 삭제 아님). 하위 부서를 함께 지우지 않는다.

| status | code                 | 화면 처리                                 |
| ------ | -------------------- | ----------------------------------------- |
| 404    | `DEPT_NOT_FOUND`     | 이미 삭제됨 — 목록 재조회                 |
| 409    | `DEPT_HAS_EMPLOYEES` | 삭제 차단 — 인원 수가 `message` 에 포함됨 |
| 409    | `DEPT_HAS_CHILDREN`  | 삭제 차단 — 부서 수가 `message` 에 포함됨 |

---

## 26. 직급 목록 조회

| 항목          | 내용                                                    |
| ------------- | ------------------------------------------------------- |
| **Method**    | `GET`                                                   |
| **Path**      | `/api/v1/job-positions`                                 |
| **인증 필요** | ✅ (ADMIN)                                              |
| **사용 위치** | `src/features/jobPosition/api.ts` → `getJobPositions()` |

**응답 data.content[]**

| 필드            | 타입     | 설명                                      |
| --------------- | -------- | ----------------------------------------- |
| `jobPositionId` | `Long`   | 직급 번호                                 |
| `name`          | `string` | 직급명                                    |
| `sortOrder`     | `int`    | 정렬 순서 — **UNIQUE 아님, 겹칠 수 있다** |
| `employeeCount` | `int`    | 사용 인원 (시스템 계정 · 퇴사자 제외)     |

> ℹ️ 페이징 없음 · `sortOrder` 오름차순, 같으면 직급명 오름차순으로 내려온다 — 화면에서 다시 정렬하지 않는다.

---

## 27. 직급 생성

| 항목          | 내용                                                      |
| ------------- | --------------------------------------------------------- |
| **Method**    | `POST`                                                    |
| **Path**      | `/api/v1/job-positions`                                   |
| **인증 필요** | ✅ (ADMIN)                                                |
| **사용 위치** | `src/features/jobPosition/api.ts` → `createJobPosition()` |

**요청 Body**

| 필드        | 타입     | 필수 | 설명                         |
| ----------- | -------- | ---- | ---------------------------- |
| `name`      | `string` | ✅   | 최대 30자, 중복 불가         |
| `sortOrder` | `int`    | —    | 생략하면 **마지막 순서 + 1** |

**응답 data** (201) — `jobPositionId` · `name` · `sortOrder` · `employeeCount`(0)

| status | code                  | 화면 처리                  |
| ------ | --------------------- | -------------------------- |
| 400    | `POS_INVALID_REQUEST` | 직급명 빈값 · 30자 초과    |
| 409    | `POS_NAME_DUPLICATED` | 이름 입력 아래 인라인 에러 |

---

## 28. 직급 수정 (직급명 · 순서)

| 항목          | 내용                                                      |
| ------------- | --------------------------------------------------------- |
| **Method**    | `PATCH`                                                   |
| **Path**      | `/api/v1/job-positions/{jobPositionId}`                   |
| **인증 필요** | ✅ (ADMIN)                                                |
| **사용 위치** | `src/features/jobPosition/api.ts` → `updateJobPosition()` |

**요청 Body** — 전달한 필드만 수정된다

| 필드        | 타입     | 필수 | 설명      |
| ----------- | -------- | ---- | --------- |
| `name`      | `string` | —    | 최대 30자 |
| `sortOrder` | `int`    | —    | 정렬 순서 |

**응답 data** — 목록과 같은 구조

| status | code                  | 화면 처리                    |
| ------ | --------------------- | ---------------------------- |
| 400    | `POS_INVALID_REQUEST` | 수정할 필드 없음 · 형식 오류 |
| 404    | `POS_NOT_FOUND`       | 이미 삭제됨 — 목록 재조회    |
| 409    | `POS_NAME_DUPLICATED` | 이름 입력 아래 인라인 에러   |

> ℹ️ 직급명 수정과 순서 변경이 **같은 API** 다 (화면 메뉴는 둘로 나뉘어도).
> ℹ️ 순서 맞바꿈은 두 번 호출한다. `sortOrder` 가 UNIQUE 가 아니라 겹쳐도 오류가 나지 않으므로, 값이 같을 때는 `이웃값 ± 1` 로 넘긴다.

---

## 29. 직급 삭제

| 항목          | 내용                                                      |
| ------------- | --------------------------------------------------------- |
| **Method**    | `DELETE`                                                  |
| **Path**      | `/api/v1/job-positions/{jobPositionId}`                   |
| **인증 필요** | ✅ (ADMIN)                                                |
| **사용 위치** | `src/features/jobPosition/api.ts` → `deleteJobPosition()` |

**하드 삭제**다. 사용 인원이 있으면 먼저 사원의 직급을 바꾸거나 비워야 한다.

| status | code            | 화면 처리                                 |
| ------ | --------------- | ----------------------------------------- |
| 404    | `POS_NOT_FOUND` | 이미 삭제됨 — 목록 재조회                 |
| 409    | `POS_IN_USE`    | 삭제 차단 — 인원 수가 `message` 에 포함됨 |

> ℹ️ 목록의 `employeeCount` 로 미리 걸러도 **경합(그 사이 사원에게 배정)** 은 막을 수 없다. 409 를 반드시 처리한다.

---

## 30. 사원 목록 조회 (인사관리)

| 항목          | 내용                                              |
| ------------- | ------------------------------------------------- |
| **Method**    | `GET`                                             |
| **Path**      | `/api/v1/employees`                               |
| **인증 필요** | ✅ (ADMIN)                                        |
| **사용 위치** | `src/features/employee/api.ts` → `getEmployees()` |

**요청 Query**

| 파라미터        | 타입      | 설명                                       |
| --------------- | --------- | ------------------------------------------ |
| `keyword`       | `string`  | **이름 또는 사번** 부분 검색 (하나로 통합) |
| `departmentId`  | `Long`    | 부서 필터                                  |
| `role`          | `string`  | `MASTER` · `MEMBER`                        |
| `status`        | `string`  | `ACTIVE` · `RESET_REQUIRED` · `INACTIVE`   |
| `resigned`      | `boolean` | 미지정이면 **재직자만**                    |
| `page` / `size` | `int`     | 기본 0 / 20 (`size` 최대 200)              |

**응답 data** — 페이징

| 필드                                             | 타입      | 설명                                   |
| ------------------------------------------------ | --------- | -------------------------------------- |
| `content[].userId` / `.name`                     | `string`  | 사번 · 이름                            |
| `content[].email`                                | `string?` | 이메일 주소                            |
| `content[].emailRegistered`                      | `boolean` | `false` 면 로그인 불가 → ⚠ 미등록 배지 |
| `content[].departmentName` / `.departmentPath`   | `string?` | 부서명 · 2단 경로                      |
| `content[].jobPositionName`                      | `string?` | 직급명                                 |
| `content[].role`                                 | `string`  | `MASTER` · `MEMBER`                    |
| `content[].accountStatus`                        | `string`  | `ACTIVE` · `INACTIVE`                  |
| `content[].passwordStatus`                       | `string`  | `NORMAL` · `RESET_REQUIRED`            |
| `content[].resignedAt`                           | `string?` | 퇴사일 (`null` = 재직중)               |
| `page` / `size` / `totalElements` / `totalPages` | `int`     | 페이징 메타                            |

| status | code                    | 화면 처리             |
| ------ | ----------------------- | --------------------- |
| 400    | `EMP_INVALID_PARAMETER` | 허용되지 않는 필터 값 |

> ⚠️ 결재선 검색([35](#35-사원-이름-검색-결재선-지정용))과 **다른 API** 다 — 이건 ADMIN 전용 인사관리용.
> ℹ️ 상태 배지는 `accountStatus` + `passwordStatus` **두 원본을 프론트가 조합**한다.
> ℹ️ 시스템 계정은 어떤 조건으로도 나오지 않는다.
> ⚠️ 이름 정렬은 프론트에서 `localeCompare('ko')` 로 한다 — DB 콜레이션이 가나다 순이 아니다.

---

## 31. 사원 상세 조회

| 항목          | 내용                                             |
| ------------- | ------------------------------------------------ |
| **Method**    | `GET`                                            |
| **Path**      | `/api/v1/employees/{userId}`                     |
| **인증 필요** | ✅ (ADMIN)                                       |
| **사용 위치** | `src/features/employee/api.ts` → `getEmployee()` |

**응답 data** — 목록 필드 + 아래

| 필드                             | 타입       | 설명                           |
| -------------------------------- | ---------- | ------------------------------ |
| `departmentId` / `jobPositionId` | `Long?`    | 수정 폼 초기값                 |
| `phone`                          | `string?`  | 연락처                         |
| `hiredAt`                        | `string?`  | 입사일 `yyyy-MM-dd`            |
| `lastLoginAt`                    | `string?`  | 마지막 로그인                  |
| `groups[]`                       | `Object[]` | 소속 그룹 — `groupId` · `name` |

| status | code                             | 화면 처리                 |
| ------ | -------------------------------- | ------------------------- |
| 403    | `ACC_SYSTEM_ACCOUNT_NOT_ALLOWED` | 시스템 계정 대상          |
| 404    | `EMP_NOT_FOUND`                  | 사원 없음(삭제 사원 포함) |

---

## 32. 사원 등록 (계정 동시 발급)

| 항목          | 내용                                                |
| ------------- | --------------------------------------------------- |
| **Method**    | `POST`                                              |
| **Path**      | `/api/v1/employees`                                 |
| **인증 필요** | ✅ (ADMIN)                                          |
| **사용 위치** | `src/features/employee/api.ts` → `createEmployee()` |

**요청 Body**

| 필드            | 타입     | 필수 | 설명                             |
| --------------- | -------- | ---- | -------------------------------- |
| `userId`        | `string` | ✅   | 사번 = 로그인 아이디 (불변)      |
| `name`          | `string` | ✅   | 이름                             |
| `departmentId`  | `Long`   | ✅   | 부서 ID                          |
| `hiredAt`       | `string` | ✅   | 입사일 `yyyy-MM-dd`              |
| `role`          | `string` | ✅   | `MASTER` · `MEMBER` (ADMIN 불가) |
| `jobPositionId` | `Long`   | —    | 직급 ID                          |
| `email`         | `string` | —    | 초기 비밀번호를 이 주소로 발송   |
| `phone`         | `string` | —    | 연락처                           |

**응답 data** (201) — `userId` · `name` · `emailRegistered` · `emailSent`

| status | code                         | 화면 처리                         |
| ------ | ---------------------------- | --------------------------------- |
| 400    | `EMP_INVALID_REQUEST`        | 필수값 누락 · 형식 오류           |
| 400    | `EMP_ADMIN_ROLE_NOT_ALLOWED` | `role` 에 ADMIN — 셀렉트에서 제외 |
| 404    | `EMP_DEPARTMENT_NOT_FOUND`   | 부서 없음 — 셀렉트 재조회         |
| 404    | `EMP_JOB_POSITION_NOT_FOUND` | 직급 없음 — 셀렉트 재조회         |
| 409    | `EMP_USER_ID_DUPLICATED`     | 사번 입력 아래 인라인 에러        |

> ℹ️ 계정이 **항상 함께** 발급된다 — 사원만 등록하는 경로가 없다.
> ⚠️ 메일 발송이 실패해도 201 이며 `emailSent: false` 로 온다 — 재설정([21](#21-비밀번호-재설정-개인--다중-공용))으로 재발송해야 한다.
> ℹ️ 이메일이 없어도 등록되지만 그 계정은 로그인할 수 없다.

---

## 33. 사원 정보 수정

| 항목          | 내용                                                |
| ------------- | --------------------------------------------------- |
| **Method**    | `PATCH`                                             |
| **Path**      | `/api/v1/employees/{userId}`                        |
| **인증 필요** | ✅ (ADMIN)                                          |
| **사용 위치** | `src/features/employee/api.ts` → `updateEmployee()` |

**요청 Body** — 전달한 필드만 수정된다

| 필드                             | 타입     | 설명                                  |
| -------------------------------- | -------- | ------------------------------------- |
| `name` · `phone` · `email`       | `string` | `name` 은 빈값 불가                   |
| `departmentId` · `jobPositionId` | `Long`   | **명시적 `null` = 미지정으로 클리어** |
| `hiredAt`                        | `string` | `yyyy-MM-dd`                          |

**응답 data** — 사원 상세와 같은 구조

| status | code                                                                        | 화면 처리                    |
| ------ | --------------------------------------------------------------------------- | ---------------------------- |
| 400    | `EMP_INVALID_REQUEST`                                                       | 형식 오류 · 수정할 필드 없음 |
| 403    | `ACC_SYSTEM_ACCOUNT_NOT_ALLOWED`                                            | 시스템 계정 대상             |
| 404    | `EMP_NOT_FOUND` · `EMP_DEPARTMENT_NOT_FOUND` · `EMP_JOB_POSITION_NOT_FOUND` | 대상 재조회                  |

> ⚠️ **사번 · 전역 권한은 이 API 로 못 바꾼다** — 사번은 불변(PK), 권한은 [19](#19-전역-권한-변경).
> ℹ️ 부서 배정은 별도 API 가 아니라 `departmentId` 전송으로 처리한다.
> ℹ️ `jobPositionId: null` = 직급 삭제, **필드 생략 = 변경 안 함**. 둘을 구분해야 한다.

---

## 34. 퇴사 처리

| 항목          | 내용                                                |
| ------------- | --------------------------------------------------- |
| **Method**    | `PATCH`                                             |
| **Path**      | `/api/v1/employees/{userId}/resignation`            |
| **인증 필요** | ✅ (ADMIN)                                          |
| **사용 위치** | `src/features/employee/api.ts` → `resignEmployee()` |

**요청 Body** — `resignedAt` (✅, 퇴사일 `yyyy-MM-dd`)

**응답 data** — `userId` · `resignedAt` · `accountStatus`(`INACTIVE`)

| status | code                             | 화면 처리        |
| ------ | -------------------------------- | ---------------- |
| 400    | `EMP_INVALID_REQUEST`            | 형식 오류        |
| 400    | `EMP_ALREADY_RESIGNED`           | 이미 퇴사 처리됨 |
| 403    | `ACC_SYSTEM_ACCOUNT_NOT_ALLOWED` | 시스템 계정 대상 |
| 404    | `EMP_NOT_FOUND`                  | 사원 없음        |

> ⚠️ 퇴사일 기록 + 계정 `INACTIVE` 를 **한 번에** 처리한다 — 계정 상태 변경 API([20](#20-계정-상태-변경))를 따로 부르지 않는다.
> ℹ️ 사원 정보는 삭제되지 않는다. 과거 프로젝트 · 파일 이력에 이름이 남는다.

---

## 35. 사원 이름 검색 (결재선 지정용)

| 항목          | 내용                                          |
| ------------- | --------------------------------------------- |
| **Method**    | `GET`                                         |
| **Path**      | `/api/v1/employees/search`                    |
| **인증 필요** | ✅ (로그인 사용자 전체 — **ADMIN 전용 아님**) |
| **사용 위치** | ✅ `features/employee/api.ts` — `EmployeeSearchInput` |

**요청 Query** — `name` (✅, 이름 부분 일치)

**응답 data[]** — **배열** (`content` 래퍼 없음)

| 필드         | 타입      | 설명                     |
| ------------ | --------- | ------------------------ |
| `userId`     | `string`  | 사번                     |
| `name`       | `string`  | 이름                     |
| `department` | `string?` | 부서명 (동명이인 구분용) |
| `position`   | `string?` | 직급명 (동명이인 구분용) |

| status | code                    | 화면 처리                            |
| ------ | ----------------------- | ------------------------------------ |
| 400    | `EMP_INVALID_PARAMETER` | `name` 누락 — 빈 입력이면 호출 안 함 |

> ℹ️ 시스템 계정 · 퇴사자는 후보에 나오지 않으며, 결과가 없으면 빈 배열(`[]`).
> ℹ️ 급여 등 민감 정보 없이 위 4개 필드만 반환한다.

---

## 파일 도메인 — 공통

계약 원본은 백엔드 `.ai/api/file.md` 이고 이 문서와 다르면 **구현이 맞다.**
엔드포인트 12개 중 9개가 구현·실기동 검증 완료(2026-08-06, `PR #190` 머지 대기)다.

| 항목          | 내용                                                                                                           |
| ------------- | -------------------------------------------------------------------------------------------------------------- |
| **권한**      | ⚠️ **파일 단위 권한이 없다.** 스텝 권한을 그대로 따른다 — `VIEWER`=조회·다운로드, `EDITOR`=업로드·수정·삭제    |
| **소유 구조** | ⚠️ 파일은 **프로젝트 소속**이고 블록은 참조만 한다. 블록을 지워도 파일은 산다                                  |
| **저장소**    | S3 presigned URL — 클라이언트가 직접 `PUT`/`GET`. 서버는 바이너리를 거치지 않는다 (업로드 10분 · 다운로드 5분) |
| **제약**      | 50MB 이하 · 실행파일 확장자 차단 · 미리보기는 **PDF 만**, 서버가 앞 5페이지를 잘라 반환                        |

> ℹ️ 코드 상수는 `src/features/file/errorCodes.ts`. 분기는 status 가 아니라 **`code`** 로 한다.
> ⏸ **미룬 것 3개** — 휴지통 복구(`POST /files/{fileId}/restore`) · 영구 삭제(`POST /files/{fileId}/permanent-deletion`) · AI 분석용 버전 목록(`GET /blocks/{blockId}/file-versions`). 휴지통 화면 · AI 경계 확정 후.

---

## 36. 블록 파일 목록 조회

| 항목          | 내용                                           |
| ------------- | ---------------------------------------------- |
| **Method**    | `GET`                                          |
| **Path**      | `/api/v1/blocks/{blockId}/files`               |
| **인증 필요** | ✅ (스텝 `VIEWER`)                             |
| **사용 위치** | `src/features/file/api.ts` → `getBlockFiles()` |

**요청 Query** — `deleted` (선택, `true` 면 휴지통. 기본 `false`)

**응답 data** — `blockId` · `canEdit`(버튼 노출 기준) · `content[]`

| 필드                                                       | 설명                          |
| ---------------------------------------------------------- | ----------------------------- |
| `fileId` · `name`                                          | 문서 ID · 표시명              |
| `latestVersionId` · `latestVersionNo` · `versionCount`     | 최신 버전 · 총 버전 수        |
| `originalFileName` · `extension` · `sizeBytes`             | 원본 파일 정보                |
| `previewable`                                              | PDF 만 `true`                 |
| `uploaderName` · `uploaderDepartment` · `uploaderPosition` | 업로더 **스냅샷**             |
| `updatedAt` · `deletedAt`                                  | 갱신일 · 휴지통이면 값이 있다 |

| status | code                              | 화면 처리           |
| ------ | --------------------------------- | ------------------- |
| 403    | `FILE_ACCESS_PERMISSION_REQUIRED` | 스텝 열람 권한 없음 |
| 404    | `FILE_BLOCK_NOT_FOUND`            | 블록 없음 · 삭제됨  |

> ℹ️ **상세 ID 가 필요 없다** — 체크리스트(`chkBlockId`) · 텍스트(`txtId`)와 달리 `blockId` 로 바로 조회한다.
> ℹ️ 완료 버전이 0개인 문서는 목록에서 제외되고, 정렬은 블록 연결일 오름차순이다.

---

## 37. 파일 업로드 시작

| 항목          | 내용                                         |
| ------------- | -------------------------------------------- |
| **Method**    | `POST`                                       |
| **Path**      | `/api/v1/files/uploads`                      |
| **인증 필요** | ✅ (스텝 `EDITOR`)                           |
| **사용 위치** | `src/features/file/api.ts` → `startUpload()` |

**요청 Body**

```ts
{
  blockId: number;            // ✅
  originalFileName: string;   // ✅ 확장자 포함
  sizeBytes: number;          // ✅ 50MB 이하
  mimeType?: string;
  name?: string;              // 표시명. 생략 시 확장자 뗀 원본명
  fileId?: number;            // 주면 그 문서의 새 버전, 없으면 새 문서(v1)
  comment?: string;
  allowDuplicateName?: boolean; // 동명 확인 후 재요청 시 true
}
```

**응답 data (201)** — `fileId` · `fileVersionId` · `versionNo` · `uploadUrl` · `expiresAt`

| status | code                            | 화면 처리                                     |
| ------ | ------------------------------- | --------------------------------------------- |
| 400    | `FILE_SIZE_EXCEEDED`            | 50MB 초과                                     |
| 400    | `FILE_EXTENSION_BLOCKED`        | 실행 파일 확장자                              |
| 403    | `FILE_EDIT_PERMISSION_REQUIRED` | 스텝 편집 권한 없음                           |
| 404    | `FILE_BLOCK_NOT_FOUND`          | 블록 없음 · 삭제됨                            |
| 409    | `FILE_NAME_DUPLICATED`          | **확인 후 `allowDuplicateName: true` 재요청** |

> ⚠️ **새 문서와 새 버전이 같은 API 다.** `fileId` 유무로 갈린다.
> ⚠️ 409 는 실패가 아니라 **확인 요청**이다 — `DuplicateNameError` 로 분리해 확인 모달을 띄운다.

---

## 38. 업로드 완료 통보

| 항목          | 내용                                             |
| ------------- | ------------------------------------------------ |
| **Method**    | `POST`                                           |
| **Path**      | `/api/v1/files/uploads/{fileVersionId}/complete` |
| **인증 필요** | ✅ (스텝 `EDITOR`)                               |
| **사용 위치** | `src/features/file/api.ts` → `completeUpload()`  |

**요청 Body** — `checksum` (선택, 보내면 서버가 대조)

**응답 data** — `fileId` · `fileVersionId` · `versionNo` · `name` · `originalFileName` · `extension` · `sizeBytes` · `pageCount` · `comment` · 업로더 3필드 · `completedAt`

| status | code                     | 화면 처리                           |
| ------ | ------------------------ | ----------------------------------- |
| 400    | `FILE_ALREADY_COMPLETED` | 이미 완료된 버전                    |
| 409    | `FILE_OBJECT_NOT_FOUND`  | 저장소에 객체 없음 — 버전 실패 처리 |
| 409    | `FILE_SIZE_MISMATCH`     | 크기 · 체크섬 불일치                |

> ❗ **이 호출이 빠지면 버전이 `업로드중` 으로 남아 목록에 나오지 않는다.** 서버가 저장소를 직접 `HEAD` 로 확인하고 업로더 정보를 이 시점에 확정한다.
> ℹ️ 업로드는 **3단계**다 — 37 발급 → presigned `PUT` → 38 통보. 중간 실패를 되돌리는 API 가 없어 프론트가 끊긴 지점(`stage`)을 안내한다.

---

## 39. 문서명 수정

| 항목          | 내용                                        |
| ------------- | ------------------------------------------- |
| **Method**    | `PATCH`                                     |
| **Path**      | `/api/v1/files/{fileId}`                    |
| **인증 필요** | ✅ (스텝 `EDITOR`)                          |
| **사용 위치** | `src/features/file/api.ts` → `renameFile()` |

**요청 Body** — `name` (✅, 최대 255자)
**응답 data** — `fileId` · `name`

| status | code                            | 화면 처리               |
| ------ | ------------------------------- | ----------------------- |
| 400    | `FILE_INVALID_REQUEST`          | 비었거나 255자 초과     |
| 403    | `FILE_EDIT_PERMISSION_REQUIRED` | 스텝 편집 권한 없음     |
| 404    | `FILE_NOT_FOUND`                | 문서 없음 · 이미 휴지통 |

> ℹ️ **표시명만** 바뀐다. 각 버전에 저장된 원본 파일명은 그대로다.

---

## 40. 휴지통으로 이동

| 항목          | 내용                                       |
| ------------- | ------------------------------------------ |
| **Method**    | `DELETE`                                   |
| **Path**      | `/api/v1/files/{fileId}`                   |
| **인증 필요** | ✅ (스텝 `EDITOR`)                         |
| **사용 위치** | `src/features/file/api.ts` → `trashFile()` |

**응답 data** — `fileId` · `deletedAt`

| status | code                            | 화면 처리                                        |
| ------ | ------------------------------- | ------------------------------------------------ |
| 400    | `FILE_ALREADY_DELETED`          | 이미 휴지통                                      |
| 403    | `FILE_EDIT_PERMISSION_REQUIRED` | 스텝 편집 권한 없음                              |
| 409    | `FILE_APPROVAL_IN_PROGRESS`     | **진행 중 결재의 대상** — `message` 에 결재 정보 |

> ℹ️ soft delete — 저장소 객체는 지우지 않아 복구할 수 있다.
> ⚠️ 409 의 `message` 에 어떤 결재가 막고 있는지 실려 오므로 **그대로 노출**한다.

---

## 41. 버전 이력 조회

| 항목          | 내용                                             |
| ------------- | ------------------------------------------------ |
| **Method**    | `GET`                                            |
| **Path**      | `/api/v1/files/{fileId}/versions`                |
| **인증 필요** | ✅ (스텝 `VIEWER`)                               |
| **사용 위치** | `src/features/file/api.ts` → `getFileVersions()` |

**응답 data** — `fileId` · `name` · `versionCount` · `content[]`
(`fileVersionId` · `versionNo` · `latest` · `originalFileName` · `extension` · `sizeBytes` · `pageCount` · `previewable` · `comment` · 업로더 3필드 · `completedAt`)

| status | code                              | 화면 처리           |
| ------ | --------------------------------- | ------------------- |
| 403    | `FILE_ACCESS_PERMISSION_REQUIRED` | 스텝 열람 권한 없음 |
| 404    | `FILE_NOT_FOUND`                  | 문서 없음 · 휴지통  |

> ℹ️ **append-only 조회 전용** — 버전 삭제 · 되돌리기가 없다. 실패한 버전은 제외되고 차수 내림차순이다.
> ℹ️ 업로더 정보는 스냅샷이라 퇴사 · 부서이동해도 당시 값이 남는다.

---

## 42. 다운로드 URL 발급

| 항목          | 내용                                             |
| ------------- | ------------------------------------------------ |
| **Method**    | `GET`                                            |
| **Path**      | `/api/v1/file-versions/{fileVersionId}/download` |
| **인증 필요** | ✅ (스텝 `VIEWER`)                               |
| **사용 위치** | `src/features/file/api.ts` → `getDownloadUrl()`  |

**응답 data** — `fileVersionId` · `originalFileName` · `sizeBytes` · `downloadUrl`(presigned, 5분) · `expiresAt`

| status | code                              | 화면 처리                 |
| ------ | --------------------------------- | ------------------------- |
| 403    | `FILE_ACCESS_PERMISSION_REQUIRED` | 스텝 열람 권한 없음       |
| 404    | `FILE_VERSION_NOT_FOUND`          | 버전 없음 · 문서가 휴지통 |
| 409    | `FILE_UPLOAD_NOT_COMPLETED`       | 업로드 미완료 버전        |

> ℹ️ 바이너리가 아니라 **URL** 이 온다. 받은 URL 을 새 탭으로 넘긴다.

---

## 43. 미리보기 조회 (PDF 바이너리)

| 항목          | 내용                                            |
| ------------- | ----------------------------------------------- |
| **Method**    | `GET`                                           |
| **Path**      | `/api/v1/file-versions/{fileVersionId}/preview` |
| **인증 필요** | ✅ (스텝 `VIEWER`)                              |
| **사용 위치** | `src/features/file/api.ts` → `getPreview()`     |

**응답** — ⚠️ **JSON 이 아니라 잘라낸 PDF 바이너리다.**

| 응답 헤더              | 설명                    |
| ---------------------- | ----------------------- |
| `Content-Type`         | `application/pdf`       |
| `X-Preview-Page-Count` | 실제로 보낸 페이지 (≤5) |
| `X-Total-Page-Count`   | 원본 전체 페이지        |

| status | code                              | 화면 처리                       |
| ------ | --------------------------------- | ------------------------------- |
| 403    | `FILE_ACCESS_PERMISSION_REQUIRED` | 스텝 열람 권한 없음             |
| 404    | `FILE_VERSION_NOT_FOUND`          | 버전 없음 · 문서가 휴지통       |
| 409    | `FILE_PREVIEW_NOT_SUPPORTED`      | **PDF 가 아님** — 다운로드 안내 |
| 409    | `FILE_UPLOAD_NOT_COMPLETED`       | 업로드 미완료 버전              |
| 500    | `FILE_PREVIEW_FAILED`             | PDF 처리 실패                   |

> ⚠️ **본문이 우리 봉투가 아닌 유일한 API** 다. presigned 를 주면 전체 PDF 에 접근돼 "최대 5페이지" 제한이 무의미해지므로 서버가 직접 잘라 반환한다.
> ℹ️ 그래서 `src/lib/api.ts` 에 `requestRaw()` 를 뒀다 — 성공 시 `Response` 를 그대로 주고, 실패는 JSON 실패 봉투로 오므로 다른 API 와 똑같이 처리한다.

---

## 44. 블록 배치 변경

| 항목          | 값                                                  |
| ------------- | --------------------------------------------------- |
| **Method**    | `PATCH`                                             |
| **Path**      | `/api/v1/steps/{stepId}/blocks/layout`              |
| **인증 필요** | ✅ (스텝 `EDITOR`)                                  |
| **요구사항**  | BLK-003 · BLK-004                                   |
| **사용 위치** | `src/features/block/api.ts` → `updateBlockLayout()` |

**Path Parameter** — `stepId` (`Long`, 필수)

**Request Body**

```ts
interface UpdateBlockLayoutRequest {
  layouts: {
    blockId: number; // 필수
    rowIndex: number; // 필수 — 행 인덱스
    sortOrder: number; // 필수 — 행 내 순서
    colSpan: number; // 필수 — 열 병합 수 1~3
  }[];
}
```

**응답 data** — `{ blocks: [...] }` 로 반영된 배치가 요청과 같은 모양으로 온다.

| status | code                     | 화면 처리                                     |
| ------ | ------------------------ | --------------------------------------------- |
| 400    | `BLOCK_COL_SPAN_INVALID` | 우리 요청이 잘못된 경우 — 새로고침 안내로 통일 |
| 400    | `BLOCK_LAYOUT_INVALID`   | 위와 동일 (백엔드 상세 문구는 노출하지 않음)  |
| 401    | `AUTH_TOKEN_EXPIRED`     | 로그인 화면으로 이동                          |
| 403    | `STEP_EDIT_DENIED`       | **`/forbidden` 아님** — 보드에 안내 후 되돌림 |
| 404    | `BLOCK_NOT_FOUND`        | 새로고침 안내 후 되돌림                       |

> ℹ️ **요청의 `layouts[]`에 포함된 `blockId`만 수정한다.** 요청에 없는 블록의 배치는 유지되며 삭제되지 않는다. FE는 영향받은 행·블록만 보내도 된다.
> ℹ️ **총 열 수는 3 고정**(BLK-003)이고 `UNIQUE(step_id,row_index,sort_order)` 가 없어 드래그 중간의 좌표 중복이 허용된다(BLK-004).
> ℹ️ **호출은 마지막 이동 후 0.8초 조용할 때 한 번만 한다** (`useLayoutSaver.ts`). 연달아 옮기면 타이머만 밀리고, 결과 배치가 마지막으로 저장된 것과 같으면(옮겼다 되돌린 경우) **요청 자체를 보내지 않는다**. 화면을 떠날 때는 대기 중인 배치를 즉시 흘려보낸다.
> ⚠️ **동시에 두 개를 띄우지 않는다.** 앞 요청이 끝나야 다음이 나간다 — 서버가 처리 순서를 보장하지 않아, 겹쳐 보내면 **옛 배치가 최종 상태로 남을 수 있다**.
> ⚠️ **블록 생성 직전 · 탭을 벗어나기 직전에는 대기 중인 배치를 먼저 보낸다** (`onBeforeCreate` · `visibilitychange`). 탭을 옮기면 마지막 이동이 대기 상태로 남아 사라질 수 있다. 또 재조회로 목록이 갱신되면 세대를 올려, 늦게 도착한 저장 응답이 **새 목록을 덮지 않게** 막는다.
> ❗ **같은 블록이 여러 요청에 포함되면 마지막에 저장된 값이 남는다.** 서로 다른 블록만 포함한 요청은 독립적으로 반영되지만, 현재 FE가 스텝 전체 목록을 보내면 요청 범위가 겹쳐 다른 사용자의 변경을 덮을 수 있다. 충돌을 실제로 막으려면 블록별 **version 검증과 409**가 필요하고, 다른 사용자의 변경 감지는 폴링 또는 SSE가 별도로 담당한다.
> ℹ️ `rowIndex` · `sortOrder` 는 서버가 준 값을 재활용하지 않고 **화면에 그려진 행 기준으로 0부터 다시 매겨** 보낸다 (`blockLayout.ts` → `toLayouts()`). 보이는 배치와 저장되는 배치가 어긋나지 않는다.
> ℹ️ 응답으로 온 배치를 블록에 덮어쓴다 (`applyLayouts()`). 건너뛰면 다음 블록 생성이 옛 좌표로 자리를 잡는다.
> ℹ️ `STEP_EDIT_DENIED` 는 전역 403(`/forbidden`) 대상이 아니다 — `isPermissionCode` 에 넣지 않아 보드가 직접 안내한다.

---

## 45. 프로젝트 참여자 목록 조회

| 항목 | 값 |
| --- | --- |
| **Method** | `GET` |
| **Path** | `/api/v1/projects/{projectId}/members` |
| **권한** | 프로젝트 참여자 |
| **사용 위치** | `src/features/project/api.ts` → `getProjectMembers()` |

응답 `data` 는 `{ members: ProjectMember[] }` 이며 `memberId`, `userId`, `name`, nullable `department`, `permission`(`VIEWER`·`EDITOR`·`NONE`), `resigned` 를 담는다. 정렬은 이름 → 사번 오름차순이다.

## 46. 블록 수정

| 항목 | 값 |
| --- | --- |
| **Method** | `PATCH` |
| **Path** | `/api/v1/blocks/{blockId}` |
| **사용 위치** | `src/features/block/api.ts` → `updateBlock()` |

요청은 `title?: string | null`, `owner?: string | null` 이다. 보낸 필드만 반영하고, `null` 은 해제, 생략은 기존 값 유지다. 둘 다 생략하면 400이다. 응답은 `blockId`, nullable `title`, nullable `owner`(`userId`·`name`), `updatedAt` 을 담는다.

## 47. 블록 삭제

| 항목 | 값 |
| --- | --- |
| **Method** | `DELETE` |
| **Path** | `/api/v1/blocks/{blockId}` |
| **권한** | 스텝 `EDITOR` |
| **사용 위치** | `src/features/block/api.ts` → `deleteBlock()` |

soft delete만 지원하며 응답 `data` 는 `null` 이다. 입금 연결 입금확인, 계산서 연결 조회, 진행 중 결재, 결재 대상 파일은 삭제 잠금 대상으로 409를 반환한다.
---

## 결재 도메인 — 공통

| 항목            | 내용                                                                                                     |
| --------------- | -------------------------------------------------------------------------------------------------------- |
| **구조**        | **결재(`approvalId`) > 상신 회차(`revisionId`) > 결재선 · 결재 문서**                                     |
| **회차**        | 상신할 때마다 새로 만들어지고 **이전 회차는 덮어쓰지 않고 이력으로 남는다**                               |
| **상태**        | `DRAFT` · `IN_PROGRESS` · `REJECTED` · `COMPLETED` — 결재 전체와 회차가 같은 값을 쓴다                    |
| **편집 권한**   | 기안자만. 그것도 **`DRAFT` 회차에서만** — 상신된 회차는 제목 · 내용 · 문서 · 결재선 전부 잠긴다           |
| **조회 권한**   | 기안자 · 해당 회차 `ACTIVE` 이상 결재자(과거 이력 포함) · MASTER                                          |
| **블록 연결**   | 블록 목록 응답의 `detail.approvalId` · `detail.revisionId` — 없으면 블록이 안내만 띄운다                  |
| **코드 상수**   | `src/features/approval/errorCodes.ts`. 분기는 status 가 아니라 **`code`** 로 한다                        |

> ℹ️ 결재 대상은 파일이 아니라 **파일 버전**(`fileVersionId`)이다 (AP-010). 업로드 자체는 파일 도메인 소관이고 결재 API 는 연결만 한다.
> ℹ️ 결재선 등록은 `PUT` 이라 **전체 치환**이다. 한 명만 바꿔도 목록 전체를 보내야 하고, 빠뜨린 사람은 삭제된다.
> ⚠️ 일반 결재자는 프로젝트 `member` 여야 한다(AP-017). **MASTER · ADMIN 은 이 검증에서 제외**돼 프로젝트에 없어도 지정할 수 있다(AP-019).

### ❗ 결재 — 백엔드 확인 대기

| 항목                                                                | 막힌 기능                             | 이슈 |
| ------------------------------------------------------------------- | ------------------------------------- | ---- |
| **결재 문서 열람이 스텝 권한을 본다** (403 `FILE_ACCESS_PERMISSION_REQUIRED`) | 결재자의 문서 미리보기 · 다운로드 | #61  |
| 처리를 마친 결재를 다시 찾을 `scope` 가 없다                        | 승인 후 목록에서 사라짐               | #60  |

> ❗ **문서 열람 권한 축이 다르다.** 결재 상세는 `기안자 · ACTIVE 이상 결재자(과거 이력 포함) · MASTER` 로 판정하는데, 파일 API 는 **스텝 참여자**만 본다. 결재자 지정은 프로젝트 참여와 별개(AP-019)라, 프로젝트에 없는 MASTER 는 자기가 결재할 문서를 열 수 없다. 파일 API 도 결재 참여 기준을 함께 보도록 요청함.
>
> ❗ **`scope` 는 `drafted` · `pending` · `all` 뿐이다.** 일반 결재자가 승인·반려를 마치면 `pending` 에서 빠지고 `drafted` 에도 없어 목록에서 사라진다(상세는 URL 로 열림). `involved`(결재선에 포함된 결재 전체) 추가를 요청함 — 대기 결재자 노출 여부는 기획 확인 대기.

> ℹ️ **AP-026(마지막 결재자 = MASTER) 사전 검증은 하지 않는다** (2026-08-07 백엔드 협의 — `role` 추가 예정 없음). 결재선 응답에도 사원 검색 응답에도 `role` 이 없고, `approverPosition`("대표")은 회사가 바꿀 수 있는 직급명이라 판정 근거로 쓸 수 없다. 화면 안내 문구도 걷어냈고 위반은 상신 시 **서버 400 문구로만** 알린다.
>
> ⚠️ **명세(Swagger)와 실제 응답이 다른 곳이 많다.** 아래는 2026-08-07 실행으로 확인한 값 기준이다.
>
> | 항목                            | 명세                       | 실제                                                     |
> | ------------------------------- | -------------------------- | -------------------------------------------------------- |
> | 회차·결재 상세 `lines[]`        | 상태 없음                  | **`status` · `opinion` · `processedAt` 온다**            |
> | 회차·결재 상세 `documents[]`    | `documentId`·`fileVersionId` 뿐 | **`fileName` · `fileSize` · `uploadedAt` 온다**      |
> | 회차 상세 `finishedAt`          | 문자열 `"null"`            | 진짜 `null`                                              |
> | 목록 `content[]`                | 파일 버전 스키마           | 결재 스키마 (아래 61번)                                  |
> | 이력 `content[]`                | 사원 스키마                | 회차 요약 스키마 (아래 73번)                             |
>
> ℹ️ 의견 필드 이름은 **`opinion`** 이다 (`comment` 아님). 승인 · 반려 요청 body 와 같은 이름이다.

---

## 48. 결재 회차 상세조회

| 항목          | 내용                                                       |
| ------------- | ---------------------------------------------------------- |
| **Method**    | `GET`                                                      |
| **Path**      | `/api/v1/approvals/{approvalId}/revisions/{revisionId}`     |
| **인증 필요** | ✅ 기안자 · 해당 회차 `ACTIVE` 이상 결재자 · MASTER         |
| **사용 위치** | ✅ `features/approval/api.ts` — `getRevision()`             |

**응답 data**

| 필드                                        | 타입                | 설명                                  |
| ------------------------------------------- | ------------------- | ------------------------------------- |
| `revisionId` · `revisionNo`                 | `number`            | 회차 ID · 회차 번호(재상신마다 +1)    |
| `title` · `content`                         | `string \| null`    | 작성 전이면 null                      |
| `drafterId` · `drafterName`                 | `string`            | 기안자                                |
| `drafterDepartment` · `drafterPosition`     | `string \| null`    | 기안자 소속 · 직급                    |
| `status`                                    | `ApprovalStatus`    | 회차 상태                             |
| `submittedAt`                               | `string \| null`    | DRAFT 는 아직 상신 전이라 null        |
| `finishedAt`                                | `string \| null`    | ❗ 예시가 문자열 `"null"` — 확인 필요 |
| `documents[]`                               | `documentId` · `fileVersionId` | 회차에 확정된 결재 문서    |
| `lines[]`                                   | `lineId` · `approverId` · `approverName` · `approverPosition` · `approverDepartment` · `order` | 결재선 |

| status | code                                             | 화면 처리                                          |
| ------ | ------------------------------------------------ | -------------------------------------------------- |
| 403    | `APPROVAL_LINE_NOT_VIEWABLE`                     | **`/forbidden` 아님** — 화면 안에서 "차례 아님" 안내 |
| 404    | `APPROVAL_NOT_FOUND` · `APPROVAL_REVISION_NOT_FOUND` | 불러오지 못했다는 안내                          |

> ⚠️ `lines[]` 에 **처리 상태가 없다.** 진행 현황 스텝퍼는 값이 오면 칠하고 없으면 순서 · 이름만 그린다 — 없는 값을 완료로 추측하면 실제와 어긋난 화면이 된다.

---

## 49. 결재 제목 · 내용 수정

| 항목          | 내용                                                    |
| ------------- | ------------------------------------------------------- |
| **Method**    | `PATCH`                                                 |
| **Path**      | `/api/v1/approvals/{approvalId}/revisions/{revisionId}`  |
| **인증 필요** | ✅ 기안자                                                |
| **사용 위치** | ✅ `features/approval/api.ts` — `updateRevision()`       |

**요청 body** — `{ title?, content? }` · **보낸 필드만** 바뀐다 (둘 중 하나만 보내도 된다)

**응답 data** — `revisionId` · `title` · `content` · `updatedAt`

| status | code                          | 화면 처리                        |
| ------ | ----------------------------- | -------------------------------- |
| 403    | `APPROVAL_NOT_DRAFTER`        | 기안자만 수정할 수 있다는 안내   |
| 409    | `APPROVAL_REVISION_NOT_DRAFT` | 이미 상신된 회차 — 편집 잠금     |

> ℹ️ 프론트는 **블러 시점에 저장**한다. 직전에 보낸 값과 같으면 요청하지 않는다 (`ApprovalDraftForm`).

---

## 50. 재상신 회차 생성

| 항목          | 내용                                        |
| ------------- | ------------------------------------------- |
| **Method**    | `POST`                                      |
| **Path**      | `/api/v1/approvals/{approvalId}/revisions`   |
| **인증 필요** | ✅ 기안자                                    |
| **사용 위치** | ✅ `features/approval/api.ts` — `createRevision()` |

**응답 data** — `revisionId` · `revisionNo` · `status` · `copiedFromRevisionNo` · `title` · `content` · `documents[]` · `lines[]`

| status | code                    | 화면 처리                          |
| ------ | ----------------------- | ---------------------------------- |
| 200    | —                       | **이미 있는 DRAFT 회차를 그대로 반환(멱등)** |
| 201    | —                       | 새 회차 생성                       |
| 403    | `APPROVAL_NOT_DRAFTER`  | 기안자만 가능                      |
| 409    | `APPROVAL_NOT_REJECTED` | 반려 상태가 아닌 결재의 재상신 시도 |

> ⚠️ **멱등이다.** 이미 DRAFT 가 있으면 새로 만들지 않고 200 으로 돌려주므로 프론트가 중복 생성을 막을 필요가 없다.
> ℹ️ 이전 회차의 제목 · 내용 · 문서를 복사하고 **결재선은 반려자부터 재구성**해서 온다(AP-065·066) — 프론트가 다시 만들지 않는다.

---

## 51. 결재 상신

| 항목          | 내용                                                            |
| ------------- | --------------------------------------------------------------- |
| **Method**    | `POST`                                                          |
| **Path**      | `/api/v1/approvals/{approvalId}/revisions/{revisionId}/submit`   |
| **인증 필요** | ✅ 기안자                                                        |
| **사용 위치** | ✅ `features/approval/api.ts` — `submitRevision()`               |

**응답 data** — `approvalId` · `revisionId` · `revisionNo` · `status` · `submittedAt` · `firstActiveLineId`

| status | code                                | 화면 처리                              |
| ------ | ----------------------------------- | -------------------------------------- |
| 400    | `APPROVAL_CONTENT_REQUIRED`         | 제목 · 내용을 입력해주세요             |
| 400    | `APPROVAL_DOCUMENT_REQUIRED`        | 결재 문서를 한 개 이상 선택해주세요    |
| 400    | `APPROVAL_LINE_EMPTY`               | 결재자를 한 명 이상 지정해주세요       |
| 400    | `APPROVAL_LINE_ORDER_INVALID`       | 결재 순서가 중복되거나 비어 있습니다   |
| 400    | `APPROVAL_LINE_APPROVER_NOT_MEMBER` | 프로젝트에 없는 결재자가 있습니다      |
| 403    | `APPROVAL_NOT_DRAFTER`              | 기안자만 상신할 수 있다는 안내         |
| 409    | `APPROVAL_REVISION_NOT_DRAFT`       | 이미 상신됨 — **중복 상신 포함**       |

> ℹ️ **최초 상신 · 재상신 겸용**이다. 회차와 결재가 `IN_PROGRESS` 로, 1번 결재선이 `ACTIVE` 로 바뀐다.
> ℹ️ 서버가 제목 · 내용 · 문서 · 결재선을 전부 재검증하므로 **프론트 검증은 왕복을 줄이는 용도**다 (AP-022~026).

---

## 52. 결재 문서 추가

| 항목          | 내용                                                               |
| ------------- | ------------------------------------------------------------------ |
| **Method**    | `POST`                                                             |
| **Path**      | `/api/v1/approvals/{approvalId}/revisions/{revisionId}/documents`   |
| **인증 필요** | ✅ 기안자                                                           |
| **사용 위치** | ✅ `features/approval/api.ts` — `addDocument()`                     |

**요청 body** — `{ fileVersionId }`

**응답 data** — `documentId` · `fileVersionId` · `fileName` · `fileSize` · `uploadedAt`

| status | code                                            | 화면 처리                        |
| ------ | ----------------------------------------------- | -------------------------------- |
| 403    | `APPROVAL_NOT_DRAFTER`                          | 기안자만 가능                    |
| 404    | `FILE_VERSION_NOT_FOUND`                        | 없는 파일 버전                   |
| 409    | `FILE_VERSION_NOT_READY` · `DOCUMENT_ALREADY_LINKED` · `APPROVAL_REVISION_NOT_DRAFT` | 백엔드 문구 노출 |

> ⚠️ **업로드는 이 API 가 하지 않는다.** 공용 파일 API 로 먼저 올리고 받은 `fileVersionId` 만 연결한다 (`features/file/upload.ts`).
> ⚠️ `DOCUMENT_ALREADY_LINKED` 만 `APPROVAL_` 접두사가 없다 — 명세 그대로 둔다.

---

## 53. 결재 문서 제거

| 항목          | 내용                                                                            |
| ------------- | ------------------------------------------------------------------------------- |
| **Method**    | `DELETE`                                                                        |
| **Path**      | `/api/v1/approvals/{approvalId}/revisions/{revisionId}/documents/{documentId}`    |
| **인증 필요** | ✅ 기안자                                                                        |
| **사용 위치** | ✅ `features/approval/api.ts` — `removeDocument()`                               |

**응답** — `204 No Content`

| status | code                          | 화면 처리                    |
| ------ | ----------------------------- | ---------------------------- |
| 403    | `APPROVAL_NOT_DRAFTER`        | 기안자만 가능                |
| 404    | `APPROVAL_DOCUMENT_NOT_FOUND` | 이미 지워진 문서             |
| 409    | `APPROVAL_REVISION_NOT_DRAFT` | 상신된 회차의 문서는 못 지움 |

> ⚠️ **하드 삭제다.** 이력 보존 대상이 아니라 DRAFT 회차에서만 허용된다.

---

## 54. 결재선 등록 · 수정

| 항목          | 내용                                                           |
| ------------- | -------------------------------------------------------------- |
| **Method**    | `PUT`                                                          |
| **Path**      | `/api/v1/approvals/{approvalId}/revisions/{revisionId}/lines`   |
| **인증 필요** | ✅ 기안자                                                       |
| **사용 위치** | ✅ `features/approval/api.ts` — `setLines()`                    |

**요청 body** — `{ lines: [{ approverId, order }] }`

**응답 data** — `{ lines: [{ lineId, approverId, approverName, approverPosition, approverDepartment, order }] }`

| status | code                                | 화면 처리                                  |
| ------ | ----------------------------------- | ------------------------------------------ |
| 400    | `APPROVAL_LINE_APPROVER_NOT_MEMBER` | 프로젝트 member 가 아닌 결재자             |
| 403    | `APPROVAL_NOT_DRAFTER`              | 기안자만 가능                              |
| 409    | `APPROVAL_REVISION_NOT_DRAFT`       | 상신된 회차의 결재선은 잠김 (AP-021)       |

> ⚠️ **전체 치환이다.** 한 명 추가·제거해도 목록 전체를 보낸다. `order` 는 화면 순서대로 **1부터 다시 매겨** 보낸다 — 빈 번호가 생기면 400 이다.
> ℹ️ 결재자 선택은 [35. 사원 이름 검색](#35-사원-이름-검색-결재선-지정용)(`EmployeeSearchInput`)으로 한다.

---

## 이슈 도메인 — 공통

| 항목            | 내용                                                                                                       |
| --------------- | ---------------------------------------------------------------------------------------------------------- |
| **구조**        | **스텝(`stepId`) > 이슈(`issueId`) > 담당자(`issue_assign`) · 연결 블록(`issue_block`)**                    |
| **상태**        | `TODO` · `IN_PROGRESS` · `DONE` — 보드 3열이 그대로 이 값이다                                              |
| **우선순위**    | `LOW` · `MEDIUM` · `HIGH`                                                                                  |
| **완료 시각**   | `completedAt` 은 **사용자가 입력하지 않는다.** `DONE` 진입 시 서버가 찍고, 벗어나면 `null` 로 되돌린다     |
| **권한**        | 조회는 프로젝트 참여자 / 생성 · 수정 · 상태변경 · 삭제는 **스텝 `EDITOR`**                                 |
| **삭제**        | soft delete (`deleted_at`). 목록 · 상세 · 집계에서 제외된다                                                |
| **필터 · 정렬** | **서버가 하지 않는다.** 상태 · 담당자 · 블록 · 우선순위 · 제목 검색 · 마감일 정렬은 모두 프론트에서 처리   |
| **없는 것**     | 화면용 `issueKey`, 시작일, 이슈별 진척도, 이슈 활동 이력 — 응답에 없다. 화면에서 만들지 않는다             |

**Assignee** — `{ userId, name }` (`userId` 는 사번). 목록 응답 예시에 `profileImageUrl` 이 섞여 있지만 명세 표에 없어 쓰지 않는다.
**Related Block** — `{ blockId, title, type }`. `title` · `type` 은 표시용이라 요청 body 에 보내지 않는다.

## 55. 스텝별 이슈 목록 조회

| 항목          | 값                                                       |
| ------------- | -------------------------------------------------------- |
| **Method**    | `GET`                                                    |
| **Path**      | `/api/v1/steps/{stepId}/issues`                          |
| **권한**      | 프로젝트 참여자                                          |
| **사용 위치** | `src/features/issue/api.ts` → `getStepIssues()`          |

**Query** — `blockId?: number` (해당 블록과 연결된 이슈만)

**응답 data** — `{ issues: IssueSummary[] }`

| 필드            | 타입                                | 비고                    |
| --------------- | ----------------------------------- | ----------------------- |
| `issueId`       | number                              |                         |
| `title`         | string                              |                         |
| `status`        | `TODO`·`IN_PROGRESS`·`DONE`         |                         |
| `priority`      | `LOW`·`MEDIUM`·`HIGH`               |                         |
| `dueDate`       | `YYYY-MM-DD` \| null                | 미지정이면 `null`       |
| `assignees`     | `{ userId, name }[]`                |                         |
| `relatedBlocks` | `{ blockId, title, type }[]`        |                         |

> ℹ️ 목록에는 **`content` 가 없다.** 설명은 [57. 상세 조회](#57-이슈-상세-조회)로 받는다.
> ℹ️ 결과가 없으면 `200` + 빈 배열이다.
> ℹ️ 정렬은 `dueDate` 오름차순, **`null` 은 마지막**으로 프론트가 처리한다.
> ℹ️ 필터 선택지는 [45. 참여자 목록](#45-프로젝트-참여자-목록-조회) · [10. 블록 일괄 조회](#10-스텝-블록-일괄-조회) 를 쓴다.

## 56. 이슈 생성

| 항목          | 값                                              |
| ------------- | ----------------------------------------------- |
| **Method**    | `POST`                                          |
| **Path**      | `/api/v1/steps/{stepId}/issues`                 |
| **권한**      | 스텝 `EDITOR`                                   |
| **사용 위치** | `src/features/issue/api.ts` → `createIssue()`   |

**요청 body**

| 필드          | 타입             | 필수 | 비고                                             |
| ------------- | ---------------- | ---- | ------------------------------------------------ |
| `title`       | string           | ✅   | 공백 제외 필수, 최대 200자                       |
| `content`     | string \| null   | —    |                                                  |
| `dueDate`     | string           | —    | **`yyyy-MM-ddTHH:mm:ss`** (목록·수정과 형식이 다름) |
| `status`      | 상태 enum        | —    | 기본 `TODO`                                      |
| `priority`    | 우선순위 enum    | ✅   |                                                  |
| `assigneeIds` | string[]         | —    | 사번 목록. 생략 · `[]` 이면 연결 없음            |
| `blockIds`    | number[]         | —    | 생략 · `[]` 이면 연결 없음                       |

**응답** — `201` · 상세 조회(57번)와 **같은 구조**. `DONE` 으로 생성하면 `completedAt` 이 찍힌다.

> ⚠️ 생성만 `dueDate` 가 **날짜+시각**이고 수정(58)·조회(55·57)는 **날짜**다. 화면은 날짜만 받으므로 생성 시 `T00:00:00` 을 붙여 보낸다. (백엔드 확인 필요)
> ℹ️ 화면에서 시작일 · 완료 시각은 입력받지 않는다.

## 57. 이슈 상세 조회

| 항목          | 값                                          |
| ------------- | ------------------------------------------- |
| **Method**    | `GET`                                       |
| **Path**      | `/api/v1/issues/{issueId}`                  |
| **권한**      | 스텝 접근 권한                              |
| **사용 위치** | `src/features/issue/api.ts` → `getIssue()`  |

**응답 data** — 목록(55) 필드 + `stepId`, `content`(nullable), `completedAt`(nullable, `YYYY-MM-DDTHH:mm:ss`)

> ℹ️ 상태 버튼은 [59. 상태 변경](#59-이슈-상태-변경)을 호출한다.

## 58. 이슈 부분 수정

| 항목          | 값                                             |
| ------------- | ---------------------------------------------- |
| **Method**    | `PATCH`                                        |
| **Path**      | `/api/v1/issues/{issueId}`                     |
| **권한**      | 스텝 `EDITOR`                                  |
| **사용 위치** | `src/features/issue/api.ts` → `updateIssue()`  |

**요청 body** — 전달한 필드만 수정한다.

| 전달 방식              | 처리                                        |
| ---------------------- | ------------------------------------------- |
| 필드 미전달            | 기존 값 유지                                |
| `title`                | 전달 시 빈 값 불가, 최대 200자              |
| `content: null`        | 설명 삭제                                   |
| `dueDate: null`        | 마감일 해제 (값은 `YYYY-MM-DD`)             |
| `priority`             | 우선순위 변경                               |
| `assigneeIds: [...]`   | **최종 전체 목록**으로 동기화 (추가분 아님) |
| `blockIds: [...]`      | **최종 전체 목록**으로 동기화               |
| `assigneeIds: null`    | 400                                         |
| `blockIds: null`       | 400                                         |

**응답 data** — 상세 조회(57)와 같은 구조 (최신 상태)

> ⚠️ `status` · `completedAt` · `stepId` 는 이 API 로 바꾸지 않는다.
> ⚠️ `assigneeIds` 는 참여자 응답의 **`userId`** 를 쓴다. `memberId` 는 project_member 행 ID 라 담당자 값으로 쓰면 안 된다.
> ⚠️ `permission: NONE` 참여자를 담당자로 넣으면 참여자 검증에서 거절될 수 있다.
> ℹ️ 명세는 `blockIds` 선택지를 `GET /steps/{stepId}/blocks/options` 로 안내하지만 **그 절이 없다.** 프론트는 [10. 블록 일괄 조회](#10-스텝-블록-일괄-조회)(`blockId`·`title`·`type` 포함)를 쓴다. (백엔드 확인 필요)

## 59. 이슈 상태 변경

| 항목          | 값                                                  |
| ------------- | --------------------------------------------------- |
| **Method**    | `PATCH`                                             |
| **Path**      | `/api/v1/issues/{issueId}/status`                   |
| **권한**      | 스텝 `EDITOR`                                       |
| **사용 위치** | `src/features/issue/api.ts` → `updateIssueStatus()` |

**요청 body** — `{ status: 'TODO' | 'IN_PROGRESS' | 'DONE' }`
**응답 data** — `{ issueId, status, completedAt, updatedAt }`

| 변경 결과       | `completedAt` |
| --------------- | ------------- |
| `TODO`          | `null`        |
| `IN_PROGRESS`   | `null`        |
| `DONE`          | 현재 시각     |

> ℹ️ 같은 상태로 다시 보내면 아무것도 바꾸지 않고 현재 값을 돌려준다.
> ℹ️ 드래그는 **화면을 먼저 옮기고** 호출한다. 실패하면 원래 열로 되돌린다.
> ℹ️ 같은 열 안에서 순서만 바꾸는 것은 저장하지 않으므로 호출하지 않는다.

## 60. 이슈 삭제

| 항목          | 값                                            |
| ------------- | --------------------------------------------- |
| **Method**    | `DELETE`                                      |
| **Path**      | `/api/v1/issues/{issueId}`                    |
| **권한**      | 스텝 `EDITOR`                                 |
| **사용 위치** | `src/features/issue/api.ts` → `deleteIssue()` |

soft delete 이며 응답 `data` 는 `null` 이다. 담당자 · 블록은 삭제되지 않고 **연결만** 끊긴다. 이미 삭제된 이슈는 없는 이슈와 같게 처리된다.
---

## 61. 결재관리 목록조회

| 항목          | 내용                                          |
| ------------- | --------------------------------------------- |
| **Method**    | `GET`                                         |
| **Path**      | `/api/v1/approvals`                           |
| **인증 필요** | ✅ 로그인 사용자 전체                          |
| **사용 위치** | ✅ `features/approval/api.ts` — `getApprovals()` |

**요청 Query**

| 이름                       | 설명                                                       |
| -------------------------- | ---------------------------------------------------------- |
| `scope`                    | `drafted`(기본, 내가 기안) · `pending`(내 차례) · `all`     |
| `status`                   | 결재 상태                                                  |
| `drafterId` · `approverId` | 사번. ⚠️ **`scope=all` 에서만 적용된다**                    |
| `fromDate` · `toDate`      | `yyyy-MM-dd`                                               |
| `keyword`                  | 결재 제목 또는 프로젝트명                                  |
| `revisionNo`               | 현재 회차 번호                                             |
| `page` · `size`            | **0-based**, 기본 10                                       |

**응답 data** — `{ content[], totalElements, totalPages }` (사원 목록과 달리 `page` · `size` 가 없다)

| 필드                                    | 설명                                     |
| --------------------------------------- | ---------------------------------------- |
| `approvalId`                            | 상세 이동 키                             |
| `title` · `status` · `currentRevisionNo` | 행 제목 · 상태 배지 · 회차               |
| `drafterId` · `drafterName`             | 기안자                                   |
| `currentApproverId` · `currentApproverName` | 지금 차례인 결재자. 완료 · 반려면 null |
| `projectId` · `projectName` · `stepId` · `stepName` | `프로젝트 > Step` 경로 · 원본 이동 |
| `lines[]`                               | `approverId` · `approverName` · `order` · **`status`** |
| `createdAt` · `submittedAt` · `completedAt` | DRAFT 는 `submittedAt` 이 null       |

| status | code                            | 화면 처리                                       |
| ------ | ------------------------------- | ----------------------------------------------- |
| 403    | `APPROVAL_SCOPE_ALL_FORBIDDEN`  | MASTER · ADMIN 이 아닌 `scope=all` — 탭 자체를 감춰 사전 차단 |

> ⚠️ 목록의 `lines[]` 에는 **`lineId` 가 없다.** 승인 · 반려는 `lineId` 가 필요하므로 상세를 거쳐야 한다.
> ℹ️ 진행 카운트(`1 / 3`)는 `lines[].status === 'APPROVED'` 를 세어 화면에서 만든다.

---

## 62. 결재 상세조회

| 항목          | 내용                                         |
| ------------- | -------------------------------------------- |
| **Method**    | `GET`                                        |
| **Path**      | `/api/v1/approvals/{approvalId}`             |
| **인증 필요** | ✅ 기안자 · 현재 회차 `ACTIVE` 이상 결재자 · MASTER |
| **사용 위치** | ✅ `features/approval/api.ts` — `getApproval()` |

**응답 data** — 회차 상세(48번)와 대부분 같고 차이는 아래 셋이다.

| 항목          | 결재 상세 (56)          | 회차 상세 (48)            |
| ------------- | ----------------------- | ------------------------- |
| 대상 회차     | **항상 현재 회차**      | 지정한 회차               |
| `blockOrigin` | ✅ `blockId` · `stepId` · `projectId` | ❌            |
| 상신 · 종료 일시 | ❌                   | ✅ `submittedAt` · `finishedAt` |

| status | code                         | 화면 처리                                          |
| ------ | ---------------------------- | -------------------------------------------------- |
| 403    | `APPROVAL_LINE_NOT_VIEWABLE` | **`/forbidden` 아님** — 화면 안에서 "차례 아님" 안내 |
| 404    | `APPROVAL_NOT_FOUND`         | 없는 결재                                          |

> ℹ️ **회차를 지정할 수 없다.** 이전 회차는 48번(회차 상세)으로 받는다.
> ℹ️ `blockOrigin` 으로 `원본 블록 보기`(AP-079)를 만든다 — `/projects/{projectId}/steps/{stepId}`.

---

## 63. 결재 승인

| 항목          | 내용                                           |
| ------------- | ---------------------------------------------- |
| **Method**    | `POST`                                         |
| **Path**      | `/api/v1/approval-lines/{lineId}/approve`      |
| **인증 필요** | ✅ 그 결재선의 결재자 본인, `ACTIVE` 상태일 때만 |
| **사용 위치** | ✅ `features/approval/api.ts` — `approveLine()` |

**요청 body** — `{ opinion?: string }` (선택, AP-042)

**응답 data** — `lineId` · `status` · `processedAt` · `nextActiveLineId` · `approvalCompleted`

| status | code                               | 화면 처리                      |
| ------ | ---------------------------------- | ------------------------------ |
| 403    | `APPROVAL_LINE_FORBIDDEN`          | 그 결재선의 결재자가 아님      |
| 409    | `APPROVAL_LINE_ALREADY_PROCESSED`  | 이미 처리된 결재선 (AP-040)    |

> ⚠️ **대상이 결재가 아니라 결재선(`lineId`)이다.** `lineId` 는 상세 응답의 `lines[]` 에서만 얻는다.
> ⚠️ **없는 `lineId` 도 403 으로 온다** — 404 가 아니라서 "없는 결재"와 "권한 없음"을 구분할 수 없다.
> ℹ️ `approvalCompleted: true` 면 마지막 순번이라 결재 전체가 완료된다 — 재조회 없이 화면을 완료로 바꿀 수 있다.

---

## 64. 결재 반려

| 항목          | 내용                                          |
| ------------- | --------------------------------------------- |
| **Method**    | `POST`                                        |
| **Path**      | `/api/v1/approval-lines/{lineId}/reject`      |
| **인증 필요** | ✅ 그 결재선의 결재자 본인, `ACTIVE` 상태일 때만 |
| **사용 위치** | ✅ `features/approval/api.ts` — `rejectLine()` |

**요청 body** — `{ opinion?: string }` (선택, AP-054)

**응답 data** — `lineId` · `status` · `processedAt`

| status | code                              | 화면 처리                   |
| ------ | --------------------------------- | --------------------------- |
| 403    | `APPROVAL_LINE_FORBIDDEN`         | 그 결재선의 결재자가 아님   |
| 409    | `APPROVAL_LINE_ALREADY_PROCESSED` | 이미 처리된 결재선          |

> ℹ️ 반려하면 이후 `WAITING` 단계가 전부 `CANCELED` 가 되고 회차 · 결재 전체가 `REJECTED` 로 끝난다 (AP-056~058).
> ℹ️ 기안자는 `수정`(재상신 회차 생성, 50번)으로 다시 진행한다.

---

## 65. 버전 단건 조회 (결재용)

| 항목          | 내용                                            |
| ------------- | ----------------------------------------------- |
| **Method**    | `GET`                                           |
| **Path**      | `/api/v1/file-versions/{fileVersionId}`         |
| **사용 위치** | ✅ `features/file/api.ts` — `getFileVersion()`   |

**응답 data** — 버전 이력의 한 줄에 아래 넷이 더 붙는다.

| 필드              | 설명                                                        |
| ----------------- | ----------------------------------------------------------- |
| `fileId` · `fileName` | 원본 문서                                               |
| `latest`          | **false 면 결재 이후 새 버전이 올라온 것** — 화면에 알린다  |
| `latestVersionNo` | 최신 버전 번호                                              |
| `fileDeleted`     | 원본이 휴지통에 있는지                                      |

| status | code                              | 화면 처리                    |
| ------ | --------------------------------- | ---------------------------- |
| 403    | `FILE_ACCESS_PERMISSION_REQUIRED` | 스텝 열람 권한 없음          |
| 404    | `FILE_VERSION_NOT_FOUND`          | 없는 버전                    |

> ℹ️ **문서가 휴지통에 있어도 반환된다** — 결재 이력이 남아야 하기 때문이다. 미리보기 · 다운로드(43·42번)는 휴지통이면 404 라 동작이 다르다.
> ℹ️ 결재 문서 뷰어(`ApprovalDocumentModal`)가 버전 번호 · 업로더 · `결재 이후 새 버전` 배너를 이 응답으로 그린다.

---

## 이미지 도메인 — 공통

이미지 블록의 내용은 **블록(`blockId`) > 이미지 블록(`imgBlockId`) > 이미지 항목(`imgId`)** 3단이다.
`imgBlockId` 는 10번 블록 목록 응답의 **`detail.imgBlockId`** 로 받는다 (체크리스트 · 텍스트와 같은 구조).

| 값           | 어디서 받나                       | 어디에 쓰나                            |
| ------------ | --------------------------------- | -------------------------------------- |
| `imgBlockId` | 10번 `detail.imgBlockId`          | 조회 · 생성 · 수정 · 다운로드 경로     |
| `imgId`      | 66 · 67 · 71번 응답               | 삭제 경로, 단일 다운로드 `?imgId=`     |
| `orderIndex` | 66 · 67 · 68 · 71번 응답 (1부터)  | 다음 · 이전 조회의 `currentOrderIndex` |

> ♿ **`altText`(선택) 를 이미지 응답에 넣어 주세요.** `caption` 은 화면에 보여 주는 문구, `originalName` 은 파일명이라 **이미지의 뜻**을 보장하지 않습니다. 스크린리더 사용자는 지금 캡션 · 파일명을 대신 듣습니다.
> 프론트는 `altText → caption → originalName → '이미지'` 순으로 떨어지도록 이미 받아 둔 상태입니다 (`imageAltText()`), 값만 내려오면 그대로 쓰입니다.
>
> ⚠️ **경로가 헷갈린다.** `PATCH /blocks/images/items/{...}` 는 **블록 ID**, `DELETE /blocks/images/items/{...}` 는 **항목 ID** 다. 모양만 같고 넣는 값이 다르다 — `src/constants/endpoints.ts` 에서 `imageItemsEdit` · `imageItem` 으로 분리해 두었다.

### ❗ 이미지 — 백엔드 확인 대기

| 항목                                                              | 막힌 기능 · 임시 처리                                             |
| ----------------------------------------------------------------- | ----------------------------------------------------------------- |
| `detail` 의 **첫 이미지 · 장수 키 이름** (첫 장 동봉은 확정)      | 세 가지 모양을 모두 읽는다 (10번 참고). 확정되면 한 분기만 남긴다  |
| `currentOrderIndex = 0` · `next` 가 **첫 장**을 주는지            | 업로드 직후 이동 · `detail` 이 비었을 때의 예비 경로가 이 가정이다 |
| 마지막 장에서 `next` (첫 장에서 `prev`) 가 순환인지 400 인지      | 프론트가 양 끝에서 버튼을 숨겨 아예 부르지 않는다                  |
| 편집 권한 플래그 (문서 블록의 `canEdit` 같은 값)                  | 지금은 모두에게 추가 · 수정 · 삭제 버튼을 보여주고 서버 403 에 맡김 |
| 캡션 최대 길이                                                    | 임시로 블록 제목과 같은 200자로 막는다                             |
| 68번 수정에서 **빠뜨린 이미지**가 삭제되는지 유지되는지          | 항상 전체 목록을 보낸다 (삭제는 69번으로 따로)                     |
| 이미지 용량 · 확장자 제한 (초안 문구는 10MB · JPG/PNG/GIF/WEBP)   | 프론트가 10MB · `image/jpeg,png,gif,webp` 로 먼저 거른다 — **서버도 같은 목록으로 독립 검증 필요** (SVG 는 스크립트를 품을 수 있다) |
| **`altText` 필드 추가 요청** — 이미지의 뜻을 담는 대체 텍스트     | 지금은 캡션 · 파일명으로 대신한다 (뜻을 보장하지 못한다). 아래 참고 |
| **삭제 + 순서/캡션을 한 번에 처리하는 API** 요청                  | 지금은 69번 여러 번 → 68번 순으로 나가 **중간에 끊기면 부분 반영**된다. 실패 시 71번으로 다시 읽어 화면을 맞춘다 |

---

## 66. 이미지 항목 조회 (한 장)

| 항목          | 내용                                                                  |
| ------------- | --------------------------------------------------------------------- |
| **Method**    | `GET`                                                                 |
| **Path**      | `/api/v1/blocks/images/{imgBlockId}/items/{currentOrderIndex}`        |
| **Query**     | `direction` = `prev` \| `next` (필수)                                 |
| **인증 필요** | ✅ (접근 권한 보유자)                                                 |
| **사용 위치** | `src/features/block/api.ts` → `getImageItem()` · `getAllImageItems()` |

**Response (200 OK)**

```ts
data: {
  imgId: number;
  originalName: string;   // 원본 파일명
  imageUrl: string;       // 저장소 URL — 그대로 <img src> 에 넣는다
  caption: string;
  orderIndex: number;     // 1부터
  totalCount: number;     // 블록 전체 장수
}
```

> ⚠️ **목록 조회가 아니다.** 한 번에 **한 장**만 온다. 캐러셀 좌우 이동마다 한 번씩 부른다.
> ℹ️ 전체 목록은 71번이 따로 있다. 다만 **71번은 편집 권한 전용**이라, 열람만 가능한 사용자의 캐러셀은 이 API 로만 넘긴다.
> ℹ️ **첫 장은 이 API 를 부르지 않는다** — 10번 블록 목록의 `detail` 로 함께 받는다. 여기는 **두 번째 장부터**다.
> ℹ️ 프론트는 받은 장을 `orderIndex` 로 캐싱해 되돌아올 때는 다시 부르지 않는다.
> ❗ 업로드 직후 이동과 `detail` 이 비었을 때의 예비 경로에서 **`currentOrderIndex = 0` · `next`** 를 쓴다 (정렬 번호가 1부터라 0 은 "아직 아무것도 안 봤다" 는 뜻). **이 동작 확인 필요.**
> ❗ 양 끝에서의 동작(순환 / 400)이 정해지지 않아 **서버에 순환을 요청하지 않는다.** 전체보기의 순환 이동은 프론트가 목표 장을 계산해 `{목표 정렬 번호 - 1}` 의 `next` 로 집어 온다 (카드 캐러셀은 양 끝에서 버튼을 감춘다).

---

## 67. 이미지 항목 생성

| 항목          | 내용                                             |
| ------------- | ------------------------------------------------ |
| **Method**    | `POST`                                           |
| **Path**      | `/api/v1/blocks/images/{imgBlockId}/items`       |
| **Content-Type** | `multipart/form-data`                         |
| **인증 필요** | ✅ (편집 권한 보유자)                            |
| **사용 위치** | `src/features/block/api.ts` → `createImageItems()` |

**Request Parts**

| 파트      | 타입         | 필수 | 내용                                                      |
| --------- | ------------ | ---- | --------------------------------------------------------- |
| `files`   | `File[]`     | ✅   | **화면에 정렬된 순서 그대로** — 첫 번째가 1번             |
| `request` | JSON (Blob)  | ⬜   | `{ "captions": ["회의실 전경", "", "화이트보드"] }`        |

**Response (201 Created)**

```ts
data: {
  imgBlockId: number;
  images: {
    imgId: number;
    originalName: string;
    imageUrl: string;
    caption: string;
    orderIndex: number;
    createdAt: string; // '2026-07-31T15:20:00'
  }[];
}
```

> ⚠️ `Content-Type` 헤더를 직접 넣지 않는다 — 브라우저가 `boundary` 를 채워야 한다 (`src/lib/api.ts` → `postForm()`).
> ℹ️ `captions` 는 `files` 와 **같은 순서 · 같은 길이**로 맞춘다. 캡션이 없으면 빈 문자열.
> ℹ️ 기존 이미지가 있으면 뒤에 붙는다 — 프론트는 응답의 첫 `orderIndex` 로 캐러셀을 옮긴다.

---

## 68. 이미지 순서 · 캡션 수정

| 항목          | 내용                                               |
| ------------- | -------------------------------------------------- |
| **Method**    | `PATCH`                                            |
| **Path**      | `/api/v1/blocks/images/items/{imgBlockId}`         |
| **인증 필요** | ✅ (편집 권한 보유자)                              |
| **사용 위치** | `src/features/block/api.ts` → `updateImageItems()` |

**Request Body**

```ts
{
  images: { imgId: number; caption: string | null }[]; // 정렬된 순서대로 전체
}
```

**Response (200 OK)**

```ts
data: {
  images: { imgId: number; orderIndex: number; caption: string }[];
}
```

> ⚠️ **경로 마지막 값이 항목 ID 가 아니라 블록 ID(`imgBlockId`)** 다. 69번 삭제와 경로 모양이 같아 헷갈리기 쉽다.
> ⚠️ 부분 수정이 아니라 **전체 치환**이다 — 배열 순서가 곧 새 `orderIndex` (1..N). 항상 전체를 보낸다.
> ℹ️ 보낼 전체 목록은 **71번**으로 받는다 (수정 모달을 열 때 1회).
> ⚠️ 응답에 `imageUrl` · `originalName` 이 없다. 프론트는 화면에 있던 값에 새 `orderIndex` 만 얹는다.
> ❗ 목록에서 **빠뜨린 이미지**의 처리(삭제 / 유지)가 확인되지 않았다. 삭제는 69번으로만 한다.

---

## 69. 이미지 항목 삭제

| 항목          | 내용                                              |
| ------------- | ------------------------------------------------- |
| **Method**    | `DELETE`                                          |
| **Path**      | `/api/v1/blocks/images/items/{imgId}`             |
| **인증 필요** | ✅ (편집 권한 보유자)                             |
| **사용 위치** | `src/features/block/api.ts` → `deleteImageItem()` |

**Response (200 OK)** — `data: null`

> ⚠️ 이쪽은 **항목 ID(`imgId`)** 다 (68번은 블록 ID).
> ℹ️ 삭제하면 뒷 장들의 `orderIndex` 가 당겨진다고 보고, 프론트는 지운 자리(마지막이었으면 앞 장)를 다시 조회한다.
> ℹ️ 수정 모달의 삭제는 표시만 해 두고 **저장할 때** 이 API 를 부른다 — 취소로 닫으면 아무것도 바뀌지 않아야 한다.

---

## 70. 이미지 다운로드

| 항목          | 내용                                                  |
| ------------- | ----------------------------------------------------- |
| **Method**    | `GET`                                                 |
| **Path**      | `/api/v1/blocks/images/{imgBlockId}/download`         |
| **Query**     | `imgId` (선택) — 없으면 **블록 전체를 zip** 으로 준다 |
| **인증 필요** | ✅ (접근 권한 보유자)                                 |
| **사용 위치** | `src/features/block/api.ts` → `downloadBlockImages()` |

**Response (200 OK)** — JSON 이 아니라 **파일 바이너리**

```
Content-Type: image/jpeg              또는  application/zip
Content-Disposition: attachment; filename="원본파일명.jpg"   또는  "블록명.zip"
```

> ⚠️ 문서 다운로드(42번)와 다르다 — presigned URL 이 아니라 **서버가 바이너리를 직접** 준다.
> ℹ️ 세션 쿠키가 필요해 `window.open` 으로 넘기지 않고 `requestRaw()` 로 blob 을 받아 앵커로 저장한다.
> ℹ️ 파일명은 `Content-Disposition` 에서 꺼낸다. 한글은 `filename*=UTF-8''...` 를 먼저 본다.
> ❗ zip 이름이 블록명이라 **블록 제목이 비어 있을 때** 무엇으로 오는지 확인 필요.

---

## 71. 이미지 항목 전체 조회

| 항목          | 내용                                             |
| ------------- | ------------------------------------------------ |
| **Method**    | `GET`                                            |
| **Path**      | `/api/v1/blocks/images/{imgBlockId}/items`       |
| **인증 필요** | ✅ (**편집 권한 보유자**)                        |
| **사용 위치** | `src/features/block/api.ts` → `getImageItems()`  |

**Response (200 OK)**

```ts
data: {
  totalCount: number;   // 활성 이미지 개수
  images: {             // orderIndex 오름차순
    imgId: number;
    originalName: string;
    imageUrl: string;
    caption: string;
    orderIndex: number;
  }[];
}
```

> ⚠️ **경로가 67번(생성)과 같다.** 메서드로만 갈린다 — `GET` 전체 조회 · `POST` 생성.
> ⚠️ **열람 전용 사용자는 못 부른다** (편집 권한 전용). 카드 캐러셀이 이 API 를 쓰지 않고 66번으로 한 장씩 받는 이유다.
> ℹ️ **수정 모달이 열릴 때 한 번** 부른다. 68번이 전체 치환이라 여기서 받은 목록을 그대로 되보낸다.
> ℹ️ 이 API 가 생기기 전에는 66번을 1번부터 `next` 로 걸어서 모았다 (`getAllImageItems`) — 지금은 제거했다.

---

## 활동 기록 도메인 — 공통

| 항목            | 내용                                                                                                     |
| --------------- | -------------------------------------------------------------------------------------------------------- |
| **구조**        | **스텝(`stepId`) > 블록(`blockId`) > 블록 내부 데이터(`resourceId`)**                                     |
| **문장 조립**   | ⚠️ **BE 는 완성된 문장을 주지 않는다.** 화면 조립에 필요한 원자 데이터만 온다                             |
| **대상 구분**   | `resource.resourceId == null` → `BLOCK` / `!= null` → `RESOURCE` (서버가 `targetType` 으로 계산해 준다)   |
| **표시명**      | `resource.name` 이 있으면 그 값, 없으면 `block.title` → `displayName` (활동 시점 **스냅샷**)              |
| **동작**        | DB 의 `create` · `modify` · `delete` → 응답은 `CREATE` · `MODIFY` · `DELETE`                              |
| **시간 표기**   | `오늘` · `어제` · 날짜 그룹, `14:32` · `2시간 전` 은 `createdAt` 기준으로 **프론트가** 만든다             |
| **블록 전용 API** | **없다.** 블록 활동 로그 팝업도 같은 경로에 `?blockId=` 를 붙여 쓴다                                    |
| **제외 대상**   | 이슈 생성 · 수정 · 상태 변경 · 삭제는 **기록 · 조회 대상이 아니다**                                       |

## 72. 스텝별 활동 기록 조회

| 항목          | 값                                                                |
| ------------- | ----------------------------------------------------------------- |
| **Method**    | `GET`                                                             |
| **Path**      | `/api/v1/steps/{stepId}/activity-logs`                            |
| **권한**      | 프로젝트 참여자                                                   |
| **사용 위치** | `src/features/activityLog/api.ts` → `getStepActivityLogs()`       |

**Query** — `blockId?: number` · `cursor?: number` (이전 응답의 `nextCursor`) · `size?: int` (기본 `20`)

**응답 data**

```ts
data: {
  activities: {
    activityLogId: number;
    action: 'CREATE' | 'MODIFY' | 'DELETE';
    targetType: 'BLOCK' | 'RESOURCE';
    displayName: string | null;   // resource.name ?? block.title
    fieldName: string | null;     // 수정 필드. 해당 없으면 null
    beforeValue: string | null;
    afterValue: string | null;
    resource: { resourceId: number | null; name: string | null };
    actor: { userId: string; name: string; profileImageUrl: string | null };
    block: { blockId: number; title: string | null; type: BlockTypeCode };
    createdAt: string;            // 'YYYY-MM-DDTHH:mm:ss' (타임존 표기 없음)
  }[];
  nextCursor: number | null;      // 없으면 null
  hasNext: boolean;
}
```

**`fieldName` 별 표시 규칙** — 화면이 값을 어떻게 그릴지 결정한다

| 방식             | 대상 필드                   | 처리                                        |
| ---------------- | --------------------------- | ------------------------------------------- |
| 펼치기           | `title` `content` `caption` | 접었다 펴서 before/after **전문** 표시      |
| 그대로 표시      | `orderIndex`                | 1부터 시작하는 위치 → `N번째 → M번째`       |
| 값 사전 매칭     | `isCompleted` `status`      | 아래 사전으로 바꿔 짧게 인라인 표시         |
| 변환 불필요      | `lines`                     | 사번이 아니라 **이름 CSV** 로 내려온다      |

| `fieldName`   | 값                                                                          | 표시                                                    |
| ------------- | --------------------------------------------------------------------------- | ------------------------------------------------------- |
| `isCompleted` | `true` · `false`                                                            | 완료 · 미완료                                           |
| `status`      | `DRAFT` `IN_PROGRESS` `ACTIVE` `WAITING` `APPROVED` `REJECTED` `COMPLETED` `CANCELED` | 초안 · 진행중 · 진행중 · 대기 · 승인 · 반려 · 완료 · 취소 |

> ℹ️ 결과가 없으면 `200` + `{ activities: [], nextCursor: null, hasNext: false }`.
> ℹ️ 화면 조립 — 윗줄 `actor.name` + `block.title` + `block.type`, 아랫줄 `displayName` + 동작.
> ℹ️ 필터 선택지는 [10. 블록 일괄 조회](#10-스텝-블록-일괄-조회) 로 받는다. 필터를 바꾸면 **목록 · 커서를 초기화**하고 다시 조회한다.
> ❗ 명세 예시의 `fieldName` 이 `completed` 인데 단어 사전은 `isCompleted` 다 — 실제로 무엇이 오는지 **확인 필요**. 지금은 두 이름 모두 받는다.
---

## 73. 결재 이력조회

| 항목          | 내용                                                     |
| ------------- | -------------------------------------------------------- |
| **Method**    | `GET`                                                    |
| **Path**      | `/api/v1/approvals/{approvalId}/revisions`                |
| **인증 필요** | ✅ 회차 상세와 같은 기준이되 **전체 회차를 통틀어** 판정   |
| **사용 위치** | ✅ `features/approval/api.ts` — `getRevisions()`           |

**응답 data** — `{ content: [] }` · **페이징이 없다** (`totalElements` · `totalPages` 도 없음)

| 필드          | 타입             | 설명                                        |
| ------------- | ---------------- | ------------------------------------------- |
| `revisionId`  | `number`         | 회차 ID — 회차 상세(48번) 조회에 쓴다       |
| `revisionNo`  | `number`         | 1부터. 재상신마다 +1                        |
| `status`      | `ApprovalStatus` | 회차 상태                                   |
| `submittedAt` | `string \| null` | DRAFT 회차는 상신 전이라 null               |
| `finishedAt`  | `string \| null` | 진행 중이면 null                            |
| `isCurrent`   | `boolean`        | 지금 살아 있는 회차 — 목록에 **하나만** true |

| status | code                         | 화면 처리                                            |
| ------ | ---------------------------- | ---------------------------------------------------- |
| 403    | `APPROVAL_LINE_NOT_VIEWABLE` | **`/forbidden` 아님** — 화면 안에서 권한 없음 안내    |
| 404    | `APPROVAL_NOT_FOUND`         | 불러오지 못했다는 안내                               |

> ⚠️ **회차 번호 오름차순**이다 (1회차가 먼저). 최신부터 보이려면 화면에서 뒤집는다.
> ⚠️ 응답에 제목 · 내용 · 결재선 · 문서가 **없다.** 고른 회차의 내용은 회차 상세(48번)를 따로 부른다.
> ℹ️ 현재 회차 판정은 `revisionNo` 최댓값이 아니라 **`isCurrent`** 로 한다 — 재상신 DRAFT 가 생기면 최댓값과 어긋난다.
> ❗ Swagger 응답 예시가 **사원 스키마**(`userId` · `departmentPath`)로 잘못 표기돼 있다. 위 표는 2026-08-07 실행 결과 기준이다.

---

## 비타메이트 도메인 — 공통

AI 블록은 채팅형이 아니다. **검토 유형·세부 카테고리를 고르고, 문서를 기준(`REFERENCE`)과 검토 대상(`TARGET`)으로 나눠 선택한 뒤**, 서버가 준 기본 프롬프트를 확인·보완해 요청한다.

| 항목             | 규칙                                                                       |
| ---------------- | -------------------------------------------------------------------------- |
| 분석 방식        | **비동기.** 요청은 `202` + `PENDING` 만 주고 결과는 폴링으로 받는다        |
| 폴링             | 요청 후 15초 대기 → 3초 간격 조회 → 종료 상태면 중단. 2분 초과 시 문구 전환 |
| 중복 방지        | 요청에 `Idempotency-Key` 헤더 **필수**                                      |
| 문서 역할        | 같은 `fileVersionId` 를 기준·대상에 동시에 넣을 수 없다 (서버 400)         |
| 선택 가능 문서   | `indexStatus = COMPLETED` 인 파일 버전만                                    |
| 과거 이력        | 최신 파일이 아니라 **분석 당시 `fileVersionId`** 기준 정보를 보여준다       |
| 레거시 분석      | `reviewType = null` · `reviewCategoryCodes = []` · `prompt = null` 로 온다  |

**`analysisStatus` 별 필드 규칙**

| 상태         | `result` | `errorMessage` | `completedAt` | `documents` | `citations` |
| ------------ | -------- | -------------- | ------------- | ----------- | ----------- |
| `PENDING`    | `null`   | `null`         | `null`        | 선택 문서   | `[]`        |
| `PROCESSING` | `null`   | `null`         | `null`        | 선택 문서   | `[]`        |
| `COMPLETED`  | 필수     | `null`         | 필수          | 선택 문서   | `[]` 가능   |
| `FAILED`     | `null`   | 필수           | 필수          | 선택 문서   | `[]`        |

> ❗ **`result` 는 형식이 없는 자유 문자열이다.** 프론트가 요약·지적사항·경고로 나눠 그리려고 `features/vitamate/types.ts` 의 `parseResult()` 로 파싱하고, **실패하면 마크다운 원문**을 그대로 보여준다. 구조화된 필드로 계약이 잡히면 이 파서를 지운다.
> ❗ **"블록의 최신 분석" 전용 조회 API 가 없다.** 지금은 78번(이력, 최신순)의 첫 건 `analysisId` 로 77번을 한 번 더 부른다. 백엔드에 전용 API 를 요청할지 논의 필요.

---

## 74. 프로젝트 파일 버전 목록

| 항목          | 내용                                                          |
| ------------- | ------------------------------------------------------------- |
| **Method**    | `GET`                                                         |
| **Path**      | `/api/v1/projects/{projectId}/file-versions`                  |
| **인증 필요** | ✅ 프로젝트 참여자                                            |
| **사용 위치** | ✅ `features/file/api.ts` — `getProjectFileVersions()`        |

**응답 data** — 배열 그대로 (없으면 `[]`). 휴지통 버전은 오지 않는다.

| 필드               | 타입              | 설명                                             |
| ------------------ | ----------------- | ------------------------------------------------ |
| `fileId`           | `number`          | 문서 ID                                          |
| `name`             | `string`          | 표시명                                           |
| `fileVersionId`    | `number`          | **분석 요청에 넣는 값**                          |
| `versionNo`        | `number`          | 1부터                                            |
| `latest`           | `boolean`         | 이 문서의 최신 버전인지                          |
| `originalFileName` | `string`          | 원본 파일명                                      |
| `extension`        | `string`          | 확장자                                           |
| `sizeBytes`        | `number`          | 바이트                                           |
| `pageCount`        | `number \| null`  | PDF 만 값이 있다                                 |
| `previewable`      | `boolean`         | 미리보기 가능 여부                               |
| `completedAt`      | `string`          | 업로드 완료 시각                                 |
| `indexStatus`      | `IndexStatus`     | `PENDING` `PROCESSING` `COMPLETED` `FAILED`      |

> ⚠️ **파일 도메인 API 다** (비타메이트 도메인 아님).
> ⚠️ 스텝이 아니라 **프로젝트 전체**라, 다른 스텝에 올린 기준 문서도 고를 수 있다.
> ℹ️ `indexStatus !== COMPLETED` 인 버전은 목록에는 보이되 **선택은 막는다** ("AI가 아직 읽는 중").

---

## 75. 검토 템플릿 목록

| 항목          | 내용                                                    |
| ------------- | ------------------------------------------------------- |
| **Method**    | `GET`                                                   |
| **Path**      | `/api/v1/vitamate/review-templates`                     |
| **인증 필요** | ✅ 프로젝트 참여자                                      |
| **사용 위치** | ✅ `features/vitamate/api.ts` — `getReviewTemplates()`  |

**응답 data** — `{ reviewTypes: [] }`

| 필드                          | 타입       | 설명                                       |
| ----------------------------- | ---------- | ------------------------------------------ |
| `reviewType`                  | `string`   | 유형 코드 — 분석 요청에 그대로 넣는다      |
| `reviewTypeName`              | `string`   | 화면 표시명                                |
| `description`                 | `string`   | 유형 설명                                  |
| `categories[].categoryCode`   | `string`   | 카테고리 코드 (예: `COST_REPORT`)          |
| `categories[].categoryName`   | `string`   | 화면 표시명                                |
| `categories[].guideText`      | `string`   | 보조 안내 문구                             |
| `categories[].exampleText`    | `string`   | **프롬프트 입력창 기본값**                 |
| `categories[].templateVersion`| `number`   | 적용 템플릿 버전                           |

> ⚠️ 실제 AI 지시문(`promptTemplate`)은 이 API 로 **절대 내려오지 않는다.** 화면 기본값은 `exampleText` 다.
> ℹ️ 카테고리를 여러 개 골라도 요청 `prompt` 는 **문자열 하나**다 — `exampleText` 들을 줄바꿈으로 합쳐 채운다.

---

## 76. 비타메이트 분석 요청

| 항목          | 내용                                                 |
| ------------- | ---------------------------------------------------- |
| **Method**    | `POST`                                               |
| **Path**      | `/api/v1/blocks/{blockId}/vitamate/analyses`         |
| **인증 필요** | ✅ 프로젝트 참여자                                   |
| **헤더**      | ⚠️ `Idempotency-Key` **필수**                        |
| **사용 위치** | ✅ `features/vitamate/api.ts` — `createAnalysis()`   |

**요청 body**

| 필드                       | 타입       | 필수 | 설명                                     |
| -------------------------- | ---------- | ---- | ---------------------------------------- |
| `referenceFileVersionIds`  | `number[]` | ✅   | 기준 문서 — 1개 이상                     |
| `targetFileVersionIds`     | `number[]` | ✅   | 검토 대상 — 1개 이상, 기준과 겹칠 수 없다 |
| `reviewType`               | `string`   | ✅   | 75번에서 고른 유형                       |
| `reviewCategoryCodes`      | `string[]` | ✅   | 75번에서 고른 세부 카테고리              |
| `prompt`                   | `string`   | ✅   | `exampleText` 를 사용자가 확인·보완한 값 |

**응답 data** — `202`

| 필드             | 타입     | 설명                    |
| ---------------- | -------- | ----------------------- |
| `analysisId`     | `number` | 폴링에 쓸 분석 ID       |
| `analysisStatus` | `string` | `PENDING`               |
| `requestedAt`    | `string` | 요청 시각               |

| status | 화면 처리                                                      |
| ------ | -------------------------------------------------------------- |
| 400    | 기준·대상 중복 등 — 프론트가 먼저 막지만 문구는 서버 것을 쓴다 |
| 409    | 같은 키인데 내용이 다름 → "이미 다른 분석 요청이 처리 중"       |

> ⚠️ **같은 키 + 같은 내용**이면 새 분석이 생기지 않고 기존 `analysisId` 가 온다. 그래서 `재실행`(같은 설정으로 새 결과를 원하는 동작)은 **키를 새로 뽑는다.**
> ℹ️ 결과는 이 응답에 없다 — 77번으로 폴링한다.

---

## 77. 비타메이트 분석 단건 조회

| 항목          | 내용                                               |
| ------------- | -------------------------------------------------- |
| **Method**    | `GET`                                              |
| **Path**      | `/api/v1/vitamate/analyses/{analysisId}`           |
| **인증 필요** | ✅ 스텝 접근 권한                                  |
| **사용 위치** | ✅ `features/vitamate/api.ts` — `getAnalysis()`    |

**응답 data**

| 필드                          | 타입               | 설명                                     |
| ----------------------------- | ------------------ | ---------------------------------------- |
| `analysisId`                  | `number`           | 분석 ID                                  |
| `blockId`                     | `number`           | AI 블록 ID                               |
| `reviewType`                  | `string \| null`   | 레거시 분석은 null                       |
| `reviewCategoryCodes`         | `string[]`         | 고른 세부 카테고리                       |
| `prompt`                      | `string \| null`   | 확정된 프롬프트                          |
| `analysisStatus`              | `AnalysisStatus`   | 위 상태 표 참고                          |
| `result`                      | `string \| null`   | **형식 없는 자유 문자열**                |
| `errorMessage`                | `string \| null`   | 실패 사유 (내부 예외는 노출 금지)        |
| `createdAt`                   | `string`           | 요청 시각                                |
| `completedAt`                 | `string \| null`   | 완료·실패 시각. 실패해도 채워진다        |
| `documents[].fileVersionId`   | `number`           | 분석 당시 파일 버전                      |
| `documents[].fileName`        | `string`           | 분석 당시 문서명                         |
| `documents[].documentRole`    | `REFERENCE\|TARGET`| 문서 역할                                |
| `citations[].rankOrder`       | `number`           | 근거 순서                                |
| `citations[].fileVersionId`   | `number`           | 근거가 속한 파일 버전                    |
| `citations[].documentChunkId` | `number`           | 문서 청크 ID                             |
| `citations[].pageNumber`      | `number \| null`   | 페이지 번호                              |
| `citations[].excerpt`         | `string`           | 근거 발췌문                              |

> ⚠️ `citations` 에는 **문서명이 없다** — 같은 응답의 `documents` 에서 `fileVersionId` 로 찾는다.
> ⚠️ 권한 없는 분석은 `403`·`404` 로 처리하고 **본문을 노출하지 않는다.**
> ℹ️ 삭제된 문서 버전도 이력 표시를 위해 당시 문서명이 남는다.

---

## 78. 블록별 분석 이력

| 항목          | 내용                                                  |
| ------------- | ----------------------------------------------------- |
| **Method**    | `GET`                                                 |
| **Path**      | `/api/v1/blocks/{blockId}/vitamate/analyses`          |
| **인증 필요** | ✅ 프로젝트 참여자                                    |
| **사용 위치** | ✅ `features/vitamate/api.ts` — `getBlockAnalyses()`  |

**응답 data** — 최신순(`createdAt DESC`), **최대 20건 · 페이징 없음**

| 필드                  | 타입             | 설명                        |
| --------------------- | ---------------- | --------------------------- |
| `analysisId`          | `number`         | 상세 조회(77번) 키          |
| `reviewType`          | `string \| null` | 검토 유형                   |
| `reviewCategoryCodes` | `string[]`       | 세부 카테고리               |
| `prompt`              | `string \| null` | 프롬프트                    |
| `analysisStatus`      | `AnalysisStatus` | 상태                        |
| `createdAt`           | `string`         | 요청 시각                   |
| `completedAt`         | `string \| null` | 완료·실패 시각              |

> ⚠️ **`documents` · `result` · `citations` 가 없다.** 목록에서는 본문을 못 그리고, 눌러서 77번으로 상세를 받는다.
> ⚠️ 20건을 넘으면 그 이전 건은 이 목록에서 안 보인다 (v1 페이징 없음) — 화면에 안내 문구를 단다.
> ❗ 감싸는 키(`{ analyses: [] }` vs 배열 그대로)가 **확정 전**이라 프론트가 두 모양을 모두 받는다.

---

## 알림 도메인 — 공통

| 항목            | 내용                                                                                                     |
| --------------- | -------------------------------------------------------------------------------------------------------- |
| **대상**        | **본인 알림만** 조회 · 처리된다. 남의 알림은 403 `NOTIFICATION_FORBIDDEN`                                 |
| **정렬**        | 최신순(`createdAt` 내림차순) 고정 — 정렬 파라미터가 없다                                                 |
| **읽음 표기**   | ⚠️ `isRead` 같은 boolean 이 **없다.** `readAt` 이 `null` 이면 안 읽음                                     |
| **삭제**        | 논리 삭제다. 지운 알림은 목록에서 빠지고 다시 부르면 404                                                 |
| **자동 읽음**   | 이동 대상 조회(80번)가 **읽음 처리를 겸한다** — 클릭 이동 시 읽음 API 를 따로 부르지 않는다               |

> ❗ **`notificationType` 의 전체 목록을 받지 못했다.** 확인된 값은 `APPROVAL_REQUESTED` · `APPROVAL_REJECTED` · `APPROVAL_COMPLETED` 셋뿐이다. 시안에는 이슈 배정 · 새 댓글도 있어 `ISSUE_*` · `COMMENT_*` 가 더 있을 것으로 보인다 — **화면은 모르는 값이 와도 기본 아이콘으로 떨어지게** 짠다.
> ❗ **`category` 로 넣을 수 있는 값 목록도 미확인.** 설명상 `notificationType` 의 **접두어**(`APPROVAL` 등)를 그대로 쓴다.

---

## 79. 알림 목록 조회

| 항목          | 내용                                              |
| ------------- | ------------------------------------------------- |
| **Method**    | `GET`                                             |
| **Path**      | `/api/v1/notifications`                            |
| **인증 필요** | ✅ 본인 알림만                                     |
| **사용 위치** | ✅ `features/notification/api.ts` — `getNotifications()` |

**요청 Query** — 전부 선택

| 파라미터   | 타입      | 설명                                             |
| ---------- | --------- | ------------------------------------------------ |
| `category` | `string`  | `notificationType` 접두어. 미지정이면 전체       |
| `isRead`   | `boolean` | 안 읽음만 보려면 `false`                         |
| `page`     | `number`  | **0부터**. 기본 0                                |
| `size`     | `number`  | 기본 10, **최대 100**                            |

**응답 data** — `{ content[], totalElements, totalPages }` (`page` · `size` 는 안 온다)

| 필드               | 타입             | 설명                                        |
| ------------------ | ---------------- | ------------------------------------------- |
| `notificationId`   | `number`         | 알림 ID                                     |
| `notificationType` | `string`         | 예: `APPROVAL_REQUESTED` — 아이콘 · 분류 근거 |
| `title`            | `string`         | 예: `결재 요청`                             |
| `message`          | `string`         | 본문 한 줄                                  |
| `readAt`           | `string \| null` | **null 이면 안 읽음**                       |
| `createdAt`        | `string`         | `2026-08-07T18:47:37` — 상대 시간 표기 근거 |

> ℹ️ 헤더 배지 숫자는 `?isRead=false` 의 **`totalElements`** 를 쓴다 (목록 길이가 아니다 — `size` 에 잘린다).
> ℹ️ `isRead=true` 는 **읽은 것만** 준다 (2026-08-08 실행 확인). 알림 페이지의 `미확인` · `확인` 탭이 이 값 하나만 바꿔 쓴다.

---

## 80. 알림 이동 대상 조회

| 항목          | 내용                                                    |
| ------------- | ------------------------------------------------------- |
| **Method**    | `GET`                                                   |
| **Path**      | `/api/v1/notifications/{notificationId}/target`          |
| **사용 위치** | ✅ `features/notification/api.ts` — `getNotificationTarget()` |

**응답 data**

| 필드       | 타입                       | 설명                                    |
| ---------- | -------------------------- | --------------------------------------- |
| `type`     | `string`                   | 예: `APPROVAL`. 이동할 곳이 없으면 `NONE` |
| `targetId` | `number \| null`           | `NONE` 이면 null                        |
| `extra`    | `Record<string, string> \| null` | 도메인별 덤. 없으면 null           |

| status | code                       | 화면 처리                      |
| ------ | -------------------------- | ------------------------------ |
| 403    | `NOTIFICATION_FORBIDDEN`   | 남의 알림 — 이동하지 않는다    |
| 404    | `NOTIFICATION_NOT_FOUND`   | 지워진 알림 — 목록에서 제거    |

> ⚠️ **조회 성공 시 자동으로 읽음 처리된다.** 그래서 `type=NONE`(이동할 곳 없음)이어도 **읽음은 된다** — 에러가 아니라 200 이다.
> ⚠️ 경로는 **프론트가 조립한다.** `type` + `targetId` 로 만들며, 모르는 `type` 이면 이동하지 않고 읽음 처리만 남긴다.
> ❗ **`type` 의 전체 목록 미확인.** 확인된 값은 `APPROVAL` · `NONE` 뿐이다.

---

## 81. 알림 읽음 처리

| 항목          | 내용                                             |
| ------------- | ------------------------------------------------ |
| **Method**    | `PATCH`                                          |
| **Path**      | `/api/v1/notifications/{notificationId}/read`     |
| **사용 위치** | ✅ `features/notification/api.ts` — `readNotification()` |

**응답 data** — `notificationId` · `readAt`

> ℹ️ **멱등이다.** 이미 읽은 알림을 다시 불러도 200 이고 최초 읽음 시각을 덮어쓰지 않는다.
> ℹ️ 이동 없이 **읽음만** 표시할 때 쓴다 (케밥 메뉴의 `읽음`). 클릭 이동은 80번이 겸한다.

---

## 82. 알림 전체 읽음 처리

| 항목          | 내용                                       |
| ------------- | ------------------------------------------ |
| **Method**    | `PATCH`                                    |
| **Path**      | `/api/v1/notifications/read-all`            |
| **사용 위치** | ✅ `features/notification/api.ts` — `readAllNotifications()` |

> ❗ **응답 본문 미확인** — Swagger 문서를 받지 못했다. 프론트는 응답을 쓰지 않고 성공 여부만 보므로, 몇 건 처리됐는지가 오더라도 화면은 목록을 다시 받아 그린다.

---

## 83. 알림 삭제

| 항목          | 내용                                        |
| ------------- | ------------------------------------------- |
| **Method**    | `DELETE`                                    |
| **Path**      | `/api/v1/notifications/{notificationId}`     |
| **사용 위치** | ✅ `features/notification/api.ts` — `deleteNotification()` |

**응답** — `204` (본문 없음)

| status | code                       | 화면 처리                              |
| ------ | -------------------------- | -------------------------------------- |
| 403    | `NOTIFICATION_FORBIDDEN`   | 남의 알림                              |
| 404    | `NOTIFICATION_NOT_FOUND`   | 이미 지워진 알림 — 목록에서 빼면 된다  |

> ℹ️ **논리 삭제다.** 하드 삭제가 아니라 목록에서만 빠진다.

---

## 84. 프로젝트 목록 조회

| 항목          | 내용                                             |
| ------------- | ------------------------------------------------ |
| **Method**    | `GET`                                            |
| **Path**      | `/api/v1/projects`                               |
| **인증 필요** | ✅ 참여자 (`MASTER` · `ADMIN` 은 전 프로젝트)    |
| **사용 위치** | `src/features/project/api.ts` → `getProjects()`  |
| **요구사항**  | PRJ-013 · PRJ-015                                |

**Request Parameter** — 전부 선택

| 파라미터             | 타입     | 설명                                                                  |
| -------------------- | -------- | --------------------------------------------------------------------- |
| `status`             | `string` | `NOT_STARTED`·`IN_PROGRESS`·`SETTLEMENT`·`COMPLETED`·`CLOSED`         |
| `businessCategoryId` | `number` | 사업 카테고리 필터                                                    |
| `startedOnFrom`      | `string` | 기간 필터 시작 (`yyyy-MM-dd`)                                         |
| `startedOnTo`        | `string` | 기간 필터 종료                                                        |
| `keyword`            | `string` | **과업명 · 발주처** 검색                                              |
| `page`               | `number` | 기본 0                                                                |
| `size`               | `number` | 기본 20. **1~100 으로 보정**된다 — 벗어나도 400 이 아니라 잘린다      |

**Response (200 OK)**

```ts
{
  httpStatus: 200,
  message: '프로젝트 목록 조회 성공',
  data: {
    content: {
      projectId: number;
      name: string;              // 과업명
      clientName: string;        // 발주처
      status: string;            // 위 enum
      startedOn: string;         // '2026-08-01'
      endedOn: string;           // '2026-12-31'
      contractAmount: number;
      progressRate?: number;     // 스텝 0개면 응답에 없다
      businessCategories: { categoryId: number; name: string; code: string | null }[];
      members: { userId: string; name: string }[];   // 카드 아바타용 · 이름 오름차순
      myIssueInProgressCount: number;
      myApprovalOpenCount: number;
    }[];
    page: number;
    size: number;
    totalElements: number;
    totalPages: number;
  }
}
```

> ⭐ **정렬은 `created_at DESC` → `project_id DESC` 고정이다.** 정렬 파라미터를 받지 않는다.
> ⭐ **권한이 없는 프로젝트는 403 이 아니라 목록에서 빠진다.** 상세 조회(6번)는 반대로 403 을 낸다 — 화면이 역할별로 목록을 거르지 않는다.
> ⭐ `members` 가 목록에 실려 오므로 카드마다 45번(참여자 목록)을 부르지 않는다. 없었다면 20건 페이지에서 21콜이 된다.
> ⚠️ `myApprovalOpenCount` 는 `결재 대기` 가 **아니다** — 요청자가 **기안한** `IN_PROGRESS`+`REJECTED` 수라 결재함 숫자와 다르다.
> ⚠️ **상세와 달리 `stepCount` · `doneStepCount` 가 없다.** 카드에 `완료/전체` 를 그릴 수 없어 위 두 건수 뱃지로 대신했다.
> ⚠️ **상태별 집계 API 가 없다.** 통계 카드는 상태마다 `size=1` 로 물어 `totalElements` 만 쓴다 (`getProjectCount()`).
> **보관 기능이 없다** — 종결(`CLOSED`) 건도 `status` 필터로 다시 볼 수 있다 (PRJ-015).
## 정산 도메인 — 공통

| 항목          | 내용                                                                                                    |
| ------------- | ------------------------------------------------------------------------------------------------------- |
| **대상**      | 정산 블록 하나(`settleId`)에 정산 항목 **한 벌**이 붙는다 (1:1)                                          |
| **타입**      | 우리 회사 기준 — `INCOME`(입금) · `OUTCOME`(출금). **쿼리로 매번 보낸다**                                |
| **권한**      | 조회 · 작성 모두 **편집 권한**이 필요하다 — 열람만 가능한 사용자는 수정 화면에 들어가지 못한다           |
| **계좌 정보** | `OUTCOME` 에서만 쓴다. 은행명 · 계좌번호 · 예금주 3종이 함께 필수다                                      |
| **방향**      | `traderName` 은 **보내는 쪽**(`OUTCOME` = 우리 회사), 계좌 3종은 **받는 쪽**(외주 업체)다 — 뒤집지 말 것 |
| **추천값**    | 블록 **생성 직후에만** 뜻이 있다. 생성 직후 화면은 **빈 값 + `수정하기`** 이고, 폼을 먼저 열지 않는다     |
| **실제 정산** | `actualAmount` · `actualDate` 는 **재무팀이 나중에 채운다.** 작성 직후에는 항상 `null` 이라 `-` 로 그린다 |

> ⚠️ **계좌번호는 응답 모양이 두 가지다.** 작성 응답(86번)은 `100******444` 로 **마스킹**되고,
> 수정 화면용 조회(85번)만 `originalAccountNumber` 로 원본을 준다. 폼에 채울 값은 85번 것이다.
> ⚠️ **추천 값(회차 · 총액)은 85번에만 있다.** 같은 프로젝트의 다른 정산 블록을 기준으로 계산되며,
> 블록 생성 직후 `수정하기` 로 들어갈 때만 의미가 있다 — 입력값이 아니라 **안내 문구**로 쓴다.
> ⚠️ **이미 저장된 항목의 현재 값을 주는 API 가 없다.** 85번은 추천값 · 원본 계좌번호만 준다 —
> 저장된 회차 · 금액 · 일자는 **블록 목록(10번)의 `detail`** 에서 읽는다 (아래 스키마).
> ✅ **블록 `type` 은 `SETTLEMENT`, `detail` 키는 `settleId`** 다 (스웨거 실제 응답 확인).
> ❗ **타입은 한 방향으로만 바뀐다** — `OUTCOME` → `INCOME` 은 409(`SETL-006`)다. 조회에도 걸린다.
> ❗ **총 예정 금액은 프로젝트 안에서 같아야 한다** — 어긋나면 409(`SETL-008`).
> ❗ **연결되면 수정할 수 없다** — 세금계산서 · 입출금 내역이 붙은 뒤에는 409(`SETL-007`).

### 블록 목록(10번)의 `detail` — 정산

`type: "SETTLEMENT"` 인 블록의 `detail` 이다. **항목 필드를 평면으로** 담는다 (중첩 객체가 아니다).

| 필드                                  | 작성 전 | 설명                                            |
| ------------------------------------- | ------- | ----------------------------------------------- |
| `settleId`                            | 값 있음 | 정산 블록 ID — 85 · 86번 경로에 쓴다            |
| `status`                              | 값 있음 | 작성 전에도 `PENDING` 으로 온다                 |
| `createdAt`                           | 값 있음 | 블록이 만들어진 시각                            |
| `paidAmountRatio`                     | `0.0`   | 금액 기준 진행률                                |
| `type`                                | `null`  | 작성해야 `INCOME` · `OUTCOME` 이 정해진다       |
| `roundNo` · `totalAmount` · `plannedAmount` · `plannedTaxAmount` · `plannedDate` · `traderName` | `null` | 작성한 값 |
| `bankName` · `accountNumber` · `accountHolder`  | `null` | 출금일 때만 채워진다 (계좌번호는 마스킹) |
| `actualAmount` · `actualDate`         | `null`  | 재무팀이 나중에 채운다                          |

> ⚠️ **작성 전에도 `detail` 은 온다.** 항목 필드만 `null` 이라 `roundNo` · `plannedAmount` 가
> 둘 다 숫자일 때만 '작성됨'으로 본다 (`readSettlementBlockDetail`).

---

## 85. 정산 항목 수정 시 조회

| 항목          | 내용                                                    |
| ------------- | ------------------------------------------------------- |
| **Method**    | `GET`                                                   |
| **Path**      | `/api/v1/blocks/settlements/{settleId}/items`            |
| **인증 필요** | ✅ 편집 권한                                             |
| **사용 위치** | ✅ `features/settlement/api.ts` — `getSettlementDraft()`  |

**요청 Query** — `type` (✅ `INCOME` · `OUTCOME`)

**응답 data**

| 필드                    | 타입             | 설명                                                    |
| ----------------------- | ---------------- | ------------------------------------------------------- |
| `settleId`              | `number`         | 정산 블록 ID                                            |
| `recommendRoundNo`      | `number \| null` | 추천 회차 — 프로젝트 내 정산 블록 **개수** 기준         |
| `recommendTotalAmount`  | `number \| null` | 다른 정산 블록의 총 예정 금액. **첫 블록이면 `null`**   |
| `originalAccountNumber` | `string \| null` | 마스킹 없는 계좌번호. `OUTCOME` 이 아니면 `null`        |

| status | code       | 화면 처리                                          |
| ------ | ---------- | -------------------------------------------------- |
| 400    | `SETL-005` | `type` 누락 — 프론트가 항상 붙이므로 나오면 버그    |
| 403    | `SETL-001` | 편집 권한 없음                                     |
| 404    | `SETL-002` | 존재하지 않는 블록                                 |
| 409    | `SETL-006` | **출금 → 입금 타입 변경 불가** (탭을 되돌린다)     |

> ⚠️ **추천값은 입력값이 아니다.** 컬럼 안에 `추천: 2` 처럼 **안내로** 보여준다.
> ⚠️ **`recommendTotalAmount` 는 이름과 달리 '맞춰야 하는 값'에 가깝다** — 다른 정산 블록과
> 어긋나면 작성이 409(`SETL-008`)로 막힌다. 화면은 `맞출 금액: 4,500,000` 으로 적는다.
> ❗ **첫 블록이면 `null` 이다** (기준 블록이 없다). 실제 응답으로 확인 — 그대로 포맷하면 화면이 죽는다.
> ❗ **조회인데 409 가 있다.** 이미 `OUTCOME` 으로 저장된 블록에서 `INCOME` 탭을 누르면 그 자리에서 막힌다.

---

## 86. 정산 항목 작성 · 수정

| 항목          | 내용                                                          |
| ------------- | ------------------------------------------------------------- |
| **Method**    | `PATCH`                                                       |
| **Path**      | `/api/v1/blocks/settlements/{settleId}/items`                  |
| **인증 필요** | ✅ 편집 권한                                                   |
| **사용 위치** | ✅ `features/settlement/api.ts` — `saveSettlement()`            |

**요청 Query** — `type` (✅ `INCOME` · `OUTCOME`)

**요청 body**

| 필드               | 타입     | 필수                | 설명                                    |
| ------------------ | -------- | ------------------- | --------------------------------------- |
| `roundNo`          | `number` | ✅                  | 정산 회차                               |
| `totalAmount`      | `number` | ✅                  | 프로젝트 정산 예정 총 금액              |
| `plannedAmount`    | `number` | ✅                  | 회차별 정산 예정 금액                   |
| `plannedTaxAmount` | `number` | ✅                  | 회차별 정산 예정 세금 금액              |
| `plannedDate`      | `string` | ✅                  | `yyyy-MM-dd`                            |
| `traderName`       | `string` | ✅                  | **돈을 보내는 쪽** — `INCOME` 은 상대 클라이언트, `OUTCOME` 은 **우리 회사** |
| `bankName`         | `string` | **`OUTCOME` 만** ✅ | 외주 업체 은행명                        |
| `accountNumber`    | `string` | **`OUTCOME` 만** ✅ | **하이픈 · 공백 없이**                  |
| `accountHolder`    | `string` | **`OUTCOME` 만** ✅ | 외주 업체 예금주                        |

**응답 data** — 요청 필드에 아래가 더 붙는다.

| 필드              | 타입             | 설명                                                              |
| ----------------- | ---------------- | ----------------------------------------------------------------- |
| `settleId`        | `number`         | 정산 블록 ID                                                      |
| `accountNumber`   | `string`         | ⚠️ **마스킹**된다 (`100******444`) — 원본은 85번에서만            |
| `actualAmount`    | `number \| null` | 재무팀이 채우는 실제 금액. 작성 직후 `null`                       |
| `actualDate`      | `string \| null` | 실제 입출금 일시. 작성 직후 `null`                                |
| `status`          | `string`         | `PENDING`(미연결) · `WAITING`(정산 대기) · `PARTIAL` · `COMPLETED` |
| `paidAmountRatio` | `number`         | 금액 기준 진행률. 작성 직후 `0`. ❗ **단위 확인 필요**             |
| `createdAt`       | `string`         | 내용이 생성된 일시                                                |

| status | code       | 화면 처리                                                        |
| ------ | ---------- | ---------------------------------------------------------------- |
| 400    | `SETL-003` | 빈 내용                                                          |
| 400    | `SETL-004` | **출금인데 계좌 정보 누락** — 화면에서 먼저 막는다               |
| 400    | `SETL-005` | `type` 누락                                                      |
| 400    | `SETL-011` | **회차 번호는 1 이상** — 화면에서 먼저 막는다                    |
| 403    | `SETL-001` | 편집 권한 없음                                                   |
| 404    | `SETL-002` | 존재하지 않는 블록                                               |
| 409    | `SETL-006` | 출금 → 입금 타입 변경 불가                                       |
| 409    | `SETL-007` | **세금계산서 · 입출금 내역이 연결돼 수정 불가**                  |
| 409    | `SETL-008` | 같은 프로젝트의 다른 정산 블록과 **총 예정 금액 불일치**         |

> ✅ **성공은 `200`** 이다 (스웨거 실제 응답 확인 — 문서의 `201` 표기가 잘못됐다).
> ✅ **`status` 는 `PENDING`** 이다 (본문의 `PENDGING` 은 오타).
> ❗ **`paidAmountRatio` 단위 확인 필요.** 작성 직후 값(`0`)만 확인돼 비율인지 백분율인지 알 수 없다.
> 화면은 **백분율(0~100)** 로 보고 그린다 — 비율이면 절반 정산이 `0.5%` 로 보인다.
> ℹ️ **409 셋은 사후 처리다.** `SETL-007`(연결됨) · `SETL-008`(총액 불일치)은 화면이 미리 알 수 없어
> 서버 `message` 를 그대로 띄운다.

---

## 87. 사원 엑셀 템플릿 다운로드

| 항목          | 내용                                 |
| ------------- | ------------------------------------ |
| **Method**    | `GET`                                |
| **Path**      | `/api/v1/employees/bulk-template`    |
| **인증 필요** | ✅ (ADMIN)                           |
| **사용 위치** | ❌ 미연동 — `EmployeeList` 일괄 등록 |

**응답** — JSON 이 아니라 **`.xlsx` 바이너리**다. 헤더만 있는 8컬럼:
사번 · 이름 · 부서명 · 직급명 · 입사일 · 이메일 · 연락처 · 권한

| status | code                 | 화면 처리 |
| ------ | -------------------- | --------- |
| 403    | `ACC_ADMIN_REQUIRED` | 권한 없음 |

> ⚠️ 응답 봉투(`{ httpStatus, message, data }`)가 아니라 파일이다 — `src/lib/api.ts` 래퍼를 그대로 쓸 수 없다 (`blob()` 처리 필요).
> ℹ️ 권한 컬럼은 있지만 `ADMIN` 값은 검증에서 거부된다.

---

## 88. 사원 엑셀 일괄 등록 검증

| 항목          | 내용                                |
| ------------- | ----------------------------------- |
| **Method**    | `POST` (`multipart/form-data`)      |
| **Path**      | `/api/v1/employees/bulk/validate`   |
| **인증 필요** | ✅ (ADMIN)                          |
| **사용 위치** | ❌ 미연동 — 일괄 등록 스텝퍼 ②단계  |

**요청** — `file` (엑셀 파일). 등록하지 않고 **행별 오류만** 반환한다.

| 필드                        | 타입      | 설명                            |
| --------------------------- | --------- | ------------------------------- |
| `totalRows`                 | `int`     | 전체 행 수                      |
| `validCount` / `errorCount` | `int`     | 정상 · 오류 행 수               |
| `errors[].row`              | `int`     | 엑셀 행 번호                    |
| `errors[].userId` / `.name` | `string?` | 해당 행의 사번 · 이름           |
| `errors[].validation`       | `string`  | 오류 유형                       |
| `errors[].message`          | `string`  | 안내 문구 — 그대로 표시         |
| `emailNotRegisteredCount`   | `int`     | 이메일 없는 행 수 (등록은 가능) |

| status | code                     | 화면 처리    |
| ------ | ------------------------ | ------------ |
| 400    | `EMP_FILE_REQUIRED`      | 파일 없음    |
| 400    | `EMP_FILE_TYPE_INVALID`  | `.xlsx` 아님 |
| 400    | `EMP_FILE_SIZE_EXCEEDED` | 5MB 초과     |
| 403    | `ACC_ADMIN_REQUIRED`     | 권한 없음    |

> ⚠️ **오류 행이 있어도 200** 이다 — `errorCount` 로 분기해야 한다. 400 은 파일 자체 문제 3가지뿐.

---

## 89. 사원 엑셀 일괄 등록

| 항목          | 내용                               |
| ------------- | ---------------------------------- |
| **Method**    | `POST` (`multipart/form-data`)     |
| **Path**      | `/api/v1/employees/bulk`           |
| **인증 필요** | ✅ (ADMIN)                         |
| **사용 위치** | ❌ 미연동 — 일괄 등록 스텝퍼 ③단계 |

**요청** — `file` · `skipErrors` (기본 `false`)

**응답 data**

| 필드                              | 타입       | 설명                                                 |
| --------------------------------- | ---------- | ---------------------------------------------------- |
| `totalRows`                       | `int`      | 전체 행 수                                           |
| `registeredCount` / `failedCount` | `int`      | 등록 · 실패 행 수                                    |
| `errors[]`                        | `Object[]` | 검증([88](#88-사원-엑셀-일괄-등록-검증))과 같은 구조 |
| `emailSentCount`                  | `int`      | 초기 비밀번호 발송 건수                              |
| `emailNotRegistered[]`            | `string[]` | 이메일 없어 발송 못 한 사번                          |

| status | code                 | 화면 처리                                 |
| ------ | -------------------- | ----------------------------------------- |
| 400    | `EMP_HAS_ERRORS`     | 오류 행이 있는데 `skipErrors=false`       |
| 400    | 파일 3종             | [88](#88-사원-엑셀-일괄-등록-검증)과 동일 |
| 403    | `ACC_ADMIN_REQUIRED` | 권한 없음                                 |

> ℹ️ **행마다 독립 트랜잭션**이라 일부 실패해도 나머지는 등록된다.
> ℹ️ 초기 비밀번호는 이메일이 있는 사원에게만 발송된다 — 나머지는 `emailNotRegistered[]` 로 안내한다.

---

## 90. 직급별 사원 목록

| 항목          | 내용                                              |
| ------------- | ------------------------------------------------- |
| **Method**    | `GET`                                             |
| **Path**      | `/api/v1/job-positions/{jobPositionId}/employees` |
| **인증 필요** | ✅ (ADMIN)                                        |
| **사용 위치** | ❌ 미연동 — `JobPositionList` 인원수 클릭         |

**응답 data**

| 필드                                           | 타입      | 설명          |
| ---------------------------------------------- | --------- | ------------- |
| `jobPositionId` / `jobPositionName`            | —         | 직급 정보     |
| `content[].userId` / `.name`                   | `string`  | 사번 · 이름   |
| `content[].departmentName` / `.departmentPath` | `string?` | 부서명 · 경로 |

| status | code                 | 화면 처리 |
| ------ | -------------------- | --------- |
| 403    | `ACC_ADMIN_REQUIRED` | 권한 없음 |
| 404    | `POS_NOT_FOUND`      | 직급 없음 |

> ℹ️ 재직자만 — 시스템 계정 · 퇴사자 제외. 0명이면 빈 배열(404 아님).

---

## 사원 그룹 도메인 — 공통

| 항목        | 내용                                                                     |
| ----------- | ------------------------------------------------------------------------ |
| 성격        | 권한이 **아니다** — 멤버 선택 · 페이지 권한 부여를 돕는 **선택용 인덱스** |
| 권한        | 조회는 로그인 사용자 전체, 변경(생성·수정·삭제·구성원)은 **ADMIN**        |
| 권한 불변성 | 그룹으로 권한을 줘도 **개인 단위 스냅샷**으로 저장된다                    |
| 그래서      | 그룹을 지우거나 구성원을 빼도 **이미 부여된 권한은 그대로**               |
| 구성원 집계 | `memberCount` 는 시스템 계정 · 퇴사자를 제외한 수                         |

---

## 91. 사원 그룹 목록 조회

| 항목          | 내용                      |
| ------------- | ------------------------- |
| **Method**    | `GET`                     |
| **Path**      | `/api/v1/employee-groups` |
| **인증 필요** | ✅ (전체 사용자)          |
| **사용 위치** | ❌ 미연동                 |

**요청 Query** — `keyword` (`string`, 그룹명 부분검색)

**응답 data** — 페이징 **없음**, 이름 오름차순

| 필드                                     | 타입      | 설명            |
| ---------------------------------------- | --------- | --------------- |
| `content[].groupId`                      | `Long`    | 그룹 ID         |
| `content[].name` / `.description`        | `string?` | 그룹명 · 설명   |
| `content[].memberCount`                  | `int`     | 구성원 수       |
| `content[].createdByName` / `.createdAt` | `string`  | 생성자 · 생성일 |

> ℹ️ 구성원 목록은 오지 않는다 — [95](#95-그룹-구성원-목록-조회)로 따로 조회한다.

---

## 92. 사원 그룹 생성

| 항목          | 내용                      |
| ------------- | ------------------------- |
| **Method**    | `POST`                    |
| **Path**      | `/api/v1/employee-groups` |
| **인증 필요** | ✅ (ADMIN)                |
| **사용 위치** | ❌ 미연동                 |

**요청 Body**

| 필드          | 타입      | 필수 | 설명       |
| ------------- | --------- | ---- | ---------- |
| `name`        | `string`  | ✅   | 최대 50자  |
| `description` | `string?` | —    | 최대 500자 |

**응답 data** — `groupId` · `name` · `description` · `memberCount`(생성 직후 `0`)

| status | code                  | 화면 처리         |
| ------ | --------------------- | ----------------- |
| 400    | `GRP_INVALID_REQUEST` | 길이 초과 · 빈 값 |
| 403    | `ACC_ADMIN_REQUIRED`  | 권한 없음         |
| 409    | `GRP_NAME_DUPLICATED` | 그룹명 중복(전역) |

> ℹ️ **201**. 빈 그룹을 만든 뒤 구성원을 따로 추가하는 2단계다.

---

## 93. 사원 그룹 수정

| 항목          | 내용                                |
| ------------- | ----------------------------------- |
| **Method**    | `PATCH`                             |
| **Path**      | `/api/v1/employee-groups/{groupId}` |
| **인증 필요** | ✅ (ADMIN)                          |
| **사용 위치** | ❌ 미연동                           |

**요청 Body** — `name` · `description` 중 **보낸 필드만** 바뀐다. 응답은 [91](#91-사원-그룹-목록-조회)과 같은 구조.

| status | code                  | 화면 처리                    |
| ------ | --------------------- | ---------------------------- |
| 400    | `GRP_INVALID_REQUEST` | 수정할 필드 없음 · 길이 초과 |
| 403    | `ACC_ADMIN_REQUIRED`  | 권한 없음                    |
| 404    | `GRP_NOT_FOUND`       | 그룹 없음                    |
| 409    | `GRP_NAME_DUPLICATED` | 그룹명 중복                  |

> ℹ️ 그룹명을 바꿔도 이미 부여된 권한에는 영향이 없다.

---

## 94. 사원 그룹 삭제

| 항목          | 내용                                |
| ------------- | ----------------------------------- |
| **Method**    | `DELETE`                            |
| **Path**      | `/api/v1/employee-groups/{groupId}` |
| **인증 필요** | ✅ (ADMIN)                          |
| **사용 위치** | ❌ 미연동                           |

**응답 data** — `null`

| status | code                 | 화면 처리 |
| ------ | -------------------- | --------- |
| 403    | `ACC_ADMIN_REQUIRED` | 권한 없음 |
| 404    | `GRP_NOT_FOUND`      | 그룹 없음 |

> ⚠️ 부서 · 직급과 달리 **구성원이 있어도 삭제된다** (매핑 CASCADE). 확인 모달에서 인원수를 보여줘야 한다.

---

## 95. 그룹 구성원 목록 조회

| 항목          | 내용                                        |
| ------------- | ------------------------------------------- |
| **Method**    | `GET`                                       |
| **Path**      | `/api/v1/employee-groups/{groupId}/members` |
| **인증 필요** | ✅ (전체 사용자)                            |
| **사용 위치** | ❌ 미연동                                   |

**응답 data** — 이름 오름차순

| 필드                         | 타입      | 설명          |
| ---------------------------- | --------- | ------------- |
| `groupId` / `name`           | —         | 그룹 정보     |
| `content[].userId` / `.name` | `string`  | 사번 · 이름   |
| `content[].departmentPath`   | `string?` | 2단 부서 경로 |
| `content[].jobPositionName`  | `string?` | 직급명        |
| `content[].addedAt`          | `string`  | 그룹 추가일   |

| status | code            | 화면 처리 |
| ------ | --------------- | --------- |
| 404    | `GRP_NOT_FOUND` | 그룹 없음 |

---

## 96. 그룹 구성원 추가

| 항목          | 내용                                        |
| ------------- | ------------------------------------------- |
| **Method**    | `POST`                                      |
| **Path**      | `/api/v1/employee-groups/{groupId}/members` |
| **인증 필요** | ✅ (ADMIN)                                  |
| **사용 위치** | ❌ 미연동                                   |

**요청 Body** — `userIds` (`string[]`, 1개 이상)

**응답 data** — `groupId` · `requestedCount` · `addedCount` · `alreadyMemberCount` · `memberCount`

| status | code                              | 화면 처리                               |
| ------ | --------------------------------- | --------------------------------------- |
| 400    | `GRP_INVALID_REQUEST`             | `userIds` 비어 있음                     |
| 403    | `ACC_ADMIN_REQUIRED`              | 권한 없음                               |
| 403    | `ACC_SYSTEM_ACCOUNT_NOT_ALLOWED`  | 시스템 계정 포함                        |
| 404    | `GRP_NOT_FOUND` · `EMP_NOT_FOUND` | 없는 사번 하나라도 있으면 **전체 거부** |

> ℹ️ **멱등**이다 — 이미 소속인 사번은 조용히 skip 되고 `alreadyMemberCount` 로 집계된다.
> ⚠️ 구성원을 추가해도 그 사람의 페이지 권한은 늘어나지 않는다 (권한은 스냅샷).

---

## 97. 그룹 구성원 제거

| 항목          | 내용                                                 |
| ------------- | ---------------------------------------------------- |
| **Method**    | `DELETE`                                             |
| **Path**      | `/api/v1/employee-groups/{groupId}/members/{userId}` |
| **인증 필요** | ✅ (ADMIN)                                           |
| **사용 위치** | ❌ 미연동                                            |

**응답 data** — `groupId` · `memberCount`

| status | code                   | 화면 처리     |
| ------ | ---------------------- | ------------- |
| 403    | `ACC_ADMIN_REQUIRED`   | 권한 없음     |
| 404    | `GRP_NOT_FOUND`        | 그룹 없음     |
| 404    | `GRP_MEMBER_NOT_FOUND` | 구성원이 아님 |

> ℹ️ 다건 제거 API 는 없다 — **한 명씩** 호출한다. 제거해도 받은 권한은 유지된다.

---

## 페이지 권한 도메인 — 공통

| 항목              | 내용                                                                                             |
| ----------------- | ------------------------------------------------------------------------------------------------ |
| 카탈로그          | 페이지 11개는 **개발자가 코드로 고정**한다 — ADMIN 도 생성 · 삭제할 수 없다                       |
| 부여 대상         | 11개 중 **`BIDDING`(공고·입찰) · `FINANCE`(재무) 2개뿐**. 나머지는 전역 role 로 열린다            |
| `permission`      | `NONE`(보이지만 접근 불가) · `VIEWER` · `EDITOR` — 부여 화면의 3지선다와 1:1                      |
| `source`          | `GRANTED`(명시 부여 · 회수 가능) · `GLOBAL_ROLE`(전역권한 · 회수 불가) · `ADMIN_ONLY` · `DEFAULT` |
| 노출 ≠ 접근       | 메뉴가 보여도 `permission: NONE` 이면 진입 시 차단해야 한다                                       |
| ADMIN 제외 페이지 | `PROJECT_CREATE` · `MY_PROJECT` 만 미반환 (시스템 계정이라 `project_member` 등록 불가)            |
| 카탈로그 코드    | `HOME` · `NOTIFICATION` · `APPROVAL` · `BIDDING` · `PROJECT_CREATE` · `MY_PROJECT` · `FINANCE` · `COMPANY_STATUS` · `TEMPLATE` · `ADMIN_CONSOLE` · `SETTINGS` (2026-08-10 응답 확인) |
| 프론트 정책      | 사이드바는 `/my/pages` 응답만 그린다. 화면이 없는 코드(`COMPANY_STATUS` · `TEMPLATE`)와 대응이 미확정인 코드(`ADMIN_CONSOLE` · `SETTINGS`)만 `constants/menu.ts` 고정 항목으로 남는다 |

---

## 98. 내 페이지 목록 조회

| 항목          | 내용                                                        |
| ------------- | ----------------------------------------------------------- |
| **Method**    | `GET`                                                       |
| **Path**      | `/api/v1/my/pages`                                          |
| **인증 필요** | ✅ (전체 사용자)                                            |
| **사용 위치** | `features/pagePermission/api.ts` → `getMyPages()` (사이드바 · 접근 가드) |

**응답 data** — `content[]`

| 필드                   | 타입     | 설명                         |
| ---------------------- | -------- | ---------------------------- |
| `content[].pageCode`   | `string` | 페이지 코드                  |
| `content[].name`       | `string` | 메뉴 표시명                  |
| `content[].permission` | `string` | `NONE` · `VIEWER` · `EDITOR` |
| `content[].source`     | `string` | 접근 근거 4종                |

> ⚠️ **사이드바 노출의 유일한 근거**다. 프론트는 메뉴 표시 규칙을 갖지 않고 이 응답만 그린다 — 여기 없는 페이지는 버튼이 뜨지 않는다.
> ⚠️ `permission: NONE` 은 "버튼은 그리되 접근은 막아라" 는 뜻이다 (부여 전의 `BIDDING` · `FINANCE`).
> ℹ️ role 마다 반환 집합이 다르다. 없으면 빈 배열.

---

## 99. 페이지 목록 조회 (권한 부여용)

| 항목          | 내용            |
| ------------- | --------------- |
| **Method**    | `GET`           |
| **Path**      | `/api/v1/pages` |
| **인증 필요** | ✅ (ADMIN)      |
| **사용 위치** | `features/pagePermission/api.ts` → `getPages()` |

**응답 data** — `content[]`

| 필드                                            | 타입      | 설명                   |
| ----------------------------------------------- | --------- | ---------------------- |
| `content[].pageCode` / `.name` / `.description` | `string`  | 페이지 정보            |
| `content[].accessCount`                         | `int`     | 접근 가능 총 인원      |
| `content[].grantedCount`                        | `int`     | 명시 부여 인원         |
| `content[].globalRoleCount`                     | `int`     | 전역권한으로 보는 인원 |
| `content[].lastModifiedAt`                      | `string?` | 마지막 권한 변경 시각  |

> ⚠️ [98](#98-내-페이지-목록-조회)과 **반환 집합이 다르다** — 여기는 부여 가능한 `BIDDING` · `FINANCE` 2개만 온다.

---

## 100. 페이지 접근 가능자 목록

| 항목          | 내용                                   |
| ------------- | -------------------------------------- |
| **Method**    | `GET`                                  |
| **Path**      | `/api/v1/pages/{pageCode}/permissions` |
| **인증 필요** | ✅ (ADMIN)                             |
| **사용 위치** | `features/pagePermission/api.ts` → `getPageAccessors()` |

**응답 data** — 정렬은 `GRANTED` 먼저, 그다음 이름순

| 필드                                            | 타입      | 설명                          |
| ----------------------------------------------- | --------- | ----------------------------- |
| `pageCode` / `name`                             | `string`  | 페이지 정보                   |
| `content[].userId` / `.name`                    | `string`  | 사번 · 이름                   |
| `content[].departmentPath` / `.jobPositionName` | `string?` | 부서 경로 · 직급              |
| `content[].role`                                | `string`  | 전역 권한                     |
| `content[].permission` / `.source`              | `string`  | 등급 · 접근 근거              |
| `content[].revocable`                           | `boolean` | **`false` 면 회수 대상 아님** |
| `grantedCount` / `globalRoleCount`              | `int`     | 근거별 집계                   |

| status | code                 | 화면 처리   |
| ------ | -------------------- | ----------- |
| 403    | `ACC_ADMIN_REQUIRED` | 권한 없음   |
| 404    | `PAGE_NOT_FOUND`     | 페이지 없음 |

> ℹ️ 부여 기록 + 전역권한 열람자를 **함께** 내려준다 — "3명 줬는데 왜 5명이 보나" 를 막기 위함이다.

---

## 101. 페이지 권한 부여 · 등급 변경

| 항목          | 내용                                   |
| ------------- | -------------------------------------- |
| **Method**    | `POST`                                 |
| **Path**      | `/api/v1/pages/{pageCode}/permissions` |
| **인증 필요** | ✅ (ADMIN)                             |
| **사용 위치** | `features/pagePermission/api.ts` → `grantPagePermissions()` |

**요청 Body**

| 필드                       | 타입       | 필수 | 설명                |
| -------------------------- | ---------- | ---- | ------------------- |
| `permissions`              | `Object[]` | ✅   | 1개 이상            |
| `permissions[].userId`     | `string`   | ✅   | 사번                |
| `permissions[].permission` | `string`   | ✅   | `VIEWER` · `EDITOR` |

**응답 data** — `pageCode` · `requestedCount` · `grantedCount` · `updatedCount` · `unchangedCount`

| status | code                                                    | 화면 처리                        |
| ------ | ------------------------------------------------------- | -------------------------------- |
| 400    | `PAGE_INVALID_REQUEST` · `PAGE_INVALID_PERMISSION`      | 빈 목록 · 허용되지 않는 등급     |
| 403    | `ACC_ADMIN_REQUIRED` · `ACC_SYSTEM_ACCOUNT_NOT_ALLOWED` | 권한 없음 · ADMIN 대상           |
| 404    | `PAGE_NOT_FOUND` · `EMP_NOT_FOUND`                      | 없는 사번 포함 → **전체 거부**   |

> ⚠️ **전체 교체가 아니다** — 요청에 없는 사용자는 건드리지 않는다. 회수 불가한 MASTER 가 섞여 있어 `PUT` 이 아닌 `POST` 다.
> ℹ️ 부여와 등급 변경이 같은 API 다 (이미 있으면 갱신 → `updatedCount`).
> ℹ️ 그룹으로 부여해도 **개인 단위 스냅샷**으로 저장돼, 이후 그룹 구성원이 바뀌어도 권한은 불변이다.

---

## 102. 페이지 권한 회수

| 항목          | 내용                                            |
| ------------- | ----------------------------------------------- |
| **Method**    | `DELETE`                                        |
| **Path**      | `/api/v1/pages/{pageCode}/permissions/{userId}` |
| **인증 필요** | ✅ (ADMIN)                                      |
| **사용 위치** | `features/pagePermission/api.ts` → `revokePagePermission()` |

**응답 data**

| 필드                  | 타입      | 설명                               |
| --------------------- | --------- | ---------------------------------- |
| `pageCode` / `userId` | `string`  | 대상                               |
| `stillAccessible`     | `boolean` | 회수 후에도 접근 가능한지          |
| `accessSource`        | `string?` | 남은 접근 근거 (예: `GLOBAL_ROLE`) |

| status | code                        | 화면 처리                       |
| ------ | --------------------------- | ------------------------------- |
| 403    | `ACC_ADMIN_REQUIRED`        | 권한 없음                       |
| 404    | `PAGE_NOT_FOUND`            | 페이지 없음                     |
| 404    | `PAGE_PERMISSION_NOT_FOUND` | 부여 기록이 없어 회수할 것 없음 |

> ⚠️ MASTER 는 회수해도 전역 권한으로 페이지가 계속 보인다 (`stillAccessible: true`) — 화면에서 이 사실을 안내해야 오해가 없다.

---

> ✏️ 새 API를 연동할 때 위 양식대로 계속 추가하세요.
> 핵심은 **백엔드 응답 타입을 정확히** 적어두는 것 — AI가 타입 안전하게 연동 코드를 짜줘요.
