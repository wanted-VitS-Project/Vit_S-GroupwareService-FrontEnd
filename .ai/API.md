# 연동 API 명세서

**최종 업데이트**: 2026-08-17 (정산 현황 — 프로젝트 집계 · 회차 조회 3종 추가)
**최종 업데이트**: 2026-08-16 (전사 파일 탐색기 151~~154 신설, 블록 삭제 D안 — 파일 동반 휴지통행 반영)
**최종 업데이트**: 2026-08-13 (프로젝트 인원 편집 · 설정 · 스텝 권한 — 125~~137 추가, 45번 `deleted` · `NONE` 폐기 반영)

> 📌 이 파일은 **프론트가 연동하는 백엔드 API**를 정리하는 곳이에요. (내가 만드는 게 아니라 **호출하는** 입장)
> AI는 API 연동 코드를 작성하기 전에 이 파일을 먼저 읽어요. (잘못된 경로/필드/타입으로 fetch 짜는 실수 방지)
>
> ⚠️ **`최종 업데이트` 줄은 최근 3건까지만 유지**한다. 그 이전 것은 삭제. (무한 누적 방지)

---

## 목차

| #                                         | API                | Method · Path                                                | 연동                                  |
| ----------------------------------------- | ------------------ | ------------------------------------------------------------ | ------------------------------------- |
| [1](#1-로그인)                            | 로그인             | `POST /auth/login`                                           | ✅ `features/auth/api.ts`             |
| [2](#2-로그아웃)                          | 로그아웃           | `POST /auth/logout`                                          | ✅ `features/auth/api.ts`             |
| [3](#3-내-정보-조회)                      | 내 정보 조회       | `GET /auth/me`                                               | ✅ `features/auth/api.ts`             |
| [4](#4-약관-동의)                         | 약관 동의          | `POST /auth/terms-agreements`                                | ✅ `features/auth/api.ts`             |
| [5](#5-비밀번호-변경)                     | 비밀번호 변경      | `PATCH /auth/password`                                       | ✅ `features/auth/api.ts`             |
| [6](#6-프로젝트-상세-조회)                | 프로젝트 상세      | `GET /projects/{projectId}`                                  | ✅ `features/project/api.ts`          |
| [7](#7-프로젝트-스테이지-목록)            | 스테이지 목록      | `GET /projects/{projectId}/stages`                           | ✅ `features/project/api.ts`          |
| [8](#8-프로젝트-스텝-목록)                | 스텝 목록          | `GET /projects/{projectId}/steps`                            | ✅ `features/project/api.ts`          |
| [9](#9-블록-생성)                         | 블록 생성          | `POST /steps/{stepId}/blocks`                                | ✅ `features/block/api.ts`            |
| [10](#10-스텝-블록-일괄-조회)             | 블록 일괄 조회     | `GET /steps/{stepId}/blocks`                                 | ✅ `features/block/api.ts`            |
| [11](#11-텍스트-본문-수정)                | 텍스트 본문 수정   | `PATCH /blocks/texts/{txtId}`                                | ✅ `features/block/api.ts`            |
| [12](#12-체크리스트-항목-생성)            | 체크리스트 생성    | `POST /blocks/checklists/{chkBlockId}/items`                 | ✅ `features/block/api.ts`            |
| [13](#13-체크리스트-항목-수정)            | 체크리스트 수정    | `PATCH /blocks/checklists/items/{chkId}`                     | ✅ `features/block/api.ts`            |
| [14](#14-체크리스트-항목-삭제)            | 체크리스트 삭제    | `DELETE /blocks/checklists/items/{chkId}`                    | ✅ `features/block/api.ts`            |
| [15](#15-사업-카테고리-목록-조회)         | 카테고리 목록      | `GET /business-categories`                                   | ✅ `features/businessCategory/api.ts` |
| [16](#16-사업-카테고리-생성)              | 카테고리 생성      | `POST /business-categories`                                  | ✅ `features/businessCategory/api.ts` |
| [17](#17-사업-카테고리-수정)              | 카테고리 수정      | `PATCH /business-categories/{categoryId}`                    | ✅ `features/businessCategory/api.ts` |
| [18](#18-사업-카테고리-삭제)              | 카테고리 삭제      | `DELETE /business-categories/{categoryId}`                   | ✅ `features/businessCategory/api.ts` |
| [19](#19-전역-권한-변경)                  | 권한 변경          | `PATCH /accounts/{userId}/role`                              | ✅ `features/employee/api.ts`         |
| [20](#20-계정-상태-변경)                  | 계정 상태 변경     | `PATCH /accounts/{userId}/status`                            | ✅ `features/employee/api.ts`         |
| [21](#21-비밀번호-재설정-개인--다중-공용) | 비밀번호 재설정    | `POST /accounts/password-resets`                             | ✅ `features/employee/api.ts`         |
| [22](#22-부서-목록-조회)                  | 부서 목록          | `GET /departments`                                           | ✅ `features/department/api.ts`       |
| [23](#23-부서-생성-최상위--하위-공용)     | 부서 생성          | `POST /departments`                                          | ✅ `features/department/api.ts`       |
| [24](#24-부서명-수정)                     | 부서명 수정        | `PATCH /departments/{departmentId}`                          | ✅ `features/department/api.ts`       |
| [25](#25-부서-삭제)                       | 부서 삭제          | `DELETE /departments/{departmentId}`                         | ✅ `features/department/api.ts`       |
| [26](#26-직급-목록-조회)                  | 직급 목록          | `GET /job-positions`                                         | ✅ `features/jobPosition/api.ts`      |
| [27](#27-직급-생성)                       | 직급 생성          | `POST /job-positions`                                        | ✅ `features/jobPosition/api.ts`      |
| [28](#28-직급-수정-직급명--순서)          | 직급 수정          | `PATCH /job-positions/{jobPositionId}`                       | ✅ `features/jobPosition/api.ts`      |
| [29](#29-직급-삭제)                       | 직급 삭제          | `DELETE /job-positions/{jobPositionId}`                      | ✅ `features/jobPosition/api.ts`      |
| [30](#30-사원-목록-조회-인사관리)         | 사원 목록          | `GET /employees`                                             | ✅ `features/employee/api.ts`         |
| [31](#31-사원-상세-조회)                  | 사원 상세          | `GET /employees/{userId}`                                    | ✅ `features/employee/api.ts`         |
| [32](#32-사원-등록-계정-동시-발급)        | 사원 등록          | `POST /employees`                                            | ✅ `features/employee/api.ts`         |
| [33](#33-사원-정보-수정)                  | 사원 수정          | `PATCH /employees/{userId}`                                  | ✅ `features/employee/api.ts`         |
| [34](#34-퇴사-처리)                       | 퇴사 처리          | `PATCH /employees/{userId}/resignation`                      | ✅ `features/employee/api.ts`         |
| [35](#35-사원-이름-검색-결재선-지정용)    | 사원 이름 검색     | `GET /employees/search`                                      | ✅ `EmployeeSearchInput` (#41)        |
| [36](#36-블록-파일-목록-조회)             | 블록 파일 목록     | `GET /blocks/{blockId}/files`                                | ✅ `features/file/api.ts`             |
| [37](#37-파일-업로드-시작)                | 업로드 시작        | `POST /files/uploads`                                        | ✅ `features/file/api.ts`             |
| [38](#38-업로드-완료-통보)                | 업로드 완료 통보   | `POST /files/uploads/{fileVersionId}/complete`               | ✅ `features/file/api.ts`             |
| [39](#39-문서명-수정)                     | 문서명 수정        | `PATCH /files/{fileId}`                                      | ✅ `features/file/api.ts`             |
| [40](#40-휴지통으로-이동)                 | 휴지통으로 이동    | `DELETE /files/{fileId}`                                     | ✅ `features/file/api.ts`             |
| [41](#41-버전-이력-조회)                  | 버전 이력          | `GET /files/{fileId}/versions`                               | ✅ `features/file/api.ts`             |
| [42](#42-다운로드-url-발급)               | 다운로드 URL       | `GET /file-versions/{id}/download`                           | ✅ `features/file/api.ts`             |
| [43](#43-미리보기-조회-pdf-바이너리)      | 미리보기 (PDF)     | `GET /file-versions/{id}/preview`                            | ✅ `features/file/api.ts`             |
| [44](#44-블록-배치-변경)                  | 블록 배치 변경     | `PATCH /steps/{stepId}/blocks/layout`                        | ✅ `features/block/api.ts`            |
| [45](#45-프로젝트-참여자-목록-조회)       | 참여자 목록        | `GET /projects/{projectId}/members`                          | ✅ `features/project/api.ts`          |
| [46](#46-블록-수정)                       | 블록 수정          | `PATCH /blocks/{blockId}`                                    | ✅ `features/block/api.ts`            |
| [47](#47-블록-삭제)                       | 블록 삭제          | `DELETE /blocks/{blockId}`                                   | ✅ `features/block/api.ts`            |
| [48](#48-결재-회차-상세조회)              | 결재 회차 상세     | `GET /approvals/{id}/revisions/{revId}`                      | ✅ `features/approval/api.ts`         |
| [49](#49-결재-제목--내용-수정)            | 제목 · 내용 수정   | `PATCH /approvals/{id}/revisions/{revId}`                    | ✅ `features/approval/api.ts`         |
| [50](#50-재상신-회차-생성)                | 재상신 회차 생성   | `POST /approvals/{id}/revisions`                             | ✅ `features/approval/api.ts`         |
| [51](#51-결재-상신)                       | 결재 상신          | `POST /approvals/{id}/revisions/{revId}/submit`              | ✅ `features/approval/api.ts`         |
| [52](#52-결재-문서-추가)                  | 결재 문서 추가     | `POST /approvals/{id}/revisions/{revId}/documents`           | ✅ `features/approval/api.ts`         |
| [53](#53-결재-문서-제거)                  | 결재 문서 제거     | `DELETE /approvals/{id}/revisions/{revId}/documents/{docId}` | ✅ `features/approval/api.ts`         |
| [54](#54-결재선-등록--수정)               | 결재선 등록·수정   | `PUT /approvals/{id}/revisions/{revId}/lines`                | ✅ `features/approval/api.ts`         |
| [55](#55-스텝별-이슈-목록-조회)           | 이슈 목록          | `GET /steps/{stepId}/issues`                                 | ✅ `features/issue/api.ts`            |
| [56](#56-이슈-생성)                       | 이슈 생성          | `POST /steps/{stepId}/issues`                                | ✅ `features/issue/api.ts`            |
| [57](#57-이슈-상세-조회)                  | 이슈 상세          | `GET /issues/{issueId}`                                      | ✅ `features/issue/api.ts`            |
| [58](#58-이슈-부분-수정)                  | 이슈 부분 수정     | `PATCH /issues/{issueId}`                                    | ✅ `features/issue/api.ts`            |
| [59](#59-이슈-상태-변경)                  | 이슈 상태 변경     | `PATCH /issues/{issueId}/status`                             | ✅ `features/issue/api.ts`            |
| [60](#60-이슈-삭제)                       | 이슈 삭제          | `DELETE /issues/{issueId}`                                   | ✅ `features/issue/api.ts`            |
| [61](#61-결재관리-목록조회)               | 결재 목록          | `GET /approvals`                                             | ✅ `features/approval/api.ts`         |
| [62](#62-결재-상세조회)                   | 결재 상세          | `GET /approvals/{id}`                                        | ✅ `features/approval/api.ts`         |
| [63](#63-결재-승인)                       | 결재 승인          | `POST /approval-lines/{lineId}/approve`                      | ✅ `features/approval/api.ts`         |
| [64](#64-결재-반려)                       | 결재 반려          | `POST /approval-lines/{lineId}/reject`                       | ✅ `features/approval/api.ts`         |
| [65](#65-버전-단건-조회-결재용)           | 버전 단건 조회     | `GET /file-versions/{fileVersionId}`                         | ✅ `features/file/api.ts`             |
| [66](#66-이미지-항목-조회-한-장)          | 이미지 한 장 조회  | `GET /blocks/images/{id}/items/{orderIndex}`                 | ✅ `features/block/api.ts`            |
| [67](#67-이미지-항목-생성)                | 이미지 생성        | `POST /blocks/images/{id}/items`                             | ✅ `features/block/api.ts`            |
| [68](#68-이미지-순서--캡션-수정)          | 이미지 순서·캡션   | `PATCH /blocks/images/items/{imgBlockId}`                    | ✅ `features/block/api.ts`            |
| [69](#69-이미지-항목-삭제)                | 이미지 삭제        | `DELETE /blocks/images/items/{imgId}`                        | ✅ `features/block/api.ts`            |
| [70](#70-이미지-다운로드)                 | 이미지 다운로드    | `GET /blocks/images/{id}/download`                           | ✅ `features/block/api.ts`            |
| [71](#71-이미지-항목-전체-조회)           | 이미지 전체 조회   | `GET /blocks/images/{id}/items`                              | ✅ `features/block/api.ts`            |
| [73](#73-결재-이력조회)                   | 결재 이력          | `GET /approvals/{id}/revisions`                              | ✅ `features/approval/api.ts`         |
| [74](#74-프로젝트-파일-버전-목록)         | 프로젝트 버전 목록 | `GET /projects/{projectId}/file-versions`                    | ✅ `features/file/api.ts`             |
| [75](#75-검토-템플릿-목록)                | 검토 템플릿        | `GET /vitamate/review-templates`                             | ✅ `features/vitamate/api.ts`         |
| [76](#76-비타메이트-분석-요청)            | 분석 요청          | `POST /blocks/{blockId}/vitamate/analyses`                   | ✅ `features/vitamate/api.ts`         |
| [77](#77-비타메이트-분석-단건-조회)       | 분석 단건 조회     | `GET /vitamate/analyses/{analysisId}`                        | ✅ `features/vitamate/api.ts`         |
| [78](#78-블록별-분석-이력)                | 분석 이력          | `GET /blocks/{blockId}/vitamate/analyses`                    | ✅ `features/vitamate/api.ts`         |
| [79](#79-알림-목록-조회)                  | 알림 목록          | `GET /notifications`                                         | ✅ `features/notification/api.ts`     |
| [80](#80-알림-이동-대상-조회)             | 알림 이동 대상     | `GET /notifications/{id}/target`                             | ✅ `features/notification/api.ts`     |
| [81](#81-알림-읽음-처리)                  | 알림 읽음          | `PATCH /notifications/{id}/read`                             | ✅ `features/notification/api.ts`     |
| [82](#82-알림-전체-읽음-처리)             | 알림 전체 읽음     | `PATCH /notifications/read-all`                              | ✅ `features/notification/api.ts`     |
| [83](#83-알림-삭제)                       | 알림 삭제          | `DELETE /notifications/{id}`                                 | ✅ `features/notification/api.ts`     |
| [84](#84-프로젝트-목록-조회)              | 프로젝트 목록      | `GET /projects`                                              | ✅ `features/project/api.ts`          |
| [85](#85-정산-항목-수정-시-조회)          | 정산 수정 조회     | `GET /blocks/settlements/{id}/items`                         | ✅ `features/settlement/api.ts`       |
| [86](#86-정산-항목-작성--수정)            | 정산 작성·수정     | `PATCH /blocks/settlements/{id}/items`                       | ✅ `features/settlement/api.ts`       |
| [87](#87-사원-엑셀-템플릿-다운로드)       | 엑셀 템플릿        | `GET /employees/bulk-template`                               | ✅ `features/employee/api.ts`         |
| [88](#88-사원-엑셀-일괄-등록-검증)        | 일괄 등록 검증     | `POST /employees/bulk/validate`                              | ✅ `features/employee/api.ts`         |
| [89](#89-사원-엑셀-일괄-등록)             | 일괄 등록          | `POST /employees/bulk`                                       | ✅ `features/employee/api.ts`         |
| [90](#90-직급별-사원-목록)                | 직급별 사원 목록   | `GET /job-positions/{id}/employees`                          | ✅ `features/jobPosition/api.ts`      |
| [91](#91-사원-그룹-목록-조회)             | 그룹 목록          | `GET /employee-groups`                                       | ✅ `features/employeeGroup/api.ts`    |
| [92](#92-사원-그룹-생성)                  | 그룹 생성          | `POST /employee-groups`                                      | ✅ `features/employeeGroup/api.ts`    |
| [93](#93-사원-그룹-수정)                  | 그룹 수정          | `PATCH /employee-groups/{groupId}`                           | ✅ `features/employeeGroup/api.ts`    |
| [94](#94-사원-그룹-삭제)                  | 그룹 삭제          | `DELETE /employee-groups/{groupId}`                          | ✅ `features/employeeGroup/api.ts`    |
| [95](#95-그룹-구성원-목록-조회)           | 구성원 목록        | `GET /employee-groups/{groupId}/members`                     | ✅ `features/employeeGroup/api.ts`    |
| [96](#96-그룹-구성원-추가)                | 구성원 추가        | `POST /employee-groups/{groupId}/members`                    | ✅ `features/employeeGroup/api.ts`    |
| [97](#97-그룹-구성원-제거)                | 구성원 제거        | `DELETE /employee-groups/{id}/members/{userId}`              | ✅ `features/employeeGroup/api.ts`    |
| [98](#98-내-페이지-목록-조회)             | 내 페이지 목록     | `GET /my/pages`                                              | ✅ `features/pagePermission/api.ts`   |
| [99](#99-페이지-목록-조회-권한-부여용)    | 페이지 목록        | `GET /pages`                                                 | ✅ `features/pagePermission/api.ts`   |
| [100](#100-페이지-접근-가능자-목록)       | 접근 가능자 목록   | `GET /pages/{pageCode}/permissions`                          | ✅ `features/pagePermission/api.ts`   |
| [101](#101-페이지-권한-부여--등급-변경)   | 권한 부여·변경     | `POST /pages/{pageCode}/permissions`                         | ✅ `features/pagePermission/api.ts`   |
| [102](#102-페이지-권한-회수)              | 권한 회수          | `DELETE /pages/{pageCode}/permissions/{userId}`              | ✅ `features/pagePermission/api.ts`   |
| [103](#103-휴지통에서-복구)               | 파일 복구          | `POST /files/{fileId}/restore`                               | ✅ `features/file/api.ts`             |
| [104](#104-파일-영구-삭제)                | 파일 영구 삭제     | `POST /files/{fileId}/permanent-deletion`                    | ✅ `features/file/api.ts`             |
| [105](#105-프로젝트-문서함-전체-파일)     | 프로젝트 문서함    | `GET /projects/{projectId}/files`                            | ✅ `features/file/api.ts`             |
| [106](#106-프로젝트-휴지통-모아보기)      | 프로젝트 휴지통    | `GET /projects/{projectId}/files/trash`                      | ✅ `features/file/api.ts`             |
| [107](#107-프로젝트-이미지-모아보기)      | 이미지 모아보기    | `GET /projects/{projectId}/images`                           | ✅ `features/block/api.ts`            |
| [108](#108-프로젝트-단위-이슈-목록-조회)  | 프로젝트 이슈      | `GET /projects/{projectId}/issues`                           | ✅ `features/issue/api.ts`            |
| [109](#109-이미지-휴지통-조회)            | 이미지 휴지통      | `GET /projects/{projectId}/images/trash`                     | ✅ `features/block/api.ts`            |
| [110](#110-이미지-복구-다건)              | 이미지 복구        | `PATCH /blocks/images/items/restore`                         | ✅ `features/block/api.ts`            |
| [111](#111-이미지-영구-삭제-다건)         | 이미지 영구 삭제   | `DELETE /blocks/images/items/hard`                           | ✅ `features/block/api.ts`            |
| [112](#112-스테이지-생성)                 | 스테이지 생성      | `POST /projects/{projectId}/stages`                          | ✅ `features/project/api.ts`          |
| [113](#113-스테이지-수정)                 | 스테이지 수정      | `PATCH /stages/{stageId}`                                    | ✅ `features/project/api.ts`          |
| [114](#114-스테이지-삭제)                 | 스테이지 삭제      | `DELETE /stages/{stageId}`                                   | ✅ `features/project/api.ts`          |
| [115](#115-스텝-생성)                     | 스텝 생성          | `POST /projects/{projectId}/steps`                           | ✅ `features/project/api.ts`          |
| [116](#116-스텝-수정)                     | 스텝 수정          | `PATCH /steps/{stepId}`                                      | ✅ `features/project/api.ts`          |
| [117](#117-스텝-삭제)                     | 스텝 삭제          | `DELETE /steps/{stepId}`                                     | ✅ `features/project/api.ts`          |
| [118](#118-스텝-완료-처리)                | 스텝 완료 처리     | `POST /steps/{stepId}/complete`                              | ✅ `features/project/api.ts`          |
| [119](#119-스테이지-순서-변경)            | 스테이지 순서      | `PATCH /projects/{projectId}/stages/order`                   | ✅ `features/project/api.ts`          |
| [120](#120-스텝-순서-변경)                | 스텝 순서 · 소속   | `PATCH /projects/{projectId}/steps/order`                    | ✅ `features/project/api.ts`          |
| [121](#121-블록-스텝-이동)                | 블록 스텝 이동     | `PATCH /blocks/{blockId}/step`                               | ✅ `features/block/api.ts`            |
| [122](#122-입찰-공고-목록-조회)           | 입찰 공고 목록     | `GET /bidding/notices`                                       | ✅ `features/bidding/api.ts`          |
| [123](#123-입찰-공고-상세-조회)           | 입찰 공고 상세     | `GET /bidding/notices/{noticeId}`                            | ✅ `features/bidding/api.ts`          |
| [124](#124-스텝-상세-조회)                | 스텝 상세          | `GET /steps/{stepId}`                                        | ❌ 미연동                             |
| [125](#125-참여자-추가)                   | 참여자 추가        | `POST /projects/{projectId}/members`                         | ✅ `features/project/api.ts`          |
| [126](#126-참여자-권한-변경)              | 참여자 권한 변경   | `PATCH /projects/{projectId}/members/{memberId}`             | ✅ `features/project/api.ts`          |
| [127](#127-참여자-제거)                   | 참여자 제거        | `DELETE /projects/{projectId}/members/{memberId}`            | ✅ `features/project/api.ts`          |
| [128](#128-하위-스텝-권한-일괄-적용)      | 스텝 권한 기본값   | `POST /stages/{stageId}/step-permissions`                    | ✅ `features/project/api.ts`          |
| [129](#129-프로젝트-수정)                 | 프로젝트 수정      | `PATCH /projects/{projectId}`                                | ✅ `features/project/api.ts`          |
| [130](#130-프로젝트-상태-변경)            | 프로젝트 상태 변경 | `PATCH /projects/{projectId}/status`                         | ✅ `features/project/api.ts`          |
| [131](#131-프로젝트-종결)                 | 프로젝트 종결      | `POST /projects/{projectId}/close`                           | ✅ `features/project/api.ts`          |
| [132](#132-사업-카테고리-연결)            | 카테고리 연결      | `POST /projects/{projectId}/business-categories`             | ✅ `features/project/api.ts`          |
| [133](#133-사업-카테고리-해제)            | 카테고리 해제      | `DELETE /projects/{projectId}/business-categories/{id}`      | ✅ `features/project/api.ts`          |
| [134](#134-스텝-권한-목록-조회)           | 스텝 권한 목록     | `GET /steps/{stepId}/permissions`                            | ✅ `features/project/api.ts`          |
| [135](#135-스텝-권한-부여--변경)          | 스텝 권한 부여     | `PUT /steps/{stepId}/permissions/{userId}`                   | ✅ `features/project/api.ts`          |
| [136](#136-스텝-권한-회수)                | 스텝 권한 회수     | `DELETE /steps/{stepId}/permissions/{userId}`                | ✅ `features/project/api.ts`          |
| [137](#137-스텝-상태-변경)                | 스텝 상태 변경     | `PATCH /steps/{stepId}/status`                               | ✅ `features/project/api.ts`          |
| [138](#138-프로젝트-직접-생성)            | 프로젝트 생성      | `POST /projects`                                             | ✅ `features/project/api.ts`          |
| [139](#139-프로젝트-삭제)                 | 프로젝트 삭제      | `DELETE /projects/{projectId}`                               | ✅ `features/project/api.ts`          |
| [140](#140-내-프로젝트-파일-모아보기)     | 내 파일            | `GET /files/my`                                              | ✅ `features/file/api.ts`             |
| [141](#141-알림-실시간-수신-sse)          | 알림 실시간 수신   | `GET /notifications/stream`                                  | ✅ `features/notification/stream.ts`  |
| [142](#142-전사-파일-목록-admin)          | 전사 파일 목록     | `GET /admin/files`                                           | ✅ `features/file/api.ts`             |
| [143~150](#143150-사내-문서함-admin)      | 사내 문서함        | `/admin/company-documents …`                                 | ✅ `features/companyDocument/api.ts`  |
| [151~154](#151154-전사-파일-탐색기-admin) | 전사 파일 탐색기   | `/admin/files/projects …`                                    | ✅ `features/file/api.ts`             |

> `Base URL` 과 `/api/v1` 접두사는 생략했다. 실제 경로는 각 섹션 참고.
> 번호 없는 절 — [공통 규약](#공통-규약) · [공통 403 — 게이트 · 권한](#공통-403--게이트--권한) · [파일 도메인 — 공통](#파일-도메인--공통) · [결재 도메인 — 공통](#결재-도메인--공통) · [이미지 도메인 — 공통](#이미지-도메인--공통) · [사원 그룹 도메인 — 공통](#사원-그룹-도메인--공통) · [페이지 권한 도메인 — 공통](#페이지-권한-도메인--공통) · [스테이지 · 스텝 도메인 — 공통](#스테이지--스텝-도메인--공통) · [이슈 도메인 — 공통](#이슈-도메인--공통) · [입찰 도메인 — 공통](#입찰-도메인--공통) · [프로젝트 참여자 · 설정 도메인 — 공통](#프로젝트-참여자--설정-도메인--공통)

### ❗ 백엔드 확인 대기

| 항목                                               | 막힌 기능                                                    | 섹션  |
| -------------------------------------------------- | ------------------------------------------------------------ | ----- |
| `block.type` enum 이 "10값" 인데 정리된 값은 9개   | 모르는 유형은 껍데기로 표시                                  | 9     |
| 블록 생성 응답 `data` 스키마                       | 생성 직후 해당 블록 지정                                     | 9     |
| `detail.chkBlockId` · `detail.items`               | 체크리스트 항목 추가 · 목록                                  | 10    |
| `detail.txtId` · `detail.content`                  | 텍스트 본문 편집                                             | 10    |
| `detail` 의 첫 이미지 키 이름                      | 이미지 블록 (자세히는 이미지 절)                             | 10·66 |
| 배치 동시 편집 보호 (버전 · 변경 알림 채널)        | 마지막 저장이 남의 변경을 덮음                               | 44    |
| 파일 API `PR #190` 머지 대기                       | 문서 블록 실동작 확인                                        | 36~43 |
| 휴지통 화면 목업                                   | 복구 · 영구 삭제 API 연동                                    | —     |
| 이슈 `version` 불일치 + 같은 상태 요청             | 200 인지 409 인지 명세가 갈라져 있다 (화면은 요청을 안 보냄) | 59    |

#### ✅ 2026-08-13 해소 — `PATCH /steps/{stepId}/status` 명세 도착

**137번**으로 추가했다. 완료 처리(118)와 **별개 API** 가 맞고 `version` 은 필수다 — `DONE` 은 이 API 로 보낼 수 없다 (미완료 이슈 처리 선택이 필요해 118 소관).

#### ✅ 2026-08-12 해소 — `version` 조회 응답 실림 (실서버 스키마 확인)

기동 중인 백엔드 `/v3/api-docs` 에서 응답 DTO 스키마를 직접 대조했다.

| 확인한 스키마                                                                      | 해당 API      | 프론트 타입                      |
| ---------------------------------------------------------------------------------- | ------------- | -------------------------------- |
| `IssueListResponseIssueSummary` · `IssueDetailResponse` · `ProjectIssueListRespo…` | 55 · 57 · 108 | ✅ **필수로 조임**               |
| `IssueStatusChangeResponse`                                                        | 59            | ✅ **필수로 조임**               |
| `StageItemResponse` · `StepItemResponse`                                           | 7 · 8         | ⏳ 아직 `version?` (조이기 가능) |
| `BlockItemResponse`                                                                | 10            | ⏳ 아직 `version?` (조이기 가능) |
| `BlockFileListResponseItem`                                                        | 36            | ⏳ 아직 `version?` (조이기 가능) |
| `ImageItemResponse` · `BlockImageItemResponse`                                     | 66 · 67 · 71  | ⏳ 아직 `version?` (조이기 가능) |

> ℹ️ `TEXT` 상세의 `version` 은 `detail` 이 스키마상 열린 객체라 이 방법으로는 확인되지 않는다 — 백엔드 `.ai/api/text.md` 구현 메모가 "블록 목록의 TEXT 상세에도 내려간다" 고 명시한다.
> 📌 **낙관적 락 정본은 백엔드 `.ai/docs/global/CONCURRENCY.md`** 다 (대상 9도메인 · 함정 7가지 · 마이그레이션 번호).
> 백엔드 `.ai/API.md` 는 **작성 규칙** 문서라 `version` 이 없다 — 명세는 `.ai/api/{도메인}.md` 에 있다.

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
    businessCategories: {
      categoryId: number;
      name: string;
      code: string | null;
      deleted: boolean;        // 삭제된 카테고리 (D-6)
    }[];
    bidNoticeId: number | null;
    closeReasonCode: string | null;  // 종결 건만
    closeReasonNote: string | null;
    myPermission: 'VIEWER' | 'EDITOR';
    createdAt: string;         // '2026-08-05T03:39:08'
    version: number;           // 낙관적 락 버전 — 수정·상태변경에 그대로 실어 보낸다
  }
}
```

> ⚠️ `progressRate` 는 **선택 필드**다. 스텝이 0개면 아예 오지 않으므로 `?? 0` 로 받는다.
> ⚠️ `myPermission === 'VIEWER'` 면 수정·추가 버튼을 숨긴다. (실제 차단은 백엔드가 한다)
> ✅ 참여자 목록은 45번 API로 연동했다. 사이드바와 블록 담당자 지정이 같은 목록을 사용한다.
> ⚠️ **`version` 은 화면에 그리는 값이 아니라 다음 쓰기 요청에 실어 보낼 값**이다 (2026-08-11 신설). 상세를 받아 보관하지 않으면 프로젝트 수정·상태변경을 호출할 수 없다.
> 🗑️ **삭제된 카테고리도 이름은 그대로 내려온다** (D-6 · 2026-08-11). 연결 행이 남아 있어 목록에서 사라지지 않으니 `deleted: true` 는 **배지로 표시**하고, **선택 드롭다운에서만 제외**한다.
> ⚠️ `businessCategories[].code` 는 **`null` 이 올 수 있다.**

**Status Code**

| 코드 | code                    | 설명                                                       |
| ---- | ----------------------- | ---------------------------------------------------------- |
| 401  | `AUTH_UNAUTHENTICATED`  | 세션 없음/만료                                             |
| 403  | `PROJECT_ACCESS_DENIED` | 프로젝트 접근 권한 없음                                    |
| 404  | `PROJECT_NOT_FOUND`     | 존재하지 않음 · **다른 회사의 프로젝트도 여기로 떨어진다** |

> 🏢 **회사 격리** (2026-08-11 신설) — 모든 조회가 로그인 사용자의 회사(`company_id`)로 제한된다. 다른 회사 리소스는 403 이 아니라 **404** 다 — 존재 자체를 숨긴다. 화면은 "삭제됐거나 접근 권한이 없습니다" 한 문구로 처리한다.

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
> ❗ **`version` 확인 필요.** 수정(113) · 순서 변경(119)이 이 값을 요구한다. 명세에는 아직 없어 타입은 `version?: number` 로 두고, 없으면 화면이 저장을 막는다. ([스테이지 · 스텝 도메인 — 공통](#스테이지--스텝-도메인--공통))

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
> ❗ **`version` 확인 필요.** 수정(116) · 순서 변경(120)이 이 값을 요구한다. 스테이지와 같은 처리다. ([스테이지 · 스텝 도메인 — 공통](#스테이지--스텝-도메인--공통))

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
> ⛔ **`BID_NOTICE` 는 사용자가 직접 만들 수 없다** (2026-08-11 확인). 공고→프로젝트 전환 API 가 자동 생성한다 (`BID-V1` CNV-06) — 이 API 로 보내면 400 `BLOCK_TYPE_INVALID` 다. **블록 추가 모달 목록에서 제거할 것.**
> ⛔ `MEMO` 는 폐기됐다 (2026-08-03). enum 에도 타입 선택 목록에도 없다.

**Response (201 Created)** — ✅ 2026-08-11 확정

```ts
data: {
  blockId: number;
  stepId: number;
  projectId: number;
  type: BlockTypeCode;
  title: string | null;
  owner: { userId: string; name: string; deleted: boolean } | null;
  rowIndex: number;
  sortOrder: number;
  colSpan: number;
  createdAt: string;   // '2026-08-01T14:00:00'
}
```

> ⚠️ **응답에 `version` 이 없다.** 새 블록은 `1` 로 시작하지만, 이어서 제목·담당자 수정(46) · 배치 변경(44) · 이동(121)을 하려면 **10번을 한 번 다시 불러 `version` 을 받아야 한다.**
> ℹ️ 생성 응답의 `owner.deleted` 는 **항상 `false`** 다. `true` 가 올 수 있는 곳은 조회(10번)뿐이다.
> ℹ️ 10번과 달리 `projectId` 가 여기엔 온다 — 조회 응답에는 내려주지 않는다.

**Status Code** — ✅ 2026-08-11 확정

| 코드 | code                                | 설명                                                  |
| ---- | ----------------------------------- | ----------------------------------------------------- |
| 400  | `BLOCK_TYPE_INVALID`                | 9종 밖의 타입 · **`BID_NOTICE` 도 여기로 떨어진다**   |
| 400  | `BLOCK_TITLE_TOO_LONG`              | `title` 200자 초과                                    |
| 400  | `BLOCK_COL_SPAN_INVALID`            | `colSpan` 이 1~3 밖                                   |
| 401  | `AUTH_UNAUTHENTICATED`              | 세션 없음/만료                                        |
| 403  | `STEP_EDIT_DENIED`                  | 스텝 편집 권한 없음                                   |
| 404  | `STEP_NOT_FOUND`                    | 스텝 없음 · **다른 회사의 스텝도 여기로** (회사 격리) |
| 404  | `USER_NOT_FOUND`                    | 지정한 담당자(`owner`)가 존재하지 않음                |
| 409  | `PAYMENT_CONFIRM_BLOCK_DUPLICATED`  | 입금확인 블록은 **스텝당 1개** (PCB-001B)             |
| 409  | `TAX_INVOICE_VIEW_BLOCK_DUPLICATED` | 세금계산서 조회 블록도 **스텝당 1개** (TXL-001B)      |

> ⚠️ **스텝당 1개 제한이 두 타입에 걸린다** — `PAYMENT_CONFIRM` · `TAX_INVOICE_VIEW`. 이미 있는 스텝에서는 추가 모달에서 미리 비활성화하는 편이 낫다.

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
    owner: {
      userId: string;
      name: string;     // 삭제된 사원이어도 비우지 않는다
      deleted: boolean; // 사원 데이터 삭제 여부 (D-6) — 퇴사(resigned)와 다른 값
    } | null;           // 미지정이면 null (BLK-012)
    rowIndex: number;   // 같은 값끼리 한 행
    sortOrder: number;  // 행 내 순서
    colSpan: number;    // 1~3
    detail: unknown;    // 타입별 상세 — 구조가 타입마다 다르다. 어댑터 없는 타입은 null
    linkedIssueTotal: number;
    linkedIssueDone: number;
    version: number;    // 낙관적 락 버전 — 46 · 44 · 121 에 실어 보낸다
  }[];
}
```

**타입별 `detail` — ✅ 확정 2종**

```ts
// TEXT
detail: {
  txtId: number; // 11번 PATCH /blocks/texts/{txtId} 의 키
  content: string | null; // 마크다운 문자열(HTML 아님). null = 한 번도 저장 안 함
}

// CHECKLIST
detail: {
  chkBlockId: number; // 12번 POST /blocks/checklists/{chkBlockId}/items 의 키
  totalCount: number; // deleted_at IS NULL 만
  completedCount: number;
  items: {
    chkId: number; // 13 · 14번의 키
    content: string;
    isCompleted: boolean;
  }
  []; // chk_id 오름차순(생성순) — sort_order 컬럼이 없어 재정렬 불가
}
```

> ✅ **`detail.txtId` · `detail.chkBlockId` · `detail.items` 키 이름이 확정됐다** (2026-08-11). 프론트의 런타임 검증(`readChecklistBlockDetail` 등)은 방어용으로 남겨도 되지만 **키 추측 분기는 정리 가능**하다.
> ℹ️ 블록 추가 직후 `CHECKLIST` 는 `{ chkBlockId, totalCount: 0, completedCount: 0, items: [] }` 다.
> ℹ️ `items` 에 `sortOrder` 가 없다 — **체크리스트 드래그 재정렬 기능은 만들 수 없다.**

> ℹ️ `data` 안에 `blocks` 로 한 겹 더 감싸져 있다. `getStepBlocks()` 가 벗겨서 배열만 반환한다.
> ℹ️ **`rowIndex` · `sortOrder` 순으로 정렬되어 온다.** 보드는 이 둘로 **평면 순서**를 만든 뒤 앞에서부터 3칸씩 채워 행을 다시 만든다 (`blockLayout.ts`). 서버 `rowIndex` 를 그대로 행으로 쓰지 않으므로 한 행이 3칸을 넘는 일이 없다.
> ⚠️ **`colSpan` 이 1~3 이다.** 블록 생성 명세와 같지만, 화면 기획상 1·2칸만 쓰이더라도 3까지 들어올 수 있어 보드는 3칸까지 그린다.
> ✅ **블록 타입 10종 확정** (2026-08-11) — 9번의 9종 + **`SETTLEMENT`**(정산). `MEMO` 는 폐기됐다. 조회에는 10종이 오지만 **생성 가능한 것은 9종**이고, 그중 `BID_NOTICE` 도 사용자가 못 만든다. 프론트는 모르는 값이 오면 `준비 중인 블록입니다.` 껍데기로 그린다.
> ⚠️ **`status` 필드가 없다.** 블록은 자체 진행 상태를 갖지 않는다 (BLK-005).
> ⛔ **`typeId` · `projectId` 는 내려오지 않는다.** `type_id` 는 다형성 내부 식별자라 노출하지 않고, `block.project_id` 는 폐기됐다.
> ℹ️ **`detail` 은 블록의 내용을 담는 하위 계층이다.** `blockId` 로 관리하는 것은 위 공통 필드까지고, 내용은 타입별 상세 ID(예: `CHECKLIST` 의 `chkBlockId`)로 관리한다.
> ❗ **나머지 `detail` 은 `FILE` 의 `{ fileCount: 3 }` · `SETTLEMENT` 의 `settleId` 평면 스키마만 확인됐다.** 상세 어댑터가 아직 없는 타입은 `detail: null` 로 온다.
> `IMAGE` 는 **`imgBlockId` 와 첫 이미지(필수)** 가 필요하다 — 목록 조회 API 가 없어 **첫 장은 이 응답으로 함께 내려준다** (2026-08-07 확정). 카드는 이 값으로 바로 그리고 두 번째 장부터 66번으로 받는다.
> ❗ **첫 이미지의 키 이름은 확인 필요.** `readImageBlockDetail()` 이 `images: [...]` · `firstImage: {...}` · `detail` 바로 아래 평면(`imgId` · `imageUrl` · `caption` · `orderIndex`) 세 모양을 모두 읽는다. 확정되면 해당 분기만 남긴다.
> ℹ️ `totalCount`(또는 `imageCount`)도 함께 주면 `1 / 5` 표기와 마지막 장 판정이 정확해진다. 없으면 프론트가 다음 장 버튼을 막지 않고 66번 응답의 `totalCount` 로 채운다.
> `APPROVAL` 은 **`approvalId` · `revisionId`(둘 다 필수)** 가 필요하다. 결재 API 가 전부 `approvalId` 로 시작해서, 이 둘이 없으면 `blockId` 만으로는 어느 결재인지 알 수 없다 — `readApprovalBlockDetail()` 이 런타임 검증하고 없으면 블록이 안내만 띄운다.

### 🔄 2026-08-11 변경

🔒 **낙관적 락** — `blocks[].version` 신설. **이 값을 보드 상태에 보관해야** 제목·담당자 수정(46) · 배치 변경(44) · 블록 이동(121)을 호출할 수 있다. 안 보내면 400 `BLOCK_VERSION_REQUIRED` 다. **`version` 이 필수인 블록 API 는 이 3개뿐** — 생성 · 삭제 · 조회는 아니다.

🗑️ **삭제 표시** — `blocks[].owner.deleted` 신설. 담당자 사원이 삭제돼도 **행과 이름이 그대로 내려온다** (예전엔 `INNER JOIN` 이라 사라졌다). `true` 면 이름 뒤에 `(퇴사자)` 문구를 붙이고 **담당자 선택 드롭다운에서만 제외**한다.

> ⚠️ 사원 도메인의 `resigned`(퇴사 · 45번 참여자 목록)와 **다른 값**이다. 서로 대체하지 말 것.
> ❗ **이 응답의 `owner` 에는 `resignedAt` 이 없다.** 이슈 담당자 · 활동 수행자와 달리 **퇴사 여부는 알 수 없어**,
> `deleted` 만 보면 **퇴사했지만 사원 데이터가 남은 담당자를 놓친다.** 그래서 보드가
> [45. 참여자 목록](#45-프로젝트-참여자-목록-조회)을 **한 번 받아 퇴사자 사번 집합**을 만들어 카드로 내려준다
> (`src/features/block/BlockMembersContext.tsx` · 2026-08-12). 이 목록은 **블록 수정 모달의 담당자 후보와 같은 소스**다 — 화면당 한 번만 부른다.
> 문구는 다른 화면과 같은 **`(퇴사자)`** 다 — `deleted` · `resigned` 중 **하나만 참이어도** 붙인다.
> 사용자에게는 "재직 중이 아니다" 하나로 읽히면 되고, 사원 데이터가 남았는지는 백엔드 사정이다.
> ℹ️ **담당자 후보에서는 퇴사자를 제외**한다 (이슈 담당자와 같은 규칙). 이미 지정된 퇴사자는 그대로 둔다.
> ❗ 담당자 수정(46번) 응답에는 `owner.deleted` 가 **명시돼 있지 않다** — 없으면 화면이 옛 값을 유지한다 (`normalizeUpdatedOwner`).
> 📌 블록 응답에 **`owner.resignedAt` 이 실리면 이 우회는 통째로 지운다** — 백엔드에 요청할 항목이다.

🏢 **회사 격리** — 다른 회사의 스텝은 403 이 아니라 **404 `STEP_NOT_FOUND`** 다. 그 외 401 `AUTH_UNAUTHENTICATED` · 403 `STEP_ACCESS_DENIED`.

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
  content: string;     // 필수 — 마크다운 원문 전체
  version: number;     // 필수 — 블록 목록의 `detail.version` 그대로 (2026-08-11 낙관적 락)
  overwrite?: boolean; // true 면 충돌을 무시하고 덮어쓴다
}
```

**Response (200 OK)**

```ts
data: {
  txtId: number;
  content: string;
  updatedAt: string;
  version: number; // 저장 후의 새 값
}
```

| status | code                    | 화면 처리                                 |
| ------ | ----------------------- | ----------------------------------------- |
| 400    | `TEXT_VERSION_REQUIRED` | `version` 누락 — 새로고침 안내            |
| 400    | `TXT-003`               | 내용이 비었다                             |
| 403    | `TXT-001`               | 편집 권한 없음                            |
| 404    | `TXT-002`               | 없는 블록                                 |
| 409    | `TEXT_VERSION_CONFLICT` | **재조회 / 덮어쓰기**를 사용자에게 묻는다 |

> ⚠️ **`txtId` 는 `blockId` 와 다른 값이다.** `chkBlockId` 와 마찬가지로 **블록(`blockId`) > 블록의 내용(`txtId`)** 구조다.
> → 10번 블록 목록 응답의 **`detail.txtId`** 로 받는다. 값이 없으면 프론트는 편집 버튼을 막는다.
> ⚠️ **낙관적 락** (2026-08-11 신설) — `version` 은 **`detail.version`** 이다. `block.version`(46 · 44번이 쓰는 값)과 **다른 테이블의 다른 값**이니 섞어 보내면 전부 409 다.
> ⚠️ 응답 `version` 을 화면에 꽂아야 **연달아 두 번 저장**할 수 있다 — 블록 목록을 다시 읽지 않으므로 `detail.version` 은 옛 값에 머문다 (`TextBlock` 이 상태로 들고 있다).
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
> 🗑️ **`includeDeleted=true` 면 같은 `name` · `code` 가 두 줄 나올 수 있다** (D-7 · 2026-08-13) — 삭제분과 같은 이름의 활성 행이 공존한다. 정상이다. `deletedAt` 으로 갈라 **삭제 행을 흐리게 처리하고 하단으로 내린다**. `categoryId` 가 달라 행 key 는 충돌하지 않는다.

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

> 🗑️ **중복 판정은 활성 행(`deletedAt == null`)만 대상이다** (D-7 · 2026-08-13) — 삭제했던 이름 · 업무코드를 그대로 다시 보내면 **201 로 생성된다**. 복구(restore) 엔드포인트는 없고 **재등록이 곧 재사용 경로**다. 옛 행은 이력으로 남는다.
> ⚠️ 삭제분을 알리던 `"삭제된 카테고리에 같은 이름이…"` 문구는 **더 이상 오지 않는다** — 409 는 `message` 가 아니라 `code` 로 가른다.

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

> 🗑️ 생성과 같이 **삭제분과는 이름 · 업무코드가 충돌하지 않는다** (D-7 · 2026-08-13) — 409 는 활성 행끼리만 난다.

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

| 항목          | 내용                                                  |
| ------------- | ----------------------------------------------------- |
| **Method**    | `GET`                                                 |
| **Path**      | `/api/v1/employees/search`                            |
| **인증 필요** | ✅ (로그인 사용자 전체 — **ADMIN 전용 아님**)         |
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
| **소유 구조** | ⚠️ 파일은 **프로젝트 소속**이고 블록은 참조만 한다. 다만 **블록을 지우면 파일도 함께 휴지통으로 간다** (2026-08-16 D안) |
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

| 필드                                                       | 설명                                               |
| ---------------------------------------------------------- | -------------------------------------------------- |
| `fileId` · `name`                                          | 문서 ID · 표시명                                   |
| `latestVersionId` · `latestVersionNo` · `versionCount`     | 최신 버전 · 총 버전 수                             |
| `originalFileName` · `extension` · `sizeBytes`             | 원본 파일 정보                                     |
| `previewable`                                              | PDF 만 `true`                                      |
| `uploaderName` · `uploaderDepartment` · `uploaderPosition` | 업로더 **스냅샷**                                  |
| `updatedAt` · `deletedAt`                                  | 갱신일 · 휴지통이면 값이 있다                      |
| `version`                                                  | **낙관적 락 버전** — 문서명 수정(39)에 실어 보낸다 |

| status | code                              | 화면 처리           |
| ------ | --------------------------------- | ------------------- |
| 403    | `FILE_ACCESS_PERMISSION_REQUIRED` | 스텝 열람 권한 없음 |
| 404    | `FILE_BLOCK_NOT_FOUND`            | 블록 없음 · 삭제됨  |

> 🚨 **`version` 과 `latestVersionNo` · `versionCount` 는 완전히 다른 값이다.** 앞은 동시 수정 검사용 행 버전, 뒤는 문서의 판 번호다. ([39. 문서명 수정](#39-문서명-수정))
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

**요청 Body** — `name` (✅, 최대 255자) · `version` (✅) · `overwrite` (선택)
**응답 data** — `fileId` · `name` · `version`(저장 후 **+1** 된 새 값)

| status | code                            | 화면 처리                                 |
| ------ | ------------------------------- | ----------------------------------------- |
| 400    | `FILE_INVALID_REQUEST`          | 비었거나 255자 초과 · **`version` 누락**  |
| 403    | `FILE_EDIT_PERMISSION_REQUIRED` | 스텝 편집 권한 없음                       |
| 404    | `FILE_NOT_FOUND`                | 문서 없음 · 이미 휴지통                   |
| 409    | `FILE_VERSION_CONFLICT`         | **재조회 / 덮어쓰기**를 사용자에게 묻는다 |

> ℹ️ **표시명만** 바뀐다. 각 버전에 저장된 원본 파일명은 그대로다.
> ⚠️ **낙관적 락** (2026-08-11 신설) — `version` 은 [36. 블록 파일 목록](#36-블록-파일-목록-조회) 응답의 `content[].version` 이다.
> 🚨 **`versionNo`(버전 차수) · `versionCount`(총 버전 수) 와 전혀 다른 값이다.** 이 도메인은 "버전" 이라는 말이 셋이라 가장 헷갈린다 — 낙관락 `version` 은 **동시 수정 검사용 행 버전**이다.
> ⚠️ 이 도메인은 **409 에 다른 의미도 있다**(`FILE_APPROVAL_IN_PROGRESS`) — 충돌 판정은 status 가 아니라 **`code`** 로 한다 (`isFileVersionConflict`).

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
    version: number; // 필수 ⭐ 2026-08-11 — 이 블록을 조회했을 때의 값
  }[];
}
```

**응답 data** — `{ blocks: [...] }` 로 반영된 배치가 요청과 같은 모양으로 온다.
`blocks[].version` 은 **저장 후의 새 값**이다 — 화면 블록에 덮어써야 다음 저장이 통과한다 (`applyLayouts()`).

> ⚠️ **낙관적 락을 항목마다 검사한다** (2026-08-11 신설). 하나라도 어긋나면 **요청 전체가 409 로 롤백**된다.
> ⛔ **`overwrite` 가 없다** — 409 면 재전송으로는 절대 통과하지 못한다. 화면은 되돌리는 데서 그치지 않고 **목록을 다시 읽어** 새 `version` 을 받는다 (`useLayoutSaver` → `notifyBlockChanged()`).
> ⚠️ 공통 값 하나로 `version` 을 채우면 컴파일도 되고 요청도 나가지만 **전부 409** 다 — 블록마다 자기 값을 실어야 한다 (`toLayoutOrders()`).

| status | code                     | 화면 처리                                      |
| ------ | ------------------------ | ---------------------------------------------- |
| 400    | `BLOCK_COL_SPAN_INVALID` | 우리 요청이 잘못된 경우 — 새로고침 안내로 통일 |
| 400    | `BLOCK_LAYOUT_INVALID`   | 위와 동일 (백엔드 상세 문구는 노출하지 않음)   |
| 401    | `AUTH_TOKEN_EXPIRED`     | 로그인 화면으로 이동                           |
| 403    | `STEP_EDIT_DENIED`       | **`/forbidden` 아님** — 보드에 안내 후 되돌림  |
| 404    | `BLOCK_NOT_FOUND`        | 새로고침 안내 후 되돌림                        |

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

| 항목          | 값                                                    |
| ------------- | ----------------------------------------------------- |
| **Method**    | `GET`                                                 |
| **Path**      | `/api/v1/projects/{projectId}/members`                |
| **권한**      | 프로젝트 참여자                                       |
| **사용 위치** | `src/features/project/api.ts` → `getProjectMembers()` |

응답 `data` 는 `{ members: ProjectMember[] }` 이며 `memberId`, `userId`, `name`, nullable `department`, `permission`, `resigned`, **`deleted`** 를 담는다. 정렬은 이름 → 사번 오름차순이다.

```ts
data: {
  members: {
    memberId: number;
    userId: string;             // 사원 사번
    name: string;
    department: string | null;  // 부서 미배정이면 null
    permission: 'VIEWER' | 'EDITOR';
    resigned: boolean;          // 퇴사자 배지
    deleted: boolean;           // 사원 데이터 삭제 (D-6 · 2026-08-11 신설)
  }[];
}
```

> ⛔ **`permission` 은 `VIEWER` · `EDITOR` 2값이다** — `NONE` 은 폐기됐다 (2026-08-06). 화면에서 `permission !== 'NONE'` 로 거를 필요가 **없다.** 차단은 참여자 제거(127)로 표현한다.
> ⭐ **`deleted` 는 `resigned` 와 다른 상태다** (2026-08-11 · D-6). 둘 다 `true` 일 수도, 하나만 `true` 일 수도 있다. `deleted: true` 여도 `name` 은 그대로 내려오니 **참여자에서 정리하라는 표시**로 쓴다.
> 🗑️ **사원이 삭제돼도 참여자 행은 사라지지 않는다.** 예전엔 `INNER JOIN` 에 걸려 행이 통째로 소멸했는데 지금은 `LEFT JOIN` + `deleted` 플래그다.
> ⚠️ **조회에는 보여도 쓰기는 받지 않는다** — 삭제된 사번으로 참여자 추가(125) · 권한 변경(126)을 부르면 `USER_NOT_FOUND` 404 다. 사원 선택 UI 에서 후보로 내보내지 않는다.

**Status Code** — 200 · 401 `AUTH_UNAUTHENTICATED` · 403 `PROJECT_ACCESS_DENIED` · 404 `PROJECT_NOT_FOUND`(**다른 회사의 프로젝트도 여기로**)

## 46. 블록 수정

| 항목          | 값                                            |
| ------------- | --------------------------------------------- |
| **Method**    | `PATCH`                                       |
| **Path**      | `/api/v1/blocks/{blockId}`                    |
| **사용 위치** | `src/features/block/api.ts` → `updateBlock()` |

요청은 `title?: string | null`, `owner?: string | null`, **`version: number`(필수)**, `overwrite?: boolean` 이다.
보낸 필드만 반영하고, `null` 은 해제, 생략은 기존 값 유지다. `title`·`owner` 를 둘 다 생략하면 400 `BLOCK_UPDATE_FIELD_REQUIRED` 다.
응답은 `blockId`, nullable `title`, nullable `owner`(`userId`·`name`), `updatedAt`, **`version`** 을 담는다.

> ⭐ **여기만 진짜 부분 수정이다.** 스테이지(113) · 스텝(116) 수정은 전체 덮어쓰기라 생략한 필드가 해제된다 — 헷갈리지 말 것.
> ⚠️ **낙관적 락** (2026-08-11 신설) — `version` 을 빼면 400 `BLOCK_VERSION_REQUIRED`, 늦으면 409 다. 409 면 **재조회 / 덮어쓰기**를 사용자에게 묻는다 (`BlockEditModal`).
> ⚠️ 응답 `version` 은 **저장 후의 새 값**이다. 보드 상태(`BlockActionsContext.patch`)에 함께 꽂지 않으면 **다음 수정도, 배치 저장도 전부 409** 다 — 배치는 이 블록의 `version` 을 그대로 실어 보낸다.

## 47. 블록 삭제

| 항목          | 값                                            |
| ------------- | --------------------------------------------- |
| **Method**    | `DELETE`                                      |
| **Path**      | `/api/v1/blocks/{blockId}`                    |
| **권한**      | 스텝 `EDITOR`                                 |
| **사용 위치** | `src/features/block/api.ts` → `deleteBlock()` |

soft delete(`deleted_at` 플래그)만 지원하며 응답 `data` 는 `null` 이다. **하드 삭제 API 는 존재하지 않는다** (BLK-007 · INV-05).

### ⚠️ 블록을 지우면 파일도 휴지통으로 간다 (2026-08-16 · D안 · PR #412 머지 완료)

예전엔 파일이 활성으로 남아 **고아**(`blockDeleted: true`)가 됐다. 이제는 그 블록에 매달린 파일이
**함께 휴지통으로 이동**한다. 스텝(117) · 스테이지(114) 삭제로 하위 블록이 지워질 때도 같다.

| 어디에서              | 무엇이 달라졌나                                                                    |
| --------------------- | ---------------------------------------------------------------------------------- |
| 프로젝트 문서함(105)  | 삭제 블록의 파일이 **바로 사라진다** — `blockDeleted: true` 는 복구된 고아만 남는다 |
| 프로젝트 휴지통(106)  | 자동으로 넘어온 파일이 **여기 나타난다** (`blockDeleted: true`)                     |
| 복구(103)             | 원블록이 없으니 `blockId: null` 로 **문서함에 되살아난다** (블록 복구는 없다)       |

> ⛔ **새 차단 케이스** — 블록에 **진행 중 결재가 참조하는 파일**이 하나라도 있으면 삭제가
> **409 `FILE_APPROVAL_IN_PROGRESS`** 로 거부된다. 결재 취소 되물음(`APPROVAL_DELETE_CONFIRM_REQUIRED`)과
> **다른 코드다** — 저건 한 번 더 누르면 되지만 이건 결재를 회수 · 완료해야 풀린다.
> ⚠️ 그래서 화면은 두 409 를 **`code` 로 갈라** 처리한다 (`BlockDeleteModal` · `StepDeleteModal`).
> ⚠️ 삭제 확인 문구에 **"문서는 휴지통으로 이동"** 을 적는다 — 안 적으면 파일이 사라진 것으로 읽힌다.

> ⛔ **삭제 잠금 4종은 폐기됐다** (2026-08-09 · 백엔드 `BLOCK.md` §8 재작성). 입금 연결 입금확인 · 계산서 연결 조회 · 진행 중 결재 · 결재 대상 파일 — **네 가지 모두 더 이상 409 를 내지 않는다.** 화면에서 삭제를 미리 막던 분기가 있으면 걷어낸다.
> ⚠️ 막는 대신 **옮길 수단을 준다** — 살리고 싶은 블록은 **블록 이동(121)** 으로 다른 스텝에 옮긴 뒤 지운다 (BLK-014).
> ⚠️ 입금·계산서 **연결 해제(BLK-013)는 아직 미구현**이라, 연결이 남은 채로 블록이 삭제된다.
> ⛔ **낙관적 락 대상이 아니다** — `version` 을 받지 않고 409 `BLOCK_VERSION_CONFLICT` 도 나지 않는다. 삭제는 멱등이라 두 번 눌러도 결과가 같고 유실될 편집 내용이 없다.

**Status Code** — 200 · 401 `AUTH_UNAUTHENTICATED` · 403 `STEP_EDIT_DENIED` · 404 `BLOCK_NOT_FOUND`(**다른 회사의 블록도 여기로**) · **409 `APPROVAL_DELETE_CONFIRM_REQUIRED`**(되물음) · **409 `FILE_APPROVAL_IN_PROGRESS`**(거부 · 2026-08-16 신설)

### ⚠️ 결재 블록은 2단계다 (2026-08-13 신설)

상신 이후의 결재가 붙어 있으면 첫 호출이 409 로 막힌다. **되물음이지 실패가 아니다.**

| 단계 | 호출                                     | 결과                              |
| ---- | ---------------------------------------- | --------------------------------- |
| ①    | `DELETE /blocks/{blockId}`               | 409 `APPROVAL_DELETE_CONFIRM_REQUIRED` |
| ②    | `DELETE /blocks/{blockId}?confirmApprovalCancel=true` | 200                   |

> ⛔ **409 를 실패로 끝내면 그 블록은 영영 지울 수 없다.** 확인 다이얼로그가 필수다 (`BlockDeleteModal`).
> ⚠️ **안내 문구를 프론트에서 만들지 않는다** — 결재 상태마다 무엇을 잃는지가 달라 서버 `message` 를 그대로 띄운다 (진행 중 → 결재 취소 / 반려 → 재상신 불가 / 완료 → 승인 이력 소실). **분기는 `code`, 표시는 `message`.**
> ℹ️ `DRAFT` · `CANCELED` 결재는 409 없이 바로 200 이라 다이얼로그가 한 번만 뜬다.
> ℹ️ 결재자 이름은 응답에 없다 — 의도된 결정이다(권한 · 퇴사자 · 시점 불일치).

---

## 결재 도메인 — 공통

| 항목          | 내용                                                                                            |
| ------------- | ----------------------------------------------------------------------------------------------- |
| **구조**      | **결재(`approvalId`) > 상신 회차(`revisionId`) > 결재선 · 결재 문서**                           |
| **회차**      | 상신할 때마다 새로 만들어지고 **이전 회차는 덮어쓰지 않고 이력으로 남는다**                     |
| **상태**      | `DRAFT` · `IN_PROGRESS` · `REJECTED` · `COMPLETED` — 결재 전체와 회차가 같은 값을 쓴다          |
| **편집 권한** | 기안자만. 그것도 **`DRAFT` 회차에서만** — 상신된 회차는 제목 · 내용 · 문서 · 결재선 전부 잠긴다 |
| **조회 권한** | 기안자 · 해당 회차 `ACTIVE` 이상 결재자(과거 이력 포함) · MASTER                                |
| **블록 연결** | 블록 목록 응답의 `detail.approvalId` · `detail.revisionId` — 없으면 블록이 안내만 띄운다        |
| **코드 상수** | `src/features/approval/errorCodes.ts`. 분기는 status 가 아니라 **`code`** 로 한다               |

> ℹ️ 결재 대상은 파일이 아니라 **파일 버전**(`fileVersionId`)이다 (AP-010). 업로드 자체는 파일 도메인 소관이고 결재 API 는 연결만 한다.

### 🚫 참여 불가로 결재가 멈춘 경우 (2026-08-13 신설)

기안자 · 결재자가 퇴사 · 프로젝트 이탈로 더는 진행할 수 없을 때다. **처리 주체와 방법이 다르다.**

| 상황        | 조건                                              | 처리                                              |
| ----------- | ------------------------------------------------- | ------------------------------------------------- |
| 기안자 불가 | `drafterUnavailable && actingDrafterId === null`   | 스텝 `EDITOR` 가 **재상신**(`POST .../revisions`)  |
| 결재자 불가 | `detail.requiresApproverReplacement`               | 기안자가 **교체 · 제외**(`PUT .../lines`)          |

> ⭐ **대행 기안자는 지정 절차가 없다** — 가장 먼저 재상신에 성공한 `EDITOR` 가 된다. 그래서 동시에 누르면 **진 쪽이 403 `APPROVAL_NOT_DRAFTER`** 를 받는다. 서버 문구("기안자 아님")로는 이유를 알 수 없으니 화면이 사정을 알리고 회차를 다시 받는다. 이미 대행자가 있으면 `actingDrafterName` 을 띄우고 버튼을 닫는다.
> ⚠️ 교체 · 제외 대상은 `approverUnavailable === true` 이면서 **`ACTIVE` · `WAITING`** 인 결재선뿐이다 — 이미 승인 · 반려한 결재선은 지나간 이력이라 건드리면 결재가 왜곡된다.
> ⚠️ **제외하면 `order` 를 1부터 다시 매긴다.** 빠진 자리를 그대로 두면 순번에 구멍이 생겨 서버가 다음 결재자를 못 고른다 (`toLinesRequest`).
> ⚠️ 기존 결재선 편집 화면(`ApprovalDraftForm`)을 쓰지 않고 **전용 모달**(`ApproverReplaceModal`)을 연다 — 그쪽은 상신 전 초안에서 결재선을 자유롭게 짜는 곳이라 진행 중인 결재에 열면 이미 승인한 결재선까지 건드리게 된다.
> ❗ **판정 필드의 응답 내 위치를 아직 실측하지 못했다** (2026-08-13). `drafterUnavailable` · `actingDrafterId` · `actingDrafterName` 은 회차 상세에, `approverUnavailable` 은 결재선에, `requiresApproverReplacement` 는 블록 `detail` 에 있다고 **가정**했다. 전부 **선택 필드**라 값이 안 오면 배너가 뜨지 않을 뿐 기존 화면은 그대로 동작한다. 확인되면 `types.ts` 와 `unavailable.ts` 만 고치면 된다 — 화면은 `unavailable.ts` 함수만 본다.
> ℹ️ 결재선 등록은 `PUT` 이라 **전체 치환**이다. 한 명만 바꿔도 목록 전체를 보내야 하고, 빠뜨린 사람은 삭제된다.
> ⚠️ 일반 결재자는 프로젝트 `member` 여야 한다(AP-017). **MASTER · ADMIN 은 이 검증에서 제외**돼 프로젝트에 없어도 지정할 수 있다(AP-019).

### ❗ 결재 — 백엔드 확인 대기

| 항목                                                                          | 막힌 기능                         | 이슈 |
| ----------------------------------------------------------------------------- | --------------------------------- | ---- |
| **결재 문서 열람이 스텝 권한을 본다** (403 `FILE_ACCESS_PERMISSION_REQUIRED`) | 결재자의 문서 미리보기 · 다운로드 | #61  |
| 처리를 마친 결재를 다시 찾을 `scope` 가 없다                                  | 승인 후 목록에서 사라짐           | #60  |

> ❗ **문서 열람 권한 축이 다르다.** 결재 상세는 `기안자 · ACTIVE 이상 결재자(과거 이력 포함) · MASTER` 로 판정하는데, 파일 API 는 **스텝 참여자**만 본다. 결재자 지정은 프로젝트 참여와 별개(AP-019)라, 프로젝트에 없는 MASTER 는 자기가 결재할 문서를 열 수 없다. 파일 API 도 결재 참여 기준을 함께 보도록 요청함.
>
> ❗ **`scope` 는 `drafted` · `pending` · `all` 뿐이다.** 일반 결재자가 승인·반려를 마치면 `pending` 에서 빠지고 `drafted` 에도 없어 목록에서 사라진다(상세는 URL 로 열림). `involved`(결재선에 포함된 결재 전체) 추가를 요청함 — 대기 결재자 노출 여부는 기획 확인 대기.

> ℹ️ **AP-026(마지막 결재자 = MASTER) 사전 검증은 하지 않는다** (2026-08-07 백엔드 협의 — `role` 추가 예정 없음). 결재선 응답에도 사원 검색 응답에도 `role` 이 없고, `approverPosition`("대표")은 회사가 바꿀 수 있는 직급명이라 판정 근거로 쓸 수 없다. 화면 안내 문구도 걷어냈고 위반은 상신 시 **서버 400 문구로만** 알린다.
>
> ⚠️ **명세(Swagger)와 실제 응답이 다른 곳이 많다.** 아래는 2026-08-07 실행으로 확인한 값 기준이다.
>
> | 항목                         | 명세                            | 실제                                            |
> | ---------------------------- | ------------------------------- | ----------------------------------------------- |
> | 회차·결재 상세 `lines[]`     | 상태 없음                       | **`status` · `opinion` · `processedAt` 온다**   |
> | 회차·결재 상세 `documents[]` | `documentId`·`fileVersionId` 뿐 | **`fileName` · `fileSize` · `uploadedAt` 온다** |
> | 회차 상세 `finishedAt`       | 문자열 `"null"`                 | 진짜 `null`                                     |
> | 목록 `content[]`             | 파일 버전 스키마                | 결재 스키마 (아래 61번)                         |
> | 이력 `content[]`             | 사원 스키마                     | 회차 요약 스키마 (아래 73번)                    |
>
> ℹ️ 의견 필드 이름은 **`opinion`** 이다 (`comment` 아님). 승인 · 반려 요청 body 와 같은 이름이다.

---

## 48. 결재 회차 상세조회

| 항목          | 내용                                                    |
| ------------- | ------------------------------------------------------- |
| **Method**    | `GET`                                                   |
| **Path**      | `/api/v1/approvals/{approvalId}/revisions/{revisionId}` |
| **인증 필요** | ✅ 기안자 · 해당 회차 `ACTIVE` 이상 결재자 · MASTER     |
| **사용 위치** | ✅ `features/approval/api.ts` — `getRevision()`         |

**응답 data**

| 필드                                    | 타입                                                                                           | 설명                                  |
| --------------------------------------- | ---------------------------------------------------------------------------------------------- | ------------------------------------- |
| `revisionId` · `revisionNo`             | `number`                                                                                       | 회차 ID · 회차 번호(재상신마다 +1)    |
| `title` · `content`                     | `string \| null`                                                                               | 작성 전이면 null                      |
| `drafterId` · `drafterName`             | `string`                                                                                       | 기안자                                |
| `drafterDepartment` · `drafterPosition` | `string \| null`                                                                               | 기안자 소속 · 직급                    |
| `status`                                | `ApprovalStatus`                                                                               | 회차 상태                             |
| `submittedAt`                           | `string \| null`                                                                               | DRAFT 는 아직 상신 전이라 null        |
| `finishedAt`                            | `string \| null`                                                                               | ❗ 예시가 문자열 `"null"` — 확인 필요 |
| `documents[]`                           | `documentId` · `fileVersionId`                                                                 | 회차에 확정된 결재 문서               |
| `lines[]`                               | `lineId` · `approverId` · `approverName` · `approverPosition` · `approverDepartment` · `order` | 결재선                                |

| status | code                                                 | 화면 처리                                            |
| ------ | ---------------------------------------------------- | ---------------------------------------------------- |
| 403    | `APPROVAL_LINE_NOT_VIEWABLE`                         | **`/forbidden` 아님** — 화면 안에서 "차례 아님" 안내 |
| 404    | `APPROVAL_NOT_FOUND` · `APPROVAL_REVISION_NOT_FOUND` | 불러오지 못했다는 안내                               |

> ⚠️ `lines[]` 에 **처리 상태가 없다.** 진행 현황 스텝퍼는 값이 오면 칠하고 없으면 순서 · 이름만 그린다 — 없는 값을 완료로 추측하면 실제와 어긋난 화면이 된다.

---

## 49. 결재 제목 · 내용 수정

| 항목          | 내용                                                    |
| ------------- | ------------------------------------------------------- |
| **Method**    | `PATCH`                                                 |
| **Path**      | `/api/v1/approvals/{approvalId}/revisions/{revisionId}` |
| **인증 필요** | ✅ 기안자                                               |
| **사용 위치** | ✅ `features/approval/api.ts` — `updateRevision()`      |

**요청 body** — `{ title?, content? }` · **보낸 필드만** 바뀐다 (둘 중 하나만 보내도 된다)

**응답 data** — `revisionId` · `title` · `content` · `updatedAt`

| status | code                          | 화면 처리                      |
| ------ | ----------------------------- | ------------------------------ |
| 403    | `APPROVAL_NOT_DRAFTER`        | 기안자만 수정할 수 있다는 안내 |
| 409    | `APPROVAL_REVISION_NOT_DRAFT` | 이미 상신된 회차 — 편집 잠금   |

> ℹ️ 프론트는 **블러 시점에 저장**한다. 직전에 보낸 값과 같으면 요청하지 않는다 (`ApprovalDraftForm`).

---

## 50. 재상신 회차 생성

| 항목          | 내용                                               |
| ------------- | -------------------------------------------------- |
| **Method**    | `POST`                                             |
| **Path**      | `/api/v1/approvals/{approvalId}/revisions`         |
| **인증 필요** | ✅ 기안자                                          |
| **사용 위치** | ✅ `features/approval/api.ts` — `createRevision()` |

**응답 data** — `revisionId` · `revisionNo` · `status` · `copiedFromRevisionNo` · `title` · `content` · `documents[]` · `lines[]`

| status | code                    | 화면 처리                                    |
| ------ | ----------------------- | -------------------------------------------- |
| 200    | —                       | **이미 있는 DRAFT 회차를 그대로 반환(멱등)** |
| 201    | —                       | 새 회차 생성                                 |
| 403    | `APPROVAL_NOT_DRAFTER`  | 기안자만 가능                                |
| 409    | `APPROVAL_NOT_REJECTED` | 반려 상태가 아닌 결재의 재상신 시도          |

> ⚠️ **멱등이다.** 이미 DRAFT 가 있으면 새로 만들지 않고 200 으로 돌려주므로 프론트가 중복 생성을 막을 필요가 없다.
> ℹ️ 이전 회차의 제목 · 내용 · 문서를 복사하고 **결재선은 반려자부터 재구성**해서 온다(AP-065·066) — 프론트가 다시 만들지 않는다.

---

## 51. 결재 상신

| 항목          | 내용                                                           |
| ------------- | -------------------------------------------------------------- |
| **Method**    | `POST`                                                         |
| **Path**      | `/api/v1/approvals/{approvalId}/revisions/{revisionId}/submit` |
| **인증 필요** | ✅ 기안자                                                      |
| **사용 위치** | ✅ `features/approval/api.ts` — `submitRevision()`             |

**응답 data** — `approvalId` · `revisionId` · `revisionNo` · `status` · `submittedAt` · `firstActiveLineId`

| status | code                                | 화면 처리                            |
| ------ | ----------------------------------- | ------------------------------------ |
| 400    | `APPROVAL_CONTENT_REQUIRED`         | 제목 · 내용을 입력해주세요           |
| 400    | `APPROVAL_DOCUMENT_REQUIRED`        | 결재 문서를 한 개 이상 선택해주세요  |
| 400    | `APPROVAL_LINE_EMPTY`               | 결재자를 한 명 이상 지정해주세요     |
| 400    | `APPROVAL_LINE_ORDER_INVALID`       | 결재 순서가 중복되거나 비어 있습니다 |
| 400    | `APPROVAL_LINE_APPROVER_NOT_MEMBER` | 프로젝트에 없는 결재자가 있습니다    |
| 403    | `APPROVAL_NOT_DRAFTER`              | 기안자만 상신할 수 있다는 안내       |
| 409    | `APPROVAL_REVISION_NOT_DRAFT`       | 이미 상신됨 — **중복 상신 포함**     |

> ℹ️ **최초 상신 · 재상신 겸용**이다. 회차와 결재가 `IN_PROGRESS` 로, 1번 결재선이 `ACTIVE` 로 바뀐다.
> ℹ️ 서버가 제목 · 내용 · 문서 · 결재선을 전부 재검증하므로 **프론트 검증은 왕복을 줄이는 용도**다 (AP-022~026).

---

## 52. 결재 문서 추가

| 항목          | 내용                                                              |
| ------------- | ----------------------------------------------------------------- |
| **Method**    | `POST`                                                            |
| **Path**      | `/api/v1/approvals/{approvalId}/revisions/{revisionId}/documents` |
| **인증 필요** | ✅ 기안자                                                         |
| **사용 위치** | ✅ `features/approval/api.ts` — `addDocument()`                   |

**요청 body** — `{ fileVersionId }`

**응답 data** — `documentId` · `fileVersionId` · `fileName` · `fileSize` · `uploadedAt`

| status | code                                                                                 | 화면 처리        |
| ------ | ------------------------------------------------------------------------------------ | ---------------- |
| 403    | `APPROVAL_NOT_DRAFTER`                                                               | 기안자만 가능    |
| 404    | `FILE_VERSION_NOT_FOUND`                                                             | 없는 파일 버전   |
| 409    | `FILE_VERSION_NOT_READY` · `DOCUMENT_ALREADY_LINKED` · `APPROVAL_REVISION_NOT_DRAFT` | 백엔드 문구 노출 |

> ⚠️ **업로드는 이 API 가 하지 않는다.** 공용 파일 API 로 먼저 올리고 받은 `fileVersionId` 만 연결한다 (`features/file/upload.ts`).
> ⚠️ `DOCUMENT_ALREADY_LINKED` 만 `APPROVAL_` 접두사가 없다 — 명세 그대로 둔다.

---

## 53. 결재 문서 제거

| 항목          | 내용                                                                           |
| ------------- | ------------------------------------------------------------------------------ |
| **Method**    | `DELETE`                                                                       |
| **Path**      | `/api/v1/approvals/{approvalId}/revisions/{revisionId}/documents/{documentId}` |
| **인증 필요** | ✅ 기안자                                                                      |
| **사용 위치** | ✅ `features/approval/api.ts` — `removeDocument()`                             |

**응답** — `204 No Content`

| status | code                          | 화면 처리                    |
| ------ | ----------------------------- | ---------------------------- |
| 403    | `APPROVAL_NOT_DRAFTER`        | 기안자만 가능                |
| 404    | `APPROVAL_DOCUMENT_NOT_FOUND` | 이미 지워진 문서             |
| 409    | `APPROVAL_REVISION_NOT_DRAFT` | 상신된 회차의 문서는 못 지움 |

> ⚠️ **하드 삭제다.** 이력 보존 대상이 아니라 DRAFT 회차에서만 허용된다.

---

## 54. 결재선 등록 · 수정

| 항목          | 내용                                                          |
| ------------- | ------------------------------------------------------------- |
| **Method**    | `PUT`                                                         |
| **Path**      | `/api/v1/approvals/{approvalId}/revisions/{revisionId}/lines` |
| **인증 필요** | ✅ 기안자                                                     |
| **사용 위치** | ✅ `features/approval/api.ts` — `setLines()`                  |

**요청 body** — `{ lines: [{ approverId, order }] }`

**응답 data** — `{ lines: [{ lineId, approverId, approverName, approverPosition, approverDepartment, order }] }`

| status | code                                | 화면 처리                            |
| ------ | ----------------------------------- | ------------------------------------ |
| 400    | `APPROVAL_LINE_APPROVER_NOT_MEMBER` | 프로젝트 member 가 아닌 결재자       |
| 403    | `APPROVAL_NOT_DRAFTER`              | 기안자만 가능                        |
| 409    | `APPROVAL_REVISION_NOT_DRAFT`       | 상신된 회차의 결재선은 잠김 (AP-021) |

> ⚠️ **전체 치환이다.** 한 명 추가·제거해도 목록 전체를 보낸다. `order` 는 화면 순서대로 **1부터 다시 매겨** 보낸다 — 빈 번호가 생기면 400 이다.
> ℹ️ 결재자 선택은 [35. 사원 이름 검색](#35-사원-이름-검색-결재선-지정용)(`EmployeeSearchInput`)으로 한다.

---

## 이슈 도메인 — 공통

| 항목            | 내용                                                                                                     |
| --------------- | -------------------------------------------------------------------------------------------------------- |
| **구조**        | **스텝(`stepId`) > 이슈(`issueId`) > 담당자(`issue_assign`) · 연결 블록(`issue_block`)**                 |
| **상태**        | `TODO` · `IN_PROGRESS` · `DONE` — 보드 3열이 그대로 이 값이다                                            |
| **우선순위**    | `LOW` · `MEDIUM` · `HIGH`                                                                                |
| **완료 시각**   | `completedAt` 은 **사용자가 입력하지 않는다.** `DONE` 진입 시 서버가 찍고, 벗어나면 `null` 로 되돌린다   |
| **권한**        | 조회는 프로젝트 참여자 / 생성 · 수정 · 상태변경 · 삭제는 **스텝 `EDITOR`**                               |
| **삭제**        | soft delete (`deleted_at`). 목록 · 상세 · 집계에서 제외된다                                              |
| **필터 · 정렬** | **서버가 하지 않는다.** 상태 · 담당자 · 블록 · 우선순위 · 제목 검색 · 마감일 정렬은 모두 프론트에서 처리 |
| **없는 것**     | 화면용 `issueKey`, 시작일, 이슈별 진척도, 이슈 활동 이력 — 응답에 없다. 화면에서 만들지 않는다           |

**Assignee** — `{ userId, name, resignedAt }` (`userId` 는 사번). 목록 응답 예시에 `profileImageUrl` 이 섞여 있지만 명세 표에 없어 쓰지 않는다.
**Related Block** — `{ blockId, title, type }`. `title` · `type` 은 표시용이라 요청 body 에 보내지 않는다.

### 🧑‍💼 퇴사자 표기 (2026-08-12 신설 · 도메인 공통 컨벤션)

**사원은 삭제되지 않고 퇴사일만 기록된다.** 사람 객체에 `resignedAt` 이 함께 온다.

```ts
{
  userId: string;
  name: string;
  resignedAt: string | null;
} // 'yyyy-MM-dd'
```

| `resignedAt` | 화면                                                 |
| ------------ | ---------------------------------------------------- |
| `null`       | 재직자 — 기존처럼 이름만                             |
| 날짜         | 퇴사자 — **이름은 그대로 두고 뒤에 `(퇴사자)` 문구** |

> ⚠️ **필드명은 `deletedAt` 이 아니라 `resignedAt` 이다.** 블록 담당자의 `deleted`(사원 데이터 삭제 · D-6)와도 **다른 값**이라 서로 대체하지 마라.
> ⚠️ **퇴사자여도 담당자 · 활동 로그 항목을 화면에서 제거하지 않는다.** 목록에서 빼면 담당자 수가 달라 보인다.
> ℹ️ **사원 조회 API 를 따로 부를 필요가 없다** — 응답에 이미 실려 온다.

**적용 대상**

| API                         | 응답 경로                                 | 화면                            |
| --------------------------- | ----------------------------------------- | ------------------------------- |
| 55 스텝별 이슈 목록         | `issues[].assignees[].resignedAt`         | 이슈 보드 · 블록 연결 이슈 팝업 |
| 57 이슈 상세                | `assignees[].resignedAt`                  | 이슈 상세                       |
| 108 프로젝트 단위 이슈 목록 | `steps[].issues[].assignees[].resignedAt` | 스텝별 이슈 아코디언            |
| 56 이슈 생성 · 58 부분 수정 | `assignees[].resignedAt`                  | 저장 직후 화면 상태 갱신        |
| 72 스텝별 활동 기록         | `activities[].actor.resignedAt`           | 활동 기록 · 블록 활동 로그 팝업 |

**적용하지 않는 응답** — 담당자 · 수행자 객체 자체가 없다: `GET /issues/calendar` · `PATCH /issues/{issueId}/status` · `DELETE /issues/{issueId}`

> ℹ️ 화면 구현은 `src/components/PersonNote.tsx` 가 단일 소스다 — **문구는 `(퇴사자)` 하나로 통일**한다 (근거 필드는 `resignedAt` · 블록 담당자만 `owner.deleted`).
> ⚠️ **테두리 배지가 아니라 이름 뒤 회색 괄호 문구**다. 이름과 붙여 읽히도록 간격은 `gap-0.5` 로 좁힌다.
> 겹친 아바타 스택처럼 문구를 놓을 자리가 없는 곳은 **흐리게 + `이름 (퇴사자)` tooltip** 으로 대신한다.
> ℹ️ **담당자 선택 후보(드롭다운)** 에서는 퇴사자를 뺀다 — 다만 **이미 지정된 퇴사자는 지우지 않는다** (`IssueFormModal` 은 칩 이름을 이슈 응답에서 가져온다).

### 낙관적 락 (2026-08-12 신설)

| API               | `version` | `overwrite` | 409                            |
| ----------------- | --------- | ----------- | ------------------------------ |
| 58 부분 수정      | ✅ 필수   | ❌ **없음** | 필드 단위로 병합 · 사용자 선택 |
| 59 상태 변경      | ✅ 필수   | ❌ 없음     | 최신 상태로 카드 동기화        |
| 56 생성 · 60 삭제 | ❌        | ❌          | 없음 (기준 버전이 없거나 멱등) |

`issue.version` 은 `INT NOT NULL DEFAULT 1` 이고, 서버는 `WHERE issue_id = ? AND version = ? AND deleted_at IS NULL` 로 **조건부 갱신**한다. 영향 행이 0건이면 `409 ISSUE_VERSION_CONFLICT`. 성공하면 `version + 1` 한 새 값을 응답에 담는다.

> ⛔ **`overwrite` 가 없다.** 스테이지 · 스텝 · 블록처럼 "덮어쓰기" 로 빠져나갈 수 없다 —
> 대신 부분 수정이 진짜 부분 수정이라서, **필드가 겹치지 않으면 화면이 병합해 다시 보낸다.**
>
> ⚠️ 담당자 · 관련 블록만 바꿔도 서버가 **issue 버전을 먼저 조건부 증가**시킨 뒤 관계를 갱신한다 (실패 시 전체 롤백). 관계 목록도 낙관적 락 대상이라는 뜻이다.
>
> ✅ **조회 응답 `version` 검증 완료** (2026-08-12) — 기동 중인 백엔드의 `/v3/api-docs` 스키마에서 직접 확인했다:
> `IssueListResponseIssueSummary`(55) · `IssueDetailResponse`(57) · `ProjectIssueListResponseIssueSummary`(108) · `IssueStatusChangeResponse`(59) 전부 `version: integer` 를 갖는다.
> 프론트 타입도 **`IssueSummary.version` 필수**로 조였고, "버전 없으면 저장 차단" 가드는 걷어냈다.
>
> ⚠️ **58번은 요청 본문이 `JsonNode` 바인딩**이라 Swagger 에 요청 스키마가 없다 (블록 수정 46번과 같다).
> Bean Validation 이 안 도니 `version` 누락은 컨트롤러가 직접 `400 ISS_INVALID_REQUEST` 로 막는다 — **스키마만 보고 "version 이 선택" 이라고 읽으면 안 된다.**
>
> ⚠️ **에러코드 접두어가 하나만 다르다.** 이슈 도메인은 전부 `ISS_*`(`ISS_NOT_FOUND` · `ISS_INVALID_REQUEST` · `ISS_EDIT_PERMISSION_REQUIRED`)인데,
> 충돌만 팀 표준(`{도메인}_VERSION_CONFLICT`)을 따라 **`ISSUE_VERSION_CONFLICT`** 다. `version` 누락 · 0 · 음수는 **`400 ISS_INVALID_REQUEST`** 다.
>
> 📌 낙관적 락 **정본은 백엔드 `.ai/docs/global/CONCURRENCY.md`** 다 (정책 · 함정 · 도메인별 적용 범위). 여기엔 화면 처리만 적는다.

#### 화면의 3단 상태 (`base` · `draft` · `latest`)

| 이름     | 무엇               | 쓰임                                                    |
| -------- | ------------------ | ------------------------------------------------------- |
| `base`   | 최초 조회값        | 비교 기준 + **요청에 실을 `version` 의 출처**           |
| `draft`  | 사용자가 입력한 값 | 409 가 와도 **초기화하지 않는다** (커서 · 스크롤 유지)  |
| `latest` | 409 뒤 재조회한 값 | 병합 재료. 사용자가 고르기 전에는 `base` 를 덮지 않는다 |

409 를 받으면 `내가 고친 필드(diff(base, draft)) ∩ 남이 고친 필드(diff(base, latest))` 를 계산한다.

| 교집합 | 화면 처리                                                                       |
| ------ | ------------------------------------------------------------------------------- |
| 없음   | `latest` 위에 내 수정만 얹어 **최신 `version` 으로 한 번 재시도** + 토스트 안내 |
| 있음   | `IssueConflictModal` — 항목마다 **내 값 / 최신값**을 사용자가 고른다            |

> ⚠️ 병합 재시도는 **한 번뿐이다.** 또 어긋나면 기준만 최신으로 옮기고 다음 저장을 사용자에게 맡긴다 — 남이 계속 저장하는 동안 같은 자리를 무한히 돌 수 있다.
> ℹ️ 결과가 같은 값이면 충돌로 세지 않는다 (남이 고쳤어도 내 값과 같으면 다툴 게 없다).

## 55. 스텝별 이슈 목록 조회

| 항목          | 값                                              |
| ------------- | ----------------------------------------------- |
| **Method**    | `GET`                                           |
| **Path**      | `/api/v1/steps/{stepId}/issues`                 |
| **권한**      | 프로젝트 참여자                                 |
| **사용 위치** | `src/features/issue/api.ts` → `getStepIssues()` |

**Query** — `blockId?: number` (해당 블록과 연결된 이슈만)

**응답 data** — `{ issues: IssueSummary[] }`

| 필드            | 타입                         | 비고              |
| --------------- | ---------------------------- | ----------------- |
| `issueId`       | number                       |                   |
| `title`         | string                       |                   |
| `status`        | `TODO`·`IN_PROGRESS`·`DONE`  |                   |
| `priority`      | `LOW`·`MEDIUM`·`HIGH`        |                   |
| `dueDate`       | `YYYY-MM-DD` \| null         | 미지정이면 `null` |
| `assignees`     | `{ userId, name }[]`         |                   |
| `relatedBlocks` | `{ blockId, title, type }[]` |                   |
| `version`       | number                       | 낙관적 락 버전    |

> ℹ️ 목록에는 **`content` 가 없다.** 설명은 [57. 상세 조회](#57-이슈-상세-조회)로 받는다.
> ⚠️ **`version` 이 목록에도 실린다** (백엔드 명세 확정) — 보드 카드가 상태 변경(59)에 이 값을 그대로 쓴다. ([이슈 도메인 — 공통](#이슈-도메인--공통))
> ℹ️ 결과가 없으면 `200` + 빈 배열이다.
> ℹ️ 정렬은 `dueDate` 오름차순, **`null` 은 마지막**으로 프론트가 처리한다.
> ℹ️ 필터 선택지는 [45. 참여자 목록](#45-프로젝트-참여자-목록-조회) · [10. 블록 일괄 조회](#10-스텝-블록-일괄-조회) 를 쓴다.

## 56. 이슈 생성

| 항목          | 값                                            |
| ------------- | --------------------------------------------- |
| **Method**    | `POST`                                        |
| **Path**      | `/api/v1/steps/{stepId}/issues`               |
| **권한**      | 스텝 `EDITOR`                                 |
| **사용 위치** | `src/features/issue/api.ts` → `createIssue()` |

**요청 body**

| 필드          | 타입           | 필수 | 비고                                                |
| ------------- | -------------- | ---- | --------------------------------------------------- |
| `title`       | string         | ✅   | 공백 제외 필수, 최대 200자                          |
| `content`     | string \| null | —    |                                                     |
| `dueDate`     | string         | —    | **`yyyy-MM-ddTHH:mm:ss`** (목록·수정과 형식이 다름) |
| `status`      | 상태 enum      | —    | 기본 `TODO`                                         |
| `priority`    | 우선순위 enum  | ✅   |                                                     |
| `assigneeIds` | string[]       | —    | 사번 목록. 생략 · `[]` 이면 연결 없음               |
| `blockIds`    | number[]       | —    | 생략 · `[]` 이면 연결 없음                          |

**응답** — `201` · 상세 조회(57번)와 **같은 구조**. `DONE` 으로 생성하면 `completedAt` 이 찍힌다.

> ⚠️ 생성만 `dueDate` 가 **날짜+시각**이고 수정(58)·조회(55·57)는 **날짜**다. 화면은 날짜만 받으므로 생성 시 `T00:00:00` 을 붙여 보낸다. (백엔드 확인 필요)
> ℹ️ 화면에서 시작일 · 완료 시각은 입력받지 않는다.

## 57. 이슈 상세 조회

| 항목          | 값                                         |
| ------------- | ------------------------------------------ |
| **Method**    | `GET`                                      |
| **Path**      | `/api/v1/issues/{issueId}`                 |
| **권한**      | 스텝 접근 권한                             |
| **사용 위치** | `src/features/issue/api.ts` → `getIssue()` |

**응답 data** — 목록(55) 필드 + `stepId`, `content`(nullable), `completedAt`(nullable, `YYYY-MM-DDTHH:mm:ss`), `version`

> ℹ️ 상태 버튼은 [59. 상태 변경](#59-이슈-상태-변경)을 호출한다.
> ℹ️ **409 뒤 최신값(`latest`) 을 읽는 창구도 이 API 다** — 수정 폼 · 보드가 충돌 뒤 여기로 다시 읽는다.

## 58. 이슈 부분 수정

| 항목          | 값                                            |
| ------------- | --------------------------------------------- |
| **Method**    | `PATCH`                                       |
| **Path**      | `/api/v1/issues/{issueId}`                    |
| **권한**      | 스텝 `EDITOR`                                 |
| **사용 위치** | `src/features/issue/api.ts` → `updateIssue()` |

**요청 body** — 전달한 필드만 수정한다.

| 전달 방식            | 처리                                        |
| -------------------- | ------------------------------------------- |
| 필드 미전달          | 기존 값 유지                                |
| `title`              | 전달 시 빈 값 불가, 최대 200자              |
| `content: null`      | 설명 삭제                                   |
| `dueDate: null`      | 마감일 해제 (값은 `YYYY-MM-DD`)             |
| `priority`           | 우선순위 변경                               |
| `assigneeIds: [...]` | **최종 전체 목록**으로 동기화 (추가분 아님) |
| `blockIds: [...]`    | **최종 전체 목록**으로 동기화               |
| `assigneeIds: null`  | 400                                         |
| `blockIds: null`     | 400                                         |
| `version`            | **필수** — 없거나 어긋나면 400 · 409        |

**응답 data** — 상세 조회(57)와 같은 구조 (최신 상태) · `version` 은 **저장 후의 새 값**

| status | code                     | 화면 처리                                   |
| ------ | ------------------------ | ------------------------------------------- |
| 400    | `ISS_INVALID_REQUEST`    | `version` 누락 · 1 미만 · 수정할 필드 없음  |
| 409    | `ISSUE_VERSION_CONFLICT` | 최신값 재조회 → 자동 병합 또는 필드 비교 UI |

> ⚠️ **낙관적 락** — 실을 `version` 은 draft 가 아니라 **`base`(최초 조회값)의 것**이다. 처리 규칙은 [이슈 도메인 — 공통](#이슈-도메인--공통) 참고.
> ⚠️ 응답 `version` 을 화면 상태에 꽂지 않으면 **다음 저장이 또 409** 다 (보드 카드까지 함께 갈아끼운다).
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

**요청 body** — `{ status: 'TODO' | 'IN_PROGRESS' | 'DONE', version }` (`version` **필수**)
**응답 data** — `{ issueId, status, completedAt, updatedAt, version }`

| 변경 결과     | `completedAt` |
| ------------- | ------------- |
| `TODO`        | `null`        |
| `IN_PROGRESS` | `null`        |
| `DONE`        | 현재 시각     |

> ⚠️ **낙관적 락** — 상태 · 완료 시각만 바꾸지만 **같은 `version` 조건**을 탄다. 어긋나면 409 다. `version` 누락 · 0 · 음수는 `400 ISS_INVALID_REQUEST`.
> ℹ️ 같은 상태로 다시 보내면 아무것도 바꾸지 않고 **200 + 현재 `version`** 을 돌려준다.
> ❓ **`version` 이 어긋난 채로 같은 상태를 보내면 200 인지 409 인지는 확인 필요** — 백엔드 명세가 멱등 200 만 말하고 버전 조건과의 우선순위를 적지 않았다. 화면은 같은 상태면 **요청 자체를 보내지 않아** 실동작 영향은 없다.
> ℹ️ 409 를 받으면 화면은 최신값을 읽어 **남이 이미 같은 상태로 옮겼으면 버전만 맞추고**, 다른 상태면 카드를 그 상태로 되돌린다.
> ℹ️ 드래그는 **화면을 먼저 옮기고** 호출한다. 실패하면 원래 열로 되돌린다.
> ⚠️ 응답 `version` 을 카드에 꽂지 않으면 **다음 수정이 409** 다. 응답에 없으면 화면은 카드 버전을 **비워** 다음 저장이 재조회를 타게 한다.
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

| 항목          | 내용                                             |
| ------------- | ------------------------------------------------ |
| **Method**    | `GET`                                            |
| **Path**      | `/api/v1/approvals`                              |
| **인증 필요** | ✅ 로그인 사용자 전체                            |
| **사용 위치** | ✅ `features/approval/api.ts` — `getApprovals()` |

**요청 Query**

| 이름                       | 설명                                                    |
| -------------------------- | ------------------------------------------------------- |
| `scope`                    | `drafted`(기본, 내가 기안) · `pending`(내 차례) · `all` |
| `status`                   | 결재 상태                                               |
| `drafterId` · `approverId` | 사번. ⚠️ **`scope=all` 에서만 적용된다**                |
| `fromDate` · `toDate`      | `yyyy-MM-dd`                                            |
| `keyword`                  | 결재 제목 또는 프로젝트명                               |
| `revisionNo`               | 현재 회차 번호                                          |
| `page` · `size`            | **0-based**, 기본 10                                    |

**응답 data** — `{ content[], totalElements, totalPages }` (사원 목록과 달리 `page` · `size` 가 없다)

| 필드                                                | 설명                                                   |
| --------------------------------------------------- | ------------------------------------------------------ |
| `approvalId`                                        | 상세 이동 키                                           |
| `title` · `status` · `currentRevisionNo`            | 행 제목 · 상태 배지 · 회차                             |
| `drafterId` · `drafterName`                         | 기안자                                                 |
| `currentApproverId` · `currentApproverName`         | 지금 차례인 결재자. 완료 · 반려면 null                 |
| `projectId` · `projectName` · `stepId` · `stepName` | `프로젝트 > Step` 경로 · 원본 이동                     |
| `lines[]`                                           | `approverId` · `approverName` · `order` · **`status`** |
| `createdAt` · `submittedAt` · `completedAt`         | DRAFT 는 `submittedAt` 이 null                         |

| status | code                           | 화면 처리                                                     |
| ------ | ------------------------------ | ------------------------------------------------------------- |
| 403    | `APPROVAL_SCOPE_ALL_FORBIDDEN` | MASTER · ADMIN 이 아닌 `scope=all` — 탭 자체를 감춰 사전 차단 |

> ⚠️ 목록의 `lines[]` 에는 **`lineId` 가 없다.** 승인 · 반려는 `lineId` 가 필요하므로 상세를 거쳐야 한다.
> ℹ️ 진행 카운트(`1 / 3`)는 `lines[].status === 'APPROVED'` 를 세어 화면에서 만든다.

---

## 62. 결재 상세조회

| 항목          | 내용                                                |
| ------------- | --------------------------------------------------- |
| **Method**    | `GET`                                               |
| **Path**      | `/api/v1/approvals/{approvalId}`                    |
| **인증 필요** | ✅ 기안자 · 현재 회차 `ACTIVE` 이상 결재자 · MASTER |
| **사용 위치** | ✅ `features/approval/api.ts` — `getApproval()`     |

**응답 data** — 회차 상세(48번)와 대부분 같고 차이는 아래 셋이다.

| 항목             | 결재 상세 (56)                        | 회차 상세 (48)                  |
| ---------------- | ------------------------------------- | ------------------------------- |
| 대상 회차        | **항상 현재 회차**                    | 지정한 회차                     |
| `blockOrigin`    | ✅ `blockId` · `stepId` · `projectId` | ❌                              |
| 상신 · 종료 일시 | ❌                                    | ✅ `submittedAt` · `finishedAt` |

| status | code                         | 화면 처리                                            |
| ------ | ---------------------------- | ---------------------------------------------------- |
| 403    | `APPROVAL_LINE_NOT_VIEWABLE` | **`/forbidden` 아님** — 화면 안에서 "차례 아님" 안내 |
| 404    | `APPROVAL_NOT_FOUND`         | 없는 결재                                            |

> ℹ️ **회차를 지정할 수 없다.** 이전 회차는 48번(회차 상세)으로 받는다.
> ℹ️ `blockOrigin` 으로 `원본 블록 보기`(AP-079)를 만든다 — `/projects/{projectId}/steps/{stepId}`.

---

## 63. 결재 승인

| 항목          | 내용                                             |
| ------------- | ------------------------------------------------ |
| **Method**    | `POST`                                           |
| **Path**      | `/api/v1/approval-lines/{lineId}/approve`        |
| **인증 필요** | ✅ 그 결재선의 결재자 본인, `ACTIVE` 상태일 때만 |
| **사용 위치** | ✅ `features/approval/api.ts` — `approveLine()`  |

**요청 body** — `{ opinion?: string }` (선택, AP-042)

**응답 data** — `lineId` · `status` · `processedAt` · `nextActiveLineId` · `approvalCompleted`

| status | code                              | 화면 처리                   |
| ------ | --------------------------------- | --------------------------- |
| 403    | `APPROVAL_LINE_FORBIDDEN`         | 그 결재선의 결재자가 아님   |
| 409    | `APPROVAL_LINE_ALREADY_PROCESSED` | 이미 처리된 결재선 (AP-040) |

> ⚠️ **대상이 결재가 아니라 결재선(`lineId`)이다.** `lineId` 는 상세 응답의 `lines[]` 에서만 얻는다.
> ⚠️ **없는 `lineId` 도 403 으로 온다** — 404 가 아니라서 "없는 결재"와 "권한 없음"을 구분할 수 없다.
> ℹ️ `approvalCompleted: true` 면 마지막 순번이라 결재 전체가 완료된다 — 재조회 없이 화면을 완료로 바꿀 수 있다.

---

## 64. 결재 반려

| 항목          | 내용                                             |
| ------------- | ------------------------------------------------ |
| **Method**    | `POST`                                           |
| **Path**      | `/api/v1/approval-lines/{lineId}/reject`         |
| **인증 필요** | ✅ 그 결재선의 결재자 본인, `ACTIVE` 상태일 때만 |
| **사용 위치** | ✅ `features/approval/api.ts` — `rejectLine()`   |

**요청 body** — `{ opinion?: string }` (선택, AP-054)

**응답 data** — `lineId` · `status` · `processedAt`

| status | code                              | 화면 처리                 |
| ------ | --------------------------------- | ------------------------- |
| 403    | `APPROVAL_LINE_FORBIDDEN`         | 그 결재선의 결재자가 아님 |
| 409    | `APPROVAL_LINE_ALREADY_PROCESSED` | 이미 처리된 결재선        |

> ℹ️ 반려하면 이후 `WAITING` 단계가 전부 `CANCELED` 가 되고 회차 · 결재 전체가 `REJECTED` 로 끝난다 (AP-056~058).
> ℹ️ 기안자는 `수정`(재상신 회차 생성, 50번)으로 다시 진행한다.

---

## 65. 버전 단건 조회 (결재용)

| 항목          | 내용                                           |
| ------------- | ---------------------------------------------- |
| **Method**    | `GET`                                          |
| **Path**      | `/api/v1/file-versions/{fileVersionId}`        |
| **사용 위치** | ✅ `features/file/api.ts` — `getFileVersion()` |

**응답 data** — 버전 이력의 한 줄에 아래 넷이 더 붙는다.

| 필드                  | 설명                                                       |
| --------------------- | ---------------------------------------------------------- |
| `fileId` · `fileName` | 원본 문서                                                  |
| `latest`              | **false 면 결재 이후 새 버전이 올라온 것** — 화면에 알린다 |
| `latestVersionNo`     | 최신 버전 번호                                             |
| `fileDeleted`         | 원본이 휴지통에 있는지                                     |

| status | code                              | 화면 처리           |
| ------ | --------------------------------- | ------------------- |
| 403    | `FILE_ACCESS_PERMISSION_REQUIRED` | 스텝 열람 권한 없음 |
| 404    | `FILE_VERSION_NOT_FOUND`          | 없는 버전           |

> ℹ️ **문서가 휴지통에 있어도 반환된다** — 결재 이력이 남아야 하기 때문이다. 미리보기 · 다운로드(43·42번)는 휴지통이면 404 라 동작이 다르다.
> ℹ️ 결재 문서 뷰어(`ApprovalDocumentModal`)가 버전 번호 · 업로더 · `결재 이후 새 버전` 배너를 이 응답으로 그린다.

---

## 이미지 도메인 — 공통

이미지 블록의 내용은 **블록(`blockId`) > 이미지 블록(`imgBlockId`) > 이미지 항목(`imgId`)** 3단이다.
`imgBlockId` 는 10번 블록 목록 응답의 **`detail.imgBlockId`** 로 받는다 (체크리스트 · 텍스트와 같은 구조).

| 값           | 어디서 받나                      | 어디에 쓰나                            |
| ------------ | -------------------------------- | -------------------------------------- |
| `imgBlockId` | 10번 `detail.imgBlockId`         | 조회 · 생성 · 수정 · 다운로드 경로     |
| `imgId`      | 66 · 67 · 71번 응답              | 삭제 경로, 단일 다운로드 `?imgId=`     |
| `orderIndex` | 66 · 67 · 68 · 71번 응답 (1부터) | 다음 · 이전 조회의 `currentOrderIndex` |

> ♿ **`altText`(선택) 를 이미지 응답에 넣어 주세요.** `caption` 은 화면에 보여 주는 문구, `originalName` 은 파일명이라 **이미지의 뜻**을 보장하지 않습니다. 스크린리더 사용자는 지금 캡션 · 파일명을 대신 듣습니다.
> 프론트는 `altText → caption → originalName → '이미지'` 순으로 떨어지도록 이미 받아 둔 상태입니다 (`imageAltText()`), 값만 내려오면 그대로 쓰입니다.
>
> ⚠️ **경로가 헷갈린다.** `PATCH /blocks/images/items/{...}` 는 **블록 ID**, `DELETE /blocks/images/items/{...}` 는 **항목 ID** 다. 모양만 같고 넣는 값이 다르다 — `src/constants/endpoints.ts` 에서 `imageItemsEdit` · `imageItem` 으로 분리해 두었다.

### ❗ 이미지 — 백엔드 확인 대기

| 항목                                                            | 막힌 기능 · 임시 처리                                                                                                               |
| --------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------- |
| `detail` 의 **첫 이미지 · 장수 키 이름** (첫 장 동봉은 확정)    | 세 가지 모양을 모두 읽는다 (10번 참고). 확정되면 한 분기만 남긴다                                                                   |
| `currentOrderIndex = 0` · `next` 가 **첫 장**을 주는지          | 업로드 직후 이동 · `detail` 이 비었을 때의 예비 경로가 이 가정이다                                                                  |
| 마지막 장에서 `next` (첫 장에서 `prev`) 가 순환인지 400 인지    | 프론트가 양 끝에서 버튼을 숨겨 아예 부르지 않는다                                                                                   |
| 편집 권한 플래그 (문서 블록의 `canEdit` 같은 값)                | 지금은 모두에게 추가 · 수정 · 삭제 버튼을 보여주고 서버 403 에 맡김                                                                 |
| 캡션 최대 길이                                                  | 임시로 블록 제목과 같은 200자로 막는다                                                                                              |
| 68번 수정에서 **빠뜨린 이미지**가 삭제되는지 유지되는지         | 항상 전체 목록을 보낸다 (삭제는 69번으로 따로)                                                                                      |
| 이미지 **확장자** 제한 (용량 · 장수는 2026-08-16 확정, 67번 참고)  | 프론트가 `image/jpeg,png,gif,webp` 로 먼저 거른다 — **서버도 같은 목록으로 독립 검증 필요** (SVG 는 스크립트를 품을 수 있다) |
| **`altText` 필드 추가 요청** — 이미지의 뜻을 담는 대체 텍스트   | 지금은 캡션 · 파일명으로 대신한다 (뜻을 보장하지 못한다). 아래 참고                                                                 |
| **삭제 + 순서/캡션을 한 번에 처리하는 API** 요청                | 지금은 69번 여러 번 → 68번 순으로 나가 **중간에 끊기면 부분 반영**된다. 실패 시 71번으로 다시 읽어 화면을 맞춘다                    |

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
  originalName: string; // 원본 파일명
  imageUrl: string; // 저장소 URL — 그대로 <img src> 에 넣는다
  caption: string;
  orderIndex: number; // 1부터
  totalCount: number; // 블록 전체 장수
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

| 항목             | 내용                                               |
| ---------------- | -------------------------------------------------- |
| **Method**       | `POST`                                             |
| **Path**         | `/api/v1/blocks/images/{imgBlockId}/items`         |
| **Content-Type** | `multipart/form-data`                              |
| **인증 필요**    | ✅ (편집 권한 보유자)                              |
| **사용 위치**    | `src/features/block/api.ts` → `createImageItems()` |

**Request Parts**

| 파트      | 타입        | 필수 | 내용                                                |
| --------- | ----------- | ---- | --------------------------------------------------- |
| `files`   | `File[]`    | ✅   | **화면에 정렬된 순서 그대로** — 첫 번째가 1번       |
| `request` | JSON (Blob) | ⬜   | `{ "captions": ["회의실 전경", "", "화이트보드"] }` |

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
    version: number; // 새로 만든 항목이라 항상 1
  }
  [];
}
```

> 📏 **업로드 제한 (2026-08-16 확정)** — 한 장 **20MB**, 요청 한 번에 **15장 · 합계 300MB**.
> **블록이 담는 총 장수에는 제한이 없다** — 위 값은 요청 하나의 상한이라 넘치면 나눠 올리면 된다.
> 프론트는 `IMAGE_MAX_SIZE_BYTES` · `IMAGE_UPLOAD_MAX_COUNT` · `IMAGE_UPLOAD_MAX_TOTAL_BYTES`(`features/block/types.ts`)로 먼저 거르고, 넘친 장수를 문구로 알린다.
>
> ⚠️ `Content-Type` 헤더를 직접 넣지 않는다 — 브라우저가 `boundary` 를 채워야 한다 (`src/lib/api.ts` → `postForm()`).
> ℹ️ 응답 `version`(항상 1)은 곧바로 68번 요청에 실을 수 있다 — 올린 직후 캡션을 고쳐도 재조회가 필요 없다.
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
  images: {
    imgId: number;
    caption: string | null;
    version: number; // 필수 — 71번에서 받은 그 항목의 version
  }
  []; // 정렬된 순서대로 전체
}
```

**Response (200 OK)**

```ts
data: {
  images: {
    imgId: number;
    orderIndex: number;
    caption: string;
    version: number; // 저장 후의 새 값
  }
  [];
}
```

| status | code                     | 화면 처리                                    |
| ------ | ------------------------ | -------------------------------------------- |
| 400    | `IMAGE_VERSION_REQUIRED` | `version` 누락 — 저장을 멈추고 새로고침 안내 |
| 400    | `IMG-005`                | 다른 블록 · 중복 · 없는 `imgId` 가 섞였다    |
| 409    | `IMAGE_VERSION_CONFLICT` | **재조회만** — 최신 목록으로 갈아끼우고 안내 |

> ⚠️ **경로 마지막 값이 항목 ID 가 아니라 블록 ID(`imgBlockId`)** 다. 69번 삭제와 경로 모양이 같아 헷갈리기 쉽다.
> ⚠️ 부분 수정이 아니라 **전체 치환**이다 — 배열 순서가 곧 새 `orderIndex` (1..N). 항상 전체를 보낸다.
> ℹ️ 보낼 전체 목록은 **71번**으로 받는다 (수정 모달을 열 때 1회).
> ⚠️ 응답에 `imageUrl` · `originalName` 이 없다. 프론트는 화면에 있던 값에 새 `orderIndex` 만 얹는다.
> ✅ **목록에서 빠진 이미지 = 삭제**로 확정됐다 (백엔드 명세). 빈 배열이면 전체 삭제다. 다만 프론트는 삭제를 69번으로 먼저 처리하고 남은 목록만 보낸다 — 되돌리기 UI 가 있어 순서가 뒤엉키지 않게.

**낙관적 락 (2026-08-11 신설) — 항목별 검사 · 전체 롤백**

| 규칙                                                                                                       |
| ---------------------------------------------------------------------------------------------------------- |
| `images[]` **각 항목마다** `version` 필수. 하나라도 어긋나면 **요청 전체가 409** (부분 저장 없음)          |
| 값이 안 바뀐 항목도 **version 은 검사한다** (백엔드가 `touchVersionIfMatches` 로 원자적 증가)              |
| ⛔ **`overwrite` 가 없다** — 여러 장 배열이라 "무엇을 덮어쓸지" 가 정해지지 않는다. 재조회가 유일한 출구다 |

> 🚨 **낙관적 락이 못 잡는 구멍이 있다** — 그 사이 남이 **이미지를 지우거나 새로 올린 것**은 버전에 안 드러난다.
> 지워진 것은 요청에서 빠져 있어도 409 가 안 나고, 새로 올라온 것은 우리 배열에 없어서 **저장하는 순간 삭제된다.**
> 그래서 프론트는 **저장 직전에 71번을 한 번 더 불러** 개수 · `imgId` 를 대조하고(`sameMembers`), 다르면 저장을 멈추고 최신 목록으로 갈아끼운다.
>
> ⚠️ 요청에 싣는 `version` 은 **화면이 들고 있던 값**이다 — 방금 재조회한 값을 실으면 그 사이 남이 고친 캡션까지 조용히 덮어쓴다. 재조회는 추가 · 삭제 감지용이고, 충돌 판정은 서버에 맡긴다.

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

| 항목          | 내용                                            |
| ------------- | ----------------------------------------------- |
| **Method**    | `GET`                                           |
| **Path**      | `/api/v1/blocks/images/{imgBlockId}/items`      |
| **인증 필요** | ✅ (**편집 권한 보유자**)                       |
| **사용 위치** | `src/features/block/api.ts` → `getImageItems()` |

**Response (200 OK)**

```ts
data: {
  totalCount: number; // 활성 이미지 개수
  images: {
    // orderIndex 오름차순
    imgId: number;
    originalName: string;
    imageUrl: string;
    caption: string;
    orderIndex: number;
    version: number; // 낙관적 락 — 이 목록을 그대로 68번 요청에 실어 보낸다
  }
  [];
}
```

> ⚠️ **경로가 67번(생성)과 같다.** 메서드로만 갈린다 — `GET` 전체 조회 · `POST` 생성.
> ⚠️ **`version` 이 이미지 한 장마다 따로 있다** (2026-08-11 신설, `image` 테이블). 68번이 항목별로 검사한다.
> ⚠️ **열람 전용 사용자는 못 부른다** (편집 권한 전용). 카드 캐러셀이 이 API 를 쓰지 않고 66번으로 한 장씩 받는 이유다.
> ℹ️ **수정 모달이 열릴 때 한 번** 부른다. 68번이 전체 치환이라 여기서 받은 목록을 그대로 되보낸다.
> ℹ️ 이 API 가 생기기 전에는 66번을 1번부터 `next` 로 걸어서 모았다 (`getAllImageItems`) — 지금은 제거했다.

---

## 활동 기록 도메인 — 공통

| 항목              | 내용                                                                                                    |
| ----------------- | ------------------------------------------------------------------------------------------------------- |
| **구조**          | **스텝(`stepId`) > 블록(`blockId`) > 블록 내부 데이터(`resourceId`)**                                   |
| **문장 조립**     | ⚠️ **BE 는 완성된 문장을 주지 않는다.** 화면 조립에 필요한 원자 데이터만 온다                           |
| **대상 구분**     | `resource.resourceId == null` → `BLOCK` / `!= null` → `RESOURCE` (서버가 `targetType` 으로 계산해 준다) |
| **표시명**        | `resource.name` 이 있으면 그 값, 없으면 `block.title` → `displayName` (활동 시점 **스냅샷**)            |
| **동작**          | DB 의 `create` · `modify` · `delete` → 응답은 `CREATE` · `MODIFY` · `DELETE`                            |
| **시간 표기**     | `오늘` · `어제` · 날짜 그룹, `14:32` · `2시간 전` 은 `createdAt` 기준으로 **프론트가** 만든다           |
| **블록 전용 API** | **없다.** 블록 활동 로그 팝업도 같은 경로에 `?blockId=` 를 붙여 쓴다                                    |
| **제외 대상**     | 이슈 생성 · 수정 · 상태 변경 · 삭제는 **기록 · 조회 대상이 아니다**                                     |

## 72. 스텝별 활동 기록 조회

| 항목          | 값                                                          |
| ------------- | ----------------------------------------------------------- |
| **Method**    | `GET`                                                       |
| **Path**      | `/api/v1/steps/{stepId}/activity-logs`                      |
| **권한**      | 프로젝트 참여자                                             |
| **사용 위치** | `src/features/activityLog/api.ts` → `getStepActivityLogs()` |

**Query** — `blockId?: number` · `cursor?: number` (이전 응답의 `nextCursor`) · `size?: int` (기본 `20`)

**응답 data**

```ts
data: {
  activities: {
    activityLogId: number;
    action: 'CREATE' | 'MODIFY' | 'DELETE';
    targetType: 'BLOCK' | 'RESOURCE';
    displayName: string | null; // resource.name ?? block.title
    fieldName: string | null; // 수정 필드. 해당 없으면 null
    beforeValue: string | null;
    afterValue: string | null;
    resource: {
      resourceId: number | null;
      name: string | null;
    }
    actor: {
      userId: string;
      name: string;
      profileImageUrl: string | null;
      resignedAt: string | null; // 퇴사일 'yyyy-MM-dd' — 재직 중이면 null
    }
    block: {
      blockId: number;
      title: string | null;
      type: BlockTypeCode;
    }
    createdAt: string; // 'YYYY-MM-DDTHH:mm:ss' (타임존 표기 없음)
  }
  [];
  nextCursor: number | null; // 없으면 null
  hasNext: boolean;
}
```

**`fieldName` 별 표시 규칙** — 화면이 값을 어떻게 그릴지 결정한다

| 방식         | 대상 필드                   | 처리                                   |
| ------------ | --------------------------- | -------------------------------------- |
| 펼치기       | `title` `content` `caption` | 접었다 펴서 before/after **전문** 표시 |
| 그대로 표시  | `orderIndex`                | 1부터 시작하는 위치 → `N번째 → M번째`  |
| 값 사전 매칭 | `isCompleted` `status`      | 아래 사전으로 바꿔 짧게 인라인 표시    |
| 변환 불필요  | `lines`                     | 사번이 아니라 **이름 CSV** 로 내려온다 |

| `fieldName`   | 값                                                                                    | 표시                                                      |
| ------------- | ------------------------------------------------------------------------------------- | --------------------------------------------------------- |
| `isCompleted` | `true` · `false`                                                                      | 완료 · 미완료                                             |
| `status`      | `DRAFT` `IN_PROGRESS` `ACTIVE` `WAITING` `APPROVED` `REJECTED` `COMPLETED` `CANCELED` | 초안 · 진행중 · 진행중 · 대기 · 승인 · 반려 · 완료 · 취소 |

> ℹ️ 결과가 없으면 `200` + `{ activities: [], nextCursor: null, hasNext: false }`.
> ℹ️ 화면 조립 — 윗줄 `actor.name` + `block.title` + `block.type`, 아랫줄 `displayName` + 동작.
> ⚠️ **퇴사자여도 로그를 지우지 않는다** — `actor.resignedAt` 이 있으면 이름 뒤에 `(퇴사자)` 문구만 붙인다. ([퇴사자 표기](#-퇴사자-표기-2026-08-12-신설--도메인-공통-컨벤션))
> ℹ️ 필터 선택지는 [10. 블록 일괄 조회](#10-스텝-블록-일괄-조회) 로 받는다. 필터를 바꾸면 **목록 · 커서를 초기화**하고 다시 조회한다.
> ❗ 명세 예시의 `fieldName` 이 `completed` 인데 단어 사전은 `isCompleted` 다 — 실제로 무엇이 오는지 **확인 필요**. 지금은 두 이름 모두 받는다.

---

## 73. 결재 이력조회

| 항목          | 내용                                                     |
| ------------- | -------------------------------------------------------- |
| **Method**    | `GET`                                                    |
| **Path**      | `/api/v1/approvals/{approvalId}/revisions`               |
| **인증 필요** | ✅ 회차 상세와 같은 기준이되 **전체 회차를 통틀어** 판정 |
| **사용 위치** | ✅ `features/approval/api.ts` — `getRevisions()`         |

**응답 data** — `{ content: [] }` · **페이징이 없다** (`totalElements` · `totalPages` 도 없음)

| 필드          | 타입             | 설명                                         |
| ------------- | ---------------- | -------------------------------------------- |
| `revisionId`  | `number`         | 회차 ID — 회차 상세(48번) 조회에 쓴다        |
| `revisionNo`  | `number`         | 1부터. 재상신마다 +1                         |
| `status`      | `ApprovalStatus` | 회차 상태                                    |
| `submittedAt` | `string \| null` | DRAFT 회차는 상신 전이라 null                |
| `finishedAt`  | `string \| null` | 진행 중이면 null                             |
| `isCurrent`   | `boolean`        | 지금 살아 있는 회차 — 목록에 **하나만** true |

| status | code                         | 화면 처리                                          |
| ------ | ---------------------------- | -------------------------------------------------- |
| 403    | `APPROVAL_LINE_NOT_VIEWABLE` | **`/forbidden` 아님** — 화면 안에서 권한 없음 안내 |
| 404    | `APPROVAL_NOT_FOUND`         | 불러오지 못했다는 안내                             |

> ⚠️ **회차 번호 오름차순**이다 (1회차가 먼저). 최신부터 보이려면 화면에서 뒤집는다.
> ⚠️ 응답에 제목 · 내용 · 결재선 · 문서가 **없다.** 고른 회차의 내용은 회차 상세(48번)를 따로 부른다.
> ℹ️ 현재 회차 판정은 `revisionNo` 최댓값이 아니라 **`isCurrent`** 로 한다 — 재상신 DRAFT 가 생기면 최댓값과 어긋난다.
> ❗ Swagger 응답 예시가 **사원 스키마**(`userId` · `departmentPath`)로 잘못 표기돼 있다. 위 표는 2026-08-07 실행 결과 기준이다.

---

## 비타메이트 도메인 — 공통

AI 블록은 채팅형이 아니다. **검토 유형·세부 카테고리를 고르고, 문서를 기준(`REFERENCE`)과 검토 대상(`TARGET`)으로 나눠 선택한 뒤**, 서버가 준 기본 프롬프트를 확인·보완해 요청한다.

| 항목           | 규칙                                                                        |
| -------------- | --------------------------------------------------------------------------- |
| 분석 방식      | **비동기.** 요청은 `202` + `PENDING` 만 주고 결과는 폴링으로 받는다         |
| 폴링           | 요청 후 15초 대기 → 3초 간격 조회 → 종료 상태면 중단. 2분 초과 시 문구 전환 |
| 중복 방지      | 요청에 `Idempotency-Key` 헤더 **필수**                                      |
| 문서 역할      | 같은 `fileVersionId` 를 기준·대상에 동시에 넣을 수 없다 (서버 400)          |
| 선택 가능 문서 | `indexStatus = COMPLETED` 인 파일 버전만                                    |
| 과거 이력      | 최신 파일이 아니라 **분석 당시 `fileVersionId`** 기준 정보를 보여준다       |
| 레거시 분석    | `reviewType = null` · `reviewCategoryCodes = []` · `prompt = null` 로 온다  |

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

| 항목          | 내용                                                   |
| ------------- | ------------------------------------------------------ |
| **Method**    | `GET`                                                  |
| **Path**      | `/api/v1/projects/{projectId}/file-versions`           |
| **인증 필요** | ✅ 프로젝트 참여자                                     |
| **사용 위치** | ✅ `features/file/api.ts` — `getProjectFileVersions()` |

**응답 data** — 배열 그대로 (없으면 `[]`). 휴지통 버전은 오지 않는다.

| 필드               | 타입             | 설명                                        |
| ------------------ | ---------------- | ------------------------------------------- |
| `fileId`           | `number`         | 문서 ID                                     |
| `name`             | `string`         | 표시명                                      |
| `fileVersionId`    | `number`         | **분석 요청에 넣는 값**                     |
| `versionNo`        | `number`         | 1부터                                       |
| `latest`           | `boolean`        | 이 문서의 최신 버전인지                     |
| `originalFileName` | `string`         | 원본 파일명                                 |
| `extension`        | `string`         | 확장자                                      |
| `sizeBytes`        | `number`         | 바이트                                      |
| `pageCount`        | `number \| null` | PDF 만 값이 있다                            |
| `previewable`      | `boolean`        | 미리보기 가능 여부                          |
| `completedAt`      | `string`         | 업로드 완료 시각                            |
| `indexStatus`      | `IndexStatus`    | `PENDING` `PROCESSING` `COMPLETED` `FAILED` |

> ⚠️ **파일 도메인 API 다** (비타메이트 도메인 아님).
> ⚠️ 스텝이 아니라 **프로젝트 전체**라, 다른 스텝에 올린 기준 문서도 고를 수 있다.
> ℹ️ `indexStatus !== COMPLETED` 인 버전은 목록에는 보이되 **선택은 막는다** ("AI가 아직 읽는 중").

---

## 75. 검토 템플릿 목록

| 항목          | 내용                                                   |
| ------------- | ------------------------------------------------------ |
| **Method**    | `GET`                                                  |
| **Path**      | `/api/v1/vitamate/review-templates`                    |
| **인증 필요** | ✅ 프로젝트 참여자                                     |
| **사용 위치** | ✅ `features/vitamate/api.ts` — `getReviewTemplates()` |

**응답 data** — `{ reviewTypes: [] }`

| 필드                           | 타입     | 설명                                  |
| ------------------------------ | -------- | ------------------------------------- |
| `reviewType`                   | `string` | 유형 코드 — 분석 요청에 그대로 넣는다 |
| `reviewTypeName`               | `string` | 화면 표시명                           |
| `description`                  | `string` | 유형 설명                             |
| `categories[].categoryCode`    | `string` | 카테고리 코드 (예: `COST_REPORT`)     |
| `categories[].categoryName`    | `string` | 화면 표시명                           |
| `categories[].guideText`       | `string` | 보조 안내 문구                        |
| `categories[].exampleText`     | `string` | **프롬프트 입력창 기본값**            |
| `categories[].templateVersion` | `number` | 적용 템플릿 버전                      |

> ⚠️ 실제 AI 지시문(`promptTemplate`)은 이 API 로 **절대 내려오지 않는다.** 화면 기본값은 `exampleText` 다.
> ℹ️ 카테고리를 여러 개 골라도 요청 `prompt` 는 **문자열 하나**다 — `exampleText` 들을 줄바꿈으로 합쳐 채운다.

---

## 76. 비타메이트 분석 요청

| 항목          | 내용                                               |
| ------------- | -------------------------------------------------- |
| **Method**    | `POST`                                             |
| **Path**      | `/api/v1/blocks/{blockId}/vitamate/analyses`       |
| **인증 필요** | ✅ 프로젝트 참여자                                 |
| **헤더**      | ⚠️ `Idempotency-Key` **필수**                      |
| **사용 위치** | ✅ `features/vitamate/api.ts` — `createAnalysis()` |

**요청 body**

| 필드                      | 타입       | 필수 | 설명                                      |
| ------------------------- | ---------- | ---- | ----------------------------------------- |
| `referenceFileVersionIds` | `number[]` | ✅   | 기준 문서 — 1개 이상                      |
| `targetFileVersionIds`    | `number[]` | ✅   | 검토 대상 — 1개 이상, 기준과 겹칠 수 없다 |
| `reviewType`              | `string`   | ✅   | 75번에서 고른 유형                        |
| `reviewCategoryCodes`     | `string[]` | ✅   | 75번에서 고른 세부 카테고리               |
| `prompt`                  | `string`   | ✅   | `exampleText` 를 사용자가 확인·보완한 값  |

**응답 data** — `202`

| 필드             | 타입     | 설명              |
| ---------------- | -------- | ----------------- |
| `analysisId`     | `number` | 폴링에 쓸 분석 ID |
| `analysisStatus` | `string` | `PENDING`         |
| `requestedAt`    | `string` | 요청 시각         |

| status | 화면 처리                                                      |
| ------ | -------------------------------------------------------------- |
| 400    | 기준·대상 중복 등 — 프론트가 먼저 막지만 문구는 서버 것을 쓴다 |
| 409    | 같은 키인데 내용이 다름 → "이미 다른 분석 요청이 처리 중"      |

> ⚠️ **같은 키 + 같은 내용**이면 새 분석이 생기지 않고 기존 `analysisId` 가 온다. 그래서 `재실행`(같은 설정으로 새 결과를 원하는 동작)은 **키를 새로 뽑는다.**
> ℹ️ 결과는 이 응답에 없다 — 77번으로 폴링한다.

---

## 77. 비타메이트 분석 단건 조회

| 항목          | 내용                                            |
| ------------- | ----------------------------------------------- |
| **Method**    | `GET`                                           |
| **Path**      | `/api/v1/vitamate/analyses/{analysisId}`        |
| **인증 필요** | ✅ 스텝 접근 권한                               |
| **사용 위치** | ✅ `features/vitamate/api.ts` — `getAnalysis()` |

**응답 data**

| 필드                          | 타입                | 설명                              |
| ----------------------------- | ------------------- | --------------------------------- |
| `analysisId`                  | `number`            | 분석 ID                           |
| `blockId`                     | `number`            | AI 블록 ID                        |
| `reviewType`                  | `string \| null`    | 레거시 분석은 null                |
| `reviewCategoryCodes`         | `string[]`          | 고른 세부 카테고리                |
| `prompt`                      | `string \| null`    | 확정된 프롬프트                   |
| `analysisStatus`              | `AnalysisStatus`    | 위 상태 표 참고                   |
| `result`                      | `string \| null`    | **형식 없는 자유 문자열**         |
| `errorMessage`                | `string \| null`    | 실패 사유 (내부 예외는 노출 금지) |
| `createdAt`                   | `string`            | 요청 시각                         |
| `completedAt`                 | `string \| null`    | 완료·실패 시각. 실패해도 채워진다 |
| `documents[].fileVersionId`   | `number`            | 분석 당시 파일 버전               |
| `documents[].fileName`        | `string`            | 분석 당시 문서명                  |
| `documents[].documentRole`    | `REFERENCE\|TARGET` | 문서 역할                         |
| `citations[].rankOrder`       | `number`            | 근거 순서                         |
| `citations[].fileVersionId`   | `number`            | 근거가 속한 파일 버전             |
| `citations[].documentChunkId` | `number`            | 문서 청크 ID                      |
| `citations[].pageNumber`      | `number \| null`    | 페이지 번호                       |
| `citations[].excerpt`         | `string`            | 근거 발췌문                       |

> ⚠️ `citations` 에는 **문서명이 없다** — 같은 응답의 `documents` 에서 `fileVersionId` 로 찾는다.
> ⚠️ 권한 없는 분석은 `403`·`404` 로 처리하고 **본문을 노출하지 않는다.**
> ℹ️ 삭제된 문서 버전도 이력 표시를 위해 당시 문서명이 남는다.

---

## 78. 블록별 분석 이력

| 항목          | 내용                                                 |
| ------------- | ---------------------------------------------------- |
| **Method**    | `GET`                                                |
| **Path**      | `/api/v1/blocks/{blockId}/vitamate/analyses`         |
| **인증 필요** | ✅ 프로젝트 참여자                                   |
| **사용 위치** | ✅ `features/vitamate/api.ts` — `getBlockAnalyses()` |

**응답 data** — 최신순(`createdAt DESC`), **최대 20건 · 페이징 없음**

| 필드                  | 타입             | 설명               |
| --------------------- | ---------------- | ------------------ |
| `analysisId`          | `number`         | 상세 조회(77번) 키 |
| `reviewType`          | `string \| null` | 검토 유형          |
| `reviewCategoryCodes` | `string[]`       | 세부 카테고리      |
| `prompt`              | `string \| null` | 프롬프트           |
| `analysisStatus`      | `AnalysisStatus` | 상태               |
| `createdAt`           | `string`         | 요청 시각          |
| `completedAt`         | `string \| null` | 완료·실패 시각     |

> ⚠️ **`documents` · `result` · `citations` 가 없다.** 목록에서는 본문을 못 그리고, 눌러서 77번으로 상세를 받는다.
> ⚠️ 20건을 넘으면 그 이전 건은 이 목록에서 안 보인다 (v1 페이징 없음) — 화면에 안내 문구를 단다.
> ❗ 감싸는 키(`{ analyses: [] }` vs 배열 그대로)가 **확정 전**이라 프론트가 두 모양을 모두 받는다.

---

## 알림 도메인 — 공통

| 항목          | 내용                                                                                        |
| ------------- | ------------------------------------------------------------------------------------------- |
| **대상**      | **본인 알림만** 조회 · 처리된다. 남의 알림은 403 `NOTIFICATION_FORBIDDEN`                   |
| **정렬**      | 최신순(`createdAt` 내림차순) 고정 — 정렬 파라미터가 없다                                    |
| **읽음 표기** | ⚠️ `isRead` 같은 boolean 이 **없다.** `readAt` 이 `null` 이면 안 읽음                       |
| **삭제**      | 논리 삭제다. 지운 알림은 목록에서 빠지고 다시 부르면 404                                    |
| **자동 읽음** | 이동 대상 조회(80번)가 **읽음 처리를 겸한다** — 클릭 이동 시 읽음 API 를 따로 부르지 않는다 |

> ❗ **`notificationType` 의 전체 목록을 받지 못했다.** 확인된 값은 `APPROVAL_REQUESTED` · `APPROVAL_REJECTED` · `APPROVAL_COMPLETED` 셋뿐이다. 시안에는 이슈 배정 · 새 댓글도 있어 `ISSUE_*` · `COMMENT_*` 가 더 있을 것으로 보인다 — **화면은 모르는 값이 와도 기본 아이콘으로 떨어지게** 짠다.
> ❗ **`category` 로 넣을 수 있는 값 목록도 미확인.** 설명상 `notificationType` 의 **접두어**(`APPROVAL` 등)를 그대로 쓴다.

---

## 79. 알림 목록 조회

| 항목          | 내용                                                     |
| ------------- | -------------------------------------------------------- |
| **Method**    | `GET`                                                    |
| **Path**      | `/api/v1/notifications`                                  |
| **인증 필요** | ✅ 본인 알림만                                           |
| **사용 위치** | ✅ `features/notification/api.ts` — `getNotifications()` |

**요청 Query** — 전부 선택

| 파라미터   | 타입      | 설명                                       |
| ---------- | --------- | ------------------------------------------ |
| `category` | `string`  | `notificationType` 접두어. 미지정이면 전체 |
| `isRead`   | `boolean` | 안 읽음만 보려면 `false`                   |
| `page`     | `number`  | **0부터**. 기본 0                          |
| `size`     | `number`  | 기본 10, **최대 100**                      |

**응답 data** — `{ content[], totalElements, totalPages }` (`page` · `size` 는 안 온다)

| 필드               | 타입             | 설명                                          |
| ------------------ | ---------------- | --------------------------------------------- |
| `notificationId`   | `number`         | 알림 ID                                       |
| `notificationType` | `string`         | 예: `APPROVAL_REQUESTED` — 아이콘 · 분류 근거 |
| `title`            | `string`         | 예: `결재 요청`                               |
| `message`          | `string`         | 본문 한 줄                                    |
| `readAt`           | `string \| null` | **null 이면 안 읽음**                         |
| `createdAt`        | `string`         | `2026-08-07T18:47:37` — 상대 시간 표기 근거   |

> ℹ️ 헤더 배지 숫자는 `?isRead=false` 의 **`totalElements`** 를 쓴다 (목록 길이가 아니다 — `size` 에 잘린다).
> ℹ️ `isRead=true` 는 **읽은 것만** 준다 (2026-08-08 실행 확인). 알림 페이지의 `미확인` · `확인` 탭이 이 값 하나만 바꿔 쓴다.

---

## 80. 알림 이동 대상 조회

| 항목          | 내용                                                          |
| ------------- | ------------------------------------------------------------- |
| **Method**    | `GET`                                                         |
| **Path**      | `/api/v1/notifications/{notificationId}/target`               |
| **사용 위치** | ✅ `features/notification/api.ts` — `getNotificationTarget()` |

**응답 data**

| 필드       | 타입                             | 설명                                                                                       |
| ---------- | -------------------------------- | ------------------------------------------------------------------------------------------ |
| `type`     | `string`                         | 예: `APPROVAL`. 이동할 곳이 없으면 `NONE`                                                  |
| `targetId` | `number \| null`                 | `NONE` 이면 null                                                                           |
| `extra`    | `Record<string, number> \| null` | 도메인별 덤. 없으면 null. ⚠️ **값이 숫자다** (초안의 `string` 이 아니다 — 2026-08-12 실측) |

| status | code                     | 화면 처리                   |
| ------ | ------------------------ | --------------------------- |
| 403    | `NOTIFICATION_FORBIDDEN` | 남의 알림 — 이동하지 않는다 |
| 404    | `NOTIFICATION_NOT_FOUND` | 지워진 알림 — 목록에서 제거 |

> ⚠️ **조회 성공 시 자동으로 읽음 처리된다.** 그래서 `type=NONE`(이동할 곳 없음)이어도 **읽음은 된다** — 에러가 아니라 200 이다.
> ⚠️ 경로는 **프론트가 조립한다.** `type` + `targetId` 로 만들며, 모르는 `type` 이면 이동하지 않고 읽음 처리만 남긴다.
> ❗ **`type` 의 전체 목록 미확인.** 확인된 값은 `APPROVAL` · `ISSUE` · `NONE` 이다.
>
> **`ISSUE` 실측 응답** (2026-08-12) — 이슈 단독 화면이 없어 `targetId`(이슈 ID)만으로는
> 경로를 만들 수 없다. `extra` 의 두 값으로 `/projects/{projectId}/steps/{stepId}/issue` 를 조립한다.
>
> ```jsonc
> {
>   "type": "ISSUE",
>   "targetId": 26, // 이슈 ID — 경로에 쓰지 않는다
>   "extra": { "stepId": 3, "projectId": 1 },
> }
> ```
>
> ⚠️ `stepId` 가 없으면 프로젝트 상세까지만 데려간다 (`features/notification/display.ts` 의 `routeOf`).

---

## 81. 알림 읽음 처리

| 항목          | 내용                                                     |
| ------------- | -------------------------------------------------------- |
| **Method**    | `PATCH`                                                  |
| **Path**      | `/api/v1/notifications/{notificationId}/read`            |
| **사용 위치** | ✅ `features/notification/api.ts` — `readNotification()` |

**응답 data** — `notificationId` · `readAt`

> ℹ️ **멱등이다.** 이미 읽은 알림을 다시 불러도 200 이고 최초 읽음 시각을 덮어쓰지 않는다.
> ℹ️ 이동 없이 **읽음만** 표시할 때 쓴다 (케밥 메뉴의 `읽음`). 클릭 이동은 80번이 겸한다.

---

## 82. 알림 전체 읽음 처리

| 항목          | 내용                                                         |
| ------------- | ------------------------------------------------------------ |
| **Method**    | `PATCH`                                                      |
| **Path**      | `/api/v1/notifications/read-all`                             |
| **사용 위치** | ✅ `features/notification/api.ts` — `readAllNotifications()` |

> ❗ **응답 본문 미확인** — Swagger 문서를 받지 못했다. 프론트는 응답을 쓰지 않고 성공 여부만 보므로, 몇 건 처리됐는지가 오더라도 화면은 목록을 다시 받아 그린다.

---

## 83. 알림 삭제

| 항목          | 내용                                                       |
| ------------- | ---------------------------------------------------------- |
| **Method**    | `DELETE`                                                   |
| **Path**      | `/api/v1/notifications/{notificationId}`                   |
| **사용 위치** | ✅ `features/notification/api.ts` — `deleteNotification()` |

**응답** — `204` (본문 없음)

| status | code                     | 화면 처리                             |
| ------ | ------------------------ | ------------------------------------- |
| 403    | `NOTIFICATION_FORBIDDEN` | 남의 알림                             |
| 404    | `NOTIFICATION_NOT_FOUND` | 이미 지워진 알림 — 목록에서 빼면 된다 |

> ℹ️ **논리 삭제다.** 하드 삭제가 아니라 목록에서만 빠진다.

---

## 141. 알림 실시간 수신 (SSE)

> 번호는 뒤지만 **알림 도메인**이라 여기에 둔다. (2026-08-13 신설)

| 항목          | 내용                                                        |
| ------------- | ----------------------------------------------------------- |
| **Method**    | `GET` (`text/event-stream`)                                 |
| **Path**      | `/api/v1/notifications/stream`                              |
| **인증 필요** | ✅ **기존 세션 쿠키 그대로** (별도 토큰 없음)               |
| **사용 위치** | `features/notification/stream.ts` → `subscribeNotificationStream()` |

**응답이 닫히지 않는다.** 요청은 1건이고 그 열린 연결로 서버가 계속 써 보낸다 — 그래서 `lib/api.ts` 래퍼가 아니라 `EventSource` 로 직접 연다 (`apiUrl()` 로 오리진을 씌운다).

**서버가 보내는 이벤트**

| 이벤트         | 시점            | 내용                                             |
| -------------- | --------------- | ------------------------------------------------ |
| `connected`    | 구독 직후 1회   | `{ "userId": "EMP001" }`                         |
| `notification` | 알림 1건        | **목록 항목과 같은 구조** (`readAt` 은 항상 null) |
| `:ping`        | 15초마다        | SSE 주석이라 이벤트로 안 올라온다 — 처리 불필요   |

| status | code                   | 화면 처리                    |
| ------ | ---------------------- | ---------------------------- |
| 401    | `AUTH_UNAUTHENTICATED` | 연결 자체가 열리지 않는다    |

> ⚠️ **`withCredentials: true` 가 없으면 쿠키가 안 실려 401 이다** — 연결이 아예 안 열린다.
> ⚠️ **서버가 30분마다 연결을 정상 종료**하고 브라우저가 자동 재연결한다. 장애가 아니다 — 재연결도 `onerror` 를 거치므로 **오류 문구를 띄우면 안 된다.** `readyState` 가 `CLOSED` 일 때만 정리한다(브라우저가 포기한 경우). 401 에도 `EventSource` 는 무한 재시도하므로 우리가 끊어야 한다.
> ⭐ **밀려온 알림을 목록에 끼워 넣지 않는다** — 신호만 받고 기존 조회를 다시 태운다. 배지는 `?isRead=false` 의 `totalElements` 라 서버만 정확히 알고, 폴링이 안전망으로 남아 있어 `notificationId` dedupe 문제가 생기기 때문이다.
> ℹ️ **구독 시점 이후에 생기는 알림만** 온다 — 과거 알림 · 페이징 · 개수는 계속 목록 API(79~80)다. 그래서 `connected` 마다 목록을 다시 받아 끊긴 사이를 메운다.
> ℹ️ 구독은 셸(`AppShell`)에 **하나만** 둔다. 라우트마다 리마운트되는 자리에 두면 화면을 옮길 때마다 끊겼다 붙는다.
> ℹ️ **주기 조회를 지우지 않았다** — `SSE = 즉시성` · `폴링 = 정합성` 으로 역할을 나눈다. 다만 즉시성이 스트림으로 넘어가 간격을 **5초 → 2분**으로 늘렸다 (`NotificationBell`).

---

## 84. 프로젝트 목록 조회

| 항목          | 내용                                            |
| ------------- | ----------------------------------------------- |
| **Method**    | `GET`                                           |
| **Path**      | `/api/v1/projects`                              |
| **인증 필요** | ✅ 참여자 (`MASTER` · `ADMIN` 은 전 프로젝트)   |
| **사용 위치** | `src/features/project/api.ts` → `getProjects()` |
| **요구사항**  | PRJ-013 · PRJ-015                               |

**Request Parameter** — 전부 선택

| 파라미터             | 타입     | 설명                                                             |
| -------------------- | -------- | ---------------------------------------------------------------- |
| `status`             | `string` | `NOT_STARTED`·`IN_PROGRESS`·`SETTLEMENT`·`COMPLETED`·`CLOSED`    |
| `businessCategoryId` | `number` | 사업 카테고리 필터                                               |
| `startedOnFrom`      | `string` | 기간 필터 시작 (`yyyy-MM-dd`)                                    |
| `startedOnTo`        | `string` | 기간 필터 종료                                                   |
| `keyword`            | `string` | **과업명 · 발주처** 검색                                         |
| `page`               | `number` | 기본 0                                                           |
| `size`               | `number` | 기본 20. **1~100 으로 보정**된다 — 벗어나도 400 이 아니라 잘린다 |

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
      myApprovalInProgressCount: number;   // ⭐ 2026-08-11 개명 (구: myApprovalOpenCount)
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
> ⚠️ `myApprovalInProgressCount` 는 `결재 대기` 가 **아니다** — 요청자가 **기안한** `IN_PROGRESS`+`REJECTED` 수라 결재함 숫자와 다르다.
> ⚠️ 이름이 `InProgress` 라고 **그 상태만 세는 것이 아니다.** `REJECTED` 도 들어간다 — 2026-08-11 `myApprovalOpenCount` 에서 개명됐고 **뜻은 그대로**다.
> ❗ 개명 전 이름으로 읽으면 `undefined` 가 되어 카드에 **숫자 없이 `건` 만** 찍힌다. 응답을 `as T` 로 단언하는 구조라 **타입체크·빌드로는 안 잡힌다.**
> ⚠️ **상세와 달리 `stepCount` · `doneStepCount` 가 없다.** 카드에 `완료/전체` 를 그릴 수 없어 위 두 건수 뱃지로 대신했다.
> ⚠️ **상태별 집계 API 가 없다.** 통계 카드는 상태마다 `size=1` 로 물어 `totalElements` 만 쓴다 (`getProjectCount()`).
> **보관 기능이 없다** — 종결(`CLOSED`) 건도 `status` 필터로 다시 볼 수 있다 (PRJ-015).

## 정산 도메인 — 공통

| 항목          | 내용                                                                                                      |
| ------------- | --------------------------------------------------------------------------------------------------------- |
| **대상**      | 정산 블록 하나(`settleId`)에 정산 항목 **한 벌**이 붙는다 (1:1)                                           |
| **타입**      | 우리 회사 기준 — `INCOME`(입금) · `OUTCOME`(출금). **쿼리로 매번 보낸다**                                 |
| **권한**      | 조회 · 작성 모두 **편집 권한**이 필요하다 — 열람만 가능한 사용자는 수정 화면에 들어가지 못한다            |
| **계좌 정보** | `OUTCOME` 에서만 쓴다. 은행명 · 계좌번호 · 예금주 3종이 함께 필수다                                       |
| **방향**      | `traderName` 은 **보내는 쪽**(`OUTCOME` = 우리 회사), 계좌 3종은 **받는 쪽**(외주 업체)다 — 뒤집지 말 것  |
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
> ⚠️ **낙관적 락 대상이다** (2026-08-12 신설, 백엔드 머지 완료) — 저장(86번)에 `detail.version` 을 실어 보낸다.
> 이 `version` 은 `settlement_block` 테이블의 것이라 **`block.version`(블록 수정 46 · 배치 44번이 쓰는 값)과 다르다.**
> 자세한 처리는 [86번 절](#86-정산-항목-작성--수정) 참고.

### 블록 목록(10번)의 `detail` — 정산

`type: "SETTLEMENT"` 인 블록의 `detail` 이다. **항목 필드를 평면으로** 담는다 (중첩 객체가 아니다).

| 필드                                                                                            | 작성 전 | 설명                                          |
| ----------------------------------------------------------------------------------------------- | ------- | --------------------------------------------- |
| `settleId`                                                                                      | 값 있음 | 정산 블록 ID — 85 · 86번 경로에 쓴다          |
| `status`                                                                                        | 값 있음 | 작성 전에도 `PENDING` 으로 온다               |
| `createdAt`                                                                                     | 값 있음 | 블록이 만들어진 시각                          |
| `paidAmountRatio`                                                                               | `0.0`   | 금액 기준 진행률                              |
| `version`                                                                                       | 값 있음 | **낙관적 락 버전** — 저장(86번)에 실어 보낸다 |
| `type`                                                                                          | `null`  | 작성해야 `INCOME` · `OUTCOME` 이 정해진다     |
| `roundNo` · `totalAmount` · `plannedAmount` · `plannedTaxAmount` · `plannedDate` · `traderName` | `null`  | 작성한 값                                     |
| `bankName` · `accountNumber` · `accountHolder`                                                  | `null`  | 출금일 때만 채워진다 (계좌번호는 마스킹)      |
| `actualAmount` · `actualDate`                                                                   | `null`  | 재무팀이 나중에 채운다                        |

> ⚠️ **작성 전에도 `detail` 은 온다.** 항목 필드만 `null` 이라 `roundNo` · `plannedAmount` 가
> 둘 다 숫자일 때만 '작성됨'으로 본다 (`readSettlementBlockDetail`).

---

## 85. 정산 항목 수정 시 조회

| 항목          | 내용                                                     |
| ------------- | -------------------------------------------------------- |
| **Method**    | `GET`                                                    |
| **Path**      | `/api/v1/blocks/settlements/{settleId}/items`            |
| **인증 필요** | ✅ 편집 권한                                             |
| **사용 위치** | ✅ `features/settlement/api.ts` — `getSettlementDraft()` |

**요청 Query** — `type` (✅ `INCOME` · `OUTCOME`)

**응답 data**

| 필드                    | 타입             | 설명                                                  |
| ----------------------- | ---------------- | ----------------------------------------------------- |
| `settleId`              | `number`         | 정산 블록 ID                                          |
| `recommendRoundNo`      | `number \| null` | 추천 회차 — 프로젝트 내 정산 블록 **개수** 기준       |
| `recommendTotalAmount`  | `number \| null` | 다른 정산 블록의 총 예정 금액. **첫 블록이면 `null`** |
| `originalAccountNumber` | `string \| null` | 마스킹 없는 계좌번호. `OUTCOME` 이 아니면 `null`      |

| status | code       | 화면 처리                                        |
| ------ | ---------- | ------------------------------------------------ |
| 400    | `SETL-005` | `type` 누락 — 프론트가 항상 붙이므로 나오면 버그 |
| 403    | `SETL-001` | 편집 권한 없음                                   |
| 404    | `SETL-002` | 존재하지 않는 블록                               |
| 409    | `SETL-006` | **출금 → 입금 타입 변경 불가** (탭을 되돌린다)   |

> ⚠️ **추천값은 입력값이 아니다.** 컬럼 안에 `추천: 2` 처럼 **안내로** 보여준다.
> ⚠️ **`recommendTotalAmount` 는 이름과 달리 '맞춰야 하는 값'에 가깝다** — 다른 정산 블록과
> 어긋나면 작성이 409(`SETL-008`)로 막힌다. 화면은 `맞출 금액: 4,500,000` 으로 적는다.
> ❗ **첫 블록이면 `null` 이다** (기준 블록이 없다). 실제 응답으로 확인 — 그대로 포맷하면 화면이 죽는다.
> ❗ **조회인데 409 가 있다.** 이미 `OUTCOME` 으로 저장된 블록에서 `INCOME` 탭을 누르면 그 자리에서 막힌다.

---

## 86. 정산 항목 작성 · 수정

| 항목          | 내용                                                 |
| ------------- | ---------------------------------------------------- |
| **Method**    | `PATCH`                                              |
| **Path**      | `/api/v1/blocks/settlements/{settleId}/items`        |
| **인증 필요** | ✅ 편집 권한                                         |
| **사용 위치** | ✅ `features/settlement/api.ts` — `saveSettlement()` |

**요청 Query** — `type` (✅ `INCOME` · `OUTCOME`)

**요청 body**

| 필드               | 타입      | 필수                | 설명                                                                         |
| ------------------ | --------- | ------------------- | ---------------------------------------------------------------------------- |
| `roundNo`          | `number`  | ✅                  | 정산 회차                                                                    |
| `totalAmount`      | `number`  | ✅                  | 프로젝트 정산 예정 총 금액                                                   |
| `plannedAmount`    | `number`  | ✅                  | 회차별 정산 예정 금액                                                        |
| `plannedTaxAmount` | `number`  | ✅                  | 회차별 정산 예정 세금 금액                                                   |
| `plannedDate`      | `string`  | ✅                  | `yyyy-MM-dd`                                                                 |
| `traderName`       | `string`  | ✅                  | **돈을 보내는 쪽** — `INCOME` 은 상대 클라이언트, `OUTCOME` 은 **우리 회사** |
| `bankName`         | `string`  | **`OUTCOME` 만** ✅ | 외주 업체 은행명                                                             |
| `accountNumber`    | `string`  | **`OUTCOME` 만** ✅ | **하이픈 · 공백 없이**                                                       |
| `accountHolder`    | `string`  | **`OUTCOME` 만** ✅ | 외주 업체 예금주                                                             |
| `version`          | `number`  | ✅                  | 블록 목록(10번) `detail.version` 그대로 (2026-08-12 낙관적 락)               |
| `overwrite`        | `boolean` | —                   | `true` 면 충돌을 무시하고 덮어쓴다                                           |

**응답 data** — 요청 필드에 아래가 더 붙는다.

| 필드              | 타입             | 설명                                                               |
| ----------------- | ---------------- | ------------------------------------------------------------------ |
| `settleId`        | `number`         | 정산 블록 ID                                                       |
| `accountNumber`   | `string`         | ⚠️ **마스킹**된다 (`100******444`) — 원본은 85번에서만             |
| `actualAmount`    | `number \| null` | 재무팀이 채우는 실제 금액. 작성 직후 `null`                        |
| `actualDate`      | `string \| null` | 실제 입출금 일시. 작성 직후 `null`                                 |
| `status`          | `string`         | `PENDING`(미연결) · `WAITING`(정산 대기) · `PARTIAL` · `COMPLETED` |
| `paidAmountRatio` | `number`         | 금액 기준 진행률. 작성 직후 `0`. ❗ **단위 확인 필요**             |
| `createdAt`       | `string`         | 내용이 생성된 일시                                                 |
| `version`         | `number`         | **저장 후의 새 값** — 화면에 꽂아야 다음 저장이 통과한다           |

| status | code                          | 화면 처리                                                               |
| ------ | ----------------------------- | ----------------------------------------------------------------------- |
| 400    | `SETL-003`                    | 빈 내용                                                                 |
| 400    | `SETL-004`                    | **출금인데 계좌 정보 누락** — 화면에서 먼저 막는다                      |
| 400    | `SETL-005`                    | `type` 누락                                                             |
| 400    | `SETL-011`                    | **회차 번호는 1 이상** — 화면에서 먼저 막는다                           |
| 400    | `SETTLEMENT_VERSION_REQUIRED` | `version` 누락 — 저장을 막고 새로고침 안내                              |
| 403    | `SETL-001`                    | 편집 권한 없음                                                          |
| 404    | `SETL-002`                    | **그 사이 블록이 삭제됨** — 폼을 닫고 목록 재조회                       |
| 409    | `SETL-006`                    | 출금 → 입금 타입 변경 불가                                              |
| 409    | `SETL-007`                    | **세금계산서 · 입출금 내역이 연결돼 수정 불가** — 폼을 닫고 목록 재조회 |
| 409    | `SETL-008`                    | 같은 프로젝트의 다른 정산 블록과 **총 예정 금액 불일치**                |
| 409    | `SETTLEMENT_VERSION_CONFLICT` | **새로고침 / 덮어쓰기**를 사용자에게 묻는다                             |

> ✅ **성공은 `200`** 이다 (스웨거 실제 응답 확인 — 문서의 `201` 표기가 잘못됐다).
> ✅ **`status` 는 `PENDING`** 이다 (본문의 `PENDGING` 은 오타).
> ❗ **`paidAmountRatio` 단위 확인 필요.** 작성 직후 값(`0`)만 확인돼 비율인지 백분율인지 알 수 없다.
> 화면은 **백분율(0~100)** 로 보고 그린다 — 비율이면 절반 정산이 `0.5%` 로 보인다.
> ℹ️ **409 셋은 사후 처리다.** `SETL-007`(연결됨) · `SETL-008`(총액 불일치)은 화면이 미리 알 수 없어
> 서버 `message` 를 그대로 띄운다.

**낙관적 락 (2026-08-12 신설)**

| 규칙                                                                                                      |
| --------------------------------------------------------------------------------------------------------- |
| `version` 은 **블록 목록(10번)의 `detail.version`** — ⚠️ `block.version` 과 **다른 테이블의 다른 값**이다 |
| 버전 충돌은 `overwrite: true` 로 **무조건 통과**한다 (같은 요청에 이 키만 더한다)                         |
| 응답 `version` 은 저장 후의 새 값 — 화면에 꽂지 않으면 **연달아 두 번째 저장이 409**                      |

> 🚨 **409 가 곧 버전 충돌이 아니다.** 이 API 의 409 는 **넷**이다 — `SETTLEMENT_VERSION_CONFLICT` ·
> `SETL-006` · `SETL-007` · `SETL-008`. 판정은 status 가 아니라 **`code`** 로 한다
> (`features/settlement/errorCodes.ts` → `isSettlementVersionConflict`).
>
> ⛔ **덮어쓰기로도 못 뚫는 둘** — `404 SETL-002`(그 사이 블록 삭제) · `409 SETL-007`(세금계산서 ·
> 입출금 매칭돼 잠김). 이 둘은 **폼을 닫고 블록 목록을 다시 읽는다** (`onStale` → `notifyBlockChanged()`).
>
> ℹ️ 백엔드 판정 순서는 **삭제 → 상태(연결) → 버전**이다. 삭제 · 연결이 먼저 걸리면 버전이 어긋나 있어도 그쪽 코드가 온다.

---

## 87. 사원 엑셀 템플릿 다운로드

| 항목          | 내용                                         |
| ------------- | -------------------------------------------- |
| **Method**    | `GET`                                        |
| **Path**      | `/api/v1/employees/bulk-template`            |
| **인증 필요** | ✅ (ADMIN)                                   |
| **사용 위치** | `employee/api.ts` → `downloadBulkTemplate()` |

**응답** — JSON 이 아니라 **`.xlsx` 바이너리**다. 헤더만 있는 8컬럼:
사번 · 이름 · 부서명 · 직급명 · 입사일 · 이메일 · 연락처 · 권한

| status | code                 | 화면 처리 |
| ------ | -------------------- | --------- |
| 403    | `ACC_ADMIN_REQUIRED` | 권한 없음 |

> ⚠️ 응답 봉투(`{ httpStatus, message, data }`)가 아니라 파일이다 — `src/lib/api.ts` 래퍼를 그대로 쓸 수 없다 (`blob()` 처리 필요).
> ℹ️ 권한 컬럼은 있지만 `ADMIN` 값은 검증에서 거부된다.

---

## 88. 사원 엑셀 일괄 등록 검증

| 항목          | 내용                                          |
| ------------- | --------------------------------------------- |
| **Method**    | `POST` (`multipart/form-data`)                |
| **Path**      | `/api/v1/employees/bulk/validate`             |
| **인증 필요** | ✅ (ADMIN)                                    |
| **사용 위치** | `employee/api.ts` → `validateBulkEmployees()` |

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

| 항목          | 내용                                          |
| ------------- | --------------------------------------------- |
| **Method**    | `POST` (`multipart/form-data`)                |
| **Path**      | `/api/v1/employees/bulk`                      |
| **인증 필요** | ✅ (ADMIN)                                    |
| **사용 위치** | `employee/api.ts` → `registerBulkEmployees()` |

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

| 항목          | 내용                                               |
| ------------- | -------------------------------------------------- |
| **Method**    | `GET`                                              |
| **Path**      | `/api/v1/job-positions/{jobPositionId}/employees`  |
| **인증 필요** | ✅ (ADMIN)                                         |
| **사용 위치** | `jobPosition/api.ts` → `getJobPositionEmployees()` |

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

| 항목        | 내용                                                                      |
| ----------- | ------------------------------------------------------------------------- |
| 성격        | 권한이 **아니다** — 멤버 선택 · 페이지 권한 부여를 돕는 **선택용 인덱스** |
| 권한        | 조회는 로그인 사용자 전체, 변경(생성·수정·삭제·구성원)은 **ADMIN**        |
| 권한 불변성 | 그룹으로 권한을 줘도 **개인 단위 스냅샷**으로 저장된다                    |
| 그래서      | 그룹을 지우거나 구성원을 빼도 **이미 부여된 권한은 그대로**               |
| 구성원 집계 | `memberCount` 는 시스템 계정 · 퇴사자를 제외한 수                         |

---

## 91. 사원 그룹 목록 조회

| 항목          | 내용                                           |
| ------------- | ---------------------------------------------- |
| **Method**    | `GET`                                          |
| **Path**      | `/api/v1/employee-groups`                      |
| **인증 필요** | ✅ (전체 사용자)                               |
| **사용 위치** | `employeeGroup/api.ts` → `getEmployeeGroups()` |

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

| 항목          | 내용                                             |
| ------------- | ------------------------------------------------ |
| **Method**    | `POST`                                           |
| **Path**      | `/api/v1/employee-groups`                        |
| **인증 필요** | ✅ (ADMIN)                                       |
| **사용 위치** | `employeeGroup/api.ts` → `createEmployeeGroup()` |

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

| 항목          | 내용                                             |
| ------------- | ------------------------------------------------ |
| **Method**    | `PATCH`                                          |
| **Path**      | `/api/v1/employee-groups/{groupId}`              |
| **인증 필요** | ✅ (ADMIN)                                       |
| **사용 위치** | `employeeGroup/api.ts` → `updateEmployeeGroup()` |

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

| 항목          | 내용                                             |
| ------------- | ------------------------------------------------ |
| **Method**    | `DELETE`                                         |
| **Path**      | `/api/v1/employee-groups/{groupId}`              |
| **인증 필요** | ✅ (ADMIN)                                       |
| **사용 위치** | `employeeGroup/api.ts` → `deleteEmployeeGroup()` |

**응답 data** — `null`

| status | code                 | 화면 처리 |
| ------ | -------------------- | --------- |
| 403    | `ACC_ADMIN_REQUIRED` | 권한 없음 |
| 404    | `GRP_NOT_FOUND`      | 그룹 없음 |

> ⚠️ 부서 · 직급과 달리 **구성원이 있어도 삭제된다** (매핑 CASCADE). 확인 모달에서 인원수를 보여줘야 한다.

---

## 95. 그룹 구성원 목록 조회

| 항목          | 내용                                         |
| ------------- | -------------------------------------------- |
| **Method**    | `GET`                                        |
| **Path**      | `/api/v1/employee-groups/{groupId}/members`  |
| **인증 필요** | ✅ (전체 사용자)                             |
| **사용 위치** | `employeeGroup/api.ts` → `getGroupMembers()` |

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

| 항목          | 내용                                         |
| ------------- | -------------------------------------------- |
| **Method**    | `POST`                                       |
| **Path**      | `/api/v1/employee-groups/{groupId}/members`  |
| **인증 필요** | ✅ (ADMIN)                                   |
| **사용 위치** | `employeeGroup/api.ts` → `addGroupMembers()` |

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
| **사용 위치** | `employeeGroup/api.ts` → `removeGroupMember()`       |

**응답 data** — `groupId` · `memberCount`

| status | code                   | 화면 처리     |
| ------ | ---------------------- | ------------- |
| 403    | `ACC_ADMIN_REQUIRED`   | 권한 없음     |
| 404    | `GRP_NOT_FOUND`        | 그룹 없음     |
| 404    | `GRP_MEMBER_NOT_FOUND` | 구성원이 아님 |

> ℹ️ 다건 제거 API 는 없다 — **한 명씩** 호출한다. 제거해도 받은 권한은 유지된다.

---

## 페이지 권한 도메인 — 공통

| 항목              | 내용                                                                                                                                                                                  |
| ----------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 카탈로그          | 페이지 11개는 **개발자가 코드로 고정**한다 — ADMIN 도 생성 · 삭제할 수 없다                                                                                                           |
| 부여 대상         | 11개 중 **`BIDDING`(공고·입찰) · `FINANCE`(재무) 2개뿐**. 나머지는 전역 role 로 열린다                                                                                                |
| `permission`      | `NONE`(보이지만 접근 불가) · `VIEWER` · `EDITOR` — 부여 화면의 3지선다와 1:1                                                                                                          |
| `source`          | `GRANTED`(명시 부여 · 회수 가능) · `GLOBAL_ROLE`(전역권한 · 회수 불가) · `ADMIN_ONLY` · `DEFAULT`                                                                                     |
| 노출 ≠ 접근       | 메뉴가 보여도 `permission: NONE` 이면 진입 시 차단해야 한다                                                                                                                           |
| ADMIN 제외 페이지 | `PROJECT_CREATE` · `MY_PROJECT` 만 미반환 (시스템 계정이라 `project_member` 등록 불가)                                                                                                |
| 카탈로그 코드     | `HOME` · `NOTIFICATION` · `APPROVAL` · `BIDDING` · `PROJECT_CREATE` · `MY_PROJECT` · `FINANCE` · `COMPANY_STATUS` · `TEMPLATE` · `ADMIN_CONSOLE` · `SETTINGS` (2026-08-10 응답 확인)  |
| 프론트 정책       | 사이드바는 `/my/pages` 응답만 그린다. 화면이 없는 코드(`COMPANY_STATUS` · `TEMPLATE`)와 대응이 미확정인 코드(`ADMIN_CONSOLE` · `SETTINGS`)만 `constants/menu.ts` 고정 항목으로 남는다 |

---

## 98. 내 페이지 목록 조회

| 항목          | 내용                                                                     |
| ------------- | ------------------------------------------------------------------------ |
| **Method**    | `GET`                                                                    |
| **Path**      | `/api/v1/my/pages`                                                       |
| **인증 필요** | ✅ (전체 사용자)                                                         |
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

| 항목          | 내용                                            |
| ------------- | ----------------------------------------------- |
| **Method**    | `GET`                                           |
| **Path**      | `/api/v1/pages`                                 |
| **인증 필요** | ✅ (ADMIN)                                      |
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

| 항목          | 내용                                                    |
| ------------- | ------------------------------------------------------- |
| **Method**    | `GET`                                                   |
| **Path**      | `/api/v1/pages/{pageCode}/permissions`                  |
| **인증 필요** | ✅ (ADMIN)                                              |
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

| 항목          | 내용                                                        |
| ------------- | ----------------------------------------------------------- |
| **Method**    | `POST`                                                      |
| **Path**      | `/api/v1/pages/{pageCode}/permissions`                      |
| **인증 필요** | ✅ (ADMIN)                                                  |
| **사용 위치** | `features/pagePermission/api.ts` → `grantPagePermissions()` |

**요청 Body**

| 필드                       | 타입       | 필수 | 설명                |
| -------------------------- | ---------- | ---- | ------------------- |
| `permissions`              | `Object[]` | ✅   | 1개 이상            |
| `permissions[].userId`     | `string`   | ✅   | 사번                |
| `permissions[].permission` | `string`   | ✅   | `VIEWER` · `EDITOR` |

**응답 data** — `pageCode` · `requestedCount` · `grantedCount` · `updatedCount` · `unchangedCount`

| status | code                                                    | 화면 처리                      |
| ------ | ------------------------------------------------------- | ------------------------------ |
| 400    | `PAGE_INVALID_REQUEST` · `PAGE_INVALID_PERMISSION`      | 빈 목록 · 허용되지 않는 등급   |
| 403    | `ACC_ADMIN_REQUIRED` · `ACC_SYSTEM_ACCOUNT_NOT_ALLOWED` | 권한 없음 · ADMIN 대상         |
| 404    | `PAGE_NOT_FOUND` · `EMP_NOT_FOUND`                      | 없는 사번 포함 → **전체 거부** |

> ⚠️ **전체 교체가 아니다** — 요청에 없는 사용자는 건드리지 않는다. 회수 불가한 MASTER 가 섞여 있어 `PUT` 이 아닌 `POST` 다.
> ℹ️ 부여와 등급 변경이 같은 API 다 (이미 있으면 갱신 → `updatedCount`).
> ℹ️ 그룹으로 부여해도 **개인 단위 스냅샷**으로 저장돼, 이후 그룹 구성원이 바뀌어도 권한은 불변이다.

---

## 102. 페이지 권한 회수

| 항목          | 내용                                                        |
| ------------- | ----------------------------------------------------------- |
| **Method**    | `DELETE`                                                    |
| **Path**      | `/api/v1/pages/{pageCode}/permissions/{userId}`             |
| **인증 필요** | ✅ (ADMIN)                                                  |
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

## 파일 삭제 · 복구 — 공통

삭제는 **전면 soft delete** 다. 휴지통은 보관 기간 제한이 없고, **영구 삭제만** 저장소(S3) 객체를 지운다.
권한은 파일 단위가 아니라 **스텝 EDITOR** 를 그대로 따른다 (업로더 본인 제한 없음).

| 단계        | 엔드포인트                                        | 되돌리기 |
| ----------- | ------------------------------------------------- | -------- |
| 휴지통 이동 | `DELETE /files/{fileId}` (40번)                   | 가능     |
| 복구        | `POST /files/{fileId}/restore` (103번)            | —        |
| 영구 삭제   | `POST /files/{fileId}/permanent-deletion` (104번) | ❌ 불가  |

> ⚠️ **결재가 잠근다.** 진행 중 결재의 대상이면 휴지통 이동이 409 로 막히고, **완료 포함** 결재 참조가 있으면 영구 삭제가 409 로 막힌다.

---

## 103. 휴지통에서 복구

| 항목          | 내용                                     |
| ------------- | ---------------------------------------- |
| **Method**    | `POST`                                   |
| **Path**      | `/api/v1/files/{fileId}/restore`         |
| **인증 필요** | ✅ (스텝 `EDITOR`)                       |
| **사용 위치** | `features/file/api.ts` → `restoreFile()` |

원래 블록으로 복구된다 (연결은 휴지통에 있는 동안에도 유지). **블록이 삭제됐어도 복구되며**, 이 경우 파일은 블록에 붙지 않은 채 살아나 `blockId: null` · `blockDeleted: true` 로 응답한다.

**응답 data**

| 필드           | 타입             | 설명                                             |
| -------------- | ---------------- | ------------------------------------------------ |
| `fileId`       | `number`         | 복구한 문서                                      |
| `name`         | `string`         | 표시명                                           |
| `blockId`      | `number \| null` | 붙은 블록. 블록이 삭제됐으면 `null`              |
| `blockDeleted` | `boolean`        | `true` 면 "블록이 삭제되어 문서함으로 복구" 안내 |

| status | code                            | 화면 처리                     |
| ------ | ------------------------------- | ----------------------------- |
| 200    | —                               | 목록에서 제거 · 문서함에 반영 |
| 400    | `FILE_NOT_DELETED`              | 휴지통에 없음                 |
| 403    | `FILE_EDIT_PERMISSION_REQUIRED` | 편집 권한 없음                |
| 404    | `FILE_NOT_FOUND`                | 문서 없음                     |

> ℹ️ 폐기된 `FILE_BLOCK_DELETED` 규칙은 없다 — 블록이 지워졌다고 복구가 막히지 않는다.

---

## 104. 파일 영구 삭제

| 항목          | 내용                                               |
| ------------- | -------------------------------------------------- |
| **Method**    | `POST` (⚠️ `DELETE` 가 아니다)                     |
| **Path**      | `/api/v1/files/{fileId}/permanent-deletion`        |
| **인증 필요** | ✅ (스텝 `EDITOR`)                                 |
| **사용 위치** | `features/file/api.ts` → `permanentlyDeleteFile()` |

**휴지통 문서만** 대상이다. 확인 문자가 정확히 `영구 삭제` 여야 하고 **서버가 검증**한다 — 본문이 필요해서 `DELETE` 가 아니라 `POST` 다 (일부 프록시가 `DELETE` 본문을 버린다).

**요청 body**

| 필드          | 타입     | 필수 | 설명                       |
| ------------- | -------- | ---- | -------------------------- |
| `confirmText` | `string` | ✅   | `영구 삭제` 와 정확히 일치 |

**응답 data**

| 필드                  | 타입     | 설명                                                    |
| --------------------- | -------- | ------------------------------------------------------- |
| `fileId`              | `number` | 지운 문서                                               |
| `deletedVersionCount` | `number` | 지운 버전 수                                            |
| `storageDeletedCount` | `number` | 저장소 **삭제 요청 수** (S3 삭제는 커밋 후 best-effort) |

| status | code                            | 화면 처리                           |
| ------ | ------------------------------- | ----------------------------------- |
| 200    | —                               | 휴지통에서 제거                     |
| 400    | `FILE_CONFIRM_TEXT_MISMATCH`    | 확인 문자 불일치                    |
| 400    | `FILE_NOT_DELETED`              | 휴지통에 없는 문서                  |
| 403    | `FILE_EDIT_PERMISSION_REQUIRED` | 편집 권한 없음                      |
| 404    | `FILE_NOT_FOUND`                | 문서 없음                           |
| 409    | `FILE_APPROVAL_REFERENCED`      | **완료 포함** 모든 결재 참조가 차단 |

> ⚠️ 모든 버전의 S3 객체를 제거한다 — **되돌릴 수 없다.** DB 삭제 전 파생데이터 정리 포트를 먼저 부른다 (비타메이트 `file_index` · `document_chunk` 등).

---

## 105. 프로젝트 문서함 (전체 파일)

| 항목          | 내용                                         |
| ------------- | -------------------------------------------- |
| **Method**    | `GET`                                        |
| **Path**      | `/api/v1/projects/{projectId}/files`         |
| **인증 필요** | ✅ (접근 권한 보유자)                        |
| **사용 위치** | `features/file/api.ts` → `getProjectFiles()` |

스텝 · 블록 위치와 함께 **평면 목록**(`files[]`)을 주고 **프론트가 스텝 → 블록 트리로 조합**한다 (이미지 모아보기와 구조 통일). 활성 문서만 · 문서 단위 최신 1행. 고아 파일도 포함(`blockId: null` · `blockDeleted: true`).

**응답 data — `files[]`**

| 필드                                           | 타입                              | 설명                        |
| ---------------------------------------------- | --------------------------------- | --------------------------- |
| `stepId` / `stepName`                          | `number`/`string`                 | 속한 스텝                   |
| `blockId` / `blockTitle`                       | `number \| null`/`string \| null` | 속한 블록                   |
| `blockDeleted`                                 | `boolean`                         | 블록이 지워진 고아 파일     |
| `fileId` / `name`                              | `number`/`string`                 | 문서 · 표시명               |
| `latestVersionId` / `latestVersionNo`          | `number`                          | 최신 버전                   |
| `versionCount`                                 | `number`                          | 버전 수                     |
| `originalFileName` / `extension` / `sizeBytes` | `string`/`string`/`number`        | 원본 정보                   |
| `previewable`                                  | `boolean`                         | PDF 만 `true`               |
| `uploaderName`                                 | `string`                          | 업로더 (부서 · 직급은 없다) |
| `updatedAt`                                    | `string`                          | `YYYY-MM-DDTHH:mm:ss`       |

| status | code                              | 화면 처리      |
| ------ | --------------------------------- | -------------- |
| 200    | —                                 | 없으면 빈 배열 |
| 403    | `FILE_ACCESS_PERMISSION_REQUIRED` | 접근 권한 없음 |
| 404    | `PROJECT_NOT_FOUND`               | 프로젝트 없음  |

> ⚠️ **presigned 미임베드** — 다운로드는 클릭 시 42번(5분 URL)을 호출한다. 정렬은 `stepId` → `blockId` → 연결일.
> 🔄 **2026-08-16(D안)** — 블록 삭제 파일이 휴지통으로 가므로 이 활성 목록엔 **바로 오지 않는다.**
>    그래도 `blockDeleted: true` 는 여전히 나타난다 — **휴지통에서 복구된 고아**가 이 값으로 온다.
>    `블록 삭제됨` 배지 처리를 **유지한다** (`groupFiles.ts` 의 고아 묶음).

---

## 140. 내 프로젝트 파일 모아보기

> 번호는 뒤지만 **105번과 형제 API** 라 여기에 둔다. (FILE-Q-03 · 2026-08-13 스웨거 실측)

| 항목          | 내용                                    |
| ------------- | --------------------------------------- |
| **Method**    | `GET`                                   |
| **Path**      | `/api/v1/files/my`                      |
| **인증 필요** | ✅ (로그인 사용자)                      |
| **사용 위치** | `features/file/api.ts` → `getMyFiles()` |

**내가 멤버인 모든 프로젝트**를 가로질러 문서를 모은다. 105번과 같은 평면 목록(`files[]`)이고 **프론트가 `projectId` 로 그룹핑**한다.

**Query**

| 이름        | 타입     | 내용                          |
| ----------- | -------- | ----------------------------- |
| `keyword`   | `string` | 문서명 · 원본 파일명 부분 일치 |
| `projectId` | `number` | 특정 프로젝트만               |
| `extension` | `string` | 확장자 (`pdf` · `csv` …)      |

**응답 data — `files[]`** — 105번의 모든 필드에 아래가 더 붙는다

| 필드                                     | 타입             | 설명                            |
| ---------------------------------------- | ---------------- | ------------------------------- |
| `projectId` / `projectName`              | `number`/`string` | 속한 프로젝트                   |
| `uploaderDepartment` / `uploaderPosition` | `string \| null` | 시스템 계정이면 `null`          |

| status | code                   | 화면 처리      |
| ------ | ---------------------- | -------------- |
| 200    | —                      | 없으면 빈 배열 |
| 401    | `AUTH_UNAUTHENTICATED` | 전역 처리      |

> ℹ️ **페이징이 없다** — 전체를 받아 스크롤로 본다. 정렬은 **프로젝트 → 스텝 → 블록** 이라 그룹핑은 순서만 지키면 된다.
> ℹ️ 권한은 스텝을 따른다 — 스텝 override(`NONE`)로 강등된 파일은 **응답에서 빠진다.** 화면에서 다시 거르지 않는다.
> ℹ️ 전역 `ADMIN` · `MASTER` 는 스텝 정책상 모든 스텝의 `EDITOR` 라 **자신이 멤버인 프로젝트의 전 파일**을 본다 (우회가 아니라 정책상 권한).
> ⚠️ **`updatedAt` 이 `YYYY-MM-DD HH:mm:ss`(공백 구분) 로 온다** — 105번의 `T` 구분과 다르다. `lib/format.ts` 는 둘 다 받으므로 화면은 그대로 쓴다.
> ⚠️ **역할 배지(PM · 참여) 값이 없다** — 목업에는 있으나 응답에 필드가 없어 화면에서 뺐다. 필요하면 백엔드에 요청한다.
> ⛔ **조회 전용이다.** 업로드 · 이름 수정 · 삭제는 문서가 붙은 스텝 화면에서 한다.

---

## 142. 전사 파일 목록 (ADMIN)

> 번호는 뒤지만 **105 · 140번과 형제 API** 라 여기에 둔다. (FILE-Q-01 · 2026-08-14 명세 수령)

| 항목          | 내용                                       |
| ------------- | ------------------------------------------ |
| **Method**    | `GET`                                      |
| **Path**      | `/api/v1/admin/files`                      |
| **인증 필요** | ✅ **ADMIN 전용**                          |
| **사용 위치** | `features/file/api.ts` → `getAdminFiles()` |

**전사 모든 프로젝트**의 파일을 가로지른다. 105 · 140번과 달리 **문서 단위 최신 완료 버전 1행**이고 **페이징이 있다**.

**Query**

| 이름        | 타입     | 내용                        |
| ----------- | -------- | --------------------------- |
| `keyword`   | `string` | 파일명 · 원본명 · 업로더    |
| `projectId` | `number` | 프로젝트 필터               |
| `extension` | `string` | 확장자                      |
| `page`      | `number` | 0-base                      |
| `size`      | `number` | 기본 20 · 최대 100          |

**응답 data** — 페이지 봉투(`content` · `page` · `size` · `totalElements` · `totalPages`)

| 필드                                            | 설명                                    |
| ----------------------------------------------- | --------------------------------------- |
| `projectId` / `projectName`                     | 속한 프로젝트 (그룹핑 기준)             |
| `stepId` / `stepName` / `blockId` / `blockTitle` | 위치 — **id 도 함께 온다** (2026-08-16 스웨거 실측. 예전 표에 이름만 적혀 있었다) |
| `fileId` / `name` / `versionCount`              | 문서 정보                               |
| `latestVersionId` / `latestVersionNo`           | 최신 완료 버전 — 다운로드 · 미리보기 대상 |
| `originalFileName` / `extension` / `sizeBytes`  | 원본 정보                               |
| `previewable` / `updatedAt`                     | —                                        |
| `uploaderName?` / `uploaderDepartment?` / `uploaderPosition?` | 시스템 계정이면 오지 않는다 |

| status | code                   | 화면 처리        |
| ------ | ---------------------- | ---------------- |
| 200    | —                      | 없으면 빈 배열   |
| 403    | `ACC_ADMIN_REQUIRED`   | 표 자리에 안내   |

> ℹ️ 다운로드 · 미리보기는 행에서 **공용 파일 버전 API**(42번 `download` · `preview`)를 그대로 부른다.
> ⚠️ **정렬 파라미터가 없다** — 목업의 `최근 수정순` 드롭다운은 화면에서 뺐다.
> ✅ **스텝 단위 조회는 151~154번(탐색기)이 맡는다** (2026-08-16 해소) — 이 API 에 `stepId` 필터를 붙이는 대신
>    전용 트리 API 가 왔다. 탐색기가 프로젝트 500건을 미리 받아 화면에서 나누던 방식은 걷어냈다.
>    이 API 는 이제 **검색 · 필터 담당**이다 (프로젝트 · 스테이지 단계에서 쓴다).
> ⚠️ **집계가 없다** — 총 용량 · 기간별 업로드 수는 응답으로 알 수 없어 요약 카드에 넣지 않았다.

---

## 143~150. 사내 문서함 (ADMIN)

> `CompanyDocument` 도메인 · 2026-08-14 명세 수령. **프로젝트 파일과 저장소 · 에러코드(`CDOC_*`)가 모두 다르다.**
> 회사 재정 · 소개 · 실적 자료로 **AI 공고 검토의 비교 기준**이 되는 자료다. 전 API 가 ADMIN 전용(403 `ACC_ADMIN_REQUIRED`).
> **사용 위치**: `features/companyDocument/api.ts` · `upload.ts`

| 번호 | Method · Path                                              | 내용                     |
| ---- | ---------------------------------------------------------- | ------------------------ |
| 143  | `GET /admin/company-documents`                             | 목록 (분류 · 검색 · 페이징) |
| 144  | `POST /admin/company-documents/uploads`                    | ① 업로드 시작 · presigned |
| 145  | `POST /admin/company-documents/uploads/{versionId}/complete` | ③ 완료 통보            |
| 146  | `GET /admin/company-documents/{documentId}/versions`       | 버전 이력                |
| 147  | `GET /admin/company-document-versions/{versionId}/download` | 다운로드 URL (5분)      |
| 148  | `GET /admin/company-document-versions/{versionId}/preview`  | 미리보기 (PDF 앞 5p)    |
| 149  | `PATCH /admin/company-documents/{documentId}`              | 표시명 · 분류 수정       |
| 150  | `DELETE …/{documentId}` · `POST …/restore`                 | 삭제(soft) · 복구        |

**143 목록** — Query `category`(`FINANCE`·`COMPANY_INTRO`·`PERFORMANCE`·`CERTIFICATE`·`ETC`) · `keyword` · `page`/`size`(20·최대100)
`data.content[]`: `companyDocumentId` · `category` · `name` · `latestVersionId` · `latestVersionNo` · `versionCount` · `originalFileName` · `extension` · `sizeBytes` · `previewable` · `uploaderName?` · `updatedAt`

**144 업로드 시작** — Body `category`(새 문서 필수 · 새 버전이면 생략) · `originalFileName` · `sizeBytes`(≤50MB) · `name`/`comment`(opt) · `companyDocumentId`(주면 새 버전)
201 `data`: `versionId`(UPLOADING 생성) · `uploadUrl`(여기로 클라가 PUT) · `expiresAt`(10분)
에러: 400 `CDOC_SIZE_EXCEEDED` · 400 `CDOC_EXTENSION_BLOCKED` · 404 `CDOC_NOT_FOUND`

**145 완료 통보** — Body `checksum`(opt) / 200 `data`: 버전 상세(`pageCount?` 포함)
에러: 400 `CDOC_ALREADY_COMPLETED` · 409 `CDOC_OBJECT_NOT_FOUND` · 409 `CDOC_SIZE_MISMATCH`

**146 버전 이력** — `data`: `companyDocumentId` · `name` · `category` · `versionCount` + `content[]`(`versionId` · `versionNo` · `latest` · `originalFileName` · `extension` · `sizeBytes` · `pageCount?` · `previewable` · `comment?` · `uploaderName?` · `completedAt`)

**147 다운로드** — `downloadUrl` · `expiresAt` · `originalFileName` · `sizeBytes` / 409 `CDOC_UPLOAD_NOT_COMPLETED`
**148 미리보기** — PDF 바이너리 · 헤더 `X-Preview-Page-Count` · `X-Total-Page-Count` / 409 `CDOC_PREVIEW_NOT_SUPPORTED` · 500 `CDOC_PREVIEW_FAILED`
**149 수정** — `name` / `category` 중 최소 1개 / 400 `CDOC_INVALID_REQUEST` · 404 `CDOC_NOT_FOUND`
**150 삭제 · 복구** — 삭제 응답 `deletedAt` / 400 `CDOC_ALREADY_DELETED` · 복구 400 `CDOC_NOT_DELETED`

> ℹ️ 업로드는 **2단계 방식**(발급 → PUT → 완료 통보)이라 프로젝트 파일(37 · 38번)과 같은 흐름이다. 화면도 문서 블록(`FileBlock`)과 같은 방식이다 — 숨긴 `<input>` 하나를 `새 문서 추가` · 행의 `새 버전 올리기` 가 함께 쓰고, 대상은 `companyDocumentId` 유무로 갈린다.
> ℹ️ **148번(미리보기)은 화면이 쓰지 않는다** — 사내 문서함은 최신본을 받아 쓰는 화면이라 미리보기 영역을 두지 않았다 (`api.ts` 에 창구만 남겨 둠).
> ⚠️ **AI 인덱싱 상태 필드가 목록 응답에 없다** — 목업의 `완료` · `인덱싱중` 배지는 §6-2 AI 도메인 확정 후 필드명이 정해지면 붙인다. 지금은 화면에서 뺐다.
> ⚠️ **목록에 삭제분을 부르는 조건이 없다** — 복구는 지운 직후 화면이 들고 있는 id 로만 가능하다. 화면은 삭제 후 `되돌리기` 줄을 띄운다.
> ℹ️ 업로더가 `null` 이면 `—` 로 적는다 (ADMIN 은 사원 레코드가 없다).

---

## 151~154. 전사 파일 탐색기 (ADMIN)

> 백엔드 `.ai/api/file.md` **§14** · 2026-08-16 (PR #412 **`develop` 머지 완료**). 전 API **ADMIN 전용**(403 `ACC_ADMIN_REQUIRED`).
> **사용 위치**: `features/file/api.ts` → `getAdminTreeProjects()` · `getAdminTreeStages()` · `getAdminTreeSteps()` · `getAdminStepFiles()`

전사 파일을 **윈도우 탐색기식 계층**으로 훑는다. 노드를 열 때마다 **자식만** 부른다 (`프로젝트 → 스테이지 → 스텝 → 파일`).

| 번호 | Method · Path                                       | 페이징 | 반환                    |
| ---- | --------------------------------------------------- | ------ | ----------------------- |
| 151  | `GET /admin/files/projects`                         | ✅     | 프로젝트 (이름 오름차순) |
| 152  | `GET /admin/files/projects/{projectId}/stages`      | —      | 스테이지 + 미분류 버킷   |
| 153  | `GET /admin/files/projects/{projectId}/steps`       | —      | 스텝 (`stageId` 필터)    |
| 154  | `GET /admin/files/steps/{stepId}/files`             | ✅     | 스텝 안의 파일           |

**151 프로젝트** — Query `page`(0-base) · `size`(기본 10)
`data.content[]`: `projectId` · `name` · `status`(`NOT_STARTED`·`IN_PROGRESS`·`SETTLEMENT`·`COMPLETED`·`CLOSED`) · `clientName?` · `updatedAt`(`yyyy-MM-dd HH:mm:ss`)

**152 스테이지** — `data.stages[]`: `stageId`(⚠️ **미분류 버킷이면 `null`**) · `name` · `sortOrder`
⭐ **미분류 버킷을 서버가 만든다** — 스테이지에 속하지 않은 스텝이 하나라도 있으면 목록 **맨 뒤**에
`{ "stageId": null, "name": "미분류", "sortOrder": 2147483647 }` 이 붙는다. 이 칸을 열면 153 을 **`stageId` 없이** 부른다.
에러: 404 `PROJECT_NOT_FOUND`

**153 스텝** — Query `stageId`(선택 · 생략하면 **미분류** 스텝)
`data.steps[]`: `stepId` · `name` · `sortOrder` · `status`(`NOT_STARTED`·`IN_PROGRESS`·`DONE`) / 404 `PROJECT_NOT_FOUND`

**154 스텝 내 파일** — Query `page` · `size`(기본 10) · 최신 업로드순 · 문서 단위 최신 완료 버전
`data.content[]` 는 **142번과 같은 행 모양**(`AdminFile`)이라 표를 그대로 쓴다. `blockDeleted` 는 항상 `false`(삭제 블록 파일은 오지 않는다).
에러: 404 `FILE_STEP_NOT_FOUND` (**신설** · `develop` 반영 — 코드 상수는 `features/file/errorCodes.ts`)

> ⭐ **일반 프로젝트 API 로 훑지 않는다** — `GET /projects` · `/projects/{id}/stages` · `/steps` 는 참여자 권한이라
>    관리자가 **참여하지 않은 프로젝트**에서 403 이 났다. 이 4종은 회사 스코프라 그 문제가 없다.
> ⚠️ **검색 · 확장자 필터가 없다** — 조건으로 찾을 때는 142번(`GET /admin/files`)을 쓴다.
>    그래서 화면은 스텝 안에 들어가면 **필터 줄을 숨긴다** (`AdminFileList` 의 `lockedStepId`).
> ⚠️ **개수가 없다** — 스테이지의 스텝 수 · 스텝의 파일 수가 응답에 없어 목록의 `스텝 N개` · `파일 N개` 힌트를 뺐다.
>    필요해지면 `stepCount` · `fileCount` 를 백엔드에 요청한다.
> ℹ️ 다운로드 · 미리보기는 목록에 URL 이 없다 — 행에서 42 · 43번(`/file-versions/{id}/download` · `/preview`)을 부른다.

---

## 106. 프로젝트 휴지통 모아보기

| 항목          | 내용                                              |
| ------------- | ------------------------------------------------- |
| **Method**    | `GET`                                             |
| **Path**      | `/api/v1/projects/{projectId}/files/trash`        |
| **인증 필요** | ✅ (접근 권한 보유자)                             |
| **사용 위치** | `features/file/api.ts` → `getProjectTrashFiles()` |

블록 파일 목록(36번 `?deleted=true`)이 **블록 단위**인 것과 달리 **프로젝트 범위**다. 블록 삭제로 블록 목록에서 사라진 고아 파일도 여기서 보이고 복구 · 영구삭제 대상이 된다.

**응답 data — `files[]`**

| 필드                                           | 타입              | 설명                 |
| ---------------------------------------------- | ----------------- | -------------------- |
| `stepId` / `stepName`                          | `number`/`string` | 속한 스텝            |
| `blockId` / `blockTitle` / `blockDeleted`      | —                 | 105번과 동일         |
| `fileId` / `name` / `versionCount`             | —                 | 문서 정보            |
| `originalFileName` / `extension` / `sizeBytes` | —                 | 원본 정보            |
| `deletedAt`                                    | `string`          | 휴지통에 들어간 시각 |

| status | code                              | 화면 처리      |
| ------ | --------------------------------- | -------------- |
| 200    | —                                 | 없으면 빈 배열 |
| 403    | `FILE_ACCESS_PERMISSION_REQUIRED` | 접근 권한 없음 |
| 404    | `PROJECT_NOT_FOUND`               | 프로젝트 없음  |

> ℹ️ 휴지통 문서만 · presigned 미임베드(복구 · 영구삭제만 가능하다). 정렬은 `deletedAt` 내림차순.
> 🔄 **2026-08-16(D안)** — 블록 · 스텝 · 스테이지 삭제로 **자동 휴지통행한 파일도 여기 나타난다** (`blockDeleted: true`).

---

## 107. 프로젝트 이미지 모아보기

| 항목          | 내용                                           |
| ------------- | ---------------------------------------------- |
| **Method**    | `GET`                                          |
| **Path**      | `/api/v1/projects/{projectId}/images`          |
| **인증 필요** | ✅ (접근 권한 보유자)                          |
| **사용 위치** | `features/block/api.ts` → `getProjectImages()` |

**응답 data — `images[]`**

| 필드           | 타입     | 설명                    |
| -------------- | -------- | ----------------------- |
| `imgId`        | `number` | 이미지 ID               |
| `imgBlockId`   | `number` | 속한 블록 ID            |
| `originalName` | `string` | 원본 파일명             |
| `imageUrl`     | `string` | 저장소 이미지 URL       |
| `caption`      | `string` | 캡션 (없으면 빈 문자열) |
| `createdAt`    | `string` | `YYYY-MM-DDTHH:mm:ss`   |

> ⚠️ 66 · 71번과 달리 `orderIndex` 가 **없다** — 순서 표기는 화면이 하지 않는다. 스텝 이름도 없어 블록 단위로만 묶인다.

---

## 108. 프로젝트 단위 이슈 목록 조회

| 항목          | 내용                                           |
| ------------- | ---------------------------------------------- |
| **Method**    | `GET`                                          |
| **Path**      | `/api/v1/projects/{projectId}/issues`          |
| **인증 필요** | ✅ (프로젝트 참여자 · `VIEWER` 이상)           |
| **사용 위치** | `features/issue/api.ts` → `getProjectIssues()` |

삭제되지 않은 모든 Step 의 이슈를 **Step 별로 묶어** 반환한다. 이슈가 없는 Step 도 `issues: []` 로 포함되고, 삭제된 Step 은 응답에서 완전히 빠진다. **페이징이 없다.**

> ⚠️ `steps[].issues[]` 는 55번과 같은 모양이라 **`version` 도 함께 실린다** — 전체 일정 화면에서 곧바로 수정을 시작할 때 이 값을 쓴다. ([이슈 도메인 — 공통](#이슈-도메인--공통))

**응답 data**

| 필드       | 타입     | 설명                               |
| ---------- | -------- | ---------------------------------- |
| `progress` | `object` | 프로젝트 전체 진척도               |
| `steps`    | `array`  | Step 별 이슈 묶음 (sortOrder 정렬) |

**`progress` · `steps[]` 공통 진척도 필드**

| 필드                   | 타입             | 설명                           |
| ---------------------- | ---------------- | ------------------------------ |
| `totalIssueCount`      | `number`         | 전체 이슈 수                   |
| `doneIssueCount`       | `number`         | 완료(`DONE`) 수                |
| `inProgressIssueCount` | `number`         | 진행 중(`IN_PROGRESS`) 수      |
| `progressRate`         | `number \| null` | 완료율(%). 이슈가 0개면 `null` |

**`steps[]` 추가 필드** — `stepId` · `stepName` · `issues[]`
**`issues[]`** — 55번 목록 응답과 같은 모양 (`issueId` · `title` · `status` · `priority` · `dueDate` · `assignees[]` · `relatedBlocks[]`). `content` 는 없다.

| 화면 기능        | FE 처리 기준                                         |
| ---------------- | ---------------------------------------------------- |
| 아코디언 순서    | `steps` 배열 순서 (이미 `sortOrder` 정렬됨)          |
| Step 진척도 뱃지 | `steps[].doneIssueCount` / `steps[].totalIssueCount` |
| Step 완료율      | `steps[].progressRate` (`null` 이면 이슈 없음)       |
| 전체 진척도 바   | `progress.progressRate`                              |
| 시작 전(TODO) 수 | `total - done - inProgress` 로 **FE 가 계산**        |

> ℹ️ Step 자체가 하나도 없으면 `steps: []` 이고 `progress` 는 전부 0 (`progressRate` 는 `null`).

---

## 이미지 삭제 · 복구 — 공통

이미지도 문서와 같은 3단계(soft → 복구 → 영구)지만 **계약이 다르다.** 같은 화면(휴지통)에 붙이므로 차이를 여기 모아 둔다.

| 항목        | 문서 (103 · 104)                 | 이미지 (110 · 111)                           |
| ----------- | -------------------------------- | -------------------------------------------- |
| 대상        | 한 건 (`{fileId}` 경로)          | **다건** (`imgIds[]` 본문)                   |
| 복구        | `POST /files/{id}/restore`       | `PATCH /blocks/images/items/restore`         |
| 영구 삭제   | `POST .../permanent-deletion`    | `DELETE /blocks/images/items/hard`           |
| 확인 문자   | ✅ `영구 삭제` 서버 검증         | ❌ **없다** — 화면이 확인 모달로 막아야 한다 |
| 휴지통 조회 | `GET /projects/{id}/files/trash` | `GET /projects/{id}/images/trash`            |

> ⚠️ 이미지 영구 삭제는 **본문 있는 `DELETE`** 다. 문서 쪽(104번)은 "일부 프록시가 `DELETE` 본문을 버린다" 는 이유로 `POST` 를 쓰는데 이미지는 그러지 않는다 — **배포 환경에서 본문이 사라지면 400 이 난다.** 실동작 확인 필요.
> ⚠️ 이미지에는 확인 문자가 없어 오조작이 곧 영구 삭제다. 화면은 문서와 **같은 무게의 확인 모달**을 띄운다.
> ❗ 110번 명세 본문 표의 필드명이 `imagIds` 로 적혀 있으나 요청 예시 · 111번과 대조해 **`imgIds`** 로 연동했다. 백엔드 확인 필요.

---

## 109. 이미지 휴지통 조회

| 항목          | 내용                                                |
| ------------- | --------------------------------------------------- |
| **Method**    | `GET`                                               |
| **Path**      | `/api/v1/projects/{projectId}/images/trash`         |
| **인증 필요** | ✅ (접근 권한 보유자)                               |
| **사용 위치** | `features/block/api.ts` → `getProjectTrashImages()` |

**응답 data — `images[]`**

| 필드           | 타입     | 설명                    |
| -------------- | -------- | ----------------------- |
| `imgId`        | `number` | 이미지 ID               |
| `originalName` | `string` | 원본 파일명             |
| `imageUrl`     | `string` | 저장소 이미지 URL       |
| `caption`      | `string` | 캡션 (없으면 빈 문자열) |
| `deletedAt`    | `string` | 삭제 일시               |

> ⚠️ 107번(활성 목록)과 달리 **`imgBlockId` 가 없다** — 어느 블록에서 지워졌는지 알 수 없어, 휴지통 화면은 이미지를 블록으로 묶지 못하고 삭제 시각순 평면 목록으로만 보여준다.

---

## 110. 이미지 복구 (다건)

| 항목          | 내용                                                |
| ------------- | --------------------------------------------------- |
| **Method**    | `PATCH`                                             |
| **Path**      | `/api/v1/blocks/images/items/restore`               |
| **인증 필요** | ✅ (편집 권한 — **각 이미지가 속한 스텝별로** 확인) |
| **사용 위치** | `features/block/api.ts` → `restoreImages()`         |

**요청 body**

| 필드     | 타입       | 필수 | 설명             |
| -------- | ---------- | ---- | ---------------- |
| `imgIds` | `number[]` | ✅   | 복구할 이미지 ID |

**응답 data — `images[]`**

| 필드           | 타입     | 설명                           |
| -------------- | -------- | ------------------------------ |
| `imgBlockId`   | `number` | 복구된 블록                    |
| `imgId`        | `number` | 복구된 이미지                  |
| `originalName` | `string` | 원본 파일명                    |
| `orderIndex`   | `number` | **복구 후** 순서 (뒤에 붙는다) |

> ℹ️ 권한을 스텝별로 보므로, 여러 스텝의 이미지를 한 번에 보내면 일부만 복구될 수 있다 — 화면은 **응답의 `images[]` 를 기준으로** 목록에서 지운다 (보낸 목록 기준으로 지우면 안 된다).

---

## 111. 이미지 영구 삭제 (다건)

| 항목          | 내용                                                  |
| ------------- | ----------------------------------------------------- |
| **Method**    | `DELETE` (⚠️ **본문 있음**)                           |
| **Path**      | `/api/v1/blocks/images/items/hard`                    |
| **인증 필요** | ✅ (편집 권한)                                        |
| **사용 위치** | `features/block/api.ts` → `permanentlyDeleteImages()` |

**요청 body**

| 필드     | 타입       | 필수 | 설명                                    |
| -------- | ---------- | ---- | --------------------------------------- |
| `imgIds` | `number[]` | ✅   | 영구 삭제할 이미지 (휴지통에 있는 것만) |

**응답 data** — `null`

> ⚠️ **되돌릴 수 없다.** 확인 문자가 없어(문서 104번과 다름) 화면 확인 모달이 유일한 방어선이다.
> ⚠️ 응답이 `null` 이라 **몇 건이 지워졌는지 알 수 없다** — 화면은 보낸 목록을 지우고 곧바로 휴지통을 재조회한다.

---

## 스테이지 · 스텝 도메인 — 공통

`GET` 두 건(7 · 8번)만 있던 영역에 **쓰기 9종(112~120)** 이 붙었다. 공통 규칙만 여기 모은다.

### 낙관적 락 (2026-08-11 신설)

| API                       | `version` | `overwrite` | 409           |
| ------------------------- | --------- | ----------- | ------------- |
| 113 스테이지 수정         | ✅ 필수   | ✅ 있음     | 덮어쓰기 가능 |
| 116 스텝 수정             | ✅ 필수   | ✅ 있음     | 덮어쓰기 가능 |
| 119 스테이지 순서 변경    | ✅ 항목별 | ❌ **없음** | **전체 롤백** |
| 120 스텝 순서 변경        | ✅ 항목별 | ❌ **없음** | **전체 롤백** |
| 114 · 117 삭제 · 118 완료 | ❌        | ❌          | 없음 (멱등)   |

> ❗ **`version` 이 조회 응답(7 · 8번)에 아직 명시돼 있지 않다.** 수정 · 순서 변경은 이 값이 없으면 400 이다.
> 프론트는 `ProjectStage.version?` · `ProjectStep.version?` **선택 필드**로 받고, 값이 없으면 저장 버튼을 막고 재조회를 안내한다. 백엔드 확인 후 `?` 를 뗀다.
>
> ⚠️ 수정 응답의 `version` 은 **저장 후의 새 값**이다. 화면 상태를 갈아끼우지 않으면 다음 저장이 또 409 다.
> ⚠️ 순서 변경 2종은 **전체 최종 순서**를 보내야 한다. 일부만 보내면 나머지와 `sort_order` 가 겹친다.

### `version` 이 오르는 시점 (2026-08-11 확인)

| 대상 | 오르는 조건                         |
| ---- | ----------------------------------- |
| 스텝 | 자신의 `sort_order` · **이름** 변경 |

> ℹ️ 이름만 바뀌어도 오르므로, 화면이 **순서만 보고 상태 교체를 판단하면 안 된다** —
> 남이 이름을 고친 뒤 내가 순서를 저장하면 옛 `version` 이 실려 409 다.
> `StageManageModal` 은 그래서 초안 교체 지문에 `version` 을 포함한다(`syncPrint`).
>
> ⛔ 순서 변경 2종은 `overwrite` 가 없다. **409 를 받으면 재조회 말고는 출구가 없으므로**,
> 실패한 화면은 재조회 전까지 저장을 막아야 한다 (안 막으면 같은 요청이 영원히 409).

### 위치 · 순서의 단일 경로

- 스텝의 **소속 스테이지 · 정렬 순서**는 `120` 만 바꾼다. 스텝 수정(`116`)은 `stageId` 를 **받지 않는다** (2026-08-09 · `47a3866`).
- 스테이지 정렬 순서는 `119` 만 바꾼다. 스테이지 수정(`113`)은 이름만 바꾼다.

### 하위 정리 규칙

| 삭제 대상 | 하위 스텝 · 블록                                | 하위 이슈            |
| --------- | ----------------------------------------------- | -------------------- |
| 스테이지  | **함께 삭제되지 않는다** — `moveToStageId` 필수 | —                    |
| 스텝      | 블록은 `moveBlockIds` 로 고른 것만 살아남는다   | **무조건 함께 삭제** |

🏢 **회사 격리** (2026-08-11) — 다른 회사의 프로젝트 · 스테이지 · 스텝은 403 이 아니라 **404** 다.

---

## 112. 스테이지 생성

| 항목          | 내용                                        |
| ------------- | ------------------------------------------- |
| **Method**    | `POST`                                      |
| **Path**      | `/api/v1/projects/{projectId}/stages`       |
| **인증 필요** | ✅ (프로젝트 EDITOR)                        |
| **사용 위치** | `features/project/api.ts` → `createStage()` |

**요청 body**

| 필드        | 타입     | 필수 | 설명                               |
| ----------- | -------- | ---- | ---------------------------------- |
| `name`      | `string` | ✅   | 스테이지명 (최대 100자)            |
| `sortOrder` | `number` | —    | 미지정 시 `max+1` (화면은 안 보냄) |

**응답 data (201)** — `stageId` · `projectId` · `name` · `sortOrder`

---

## 113. 스테이지 수정

| 항목          | 내용                                        |
| ------------- | ------------------------------------------- |
| **Method**    | `PATCH`                                     |
| **Path**      | `/api/v1/stages/{stageId}`                  |
| **인증 필요** | ✅ (프로젝트 EDITOR)                        |
| **사용 위치** | `features/project/api.ts` → `updateStage()` |

**요청 body**

| 필드        | 타입      | 필수 | 설명                               |
| ----------- | --------- | ---- | ---------------------------------- |
| `name`      | `string`  | ✅   | 스테이지명 (최대 100자)            |
| `version`   | `number`  | ✅   | 목록에서 받은 값. 누락하면 400     |
| `overwrite` | `boolean` | —    | `true` 면 충돌을 무시하고 덮어쓴다 |

**응답 data** — `stageId` · `name` · `sortOrder` · `version`(**저장 후 새 값**)

> ⚠️ 409 `STAGE_VERSION_CONFLICT` — 화면은 조용히 삼키지 말고 **재조회 / 덮어쓰기**를 묻는다.
> ⛔ 순서는 이 API 로 못 바꾼다 — 119번 소관.

---

## 114. 스테이지 삭제

| 항목          | 내용                                        |
| ------------- | ------------------------------------------- |
| **Method**    | `DELETE`                                    |
| **Path**      | `/api/v1/stages/{stageId}`                  |
| **인증 필요** | ✅ (프로젝트 EDITOR)                        |
| **사용 위치** | `features/project/api.ts` → `deleteStage()` |

**쿼리 파라미터**

| 필드            | 타입     | 필수 | 설명                                    |
| --------------- | -------- | ---- | --------------------------------------- |
| `moveToStageId` | `number` | ✅   | 하위 스텝을 옮길 스테이지. `0` = 미소속 |

**응답 data** — `deletedStageId` · `movedStepCount` · `moveToStageId`(`null` 이면 미소속)

| 코드 | code                         | 설명                             |
| ---- | ---------------------------- | -------------------------------- |
| 400  | `STAGE_MOVE_TARGET_REQUIRED` | 이전 대상 미지정                 |
| 400  | `STAGE_MOVE_TARGET_INVALID`  | 다른 프로젝트이거나 자기 자신    |
| 403  | `PROJECT_EDIT_DENIED`        | 프로젝트 편집 권한 없음          |
| 404  | `STAGE_NOT_FOUND`            | 없음 · **다른 회사 것도 여기로** |

> ⛔ **스텝이 함께 삭제되지 않는다** (STG-003). 이전된 스텝의 **권한은 그대로 유지**된다.
> ⛔ 낙관적 락 대상이 아니다 — 두 번 눌러도 결과가 같다.

---

## 115. 스텝 생성

| 항목          | 내용                                       |
| ------------- | ------------------------------------------ |
| **Method**    | `POST`                                     |
| **Path**      | `/api/v1/projects/{projectId}/steps`       |
| **인증 필요** | ✅ (프로젝트 EDITOR)                       |
| **사용 위치** | `features/project/api.ts` → `createStep()` |

**요청 body**

| 필드          | 타입     | 필수 | 설명                             |
| ------------- | -------- | ---- | -------------------------------- |
| `name`        | `string` | ✅   | 스텝명 (**최대 200자**)          |
| `stageId`     | `number` | —    | 미지정 시 미소속(`null`)         |
| `startedOn`   | `string` | —    | `YYYY-MM-DD`                     |
| `endedOn`     | `string` | —    | `YYYY-MM-DD`                     |
| `ownerUserId` | `string` | —    | 책임자 **사번**. 작업자가 아니다 |

**응답 data (201)** — `stepId` · `projectId` · `stageId` · `name` · `status`(`NOT_STARTED`) · `sortOrder` · `startedOn` · `endedOn` · `owner` · `createdAt`

> ⛔ 템플릿 적용 · `stepType` 파라미터는 없다 (송부 스텝 폐기 · 2026-08-03).

---

## 116. 스텝 수정

| 항목          | 내용                                       |
| ------------- | ------------------------------------------ |
| **Method**    | `PATCH`                                    |
| **Path**      | `/api/v1/steps/{stepId}`                   |
| **인증 필요** | ✅ (**스텝** EDITOR — 프로젝트가 아니다)   |
| **사용 위치** | `features/project/api.ts` → `updateStep()` |

**요청 body**

| 필드          | 타입      | 필수 | 설명                              |
| ------------- | --------- | ---- | --------------------------------- |
| `name`        | `string`  | ✅   | 최대 200자. 빈 문자열 · 공백 불가 |
| `startedOn`   | `string`  | —    | `YYYY-MM-DD`                      |
| `endedOn`     | `string`  | —    | `YYYY-MM-DD`                      |
| `ownerUserId` | `string`  | —    | **생략하면 책임자가 해제된다**    |
| `version`     | `number`  | ✅   | 누락하면 400                      |
| `overwrite`   | `boolean` | —    | `true` 면 덮어쓴다                |

**응답 data** — `stepId` · `name` · `stageId`(**현재값 에코**) · `startedOn` · `endedOn` · `owner`(`owner.deleted` 포함) · `updatedAt` · `version`

> ⚠️ **전체 덮어쓰기다. 생략한 필드는 유지가 아니라 해제.** 화면은 폼 전체를 매번 보낸다.
> ⛔ `stageId` · `stepType` 은 받지 않는다 — 보내도 무시된다.
> 권한을 **스텝 기준**으로 본다 — 오버라이드로 이 스텝만 편집 가능한 사람이 있다.

---

## 117. 스텝 삭제

| 항목          | 내용                                       |
| ------------- | ------------------------------------------ |
| **Method**    | `DELETE`                                   |
| **Path**      | `/api/v1/steps/{stepId}`                   |
| **인증 필요** | ✅ (프로젝트 EDITOR)                       |
| **사용 위치** | `features/project/api.ts` → `deleteStep()` |

**쿼리 파라미터**

| 필드           | 타입       | 필수 | 설명                                     |
| -------------- | ---------- | ---- | ---------------------------------------- |
| `moveBlockIds` | `number[]` | —    | 살려서 옮길 블록. 생략하면 **전부 삭제** |
| `moveToStepId` | `number`   | △    | `moveBlockIds` 가 있으면 **필수**        |

**응답 data** — `deletedStepId` · `movedBlockCount` · `deletedBlockCount` · `deletedIssueCount`

| 코드 | code                         | 설명                                      |
| ---- | ---------------------------- | ----------------------------------------- |
| 400  | `BLOCK_MOVE_TARGET_REQUIRED` | `moveBlockIds` 만 있고 대상이 없음        |
| 400  | `BLOCK_MOVE_TARGET_INVALID`  | 다른 프로젝트이거나 삭제 대상 스텝 자신   |
| 403  | `STEP_EDIT_DENIED`           | NONE·VIEWER 오버라이드로 하위 정리가 막힘 |
| 404  | `BLOCK_NOT_FOUND`            | 이 스텝의 블록이 아닌 ID 가 섞임          |

> ⛔ **이슈는 선택지가 없다** — 무조건 함께 삭제된다 (STP-013).
> ⚠️ 옮긴 블록의 **이슈 연결은 끊긴다** (BLK-014 · INV-06).
> ⛔ 삭제 잠금은 폐기됐다 (2026-08-09) — 잠금 블록 409 는 더 이상 없다.
> ⚠️ 재무 연결 해제(BLK-013)는 미구현 — 입금 · 계산서가 붙은 블록도 그대로 삭제된다.

---

## 118. 스텝 완료 처리

| 항목          | 내용                                         |
| ------------- | -------------------------------------------- |
| **Method**    | `POST`                                       |
| **Path**      | `/api/v1/steps/{stepId}/complete`            |
| **인증 필요** | ✅ (스텝 EDITOR)                             |
| **사용 위치** | `features/project/api.ts` → `completeStep()` |

**요청 body**

| 필드              | 타입     | 필수 | 설명                                     |
| ----------------- | -------- | ---- | ---------------------------------------- |
| `openIssueAction` | `string` | ✅   | `KEEP`(그대로 두기) · `CLOSE`(함께 종료) |

**응답 data** — `stepId` · `status`(`DONE`) · `openIssueCount` · `openIssueAction` · `closedIssueCount` · `completedBy`(`deleted` 포함) · `completedAt`

| 코드 | code                         | 설명             |
| ---- | ---------------------------- | ---------------- |
| 400  | `OPEN_ISSUE_ACTION_REQUIRED` | 처리 방식 미지정 |
| 400  | `OPEN_ISSUE_ACTION_INVALID`  | 허용되지 않은 값 |

> **이슈가 미완료여도 완료할 수 있다** (STP-005). `KEEP` 이면 남은 이슈에 `완료된 스텝` 배지가 붙는다.
> ⚠️ **이미 완료된 스텝은 완료자 · 완료시각을 덮어쓰지 않는다** — 멱등이라 낙관적 락 대상이 아니다.
> 🗑️ 완료자가 삭제된 사원이어도 이름은 그대로 온다 (D-6) — `completedBy.deleted` 로 구분한다.

---

## 119. 스테이지 순서 변경

| 항목          | 내용                                             |
| ------------- | ------------------------------------------------ |
| **Method**    | `PATCH`                                          |
| **Path**      | `/api/v1/projects/{projectId}/stages/order`      |
| **인증 필요** | ✅ (프로젝트 EDITOR)                             |
| **사용 위치** | `features/project/api.ts` → `updateStageOrder()` |

**요청 body**

| 필드                 | 타입       | 필수 | 설명                    |
| -------------------- | ---------- | ---- | ----------------------- |
| `orders`             | `object[]` | ✅   | **재정렬 전체 목록**    |
| `orders[].stageId`   | `number`   | ✅   | 스테이지 ID             |
| `orders[].sortOrder` | `number`   | ✅   | 새 정렬 순서            |
| `orders[].version`   | `number`   | ✅   | 조회했을 때의 `version` |

**응답 data** — `stages[]` (`stageId` · `sortOrder` · `version`(**저장 후 새 값**))

> ⚠️ **낙관적 락을 항목마다 검사한다.** 하나라도 어긋나면 **요청 전체가 409 로 롤백**된다 — 부분 적용은 없다.
> ⚠️ `overwrite` 가 **없다.** 409 면 재조회해서 다시 끄는 수밖에 없다.
> ⚠️ **사이드바 전체의 최종 순서**를 보낸다. 일부만 보내면 보내지 않은 스테이지와 `sort_order` 가 겹친다.
> `sort_order` 만 갱신한다 — **하위 스텝은 건드리지 않는다** (STG-002).

**Status Code**

| 코드 | code                     | 설명                                               |
| ---- | ------------------------ | -------------------------------------------------- |
| 400  | `STAGE_ORDER_INVALID`    | 순서 목록이 비었거나 순서 값이 중복                |
| 400  | `STAGE_VERSION_REQUIRED` | 항목 중 `version` 이 빠진 것이 있음                |
| 401  | `AUTH_UNAUTHENTICATED`   | 세션 없음/만료                                     |
| 403  | `PROJECT_EDIT_DENIED`    | 프로젝트 편집 권한 없음                            |
| 404  | `STAGE_NOT_FOUND`        | 스테이지 없음 · **이 프로젝트 소속이 아닌 경우도** |
| 404  | `PROJECT_NOT_FOUND`      | 프로젝트 없음                                      |
| 409  | `STAGE_VERSION_CONFLICT` | 하나라도 먼저 수정됨 — **전체 롤백**               |

> 🏢 **회사 격리** (2026-08-11) — 다른 회사의 리소스는 404 다.

---

## 120. 스텝 순서 변경

| 항목          | 내용                                            |
| ------------- | ----------------------------------------------- |
| **Method**    | `PATCH`                                         |
| **Path**      | `/api/v1/projects/{projectId}/steps/order`      |
| **인증 필요** | ✅ (프로젝트 EDITOR)                            |
| **사용 위치** | `features/project/api.ts` → `updateStepOrder()` |

**요청 body**

| 필드                 | 타입             | 필수 | 설명                                    |
| -------------------- | ---------------- | ---- | --------------------------------------- |
| `orders`             | `object[]`       | ✅   | **보드 전체의 최종 배치**               |
| `orders[].stepId`    | `number`         | ✅   | 스텝 ID                                 |
| `orders[].stageId`   | `number \| null` | ✅   | 이동할 스테이지. **미소속은 `null`**    |
| `orders[].sortOrder` | `number`         | ✅   | 새 정렬 순서 — **프로젝트 단위 통번호** |
| `orders[].version`   | `number`         | ✅   | 조회했을 때의 `version`                 |

**응답 data** — `steps[]` (`stepId` · `stageId` · `sortOrder` · `version`(**저장 후 새 값**))

> ⚠️ **위치를 바꾸는 유일한 경로다** — 스텝 수정(116)은 `stageId` 를 받지 않는다.
> ⚠️ 항목별 낙관적 락 · 전체 롤백 · `overwrite` 없음 — 119번과 같다.
> ⚠️ **선행 스텝 완료를 검사하지 않는다** (STP-002).

**2026-08-11 백엔드 확인 3건** — 셋 다 빌드·타입체크에 안 걸리고 런타임 400/409 로만 드러난다.

| 항목                | 확답                                                                             |
| ------------------- | -------------------------------------------------------------------------------- |
| `sortOrder` 범위    | **프로젝트 단위 통번호.** 스테이지마다 1부터 다시 세지 않는다                    |
| 미소속 표현         | **`stageId: null`.** 스테이지 삭제(114)의 `moveToStageId=0` 과 **규약이 다르다** |
| 스텝 `version` 증가 | **`sort_order` 와 이름이 바뀔 때** 오른다                                        |

> ❗ **`sortOrder` 가 프로젝트 통번호라 스테이지 순서만 바꿔도 스텝 번호가 전부 밀린다.**
> 119번만 부르면 스텝 `sort_order` 가 옛 배열에 남아 다음 조회에서 순서가 어긋난다 —
> **단계를 끌었으면 120번도 함께 보내야 한다.** (`StageManageModal.toStepPlan`)
>
> ℹ️ 반대로 119번은 스텝을 건드리지 않으므로(`version` 은 스텝 자신의 `sort_order`·이름이 바뀔 때만 오른다)
> 119 → 120 을 잇달아 보내도 뒤엣것이 옛 `version` 으로 헛돌지 않는다.

---

## 121. 블록 스텝 이동

| 항목          | 내용                                          |
| ------------- | --------------------------------------------- |
| **Method**    | `PATCH`                                       |
| **Path**      | `/api/v1/blocks/{blockId}/step`               |
| **인증 필요** | ✅ (**출발 · 도착 양쪽 스텝의 EDITOR**)       |
| **사용 위치** | `features/block/api.ts` → `moveBlockToStep()` |

**요청 body**

| 필드        | 타입      | 필수 | 설명                               |
| ----------- | --------- | ---- | ---------------------------------- |
| `stepId`    | `number`  | ✅   | 같은 프로젝트의 **다른** 스텝      |
| `version`   | `number`  | ✅   | 조회에서 받은 값. 누락하면 400     |
| `overwrite` | `boolean` | —    | `true` 면 충돌을 무시하고 덮어쓴다 |

**응답 data** — `blockId` · `stepId` · `unlinkedIssueCount` · `version`(**저장 후 새 값**)

> ⚠️ **옮기면 이슈 연결이 끊긴다** (BLK-014 · INV-06) — 블록과 이슈는 같은 스텝이어야 한다.
> `unlinkedIssueCount` 가 **0 이 아니면 사용자에게 알려야 한다** (이슈 자체는 지워지지 않는다).
> ⚠️ 도착 스텝에 편집 권한이 없으면 403 `STEP_EDIT_DENIED` — 화면은 선택지 자체를 막는다.
> ℹ️ 배치 편집(드래그)은 **같은 스텝 안에서만** 자리를 바꾼다. 스텝을 넘는 이동은 드롭 대상이
> 화면에 없어 끌어서 할 수 없으므로 `⋯` 메뉴의 `스텝 이동` 으로 목적지를 고른다.

---

## 입찰 도메인 — 공통

수집된 입찰 공고를 조회하고 프로젝트로 전환하는 도메인. 사이드바 `BIDDING`(`/notices`) 화면이다.

| 항목     | 내용                                                    |
| -------- | ------------------------------------------------------- |
| 권한     | 조회는 입찰 `VIEWER` · `EDITOR`, 등록 · 전환은 `EDITOR` |
| 공통 403 | `BIDDING_ACCESS_PERMISSION_REQUIRED`                    |
| 공통 401 | `AUTH_UNAUTHENTICATED`                                  |
| 페이징   | 0-based (`page` · `size`), 기본 `0` / `20`              |
| 금액     | `BigDecimal` — JSON 은 숫자로 오지만 **자릿수가 크다**  |

### ⚠️ 경로가 명세서와 다르다

문서 초안은 `crawl-conditions` 였지만 **실제 배포 경로는 `collection-conditions`** 다.
공고 경로(`notices`)는 초안 그대로다.

### ⚠️ 상태와 전환 여부는 다른 축이다

| 필드           | 뜻                                                                                                |
| -------------- | ------------------------------------------------------------------------------------------------- |
| `noticeStatus` | 공고의 검토 상태 (`COLLECTED` · `DISMISSED`) — ⚠️ 초안의 `REGISTERED` 가 아니다 (2026-08-11 실측) |
| `projectId`    | 프로젝트 전환 여부 (`null` 이면 미전환)                                                           |

한 배지로 합치면 **제외된 공고가 전환된 것처럼** 보인다. 열을 나눠 그린다.

### ⚠️ 아직 없는 API

명세서·백엔드 테스트 가이드에는 있으나 **배포되지 않았다** (2026-08-11 스웨거 전수 확인).
화면에서 호출하지 않는다.

- `GET /bidding/collection-runs` — 실행 이력 **목록** (단건 조회만 있다)
- **요약 중단 · 취소** — 검토의 `abandon` 에 대응하는 API 가 요약엔 없다 (아래 참고)

> ⚠️ 변경사항 (2026-08-16 · 백엔드 소스 확인)
>
> `POST /bidding/notices/{noticeId}/projects` 는 **배포됐고 연동을 마쳤다** (2026-08-16 · `NoticeProjectConvertModal`).
> ✅ **실제 전환 1건 성공을 확인했다** (2026-08-16).
>
> | 항목 | 값 |
> | ---- | -- |
> | 요청 | `reviewId`(필수 · `COMPLETED` 검토) · `summaryId`(선택 · 확정 요약) · `name` · `description` · `businessCategoryId` · `startedOn` · `endedOn` · `memberIds` |
> | 응답 | `201` `{ projectId }` |
> | 409 | `PROJECT_BID_NOTICE_ALREADY_LINKED` · `BIDDING_REVIEW_NOT_COMPLETED` · `BIDDING_REVIEW_ALREADY_LINKED_TO_PROJECT` · `BIDDING_SUMMARY_NOT_CONFIRMED` · `BIDDING_SUMMARY_ALREADY_LINKED` |
>
> ⭐ **검토가 전환의 근거다** — 검토에서 내려받기에 성공한 공고 첨부가 정식 파일로 프로젝트에 귀속된다.
> 검토 모달의 "프로젝트로 생성하지 않으면 자동 삭제" 안내가 이것을 가리킨다.
> ℹ️ 화면은 `businessCategoryId` **하나**만 보낸다 — 직접 생성(138)의 `businessCategoryIds`(복수)와 다르다.
> ℹ️ `clientName` · `contractAmount` 는 이 API 에 **없다.** 전환 폼에 칸을 두지 않고 생성 후 프로젝트 설정에서 채운다.
> ℹ️ `memberIds` 는 받지만 화면에서 보내지 않는다 — 요청자는 서버가 편집 권한으로 등록하고, 나머지는 설정에서 검색해 넣는다.

### ⚠️ 변경사항 — 수집 조건 · 실행 (2026-08-15 백엔드)

| 항목 | 내용 |
| ---- | ---- |
| `lookbackPeriod` | 수집 조건에 추가. `ONE_WEEK`(7) · `TWO_WEEKS`(14) · `ONE_MONTH`(30). **선택 필드**이고 생략하면 `ONE_WEEK` |
| 수동 실행 `startedAt` · `endedAt` | 실행 요청에 넣으면 그 구간을 우선 조회 (최대 31일). **미연동** — 백필 · QA 용이라 화면에 두지 않았다 |
| `collectionStartedAt` · `collectionEndedAt` | 실행 결과 응답에 추가. **실제로 훑은 구간**이라 0건일 때 원인 확인의 첫 단서다 |

> ⚠️ 조건 수정(`PATCH`)은 **통째로 교체**라 `lookbackPeriod` 도 함께 실어야 한다 —
> 빠뜨리면 활성 토글 한 번에 서버 기본값으로 되돌아간다 (`toUpdateRequest`).
> ⚠️ 직접 등록 공고의 `sourceUrl` 은 **선택 입력**이다. 화면 정책으로 필수로 잡고 있었으나 2026-08-14 에 풀었다.

> ⚠️ 변경사항 (2026-08-14 · `/v3/api-docs` 전수 확인)
>
> - `/bidding/summaries/*` · `/bidding/reviews/*` 는 **배포되어 연동을 마쳤다** (아래 표).
> - `PATCH /bidding/notices/{noticeId}/dismiss` · `/restore` 도 **배포됐다** — 목록에서 뺀다 (미연동).

> ⚠️ 백엔드 테스트 가이드가 **배포본보다 앞서 있다.** 가이드에 있다고 존재하는 API 가 아니다 —
> 스웨거에 뜨는 것만 호출한다.

### 배포된 입찰 API 전체 (2026-08-11 스웨거 실측)

| 메서드  | 경로                                                | 문서                                                                             |
| ------- | --------------------------------------------------- | -------------------------------------------------------------------------------- |
| `GET`   | `/bidding/notices`                                  | [122](#122-입찰-공고-목록-조회)                                                  |
| `GET`   | `/bidding/notices/{noticeId}`                       | [123](#123-입찰-공고-상세-조회)                                                  |
| `POST`  | `/bidding/notices`                                  | 공고 직접 등록 (미연동)                                                          |
| `PATCH` | `/bidding/notices/{noticeId}`                       | 직접 등록 공고 수정 — 수집 공고는 `409 BIDDING_NOTICE_EDIT_NOT_ALLOWED` (미연동) |
| `GET`   | `/bidding/collection-conditions`                    | 아래 `수집 조건`                                                                 |
| `POST`  | `/bidding/collection-conditions`                    | 아래 `수집 조건`                                                                 |
| `PATCH` | `/bidding/collection-conditions/{conditionId}`      | 아래 `수집 조건`                                                                 |
| `POST`  | `/bidding/collection-conditions/{conditionId}/runs` | 아래 `수집 실행`                                                                 |
| `GET`   | `/bidding/collection-runs/{runId}`                  | 아래 `수집 실행`                                                                 |

**AI 요약 · AI 문서 검토** (2026-08-14 스웨거 실측 · 연동 완료)

| 메서드  | 경로                                          | 설명                                                            |
| ------- | --------------------------------------------- | --------------------------------------------------------------- |
| `POST`  | `/bidding/notices/{noticeId}/summaries`        | AI 요약 요청 — **202**, `summaryId` 만 온다                     |
| `GET`   | `/bidding/notices/{noticeId}/summaries`        | 공고별 요약 이력 (`latestMySummaryId` 포함)                     |
| `GET`   | `/bidding/summaries/{summaryId}`               | 요약 단건 — **폴링 대상**                                       |
| `PATCH` | `/bidding/summaries/{summaryId}`               | 여섯 칸 수정 — 확정 후엔 `BIDDING_SUMMARY_NOT_EDITABLE`         |
| `PATCH` | `/bidding/summaries/{summaryId}/confirm`       | 요약 확정 (되돌릴 수 없다)                                      |
| `GET`   | `/bidding/notices/{noticeId}/review-sources`   | 검토에 고를 **공고 첨부** 목록 (`supported` 로 가능 여부 표시)  |
| `POST`  | `/bidding/notices/{noticeId}/reviews`          | AI 문서 검토 요청 — **202**                                     |
| `GET`   | `/bidding/notices/{noticeId}/reviews`          | 공고별 검토 이력 (최대 20건)                                    |
| `GET`   | `/bidding/reviews/{reviewId}`                  | 검토 단건 — **폴링 대상** (결과 · 근거 인용 포함)               |
| `PATCH` | `/bidding/reviews/{reviewId}/abandon`          | 아래 `검토 종료`                                                |

> ⚠️ 요약과 검토는 **다른 기능**이다 — 검토는 공고 첨부와 사내 문서를 비교하고 결과에 근거가
> 붙는다. 서버 워커도 갈린다 (`bid_notice_summary_worker` · `bid_review_worker`).
>
> ⚠️ **요약에는 검토의 `abandon` 에 해당하는 API 가 없다** (2026-08-14 스웨거 전수 확인).
> 진행 중인 요약은 프론트에서 끝낼 수 없어, 화면은 **잠금 해제(`멈추기`)** 까지만 한다.
> 그 뒤 새로 요청하면 `409 BIDDING_SUMMARY_ALREADY_PROCESSING` 으로 막힌다.

### 검토 종료 — `PATCH /bidding/reviews/{reviewId}/abandon`

프로젝트로 전환하지 않은 검토를 종료하고 임시파일 정리를 **즉시** 요청한다.

```jsonc
// 200
{ "reviewId": 71, "reviewStatus": "ABANDONED", "abandonedAt": "2026-08-14T06:21:26.552Z" }
```

| 코드  | 에러                                                             |
| ----- | ---------------------------------------------------------------- |
| `403` | `BIDDING_ACCESS_PERMISSION_REQUIRED` · `BIDDING_REVIEW_ACCESS_DENIED` |
| `404` | `BIDDING_REVIEW_NOT_FOUND`                                       |
| `409` | `BIDDING_REVIEW_NOT_ABANDONABLE` — 종료할 수 없는 단계           |

> ⭐ 화면은 이걸 **진행 중 검토의 취소**로 쓴다. 워커가 재시도하는 동안 상태는 계속
> `PENDING` 이라 멈춘 것과 구분되지 않는데, 종료하지 않으면 새 요청이
> `BIDDING_REVIEW_ALREADY_PROCESSING` 으로 막혀 기다리는 것 말곤 할 게 없다.
>
> ⚠️ **요약에는 대응 API 가 없다** — 진행 중인 요약은 프론트에서 끝낼 방법이 없다.

### 수집 조건 — `GET /bidding/collection-conditions`

현재 회사의 삭제되지 않은 조건을 최신 등록 순으로 준다. 파라미터가 없고, **페이징도 없다** —
`data.content` 만 있고 `totalElements` · `page` 는 오지 않는다 (공고 목록과 다르다).

```jsonc
{
  "conditionId": 1,
  "sourceCode": "NARA",
  "sourceName": "나라장터",
  "conditionName": "수도권 스마트시티 공사·용역",
  "noticeTypes": ["CONSTRUCTION", "SERVICE"],
  "filters": {
    "keywords": ["스마트시티", "통합관제"],
    "regionCodes": ["11", "41"], // 행정구역 코드 2자리
    "industryCodes": ["6202"],
    "minimumEstimatedPrice": 100000000,
    "maximumEstimatedPrice": 1000000000,
    "excludeClosed": true,
    "internationalBidType": "DOMESTIC",
  },
  "isActive": true,
  "autoCollectionEnabled": false,
  "scheduleType": null, // 자동 수집이 꺼져 있으면 스케줄 4개가 모두 null
  "scheduledTime": null,
  "timezone": null,
  "nextRunAt": null,
  "lastScheduledAt": null,
  "lastSuccessAt": null, // 한 번도 성공하지 않았으면 null
  "lastCollectedCount": null,
  "createdAt": "2026-08-11T11:34:03",
  "updatedAt": null,
}
```

등록(`POST`) · 수정(`PATCH`) 은 거의 같은 본문을 받지만 **`sourceCode` 는 등록에만 있다** —
수집처는 나중에 바꿀 수 없다 (스웨거 요청 스키마 실측).
⚠️ `noticeTypes` · `filters` · 자동 수집 설정은 **부분 수정이 아니라 통째로 교체**된다.

### ⚠️ `filters.industryCodes` 는 사업 카테고리다

우리 `businessCategories`(15~18) 와 **같은 축**이다 (2026-08-11 확인). 별도 산업분류가 아니다.

| 쓰는 곳             | 필드                 | 담는 값                                |
| ------------------- | -------------------- | -------------------------------------- |
| 수집 조건 `filters` | `industryCodes`      | 카테고리의 **`code`(업무코드) 문자열** |
| 공고 목록 필터      | `businessCategoryId` | 카테고리의 **`categoryId`(숫자)**      |

같은 셀렉트를 써도 **보내는 값이 다르다.** 또 `code` 는 선택 입력이라 `null` 인 카테고리가
있으므로 수집 조건 셀렉트에서는 그 항목을 걸러낸다 (조건에 담을 값이 없다).

| 필드            | 요청                                                 | 응답                                                                |
| --------------- | ---------------------------------------------------- | ------------------------------------------------------------------- |
| `scheduledTime` | `"09:00"` (`HH:mm`)                                  | `"09:00:00"` (`HH:mm:ss`) — **포맷이 다르다**                       |
| `scheduleType`  | `DAILY` · `WEEKDAYS` (실측된 값. enum 전체는 미확인) | 같음                                                                |
| `nextRunAt`     | 보내지 않는다                                        | **서버가 계산해서 준다** (`autoCollectionEnabled: false` 면 `null`) |

⚠️ `scheduledTime` 을 응답값(`"09:00:00"`) 그대로 되돌려 보내면 안 된다 —
수정 모달은 조회값을 `HH:mm` 으로 잘라서 보낸다.

**응답 코드** (스웨거 실측)

| 코드  | 등록 · 수정                                                                                                               | 수동 수집                                   | 실행 결과 조회                           |
| ----- | ------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------- | ---------------------------------------- |
| `400` | `BIDDING_INVALID_COLLECTION_CONDITION` · `BIDDING_COLLECTION_QUERY_LIMIT_EXCEEDED` · `BIDDING_UNSUPPORTED_SOURCE`(등록만) | `BIDDING_INACTIVE_COLLECTION_CONDITION`     | `BIDDING_INVALID_COLLECTION_RUN_REQUEST` |
| `404` | `BIDDING_COLLECTION_CONDITION_NOT_FOUND`                                                                                  | 같음                                        | `BIDDING_COLLECTION_RUN_NOT_FOUND`       |
| `409` | —                                                                                                                         | `BIDDING_COLLECTION_RUN_ALREADY_PROCESSING` | —                                        |

⚠️ **비활성(`isActive: false`) 조건은 수동 수집이 400 이다.** 실행 버튼을 막아야 한다.
⚠️ **409 는 이미 돌고 있다는 뜻**이라 오류로 보여줄 일이 아니다 — 진행 중 상태로 바꿔 안내한다.

### 수집 실행 — `POST .../runs` · `GET /bidding/collection-runs/{runId}`

실행은 **비동기다.** `202` 로 접수만 되고 결과는 따로 받아야 한다.

```jsonc
// POST .../{conditionId}/runs → 202
{ "runId": 2, "runStatus": "PENDING", "requestedAt": "2026-08-11T12:40:57.8802195" }

// GET /bidding/collection-runs/{runId} → 200
{
  "runId": 2,
  "conditionId": 1,
  "triggerType": "MANUAL",       // 자동 수집은 SCHEDULED
  "runStatus": "FAILED",         // PENDING → PROCESSING → COMPLETED | FAILED
  "collectedCount": 0,
  "insertedCount": 0,
  "updatedCount": 0,
  "skippedCount": 0,
  "errorMessage": "all_collection_tasks_failed",
  "startedAt": "2026-08-11T12:40:58",
  "finishedAt": "2026-08-11T12:41:04"
}
```

⚠️ **`COMPLETED` + `collectedCount: 0` 과 `FAILED` 는 다른 상황이다.**
전자는 조건에 맞는 공고가 없는 정상, 후자는 수집 작업 자체가 터진 것이다.

> ❗ **2026-08-11 현재 수집으로 공고가 들어오지 않는다.**
>
> | 실행                               | 결과                                           |
> | ---------------------------------- | ---------------------------------------------- |
> | `runId` 1 · 2 (`conditionId=1`)    | `FAILED` · `all_collection_tasks_failed` (6초) |
> | `conditionId=3` 15:26              | **성공했지만 `lastCollectedCount: 0`**         |
> | `runId` 16 (`conditionId=2`) 16:39 | `FAILED` · `all_collection_tasks_failed` (6초) |
>
> ✅ **2026-08-11 저녁 해소.** 조건 등록 → 수동 수집 → 공고 목록 반영까지 정상 동작하고,
> 나라장터 실공고가 다수 수집됐다. 위 실패 기록은 그 전 상황이라 **참고용으로만** 둔다.
> 조건이 좁으면 여전히 `COMPLETED` + 0건이 나올 수 있는데, 그건 실패가 아니다.

### 화면이 지켜야 할 호출 순서

수동 수집은 **한 번의 호출로 끝나지 않는다.** 조건을 먼저 확보해야 실행할 대상이 정해지고,
실행은 비동기라 결과를 따로 물어야 한다.

```
GET  /bidding/collection-conditions            ← 조건 확보 (실행 버튼의 대상)
POST /bidding/collection-conditions/{id}/runs  ← 202, runId 만 받는다
GET  /bidding/collection-runs/{runId}          ← COMPLETED | FAILED 까지 폴링
```

⚠️ 조건이 하나도 없으면 수동 수집을 **시작할 수 없다** — 화면은 조건 등록으로 유도해야 한다.
⚠️ 실행 이력 **목록** API 가 없다. 화면을 떠나면 `runId` 를 잃으므로 진행 상태를 되살릴 수 없다.

### 공고 직접 등록 — `POST /bidding/notices` (미연동)

```jsonc
{
  "noticeName": "교통정보 시스템 유지보수 용역",
  "noticeType": "SERVICE", // CONSTRUCTION | SERVICE | ...
  "noticeAgency": "경기도", // 공고 기관
  "demandAgency": "경기도 교통정보과", // 수요 기관
  "internationalBidType": "DOMESTIC",
  "announcedAt": "2026-08-11T09:00:00", // 일시는 모두 초까지, 오프셋 없음
  "bidStartAt": "2026-08-12T09:00:00",
  "bidDeadlineAt": "2026-08-25T18:00:00",
  "openingAt": "2026-08-26T10:00:00",
  "baseAmount": 180000000,
  "estimatedAmount": 200000000,
  "bidMethod": "전자입찰",
  "contractMethod": "협상에 의한 계약",
  "participationQualificationText": "관련 사업 수행 실적 보유 업체",
  "regionLimitText": "경기도",
  "businessLimitText": "소프트웨어사업자",
  "jointContractAllowed": false,
  "jointContractText": null, // 공동수급 불가면 null
  "evaluationMethod": "기술·가격 종합평가",
  "sourceUrl": "https://example.org/notices/test-001",
  "attachments": [
    {
      "fileName": "공고문.pdf",
      "sourceUrl": "https://example.org/files/notice.pdf",
    },
  ],
}
```

⚠️ 첨부는 **파일 업로드가 아니라 URL 등록**이다 (`files` 도메인과 무관). 응답은 `noticeId`.

### 직접 등록 공고 수정 — `PATCH /bidding/notices/{noticeId}` (미연동)

보낸 필드만 바뀌는 부분 수정이다. 단 **`attachments` 는 예외로 통째로 교체**된다 —
1개만 보내면 기존 첨부가 전부 사라지고 그 1개만 남는다.

```jsonc
{
  "noticeName": "교통정보 시스템 유지보수 및 고도화 용역",
  "bidDeadlineAt": "2026-08-27T18:00:00",
  "estimatedAmount": 220000000,
  "attachments": [
    {
      "fileName": "수정 공고문.pdf",
      "sourceUrl": "https://example.org/files/notice-v2.pdf",
    },
  ],
}
```

⚠️ 나라장터 **수집 공고를 수정하면 `409 BIDDING_NOTICE_EDIT_NOT_ALLOWED`** 다.
직접 등록 건에만 수정 버튼을 노출한다 (`collectionSource` 로 판단).

---

## 122. 입찰 공고 목록 조회

| 항목          | 내용                                       |
| ------------- | ------------------------------------------ |
| **Method**    | `GET`                                      |
| **Path**      | `/api/v1/bidding/notices`                  |
| **인증 필요** | ✅ (입찰 `VIEWER` · `EDITOR`)              |
| **사용 위치** | `features/bidding/api.ts` → `getNotices()` |

**요청 쿼리** (전부 선택)

| 필드                 | 타입      | 설명                              |
| -------------------- | --------- | --------------------------------- |
| `startDate`          | `string`  | 공고일 시작 (`yyyy-MM-dd`)        |
| `endDate`            | `string`  | 공고일 종료 (`yyyy-MM-dd`)        |
| `noticeAgency`       | `string`  | 발주처 검색                       |
| `businessCategoryId` | `number`  | 사업 카테고리 ID (**단일**)       |
| `region`             | `string`  | 지역 제한 검색                    |
| `deadlineSoon`       | `boolean` | 마감 임박만                       |
| `keyword`            | `string`  | 공고명 검색                       |
| `noticeStatus`       | `string`  | 공고 상태                         |
| `sort`               | `string`  | 정렬 enum · 기본 `ANNOUNCED_DESC` |
| `page` / `size`      | `number`  | 0-based · 기본 `0` / `20`         |

> ⚠️ **`sort` 는 Spring Pageable 규약이 아니다.** `bidDeadlineAt,asc` 처럼 보내면 400 이다.
> 확인된 기본값은 `ANNOUNCED_DESC` 이고, 화면은 `ANNOUNCED_DESC` · `ANNOUNCED_ASC` · `DEADLINE_ASC` · `DEADLINE_DESC` 를 쓴다 (뒤 3개는 **추정** — 백엔드 확인 대기).

**응답 data**

| 필드                             | 타입             | 설명                           |
| -------------------------------- | ---------------- | ------------------------------ |
| `content[].noticeId`             | `number`         | 공고 ID                        |
| `content[].noticeName`           | `string`         | 공고명                         |
| `content[].noticeAgency`         | `string`         | 발주처                         |
| `content[].businessCategoryId`   | `number \| null` | 사업 카테고리 ID               |
| `content[].businessCategoryName` | `string \| null` | 사업 카테고리명                |
| `content[].baseAmount`           | `number \| null` | 기초금액                       |
| `content[].estimatedAmount`      | `number \| null` | 추정가격                       |
| `content[].announcedAt`          | `string \| null` | 공고일                         |
| `content[].bidDeadlineAt`        | `string \| null` | 투찰 마감 일시                 |
| `content[].dDay`                 | `number \| null` | 마감까지 남은 일수 (서버 계산) |
| `content[].noticeStatus`         | `string`         | `COLLECTED` · `DISMISSED`      |
| `content[].projectId`            | `number \| null` | 전환된 프로젝트 ID             |
| `page` / `size`                  | `number`         | 현재 페이지 · 크기             |
| `totalElements` / `totalPages`   | `number`         | 전체 건수 · 페이지 수          |

**화면 표시 규칙**

| 조건                 | 표기                   |
| -------------------- | ---------------------- |
| `dDay > 0`           | `D-3`                  |
| `dDay = 0`           | `D-Day`                |
| `dDay < 0`           | `마감`                 |
| `projectId === null` | `프로젝트로 생성` 버튼 |
| `projectId` 존재     | `프로젝트 보기` 링크   |

| status | code                                 | 화면 처리        |
| ------ | ------------------------------------ | ---------------- |
| 400    | `BIDDING_INVALID_NOTICE_QUERY`       | 검색 조건 오류   |
| 401    | `AUTH_UNAUTHENTICATED`               | 전역 처리        |
| 403    | `BIDDING_ACCESS_PERMISSION_REQUIRED` | 접근 가드가 처리 |

> ⚠️ `dDay` 는 DB 값이 아니라 `bidDeadlineAt` 기준 **서버 계산값**이다. 프론트에서 다시 계산하지 않는다 (기준 시각이 어긋난다).

---

## 123. 입찰 공고 상세 조회

| 항목          | 내용                                            |
| ------------- | ----------------------------------------------- |
| **Method**    | `GET`                                           |
| **Path**      | `/api/v1/bidding/notices/{noticeId}`            |
| **인증 필요** | ✅ (입찰 `VIEWER` · `EDITOR`)                   |
| **사용 위치** | `features/bidding/api.ts` → `getNoticeDetail()` |

**응답 data — 기본**

| 필드                        | 타입             | 설명                                       |
| --------------------------- | ---------------- | ------------------------------------------ |
| `noticeId`                  | `number`         | 공고 ID                                    |
| `externalId`                | `string \| null` | 외부 공고 식별자                           |
| `noticeOrder`               | `string \| null` | 공고 차수 (빈 문자열 가능)                 |
| `noticeName`                | `string`         | 공고명                                     |
| `noticeType`                | `string \| null` | 공고 유형 (`CONSTRUCTION` · `SERVICE` …)   |
| `externalNoticeStatus`      | `string \| null` | 수집처 원문 상태 (우리 상태와 **다른 축**) |
| `noticeAgency`              | `string`         | 공고기관 · 발주처                          |
| `demandAgency`              | `string \| null` | 수요기관                                   |
| `noticeStatus`              | `string`         | 공고 상태                                  |
| `dismissReason`             | `string \| null` | 제외 사유                                  |
| `projectId`                 | `number \| null` | 연결된 프로젝트 ID                         |
| `sourceCode` / `sourceName` | `string \| null` | 수집처 (예: `NARA` / `나라장터`)           |

**응답 data — 일정**

`announcedAt` · `bidStartAt` · `questionDeadlineAt` · `applicationDeadlineAt` · `bidDeadlineAt` · `openingAt` (전부 `string | null`), `dDay` (`number | null`)

**응답 data — 금액**

`baseAmount` · `estimatedAmount` (`number | null`), `priceRangeText` · `minimumBidRateText` (`string | null`, 원문 그대로)

**응답 data — 계약 · 제한**

`participationQualificationText` · `regionLimitText` · `businessLimitText` · `jointContractText` · `contractMethod` · `evaluationMethod` · `sourceUrl` (`string | null`), `jointContractAllowed` (`boolean | null`), `hasAttachment` (`boolean`)

**응답 data — 첨부**

| 필드                            | 타입             | 설명                 |
| ------------------------------- | ---------------- | -------------------- |
| `attachments[].attachmentOrder` | `number`         | 표시 순서            |
| `attachments[].fileName`        | `string`         | 파일명               |
| `attachments[].sourceUrl`       | `string \| null` | **원문 사이트 링크** |

| status | code                                 | 화면 처리        |
| ------ | ------------------------------------ | ---------------- |
| 400    | `BIDDING_INVALID_NOTICE_QUERY`       | 조회 조건 오류   |
| 401    | `AUTH_UNAUTHENTICATED`               | 전역 처리        |
| 403    | `BIDDING_ACCESS_PERMISSION_REQUIRED` | 접근 가드가 처리 |
| 404    | `BIDDING_NOTICE_NOT_FOUND`           | 없는 공고 화면   |

> ⚠️ **참여사(`participants`) 는 응답에 없다** — 초안 명세에는 있었으나 실제로는 오지 않는다. 참여사 표를 만들지 않는다.
> ⚠️ 반대로 **첨부 목록(`attachments`) 은 온다** — 초안에는 `hasAttachment` 뿐이었다. 다만 **우리 저장소 파일이 아니라 원문 사이트 링크**라 다운로드 API 를 부르지 않고 새 탭으로 연다.

---

## 124. 스텝 상세 조회

| 항목          | 내용                                 |
| ------------- | ------------------------------------ |
| **Method**    | `GET`                                |
| **Path**      | `/api/v1/steps/{stepId}`             |
| **인증 필요** | ✅ (스텝 접근 권한)                  |
| **사용 위치** | ❌ **미연동**                        |
| **요구사항**  | STP-003 · STP-004 · STP-012 · INV-04 |

**Response (200 OK)**

```ts
data: {
  stepId: number;
  projectId: number;          // NOT NULL
  stageId: number | null;     // 미배정 가능
  name: string;
  status: 'NOT_STARTED' | 'IN_PROGRESS' | 'DONE';
  startedOn: string;          // '2026-08-01'
  endedOn: string;            // '2026-08-10'
  owner: { userId: string; name: string; deleted: boolean } | null;  // 책임자 — 작업자가 아니다
  totalIssueCount: number;
  doneIssueCount: number;
  inProgressIssueCount: number;   // 3색 진행바용
  progressRate?: number;          // 이슈 0개면 응답에 없다 (INV-04)
  completedBy: { userId: string; name: string; deleted: boolean } | null;
  completedAt: string | null;
  myPermission: 'VIEWER' | 'EDITOR';
  version: number;                // 낙관적 락 버전
}
```

> ℹ️ **스텝 목록(8번)과 필드가 거의 같고, `projectId` · `completedBy` · `completedAt` · `version` 이 더 온다.** 목록으로 이미 그릴 수 있어 화면은 아직 이 API 를 부르지 않는다 — 스텝 단독 진입(딥링크)이나 목록 없이 `version` 만 다시 받고 싶을 때 쓸 자리다.
> ⚠️ `owner` 는 **책임자**다. 작업자가 아니다.
> 🗑️ **삭제된 사원도 이름은 그대로 내려온다** (D-6 · 2026-08-11) — `deleted: true` 는 배지로 표시하고 재지정을 유도한다. 퇴사(`resigned`)와는 별개 상태다.
> ⚠️ `version` 은 화면에 그리는 값이 아니라 **스텝 수정(116) · 완료(118) · 순서 변경(120)에 실어 보낼 값**이다.

**Status Code** — 200 · 401 `AUTH_UNAUTHENTICATED` · 403 `STEP_ACCESS_DENIED`(`NONE` 권한) · 404 `STEP_NOT_FOUND`(**다른 회사의 스텝도 여기로**)

---

## 프로젝트 참여자 · 설정 도메인 — 공통

| 항목            | 내용                                                                                                  |
| --------------- | ----------------------------------------------------------------------------------------------------- |
| **쓰기 권한**   | 전부 **프로젝트 `EDITOR`** — `VIEWER` 는 403 `PROJECT_EDIT_DENIED`                                     |
| **권한 등급**   | `VIEWER` · `EDITOR` **2값**. ⛔ `NONE` · `MANAGER` 는 폐기 (2026-08-06)                                |
| **자기 자신**   | ⛔ **권한 변경 · 제거 불가** — 403 `MEMBER_SELF_EDIT_DENIED` (PRJ-011 · INV-10). 프론트도 함께 막는다 |
| **낙관적 락**   | 프로젝트 수정(129) · 상태 변경(130) **둘만**. 종결(131) · 참여자 · 카테고리는 대상이 아니다           |
| **회사 격리**   | 다른 회사의 프로젝트 · 사원 · 카테고리는 403 이 아니라 **404** (2026-08-11)                            |

> ⛔ **`NONE` 폐기의 뜻** — 참여하면 보거나 편집한다. 차단하고 싶으면 **참여자 제거(127)** 를 쓴다. `NONE` 을 보내면 400 `MEMBER_PERMISSION_INVALID` 다.
> ⚠️ **권한 판정 체인은 프로젝트 참여자 → 스텝 오버라이드 2단이다.** 스테이지 기본값(128)은 **판정에 쓰이지 않는다.**

---

## 125. 참여자 추가

| 항목          | 값                                                     |
| ------------- | ------------------------------------------------------ |
| **Method**    | `POST`                                                 |
| **Path**      | `/api/v1/projects/{projectId}/members`                 |
| **권한**      | 프로젝트 `EDITOR`                                      |
| **요구사항**  | PRJ-009 · PRJ-010 · INV-07                             |
| **사용 위치** | `src/features/project/api.ts` → `addProjectMember()`   |

**Request Body**

```ts
{
  userId: string;                    // 추가할 사원 사번 — **한 명씩**
  permission: 'VIEWER' | 'EDITOR';   // NONE 폐기
}
```

**Response (201 Created)**

```ts
data: { memberId: number; userId: string; name: string; permission: 'VIEWER' | 'EDITOR' }
```

> ⛔ **팀 · 부서 일괄 추가 파라미터를 만들지 않는다** (PRJ-009 · INV-07). 여러 명을 넣을 때도 한 명씩 호출한다.
> 🗑️ **삭제된 사원은 추가할 수 없다** (D-6) — 조회(45)에는 `deleted: true` 로 남아 보이지만 쓰기 검증은 `deleted_at IS NULL` 만 통과시킨다. 사원 선택 UI 가 후보에서 빼야 한다.

**Status Code** — 201 · 400 `MEMBER_PERMISSION_INVALID` · 401 `AUTH_UNAUTHENTICATED` · 403 `PROJECT_EDIT_DENIED` · 404 `PROJECT_NOT_FOUND` · 404 `USER_NOT_FOUND` · 409 `MEMBER_ALREADY_EXISTS`

## 126. 참여자 권한 변경

| 항목          | 값                                                            |
| ------------- | ------------------------------------------------------------- |
| **Method**    | `PATCH`                                                       |
| **Path**      | `/api/v1/projects/{projectId}/members/{memberId}`              |
| **권한**      | 프로젝트 `EDITOR`                                             |
| **요구사항**  | PRJ-010 · PRJ-011 · PRJ-012 · INV-10                          |
| **사용 위치** | `src/features/project/api.ts` → `updateProjectMemberPermission()` |

**Request Body** — `{ permission: 'VIEWER' | 'EDITOR' }`

**Response (200 OK)** — `data: { memberId, userId, permission }`

> ⛔ **자기 자신의 권한 행은 수정할 수 없다.** `EDITOR` 여도 403 `MEMBER_SELF_EDIT_DENIED` 다 — 백엔드가 막지만 **프론트에서도 미리 막는다** (내 행의 권한 셀렉트를 비활성).
> ⛔ `NONE` 을 보내면 400 이다. 차단은 제거(127)로 표현한다.

**Status Code** — 200 · 400 `MEMBER_PERMISSION_INVALID` · 401 · 403 `MEMBER_SELF_EDIT_DENIED` · 403 `PROJECT_EDIT_DENIED` · 404 `MEMBER_NOT_FOUND`

## 127. 참여자 제거

| 항목          | 값                                                       |
| ------------- | -------------------------------------------------------- |
| **Method**    | `DELETE`                                                 |
| **Path**      | `/api/v1/projects/{projectId}/members/{memberId}`         |
| **권한**      | 프로젝트 `EDITOR`                                        |
| **요구사항**  | USC-MEM-007                                              |
| **사용 위치** | `src/features/project/api.ts` → `removeProjectMember()`  |

응답 `data` 는 `null` 이다.

> ⛔ **자기 자신은 제거할 수 없다** — 403 `MEMBER_SELF_EDIT_DENIED`.
> ⚠️ **하드 삭제다.** `project_member` 에 soft delete 컬럼이 없어 행이 물리적으로 사라진다. `activity_log` 는 `target_name` 을 스냅샷으로 들고 있어 로그가 고아가 되지 않는다.
> ⭐ **그 프로젝트 스텝의 `step_permission` 오버라이드도 함께 삭제된다** (2026-08-06). 안 지우면 참여자를 뺀 뒤에도 스텝 편집 권한이 살아남는다 (권한 누수).

**Status Code** — 200 · 401 · 403 `MEMBER_SELF_EDIT_DENIED` · 403 `PROJECT_EDIT_DENIED` · 404 `MEMBER_NOT_FOUND` · 404 `PROJECT_NOT_FOUND`(**다른 회사 — 존재 확인이 권한 판정보다 먼저라 403 이 아니다**)

## 128. 하위 스텝 권한 일괄 적용

| 항목          | 값                                                        |
| ------------- | --------------------------------------------------------- |
| **Method**    | `POST`                                                    |
| **Path**      | `/api/v1/stages/{stageId}/step-permissions`                |
| **권한**      | 프로젝트 `EDITOR`                                         |
| **요구사항**  | STG-004 · USC-STG-008                                     |
| **사용 위치** | `src/features/project/api.ts` → `applyStepPermissions()`  |

**Request Body**

```ts
{
  userId: string;
  permission: 'VIEWER' | 'EDITOR' | 'NONE';   // ⚠️ 여기만 NONE 이 살아 있다
  applyToExistingSteps?: boolean;             // 생략하면 true
}
```

**Response (201 Created)**

```ts
data: { stageId: number; userId: string; permission: string; appliedStepCount: number }
```

`appliedStepCount` 는 권한이 적용된 **기존** 스텝 수다. `applyToExistingSteps: false` 면 `0` 이다.

> ⚠️ **`stage_permission` 테이블은 없다.** 이 API 는 `stage_permission_default`(2026-08-09 신설)에 **새 스텝 기본값**을 저장하고, 스텝이 생성될 때 `step_permission` 행으로 복사한다 (STG-004 · INV-01).
> ⚠️ **기본값은 권한 판정에 쓰이지 않는다.** 판정 체인은 프로젝트 참여자 → 스텝 오버라이드 2단 그대로다 — 스텝을 다른 스테이지로 옮겨도 권한이 따라 바뀌지 않고, 기본값을 나중에 바꿔도 **이미 만들어진 스텝에 소급되지 않는다.**
> ⚠️ 미소속(스테이지 없는) 스텝에는 기본값이 없어 프로젝트 권한을 그대로 상속한다.
> ⛔ 자기 자신의 권한 행은 바꿀 수 없다 (INV-10).
> ⚠️ **여기만 `NONE` 이 유효값이다** — 참여자 권한(125 · 126)의 폐기된 `NONE` 과 헷갈리지 말 것. 스텝 단위로는 "이 스텝은 보지 못하게" 가 성립한다.

**Status Code** — 201 · 400 `STEP_PERMISSION_INVALID` · 401 · 403 `PROJECT_EDIT_DENIED` · 403 `MEMBER_SELF_EDIT_DENIED` · 404 `STAGE_NOT_FOUND` · 404 `USER_NOT_FOUND`

## 129. 프로젝트 수정

| 항목          | 값                                                |
| ------------- | ------------------------------------------------- |
| **Method**    | `PATCH`                                           |
| **Path**      | `/api/v1/projects/{projectId}`                    |
| **권한**      | 프로젝트 `EDITOR`                                 |
| **요구사항**  | PRJ-006 · PRJ-008                                 |
| **사용 위치** | `src/features/project/api.ts` → `updateProject()` |

**Request Body**

```ts
{
  name: string;              // 필수 · 최대 300자 · 빈 문자열 · 공백 불가
  description?: string;
  clientName?: string;       // 발주처 · 최대 200자
  startedOn?: string;        // '2026-08-01'
  endedOn?: string;          // '2027-01-31'
  contractAmount?: number;
  version: number;           // 필수 — 상세(6)에서 받은 값 그대로
  overwrite?: boolean;       // true 면 충돌 무시하고 덮어쓴다. 생략하면 false
}
```

**Response (200 OK)**

```ts
data: {
  projectId: number; name: string; clientName: string;
  startedOn: string; endedOn: string; contractAmount: number;
  updatedAt: string; version: number;   // ⚠️ 저장 후의 새 값
}
```

> ⚠️ **전체 덮어쓰기다. 생략한 필드는 유지가 아니라 해제.** 6필드가 전부 `N` 인 것은 *"안 보내도 요청이 통과한다"* 는 뜻이지 *"안 보내면 기존 값이 남는다"* 는 뜻이 아니다 — **폼 전체를 매번 보낸다.**
> ⚠️ **낙관적 락** (2026-08-11 신설) — 늦으면 409 `PROJECT_VERSION_CONFLICT` 다. 409 면 **재조회 / 덮어쓰기(`overwrite: true`)** 중 무엇을 할지 사용자에게 묻는다 (스테이지 수정 113 과 같은 규칙).
> ⚠️ 응답 `version` 은 **저장 후의 새 값**이다. 화면 상태를 이 값으로 교체하지 않으면 다음 저장이 또 409 다.
> ⛔ **사업 카테고리는 이 API 로 바꾸지 않는다** — 연결(132) · 해제(133) 소관이다. 계약금액은 `project.contract_amount` 한 곳에만 저장한다 (INV-08). 기간은 자동 계산하지 않는다 (PRJ-006).

**Status Code** — 200 · 400 `PROJECT_NAME_REQUIRED` · 400 `PROJECT_NAME_TOO_LONG` · 400 `PROJECT_DATE_RANGE_INVALID` · 400 `CLIENT_NAME_TOO_LONG` · 400 `CONTRACT_AMOUNT_INVALID` · 400 `PROJECT_VERSION_REQUIRED` · 400 `COMMON_INVALID_REQUEST` · 401 · 403 `PROJECT_EDIT_DENIED` · 404 `PROJECT_NOT_FOUND` · 409 `PROJECT_VERSION_CONFLICT`

## 130. 프로젝트 상태 변경

| 항목          | 값                                                      |
| ------------- | ------------------------------------------------------- |
| **Method**    | `PATCH`                                                 |
| **Path**      | `/api/v1/projects/{projectId}/status`                   |
| **권한**      | 프로젝트 `EDITOR`                                       |
| **요구사항**  | PRJ-003                                                 |
| **사용 위치** | `src/features/project/api.ts` → `updateProjectStatus()` |

**Request Body** — `{ status: 'NOT_STARTED' | 'IN_PROGRESS' | 'SETTLEMENT' | 'COMPLETED', version: number, overwrite?: boolean }`

**Response (200 OK)** — `data: { projectId, status, updatedAt, version }`

> ⛔ **`CLOSED` 는 이 API 로 설정할 수 없다** — 종결(131)을 쓴다. 보내면 400 `PROJECT_STATUS_INVALID` 다.
> ℹ️ **역방향 전이를 막지 않는다** (PRJ-003) — 완료에서 진행 중으로 되돌릴 수 있다.
> ⚠️ 낙관적 락 대상이다 (129 와 같은 규칙).

**Status Code** — 200 · 400 `PROJECT_STATUS_INVALID` · 400 `PROJECT_VERSION_REQUIRED` · 401 · 403 `PROJECT_EDIT_DENIED` · 404 `PROJECT_NOT_FOUND` · 409 `PROJECT_VERSION_CONFLICT`

## 131. 프로젝트 종결

| 항목          | 값                                               |
| ------------- | ------------------------------------------------ |
| **Method**    | `POST`                                           |
| **Path**      | `/api/v1/projects/{projectId}/close`             |
| **권한**      | 프로젝트 `EDITOR`                                |
| **요구사항**  | PRJ-004 · PRJ-005                                |
| **사용 위치** | `src/features/project/api.ts` → `closeProject()` |

**Request Body**

```ts
{
  closeReasonCode: 'NOT_PARTICIPATED' | 'FAILED_BID' | 'NOT_SELECTED' | 'CANCELED';
  closeReasonNote?: string;   // 최대 500자
}
```

**Response (200 OK)** — `data: { projectId, status: 'CLOSED', closeReasonCode, closeReasonNote, closedAt }`

> ℹ️ **어느 상태에서든 종결할 수 있다.** 종결해도 목록 · 로그에서 사라지지 않는다 (PRJ-004) — **삭제와 다른 동작**이다.
> ⛔ **낙관적 락을 걸지 않는다** (2026-08-11 · 백엔드 `CONCURRENCY.md` §9-4) — `version` · `overwrite` 를 받지 않고 409 도 없다. 사유가 필수라 두 번 눌러도 결과가 같고, 갱신 유실로 잃을 편집 내용이 없다. 상태만 바꾸는 130 과 다르다.
> ⚠️ 사유 코드는 Bean Validation 이 아니라 **서비스가** 판정한다 — 비어 보내면 `CLOSE_REASON_REQUIRED`, 목록에 없는 값이면 `CLOSE_REASON_INVALID`.

**Status Code** — 200 · 400 `CLOSE_REASON_REQUIRED` · 400 `CLOSE_REASON_INVALID` · 400 `CLOSE_REASON_NOTE_TOO_LONG` · 401 · 403 `PROJECT_EDIT_DENIED` · 404 `PROJECT_NOT_FOUND`(**다른 회사도 여기로 — 403 이 아니다**)

## 132. 사업 카테고리 연결

| 항목          | 값                                                          |
| ------------- | ----------------------------------------------------------- |
| **Method**    | `POST`                                                      |
| **Path**      | `/api/v1/projects/{projectId}/business-categories`           |
| **권한**      | 프로젝트 `EDITOR`                                           |
| **요구사항**  | PRJ-007 · USC-PBC-001 · 002                                 |
| **사용 위치** | `src/features/project/api.ts` → `linkBusinessCategories()`  |

**Request Body** — `{ categoryIds: number[] }`

**Response (201 Created)**

```ts
data: {
  projectId: number;
  businessCategories: { categoryId: number; name: string; code: string | null }[];
}
```

> ℹ️ 응답은 **연결 후 전체 카테고리**다 — 방금 추가한 것만이 아니다. 화면 상태를 이 배열로 통째 교체한다.
> ⚠️ 같은 카테고리 중복은 `UNIQUE` 로 차단된다 (PRJ-007). **하나라도 이미 연결된 게 섞이면 요청 전체가 409** 다 — 이미 붙은 것은 보내지 않게 화면에서 걸러야 한다.
> 🗑️ 이 응답에는 `deleted` 필드가 **없다** — 방금 연결한 것은 살아 있는 것만 고를 수 있기 때문이다. 삭제 배지는 조회 응답(상세 6 · 목록 84)에만 있다 (D-6).

**Status Code** — 201 · 400 `CATEGORY_IDS_REQUIRED` · 401 · 403 `PROJECT_EDIT_DENIED` · 404 `PROJECT_NOT_FOUND` · 404 `BUSINESS_CATEGORY_NOT_FOUND`(**다른 회사 · 삭제분도 여기로**) · 409 `BUSINESS_CATEGORY_DUPLICATED`

## 133. 사업 카테고리 해제

| 항목          | 값                                                                    |
| ------------- | --------------------------------------------------------------------- |
| **Method**    | `DELETE`                                                              |
| **Path**      | `/api/v1/projects/{projectId}/business-categories/{categoryId}`        |
| **권한**      | 프로젝트 `EDITOR`                                                     |
| **요구사항**  | USC-PBC-003                                                           |
| **사용 위치** | `src/features/project/api.ts` → `unlinkBusinessCategory()`            |

응답 `data` 는 `null` 이다.

> ⚠️ **연결 행 자체를 지우는 하드 삭제다** (2026-08-11 명시). 논리 삭제로 두면 `UNIQUE` 를 시체가 점유해 **같은 카테고리를 다시 못 붙인다.**
> ℹ️ 마스터(`business_category`)가 삭제된 카테고리도 해제할 수 있다 — 연결 행은 그대로 남아 있기 때문이다 (D-3). 그래서 `deleted: true` 배지가 붙은 항목에도 해제 버튼을 살려 둔다.

**Status Code** — 200 · 401 · 403 `PROJECT_EDIT_DENIED` · 404 `PROJECT_NOT_FOUND` · 404 `BUSINESS_CATEGORY_NOT_LINKED`

## 134. 스텝 권한 목록 조회

| 항목          | 값                                                     |
| ------------- | ------------------------------------------------------ |
| **Method**    | `GET`                                                  |
| **Path**      | `/api/v1/steps/{stepId}/permissions`                    |
| **권한**      | **프로젝트 `EDITOR`** (스텝 권한이 아니다)             |
| **요구사항**  | STP-010 · STP-011 · USC-SPM-004                        |
| **사용 위치** | `src/features/project/api.ts` → `getStepPermissions()` |

**Response (200 OK)**

```ts
data: {
  permissions: {
    userId: string;
    name: string;
    permission: 'VIEWER' | 'EDITOR' | 'NONE';   // 최종 판정 등급
    overridden: boolean;                        // step_permission 행 보유 여부
  }[];
}
```

> ℹ️ **참여자 전원**이 온다 — 오버라이드가 걸린 사람만이 아니다.
> ⚠️ **`overridden: false` 는 차단이 아니라 프로젝트 권한 상속이다** (STP-011). 화면은 `상속` · `직접 지정` 을 구분해 보여주고, 회수(136)를 "상속으로 되돌리기" 로 읽히게 한다.

**Status Code** — 200 · 401 · 403 `PROJECT_EDIT_DENIED` · 404 `STEP_NOT_FOUND`(**다른 회사의 스텝도 여기로**)

## 135. 스텝 권한 부여 · 변경

| 항목          | 값                                                    |
| ------------- | ----------------------------------------------------- |
| **Method**    | `PUT`                                                 |
| **Path**      | `/api/v1/steps/{stepId}/permissions/{userId}`          |
| **권한**      | 프로젝트 `EDITOR`                                     |
| **요구사항**  | STP-010 · USC-SPM-001 · 002                           |
| **사용 위치** | `src/features/project/api.ts` → `setStepPermission()` |

**Request Body** — `{ permission: 'VIEWER' | 'EDITOR' | 'NONE' }`

**Response (200 OK)** — `data: { stepId, userId, permission, overridden: true }`

> ⚠️ **특정 스텝만 가리려면 `NONE` 행을 명시적으로 넣어야 한다** (STP-011) — 행이 없는 상태는 차단이 아니라 상속이다. **참여자 권한(125·126)의 폐기된 `NONE` 과 다르다.**
> ⛔ 자기 자신의 권한 행은 수정할 수 없다 (INV-10).
> ℹ️ 경로 대상이 `memberId`(행 ID)가 아니라 **사번(`userId`)** 이다 — 참여자 API 와 다르다.

**Status Code** — 200 · 400 `STEP_PERMISSION_INVALID` · 401 · 403 `MEMBER_SELF_EDIT_DENIED` · 403 `PROJECT_EDIT_DENIED` · 404 `STEP_NOT_FOUND` · 404 `USER_NOT_FOUND`

## 136. 스텝 권한 회수

| 항목          | 값                                                       |
| ------------- | -------------------------------------------------------- |
| **Method**    | `DELETE`                                                 |
| **Path**      | `/api/v1/steps/{stepId}/permissions/{userId}`             |
| **권한**      | 프로젝트 `EDITOR`                                        |
| **요구사항**  | USC-SPM-003 · STP-011                                    |
| **사용 위치** | `src/features/project/api.ts` → `revokeStepPermission()` |

**Response (200 OK)** — `data: { stepId, userId, permission, overridden: false }`

> ⚠️ **오버라이드 행을 지워 프로젝트 권한 상속으로 되돌린다. 차단이 아니다.** 응답의 `permission` 은 회수 후 **상속된 등급**이라, 화면은 이 값으로 행을 갈아끼운다.
> ⛔ 자기 자신의 행은 회수할 수 없다 (INV-10).
> ℹ️ 404 `STEP_PERMISSION_NOT_FOUND` 는 "이미 상속 상태" 라는 뜻이다 — 실패로 보이지 않게 목록만 갱신하면 된다.

**Status Code** — 200 · 401 · 403 `PROJECT_EDIT_DENIED` · 403 `MEMBER_SELF_EDIT_DENIED` · 404 `STEP_NOT_FOUND` · 404 `STEP_PERMISSION_NOT_FOUND`

## 137. 스텝 상태 변경

| 항목          | 값                                                  |
| ------------- | --------------------------------------------------- |
| **Method**    | `PATCH`                                             |
| **Path**      | `/api/v1/steps/{stepId}/status`                      |
| **권한**      | **스텝 `EDITOR`** (프로젝트가 아니다)               |
| **요구사항**  | STP-004                                             |
| **사용 위치** | `src/features/project/api.ts` → `updateStepStatus()` |

**Request Body** — `{ status: 'NOT_STARTED' | 'IN_PROGRESS', version: number, overwrite?: boolean }`

**Response (200 OK)** — `data: { stepId, status, updatedAt, version }`

> ⛔ **`DONE` 은 이 API 로 설정하지 않는다** — 미완료 이슈 처리 선택이 필요해 **완료 처리(118)** 소관이다 (STP-006). 보내면 400 `STEP_STATUS_INVALID` 다.
> ⚠️ 낙관적 락 (2026-08-11 신설) — 늦으면 409 `STEP_VERSION_CONFLICT` 다. 응답 `version` 으로 화면 상태를 교체해야 다음 저장이 통과한다.
> ⚠️ **상태 변경은 완료정보(`completedAt` · `completedBy`)까지 함께 `SET` 한다** — `DONE` 에서 되돌리면 완료 기록도 함께 비워진다.
> ℹ️ 스텝 상태는 **진척률과 별개 값**이다 (STP-004) — 이슈를 다 끝내도 상태가 저절로 바뀌지 않는다.

**Status Code** — 200 · 400 `STEP_STATUS_INVALID` · 400 `STEP_VERSION_REQUIRED` · 401 · 403 `STEP_EDIT_DENIED` · 404 `STEP_NOT_FOUND` · 409 `STEP_VERSION_CONFLICT`

## 138. 프로젝트 직접 생성

| 항목          | 값                                                |
| ------------- | ------------------------------------------------- |
| **Method**    | `POST`                                            |
| **Path**      | `/api/v1/projects`                                |
| **권한**      | 전체 사용자                                       |
| **요구사항**  | PRJ-001                                           |
| **사용 위치** | `src/features/project/api.ts` → `createProject()` |

**Request Body**

```ts
{
  name: string;                   // 필수 · 최대 300자
  description?: string;
  clientName?: string;            // 발주처 · 최대 200자
  startedOn?: string;             // '2026-08-01'
  endedOn?: string;               // '2026-12-31'
  contractAmount?: number;
  businessCategoryIds?: number[]; // 복수 연결
  bidNoticeId?: number;           // 생략하면 공고 없이 생성
}
```

**Response (201 Created)**

```ts
data: {
  projectId: number; name: string; clientName: string | null;
  status: 'NOT_STARTED'; startedOn: string | null; endedOn: string | null;
  contractAmount: number | null;
  businessCategories: { categoryId: number; name: string; code: string | null; deleted: boolean }[];
  bidNoticeId: number | null;              // 직접 생성이면 null
  createdBy: { userId: string; name: string };   // userId 는 사번
  createdAt: string;
}
```

> ⭐ **공고 있음 / 없음을 엔드포인트로 나누지 않는다** (2026-08-04) — `bidNoticeId` 선택 필드 하나로 통합했다. `/projects/new` 화면은 **공고와 연결되지 않은 건만** 만들어 이 필드를 보내지 않는다.
> ℹ️ 상태는 시스템이 `NOT_STARTED` 로 정하고, `created_by` 에 요청자 **사번**이 들어간다. 생성자는 자동으로 `EDITOR` 참여자가 된다.
> 🏢 **회사 격리** (2026-08-11) — 로그인 사용자의 `company_id` 가 자동으로 박힌다(요청으로 지정 불가). `businessCategoryIds` 는 **내 회사의 살아있는 카테고리**만 통과하고 아니면 404 다. `bidNoticeId` 중복 검사도 **같은 회사 안에서만** 본다.
> 🗑️ 응답 `businessCategories[].deleted` 는 쓰기 경로라 **항상 `false`** 다 (D-6) — 삭제된 카테고리는 애초에 연결되지 않는다.
> ⚠️ **생성 응답에는 `version` 이 없다** (2026-08-11). 새 프로젝트의 `version` 은 `1` 이다 — 생성 직후 수정하려면 상세(6)를 다시 조회하거나 `1` 을 실어 보낸다.

**Status Code** — 201 · 400 `PROJECT_NAME_REQUIRED` · 400 `PROJECT_NAME_TOO_LONG` · 400 `PROJECT_DATE_RANGE_INVALID` · 401 `AUTH_UNAUTHENTICATED` · 404 `BUSINESS_CATEGORY_NOT_FOUND` · 409 `PROJECT_BID_NOTICE_ALREADY_LINKED`

## 139. 프로젝트 삭제

| 항목          | 값                                                |
| ------------- | ------------------------------------------------- |
| **Method**    | `DELETE`                                          |
| **Path**      | `/api/v1/projects/{projectId}`                    |
| **권한**      | 프로젝트 `EDITOR`                                 |
| **요구사항**  | PRJ-014                                           |
| **사용 위치** | `src/features/project/api.ts` → `deleteProject()` |

**Request Body** — 없음 (`DELETE /api/v1/projects/12`)

**Response (200 OK)** — `data: null`

> ⛔ **`진행 전` 이고 스텝이 0개일 때만 삭제된다.** 아니면 409 `PROJECT_DELETE_NOT_ALLOWED` — 이미 굴러간 프로젝트는 삭제가 아니라 **종결(131)** 로 남긴다.
> ℹ️ **블록 수는 따로 보지 않는다** (2026-08-11 정정) — 블록은 스텝에만 붙으므로 스텝이 0개면 블록도 0개다.
> ⚠️ 삭제는 `deleted_at` **논리 삭제**이고, **연결된 공고(`bid_notice_id`)를 비운다** — 그렇게 하지 않으면 `UNIQUE` 를 시체가 점유해 그 공고로 프로젝트를 다시 못 만든다.
> 🏢 **회사 격리** (2026-08-11) — 다른 회사의 프로젝트는 404 다.

**Status Code** — 200 · 401 `AUTH_UNAUTHENTICATED` · 403 `PROJECT_EDIT_DENIED` · 404 `PROJECT_NOT_FOUND` · 409 `PROJECT_DELETE_NOT_ALLOWED`

---

## 142. 담당 이슈 캘린더 조회

| 항목          | 값                                                |
| ------------- | ------------------------------------------------- |
| **Method**    | `GET`                                             |
| **Path**      | `/api/v1/issues/calendar`                         |
| **권한**      | 없음 (본인 담당 이슈만 오므로 스텝 권한 검사 없음) |
| **사용 위치** | `src/features/issue/api.ts` → `getIssueCalendar()` |

**Query Parameter** — 없다. 로그인 사용자가 담당인 **미완료 이슈 전체**가 한 번에 온다.

**Response (200 OK)**

```json
{
  "issues": [
    {
      "issueId": 101,
      "title": "제안서 1차 초안 작성",
      "status": "IN_PROGRESS",
      "priority": "HIGH",
      "dueDate": "2026-08-11",
      "stepId": 10,
      "stepName": "입찰 진행",
      "projectId": 3,
      "projectName": "OO시 스마트도로 구축"
    }
  ]
}
```

| 필드          | 타입   | 설명                                     |
| ------------- | ------ | ---------------------------------------- |
| `issueId`     | number | 이슈 ID                                  |
| `title`       | string | 이슈 제목                                |
| `status`      | string | `TODO` · `IN_PROGRESS` (**`DONE` 없음**) |
| `priority`    | string | `LOW` · `MEDIUM` · `HIGH`                |
| `dueDate`     | string | `yyyy-MM-dd` — **항상 값이 있다**        |
| `stepId`      | number | 소속 스텝 ID                             |
| `stepName`    | string | 소속 스텝명                              |
| `projectId`   | number | 소속 프로젝트 ID                         |
| `projectName` | string | 소속 프로젝트명                          |

> ⛔ **`DONE` 이슈 · 마감일 없는 이슈는 응답에서 빠진다** — 화면이 다시 거르지 않는다.
> ⛔ **색은 응답하지 않는다** — `projectId` 기준으로 프론트가 매긴다.
> ⚠️ **기간 파라미터가 없다.** 화면 진입 때 한 번만 부르고, 월 이동은 받아 둔 목록에서 걸러 그린다.
> ℹ️ 목록 이슈(55 · 108)와 **모양이 다르다** — 담당자 · 연결 블록 · `version` 이 없고 대신 프로젝트 · 스텝이 실려 온다. 이슈를 누르면 상세(57)를 그대로 부른다.
> ℹ️ 결과가 없으면 `issues` 는 빈 배열이다.

**Status Code** — 200 · 401 `AUTH_UNAUTHENTICATED`

---

> ✏️ 새 API를 연동할 때 위 양식대로 계속 추가하세요.
> 핵심은 **백엔드 응답 타입을 정확히** 적어두는 것 — AI가 타입 안전하게 연동 코드를 짜줘요.

---

## 재무 도메인 — 입출금 내역

> 📌 초안 명세가 없어 **스웨거(`/v3/api-docs`) 실측**으로 정리했다 (2026-08-12).
> 연동 코드는 `src/features/finance/api.ts` · 타입은 `types.ts` 한 곳에 모여 있다.

| 항목          | 내용                                              |
| ------------- | ------------------------------------------------- |
| **인증 필요** | ✅ `FINANCE` 페이지 **접근 권한** (없으면 403 `FINANCE_ACCESS_DENIED`) |
| **편집**      | 등록 · 수정 · 삭제 · 제외 · 매칭은 **편집 권한** (403 `FINANCE_EDIT_ACCESS_DENIED`) |

### 경로

| Method   | Path                                          | 용도                       |
| -------- | --------------------------------------------- | -------------------------- |
| `GET`    | `/finance/summary`                            | 허브 3개 항목 수치         |
| `GET`    | `/finance/cash-flows`                         | 목록 (**페이징 없음**)     |
| `GET`    | `/finance/cash-flows/filters`                 | 프로젝트 필터 옵션         |
| `POST`   | `/finance/cash-flows`                         | 직접 등록                  |
| `PATCH`  | `/finance/cash-flows/{cashFlowId}`            | 수정                       |
| `DELETE` | `/finance/cash-flows`                         | 다건 삭제 (body: `cashFlowIds`) |
| `PATCH`  | `/finance/cash-flows/exclude`                 | 연결 제외 · 취소           |
| `GET`    | `/finance/cash-flows/{cashFlowId}/match-candidates` | 매칭 추천 (최대 5건) |
| `PATCH`  | `/finance/cash-flows/{cashFlowId}/match`      | 정산 블록 연결             |
| `PATCH`  | `/finance/cash-flows/{cashFlowId}/unmatch`    | 연결 해제                  |
| `POST`   | `/finance/cash-flows/csv/preview` · `/csv`    | CSV 미리보기 · 업로드 (#13) |

### 요약 응답 (`GET /finance/summary`)

```json
{
  "cashFlow":   { "unlinkedCount": 3, "totalCount": 7 },
  "taxInvoice": { "unlinkedCount": 2, "totalCount": 5 },
  "settlement": { "unlinkedCount": 5, "inProgressCount": 3 }
}
```

> ❗ **정산 현황만 두 번째 값이 `inProgressCount`** 다 (`totalCount` 가 아니다).

### 목록 응답 (`GET /finance/cash-flows`)

| 필드                                          | 타입             | 설명                                     |
| --------------------------------------------- | ---------------- | ---------------------------------------- |
| `cashFlowId`                                  | `number`         |                                          |
| `tradedAt`                                    | `string`         | `2026-07-15T10:30:00`                    |
| `bankTxnId`                                   | `string`         | 거래고유번호 — **은행명 + 거래일시**로 자동 생성 |
| `type`                                        | `INCOME`·`OUTCOME` | 구분                                   |
| `amount`                                      | `number`         | 항상 양수                                |
| `depositorName` · `bankMemo`                  | `string`         | 입금자명 · 적요                          |
| `sourceType`                                  | `MANUAL`·`CSV`·`API` | **수정 가능 범위를 가르는 값**       |
| `projectId` · `projectName` · `settleId` · `roundName` | `… \| null` | 연결 정보. 미연결이면 `null`     |
| `linkedBy` · `linkedByName` · `linkedAt`      | `… \| null`      | 매칭 처리자 · 일시                       |
| `isExcluded`                                  | `boolean`        | 연결 대상 제외                           |
| `linkStatus`                                  | `UNLINKED`·`LINKED`·`LINK_BLOCK_DELETED` | 2026-08-10 추가  |

**요청 Query** — `startDate` · `endDate` · `unlinked` · `projectId` · `keyword`

> ❗ **페이징이 없다.** `{ "cashFlows": [...] }` 배열 하나가 통째로 온다 — 화면에 페이지네이션을 붙이지 않는다.
> ❗ **구분 · 출처 필터는 서버에 없다.** 화면에서 거른다.
> ❗ **`bankName` 이 목록에 없다** (단건 조회 API 도 없다). 수정 폼은 `bankTxnId` 앞부분으로 되읽는다 — 필드가 추가되면 `display.ts` 의 `bankNameFromTxnId` 를 지운다.

### 정산 현황 (2026-08-17 연동)

프로젝트 단위로 정산 진행을 모아 보는 화면이다. 경로가 `/finance` 가 아니라 **`/projects` 아래**에 있다.

| Method | Path                                    | 용도                        |
| ------ | --------------------------------------- | --------------------------- |
| `GET`  | `/projects/settlements`                 | 프로젝트 집계 (**페이징 있음**) |
| `GET`  | `/projects/settlements/filters`         | 발주처 선택지 (`clients[]`) |
| `GET`  | `/projects/{projectId}/settlements`     | 회차(정산 블록) 목록 (페이징 없음) |

**목록 Query** — `startDate` · `endDate` · `client` · `includeCompleted` · `page` · `size` · `sort`
`sort` 는 **`NEXT_PLANNED_DATE_ASC` · `TOTAL_AMOUNT_DESC` 둘뿐이다** — 표 머리글 정렬을 붙이면 안 된다.

**목록 응답** — `projects[]` + `page` · `size` · `totalElements` · `totalPages`

| 필드                                              | 설명                                     |
| ------------------------------------------------- | ---------------------------------------- |
| `projectId` · `projectName` · `clientName?`       | 프로젝트 · 발주처                         |
| `projectManager`                                  | 담당자(PM) 이름                           |
| `totalPlannedAmount?`                             | **회차 예정 금액 합계** (계약금액이 아니다) |
| `totalIncome` · `totalOutcome` · `totalAmount`    | 수입 · 지출 · 합계 — 합계는 **서버 값을 그대로 쓴다** |
| `completedRoundCount` / `totalRoundCount`         | 정산 진행                                 |
| `nextPlannedDate?`                                | 다음 예정일                               |
| `paymentUnlinkedCount` · `taxInvoiceUnlinkedCount` | 미연결 건수                              |
| `paymentOverdueDays` · `taxInvoiceOverdueDays`    | 지연 일수 (0 이면 지연 아님)              |
| `projectStatus` · `endedOn?`                      | 프로젝트 상태 · 종료일                    |

**회차 응답** — `blocks[]`

`settleId` · `roundNo?` · `roundName?` · `plannedDate?` · `plannedAmount?` · `plannedTaxAmount?` ·
`taxInvoiceDate?` · `taxInvoiceAmount?` · `paidType?`(`INCOME`·`OUTCOME`) · `bankName?` · `accountNumber?` ·
`accountHolder?` · `paidDate?` · `paidAmount?` · `status` ·
`taxLinkedBy?` · `taxLinkedByName?` · `taxLinkedAt?` · `cashFlowLinkedBy?` · `cashFlowLinkedByName?` · `cashFlowLinkedAt?`

회차 상태는 정산 블록과 같은 4값이다 — `PENDING`(미연결) · `WAITING`(정산 대기) · `PARTIAL`(부분 정산) · `COMPLETED`(정산 완료).

> ⚠️ **프로젝트 단위 상태 값은 없다** (2026-08-17 팀 확인). 화면이 지연 일수 · 미연결 건수 · 회차 수로
>    `입금 대기 N일` · `계산서 미발행 N일` · `예정일 미입력` · `정산 완료` · `진행 중` 을 판정한다
>    (`features/finance/display.ts` → `settlementProjectState`). 서버 정의가 생기면 그 함수를 지운다.
> ⚠️ **계약 금액 · 미계획 금액 필드가 없다** — 와이어프레임의 `미계획 N원` 배지는 계산 근거가 없어 뺐다.
> ⚠️ 회차의 **계좌 정보는 출금에만** 있다 — 표의 열로 두지 않고 `계좌 보기` 로 펼친다.

---

### 수정 (`PATCH /finance/cash-flows/{cashFlowId}`)

body 는 등록과 같은 모양이고 전부 선택이다.

> ❗ **적요(`memo`) 외의 필드는 `MANUAL` + 미연결 건에만 반영된다.** 나머지는 서버가 조용히 무시하므로 화면에서 먼저 막는다 (`canEditAll()`).

### 다건 처리 (삭제 · 제외)

| API      | body                                  | 응답                                  |
| -------- | ------------------------------------- | ------------------------------------- |
| 삭제     | `{ cashFlowIds }`                     | `{ deletedCount, skippedItems[] }`    |
| 제외     | `{ cashFlowIds, isExcluded }`         | `{ updatedCount, skippedItems[] }`    |

> ❗ **부분 성공이 정상 동작이다.** 매칭된 건은 막혀 `skippedItems`(`{ cashFlowId, reason }`)로 빠진다. 사유는 서버 문구를 그대로 띄운다.
> ❗ 제외는 토글이 아니라 **값 지정**이다.

### 매칭

| 상황                              | 코드                                        |
| --------------------------------- | ------------------------------------------- |
| 이미 매칭된 입출금                | 400 `FINANCE_CASH_FLOW_ALREADY_MATCHED`     |
| **구분과 블록 타입 불일치**       | 400 `FINANCE_MATCH_TYPE_MISMATCH`           |
| 이미 매칭된 정산 블록             | 400 `FINANCE_SETTLEMENT_BLOCK_ALREADY_MATCHED` |
| 매칭 안 된 건의 해제              | 400 `FINANCE_CASH_FLOW_NOT_MATCHED`         |
| 대상 없음                         | 404 `FINANCE_MATCH_TARGET_NOT_FOUND`        |

추천 후보(`match-candidates`)는 **정산 블록** 단위이고 `matchTags`(`["금액 일치", "상호명 일치"]`)로 추천 이유가 함께 온다.


### CSV · 엑셀 일괄 등록 (#13)

| Method | Path                              | 요청                                        |
| ------ | --------------------------------- | ------------------------------------------- |
| `POST` | `/finance/cash-flows/csv/preview` | `multipart` — `file` (+ `password` 선택)     |
| `POST` | `/finance/cash-flows/csv`         | `multipart` — `file` + `request`(**JSON 문자열**) |

**미리보기 응답** — `columns[]` · `bankOptions[]` · `sampleRows[]`(상위 5행) ·
`recommendedDateTimeMode`(`SINGLE`·`SEPARATE`) · `recommendedAmountMode`(`SINGLE_WITH_TYPE`·`SEPARATE`) ·
`recommendedMapping`(각 컬럼 추천값, 없으면 `null`)

**업로드 응답** — `totalRows` · `savedCount` · `duplicateCount` · `duplicateRows[]`(`tradedAt` · `amount` · `reason`)

| status | code                            | 화면 처리                                   |
| ------ | ------------------------------- | ------------------------------------------- |
| 400    | `FINANCE_CSV_PASSWORD_REQUIRED` | **실패가 아니다** — 비밀번호 칸을 열고 재시도 |
| 400    | `FINANCE_CSV_PASSWORD_INVALID`  | 같은 자리에서 다시 입력                      |
| 400    | `FINANCE_CSV_MAPPING_REQUIRED`  | 필수 컬럼 매핑 누락                          |
| **404** | `FINANCE_INVALID_CSV_FILE`     | ❗ **형식 오류가 404 다** — '없는 리소스' 가 아니다 |

> ❗ **`request` 파트의 JSON 스키마가 스웨거에 없다.** 미리보기 응답의 키에 `bankName` ·
> `dateTimeMode` · `amountMode` 를 더한 모양으로 보내고 있다 (`types.ts` 의 `CsvUploadRequest`).
> ❗ **엑셀 시간 전용 셀이 `1899-12-31 HH:mm:ss` 로 파싱된다** — 엑셀이 시각만 있는 셀을
> "0일차 + 시각" 으로 저장하기 때문이다. 시간 컬럼은 **시각만** 취해야 한다 (백엔드 대기).
> ❗ **단건 조회 API 가 없다** — 상세 화면은 목록을 받아 그 안에서 찾는다.

### ⚠️ 백엔드 대기

| 내용                                                                    |
| ----------------------------------------------------------------------- |
| `PATCH /blocks/settlements/{id}/items` — `?type=` 을 실어 보내도 컨트롤러에서 null 이라 **500 NPE** (파라미터 바인딩) |
| 목록 응답에 `bankName` 추가 (또는 단건 조회 API)                        |
| 정산 블록 `detail` 에 **연결 여부 플래그** — 지금은 정산 상태로 추정한다 |
| 엑셀 시간 전용 셀 파싱 (`1899-12-31 …`) — CSV 업로드가 막혀 있다        |
| `request` 파트 JSON 스키마 공개 (입출금 · 세금계산서 둘 다)             |
| `GET /finance/cash-flows/{cashFlowId}` 단건 조회                        |
| `GET /finance/tax-invoices/{taxId}` 단건 조회 — 지금은 **목록을 넘겨 가며 찾는다** |

### 세금계산서 — `/finance/tax-invoices` (2026-08-14 스웨거 실측 · 연동 완료)

> ⚠️ 변경사항 (2026-08-14) — 이전 기록의 "필터 옵션만 구현" 은 **낡았다.** 전부 배포됐다.

| 메서드   | 경로                                            | 설명                                             |
| -------- | ----------------------------------------------- | ------------------------------------------------ |
| `GET`    | `/finance/tax-invoices`                         | 목록 — ⚠️ **페이징 있음** (`page`·`size`·`sort`) |
| `DELETE` | `/finance/tax-invoices`                         | 다건 삭제 (body 에 `taxIds`)                     |
| `GET`    | `/finance/tax-invoices/filters`                 | 프로젝트 옵션                                    |
| `PATCH`  | `/finance/tax-invoices/exclude`                 | 연결 대상 제외/포함 (`taxIds` · `isExcluded`)    |
| `PATCH`  | `/finance/tax-invoices/{taxId}`                 | ⚠️ **메모만** 수정된다                           |
| `GET`    | `/finance/tax-invoices/{taxId}/match-candidates` | 정산 블록 추천 (최대 5건)                        |
| `PATCH`  | `/finance/tax-invoices/{taxId}/match`           | 정산 블록 연결 (`settleId`)                      |
| `PATCH`  | `/finance/tax-invoices/{taxId}/unmatch`         | 연결 해제                                        |
| `POST`   | `/finance/tax-invoices/csv/preview`             | 컬럼 추천 — 파일은 저장되지 않는다               |
| `POST`   | `/finance/tax-invoices/csv`                     | 매핑 확정 후 저장                                |

**입출금과 다른 점**

| 항목        | 입출금                | 세금계산서               |
| ----------- | --------------------- | ------------------------ |
| 목록 페이징 | 없음 (배열 통째로)    | **있음**                 |
| 직접 등록   | 있음 (`POST`)         | **없음** — CSV 가 유일   |
| 수정 범위   | 미연결 · 직접등록이면 전체 | **메모만**          |
| 중복 기준   | 거래일시 + 금액       | **승인번호**             |

**CSV 미리보기 응답** — `columns` · `sampleRows` · `recommendedType`(⚠️ `null` 로 올 수 있다) ·
`recommendedMapping`(필수 8 + 선택 4: `approvalNo` · `issuedDate` · `supplierBizNo` ·
`buyerBizNo` · `buyerName` · `supplyAmount` · `taxAmount` · `totalAmount` /
`itemName` · `ceoName` · `subBizNo` · `memo`, 각 `…Column`)

**CSV 업로드 응답** — `totalRows` · `savedCount` · `duplicateCount` ·
`duplicateRows[]`(⚠️ 입출금과 달리 **`approvalNo` · `reason`** 이다)
