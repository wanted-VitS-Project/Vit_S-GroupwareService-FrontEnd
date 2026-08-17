# 개발 완료 기록

> 📌 이 파일은 **끝낸 작업의 일지**예요.
> 작업(이슈)을 하나 완료할 때마다 AI에게 "완료" 또는 "WORKLOG에 기록해줘" 라고 하면 아래 양식으로 정리해줘요.
> 최신 기록이 위로 오도록 **위에 쌓아** 가세요.

---

## [2026-08-17] 정산 현황 화면 ✅

브랜치: `feat/education-certificate` 에서 이어짐 (정산 현황 작업분) · API: `.ai/API.md` 재무 도메인에 3종 추가

정산은 프로젝트 스텝 안의 블록에서 쓰는데, 그러면 "어느 프로젝트의 수금이 밀렸는지" 를 보려고
프로젝트를 하나씩 열어야 했다. 프로젝트 단위 집계 API 가 나와 그 값을 한 화면에 모았다.
재무 허브에서 `준비 중` 으로 막아 두었던 항목도 열었다.

### 변경 파일

| 파일 | 변경 |
| ---- | ---- |
| `src/components/DataTable.tsx` | 수정 — `renderExpanded` 추가 (행 아래 펼침 줄) |
| `src/features/finance/SettlementStatusList.tsx` | **생성** — 목록 · 필터 · 페이징 |
| `src/features/finance/SettlementRoundPanel.tsx` | **생성** — 회차 표 (매칭 처리자 · 계좌 펼치기) |
| `src/features/finance/{types,api,display}.ts` | 수정 — 타입 · 조회 3종 · 상태 판정 |
| `src/constants/endpoints.ts` | 수정 — `finance.settlements` 3경로 |
| `src/app/finance/settlements/page.tsx` | 수정 — stub → 화면 연결 |
| `src/features/finance/FinanceHub.tsx` | 수정 — `준비 중` 해제 |
| `src/features/project/useProjectPermission.ts` | 수정 — `queryFn: skipToken` |

### 주요 작업 내용

- **목록 10열** — 과업명 · 발주처 · 담당자 · 예정 금액 · 정산 진행 · 수입 · 지출 · 합계 · 예정일 · 상태
- **회차 표 8열** — 회차 · 회차명 · 예정일 · 예정 금액 · 계산서 · 입출금 · 매칭 처리자 · 상태
- 행을 누르면 그 자리에서 회차가 펼쳐진다 — 화면을 옮기지 않아 프로젝트를 연달아 훑는다
- 필터는 URL 에 담는다 (입출금 · 세금계산서 화면과 같은 방식)

### 부수 결정

- **`totalPlannedAmount` 를 `계약 금액` 이라 적지 않는다** — 회차 예정 금액의 합계다. 계약금액 필드는 응답에 없다
- **합계를 화면에서 계산하지 않는다** — 서버의 `totalAmount` 를 그대로 적는다. 수입 − 지출로 직접 구하면 서버 산식이 바뀌었을 때 화면 값만 어긋난다
- **프로젝트 상태는 화면이 판정한다** — 서버에 값이 없어(팀 확인) 지연 일수 · 미연결 건수 · 회차 수로 정한다. 급한 것부터 보이도록 입금 지연 → 계산서 지연 → 예정일 미입력 순으로 본다
- **회차가 0개인 프로젝트에는 미연결 배지를 세우지 않는다** — 연결할 것이 없어 0 인데 `완료` 로 적으면 정산을 마친 것처럼 읽힌다
- **계좌 정보는 열이 아니라 펼치기** — 출금 회차에만 있는 값이라 열로 세우면 대부분의 줄이 빈다
- **조건을 바꾸는 동안 직전 표를 남긴다** — 매번 자리표시로 되돌리면 필터를 만질 때마다 화면이 번쩍인다
- **회차는 `DataTable` 의 `renderExpanded` 로 행 바로 아래에 편다** — 표 밖에 두면 목록 끝에 열려 화면 밖이 된다. 공용 컴포넌트에 넣었지만 **넘기지 않으면 동작이 같아** 기존 표 8곳은 그대로다
- **펼친 칸은 왼쪽 굵은 선 + 들여쓰기 + 회색 바탕으로 구분한다** — 목록과 같은 층으로 보이면 어느 행에 딸린 것인지 읽히지 않는다
- **펼침 칸에 제목 · 닫기 버튼을 두지 않는다** — 제목은 바로 위 행과 같은 말이고, 닫기는 **행을 다시 누르면** 된다 (여는 자리와 닫는 자리를 같게)
- **왼쪽 정렬 열을 앞으로 모은다** — 금액 열이 연속으로 붙어야 자릿수가 세로로 줄을 맞춘다 (목록 · 회차 표 모두)

### 트러블슈팅

| 항목 | 내용 |
| ---- | ---- |
| 증상 | 프로젝트 화면에서 콘솔에 `No queryFn was passed` 오류 |
| 원인 | `useProjectPermission` 이 캐시만 읽으려고 `enabled: false` 만 두었다. react-query v5 는 `queryFn` 이 없으면 오류를 남긴다 |
| 해결 | `queryFn: skipToken` — "이 쿼리는 실행하지 않는다" 를 값으로 밝힌다 |

### 확인

- `npx tsc --noEmit` · `npx eslint src` · `prettier` 통과
- `/finance/settlements` 실동작 — 목록 10건 · 회차 3건 · 필터 · 열 폭 100% 확인
- ⏳ 페이지 넘김은 데이터가 1페이지뿐이라 미확인
## [2026-08-17] AI 블록 결과에 마크다운 적용 ✅

브랜치: `user/project` · API: 변경 없음 · 이슈: #188

AI 결과는 두 경로로 그려진다 — `parseResult` 가 구조를 못 찾으면 `MarkdownView`(TipTap)로 원문을 전부 렌더하고(마크다운 ✅), 구조를 찾으면 파서가 쪼갠 조각을 **생 문자열로** `<p>` 에 박았다(마크다운 ❌). 실제 결과는 거의 구조화 경로를 타므로 `**1,000만원**` 이 별표째 보이고, 소제목 · 문단 · 목록이 한 덩이로 뭉개졌다. 구조화 UI(심각도 색 막대 · 더보기 · 근거)는 그대로 두고 **조각마다 마크다운을 입히는** 쪽으로 고쳤다.

### 변경 파일

| 파일 | 변경 |
| ---- | ---- |
| `src/components/InlineMarkdown.tsx` | **생성** — 인라인 전용 렌더 (`**굵게**` · `*기울임*` · `***둘다***` · `` `코드` `` · `~~취소~~`) |
| `src/features/vitamate/types.ts` | 수정 (`ResultBlock` 신설 · `headingOf` 가 `level` 까지 반환 · `parseResult` 가 소제목/문단/목록 보존) |
| `src/features/vitamate/AnalysisResultView.tsx` | 수정 (`BlockList` · `HEADING_SIZE` 추가 · 지적 사항 제목·상세와 경고 배너에 `InlineMarkdown` 적용) |

### 주요 작업 내용

- **`ParsedResult.summary`·`warning` 을 `string` → `ResultBlock[]` 로** — 옛 파서는 구획을 `join(' ')` 으로 이어 붙여, `### 계약 금액` 같은 소제목과 문단·목록이 한 줄로 뭉개졌다. 이제 `heading`(+`level`) · `paragraph` · `item` 을 원문 순서대로 들고 나온다
- **빈 줄로 문단을 가른다** — 이어지는 줄은 마크다운의 soft wrap 처럼 한 문단으로 잇고, 빈 줄·제목을 지나면 새로 세운다
- **`#` 개수를 살렸다** — `headingOf` 가 `level` 을 함께 주고, `HEADING_SIZE` 로 크기를 나눈다. 기호 없는 꼴(`**제목**` · `제목:`)은 크기를 알 수 없어 3 으로 둔다
- **인라인은 TipTap 을 쓰지 않는다** — `MarkdownView` 는 문서 하나에 에디터 인스턴스 하나다. 지적 사항 20건이면 제목·상세로 40개가 뜬다. 문장 단위 자리에는 정규식 렌더러가 맞다

### 트러블슈팅

- **문제**: `***셋겹***` 이 `<strong>*셋겹</strong>*` 로 어긋났다
- **원인**: 굵게 패턴이 여는 `**` 다음의 세 번째 `*` 를 본문 첫 글자로 삼고, 닫는 짝을 뒤쪽 `***` 의 앞 두 글자에서 찾았다
- **해결**: `***…***` 대안을 **굵게보다 앞에** 두어 먼저 걸리게 했다 (정규식 대안은 앞에서부터 시도된다)
- **문제(2차)**: `*a **b** c*` 에서 여는 `*` 가 `**b` 의 첫 별표를 짝으로 잡아 엉뚱한 자리가 기울어졌다
- **해결**: 기울임 몸통만 별표를 **불허**(`FLAT`)로 바꿨다. 굵게 몸통은 허용(`NESTABLE`)이라 `**굵게 속 *기울임*…**` 은 그대로 살아난다. 못 알아본 자리는 별표를 글자로 남겨 둔다 — 엉뚱하게 기울어지는 것보다 낫다

### 부수 결정

- **`_밑줄_` 은 지원하지 않는다** — 파일명(`report_v2_final`)이 통째로 기울어지는 쪽이 강조를 놓치는 것보다 나쁘다. AI 결과의 강조는 거의 `*` 로 온다
- **링크(`[글](주소)`)도 뺐다** — 본문은 모델이 만든 문자열이라, 주소를 눌리게 하면 만들어낸 주소로 사용자를 보낼 수 있다
- **소제목 태그는 `h5` 고정** — 구획 위에 이미 `h4`(`SectionLabel`)가 있어, 원문 `#` 개수를 태그로 옮기면 문서 제목 층이 뒤집힌다. **보이는 크기만** 나눈다
- **경고 배너는 `BlockList` 를 돌려쓰지 않는다** — 배너 안은 색이 하나(`text-yellow-text`)여야 경고로 읽힌다. 본문 색이 섞이면 배너가 배너로 보이지 않는다
- **근거(`citation.excerpt`)는 그대로 둔다** — 문서에서 그대로 떠 온 발췌라 마크다운이 아니다
- **구조화 파싱을 버리고 전체를 `MarkdownView` 로 돌리는 안은 채택하지 않았다** — 심각도 색 막대 · 더보기 · 근거 접기를 함께 잃는다

### 코드 리뷰 반영 (CodeRabbit)

- **`***…***` 안쪽도 재귀 렌더** — 이 분기만 문자열을 그대로 넣어, `***중요한 `` `코드` ``***` 의 안쪽 문법이 기호째 보였다. 별표는 못 오지만(`FLAT`) 코드·취소선은 올 수 있다
- **경고 배너가 구조를 폈던 것** — `heading`·`item` 을 모두 `<p>` 로 그려 소제목의 층과 `<ul>`/`<li>` 의미가 사라졌다. `BlockList` 에 `className` 을 열어 **색·크기만** 배너 쪽으로 바꿔 물려주고 구조는 요약과 같은 것을 쓴다
- **`findings` 구획의 일반 줄이 요약으로 샜던 것** — `## 지적 사항` 뒤 첫 줄이 목록이 아니면 아래로 흘러 `요약`에 쌓였다. 지적 사항 구획은 이제 **모든 갈래가 `continue`** 로 끝나고, 항목이 없으면 그 줄을 첫 항목으로 세운다
- 같은 실수를 타입으로 막았다 — `blocksOf`·`pushText` 가 `Exclude<Bucket, 'findings'>` 만 받는다. 지적 사항 갈래가 전부 `continue` 라 뒤에서는 TS 가 `'summary' | 'warning'` 으로 좁혀 준다

### 검증

| 항목 | 결과 |
| ---- | ---- |
| `parseResult` 표본 파싱 (소제목 · 문단 · 목록 · 지적 2건 · 경고) | ✅ 구획·`level`·항목 분리 확인 · 폴백(`null`) 유지 |
| 리뷰 회귀 — `## 지적 사항` 뒤 목록 아닌 줄 | ✅ 요약으로 새지 않고 첫 항목으로 남음 |
| 삼중 강조 중첩 (`***…`` `코드` ``***` · `***~~취소~~***`) | ✅ 안쪽 문법 렌더 |
| 인라인 패턴 17개 케이스 (`3 * 4 * 5` · `2 ** 3` · `snake_case` · 짝 없는 `**` 포함) | ✅ 오탐 0 |
| `npx tsc --noEmit` · `eslint` · `prettier --check` | ✅ 에러 0 |
| 실화면 동작 확인 | ⏳ 남음 |

---

## [2026-08-17] 텍스트 블록 임시저장 UX 개선 — 이탈 시점만 묻는다 ✅

브랜치: `user/project` · API: 변경 없음 · 이슈: #188

임시저장이 **두 군데서 작동**하고 있었다 — 타이핑이 멎으면 800ms 뒤 자동으로 `auto` 칸에 남기고, 나갈 때 또 물었다. 그래서 (1) 임시저장함이 사용자가 만들지 않은 자동 칸으로 덮이고, (2) `임시저장` 을 눌러 이미 안전한 상태인데도 나갈 때 똑같이 확인창이 떴다. 초안이 생기는 자리를 **사용자가 남길 때 한 곳**으로 모으고, 확인창은 **정말 잃을 게 있을 때만** 띄우게 정리했다.

### 변경 파일

| 파일 | 변경 |
| ---- | ---- |
| `src/features/block/textDraft.ts` | 수정 (`putAutoDraft` 삭제 · `addManualDraft` → `saveTextDraft` · `kind`/`TextDraftKind` 제거 · 넘침 처리 단순화) |
| `src/features/block/TextBlockModal.tsx` | 수정 (디바운스 자동저장 `useEffect` 삭제 · `keptDraft` 파생값 도입 · 이탈 확인 조건 · 푸터 · 버튼 · 목록 배지) |

### 주요 작업 내용

- **자동저장 폐지** — `DRAFT_DEBOUNCE_MS` 디바운스 `useEffect` 와 `putAutoDraft` 를 걷어냈다. 초안은 `임시저장` 버튼 · 이탈 확인창 · 충돌 확인창 세 자리에서만 생긴다
- **`auto`/`manual` 구분 제거** — 자동 칸이 없으니 종류가 하나다. 목록의 `직접`/`자동` 배지, 넘침 시 "자동 칸은 남긴다" 예외, 저장·이탈 때의 `kind === 'auto'` 청소 로직이 모두 사라졌다
- **이탈 확인은 `isDirty && !keptDraft` 일 때만** — `keptDraft` 는 "지금 편집 중인 내용과 똑같은 초안" 이다. `임시저장` 을 누른 뒤 · 초안을 되살린 직후엔 잃을 게 없어 확인창 없이 닫힌다
- **`임시저장` 버튼이 상태를 보여 준다** — 같은 내용이 이미 있으면 `임시저장됨` 으로 바뀌며 잠기고, 푸터도 그 초안의 시각을 읽는다

### 부수 결정

- **`savedAt` 상태를 없애고 `keptDraft` 에서 파생시켰다** — 별도 상태로 두면 임시저장 후 본문을 고쳐도 "임시저장됨 오후 3:14" 가 그대로 남아, 안 남은 내용을 남았다고 알리게 된다. 목록에서 내용을 대조하면 표기가 언제나 사실과 맞는다
- **`저장 안 하고 나가기` 는 임시저장함을 건드리지 않는다** — 예전엔 자동 칸을 지웠지만, 이제 담긴 초안은 모두 사용자가 남긴 것이다. 비우기는 `전체 비우기` 한 곳이 맡는다
- **옛 저장값은 계속 읽는다** — `normalize` 가 `kind` 필드를 그냥 무시한다. 이미 브라우저에 쌓인 `auto` 초안도 일반 초안으로 목록에 뜬다 (버리면 사용자 글이 사라진다)
- **남은 대가**: 저장 전에 **탭 · 브라우저를 닫으면** 본문이 사라진다 — 예전 자동저장이 덮던 자리다. `beforeunload` 경고로 메울지는 미결

### 코드 리뷰 반영 (CodeRabbit)

- **충돌 확인창이 임시저장 실패를 무시했다** — `임시저장하고 다시 불러오기` 가 `keepDraft()` 의 반환을 버리고 재조회·닫기를 그대로 실행했다. 사생활 보호 모드·용량 초과로 못 남긴 경우, 사용자는 "임시저장하고" 를 골랐는데 글을 잃고, **재조회가 서버 본문을 덮어 되돌릴 길도 없다**
- 실패하면 확인창만 닫고 편집기를 유지한다 (`if (!kept) return`) — 푸터가 "이 브라우저에 임시저장할 수 없습니다" 를 알린다. 나가기 확인창이 이미 쓰던 방침과 같게 맞췄다

### 검증

| 명령 | 결과 |
| ---- | ---- |
| `npx tsc --noEmit` | ✅ 에러 0 |
| `npx eslint` (변경 2파일) | ✅ 에러 0 · 경고 0 |
| 실화면 동작 확인 | ⏳ 남음 |

---

## [2026-08-17] 모달에 남은 스켈레톤 제거 — 스피너로 통일 ✅

브랜치: `ref-ys` · API: 변경 없음 · 이슈: #186
(#172 모달 로딩 스피너 통일의 **누락분 정리**)

#172 는 `Skeleton` 컴포넌트를 쓰는 자리만 훑어서, **`animate-pulse` 로 직접 만든 뼈대**를 쓰던 모달 10곳이 그대로 남아 있었다. 크기가 제각각인 모달에서 어긋난 뼈대는 내용이 도착할 때 오히려 창을 튀게 만들므로 남은 곳도 모두 `LoadingSpinner` 로 맞췄다.

### 변경 파일

| 파일 | 변경 |
| ---- | ---- |
| `src/features/file/FileViewerModal.tsx` | 수정 (버전 이력 · 미리보기) |
| `src/features/file/LazyFileViewer.tsx` · `block/FileBlock.tsx` | 수정 (문서 뷰어 청크 폴백) |
| `src/features/companyDocument/CompanyDocumentViewerModal.tsx` | 수정 (버전 목록 · 미리보기 2곳) |
| `src/features/approval/ApprovalDocumentModal.tsx` | 수정 (PDF 뷰어 폴백) |
| `src/features/block/ImageEditModal.tsx` | 수정 (이미지 목록) |
| `src/features/vitamate/AnalysisRunModal.tsx` · `FileVersionPickerModal.tsx` | 수정 (검토 유형 · 문서 목록) |
| `src/features/vitamate/AnalysisHistoryPanel.tsx` | 수정 (분석 이력 · 결과) |
| `src/features/bidding/NoticeSummaryCard.tsx` | 수정 (`SummarySkeleton` 함수 삭제 — `AI 요약` 모달 전용 컴포넌트) |

### 주요 작업 내용

- **누락분을 `animate-pulse` 로 찾았다** — `Skeleton` 만 훑으면 손으로 만든 뼈대가 걸리지 않는다. 이후 스윕에서도 두 가지를 함께 봐야 한다
- **뷰어 자리는 높이를 유지한 채 스피너만** — `h-[600px]` · `h-[560px]` 같은 뷰어 자리는 그대로 두고 안쪽만 스피너로 바꿨다. 자리까지 없애면 미리보기가 도착할 때 모달이 통째로 늘어난다
- **`SummarySkeleton` 은 함수째 삭제** — `NoticeSummaryCard` 는 `AI 요약` 모달에서만 쓰이는 컴포넌트라 남길 이유가 없다

### 부수 결정

- **`SidePanelFallbackHeader` 는 유지 (A안)** — 유지 대상인 곁패널(`연결된 이슈` · `블록 활동 기록`)의 헤더 자리라 떼면 청크 도착 때 헤더가 튄다. `비타메이트 분석 이력` 도 같은 헤더를 쓰지만, 그것만 떼려고 파라미터를 늘리지 않는다
- **"진행 중" 점은 스켈레톤이 아니다** — `NoticeReviewModal` · `NoticeSummaryCard` 의 `size-3 animate-pulse rounded-pill bg-btn-primary` 는 폴링 중임을 알리는 표시라 대상에서 뺐다
- **블록 본문은 모달이 아니다** — `TextBlock` · `ImageBlock` · `BlockBoard` · `AiBlock` 의 자리막이는 스텝 화면 위의 요소라 그대로 둔다. 사이드바 · 페이지 스켈레톤도 마찬가지

---

## [2026-08-16] 전사 파일 탐색기 API 전환 · 블록 삭제 동작 반영 ✅

브랜치: `feat/admin-file-tree` · API: `.ai/API.md` 151~154 신설 · 47 · 105 · 106 갱신

백엔드가 **전사 파일 탐색 전용 API 4종**(§14)과 **블록 삭제 시 파일 동반 휴지통행(D안)** 을 내려
프론트를 그 계약으로 옮겼다. 탐색기가 안고 있던 제약 두 개(참여하지 않은 프로젝트에서 403 · 프로젝트당 500건 상한)가
이 API 로 함께 사라졌다.

### 변경 파일

| 파일 | 변경 |
| ---- | ---- |
| `src/constants/endpoints.ts` | 수정 — `files.adminTree` 4종 추가 |
| `src/features/file/types.ts` | 수정 — `AdminTreeProject` · `AdminTreeStage` · `AdminTreeStep` 추가, 소유 구조 주석 D안 반영 |
| `src/features/file/api.ts` | 수정 — `getAdminTreeProjects` · `getAdminTreeStages` · `getAdminTreeSteps` · `getAdminStepFiles` 추가 |
| `src/features/file/errorCodes.ts` | 수정 — `stepNotFound`(`FILE_STEP_NOT_FOUND`) 추가 |
| `src/features/file/AdminFileExplorer.tsx` | 수정 — 트리 API 로 전면 교체 (단계별 lazy 조회) |
| `src/features/file/AdminFileList.tsx` | 수정 — 스텝 자리에서 §14.4 로 전환 · 필터 줄 숨김 · 404 안내 |
| `src/features/block/BlockDeleteModal.tsx` | 수정 — 409 두 종류 분기 · 문서 휴지통행 안내 |
| `src/features/project/step/StepDeleteModal.tsx` | 수정 — cascade 안내 · 409 `FILE_APPROVAL_IN_PROGRESS` 분기 |

### 주요 작업 내용

- **탐색기를 전용 API 로 교체** — `프로젝트 → 스테이지 → 스텝` 을 열 때마다 자식만 부른다. 회사 스코프라 관리자가 참여하지 않은 프로젝트도 열린다
- **스텝 파일을 스텝 API 로** — 프로젝트 파일 500건(100×5)을 미리 받아 화면에서 나누던 방식을 걷어내고 `GET /admin/files/steps/{stepId}/files` 로 페이징한다
- **미분류 칸을 서버 값으로** — `stageId: null` 버킷을 그대로 쓰고, 프론트가 스텝을 세어 만들던 칸을 제거했다
- **블록 · 스텝 삭제 안내와 차단 처리** — "문서는 휴지통으로 이동" 을 확인 문구에 넣고, 409 를 되물음(`APPROVAL_DELETE_CONFIRM_REQUIRED`)과 거부(`FILE_APPROVAL_IN_PROGRESS`)로 갈랐다

### 부수 결정

- **스텝 안에서는 검색 · 확장자 필터를 숨긴다** — §14.4 에 그 조건이 없다. 입력만 남겨 두면 쳐도 아무 일이 없어 고장으로 읽힌다. 조건 검색은 한 단계 위(전사 목록 142번) 담당으로 정리했다
- **개수 힌트(`스텝 N개` · `파일 N개`)를 뺐다** — 응답에 개수가 없고, 스텝마다 파일 API 를 부르면 요청이 스텝 수만큼 늘어난다. 필요해지면 `stepCount` · `fileCount` 를 백엔드에 요청한다
- **`blockDeleted` 배지는 유지** — D안 이후에도 **복구된 고아**가 `blockDeleted: true` 로 문서함에 나타난다
- **`FILE_STEP_NOT_FOUND` 는 코드 상수 한 곳에만 둔다** — `features/file/errorCodes.ts`. 분기는 status 가 아니라 `code` 로 한다는 이 도메인 규칙을 그대로 따른다

### 확인

- `npx tsc --noEmit` · `npx eslint src` · `npm run build` 통과
- API 4종 응답 필드 · 에러코드가 구현과 일치하는지 대조 완료
- `/settings/files` 실동작 확인 — 프로젝트 14건 → 스테이지(미분류 포함) → 스텝 → 스텝 파일 조회, 블록 삭제 후 휴지통 이동 · 복구까지 확인
- 확인 중 발견: 삭제된 스텝의 문서와 복구된 문서는 탐색기에 나오지 않는다 (`STATE.md` 백로그 등록)
## [2026-08-16] 권한 없는 사용자에게 노출되던 수정 버튼 정리 · 내 권한 표시 ✅ (#180)

브랜치: `ref-ys` · API: 변경 없음 · 이슈: #180

`#178` 이 403 을 **잘 보여주는** 처리였다면, 이건 그 403 이 **나기 전에** 버튼을 감추는 쪽이다.
먼저 화면 전체를 감사했더니 설정 · 참여자 · 사이드바 · 이슈 보드는 이미 막혀 있었고,
**블록 보드에만 권한 판정이 통째로 없었다** — 실제 작업은 거기에 집중됐다.

### 감사 결과 — 요청받은 곳은 이미 막혀 있었다

| 화면                          | 상태                                |
| ----------------------------- | ----------------------------------- |
| 프로젝트 설정 5개 섹션        | ✅ 이미 `canEdit` 적용              |
| 참여자 권한 변경 · 제거       | ✅ 이미 적용 (자기 행 잠금까지)     |
| 사이드바 스테이지 · 스텝 조작 | ✅ 이미 적용                        |
| 이슈 보드                     | ✅ 이미 적용 (`step?.myPermission`) |
| **블록 보드**                 | ❌ **판정 없음 — 이번 작업 대상**   |

### 변경 파일

| 파일                                                                      | 변경                                                                       |
| ------------------------------------------------------------------------- | -------------------------------------------------------------------------- |
| `src/features/block/BlockPermissionContext.tsx`                           | **신규** — 보드 → 카드 → 본문으로 판정을 흘린다 (기본값 `true`)            |
| `src/features/project/permissions.ts`                                     | **신규** — 참여자 추가 판정 단일 소스 (`ADMIN` 예외)                       |
| `src/features/project/PermissionBadge.tsx`                                | **신규** — 내 권한 배지 (편집 파랑 · 열람 회색)                            |
| `src/features/project/useProjectSteps.ts`                                 | 수정 — `useStepCanEdit` 추가 (스텝 목록 캐시에서 `myPermission` 만 꺼낸다) |
| `src/features/block/StepBlocks.tsx`                                       | 수정 — `블록 추가` · `배치 편집` 가리기, 보드에 `canEdit` 전달             |
| `src/features/block/BlockBoard.tsx`                                       | 수정 — `canEdit` prop + `BlockCanEditProvider` 로 감싸기                   |
| `src/features/block/BlockCard.tsx`                                        | 수정 — `⋯` 의 수정 · 스텝 이동 · 삭제 가리기                               |
| `src/features/block/ChecklistBlock.tsx` · `TextBlock.tsx`                 | 수정 — `편집` 버튼 가리기                                                  |
| `src/features/project/member/MemberList.tsx`                              | 수정 — `참여자 추가` 를 `canManageMembers()` 판정으로                      |
| `src/components/ProjectSidebar.tsx`                                       | 수정 — 권한 배지 노출 · 아바타 줄 `+` 를 같은 판정으로                     |
| `src/features/project/settings/ProjectSettings.tsx`                       | 수정 — 제목 줄에 권한 배지                                                 |
| `src/features/block/types.ts` · `BlockTypeIcon.tsx` · `AddBlockModal.tsx` | 수정 — 블록 유형 2종 제거 · 제목 입력 위치 이동                            |

### 주요 작업 내용

- **블록 보드 권한 게이트.** `ProjectStep.myPermission` 이 응답에 이미 있는데 아무도 보지 않고 있었다. 카드가 유형별 본문을 한 겹 거쳐 그려져 prop 으로는 못 나른다 — `BlockDragContext` · `BlockMembersContext` 와 같은 방식으로 컨텍스트를 썼다. 잠근 것은 `블록 추가` · `배치 편집` · 카드 `⋯`(수정 · 이동 · 삭제) · 체크리스트 `편집` · 텍스트 `편집` 이고, **읽기(연결된 이슈 · 활동 기록 · 새로고침)는 남겼다** — 메뉴를 통째로 감추면 열람 권한인 사람이 그 둘로 가는 길까지 잃는다
- **참여자 추가는 `VIEWER` 에게만 숨긴다.** 전사 `ADMIN` 은 프로젝트 권한과 무관하게 예외다. 사이드바 아바타 줄의 `+` 표시도 같은 판정을 따라야 모달 안 버튼과 어긋나지 않는다
- **내 권한 배지.** 사이드바(하위 전 화면에서 보인다) · 설정 제목 줄 두 곳. 판정 전(`null`)에는 **아무것도 그리지 않는다** — 기본값을 `열람` 으로 두면 편집자에게 잠깐 `열람` 이 보였다 바뀌어 권한이 낮아진 것으로 오해한다
- **블록 유형 2종 제거.** 본문이 없어 만들어도 빈 껍데기만 붙던 `PAYMENT_CONFIRM`(입금 확인) · `TAX_INVOICE_VIEW`(세금계산서 조회)를 타입 유니온 · `BLOCK_TYPES` · 아이콘까지 지웠다 (10종 → 8종). `블록 추가` 모달의 제목 입력은 유형 선택 **위**로 올렸다

### 트러블슈팅

| 문제                                            | 원인                                                                                                                                            | 해결                                                                                                                                        |
| ----------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------- |
| 요구가 "소유자만"이었는데 구현 불가             | 소유자(`createdBy`)는 **생성 응답(128)에만** 있다. 상세(6) · 참여자 목록(45)에는 없어 설정 화면 · 사이드바에서는 누가 소유자인지 알 방법이 없다 | 사용자 확인 결과 **편집 권한 기준이 맞았다** — 소유자 개념을 걷어내고 `EDITOR` + `ADMIN` 예외로 확정. 근거는 `permissions.ts` 주석에 남겼다 |
| 블록 유형을 `BLOCK_TYPES` 에서 바로 지우면 위험 | 이 배열은 추가 선택지이자 **기존 블록의 라벨 · 아이콘 색 조회표**다 (`BlockCard` · `IssueBadges`)                                               | 실 데이터에 해당 블록이 없음을 확인한 뒤 완전 삭제. 남아 있었다면 이름 없는 회색 카드가 됐을 것이다                                         |
| 판정 로딩 중 버튼이 깜빡일 우려                 | 스텝 목록이 도착하기 전에는 `myPermission` 이 `undefined`                                                                                       | `undefined` 는 `false` 로 떨어뜨렸다 — 없는 사람에게 잠깐 보였다 사라지는 것보다, 있는 사람에게 늦게 나타나는 편이 안전하다                 |

### 부수 결정

- **판정은 프로젝트 권한이 아니라 스텝 권한이다** — 스텝별 오버라이드(STP-011)가 있어 둘이 다를 수 있다. 프로젝트 권한으로 대신 판정하면 안 된다
- **`BlockCanEditContext` 기본값은 `true`** — 보드 밖에서 쓰이는 카드(연결 이슈 패널 등)까지 조용히 잠기면 권한이 있는데도 아무것도 못 하는 화면이 생긴다. 잠그는 쪽이 명시적으로 감싼다
- **화면 단 안내일 뿐 실제 차단은 서버 몫이다** — 버튼을 감춰도 API 는 계속 403 으로 막아야 한다
- **파일 · 이미지 블록 본문은 이번 범위에서 제외** — 쓰기 버튼 39개+ 가 읽기(다운로드 · 미리보기 · 확대)와 섞여 있어 하나씩 판별이 필요하다. 컨텍스트는 깔아뒀으므로 후속에서 `useBlockCanEdit()` 만 부르면 된다

### develop 병합 메모 (#178 이후)

`ref-ys` 가 `8d6c7c3` 기준이라 `origin/develop`(`4baf58a`)을 fast-forward 로 당겼다. **충돌 0건** — develop 이 바꾼 4개 파일(`CurrentUserProvider` · `PageAccessGate` · `EmployeeSearchInput` · `WORKLOG`)과 이 작업의 파일이 하나도 겹치지 않는다. `CurrentUser` 타입 · `role` 도 그대로라 의미 충돌도 없다.

**#178 과 방향이 같다** — 그쪽은 403 을 `/forbidden` 대신 본문 자리에서 보여주고, 이 작업은 그 403 이 날 버튼을 애초에 감춘다. 예방과 대처가 짝을 이룬다.

### 확인

- `npm run build` · `npm run lint` 통과 (develop 반영 후 재검증)

---

## [2026-08-16] 사원 검색 칸이 화면을 통째로 튕기던 문제 ✅

브랜치: `fix/employee-search-forbidden` · API: 변경 없음

`develop` 를 받은 팀원이 **프로젝트 생성 · 스텝(결재 블록) 진입이 안 된다**고 알려와 원인을 잡았다.
사원 검색 칸이 마운트되면서 **ADMIN 전용 사원 목록 API** 를 불렀고, 그 403 이 전역 처리로
`/forbidden` 까지 이어지며 화면이 통째로 넘어갔다. 원인(호출)과 증상(표시) 둘 다 고쳤다.

### 변경 파일

| 파일                                             | 변경                                                                        |
| ------------------------------------------------ | --------------------------------------------------------------------------- |
| `src/features/employee/EmployeeSearchInput.tsx`  | 수정 — 전 사원 목록 프리페치를 ADMIN 으로 한정                              |
| `src/features/auth/CurrentUserProvider.tsx`      | 수정 — 권한 403 을 `/forbidden` 이동 대신 `PermissionDeniedContext` 로 전달 |
| `src/features/pagePermission/PageAccessGate.tsx` | 수정 — 403 안내를 본문 자리에서 함께 그림                                   |

### 트러블슈팅

| 항목 | 내용                                                                                                                                                             |
| ---- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 증상 | 사원(MEMBER) 계정이 `/projects/new` · 결재 블록이 있는 스텝에 들어가면 권한 오류 전체 화면                                                                       |
| 응답 | `GET /api/v1/employees?size=200` → 403 `ACC_ADMIN_REQUIRED` (명세 30번은 ADMIN 전용)                                                                             |
| 원인 | `EmployeeSearchInput` 이 빈 칸 목록용으로 그 API 를 마운트 시 호출. `.catch(() => {})` 로 삼켰지만 **전역 403 이벤트(`lib/api.ts`)가 먼저 발사**돼 소용이 없었다 |
| 해결 | 호출 자체를 ADMIN 으로 한정. 이름 검색(`/employees/search`)은 전원 사용 가능이라 기능은 유지된다                                                                 |
| 부가 | 같은 칸을 쓰는 화면 4곳(프로젝트 생성 · 결재 상신 · 결재자 교체 · 참여자 추가)이 함께 풀렸다                                                                     |

### 부수 결정

- **권한 403 은 셸 안 본문에만 그린다** — `/forbidden` 은 `BARE_LAYOUT_PATHS` 라 사이드바 · 헤더까지 사라져, 사이드바에서 누른 결과가 전체 화면 오류가 됐다. 팀 결정(본문 표시)이 `PageAccessGate` 에만 적용돼 있었고 전역 403 경로가 예전 그대로였다
- **경로를 함께 저장해 자동으로 푼다** — `{ pathname, code }` 로 담아 화면을 옮기면 값이 어긋나 풀린다. 효과에서 상태를 되돌리지 않는 이 저장소의 기존 방식과 같다
- **`/forbidden` 라우트는 남긴다** — 셸 밖(`BARE_LAYOUT_PATHS`)에서 403 을 받는 경로가 계속 쓴다
- **`PagePermissionList` 의 같은 호출은 그대로 둔다** — ADMIN 전용 화면(`/settings/page-permissions`)이라 403 이 날 수 없다

### 확인

- `npx tsc --noEmit` · `npx eslint src` · `npm run build` 통과
- 사원 계정으로 `/projects/new` 진입 정상 확인 (2026-08-16)

## [2026-08-16] 디자인 일관성 스윕 — 모달 셸 · 타이포 · 페이지 제목 · 색 토큰 ✅

브랜치: `style` · API: 변경 없음 · 이슈: #176
(모달 버튼 통일에 이어, 조사에서 나온 나머지 이탈을 한 번에 정리한 건)

버튼 스윕 뒤 남은 네 갈래를 정리했다 — **모달 껍데기 3종 · `text-[13px]` 우회 · 손수 만든 페이지 제목 · 하드코딩 색**. 새 규칙을 만든 곳은 `PageTitle` 의 설명 슬롯과 AI 색 토큰 둘뿐이고, 나머지는 이미 있던 토큰·컴포넌트로 합류시켰다.

> 🔀 **2026-08-16 `develop`(#174 화면 다듬기 스윕) 병합 후 재검토 완료.** 아래 `develop 병합 메모` 참고 — 토큰 **값**이 바뀌어 일부 치환의 결과 색이 달라졌고, 삭제된 화면 2개는 작업 대상에서 빠졌다.

### 변경 파일

| 파일                                                                                                                                                                                    | 변경                                                                                                                               |
| --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------- |
| `src/app/globals.css`                                                                                                                                                                   | 수정 (`--color-red-text-deep` · `--color-ai-primary` · `--color-ai-primary-hover` 추가, `--color-btn-danger-hover` 를 참조로 전환) |
| `src/components/Modal.tsx`                                                                                                                                                              | 수정 (`DEFAULT_PANEL` 그림자 `shadow-lg` → `shadow-2xl`)                                                                           |
| `src/components/PageTitle.tsx`                                                                                                                                                          | 수정 (`description` 슬롯 추가 · 설명 유무로 정렬 분기)                                                                             |
| `src/components/Breadcrumb.tsx`                                                                                                                                                         | 수정 (`mb-2` — 아래 제목과의 간격을 자기가 갖는다)                                                                                 |
| `src/components/DataTable.tsx` · `bidding/NoticeSkeletons.tsx`                                                                                                                          | 수정 (`rounded-xl` → `rounded-base`)                                                                                               |
| `src/features/**` 모달 6개 (`CollectionConditionFormModal` · `NoticeProjectConvertModal` · `BulkUploadModal` · `CashFlowFormModal` · `CashFlowMatchModal` · `TaxInvoiceMatchModal`)     | 수정 (`shadow-lg` → `shadow-2xl`)                                                                                                  |
| `src/features/**` 반경 19곳 (`login/page` · `IssueBoard` · `IssueDetailModal` · `BlockIssuesPanel` · `ProjectIssues` · `BlockCard` · `PageAccessGate` · `FormFields` 2종 · bidding 7곳) | 수정 (`rounded-xl`/`rounded-2xl` → `rounded-base`)                                                                                 |
| `src/features/**` 타이포 12개 파일 (`DashboardSchedule` 11 · `ProjectCard` 11 · `MyProjectList` 5 · `ProjectSummaryCards` 3 · `IssueDetailModal` 3 · `DashboardNotifications` 3 외)     | 수정 (`text-[13px]` → `text-detail`, 43곳)                                                                                         |
| `src/features/**` 페이지 제목 18개 파일                                                                                                                                                 | 수정 (손수 만든 `<h2>` → `PageTitle`)                                                                                              |
| `src/features/finance/FinanceHub.tsx` · `employeeGroup/EmployeeGroupList.tsx`                                                                                                           | 수정 (`PageTitle` 밖에 붙이던 설명을 `description` 으로)                                                                           |
| `src/features/**` 색 15개 파일 (vitamate 4 · approval 5 · `ChecklistBlock` · `DashboardNotifications` · `NotificationList` · `activityLog/types` · `issue/types` · `NoticeReviewModal`) | 수정 (하드코딩 hex → 토큰, 52곳)                                                                                                   |
| `src/features/block/types.ts`                                                                                                                                                           | 수정 (AI 블록 아이콘색만 `var(--color-ai-primary)` 참조)                                                                           |

### 주요 작업 내용

- **모달 셸 통일** — `Modal` 의 `DEFAULT_PANEL` 이 `shadow-lg` 라, `className` 을 안 넘긴 모달만 그림자가 얕았다. 다수파(`shadow-2xl` 31개)로 기본값을 맞추고, 직접 `shadow-lg` 를 붙이던 모달 6개도 함께 올렸다. `rounded-xl`(12px, `rounded-base` 와 같은 값) · `rounded-2xl`(16px, 토큰에 없음) 19곳을 `rounded-base` 로 모았다
- **`text-[13px]` → `text-detail`** 43곳. `--text-detail` 이 13px 로 들어온 뒤로 값이 같아 남길 이유가 없었다. `MarkdownEditor` 의 `[&_h2]:text-[13px]` 도 함께 바뀌어 `[&_h3]:text-label` 과 표기가 맞춰졌다
- **`PageTitle` 에 설명 슬롯 추가 후 18개 화면 적용** — 제목 아래 한 줄 설명이 컴포넌트 밖에 있어 `mt-1`/`mt-2`, `text-label`/`text-caption` 로 갈려 있었다. 설명을 컴포넌트가 들고, 브레드크럼 아래 간격은 `Breadcrumb` 이 `mb-2` 로 갖는다
- **색 토큰화 52곳** — ① 값이 같은 토큰이 이미 있던 것(`#00BC7D`→`step-done`, `#FFE2E2`/`#E7000B`→`red-bg`/`red-text`, `#EBE7FF`/`#7C3AED`→`purple-bg`/`purple-text`) ② AI 보라 `#4F39F6` 을 `--color-ai-primary` 로 승격. 파일마다 갈리던 hover 두 값(`#4430d6` 5곳 · `#4429E0` 4곳)을 `--color-ai-primary-hover` 하나로 합쳤다

### 트러블슈팅

| 문제                                                   | 원인                                                                     | 해결                                                                                                      |
| ------------------------------------------------------ | ------------------------------------------------------------------------ | --------------------------------------------------------------------------------------------------------- |
| `#C10007` 에 맞는 토큰이 `--color-btn-danger-hover` 뿐 | 값은 같은데 **버튼 hover 용 이름**이라, 배지 글자색에 쓰면 뜻이 어긋난다 | `--color-red-text-deep` 를 신설하고 `--color-btn-danger-hover` 가 이를 참조하게 했다. 값은 한 곳에만 있다 |
| `PageTitle` 적용 후 브레드크럼 아래 간격이 두 번 잡힘  | 제목 블록의 `mt-2` 와 브레드크럼 감싼 `<div className="mb-6">` 이 겹쳤다 | 래퍼 `div` 를 걷어내고 간격을 `Breadcrumb` 의 `mb-2` 하나로 모았다                                        |
| `prettier --write` 가 무관한 11개 파일을 수정          | 저장소에 기존 포맷 드리프트가 있다 (버튼 PR 때와 같은 파일들)            | 이번에도 되돌렸다 — 별도 `[CHORE]` 로 한 번에 정리할 것                                                   |

### develop 병합 메모 (#174 이후)

`style` 이 `develop` 보다 6커밋 뒤라 fast-forward 후 작업을 얹었다. 충돌 14건 중 코드 12건 · 문서 1건 · 삭제 2건.

| 쟁점                             | develop                                            | 이 작업                                                      | 결론                                                                                 |
| -------------------------------- | -------------------------------------------------- | ------------------------------------------------------------ | ------------------------------------------------------------------------------------ |
| `--color-step-done`              | `#00bc7d` → **`#00a76f`**                          | `ChecklistBlock` 의 `#00BC7D` 를 `step-done` 으로 치환       | **치환 유지** — 토큰을 따르는 게 목적이다. 체크 표시가 조금 어두워진다 (의도된 결과) |
| `--color-purple-bg`              | `#ebe7ff` → **`#eef2ff`**                          | `DashboardNotifications` 의 `#EBE7FF` 를 `purple-bg` 로 치환 | **치환 유지** — 같은 이유. `보고` 배지 배경이 조금 밝아진다                          |
| 결재 목록 탭 색                  | `#4F39F6` → `btn-primary`(파랑)                    | `ai-primary`(보라)                                           | **develop 채택** — 다른 화면 탭과 같은 파랑이 맞다                                   |
| 공고 검토 체크박스               | `accent-[#4F39F6]` → `accent-btn-primary`          | `accent-ai-primary`                                          | **develop 채택** — 체크박스 accent 는 전사 17곳이 `btn-primary` 다                   |
| 결재 · 알림의 나머지 보라        | (손 안 댐)                                         | `ai-primary` 로 치환했다 되돌림                              | **원본 HEX 유지** — 담당 구역이 달라 손대지 않고 목록만 인계했다 (아래 참고)         |
| 화면 설명 문구                   | 짧게 다듬음 (`조직 부서를 관리합니다.` 등)         | 옛 긴 문구                                                   | **develop 채택** — 문구는 #174 의 결과물이다. 구조만 `PageTitle` 로                  |
| `Modal` 의 `BASE_PANEL`          | `max-h-[calc(100dvh-2rem)]` 추가                   | 변경 없음                                                    | **develop 채택** + 이 작업의 `DEFAULT_PANEL` 그림자 변경을 함께 유지                 |
| 로그인 카드                      | 로고 판 추가 (`rounded-2xl` 유지)                  | `rounded-base`                                               | **양쪽 병합** — 로고는 develop, 반경은 이 작업                                       |
| `그룹 관리` · `CompanyFileAdmin` | **삭제** (기능 제거 · `AdminFileScreen` 으로 교체) | `PageTitle` 적용                                             | **develop 채택** — 파일이 없어져 작업 대상에서 빠졌다 (`PageTitle` 적용 23 → 21곳)   |

병합 뒤 4개 항목 모두 유지됨을 재확인했다 — 손수 모달 버튼 0 · `rounded-xl`/`2xl` 0 · `text-[13px]` 0 · `#4F39F6` 0 · 모달 `shadow-lg` 0.

**#174 가 이 작업과 같은 방향으로 움직인 것** — 전역 `cursor: pointer` 규칙을 `globals.css` 에 넣었다. 이 작업이 버튼 66개에서 `cursor-pointer` 를 떼어낸 것과 결론이 같다 (골격이 맡고 화면은 붙이지 않는다).

**AI 보라의 적용 범위는 비타메이트로 정했다 — 다만 결재 · 알림은 직접 고치지 않았다.** #174 는 결재 탭 · 공고 검토 체크박스 2곳만 파랑으로 되돌리고 나머지는 남겨 둬, 결재 화면에 보라와 파랑이 섞여 있다. 결재 · 알림은 AI 기능이 아니라 보라가 맞지 않지만 **담당 구역이 달라** 원본 HEX(`#4F39F6` · `#4430d6`)를 그대로 두고 자리 목록만 담당자에게 넘겼다.

| 파일                                             | 줄        | 자리                              |
| ------------------------------------------------ | --------- | --------------------------------- |
| `src/features/approval/ApprovalBlock.tsx`        | 359 · 374 | 결재 요청 버튼 (완료 표시 · 제출) |
| `src/features/approval/ApprovalDetailView.tsx`   | 351 · 450 | 회차 선택 칩 · `승인` 버튼        |
| `src/features/approval/ApprovalDraftForm.tsx`    | 146       | 임시저장 후 닫기 버튼             |
| `src/features/approval/ApprovalList.tsx`         | 444       | `내 차례` 배지                    |
| `src/features/approval/ApprovalProcessModal.tsx` | 22        | `승인` 확인 모달 버튼             |
| `src/features/notification/NotificationList.tsx` | 50        | 알림 분류 필터 칩                 |

이 자리들을 파랑으로 옮기려면 `bg-[#4F39F6]` → `bg-btn-primary`, `hover:bg-[#4430d6]` → `hover:bg-btn-primary-hover`, `border-[#4F39F6]` → `border-btn-primary`, `text-[#4F39F6]` → `text-text-primary-blue`, `bg-[#4F39F6]/5` → `bg-btn-primary/5` 로 바꾸면 된다.

이 작업이 토큰으로 옮긴 보라는 `features/vitamate/*`(26곳)와 `BLOCK_TYPES` 의 AI 블록 아이콘뿐이다. **범위 규칙은 `globals.css` 토큰 주석에 적어 뒀다** — 색을 빌려 쓰기 시작하면 "보라 = AI" 라는 뜻이 곧 무너지기 때문이다.

---

### 부수 결정

- **식별색 팔레트는 토큰화하지 않는다** — `block/types.ts`(블록 유형 10종) · `file/format.ts`(확장자 14종) · `PROJECT_COLORS` · `MemberAvatar` 의 hex 는 값이 토큰과 겹쳐도 뜻이 다르다. `#ECFDF5` 가 거기서는 "성공" 이 아니라 "체크리스트 블록" 이다. 의미색으로 바꾸면 나중에 토큰을 손볼 때 관계없는 아이콘 색이 함께 움직인다
- **예외 하나 — AI 블록 아이콘색** — 다른 블록색과 달리 화면 곳곳에서 쓰는 브랜드색이라 `var(--color-ai-primary)` 를 참조한다. 주석으로 이유를 남겼다
- **AI hover 는 다수파(`#4430d6`)를 택했다** — `#4429E0` 와 육안 차이가 없어 어느 쪽이든 상관없지만, 쓰이는 곳이 하나 더 많은 쪽으로 붙였다
- **AI 옅은 색은 토큰을 더 만들지 않는다** — `bg-ai-primary/5` · `border-ai-primary/30` 처럼 투명도로 만든다. 단계마다 토큰을 두면 "어느 단계를 쓰나" 가 또 갈린다
- **상세 화면의 엔티티 제목은 `PageTitle` 이 아니다** — `EmployeeDetail` · `NoticeDetail` · `ApprovalDetailView` · `TaxInvoiceDetail` 은 제목이 **데이터**이고 배지가 같은 줄에 붙는다. 페이지 제목과 성격이 달라 그대로 뒀다
- **`Breadcrumb` 이 아래 간격을 갖는다** — 제목이 아니라 브레드크럼의 일이다. 이렇게 두면 브레드크럼을 쓰는 화면이 늘어도 간격을 매번 정하지 않는다

---

## [2026-08-16] 모달 푸터 버튼을 공통 `.btn` 체계로 통일 ✅

브랜치: `style` · API: 변경 없음 · 이슈: #176
(디자인 일관성 조사에서 가장 규모가 큰 이탈로 꼽힌 건)

`globals.css` 에 `.btn` 골격이 있는데도 **모달 푸터 버튼만 손수 만든 클래스 문자열이 36개 파일에 복붙**돼 있었다. 그 결과 같은 "확인" 버튼이 페이지에서는 34px/16px, 모달에서는 31.5px/13px 로 다르게 보였다. 66개를 저장소에 이미 자리잡은 표준(`btn btn-md btn-*`)으로 맞췄다.

### 변경 파일

| 파일                                                                                                                                                            | 변경        |
| --------------------------------------------------------------------------------------------------------------------------------------------------------------- | ----------- |
| `src/features/block/AddBlockModal.tsx` · `BlockEditModal.tsx` · `BlockMoveStepModal.tsx` · `ImageEditModal.tsx` · `ImageUploadModal.tsx` · `TextBlockModal.tsx` | 수정 (11개) |
| `src/features/project/step/StepCompleteModal.tsx` · `StepDeleteModal.tsx` · `StepFormModal.tsx` · `StepPermissionModal.tsx` · `StepStatusModal.tsx`             | 수정 (8개)  |
| `src/features/project/stage/StageDeleteModal.tsx` · `StageFormModal.tsx` · `StageManageModal.tsx` · `StagePermissionModal.tsx`                                  | 수정 (7개)  |
| `src/features/project/settings/CloseProjectModal.tsx` · `DeleteProjectModal.tsx` · `LinkCategoryModal.tsx`                                                      | 수정 (6개)  |
| `src/features/project/member/AddMemberModal.tsx` · `ProjectMembersModal.tsx`                                                                                    | 수정 (3개)  |
| `src/features/employee/AccountStatusModal.tsx` · `EmployeeDetail.tsx` · `PasswordResetModal.tsx` · `ResignationModal.tsx` · `RoleChangeModal.tsx`               | 수정 (7개)  |
| `src/features/department/DeleteDepartmentModal.tsx` · `DepartmentFormModal.tsx`                                                                                 | 수정 (5개)  |
| `src/features/jobPosition/DeleteJobPositionModal.tsx` · `JobPositionFormModal.tsx`                                                                              | 수정 (5개)  |
| `src/features/businessCategory/DeleteCategoryModal.tsx` · `CategoryFormModal.tsx`                                                                               | 수정 (5개)  |
| `src/features/issue/IssueConflictModal.tsx` · `IssueFormModal.tsx`                                                                                              | 수정 (4개)  |
| `src/features/approval/ApproverReplaceModal.tsx`                                                                                                                | 수정 (2개)  |
| `src/features/companyDocument/EditCompanyDocumentModal.tsx`                                                                                                     | 수정 (2개)  |
| `src/features/file/FileViewerModal.tsx`                                                                                                                         | 수정 (1개)  |

### 주요 작업 내용

- **확인 버튼** `min-w-[104px] cursor-pointer rounded-lg bg-btn-primary px-4 py-1.5 text-detail …` → `btn btn-md btn-primary min-w-[104px]` (24개). `min-w-[128px]`(`ImageUploadModal`) · `min-w-[136px]`(`IssueConflictModal`) 는 폭만 남기고 나머지를 골격에 넘겼다
- **삭제 버튼** `bg-red-text … hover:bg-btn-danger-hover` → `btn btn-md btn-danger` (9개)
- **취소 버튼** 고스트(배경·테두리 없음) → `btn btn-md btn-gray-outlined` (30개). 이미 35개 파일이 쓰던 방식에 맞췄다
- **`AccountStatusModal`** 의 조건부 버튼은 `AlertDialog` 와 같은 꼴(`btn btn-md ${isDanger ? 'btn-danger' : 'btn-primary'}`)로 바꿨다. 라벨이 `정지`/`활성화`/`처리 중…` 로 바뀌며 폭이 튀던 것도 `min-w-[104px]` 로 잡혔다

### 트러블슈팅

| 문제                                            | 원인                                                                                                                                                         | 해결                                                              |
| ----------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------ | ----------------------------------------------------------------- |
| 일괄 치환 시 일부 문자열이 깨짐                 | 짧은 패턴(`… hover:bg-btn-primary-hover`)이 긴 패턴(`… hover:bg-btn-primary-hover disabled:…`)의 **접두사**라, 짧은 쪽을 먼저 바꾸면 긴 쪽이 반쪽만 치환된다 | 규칙을 **길이 내림차순**으로 정렬해 적용                          |
| `prettier --write` 가 무관한 11개 파일까지 수정 | 저장소에 이미 포맷이 어긋난 파일이 있었다 (기존 드리프트)                                                                                                    | 버튼 변경이 없는 파일은 `git checkout` 으로 되돌려 PR 범위를 유지 |

### 부수 결정

- **모달 푸터 표준 = `btn btn-md btn-gray-outlined` + `btn btn-md btn-primary min-w-[104px]`** — 새로 정한 게 아니라 `CashFlowFormModal` · `NoticeProjectConvertModal` · `BulkUploadModal` 등 35개 파일이 이미 쓰던 것이다. 표준을 만드는 대신 **다수파에 합류**시켰다
- **`.btn-ghost` 변형은 만들지 않는다** — 취소 버튼의 가벼운 느낌은 살릴 수 있지만, 그러면 같은 "취소"가 모달마다 고스트/아웃라인 두 종류로 남는다. 종류를 늘리지 않는 쪽을 골랐다
- **`disabled:` 유틸리티는 전부 뗀다** — `.btn:disabled` 가 `cursor: not-allowed; pointer-events: none` 을, 각 변형이 색·투명도를 이미 처리한다. 화면마다 다르던 `disabled:opacity-40` / `disabled:text-text-muted` 갈래도 함께 사라졌다
- **`cursor-pointer` 도 뗀다** — `.btn` 에 들어 있다. 남겨 두면 골격을 안 믿고 있다는 신호가 된다

---

## [2026-08-16] 화면 다듬기 스윕 — 깜빡임 · 표 · 문구 · 반응형 ✅

브랜치: `ref/ui-polish-sweep` · 이슈: #174

담당 화면(내 파일 · 전사 관리 · 재무 · 결재 · 공고 조회 · 입찰)을 훑어 **완성도 문제**를 걷어냈다.
제일 컸던 것은 새로고침마다 셸이 번쩍이는 문제였고, 원인은 캐시 저장 위치(`sessionStorage`)가
서버 렌더에서 읽히지 않는 데 있었다. 겸해서 표 · 문구 · 반응형을 같은 기준으로 맞췄다.

### 변경 파일 (주요)

| 파일                                                                   | 변경                                                             |
| ---------------------------------------------------------------------- | ---------------------------------------------------------------- |
| `src/features/auth/shellCache.ts` · `avatarThumbnail.ts`               | **생성** — 셸 값 · 아바타 사본을 쿠키에 담아 첫 HTML 부터 그린다 |
| `src/components/AppShellSkeleton.tsx`                                  | **생성** — 세션 확인 전 셸 (쿠키 값으로 실제 모습 그대로)        |
| `src/components/mobileSidebarClasses.ts`                               | **생성** — 1024px 미만 사이드바 드로어                           |
| `src/features/file/AdminFileExplorer.tsx` · `AdminFileScreen.tsx`      | **생성** — 전사 파일 탐색기 (프로젝트 → 스테이지 → 스텝 → 파일)  |
| `src/features/companyDocument/CompanyDocumentScreen.tsx`               | **생성** — 사내 문서함 분리                                      |
| `src/features/businessCategory/cache.ts` · `employee/optionCache.ts`   | **생성** — 카테고리 · 부서 · 직급 셀렉트 캐시                    |
| `src/components/{Pagination,DataTable,Modal,Sidebar,MemberAvatar}.tsx` | 수정 — 번호 페이지네이션 · 카드 전환 · 폭 버그 · 드로어 · 아바타 |
| `src/features/employeeGroup/` · `app/settings/employee-groups/`        | **삭제** — 그룹 관리 제거                                        |
| 담당 화면 다수                                                         | 표 정렬 · 컬럼명 · 문구 · 플레이스홀더                           |

### 주요 작업 내용

- **셸 깜빡임 제거** — 사용자 · 메뉴 · 아바타 썸네일을 쿠키에 담아 루트 레이아웃이 HTML 에 그려 내린다. 세션 확인 전에도 셸은 한 번만 그려지고 본문만 늦게 채워진다
- **전사 파일 탐색기** — 프로젝트를 고르면 파일이 바로 펼쳐지고 스테이지 · 스텝으로 좁힌다. 위치는 URL 에 담아 새로고침 · 뒤로가기가 자연스럽게 동작한다
- **표** — 금액만 오른쪽, 나머지 왼쪽으로 정렬 통일. 가로 스크롤 제거(3개 표), 768px 미만 카드 전환, 스켈레톤이 열 정렬을 따르도록 수정
- **페이지네이션** — 번호 + `…` 방식으로 교체하고 가운데 정렬 · 로딩 자리표시 추가
- **문구** — 서술은 `합니다`, 요청은 `해주세요` 로 통일. 설명형 힌트 · 이모지 · 반말 예시를 걷어냈다
- **반응형** — 사이드바 드로어 · 표 카드 전환 · 본문 여백 · 모달 상한

## [2026-08-16] 모달 로딩 스피너 통일 · 프로젝트 목록 스켈레톤 정렬 ✅

브랜치: `style` · API: 변경 없음 · 이슈: #172
(결함 3건 수정 #170 이후 이어진 로딩 표현 정리 건)

스켈레톤은 **실물과 자리가 같을 때만** 값을 한다. 모달은 크기 · 본문 구성이 저마다 달라 뼈대를 맞출 수 없어 스피너로 통일하고, 반대로 모양이 고정된 프로젝트 목록은 스켈레톤을 실물에 정확히 맞췄다. 작업 중 드러난 **폴백 모달 이중 노출**과 **컬럼 머리글 `sticky` 추적**도 함께 잡았다.

### 변경 파일

| 파일                                                                                                   | 변경                                                                            |
| ------------------------------------------------------------------------------------------------------ | ------------------------------------------------------------------------------- |
| `src/components/Spinner.tsx`                                                                           | **생성** (`Spinner` · `LoadingSpinner`)                                         |
| `src/components/ModalLoadingFallback.tsx`                                                              | 수정 (본문 스피너 교체 · 300ms 지연 노출)                                       |
| `src/features/issue/IssueDetailModal.tsx` · `IssueFormModal.tsx`                                       | 수정 (헤더 · 본문 뼈대 → 스피너)                                                |
| `src/features/finance/TaxInvoiceMatchModal.tsx` · `CashFlowMatchModal.tsx`                             | 수정 (추천 후보 뼈대 → 스피너)                                                  |
| `src/features/bidding/NoticeReviewModal.tsx`                                                           | 수정 (`ReviewSkeleton` 삭제 → 스피너)                                           |
| `src/features/bidding/NoticeProjectConvertModal.tsx`                                                   | 수정 (전환 정보 뼈대 → 스피너)                                                  |
| `src/features/block/BlockMoveStepModal.tsx` · `project/step/StepDeleteModal.tsx`                       | 수정 (목록 뼈대 → 스피너)                                                       |
| `src/components/project/ProjectListHeader.tsx`                                                         | **생성** (`PROJECT_ROW_GRID` · `PROJECT_ROW_TOGGLE_SLOT` · 머리글 — 리뷰 반영)  |
| `src/features/project/ProjectPageSkeleton.tsx`                                                         | **생성** (`/projects` 화면 껍데기 — `ProjectListSkeleton` 에서 분리, 리뷰 반영) |
| `src/components/project/ProjectListSkeleton.tsx`                                                       | 수정 (머리글 포함 · 칸 높이 · 카드 행만 남김)                                   |
| `src/features/project/ProjectCard.tsx`                                                                 | 수정 (`sticky top-0 z-10` 제거 · 격자/머리글을 공용 모듈에서 가져옴)            |
| `src/features/project/MyProjectList.tsx` · `dashboard/DashboardProjects.tsx` · `app/projects/page.tsx` | 수정 (import 경로 · `sticky` 주석 정리)                                         |

### 주요 작업 내용

- **모달 로딩 = 스피너 하나** — 모달 9곳의 스켈레톤을 `LoadingSpinner` 로 교체했다. 자리(`py-8` ~ `py-20`)는 부르는 쪽이 정한다. 블록 곁패널(`연결된 이슈` · `블록 활동 기록`)은 목록 모양이 고정이라 스켈레톤을 그대로 뒀다
- **폴백 모달 300ms 지연** — 동적 청크 폴백은 실물과 **다른 `<dialog>`** 라, 뜨자마자 닫히고 실물이 새로 열려 창이 두 번 열린 것처럼 보였다. 청크는 대개 `preload*` 로 미리 받아 두므로 그 사이에는 아무것도 그리지 않는다
- **목록 머리글을 스켈레톤에도** — 실물은 `머리글 → 카드` 인데 스켈레톤은 카드만 그려, 목록이 도착하면 약 37px 내려앉았다. 머리글은 데이터 없이 그릴 수 있는 정적 markup 이라 **실물 컴포넌트를 그대로** 가져다 쓴다
- **`ProjectPageSkeleton` 실측 보정** — 분류 칸 `25px → 28px`(태그 `border-[1.5px]` 누락), 상태 탭 폭 하드코딩 제거, 기간 필터 · 페이지 이동 자리 추가
- **컬럼 머리글 `sticky` 제거** — 목록을 굴릴 때 머리글 띠가 화면 위에 남아 다른 구역을 덮었다. 목록과 함께 올라가게 되돌렸다

### 코드 리뷰 반영 (CodeRabbit, PR #172)

- **공용 스켈레톤의 feature 의존 분리** — `components/project/ProjectListSkeleton` 이 `features/project/ProjectCard` · `projectStatus` 를 직접 참조해, 대시보드 로딩 UI 가 프로젝트 feature 구현에 묶여 있었다. 공용으로 쓰는 격자 · 머리글은 `components/project/ProjectListHeader` 로 내리고, feature 규칙(`PROJECT_STATUS_OPTIONS`)을 알아야 하는 화면 껍데기는 `features/project/ProjectPageSkeleton` 으로 올렸다. 결과적으로 `src/components/project/` 의 `@/features` 참조 0건
- **전환 모달 로딩 판정에 카테고리 누락** (`NoticeProjectConvertModal`) — `Promise.all` 로 감쌌지만 `setSummaries` 는 개별 `.then` 에서 불려, 요약이 먼저 오면 카테고리가 오는 중인데 폼이 열렸다. 그 순간 `categories` 가 빈 배열이라 "고를 수 있는 사업 카테고리가 없습니다" 로 잠긴다. `categoryLoadedAt !== reloadCount` 를 로딩 조건에 더했다
- **재시도 중 후보 자리가 빔** (`TaxInvoiceMatchModal`) — `다시 시도` 가 `retryCount` 만 올리고 `error` 를 남겨 `candidates === null && hasFailed` 가 계속 참이었다. 핸들러에서 `setError('')` 를 먼저 부른다

### 트러블슈팅

| 문제                                 | 원인                                                   | 해결                                                                       |
| ------------------------------------ | ------------------------------------------------------ | -------------------------------------------------------------------------- |
| 새로고침마다 셸이 두 번 그려짐       | 자리표시 셸 → 실제 셸로 **컴포넌트가 교체**됨          | 확인 전에도 같은 셸을 그리고 본문만 가린다 (`SessionConfirmedOnly`)        |
| 캐시가 있어도 첫 페인트가 빔         | `sessionStorage` 는 서버 렌더에서 못 읽는다            | 쿠키로 옮겨 루트 레이아웃이 읽어 HTML 에 담는다                            |
| 아바타가 이니셜 ↔ 사진으로 번갈아 뜸 | 사진 오기 전 이니셜을 먼저 그림                        | 사진이 올 자리는 테두리만 두고, 48px 사본을 쿠키에 담아 첫 프레임에 그린다 |
| 모달이 화면 폭만큼 늘어남            | 공통 `max-w` 와 호출부 `max-w` 가 충돌 (CSS 순서 문제) | 공통에서 폭 상한을 빼고 높이만 남긴다                                      |
| 표 스켈레톤이 값과 어긋남            | 막대가 열 정렬(`align`)을 따르지 않음                  | 스켈레톤 셀에도 같은 정렬을 적용                                           |
| 입출금 필터바가 한 번 늘어남         | 프로젝트 셀렉트를 **옵션 도착 후** 그림                | 자리를 먼저 두고 비었을 때만 잠근다                                        |

### 부수 결정

- **표 정렬은 금액만 오른쪽** — 날짜 · 배지를 가운데로 두었다가 되돌렸다. 눈이 왼쪽 기준선을 따라가는 편이 훑기 쉽다
- **호버 커서는 전역 규칙으로** — 화면마다 `cursor-pointer` 를 붙이다 빠진 자리가 계속 나와, `globals.css` 에서 눌리는 요소 전체에 건다
- **모달 스켈레톤은 되돌렸다** — 다른 담당자가 맡기로 해 원래 코드로 복구
- **담당 밖 도메인은 손대지 않는다** — 프로젝트 · 블록 · 이슈 · 정산 · 비타메이트 · 대시보드의 문구 수정은 전부 되돌렸다
  | 모달 안에서 스피너가 돌다가 다른 모달이 열림 | `next/dynamic` 의 `loading` 이 실물과 **별개의 `<dialog>`** 를 열었다 닫는다 — 백드롭 깜빡임 + 포커스 이동 + 헤더 모양 변경 | 폴백을 300ms 지연 노출. 그 안에 청크가 오면 창이 한 번만 열린다 |
  | 프로젝트 목록이 뜰 때 아래로 내려앉음 | 스켈레톤에 `ProjectListHeader` 가 없었다 | 실물 컴포넌트를 스켈레톤에서도 렌더 |
  | 상태 탭 옆 검색창 폭이 로딩 중과 다름 | 탭 상자를 `w-80`(320px)로 어림했는데 실제는 6개 탭 ≈388px — `flex-1` 인 검색창이 68px 만큼 어긋났다 | `PROJECT_STATUS_OPTIONS` + 라벨을 `invisible` 로 넣어 폭을 스스로 계산 |

### 부수 결정

- **스켈레톤 대 스피너의 기준은 "자리가 고정인가"** — 목록 · 표처럼 행 모양이 정해진 곳은 스켈레톤, 크기가 제각각인 모달은 스피너. 어긋난 뼈대는 딸깍거림을 없애려다 오히려 만든다
- **머리글 `sticky` 는 되돌린다** (#170 에서 넣었던 것) — 스크롤 중 다른 구역을 덮는 쪽이 기준을 잃는 것보다 거슬린다
- **폴백은 지연이지 제거가 아니다** — 청크가 정말 느릴 때는 무반응보다 스피너 창이 낫다. 300ms 는 미리받기가 대부분 끝나는 선
- **`src/components/` 는 feature 를 참조하지 않는다** — 두 화면이 함께 쓰는 것(격자 · 머리글)만 공용으로 내리고, 한 화면의 규칙을 알아야 하는 껍데기는 그 feature 안에 둔다. 스켈레톤이라고 무조건 `components/` 가 아니다
- **"조회 중" 을 불리언 대신 `…At === reloadCount` 로** — 재시도 때 효과 안에서 플래그를 되돌리면 `react-hooks/set-state-in-effect` 에 걸린다. `DashboardProjects` 의 `failedAt` 과 같은 방식으로 맞췄다

---

## [2026-08-16] 결함 3건 수정 · 화면 정리 ✅

브랜치: `style` · API: 변경 없음 (67번 제한값 명세만 확정) · 이슈: #170
(용어 통일 #167 이후 이어진 QA 피드백 반영 건)

QA 에서 나온 결함 3건 — **이슈 수정이 화면에 안 붙음 · 열람 권한자에게 `⋯` 노출 · 주소만 고치면 남의 프로젝트 블록이 보임** — 을 잡고, 함께 지적된 화면 문제(문서 블록 업로드 흐름 · 아이콘 크기 · 카드 정렬 · 이미지 제한 안내)를 정리했다.

### 변경 파일

| 파일                                                                                                                        | 변경                                                                 |
| --------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------- |
| `src/features/project/step/StepScopeGuard.tsx`                                                                              | **생성** (스텝의 프로젝트 소속 검증)                                 |
| `src/app/projects/[id]/steps/[stepId]/layout.tsx`                                                                           | 수정 (세 탭을 문지기로 감쌈)                                         |
| `src/features/issue/IssueBoard.tsx`                                                                                         | 수정 (`refresh()` · `keepOrder()` — 저장 후 무깜빡임 재조회)         |
| `src/components/ProjectSidebar.tsx`                                                                                         | 수정 (스텝 `⋯` 를 `canEditStep` 일 때만 노출)                        |
| `src/components/AlertDialog.tsx`                                                                                            | 수정 (`AlertDialogThreeButton` 추가 · `Shell` 세로 배치 옵션)        |
| `src/features/file/DuplicateNameModal.tsx` · `src/features/block/FileBlock.tsx`                                             | 수정 (동명 파일 → 새 버전 / 새 문서 선택, 행 아이콘 확대)            |
| `src/features/block/ImageUploadModal.tsx` · `block/types.ts`                                                                | 수정 (장당 20MB · 요청당 15장 · 300MB)                               |
| `src/features/project/ProjectCard.tsx`                                                                                      | 수정 (`PROJECT_ROW_GRID` · `ProjectListHeader` · 카드 아바타 이니셜) |
| `src/features/project/MyProjectList.tsx` · `dashboard/DashboardProjects.tsx` · `components/project/ProjectListSkeleton.tsx` | 수정 (머리글 배치 · 같은 격자 공유)                                  |
| `src/components/MemberAvatar.tsx`                                                                                           | 수정 (`initialsOnly` 옵션)                                           |
| `src/features/activityLog/ActivityLogItem.tsx`                                                                              | 수정 (`<pre>` 에 `font-sans`)                                        |
| `src/features/block/BlockIssuesPanel.tsx` · `activityLog/BlockActivityLogPanel.tsx` · `components/ModalLoadingFallback.tsx` | 수정 (패널 제목 `truncate`)                                          |
| `src/features/block/ImageBlock.tsx` · `file/MyFileList.tsx`                                                                 | 수정 (아이콘 버튼 `size-7` + 아이콘 `size-4`)                        |
| `.ai/API.md`                                                                                                                | 수정 (67번 이미지 업로드 제한 확정)                                  |

### 주요 작업 내용

- **이슈 저장 후 재조회** — 수정 응답만으로 카드를 병합하면 응답에 없는 필드(우선순위)가 옛값으로 남는다. 낙관적 반영은 유지하고 곧바로 목록을 다시 읽어 서버 값과 맞춘다. 직전 목록을 지우지 않아 깜빡이지 않고, `keepOrder()` 가 화면 순서를 그대로 지킨다
- **스텝 `⋯` 노출 축소** — 이 스텝을 고칠 수 없으면 메뉴를 세우지 않는다. 자리는 빈 `span` 으로 남겨 진척률 `%` 위치가 흔들리지 않는다
- **스텝 소속 검증** — 블록 · 이슈 · 활동 기록은 경로에 프로젝트가 없어 `stepId` 만으로 조회된다. 사이드바가 이미 받아 둔 스텝 목록 캐시로 소속을 확인하고, 아니면 안내 화면으로 돌린다 (추가 요청 없음)
- **동명 파일 3갈래** — `새 버전으로 올리기` · `새 문서로 추가` · `취소`. 같은 이름이 여럿이면 얹을 대상을 특정할 수 없어 기존 2버튼으로 떨어진다
- **프로젝트 카드 격자화** — 카드 · 머리글 · 스켈레톤이 `PROJECT_ROW_GRID` 하나를 공유하고, 컬럼명을 `sticky` 로 붙였다
- **이미지 업로드 제한** — 넘친 장수를 버리지 않고 "남은 N장은 이어서" 로 안내한다 (블록 총 장수는 무제한, 요청 하나의 상한이다)

### 트러블슈팅

| 문제                                    | 원인                                                                                 | 해결                                                           |
| --------------------------------------- | ------------------------------------------------------------------------------------ | -------------------------------------------------------------- |
| 우선순위를 바꿔도 카드가 그대로         | PATCH 응답을 `{...issue, ...next}` 로 병합 — 응답에 없는 필드는 옛값이 남는다        | 저장 후 목록 재조회. 순서 · 스크롤은 `keepOrder()` 로 보존     |
| 프로젝트 번호만 바꿔도 이전 블록이 보임 | 캐시가 아니라 **소속을 확인하는 곳이 없었다** — 세 탭 모두 `stepId` 로만 조회한다    | `StepScopeGuard` 를 스텝 레이아웃에 한 겹                      |
| 활동 기록의 변경 내용만 글씨체가 다름   | `<pre>` 의 브라우저 기본값이 고정폭 글꼴이라 `body` 의 Pretendard 가 상속되지 않는다 | `font-sans` 추가 (줄바꿈은 `whitespace-pre-wrap` 이 유지)      |
| `연결된 이슈` 제목이 두 줄로 접힘       | 제목 `<h2>` 에만 줄바꿈 방지가 없어 배지 · 닫기 버튼에 밀렸다                        | `truncate` 추가 — 로딩 껍데기도 같이 맞춰 청크 도착 때 안 튀게 |

### 부수 결정

- **문지기는 "모르는 동안" 막지 않는다** — 스텝 목록이 아직 없거나 실패했으면 통과시킨다. 판정 전에 가로막으면 정상 진입에도 오류 화면이 한 번 스친다
- **열람 전용 스텝의 권한 관리는 설정 화면으로 몬다** — 사이드바 메뉴를 없애도 `프로젝트 설정 > 스테이지 · 스텝 권한` 에 스텝 전체 목록이 있어 잃는 길이 없다
- **아바타 이니셜은 프로젝트 카드에만** — 처음엔 전역으로 바꿨다가 되돌렸다. 24px 아바타가 수십 개 서는 목록에서만 사진이 의미가 없고, 헤더 · 마이페이지는 사진이 제 역할을 한다. `initialsOnly` 기본값을 바꾸지 말 것
- **카드 격자에서 과업명 · 발주처만 `fr`** — 카드마다 컨테이너 폭이 같아 `fr` 도 같은 값으로 풀려 열이 맞는다. 나머지를 고정하는 이유는 내용 길이가 제각각이기 때문이다 (상태 라벨 · 분류 이름 · 참여자 수)
- **아이콘 크기 기준은 전사 파일 관리** — 거기가 이미 `size-7` + `size-4` 였다. 문서 블록 · 내 문서함 · 이미지 블록을 그쪽에 맞췄다

---

## [2026-08-16] 화면 용어 통일 · 구어체 정리 ✅

브랜치: `style` · API: 변경 없음 (문구 · 입력 표기만) · 이슈: #168

**프로젝트 > 스테이지 > 스텝 > 블록** 을 공식 계층으로 확정하고, 같은 것을 두 이름으로 부르던 자리를 전부 한 이름으로 모았다. 겸해서 UI 문구에 섞여 있던 해요체를 합쇼체로 맞추고, 프로젝트 설정의 계약금액 입력에 천 단위 구분을 넣었다. 결재 · 입금확인 · 정산 · 세금계산서 조회 · 입찰공고는 범위에서 제외했다.

### 용어 결정

| 대상         | 쓰던 이름                          | 확정               |
| ------------ | ---------------------------------- | ------------------ |
| stage        | `단계` · `스테이지`                | **`스테이지`**     |
| step         | `스텝`                             | `스텝` (변경 없음) |
| block        | `블록` · `Block` · `AI Block`      | **`블록`**         |
| issue        | `일정` · `전체 일정` · `이슈`      | **`이슈`**         |
| activity log | `로그` · `활동 로그` · `활동 기록` | **`활동 기록`**    |
| download     | `내려받기` · `다운로드`            | **`다운로드`**     |

### 변경 파일

| 파일                                                                                             | 변경                                                                                                                     |
| ------------------------------------------------------------------------------------------------ | ------------------------------------------------------------------------------------------------------------------------ |
| `src/components/{StepTabs,ProjectTabs}.tsx`                                                      | 수정 (탭 `일정` → `이슈`, `전체 일정` → `전체 이슈`)                                                                     |
| `src/components/ProjectSidebar.tsx`                                                              | 수정 (헤더 `진행 단계` → `스테이지`, 버튼 `단계수정` → `수정`, 메뉴 `스텝 권한 기본값` → `스테이지 권한`, 모달 폴백 3종) |
| `src/components/{Modal,project/ProjectSidebarSkeleton}.tsx`                                      | 수정 (주석 · 스켈레톤 라벨)                                                                                              |
| `src/features/project/settings/StepPermissionSection.tsx`                                        | 수정 (섹션 `스테이지 · 스텝 권한`, 버튼 `스테이지 권한` · `스텝 권한`, 기본값 규칙 명시)                                 |
| `src/features/project/settings/ProjectInfoForm.tsx`                                              | 수정 (**계약금액 천 단위 콤마** — `type="number"` → `text` + `groupDigits`)                                              |
| `src/features/project/FormFields.tsx`                                                            | 수정 (`groupDigits` export — 생성 폼과 설정 폼이 공유)                                                                   |
| `src/features/project/stage/*.tsx` (4)                                                           | 수정 (`단계` → `스테이지` 전면)                                                                                          |
| `src/features/project/step/StepFormModal.tsx` · `ProjectCard.tsx` · `overview/ProjectIssues.tsx` | 수정 (`소속 스테이지` · `전체 이슈` · `이슈 열기`)                                                                       |
| `src/features/block/*` (16)                                                                      | 수정 (`Block 추가` → `블록 추가`, `블록 이름` → `블록 제목`, 해요체 정리)                                                |
| `src/features/activityLog/*` (4) · `src/features/issue/*` (3)                                    | 수정 (`활동 로그` → `활동 기록`, 충돌 모달 문구)                                                                         |
| `src/features/{dashboard,file,companyDocument,vitamate}/*` (10)                                  | 수정 (해요체 정리 · `내려받기` → `다운로드`)                                                                             |
| `src/features/project/{api,types}.ts` · `src/lib/useFlipReorder.ts` 외                           | 수정 (주석 용어)                                                                                                         |

### 주요 작업 내용

- **이슈 용어 통일** — 스텝 탭 `일정`, 프로젝트 탭 `전체 일정`, 링크 `일정 열기` 가 모두 같은 데이터를 가리키면서 이름만 달랐다. 전부 `이슈` 로 모았다. 메인 대시보드의 `일정`(캘린더)은 실제 일정이라 그대로 둔다
- **스테이지 용어 통일** — 사이드바 트리는 `스테이지`, 모달은 `단계` 로 갈려 있었다. `스테이지` 로 맞추고 `미분류 (단계 없음)` 5곳도 `미분류 (스테이지 없음)` 으로 교체
- **권한 라벨 재정리** — `새 스텝 기본값` · `권한 관리` → `스테이지 권한` · `스텝 권한`. 대신 **"새 스텝이 생성될 때 기본값으로 적용된다"** 를 섹션 설명과 모달 배너 두 곳에 명시했다
- **구어체 제거** — 서술문 해요체(`~어요` · `~네요` · `~돼요`) 30여 곳을 합쇼체로. 명령형 `~하세요` · `~해주세요` 와 확인 다이얼로그 `~할까요?` 는 기존 컨벤션이라 유지
- **계약금액 표기** — 설정 폼이 `type="number"` 라 `1000000` 그대로 보였다. 생성 폼(`AmountField`)이 쓰던 `groupDigits` 를 export 해 같은 규칙으로 `1,000,000` 표시. 상태 · 요청 값은 여전히 숫자 문자열이다

### 트러블슈팅

| 문제                                                       | 원인                                                                               | 해결                                                                                |
| ---------------------------------------------------------- | ---------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------- |
| `prettier --write "src/**"` 가 손대지 않은 파일까지 재포맷 | 일부 파일이 이전부터 포맷 규격에서 벗어나 있었음 (bidding · approval · finance 등) | 의도한 파일만 남기고 `git checkout` 으로 되돌림. 이후에는 수정한 파일만 지정해 포맷 |
| 1차 통일 방향이 반대로 잡힘 (`스테이지` → `단계`)          | 당시 UI 다수가 `단계` 라 그쪽을 우세로 판단                                        | 계층(`프로젝트 > 스테이지 > 스텝 > 블록`)을 먼저 확정한 뒤 `스테이지` 로 재통일     |

### 부수 결정

- **`~할까요?` 확인 다이얼로그는 구어체로 보지 않는다** — 삭제 · 저장 확인 15곳이 모두 같은 형태라 컨벤션으로 굳었고, 질문형이 의도를 더 분명히 전한다
- **주석 안의 도메인 용어까지 함께 바꾼다** — 코드를 읽는 사람이 화면 라벨과 주석을 대조하므로, 화면만 바꾸면 다음 사람이 다시 헷갈린다. 단 `업로드 3단계` · `캡처 단계` 처럼 stage 와 무관한 `단계` 는 그대로 둔다
- **사이드바 버튼은 `수정` 한 단어로** — 헤더가 이미 `스테이지` 라 반복이고, `스테이지 수정` 은 옆 `+ 추가` 와 한 줄에 들어가기 빠듯하다
- **`블록 이름` → `블록 제목`** — 필드가 `title` 이고 수정 모달이 이미 `블록 제목` 이었다. 생성 모달만 `이름` 이라 맞췄다
- **전사 관리 화면은 건드리지 않는다** — 해요체 7곳(`businessCategory` · `department` · `employee` 2 · `jobPosition` · `pagePermission`)이 남아 있지만 **다른 작업자의 담당 파트**라 손대지 않는다. 결재 · 입찰공고 · 정산 · 세금계산서 도메인 20여 곳도 같은 이유로 제외

---

## [2026-08-16] 입찰 공고 → 프로젝트 전환 화면 ✅

브랜치: `feat/bidding-project-conversion` · API: `POST /bidding/notices/{noticeId}/projects` · 이슈: #166

완료된 **AI 문서 검토를 근거로** 공고를 프로젝트로 전환하는 화면을 붙였다. 검토에서 내려받은 공고 첨부가 정식 파일로 프로젝트에 귀속되므로, 진입점은 **검토 결과 화면 하나**다. **실제 전환 1건 성공을 확인했다.**

### 변경 파일

| 파일                                                                            | 변경                                                        |
| ------------------------------------------------------------------------------- | ----------------------------------------------------------- |
| `src/features/bidding/NoticeProjectConvertModal.tsx`                            | **생성** (요약 연결 · 프로젝트 정보 입력 · 409 5종 안내)    |
| `src/features/bidding/NoticeReviewModal.tsx`                                    | 수정 (검토 결과 · 실패 화면에 전환 버튼)                    |
| `src/features/bidding/NoticeDetail.tsx`                                         | 수정 (검토 → 전환 모달 연결 · 생성 후 프로젝트 상세로 이동) |
| `src/features/bidding/{api,types,errorCodes}.ts` · `src/constants/endpoints.ts` | 수정 (전환 API · 타입 · 409 코드)                           |

### 주요 작업 내용

- **전환 모달** — 확정 · 미연결 요약만 고를 수 있는 선택 칸, 과업명 · 카테고리 · 기간 · 설명 입력. 409 다섯 갈래를 각각 다른 문구로 안내
- **자동 채움** — 과업명은 공고명, 종료일은 **투찰 마감일**(`bidDeadlineAt`). 종료일엔 어디서 왔는지 힌트를 달고, 사용자가 고치면 힌트를 거둔다
- **버튼을 감추지 않고 잠근다** — 이미 전환된 공고 · 이미 연결된 검토 · 검토 미완료는 이유를 옆에 적고 `disabled`. 버튼이 사라지면 어디로 갔는지 사용자가 찾게 된다
- **직접 생성 화면과 표기 통일** — 라벨 `과업명`, 최대 300자, placeholder 를 `/projects/new` 와 맞췄다

### 트러블슈팅

| 문제                                                        | 원인                                                                      | 해결                                               |
| ----------------------------------------------------------- | ------------------------------------------------------------------------- | -------------------------------------------------- |
| stash pop 충돌 (`NoticeReviewModal`)                        | 커밋된 `다시 검토` 버튼과 stash 의 전환 버튼이 같은 자리에 들어옴         | 한 줄에 나란히 두는 형태로 병합                    |
| 전환 모달 타입 오류                                         | stash 이후 요약 이력 응답이 `BidSummary` → `SummaryHistoryItem` 으로 바뀜 | 상태 · 필터 타입 교체 (쓰는 필드는 그대로)         |
| 검토 자체가 실패 (`AI 문서 비교 검토 생성에 실패했습니다.`) | 서버 응답 메시지 — 프론트 문구가 아니다 (`src/` 에 그 문자열이 없다)      | 백엔드 쪽에서 해소. 이후 검토 완료 → 전환 1건 성공 |

### 부수 결정

- **발주처 · 계약금액은 전환 폼에 넣지 않는다** — 전환 API 가 받지 않는 필드이고, 계약금액은 낙찰 전이라 채울 값도 없다. 생성 후 프로젝트 설정에서 채운다
- **날짜 · 카테고리는 필수로 둔다** — 직접 생성은 선택이지만, 전환은 스텝 · 이슈 마감의 기준이 되는 시작점이라 비워 두지 않는다
- **실패한 검토에서도 전환 버튼 자리를 남긴다** — 맨 아래 `AI 검토하기` 옆에 잠긴 채로 두고, 왜 못 누르는지 위에 한 줄 적는다

---

## [2026-08-16] 입찰 AI 요약 · AI 문서 검토 연동 ✅

브랜치: `feat/bidding-ai-summary` · API: 입찰 AI 요약 5종 · 문서 검토 5종 · 사내 문서 선택 1종 · 이슈: #TBD

공고 상세에 **AI 요약**(공고 본문을 여섯 칸으로 정리)과 **AI 문서 검토**(공고 첨부 + 사내 문서를 비교하고 근거를 붙임)를 붙였다. 둘 다 `202` 로 접수하고 폴링으로 결과를 받는 비동기 흐름이라, 대기 중에도 화면이 흔들리지 않고 사용자가 손을 놓지 않도록 만드는 데 대부분의 판단이 들어갔다. 겸해서 백엔드가 바꾼 수집 조건 · 공고 등록 항목도 함께 반영했다.

### 변경 파일

| 파일                                                    | 변경                                                            |
| ------------------------------------------------------- | --------------------------------------------------------------- |
| `src/features/bidding/NoticeSummaryCard.tsx`            | **생성** (요약 요청 · 폴링 · 수정 · 확정 · 차수 이어가기)       |
| `src/features/bidding/NoticeReviewModal.tsx`            | **생성** (문서 선택 · 검토 요청 · 폴링 · 근거 표시 · 검토 종료) |
| `src/features/bidding/NoticeDetail.tsx`                 | 수정 (두 모달 연결 · 전환 버튼 제거)                            |
| `src/features/bidding/{api,types,errorCodes}.ts`        | 수정 (요약 · 검토 · 수집 조건 필드)                             |
| `src/features/bidding/CollectionConditionFormModal.tsx` | 수정 (`조회 기간` 드롭다운)                                     |
| `src/features/bidding/CollectionConditionList.tsx`      | 수정 (조건 카드 `조회 기간` · 실행 결과 `조회 구간`)            |
| `src/features/bidding/NoticeCreateForm.tsx`             | 수정 (원문 URL 을 선택 입력으로)                                |
| `src/features/companyDocument/{api,types}.ts`           | 수정 (`getSelectableDocuments` · `SelectableDocument`)          |
| `src/constants/endpoints.ts`                            | 수정 (요약 · 검토 · 사내 문서 선택)                             |
| `.ai/API.md`                                            | 수정 (요약 · 검토 · 수집 조건 · 전환 API 명세)                  |

### 주요 작업 내용

- **AI 요약** — 프롬프트를 사람이 직접 쓰고 결과와 함께 남긴다. 완료 후 여섯 칸을 고치고 확정할 수 있으며, 확정된 요약을 딛고 새 차수를 만든다
- **AI 문서 검토** — 공고 첨부와 사내 문서를 골라 비교한다. 사내 문서는 `companyDocumentVersionId` 로 **버전 고정**해 보낸다. 결과에는 근거(인용)를 접지 않고 그대로 편다
- **대기 중 화면 유지** — 폴링 중에도 고른 목록과 입력칸을 그대로 두고 잠그기만 한다. 진행 상태는 버튼 줄 위에 따로 두어 문구가 버튼에 밀려 잘리지 않게 했다
- **검토 종료** — `PATCH .../abandon` 을 붙여 진행 중 검토를 실제로 닫는다. 요약에는 대응 API 가 없어 화면 잠금 해제(`멈추기`)까지만 지원한다
- **수집 조건 조회 기간** — `ONE_WEEK` · `TWO_WEEKS` · `ONE_MONTH` 선택과 실행 결과의 실제 조회 구간 표시

### 트러블슈팅

| 문제                                    | 원인                                                                  | 해결                                                                               |
| --------------------------------------- | --------------------------------------------------------------------- | ---------------------------------------------------------------------------------- |
| 요약 · 검토가 영원히 `PENDING`          | Spring Outbox 가 Redis 에 발행되지 않음 (스트림에 메시지 자체가 없음) | 프론트 문제 아님 — 근거를 모아 백엔드에 전달 (`.ai/백엔드-요청_입찰AI요약검토.md`) |
| 워커 재시작해도 job 을 못 잡음          | 처리 완료 전에 `XACK` 이 나가 PEL 에도 남지 않음                      | 동일 문서로 전달 (ACK 시점 · 기동 시 PEL 소비)                                     |
| 실패한 요약을 이어서 요청하면 거절      | 실패 건을 `baseSummaryId` 로 보냄                                     | 완료된 요약만 딛도록 하고 버튼도 `요약하기` 로 갈랐다                              |
| 모달이 열릴 때 내용이 한꺼번에 튀어나옴 | 응답이 도착하는 대로 그림                                             | 초기 요청을 함께 기다리고 같은 골격의 스켈레톤을 먼저 그린다                       |
| 수금 진행률이 `1.0%` 로 표시            | `paidAmountRatio` 가 백분율이 아니라 비율(0~1)                        | 표기 시 100 을 곱한다                                                              |

### 부수 결정

- **원문 URL 필수 해제** — 화면 정책으로 필수였으나 링크 없는 공고를 등록할 방법이 사라져 선택으로 되돌렸다. 적었을 때만 형식을 검사한다
- **프로젝트 전환 버튼 제거** — 전환 API 는 배포됐지만 근거 검토 · 카테고리 · 기간을 받는 별도 흐름이라 화면을 따로 만든다. 눌리지 않는 버튼은 고장으로 읽혀 빼고 상태만 알린다
- **모달 규격 통일** — 요약 · 검토 모달을 같은 크기(`640px` · `85vh`)로 맞추고 바깥 클릭으로 닫히지 않게 했다 (입력을 잃지 않도록)

---

## [2026-08-14] 전사 파일 관리 화면 신설 · 파일 업로드 결과 토스트 ✅

브랜치: `ref-ys` · API: 142(전사 파일 목록) · 143~150(사내 문서함) 신규 연동 · 이슈: #TBD

전사 관리 허브에 **전사 파일 관리** 를 새로 붙였다. `프로젝트 파일` · `사내 문서함` 두 탭이고, 사내 문서함은 프로젝트 파일과 저장소가 다른 별도 도메인이라 `features/companyDocument/` 로 갈라 두었다. 겸해서 **파일이 올라가는 모든 화면**에 완료 · 실패 토스트를 붙였다.

### 변경 파일

| 파일                                                          | 변경                                                 |
| ------------------------------------------------------------- | ---------------------------------------------------- |
| `src/app/settings/files/page.tsx`                             | **생성** (라우트 진입점)                             |
| `src/features/file/CompanyFileAdmin.tsx`                      | **생성** (두 탭 껍데기)                              |
| `src/features/file/AdminFileList.tsx`                         | **생성** (전사 파일 목록 · 요약 · 필터 · 페이징)     |
| `src/features/companyDocument/{types,api,upload}.ts`          | **생성** (사내 문서 도메인)                          |
| `src/features/companyDocument/CompanyDocumentList.tsx`        | **생성** (목록 · 업로드 · 삭제 · 복구)               |
| `src/features/companyDocument/CompanyDocumentViewerModal.tsx` | **생성** (미리보기 + 버전 이력)                      |
| `src/features/companyDocument/EditCompanyDocumentModal.tsx`   | **생성** (표시명 · 분류 수정)                        |
| `src/app/settings/page.tsx`                                   | 수정 (`파일` 섹션 카드 추가)                         |
| `src/constants/endpoints.ts`                                  | 수정 (`files.admin` · `companyDocuments`)            |
| `src/features/file/{api,types}.ts`                            | 수정 (`getAdminFiles` · `AdminFile` · `FilePage<T>`) |
| `src/features/block/FileBlock.tsx` · `ImageUploadModal.tsx`   | 수정 (업로드 토스트)                                 |
| `src/features/approval/ApprovalDraftForm.tsx`                 | 수정 (첨부 토스트)                                   |
| `src/features/auth/ProfileImageField.tsx`                     | 수정 (프로필 사진 토스트)                            |
| `src/features/employee/BulkUploadModal.tsx`                   | 수정 (일괄 등록 토스트)                              |
| `src/features/finance/CashFlowCsvMapping.tsx`                 | 수정 (CSV 업로드 토스트)                             |
| `src/features/approval/ApprovalDocumentModal.tsx`             | 수정 (다운로드 버튼 모양 통일)                       |
| `.ai/API.md`                                                  | 수정 (142 · 143~150 명세 추가)                       |

### 주요 작업 내용

- **전사 파일 관리 진입** — 전사 관리 허브의 `파일 › 전사 파일 관리` 카드 → `/settings/files`. 화면은 두 탭 전환만 하고 조회는 각 탭이 한다
- **프로젝트 파일 탭** — 142번으로 전사 모든 프로젝트의 문서를 문서 단위 최신 완료 버전 1행씩 페이지 조회. 검색 · 프로젝트 · 확장자 필터 · 행 클릭 뷰어
- **사내 문서함 탭** — 143~150번 전부 연동. 목록 · 2단계 업로드 · 새 버전 · 표시명/분류 수정 · soft delete · 복구 · 미리보기 + 버전 이력
- **업로드 결과 토스트** — 문서 블록 · 사내 문서 · 결재 첨부 · 이미지 등록 · 프로필 사진 · 사원 일괄 · 입출금 CSV 7곳. 성공은 `notifyToast()`, 실패는 `'error'` 톤이며 **화면 안 오류 문구는 그대로 남긴다**(토스트는 사라지므로)

### 트러블슈팅

- **`react-hooks/set-state-in-effect`** — 문서를 바꿀 때 패널 상태를 효과에서 되돌리다 걸렸다. 부모가 `key` 로 새로 마운트하게 두어 되돌릴 일 자체를 없앴다
- **`table-fixed` 열 폭 깨짐** — `%` 합이 100을 넘거나 `minWidth` 가 좁으면 날짜 · 아이콘 버튼이 눌려 줄바꿈됐다. 합계를 100으로 맞추고 `minWidth` 를 실제 필요 폭(1000 · 880)으로 올렸다
- **develop 최신화 충돌** — `CashFlowCsvMapping.tsx` 가 develop 에서 `CsvImportParts` 로 쪼개지며 `DataTable` import 가 빠졌다. 토스트 import 만 남기고 위쪽 정리를 그대로 받았다

### 코드 리뷰 반영 (CodeRabbit)

- **업로드 대상을 `await` 전에 고정** — `versionTargetId.current` 를 응답 후 다시 읽으면, 업로드 중 다른 문서의 `새 버전` 을 누른 경우 요청과 토스트가 서로 다른 것을 가리킨다 (문서 블록 · 사내 문서함 공통)
- **업로드 중 행의 `새 버전 올리기` 비활성화** — 대상이 덮여 두 업로드가 겹치면 `isUploading` · 오류 문구가 서로를 덮는다
- **다운로드 팝업 차단 대응** — `window.open` 을 `await` 뒤에 부르면 사용자 클릭과 끊긴 것으로 보여 차단된다. 창을 먼저 열고 URL 발급 후 이동시키며, 실패하면 빈 창을 닫는다
- **삭제 확인 다이얼로그의 타입 단언 제거** — 조건부 렌더 시점의 값을 지역 상수로 고정한다
- **`document` prop 이름 제거** — 브라우저 전역 `document` 를 가려 나중에 DOM API 를 쓰면 조용히 잘못된 값을 참조한다 (`item` 으로 통일)
- **탭 ARIA 완성** — `aria-controls` · `role="tabpanel"` 연결, 화살표 · Home · End 이동과 로빙 `tabIndex` 추가

### 부수 결정

- **사내 문서는 별도 feature 폴더** — 경로 · 에러코드(`CDOC_*`) · 저장소가 모두 달라 `features/file` 에 섞지 않았다. 업로드의 `putToStorage` 만 재사용한다
- **AI 인덱싱 배지는 뺐다** — 목업에는 있으나 목록 응답에 상태 필드가 없다. 필드명이 정해지면 붙인다
- **요약 카드는 2장만** — 총 용량 · 기간별 업로드는 집계 API 가 없어 한 페이지 20행으로는 셀 수 없다
- **정렬 드롭다운 제거** — 142번에 정렬 파라미터가 없다
- **복구는 삭제 직후에만** — 목록에 삭제분 조건이 없어 화면이 든 id 로만 되돌릴 수 있다 (`되돌리기` 줄)

---

## [2026-08-14] 이미지 블록 정렬 번호 버그 수정 · 이미지 모아보기 N+1 선대응 ✅

브랜치: `ref-ys` · API 변경 없음 (백엔드 필드 추가 요청 발송 완료)· 이슈: #158

이미지 블록에서 **업로드·삭제 후 이미지가 안 뜨고 `다시 시도` 로도 복구되지 않던** 버그를 잡았다. 겸해서 107번에 요청해 둔 필드가 배포되면 N+1 조회가 저절로 사라지도록 미리 대비해 두었다.

### 변경 파일

| 파일                                                  | 변경                                                           |
| ----------------------------------------------------- | -------------------------------------------------------------- |
| `src/features/block/ImageBlock.tsx`                   | 수정 (정렬 번호 지어내기 제거 · `resync()` · `applyCreated()`) |
| `src/features/block/types.ts`                         | 수정 (`ProjectImage` 에 선택 필드 3종 추가)                    |
| `src/features/project/overview/useImageBlockNames.ts` | 수정 (`readImageBlockNames()` 신설)                            |
| `src/features/project/overview/ProjectImages.tsx`     | 수정 (응답 필드 우선 · 없을 때만 N+1)                          |

### 주요 작업 내용

- **정렬 번호를 지어내지 않는다** — 세 곳이 값을 만들어 보내고 있었다. `FIRST_REQUEST({ from: 0 })` · `reloadFrom()` 의 `target - 1` · 순환 이동의 `target - 1`. 이제 정렬 번호는 **응답에서 받은 것만** 쓴다
- **업로드 직후는 재조회 없음** — 생성 응답(67번)이 서버가 매긴 `orderIndex` 를 담아 주므로 `applyCreated()` 가 캐시에 합치고 새 첫 장으로 옮긴다. 기존 목록을 지우지 않고 장수만 더한다
- **삭제 직후는 목록 재조회** — 삭제 응답이 `null` 이라 남은 이미지를 알 수 없고, 뒤 장들의 번호가 앞으로 당겨져 들고 있던 번호가 전부 옛것이 된다. 이때만 71번으로 받아 서버 번호로 통째로 맞춘다
- **107번 필드 선대응** — `readImageBlockNames()` 가 응답에 `blockTitle` · `stepId` · `stepName` 이 실려 있으면 그것으로 표를 만들고, 그러면 `useImageBlockNames` 는 `enabled: false` 라 **아예 켜지지 않는다.** 백엔드 배포만으로 N+1 이 사라진다

### 트러블슈팅

- **업로드·삭제 후 이미지가 안 뜨고 `다시 시도` 도 안 먹혔다.** 첫 장을 받으려고 `GET /blocks/images/{id}/items/0?direction=next` 를 보내고 있었다 — "정렬 번호가 1부터니 0의 `next` 가 1번" 이라는 **프론트 자체 규약**이었는데 서버에 0번은 없는 자리라 그대로 실패했다. `다시 시도`(`reloadFrom(1)` → `1 - 1 = 0`) 도 같은 0 을 다시 보내 **몇 번을 눌러도 복구되지 않았다.** 새로고침만 되던 이유는 그때는 블록 조회(10번) `detail` 의 대표 이미지로 그렸기 때문 → 번호를 만들어 쓰는 경로를 전부 없앴다
- **순환 이동(마지막 → 첫 장)도 같은 0 을 불렀다.** 방향으로 표현할 수 없어 `target - 1` 로 되짚던 자리다 → 캐시에 있을 때만 순환하게 좁혔다. 첫 장은 블록 응답으로 이미 받아 두고 목록 재조회 뒤에는 전부 캐시에 있어 실제로 막히는 경우는 거의 없다

### 부수 결정

- **71번(전체 목록)을 복구 수단으로 쓴다** — 편집 권한이 필요하지만 `다시 시도` · 삭제는 편집자만 하는 동작이라 걸리지 않는다. 진입 때는 대표 이미지가 실려 오는 것이 정상 경로라 여기까지 오지 않는다
- **`ProjectImage` 의 새 필드 3종은 선택(`?`)으로 둔다** — 배포 전에는 안 오므로 필수로 조이면 타입이 거짓말이 된다. 백엔드 배포 확인 후 `?` 를 떼고 `readImageBlockNames()` 의 미배포 분기를 지운다
- **판정 기준은 `stepName` · `stepId`** — `blockTitle` 은 미지정이면 정상적으로 `null` 이라 그것만 보면 "필드가 없다" 와 "제목이 안 붙은 블록" 을 가를 수 없다

---

## [2026-08-14] 프로젝트 상태별 건수 공유 · 요약 카드 공용화 ✅

브랜치: `ref-ys` · API 변경 없음

대시보드와 `내 프로젝트` 가 **같은 4콜을 각자** 쏘고 **같은 카드를 각자** 그리던 것을 하나로 합쳤다. 화면을 옮겨도 건수를 다시 부르지 않는다.

### 변경 파일

| 파일                                           | 변경                                                      |
| ---------------------------------------------- | --------------------------------------------------------- |
| `src/features/project/useProjectCounts.ts`     | **생성** (`useProjectCounts` · `useRefreshProjectCounts`) |
| `src/features/project/ProjectSummaryCards.tsx` | **생성** (요약 카드 5장 + 아이콘 5종 · 실패 안내)         |
| `src/features/dashboard/DashboardSummary.tsx`  | 수정 (186줄 → 14줄, 공용 카드 호출만 남김)                |
| `src/features/project/MyProjectList.tsx`       | 수정 (`ProjectSummary` · 아이콘 5종 제거 · 재시도 연결)   |

### 주요 작업 내용

- **건수 조회를 캐시 한 칸으로** — `queryKey: ['project-counts']` 하나에 4콜 결과를 모은다. 두 화면이 같은 칸을 보므로 대시보드 → `내 프로젝트` 이동 때 **8콜이 4콜**이 되고, 60초 안에 돌아오면 0콜이다
- **요약 카드 공용화** — 카드 5장 · 아이콘 5종 · 실패 안내가 두 파일에 통째로 두 벌이었다. `ProjectSummaryCards` 하나로 합치고 화면마다 다르던 값(`aria-label` · 넓은 화면 간격)만 prop 으로 뺐다
- **목록 재시도가 건수도 함께 읽는다** — 예전에는 `reloadCount` prop 을 내려 다시 세게 했다. `useRefreshProjectCounts()`(= `invalidateQueries`) 로 바꿔 `useRefreshStepBlocks` 와 같은 방식으로 맞췄다

### 트러블슈팅

- 해당 없음 (동작 변경 없이 조회 경로만 합침)

### 부수 결정

- **집계 API 는 백엔드 몫으로 남긴다** — `API.md` 84번에 적힌 대로 상태별 집계 엔드포인트가 없어 `size=1` 로 4번 묻는 구조는 그대로다. 다만 **`useProjectCounts` 의 `queryFn` 한 곳**으로 모아 두어, 엔드포인트가 생기면 화면 코드를 건드리지 않고 갈아끼울 수 있다
- **`staleTime` 은 전역 30초가 아니라 60초** — 건수는 화면을 오가는 사이에 좀처럼 바뀌지 않고, 한 번 읽는 값이 4콜이라 되도록 덜 부르는 편이 낫다
- **`전체` 는 계속 네 상태의 합** — 상태 필터 없이 세면 종결(`CLOSED`)이 섞여 나머지 넷의 합과 어긋난다. 합산 규칙을 훅 안(`total`)으로 옮겨 두 화면이 같은 값을 쓴다

---

## [2026-08-14] 로딩 껍데기를 화면 골격에 맞춤 · 목록 재묶임 흔들림 제거 ✅

브랜치: `ref-ys` · API 변경 없음

`Suspense` 폴백이 **목록만** 그리던 화면 4곳을 화면 골격(머리글 · 필터 바)까지 잡도록 고쳤고, 카드 행 높이가 실제와 어긋나던 두 곳을 맞췄다. 겸해서 프로젝트 전체 화면이 **묶이지 않은 채 떴다가 스테이지별로 다시 묶이던** 흔들림을 없앴다.

### 변경 파일

| 파일                                                | 변경                                                            |
| --------------------------------------------------- | --------------------------------------------------------------- |
| `src/components/Skeleton.tsx`                       | 수정 (`SkeletonPageHeader` · `SkeletonFilterBar` 신설)          |
| `src/components/project/ProjectListSkeleton.tsx`    | 수정 (행 높이 실측 반영 · `ProjectPageSkeleton` 신설)           |
| `src/components/approval/ApprovalSkeletons.tsx`     | 수정 (행 높이 실측 반영 · `ApprovalPageSkeleton` 신설)          |
| `src/components/bidding/NoticeSkeletons.tsx`        | 수정 (`NoticeTableSkeleton` 분리 · `NoticeListSkeleton` 골격화) |
| `src/components/settings/SettingsSkeletons.tsx`     | 수정 (`EmployeeListSkeleton` 신설)                              |
| `src/app/projects/page.tsx`                         | 수정 (폴백을 `ProjectPageSkeleton` 으로)                        |
| `src/app/approvals/page.tsx`                        | 수정 (폴백을 `ApprovalPageSkeleton` 으로)                       |
| `src/app/settings/employees/page.tsx`               | 수정 (폴백을 `EmployeeListSkeleton` 으로)                       |
| `src/features/pagePermission/PageAccessGate.tsx`    | 수정 (`/notices` 등록 · `exact` 옵션 추가)                      |
| `src/features/project/overview/useProjectStages.ts` | 수정 (`{ index, isSettled }` 반환 — 실패도 판정으로 기록)       |
| `src/features/project/overview/ProjectIssues.tsx`   | 수정 (색인 판정 전까지 스켈레톤 유지)                           |
| `src/features/project/overview/ProjectFiles.tsx`    | 수정 (색인 판정 전까지 스켈레톤 유지)                           |

### 주요 작업 내용

- **폴백을 화면 골격으로** — `/projects` · `/approvals` · `/settings/employees` · `/notices` 의 `Suspense` 폴백이 목록·표만 그리고 있었다. 실제 화면은 모두 `머리글 → 필터 바 → 목록` 이라, 폴백이 뜬 뒤 실제 화면으로 바뀌는 순간 목록이 통째로 아래로 내려앉았다. `SkeletonPageHeader` · `SkeletonFilterBar` 를 공용으로 만들고 화면마다 실제 값(글자 크기 · 컨트롤 높이 · 버튼 개수)을 옮겨 적었다
- **행 높이 실측 반영** — `ProjectListSkeleton` 은 `h-[74px]` 고정이었는데 실제 접힌 카드는 ≈57px, `ApprovalListSkeleton` 은 글 두 줄을 30px 로 잡았는데 실제는 42.5px 이었다. 통짜 숫자를 버리고 **실제 카드의 여백 · 칸 너비를 그대로 옮겨** 적었다
- **`/notices` 를 권한 대기 껍데기에 등록** — 폴백이 골격을 안 잡아 미뤄 두었던 `ROUTE_SKELETONS` 항목을 넣었다. 하위 경로(`/notices/new` · `/notices/{id}`)는 화면이 달라 `exact` 옵션을 새로 두어 물려주지 않는다
- **스테이지 재묶임 제거** — `전체 일정` · `문서함` 이 스테이지 색인을 기다리지 않고 먼저 그려, 스텝이 한 덩어리로 늘어섰다가 색인이 도착하는 순간 스테이지별로 다시 묶였다. 제목이 끼어들고 높이가 바뀌어 화면이 한 번 들썩였다

### 트러블슈팅

- **색인 실패와 대기를 구분할 수 없었다.** `useProjectStages` 가 실패를 조용히 삼켜 `index` 가 계속 `null` 이라, 부르는 쪽이 `null` 을 보고 기다리면 **실패한 경우 영영 스켈레톤에 갇힌다** → 실패도 `{ index: null }` 로 **기록**하고 `isSettled` 를 따로 내보내, 성공·실패 모두 한 번에 판정이 끝나게 했다
- **골격 껍데기를 `SkeletonGroup` 으로 감쌌더니 `role="status"` 가 겹쳤다.** 안쪽 `DataTable`(`rows={null}`)이 이미 상태 영역을 낸다 → 바깥은 조각(`<>`)으로 두었다. 머리글 · 필터 막대는 `Skeleton` 자체가 `aria-hidden` 이라 읽히지 않는다

### 부수 결정

- **`SkeletonPageHeader` 는 높이를 받아 쓴다** — 화면마다 제목 크기가 다르다(`text-heading-m` 26px vs `text-logo`+`leading-8` 32px). 기본값을 하나로 정하면 어느 화면이든 어긋나므로 **부르는 쪽이 실제 값을 적는** 방식으로 두고, 주석에 근거(글자 크기 × 줄높이)를 남겼다
- **화면 안 로딩과 폴백은 서로 다른 껍데기다** — 화면 안에서는 머리글 · 필터가 이미 떠 있으므로 목록만 그려야 한다. 그래서 목록 전용(`ProjectListSkeleton` · `ApprovalListSkeleton` · `NoticeTableSkeleton` · `EmployeeTableSkeleton`)과 화면 전용(`*PageSkeleton` · `*ListSkeleton`)을 나눠 두었다
- **`ProjectImages` 의 블록 이름은 그대로 둔다** — `블록 #3` → 실제 이름으로 글자만 바뀌고 묶음 순서는 그대로라 들썩임이 없다. 이름 조회는 사용자가 `블록별로 보기` 를 켠 뒤에야 시작하므로 기다리면 그 조작이 늦어진다

---

## [2026-08-14] 대시보드 달력 조작 개선 · 헤더 로고 경로 고정 ✅

브랜치: `ref-ys` · API 변경 없음

대시보드 `일정` 달력에 **년 · 월 한 번에 고르기**와 **오늘로 이동**을 넣고, 달을 넘길 때 카드가 흔들리던 문제를 잡았다. 겸해서 헤더 로고를 언제나 메인으로 보내도록 바꿨다.

### 변경 파일

| 파일                                           | 변경                                                       |
| ---------------------------------------------- | ---------------------------------------------------------- |
| `src/features/dashboard/DashboardSchedule.tsx` | 수정 (`MonthPicker` 신설 · `오늘` 버튼 · 판 높이 6주 고정) |
| `src/components/Header.tsx`                    | 수정 (로고 링크를 `/` 고정 · `projectScopeUpLink` 제거)    |

### 주요 작업 내용

- **년 · 월 선택 패널** — 제목(`2026년 8월`)이 버튼이 되어 누르면 년도 스테퍼 + 12달 격자가 뜬다. 반년 뒤로 가려고 화살표를 여섯 번 누르지 않아도 된다. 년도는 패널 안에서만 움직이고 달을 눌러야 확정된다
- **`오늘` 버튼** — 달과 고른 날짜를 한 번에 되돌린다. 이미 오늘이면 잠그고 이유를 툴팁으로 알린다. 자리는 달 이동 묶음과 **같은 줄 오른쪽 끝**
- **판 높이 6주 고정** — 달마다 5주 · 6주로 갈리던 것을 빈 칸으로 채워 42칸으로 맞췄다
- **헤더 로고는 언제나 메인(`/`)** — 자리마다 목적지가 달라지지 않게 했다

### 트러블슈팅

- **달을 넘길 때 카드가 통째로 흔들렸다.** `monthCells()` 가 **앞쪽 빈 칸만** 만들고 뒤를 채우지 않아 판이 5줄 · 6줄로 갈렸다. 한 줄이 52px 이고 대시보드 행이 내용 높이로 늘어나는 구조라(`items-stretch`), 옆 `알림` 카드까지 같이 오르내렸다 → 남는 줄을 빈 칸으로 채워 42칸 고정

### 부수 결정

- **`오늘` 은 화살표 옆이 아니라 오른쪽 끝** — 묶음이 한쪽으로 길어져 `2026년 8월` 이 판 가운데에서 밀린다. 성격도 다르다 (화살표 · 제목은 둘러보는 조작, `오늘` 은 제자리로 돌아오는 조작). `grid-cols-[1fr_auto_1fr]` 로 왼쪽 빈 칸이 균형을 맞춘다
- **패널 닫기는 `onBlur` + `Escape`** — document 리스너 없이 자기 안에서 끝낸다. 바깥을 누르면 초점이 `body` 로 빠져 `relatedTarget` 검사에 걸린다
- **`오늘` 의 기준 시각은 기존 `now`(마운트 시각)를 그대로 쓴다** — 클릭 때 새 `Date` 를 만들면 자정을 넘겼을 때 오늘 강조(옛 `now` 기준)와 어긋난다. 한계는 같지만 화면 안에서 **일관**된다
- **헤더 로고만 예외로 두고 사이드바 이탈 링크는 유지** — 한 칸 위로 가는 수단은 `ProjectSidebar` 가 계속 든다 (2026-08-14 이탈 경로 규칙)

---

## [2026-08-14] 스텝 블록 목록 react-query 전환 + 새로고침 버튼 ✅

브랜치: `ref-ys` · API 변경 없음 · 이슈: #154

스텝 블록 목록의 조회·캐시·재조회를 `@tanstack/react-query` 로 옮기고, 스텝 이름 왼쪽에 **블록 영역만** 다시 읽는 새로고침 버튼을 달았다.

### 변경 파일

| 파일                                         | 변경                                                                     |
| -------------------------------------------- | ------------------------------------------------------------------------ |
| `package.json`                               | 수정 (`@tanstack/react-query@^5.101.4` 추가)                             |
| `src/app/providers.tsx`                      | **생성** (`QueryClientProvider` · 전역 기본 옵션)                        |
| `src/app/layout.tsx`                         | 수정 (`Providers` 로 `AppShell` 감쌈)                                    |
| `src/features/block/useStepBlocks.ts`        | **생성** (`useStepBlocks` · `useSetStepBlocks` · `useRefreshStepBlocks`) |
| `src/features/block/RefreshBlocksButton.tsx` | **생성** (아이콘 버튼 · 회전 표시 · 편집 중 잠금)                        |
| `src/features/block/api.ts`                  | 수정 (`getStepBlocksResponse` 신설 — 원본 응답 반환)                     |
| `src/features/project/useProjectSteps.ts`    | **생성** (`useProjectSteps` · `useStepName` · `useRefreshProjectSteps`)  |
| `src/components/ProjectSidebar.tsx`          | 수정 (스텝 목록을 공용 캐시로 · `reload()` · 이슈 갱신이 무효화)         |
| `src/features/block/StepBlocks.tsx`          | 수정 (수동 패칭 제거 → 훅 사용 · 새로고침 버튼 배치 · `bodyGeneration`)  |
| `src/features/block/BlockBoard.tsx`          | 수정 (`bodyGeneration` prop — 본문 key 에 실어 재마운트)                 |
| `src/features/block/ChecklistBlock.tsx`      | 수정 (`detail` 참조 변경 시 항목 목록 재동기화)                          |

### 주요 작업 내용

- **`useQuery` 전환** — `queryKey: ['step-blocks', stepId]` 로 스텝별 캐시 분리. `staleTime` 30초 · `gcTime` 5분이라 스텝 탭을 오가도 스켈레톤이 다시 뜨지 않는다
- **`select` 로 껍질 벗기기** — 캐시에는 응답 원본(`{ blocks }`)을 담고 컴포넌트에는 배열만 준다. 서버가 형제 필드를 얹어도 캐시 형태를 안 바꿔도 된다
- **재조회 트리거 일원화** — `block:changed` 이벤트 · 화면 복귀 · 블록 생성 · 재시도 4곳이 모두 `useRefreshStepBlocks()`(= `invalidateQueries`) 하나를 부른다. 기존 `reloadCount` state 삭제
- **스텝 이름도 캐시로** — 매 진입마다 `getProjectSteps()` 를 새로 부르던 `useEffect` 를 `useStepName()` 으로 바꿨다. 목록은 `['project-steps', projectId]` 에 한 벌만 담기고 `select` 가 이름 한 줄만 꺼낸다. 이름은 좀처럼 안 바뀌므로 `staleTime` 5분, 대신 **바뀌는 순간**(`ProjectSidebar.reload` — 생성 · 이름 · 순서 · 상태 · 삭제가 모두 지나가는 단일 창구)에 무효화한다
- **사이드바도 같은 스텝 캐시를 본다** — `ProjectSidebar` 가 `Promise.all` 로 직접 받던 스텝 목록을 `useProjectSteps()` 로 바꿨다. 스텝 화면에서는 사이드바와 블록 헤더가 나란히 떠 있어 **같은 목록을 두 번 받던 것이 한 번**이 된다. 이슈 변경(진척률) 갱신도 직접 조회 대신 캐시 무효화로 바꿔, 사이드바 진척률과 헤더 이름이 항상 같은 응답에서 나온다
- **새로고침 버튼** — 스텝 이름 왼쪽. 누르면 미뤄둔 배치를 먼저 보내고(`flushLayout`) 재조회한다. 최소 500ms 회전 + 완료 토스트로 결과를 알리고, 배치 편집 중에는 잠근다. 재조회 대상이 블록 목록 하나라 페이지 나머지는 그대로다

### 트러블슈팅

- **새로고침이 "안 눌린 것처럼" 보인다.** 블록이 적으면 응답이 100ms 안에 와서 아이콘이 깜빡이지도 않고 끝난다. 게다가 바뀐 게 없으면 화면도 그대로라 **"변경 없음" 과 "동작 안 함" 이 구별되지 않는다** → 최소 회전 시간(`MIN_SPIN_MS` 500)과 완료 토스트를 함께 넣었다. 한 번 "안 되는 버튼" 으로 학습되면 다시 눌리지 않는다
- **새로고침해도 블록 본문이 그대로다.** 목록만 새로 받아서는 본문이 따라오지 않는다. 두 가지 원인이 섞여 있었다 — ① `detail` 을 첫 렌더에 **베껴 두고 화면이 주인이 되는** 유형(`ChecklistBlock` · `ImageBlock` · `ApprovalBlock` · `AiBlock`), ② 목록과 무관하게 **자기 API 를 직접 부르는** 유형(`FileBlock` · `ApprovalBlock` · `AiBlock`). `TextBlock` 만 렌더 중 상태 조정으로 ①을 이미 처리하고 있었다 → 새로고침 성공 시 `bodyGeneration` 을 올려 **본문만 다시 마운트**하는 것으로 열 유형을 한 번에 맞췄다. 겸해서 `ChecklistBlock` 에도 `TextBlock` 과 같은 `detail` 동기화를 넣어 자동 재조회 경로까지 따라가게 했다
- **새로고침이 대기 중인 배치를 삼킨다.** 드래그 직후(디바운스 0.5초) 새로고침을 누르면 새 목록이 도착 → 보드가 로컬 순서를 버리고 `saver.reset()` → `pending` 이 `null` 로 지워져 **방금 옮긴 배치가 조용히 사라진다.** 화면을 떠날 때 · 블록을 만들 때처럼 `flushLayout.current?.()` 를 먼저 부르는 것으로 맞췄다
- **`select` 로 "수정된 블록만" 가져올 수 없다.** `select` 는 이미 받아온 캐시 데이터를 가공하는 옵션이지 네트워크를 나누는 장치가 아니다. 블록 목록 API(`GET /steps/{stepId}/blocks`)에 증분 파라미터가 없어 요청은 언제나 스텝 전체다 — 얻는 것은 "부분 패칭"이 아니라 **캐시 · 요청 중복 제거 · 재조회 지점 단일화**다

### 부수 결정

- **`select` 에서 정렬하지 않는다.** 드래그로 바뀐 순서를 캐시에 꽂는 경로(`useSetStepBlocks`)가 있는데, 그 시점의 `rowIndex` · `sortOrder` 는 아직 저장 전 옛 값이다. 여기서 좌표순으로 다시 세우면 방금 옮긴 배치가 튕겨 돌아간다 (2026-08-11 기록과 같은 함정). 정렬은 `BlockBoard` 의 `toFlatOrder()` 가 계속 맡는다
- **`QueryClient` 는 `useState` 초기화로 만든다** — 모듈 최상단에 두면 서버에서 요청 간 캐시가 공유된다
- **`refetchOnWindowFocus: false`** — 블록은 이미 `visibilitychange` 로 복귀 시 재조회 중이라 중복이다
- **`getStepBlocks` 는 시그니처 그대로 남겼다** — 활동 기록 · 이슈 폼 · 스텝 삭제 모달 등 5곳이 쓰고 있어 원본 반환 함수를 따로 뺐다
- **적용 범위는 블록 목록만** — 다른 화면은 기존 `useEffect` + `lib/api.ts` 방식 유지. 한 번에 갈아엎지 않는다
- **새로고침 버튼은 처음 불러오는 중에도 잠그지 않는다** — 첫 화면부터 회색 버튼이 놓여 있으면 "고장 난 버튼" 으로 학습된다. 중복 요청은 react-query 가 합쳐 준다
- **회전은 `isFetching` 이 아니라 버튼이 만든 상태로 돌린다** — 화면 복귀 · 블록 생성처럼 사용자가 부르지 않은 재조회까지 아이콘이 돌면 설명되지 않는 움직임이 된다
- **버튼은 `refetch()`, 나머지 트리거는 `invalidateQueries()`** — 토스트를 띄우려면 성공/실패를 알아야 하는데 `invalidateQueries` 는 결과를 돌려주지 않는다. 네트워크 동작은 같다
- **실패해도 토스트를 띄우지 않는다** — 오류 화면(`ErrorStateTwoButton`)이 이미 자리를 차지하고 말한다. 겹치면 같은 말을 두 번 한다
- **스텝 이름 무효화는 사이드바 `reload()` 한 곳에서만 건다** — 스텝을 고치는 모달(생성 · 수정 · 삭제 · 상태 · 순서)이 전부 `ProjectSidebar` 안에 있고 저장 후 `reload()` 로 모인다. 모달마다 무효화를 심으면 새 모달이 생길 때 빠뜨리기 쉽다
- **스텝 목록만 캐시로 옮기고 프로젝트 · 스테이지는 그대로 뒀다** — 사이드바에서 그 둘을 함께 보는 화면이 없어 캐시를 나눌 이득이 없다. 스텝은 헤더와 **실제로 공유되는 유일한 값**이다
- **스켈레톤 조건은 손대지 않았다** — 스텝과 스테이지가 이제 따로 도착하지만, 원래 `!stages || !steps` 로 둘 다 기다리게 되어 있어 중간 상태가 화면에 새지 않는다
- **`select` 로 이름 한 줄만 꺼낸다** — 스텝 20개짜리 프로젝트에서 다른 스텝이 바뀌어도 반환값(문자열)이 그대로면 헤더는 다시 그리지 않는다. `useQuery` 결과를 그대로 받아 컴포넌트에서 `find()` 하면 목록이 바뀔 때마다 렌더가 돈다
- **본문 재마운트는 새로고침 버튼에서만 한다** — 화면 복귀 · 블록 생성 같은 자동 재조회에서 본문이 통째로 리셋되면(캐러셀 첫 장으로 · 열어둔 메뉴 닫힘) 설명되지 않는 움직임이 된다. 사용자가 누른 새로고침에서는 리셋이 오히려 기대되는 결과다
- **블록마다 `detail` 동기화를 넣는 대신 재마운트를 골랐다** — 유형이 10종이고 각각 진행 중인 낙관적 갱신 · 자체 조회와 경합을 따로 따져야 한다. 자동 경로까지 정확히 따라가게 하려면 결국 유형별 동기화가 필요하지만(백로그), 새로고침 한정으로는 재마운트가 같은 결과를 훨씬 적은 위험으로 낸다
- **자동 갱신(`refetchOnWindowFocus`)은 넣지 않았다** — 읽는 중에 목록이 갈리면 쫓던 카드가 움직이고 남이 지운 블록이 눈앞에서 사라진다. 사용자는 자기가 만들지 않은 변화를 버그로 인식한다. 같은 변화라도 **본인이 버튼을 누른 뒤**면 납득한다

---

## [2026-08-14] 네비게이션 이탈 경로 · 로고 · 헤더 제목 정리 (#152) ✅

브랜치: `style`

이탈 경로 · 로고 · 헤더 제목 · 진척률 표기 네 가지를 한 번에 정리했다. 전부 화면 표기 문제라 API 변경은 없다.

### 변경 파일

| 파일                                              | 변경                                                |
| ------------------------------------------------- | --------------------------------------------------- |
| `src/components/Logo.tsx`                         | **생성** (`logo-vitaS.svg` · `logo-S.svg` 워드마크) |
| `src/constants/menu.ts`                           | 수정 (`projectScopeUpLink()` 신설)                  |
| `src/components/Header.tsx`                       | 수정 (제목 `sr-only` · 로고 교체 · 이탈 링크)       |
| `src/components/Sidebar.tsx`                      | 수정 (로고 교체 + 홈 링크)                          |
| `src/components/ProjectSidebar.tsx`               | 수정 (이탈 링크 펼침·접힘 · 진척률 `%` 줄바꿈)      |
| `src/features/project/ProjectCard.tsx`            | 수정 (진척률 `%` 줄바꿈)                            |
| `src/features/project/overview/ProjectIssues.tsx` | 수정 (진척률 `%` 줄바꿈 · 칸 폭 확보)               |
| `src/features/settlement/SettlementBlock.tsx`     | 수정 (수급 진행률 `%` 줄바꿈)                       |

### 주요 작업 내용

- **이탈 경로를 한 칸 위로** — 스텝 화면(`/projects/{id}/steps/{stepId}`)은 그 프로젝트로, 나머지 프로젝트 화면은 메인(`/`)으로. 판단은 `projectScopeUpLink()` 하나가 하고 `ProjectSidebar`(펼침·접힘) · `Header` 로고가 함께 쓴다
- **헤더 제목 삭제** — 사이드바가 이미 현재 위치를 말해 중복이었다. 다만 지우기만 하면 `h1` 이 사라져 `sr-only` 로 남겼다
- **로고 에셋 적용** — 텍스트 워드마크(`VitaS`)를 실제 SVG 로 교체, 사이드바 접힘(58px)에서는 `S` 마크
- **진척률 `100%` 줄바꿈 수정** — 숫자와 `%` 를 한 문자열로 합치고 `whitespace-nowrap` 적용

### 트러블슈팅

- **`100` 과 `%` 가 두 줄로 갈렸다.** JSX `{rate}%` 는 숫자·`%` 를 **다른 텍스트 노드**로 그려서, 세 자릿수가 되어 칸이 빠듯해지면 브라우저가 그 사이를 줄바꿈 지점으로 잡는다 → ``{`${rate}%`}`` + `whitespace-nowrap`. `ProjectIssues` 는 칸 폭(`w-8`)이 `100%` 보다 좁아 폭도 함께 넓혔다
- **이탈 경로 규칙을 두 번 고쳤다.** 처음엔 프로젝트 화면 → `/projects`(목록)로 잡았는데, 실제로 원한 것은 **스텝 → 프로젝트**, **프로젝트 → 홈** 이었다. 규칙이 세 곳(펼침·접힘·헤더)에 흩어져 있어 함수로 모은 뒤 한 곳만 고치게 만들었다

### 부수 결정

- **로고는 `alt=""` 장식**이고 이름 · 목적지는 감싸는 링크의 `aria-label` 이 든다 — 둘 다 읽으면 "VitaS 홈으로 이동" 처럼 겹친다
- **`titleOf()` 의 빈 문자열 fallback 을 `VitaS` 로** — 제목이 화면에 없던 때는 빈 자리로 끝났지만, 이제는 `h1` 이 통째로 비어 스크린리더가 제목을 못 읽는다
- **접힌 사이드바도 같은 이탈 경로를 쓴다** — 접었다고 나가는 곳이 달라지면 같은 버튼이 아니게 된다. `upLink` 를 props 로 내려 한 값에서 갈라지게 했다

---

## [2026-08-14] 메인 대시보드 화면 (#150) ✅

브랜치: `page/main` · API: `GET /issues/calendar` (142번 신설)

빈 껍데기였던 `/` 를 시안대로 채웠다. **프로젝트 요약 · 내 프로젝트 · 알림 · 일정 + 이슈** 네 구역이고, 목데이터 없이 **전부 실 API** 로 붙었다.

### 변경 파일

| 파일                                                | 변경                                                |
| --------------------------------------------------- | --------------------------------------------------- |
| `src/features/dashboard/DashboardSummary.tsx`       | **생성** (상태별 통계 카드 5장)                     |
| `src/features/dashboard/DashboardProjects.tsx`      | **생성** (내 프로젝트 최대 3건 + 전체보기)          |
| `src/features/dashboard/DashboardNotifications.tsx` | **생성** (알림 — 미확인 우선 · 유형 배지)           |
| `src/features/dashboard/DashboardSchedule.tsx`      | **생성** (캘린더 + 고른 날짜의 이슈, 한 상자 2분할) |
| `src/app/page.tsx`                                  | 수정 (`PageTitle` 껍데기 → 4구역 조립 · `metadata`) |
| `src/features/issue/types.ts`                       | 수정 (`CalendarIssue`)                              |
| `src/features/issue/api.ts`                         | 수정 (`getIssueCalendar()`)                         |
| `src/constants/endpoints.ts`                        | 수정 (`issues.calendar`)                            |
| `.ai/API.md`                                        | 수정 (142번 신설 — 캘린더 조회)                     |

### 주요 작업 내용

- **프로젝트 요약** — `내 프로젝트` 화면과 같은 집계 방식(`getProjectCount`) · 같은 팔레트
- **내 프로젝트 3건** — `ProjectCard` 를 그대로 재사용하고 서버에 `size=3` 으로 물어 필요 없는 건은 안 받는다
- **알림** — 미확인이 항상 위, 남은 자리만 확인 알림으로 채움. 줄은 `점 + 유형 배지 + 내용` 한 줄
- **일정 캘린더** — 진입 시 1회 조회 후 월 이동은 받아 둔 데이터에서 필터링, `projectId` 기준 색 매핑 + 범례
- **이슈 패널** — 고른 날짜의 담당 이슈를 프로젝트별로 묶고, 누르면 그 이슈의 상세 모달이 열린 채로 이슈 보드에 도착

### 부수 결정

- **`MyProjectList` · `ProjectCard` 를 수정하지 않았다** — `STATE.md` 상 보호 중인 파일이라 **import 만** 했다. 요약 카드는 같은 API · 같은 팔레트로 대시보드 쪽에 따로 세웠다
- **캘린더는 한 번만 부른다** — `GET /issues/calendar` 에 기간 파라미터가 없다. 달을 넘길 때마다 부르면 같은 응답을 계속 받는다
- **프로젝트 색은 화면이 매긴다** — 응답에 색이 없어 `projectId` 등장 순서로 6색을 돌린다. 색이 모자라면 겹칠 수 있지만, 범례가 이름을 함께 보여주므로 구분이 막히지 않는다
- **알림 줄에서 `title` · 날짜를 뺐다** — `title` 은 `결재 요청` 처럼 유형 배지와 같은 말이고, 대시보드는 훑는 자리라 시각은 알림 화면 몫이다
- **캘린더 + 이슈는 한 상자** — 날짜를 고르는 곳과 그 결과라 테두리로 가르면 상관없는 상자로 읽힌다. 대신 `알림(1) : 캘린더+이슈(2)` 로 폭을 나눴다
- **알림 목록을 두 번 부른다** — 서버가 읽음 여부와 무관하게 최신순으로만 줘서, 그대로 쓰면 오래된 미확인이 새 알림에 밀려 내려간다. `isRead=false` · `isRead=true` 를 따로 받아 잇는다 (호출 수는 배지용 조회를 겸해 이전과 같은 2건)

### 트러블슈팅

- **캘린더에 `new Date()` 를 그대로 쓰면 하이드레이션이 깨진다.** 서버(대개 UTC)와 브라우저의 '오늘' 이 다르면 SSR HTML 과 어긋난다 → `useSyncExternalStore(subscribe, () => true, () => false)` 로 **하이드레이션 이후에만** 달력을 그린다
- **이펙트에서 오늘 날짜를 `setState` 하려다 린트에 막혔다** (`react-hooks/set-state-in-effect`). 위 방식으로 바꾸면서 setState 자체가 사라졌다 — 규칙이 더 나은 코드로 밀어준 경우다
- **API 번호가 겹쳤다.** 프로젝트 절 끝이 139 라 140 으로 적었는데, 140(`GET /files/my`) · 141(알림 SSE)이 다른 절에서 이미 쓰이고 있었다 → **142** 로 정정
- **100% 배율에서 알림과 일정이 세로로 떨어졌다.** 나란히 서는 기준을 `2xl`(1536px)로 잡았는데 사이드바 280px 를 빼면 본문이 그 폭을 못 넘긴다 → `xl`(1280px)로 낮춤

---

## [2026-08-14] 결재 참여 불가 · 블록 삭제 · 알림 SSE · 권한 에러 ✅

브랜치: `fix/approval-notification-access`

5개 요청을 한 브랜치에 묶었다. 서로 독립적이라 **항목별로 커밋을 끊었다.**

### 변경 파일

| 파일                                                                   | 변경                                                       |
| ---------------------------------------------------------------------- | ---------------------------------------------------------- |
| `src/features/approval/unavailable.ts`                                 | **생성** (참여 불가 판정 · 결재선 재구성)                  |
| `src/features/approval/ApproverReplaceModal.tsx`                       | **생성** (결재자 교체 · 제외 전용 모달)                    |
| `src/features/notification/stream.ts`                                  | **생성** (SSE 구독)                                        |
| `src/features/notification/NotificationStreamProvider.tsx`             | **생성** (셸에 연결 하나만)                                |
| `src/features/approval/ApprovalBlock.tsx`                              | 수정 (참여 불가 배너 2종 · 첨부 문서 목록 · 상세보기 제거) |
| `src/features/approval/types.ts`                                       | 수정 (참여 불가 필드 4종 — 전부 선택)                      |
| `src/features/block/api.ts` · `errorCodes.ts` · `BlockDeleteModal.tsx` | 수정 (삭제 2단계 · 409 되물음)                             |
| `src/features/pagePermission/PageAccessGate.tsx`                       | 수정 (`/forbidden` 이동 → 본문 자리에 표시)                |
| `src/features/notification/NotificationBell.tsx`                       | 수정 (폴링 5초 → 2분)                                      |
| `src/features/notification/display.ts`                                 | 수정 (이슈 알림에 `targetId` 를 쿼리로)                    |
| `src/features/issue/IssueBoard.tsx`                                    | 수정 (`?issue=` 딥링크로 상세 모달 개방)                   |
| `src/features/project/routes.ts`                                       | 수정 (`stepIssues()` 에 `issueId` · `ISSUE_PARAM`)         |
| `src/components/AppShell.tsx` · `src/constants/endpoints.ts`           | 수정 (스트림 구독 위치 · 엔드포인트)                       |
| `.ai/API.md`                                                           | 수정 (141번 신설 · 47번 2단계 · 결재 참여 불가 절)         |

### 주요 작업 내용

- **권한 에러를 본문 자리에** — 사이드바에서 누른 결과가 전체 화면 오류라 길을 잃던 문제
- **결재 블록 삭제 2단계** — 409 를 되물음으로 처리하고 서버 `message` 를 그대로 표시
- **알림 SSE** — 셸에 연결 하나, 폴링은 안전망으로 남기고 간격만 늘림
- **알림 → 이슈 상세 모달** — 보드까지만 가던 것을 그 이슈까지
- **결재 참여 불가 대응** — 기안자는 재상신, 결재자는 교체 · 제외 전용 모달
- 결재 블록의 죽은 `결재 상세 보기` 버튼을 **첨부 문서 목록**으로 교체

### 부수 결정

- **밀려온 알림을 목록에 끼워 넣지 않는다** — 신호만 받고 기존 조회를 다시 태운다. 배지는 `totalElements` 라 서버만 정확히 알고, 폴링이 남아 있어 `notificationId` dedupe 문제가 생긴다. 알림은 드물게 오므로 요청 한 번이 더 나가는 편이 싸다
- **폴링을 지우지 않았다** — `SSE = 즉시성` · `폴링 = 정합성`. 대신 5초 → 2분이라 **사용자당 분당 12회 → 0.5회**로 줄었다
- **401 을 스트림에서 처리하지 않는다** — `lib/api.ts` 에 전역 401 처리가 이미 있어 남은 주기 조회가 대신 태운다. 인증 로직을 두 곳에 두지 않는다
- **`/forbidden` 라우트는 남겼다** — 셸 밖에서 403 을 받는 경로가 계속 쓴다
- **참여 불가 필드를 전부 선택으로** — 응답 내 위치를 실측하지 못해, 값이 안 오면 배너가 안 뜰 뿐 기존 화면이 그대로 동작하게 했다. 판정은 `unavailable.ts` 한 곳에 모아 화면이 필드를 직접 보지 않는다
- **교체 · 제외에 전용 모달** — `ApprovalDraftForm` 은 초안용이라 진행 중 결재에 열면 승인 완료된 결재선까지 건드린다

### 트러블슈팅

- **딥링크 모달을 이펙트로 열려다 린트에 두 번 막혔다.** `react-hooks/set-state-in-effect`(이펙트 내 setState) → ref 우회 시도 → `react-hooks/refs`(렌더 중 ref 접근). 결국 **상태에 파라미터를 동봉해 렌더 중에 파생**하는 방식으로 갔다. 규칙이 더 나은 코드로 밀어준 경우다 — 이펙트 방식은 보드가 먼저 그려진 뒤 모달이 뒤늦게 뜨는 깜빡임이 있었다
- **결재자 처리 후에도 배너가 남았다.** 배너를 켜는 `requiresApproverReplacement` 는 **블록 목록**이 주는 값이라 회차만 다시 받으면 안 사라진다 → `notifyBlockChanged()` 를 함께 쏜다
- **`결재 상세 보기` 가 안 눌렸다.** 화면(`/approvals/[approvalId]`)은 이미 있는데 버튼이 화면 없던 시절의 죽은 `span` 으로 남아 있었다. 사용자 요청으로 버튼 자체를 없애고 첨부 문서 목록으로 대체
- **SSE 재연결과 장애를 구분해야 한다.** 서버가 30분마다 정상 종료하고 브라우저가 다시 붙는데 그 재연결도 `onerror` 를 거친다 — `readyState` 가 `CLOSED` 일 때만 정리한다

---

## [2026-08-13] 내 프로젝트 파일 모아보기 ✅

브랜치: `feat/my-files` · API: `GET /files/my` (FILE-Q-03)

### 변경 파일

| 파일                                             | 변경                                                   |
| ------------------------------------------------ | ------------------------------------------------------ |
| `src/features/file/MyFileList.tsx`               | **생성** (목록 · 검색 · 필터 · 프로젝트별 접기)        |
| `src/features/file/groupMyFiles.ts`              | **생성** (프로젝트 그룹핑 · 필터 선택지)               |
| `src/features/file/LazyFileViewer.tsx`           | **생성** (뷰어 지연 로딩 — `ProjectFiles` 와 공용)     |
| `src/app/files/page.tsx`                         | **생성** (`/files` 라우트)                             |
| `src/features/file/types.ts`                     | 수정 (`MyFile` · `MyFileQuery`, `ViewerFile` nullable) |
| `src/features/file/api.ts`                       | 수정 (`getMyFiles()`)                                  |
| `src/features/project/overview/ProjectFiles.tsx` | 수정 (중복 뷰어 블록 → `LazyFileViewer` 로 교체)       |
| `src/constants/endpoints.ts`                     | 수정 (`files.my`)                                      |
| `src/constants/menu.ts`                          | 수정 (`file` 아이콘 · `MENU_ORDER` · `FIXED_BY_ROLE`)  |
| `src/components/MenuIcon.tsx`                    | 수정 (`file` 아이콘 SVG)                               |
| `src/features/pagePermission/catalog.ts`         | 수정 (`MY_FILE` → `/files` 선반영)                     |
| `.ai/API.md`                                     | 수정 (140번 신설 — 105번 옆에 배치)                    |

### 주요 작업 내용

- 내가 멤버인 모든 프로젝트의 파일을 **프로젝트별로 묶어** 보여주는 `/files` 화면 신설
- 검색 · 프로젝트 · 확장자 필터를 **서버 쿼리**로 넘긴다 (페이징 없음 — 전체를 받아 스크롤)
- 뷰어 · 미리보기 프리페치 · 다운로드 · 확장자 스타일은 `features/file/` 자산을 **그대로 재사용**
- 사이드바 `내 파일` 항목 추가 (MASTER · MEMBER)

### 부수 결정

- **`MyFile` 이 `ProjectFile` 을 확장한다** — 응답이 105번 + 프로젝트 정보 모양이라, 뷰어(`ViewerFile`)와 문서 행을 **한 줄도 안 고치고** 재사용할 수 있다
- **필터 선택지는 "필터 없는 응답"에서만 만든다** (`optionSource`) — 걸러진 목록으로 만들면 프로젝트 A 를 고른 순간 선택지도 A 하나가 되어 되돌아갈 수 없다
- **사이드바는 `FIXED_BY_ROLE` 로 넣었다** — `/my/pages` 에 이 화면의 `pageCode` 가 아직 없다. `catalog.ts` 에 `MY_FILE` 매핑을 선반영해 두어, 코드가 응답에 실리면 `useMenuItems()` 가 고정 항목을 자동으로 걷어낸다
- **ADMIN 에게는 노출하지 않는다** — 시스템 계정은 프로젝트 멤버가 될 수 없어 늘 빈 목록이다 (`MY_PROJECT` 와 같은 이유)
- **미리보기 버튼은 `previewable` 일 때만** 그린다 — 눌러도 빈 화면인 버튼을 두지 않는다
- **역할 배지(PM · 참여)는 뺐다** — 목업에는 있으나 응답에 필드가 없다

### 트러블슈팅

- **`ViewerFile` 타입이 좁아 `tsc` 가 막았다.** `uploaderDepartment?: string` 인데 이 API 는 시스템 계정에 **`null`** 을 보낸다. 뷰어 런타임은 이미 `?? ''` 로 처리하고 있었고 **타입만 틀린** 상태라 `string | null` 로 넓혔다
- **뷰어 지연 로딩 블록이 `ProjectFiles` 와 통째로 중복**이었다(청크 분리 · 대기 자리 · 프리로드 40여 줄) → `LazyFileViewer.tsx` 로 빼고 두 화면이 함께 쓴다
- **`updatedAt` 이 공백 구분(`2026-08-06 12:30:39`)** 으로 온다. `lib/format.ts` 의 `DATE_PATTERN` 이 `[ T]` 를 모두 받아 그대로 통과했다
- ⚠️ **로그인이 필요해 브라우저 확인을 못 했다** — `/files` 는 인증 가드가 로그인 화면으로 돌린다. `tsc` · `eslint` 만 통과 확인

---

## [2026-08-13] 삭제된 사업 카테고리 재등록 대응 ✅

브랜치: `fix/business-category-deleted-reuse` · 백엔드: PR #337 (D-7)

### 변경 파일

| 파일                                                  | 변경                                                |
| ----------------------------------------------------- | --------------------------------------------------- |
| `src/features/businessCategory/CategoryList.tsx`      | 수정 (삭제 행 하단 정렬 · `opacity-60` 흐리게)      |
| `src/features/businessCategory/errorCodes.ts`         | 수정 (409 두 코드 주석 — 활성 행만 대상)            |
| `src/features/businessCategory/CategoryFormModal.tsx` | 수정 (JSDoc — 재등록 허용 · `code` 로만 분기 근거)  |
| `.ai/API.md`                                          | 수정 (15 · 16 · 17 에 재등록 허용 · 중복 노출 노트) |

### 주요 작업 내용

- 백엔드가 중복 검사를 **활성 행(`deletedAt == null`)만** 대상으로 바꿔 삭제한 이름 · 업무코드를 다시 등록할 수 있게 됐다 — `includeDeleted=true` 목록에 **같은 이름 두 줄이 공존**할 수 있어 화면을 갈랐다
- 삭제 행을 목록 하단으로 내리고 `opacity-60` 으로 흐리게 (`sort` 안정 정렬이라 백엔드의 이름 오름차순은 묶음 안에서 유지)
- 409 분기가 이미 `code` 기준이라 **에러 문구 관련 코드 변경은 없었다** — 사라진 `"삭제된 카테고리에 같은 이름이…"` 문구에 의존하는 코드가 전무했음을 grep 으로 확인

### 부수 결정

- **정렬은 프론트에서** — 목록 API 에 정렬 파라미터가 없고 전체를 받아 스크롤로 보여주는 구조라, 받은 배열을 그대로 안정 정렬한다
- **행 key 는 손대지 않았다** — 이름이 같아도 `categoryId` 가 달라 충돌하지 않는다
- **삭제 행의 `⋯` 메뉴는 계속 숨긴다** — 수정 · 삭제가 여전히 404 다. 복구(restore) 엔드포인트는 백엔드가 추가하지 않았고 재등록이 곧 재사용 경로

---

## [2026-08-13] 프로필 사진 · 연락처 자동 하이픈 🚧 진행 중

브랜치: `feat/profile-image` · 이슈: #18

### 변경 파일

| 파일                                                                    | 변경                                                       |
| ----------------------------------------------------------------------- | ---------------------------------------------------------- |
| `src/lib/api.ts`                                                        | 수정 (`putForm` 추가 — `postForm` 과 `sendForm` 으로 통합) |
| `src/lib/format.ts`                                                     | 수정 (`formatPhone` 추가)                                  |
| `src/constants/endpoints.ts`                                            | 수정 (`auth.profileImage` · `employees.profileImage`)      |
| `src/features/auth/types.ts`                                            | 수정 (`profileImageUrl` · 업로드 제약 상수)                |
| `src/features/auth/api.ts`                                              | 수정 (`uploadProfileImage` · `deleteProfileImage`)         |
| `src/features/auth/errorCodes.ts`                                       | 수정 (`PROFILE_IMAGE_ERROR_MESSAGES`)                      |
| `src/features/auth/CurrentUserProvider.tsx`                             | 수정 (`SetProfileImageContext`)                            |
| `src/features/auth/useCurrentUser.ts`                                   | 수정 (`useSetProfileImage`)                                |
| `src/features/auth/ProfileImageField.tsx`                               | **생성** (미리보기 · 변경 · 삭제)                          |
| `src/components/MemberAvatar.tsx`                                       | 수정 (사진 렌더 · 이니셜 폴백 · 크기 5종)                  |
| `src/components/ProfileMenu.tsx`                                        | 수정 (헤더 프로필 placeholder → `MemberAvatar`)            |
| `src/components/Sidebar.tsx`                                            | 수정 (사이드바 프로필 placeholder → `MemberAvatar`)        |
| `src/app/mypage/page.tsx`                                               | 수정 (`프로필 사진` 카드 · `Card` 에 `isPlain`)            |
| `src/features/employee/EmployeeCreateForm.tsx` · `EmployeeEditForm.tsx` | 수정 (연락처 입력에 `formatPhone`)                         |
| `.claude/launch.json`                                                   | 수정 (포트 3000 → 3001 — `npm run dev` 와 어긋나 있었다)   |

### 주요 작업 내용

- 마이페이지에서 프로필 사진 등록 · 변경 · 삭제 (`PUT` · `DELETE /auth/me/profile-image`)
- `MemberAvatar` 가 사진을 그리고 실패하면 이니셜로 떨어진다 — **호출 15곳은 손대지 않았다** (사번으로 서빙 경로를 만들기 때문)
- 헤더 · 사이드바의 `TODO: 프로필 이미지 자리` placeholder 2곳 제거
- 사원 등록 · 수정 폼의 연락처 입력에 자동 하이픈 (`formatPhone`)

### 부수 결정

- **`MemberAvatar` 가 사번으로 서빙 경로를 만든다** — 목록 응답에 사진 URL 이 없어 호출 측을 15곳 고치는 대신 컴포넌트가 경로를 짓는다. **사번은 접두어까지 포함한 값(`vitas-EMP001`)이 그대로 경로에 들어간다** — 잠깐 `vitas-` 를 별도 접두어로 오해해 이 방식을 폐기했다가 되돌렸다. 사진이 없는 사번은 세션 캐시(`missingAvatars`)에 담아 404 반복 호출을 막는다 (목록 응답에 필드가 생기면 캐시째 제거 — STATE 백로그)
- **본인 아바타만 `imageUrl` 로 직접 받는다** — 사진을 바꾼 직후 갱신돼야 하는 자리(마이페이지 · 헤더 · 사이드바)라 사번 경로가 아니라 `/auth/me` 값을 넘긴다
- **`refetch` 대신 `SetProfileImageContext`** — `CurrentUserProvider.refetch` 는 `user` 를 `null` 로 돌려 children 을 통째로 다시 그린다. 사진 한 장에 앱 전체가 `불러오는 중…` 으로 깜빡여서 사진 필드만 갈아끼우는 경로를 따로 뒀다
- **업로드는 `PUT`** — 멱등 교체라 `postForm` 을 재사용하지 않고 `putForm` 을 만들었다
- `formatPhone` 은 **입력 중에도 쓰므로 자르지 않는다** — 친 만큼만 끊는다

### 트러블슈팅

- **업로드는 200 인데 사진이 안 바뀌었다.** 원인이 둘이었다.
  1. `profileImageUrl` 이 `/api/v1/...` 상대 경로로 오는데 `<img src>` 에 그대로 넣어 **프론트 오리진(3001)** 으로 나갔다 → `lib/api.ts` 에 `apiUrl()` 을 만들어 API 오리진을 씌운다. `fetch` 를 거치지 않는 자리(`<img>` · `<a>`)는 앞으로 이걸 쓴다
  2. 사진을 바꿔도 **서빙 경로가 그대로**라 같은 `src` 가 되어 브라우저가 다시 부르지 않는다 → 업로드 후 `?t={시각}` 을 붙여 갱신
- `MemberAvatar` 의 실패 상태를 `boolean` 이 아니라 **실패한 주소**로 들고 있다 — `true` 로만 두면 사진을 지웠다 다시 올려도 이니셜에서 안 돌아온다
- `.claude/launch.json` 의 포트가 3000 인데 `npm run dev` 는 3001 이라 preview 가 붙지 않았다 → 3001 로 맞춤

---

## [2026-08-13] 상태 변경 시 화면 흔들림 제거 (설정 화면 · 모달 전반) ✅

브랜치: `projects/new` · 이슈: #137

### 변경 파일

| 파일                                                                                                                                                                        | 변경                                                         |
| --------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------ |
| `src/app/projects/[id]/layout.tsx`                                                                                                                                          | 수정 (스크롤 컨테이너에 `scrollbar-gutter: stable`)          |
| `src/features/project/settings/ProjectSettings.tsx`                                                                                                                         | 수정 (재조회 중 직전 값 유지 — stale-while-revalidate)       |
| `src/components/PanelModal.tsx`                                                                                                                                             | 수정 (`ModalFooter` 마지막 버튼 최소 폭 — 모달 30여 개 공통) |
| 모달 실행 버튼 24곳                                                                                                                                                         | 수정 (`min-w-[104px]` · 긴 라벨 2곳은 128 · 136px)           |
| `ProjectInfoForm` · `BulkUploadModal` · `CashFlow*` · `CollectionConditionFormModal` · `NoticeCreateForm` · `EmployeeCreateForm` · `EmployeeEditForm` · `ProjectCreateForm` | 수정 (같은 이유로 최소 폭)                                   |

### 주요 작업 내용

- **가로 흔들림** — 프로젝트 상세 레이아웃의 스크롤 컨테이너에 `scrollbar-gutter: stable` 이 없었다. 내용 높이가 줄면 스크롤바가 사라지며 본문 폭이 바뀐다 (`AppShell` 의 `main` 에는 이미 있던 규칙)
- **세로 흔들림** — 상태 변경 후 재조회에서 `requestKey` 가 어긋나는 순간 상세 · 단계/스텝이 `null` 이 돼 네 섹션이 통째로 `불러오는 중…` 으로 접혔다 펴졌다. **직전 값을 유지**하고 새 값이 오면 갈아끼우도록 바꿨다 (`projectId` 로 한 번 더 걸러 다른 프로젝트 값은 절대 안 보여준다)
- **모달 버튼 흔들림** — `삭제 → 삭제 중…` 처럼 라벨이 바뀌면 폭이 변해 옆 `취소` 버튼이 밀렸다. `ModalFooter` 에서 마지막(실행) 버튼의 최소 폭을 잡고, 푸터를 안 쓰는 모달은 버튼에 직접 최소 폭을 줬다
- 확인 다이얼로그(`AlertDialogTwoButton`)는 버튼이 `flex-1` 이라 원래 흔들리지 않는다 — 손대지 않았다

### 부수 결정

| 결정                                           | 이유                                                                            |
| ---------------------------------------------- | ------------------------------------------------------------------------------- |
| 실패 화면은 **이번 요청이 실패했을 때만** 노출 | 낡은 값을 들고 조용히 성공한 척하지 않는다                                      |
| `.btn-md` 전역에 최소 폭을 주지 않음           | 필터 토글(`PagePermissionList`)까지 넓어져 디자인이 바뀐다 — 실행 버튼에만 준다 |
| 최소 폭 104px                                  | 지금 쓰는 라벨 중 가장 긴 `메일 재발송` · `처리 중…` 이 모두 들어간다           |

---

## [2026-08-13] 프로젝트 삭제 (설정 화면 최하단) ✅

브랜치: `projects/new` · 이슈: #137
근거: 신규 명세 139 (프로젝트 삭제 · PRJ-014)

### 변경 파일

| 파일                                                     | 변경                                              |
| -------------------------------------------------------- | ------------------------------------------------- |
| `.ai/API.md`                                             | 수정 (139 추가 · 목차 1행)                        |
| `src/features/project/errorCodes.ts`                     | 수정 (`PROJECT_CODES.deleteNotAllowed`)           |
| `src/features/project/api.ts`                            | 수정 (`deleteProject()`)                          |
| `src/features/project/settings/DeleteProjectSection.tsx` | **생성** (삭제 가능 조건 판정 · 안내 · 모달 진입) |
| `src/features/project/settings/DeleteProjectModal.tsx`   | **생성** (확인 · 409 · 404 문구 분기)             |
| `src/features/project/settings/ProjectSettings.tsx`      | 수정 (맨 아래에 삭제 섹션 연결 — `EDITOR` 에게만) |

### 주요 작업 내용

- **설정 화면 맨 아래에 `프로젝트 삭제` 섹션** — 되돌릴 수 없는 조작이라 다른 섹션과 떨어뜨리고 확인 모달을 거친다
- **`진행 전` + 스텝 0개일 때만 버튼이 열린다** — 안 되는 이유(이미 시작함 / 스텝 N개 남음)를 버튼 옆 문구로 알려 눌러 보고 409 를 보게 두지 않는다
- **그래도 409 는 처리한다** — 그 사이 남이 스텝을 만들거나 상태를 바꿀 수 있어, 모달에서 "새로고침 후 종결로 처리" 를 안내한다
- 삭제 성공 시 **`router.replace('/projects')`** — 방금 지운 상세로 뒤로 가기가 되지 않게 한다
- 연결된 공고가 함께 풀린다는 사실을 모달에서 알린다 (그 공고로 다시 만들 수 있다)

---

## [2026-08-13] 프로젝트 직접 생성 화면 (`/projects/new`) ✅

브랜치: `projects/new` · 이슈: #10
근거: 신규 명세 138 (프로젝트 직접 생성 · PRJ-001)

### 변경 파일

| 파일                                         | 변경                                                                                  |
| -------------------------------------------- | ------------------------------------------------------------------------------------- |
| `.ai/API.md`                                 | 수정 (138 추가 · 목차 1행)                                                            |
| `src/features/project/types.ts`              | 수정 (`CreateProjectRequest` · `CreatedProject` · `ProjectCreator`)                   |
| `src/features/project/errorCodes.ts`         | 수정 (`PROJECT_CODES.bidNoticeAlreadyLinked`)                                         |
| `src/features/project/api.ts`                | 수정 (`createProject()`)                                                              |
| `src/features/project/FormFields.tsx`        | **생성** (`TextField` · `AmountField` · `TextareaField` · `AlertBanner` · `FormCard`) |
| `src/features/project/ProjectCreateForm.tsx` | **생성** (생성 폼 · 카테고리 칩 선택 · 참여자 지정 · 검증 · 오류 처리)                |
| `src/app/projects/new/page.tsx`              | 수정 (stub → 실제 화면 연결 · `metadata.title`)                                       |

### 주요 작업 내용

- **시안(Figma) 배치를 따라 카드 2장으로 구성** — `기본 정보`(과업명 · 발주처 / 사업 카테고리 · 시작일 / 종료일 · 계약금액 · 설명) + `참여자`. 머리말은 breadcrumb · 제목 · 한 줄 설명이고 하단 버튼은 `생성` → `취소` 순서다
- **공고와 연결되지 않은 건만 만든다** — 같은 엔드포인트지만 이 화면은 `bidNoticeId` 를 아예 보내지 않는다 (공고에서 시작하는 생성은 입찰 화면 소관)
- **사업 카테고리는 마스터 목록(15)을 받아 칩 토글로 다중 선택**, 삭제분은 후보에서 빼고 고른 게 없으면 필드 자체를 생략한다
- **참여자는 한 화면에서 받되 저장은 두 단계** — 생성(138) 응답의 `projectId` 로 참여자 추가(125)를 **한 명씩** 부른다. 권한은 줄마다 `열람 / 편집` 셀렉트다
- **과업명 300자 · 발주처 200자 · 기간 역전**을 화면에서 먼저 잡고 첫 오류 항목으로 포커스를 옮긴다
- 생성 성공 시 토스트 후 **`router.replace`** 로 상세로 이동한다 — 뒤로 가기로 빈 폼에 돌아오지 않게 했다

### 부수 결정

| 결정                                                           | 이유                                                                                |
| -------------------------------------------------------------- | ----------------------------------------------------------------------------------- |
| `features/project/FormFields.tsx` 를 따로 만듦                 | 도메인끼리 import 하지 않는 기존 규칙 — 공고 · 사원 폼과 모양만 맞춘다              |
| 시안의 `발주처` · `사업 카테고리` 필수 표시(`*`)를 따르지 않음 | 명세상 선택 필드다 — 화면만 막으면 만들 수 있는 프로젝트를 못 만든다 (**API 우선**) |
| 시안에 없는 `설명` 필드를 남김                                 | 생성 요청 본문(138)에 있는 값이라 화면에서 받아야 채울 수 있다                      |
| 참여자 추가가 실패해도 상세로 이동                             | 프로젝트는 이미 만들어졌다 — 폼에 머무르면 같은 프로젝트를 또 만들게 된다           |
| 카테고리 목록 실패는 폼을 막지 않고 안내 문구만 노출           | 카테고리는 선택 항목이고, 생성 후 설정 화면에서 연결할 수 있다                      |
| 생성 응답의 `version` 부재를 화면이 쓰지 않음                  | 상세로 이동해 다시 조회하므로 `1` 을 가정할 필요가 없다                             |

---

## [2026-08-13] 프로젝트 설정 화면 · 인원 편집 ✅

브랜치: `project/setting` · 이슈: #135
근거: 신규 명세 125~137 (참여자 4종 · 프로젝트 수정/상태/종결 · 카테고리 연결/해제 · 스텝 권한 3종 · 스텝 상태)

### 변경 파일

| 파일                                                       | 변경                                                                                                                                       |
| ---------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------ |
| `.ai/API.md`                                               | 수정 (125~137 추가 · 45번 `deleted`·`NONE` 폐기 반영 · 확인 대기 1건 해소)                                                                 |
| `src/constants/endpoints.ts`                               | 수정 (`projects.member`·`status`·`close`·`businessCategor(y\|ies)` · `stages.stepPermissions` · `steps.status`·`permissions`·`permission`) |
| `src/features/project/types.ts`                            | 수정 (참여자 · 프로젝트 수정/상태/종결 · 카테고리 연결 · 스텝 권한/상태 타입, `ProjectDetail.version`, `BusinessCategory.deleted`)         |
| `src/features/project/errorCodes.ts`                       | 수정 (`MEMBER_CODES`·`PROJECT_CODES`·`PROJECT_CATEGORY_CODES`·`STEP_PERMISSION_CODES`, `isVersionConflict` 확장)                           |
| `src/features/project/api.ts`                              | 수정 (함수 13종 추가)                                                                                                                      |
| `src/features/project/settings/ProjectSettings.tsx`        | **생성** (컨테이너 · `SettingsSection`)                                                                                                    |
| `src/features/project/settings/ProjectInfoForm.tsx`        | **생성** (과업 정보 · 낙관적 락 409 처리)                                                                                                  |
| `src/features/project/settings/ProjectStatusSection.tsx`   | **생성** (상태 4값 · 종결 진입 · 사유 라벨)                                                                                                |
| `src/features/project/settings/CloseProjectModal.tsx`      | **생성** (종결 사유 · 상세)                                                                                                                |
| `src/features/project/settings/ProjectCategorySection.tsx` | **생성** (연결 목록 · 해제)                                                                                                                |
| `src/features/project/settings/LinkCategoryModal.tsx`      | **생성** (다중 선택 연결)                                                                                                                  |
| `src/features/project/member/ProjectMemberSection.tsx`     | **생성** (목록 · 권한 셀렉트 · 제거 진입)                                                                                                  |
| `src/features/project/member/AddMemberModal.tsx`           | **생성** (사원 검색 · 다중 선택 · 한 명씩 호출)                                                                                            |
| `src/features/project/member/RemoveMemberModal.tsx`        | **생성** (제거 확인)                                                                                                                       |
| `src/app/projects/[id]/settings/page.tsx`                  | 수정 (stub → 실제 화면 연결)                                                                                                               |
| `src/features/issue/IssueFormModal.tsx`                    | 수정 (`permission !== 'NONE'` 필터 제거 → `!deleted` 로 교체)                                                                              |
| `src/features/project/step/StepPermissionModal.tsx`        | **생성** (스텝 권한 목록 · 부여 · 상속으로 되돌리기 · `STEP_PERMISSION_LABELS`)                                                            |
| `src/features/project/stage/StagePermissionModal.tsx`      | **생성** (새 스텝 권한 기본값 · 기존 스텝 일괄 적용)                                                                                       |
| `src/features/project/step/StepStatusModal.tsx`            | **생성** (상태 변경 확인 · 완료 되돌리기 경고 · 409 처리)                                                                                  |
| `src/features/project/settings/StepPermissionSection.tsx`  | **생성** (설정 화면의 단계 · 스텝 목록 → 권한 모달 진입)                                                                                   |
| `src/components/ProjectSidebar.tsx`                        | 수정 (`⋯` 메뉴 항목 정리 · **포털 + `fixed`** 로 잘림 해소 · 모달 3종 동적 로드)                                                           |
| `src/features/project/labels.ts`                           | **생성** (권한 · 상태 · 종결 사유 라벨 단일 소스 — 순환 참조 해소)                                                                         |
| `src/features/project/settings/SettingsSection.tsx`        | **생성** (컨테이너에서 분리 — 순환 참조 해소)                                                                                              |
| `src/features/project/member/MemberPicker.tsx`             | **생성** (블록 · 이슈와 같은 칩 + 후보 버튼 인원 선택)                                                                                     |
| `src/features/project/member/MemberList.tsx`               | **생성** (목록 · 권한 변경 · 제거 · 추가 — 설정 화면 · 사이드바 공용)                                                                      |
| `src/features/project/member/ProjectMembersModal.tsx`      | **생성** (사이드바 참여자 줄에서 여는 관리 모달)                                                                                           |

### 주요 작업 내용

- **`/projects/{id}/settings` 를 네 섹션 한 화면으로 구성** — 과업 정보 · 진행 상태 · 사업 카테고리 · 참여자. 전부 프로젝트 `EDITOR` 권한이라 화면을 나누지 않았다
- **상세는 컨테이너가 한 번만 읽고 각 섹션에 나눠준다** — 낙관적 락 `version` 이 한 벌이어야 해서다. 저장한 섹션이 응답의 새 `version` 을 위로 올려(`syncVersion`) 함께 갈아끼운다
- **과업 정보는 전체 덮어쓰기라 폼 전체를 매번 보낸다** — "바뀐 칸만 추려 보내기" 를 하지 않는다 (생략 = 해제)
- **자기 자신 행은 권한 셀렉트 · 제거 버튼을 잠갔다** (INV-10) — 백엔드가 403 으로 막지만 눌러 보고 실패를 보게 두지 않는다
- **삭제된 사원(`deleted`)은 권한 변경만 잠그고 제거는 남겼다** — 쓰기 검증을 통과하지 못하지만 정리는 할 수 있어야 한다
- **참여자 추가는 일괄 API 가 없어 한 명씩 호출**하고, 중간 실패 시 "앞선 N명은 추가됨" 을 알린다
- **스텝 권한 관리(134~136)** — 사이드바 스텝 `⋯` → `권한 관리`. 참여자 전원의 판정을 보여주고 `상속 / 직접 지정`을 구분한다. 줄 단위 즉시 저장이고, `상속으로` 버튼이 오버라이드 행을 회수한다
- **스테이지 기본값(128)** — 사이드바 단계 `⋯` → `스텝 권한 기본값`. `기존 스텝에도 지금 적용` 체크박스를 항상 명시적으로 실어 보내고, 적용된 스텝 수를 토스트로 알린다
- **스텝 `⋯` 메뉴가 권한별로 갈린다** — 수정 · 완료 · 삭제는 스텝 `EDITOR`, 권한 관리는 프로젝트 `EDITOR` 조건이다
- **스텝 상태 변경(137)** — 같은 `⋯` 메뉴의 `진행중으로` · `진행 전으로`. 지금 상태인 항목은 숨기고, `DONE` 되돌리기는 완료 기록이 지워진다는 경고를 띄운다
- **설정 화면에 `스텝 권한` 섹션 추가** — 단계별로 묶은 스텝 목록에서 바로 권한 모달 · 기본값 모달을 연다. 사이드바와 **같은 모달을 재사용**한다
- **사이드바에서도 참여자 명단을 고친다** — 아바타 줄의 `관리`(VIEWER 는 `전체 보기`) · `+` 버튼이 `ProjectMembersModal` 을 연다. 목록은 사이드바가 이미 받아 둔 것을 넘겨 재조회하지 않는다
- **상태 변경은 고른 즉시 저장하지 않는다** — 항상 확인 다이얼로그를 거친다 (완료 되돌리기는 잃는 것까지 함께 알린다)

### 트러블슈팅

| 문제                                                                    | 원인                                                                                                     | 해결                                                                                                                     |
| ----------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------ |
| `IssueFormModal` 타입 오류 (`'NONE'` 비교 불가)                         | 명세 45번에서 `NONE` 이 폐기돼 `ProjectMember.permission` 이 2값                                         | 필터를 `!member.deleted` 로 교체 (삭제 사원 후보 제외가 목적)                                                            |
| `react-hooks/set-state-in-effect` 린트 실패                             | 효과 본문에서 실패 플래그를 초기화했다                                                                   | `CategoryList` 와 같은 `{ key, data, hasFailed }` 패턴으로 교체                                                          |
| 런타임 `Cannot access 'MEMBER_PERMISSION_LABELS' before initialization` | 라벨 상수를 **화면 컴포넌트에서 export** 해 `ProjectMemberSection` ↔ `AddMemberModal` 순환 참조가 생겼다 | 라벨을 `labels.ts` 로, `SettingsSection` 을 자기 파일로 분리 — 잎(leaf) 모듈만 서로 참조하게 했다                        |
| 사이드바 `⋯` 메뉴가 잘린다                                              | 메뉴가 `absolute` 인데 사이드바가 `overflow-y-auto` 다 — 항목이 늘자 아래쪽 행에서 가려졌다              | `createPortal` + `fixed` 로 `body` 에 띄우고 여는 순간 좌표 계산 · 스크롤/리사이즈 시 닫음 (`CategoryList` 와 같은 방식) |

### 부수 결정

- **`NONE` 은 스텝 권한에만 남긴다** — 참여자 권한(`ProjectPermission`)과 스텝 권한(`StepPermission`)을 **다른 타입으로 분리**했다. 한 타입으로 합치면 폐기된 값이 참여자 API 로 새어 나간다
- **차단은 제거로 표현한다** — 참여자 목록에 `NONE` 선택지를 두지 않고, 제거 확인 문구에 "스텝 권한도 함께 사라진다" 를 명시했다 (권한 누수 방지 동작이 사용자에게는 놀라운 부작용이라서)
- **종결은 낙관적 락을 걸지 않는다** — 명세대로 `version` 을 싣지 않고, 응답에 `version` 이 없어 상세를 다시 읽는다
- **카테고리 연결은 이미 붙은 것을 후보에서 뺀다** — 하나라도 섞이면 요청 전체가 409 라 사전 필터가 필수다
- **스텝 권한 진입점을 사이드바 `⋯` 메뉴에 뒀다** — 스텝 수정 · 완료 · 삭제와 같은 자리다. 스텝 상세 화면에 따로 두면 같은 대상의 조작이 두 곳으로 갈린다
- **스테이지 기본값 모달은 현재 값을 보여주지 않는다** — 읽는 API 가 없어서다. 빈 화면을 그냥 두면 "설정 없음" 으로 오해하므로 문구로 밝히고 백로그에 조회 API 요청을 남겼다
- **스텝 상태 변경은 목표 상태를 메뉴에서 정해 넘긴다** — 모달에서 다시 고르게 하면 두 번 선택하게 된다. 고를 값이 `NOT_STARTED` · `IN_PROGRESS` 둘뿐이라 항목으로 나누는 편이 짧다
- **스텝 권한 진입점을 둘로 두되 모달은 하나** — 사이드바(스텝 하나) · 설정 화면(전체 훑어보기)로 쓰임이 다르다. 컴포넌트를 복제하면 한쪽만 고쳐지므로 `StepPermissionModal` · `StagePermissionModal` 을 그대로 재사용한다

---

## [2026-08-12] 퇴사자 · 삭제 사원 표기 컨벤션 ✅

브랜치: `user/project · 이슈: #129
근거: 백엔드 퇴사자 표기 컨벤션 (2026-08-12) · 블록 일괄 조회 `owner.deleted` (D-6 · 2026-08-11)

### 변경 파일

| 파일                                              | 변경                                                          |
| ------------------------------------------------- | ------------------------------------------------------------- |
| `src/components/PersonNote.tsx`                   | **생성** (`(퇴사자)` · `(삭제됨)` 문구 · `personLabel()`)     |
| `src/components/MemberAvatar.tsx`                 | 수정 (`state` prop — 흐림 + `이름 (퇴사자)` tooltip)          |
| `src/features/issue/types.ts`                     | 수정 (`IssueAssignee.resignedAt`)                             |
| `src/features/issue/IssueDetailModal.tsx`         | 수정 (담당자 이름 뒤 문구)                                    |
| `src/features/issue/IssueBadges.tsx`              | 수정 (`AssigneeAvatars` — 겹친 스택은 흐림 + tooltip)         |
| `src/features/issue/IssueFormModal.tsx`           | 수정 (이미 지정된 퇴사자 칩을 이슈 응답에서 그린다)           |
| `src/features/project/overview/ProjectIssues.tsx` | 수정 (아코디언 담당자 스택)                                   |
| `src/features/block/BlockIssuesPanel.tsx`         | 수정 (연결 이슈 담당자 스택)                                  |
| `src/features/activityLog/types.ts`               | 수정 (`ActivityActor.resignedAt`)                             |
| `src/features/activityLog/ActivityLogItem.tsx`    | 수정 (수행자 이름 뒤 문구)                                    |
| `src/features/block/types.ts`                     | 수정 (`BlockOwner.deleted` · `UpdateBlockResponse` 주의 주석) |
| `src/features/block/BlockCard.tsx`                | 수정 (블록 담당자 `(삭제됨)` 문구)                            |
| `src/features/block/BlockEditModal.tsx`           | 수정 (참여자 목록에 없는 담당자 칩 유지 · 후보에 `(퇴사자)`)  |
| `.ai/API.md`                                      | 수정 (이슈 도메인 「퇴사자 표기」 공통 절 · 55 · 72번)        |

### 주요 작업 내용

- **표기 규칙을 컴포넌트 하나로 모았다** — `PersonNote` 가 단일 소스다. 테두리 배지가 아니라 **이름 뒤 회색 괄호 문구**(`gap-0.5`)이고, **문구는 `(퇴사자)` 하나로 통일**했다 (근거 필드는 화면마다 다르지만 사용자에게는 같은 뜻이다)
- **퇴사자·삭제 사원을 목록에서 빼지 않는다** — 이름을 그대로 두고 배지만 붙인다. 담당자 수가 달라 보이면 안 된다
- **문구를 놓을 자리가 없는 겹친 아바타 스택**(이슈 카드 · 아코디언 · 연결 이슈)은 **흐림 + `이름 (퇴사자)` tooltip** 으로 대신했다
- **블록 수정 모달** — 담당자가 참여자 목록에 없어도(사원 삭제 · 권한 회수) 칩을 블록 응답 이름으로 그린다. 예전엔 칩이 사라져 `담당자 없음` 으로 읽혔다
- **참여자 목록은 보드가 한 번만 받는다** — 카드의 퇴사 표기와 수정 모달의 담당자 후보가 같은 컨텍스트를 쓴다 (모달은 보드 밖에서 열릴 때만 자기 조회를 돈다)
- **블록 담당자는 두 근거를 합친다** — 블록 응답(10번)에 `resignedAt` 이 없어 `owner.deleted` 만 보면 **퇴사했지만 사원 데이터가 남은 담당자를 놓친다.** 보드가 참여자 목록(45번)을 **한 번만** 받아 퇴사자 사번 집합을 컨텍스트로 내려준다 — `deleted` · `resigned` 중 하나만 참이어도 `(퇴사자)` 다

### 트러블슈팅

| 문제                                         | 원인                                            | 해결                                                      |
| -------------------------------------------- | ----------------------------------------------- | --------------------------------------------------------- |
| 겹친 아바타에 배지를 붙일 자리가 없다        | `-ml-1` 로 포개는 스택이라 가로 폭이 없다       | 아바타를 흐리게 + 감싼 `span` 에 tooltip                  |
| 담당자 수정 응답에 `deleted` 가 없을 수 있다 | 46번 명세에 `owner.deleted` 가 명시돼 있지 않다 | 방금 고른 사람은 재직자라 무해 — 타입에 주의 주석만       |
| 블록 담당자의 퇴사 여부를 알 길이 없다       | 블록 응답의 `owner` 에 `resignedAt` 이 없다     | 참여자 목록으로 보충 — 보드에서 1회 조회 후 컨텍스트 배포 |

### 부수 결정

- **`resigned`(퇴사)와 `deleted`(사원 데이터 삭제)는 끝까지 다른 값으로 다룬다** — 배지 문구도 나눴다. 하나로 합치면 나중에 되돌릴 수 없다
- **후보(드롭다운)에서만 제외한다** — 이미 지정된 사람은 어디서도 지우지 않는다
- **문구를 상태별로 나누지 않는다** — `삭제됨` 을 따로 두면 사용자가 두 값의 차이를 해석해야 한다. 근거 필드는 코드 주석에만 남긴다
- **참여자 목록 조회는 보드에서 한 번만** — 카드마다 부르면 블록 수만큼 같은 요청이 나가고, 유형별 본문이 각자 `BlockCard` 를 그려 prop 으로는 못 꿴다 (`BlockActionsContext` 와 같은 이유)
- **우회에는 지울 조건을 적어 둔다** — 블록 응답에 `owner.resignedAt` 이 실리면 컨텍스트의 퇴사 판정만 걷어낸다 (후보 목록 용도는 남는다)
- **담당자 후보에서 퇴사자 제외** — 이슈 담당자 지정과 같은 규칙으로 맞췄다. 이미 지정된 사람은 칩으로 남긴다

---

## [2026-08-13] 재무 — 입출금 CSV 일괄 등록 🚧 진행 중

브랜치: `feat/finance` · 이슈: #13
근거: 스웨거 실측 (`/csv/preview` · `/csv`)

### 변경 파일

| 파일                                             | 변경                                                                                     |
| ------------------------------------------------ | ---------------------------------------------------------------------------------------- |
| `src/features/finance/CashFlowCsvImport.tsx`     | **생성** (3단 스텝퍼 · 파일 선택 · 결과)                                                 |
| `src/features/finance/CashFlowCsvMapping.tsx`    | **생성** (컬럼 매핑 · 미리보기)                                                          |
| `src/features/finance/errorCodes.ts`             | **생성** (`FINANCE_*` — 비밀번호 · 형식 · 매칭 코드)                                     |
| `src/components/Breadcrumb.tsx`                  | **생성** (상단 경로 — 아래 `목록으로` 버튼을 대신한다)                                   |
| `src/features/finance/types.ts` · `api.ts`       | 수정 (CSV 타입 · `previewCashFlowCsv` · `uploadCashFlowCsv`)                             |
| `src/app/finance/payments/import/page.tsx`       | 수정 (stub → 화면 연결)                                                                  |
| `src/features/finance/CashFlowList.tsx`          | 수정 (`CSV 등록` 진입점 · `외부 API 조회` 제거 · 브레드크럼 · 행 메뉴 제거 후 상세 링크) |
| `src/features/finance/CashFlowDetail.tsx`        | **생성** (상세 — 거래고유번호 · 수정 · 연결 · 해제 · 삭제)                               |
| `src/app/finance/payments/[cashFlowId]/page.tsx` | **생성** (상세 라우트)                                                                   |
| `src/features/*/{7개 목록}`                      | 수정 (상단 경로를 공용 `Breadcrumb` 로 통일)                                             |

### 주요 작업 내용

- **3단 스텝퍼** — 파일 선택 → 컬럼 맞추기 → 결과. 1단계 파일은 저장되지 않는다(추천용 미리보기)
- **비밀번호 걸린 엑셀** — 400 을 실패로 다루지 않고 비밀번호 칸을 열어 같은 파일로 다시 부른다
- **컬럼 매핑** — 일시 · 금액 두 방식을 라디오로 고르고 방식에 맞는 칸만 그린다. 모든 셀렉트에 `직접 입력`, 적요 · 거래 후 잔액에 `선택 안 함`
- **결과** — 전체 · 등록 · 중복 제외 건수와 중복 목록(사유 포함). **중복은 실패가 아니다**

### 남은 것 (동작 확인 전)

- 🔴 **백엔드** — 엑셀 시간 전용 셀이 `1899-12-31 HH:mm:ss` 로 파싱돼 업로드가 실패한다. 시간 컬럼은 시각만 취해야 한다
- ⏳ 업로드 `request` 파트 JSON 스키마가 스웨거에 없어 필드명을 추정했다 (`CsvUploadRequest`)

---

## [2026-08-13] 재무 — 입출금 내역 · 정산 블록 매칭 ✅

브랜치: `feat/finance` · 이슈: #12 #14
근거: 스웨거 실측(`/v3/api-docs`) — `.ai/API.md` 에 재무 도메인 절이 아직 없어 스펙을 직접 대조했다

### 변경 파일

| 파일                                                                                   | 변경                                                                            |
| -------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------- |
| `src/features/finance/types.ts`                                                        | **생성** (요약 · 목록 · 등록/수정 · 매칭 후보 · 다건 처리 결과)                 |
| `src/features/finance/api.ts`                                                          | **생성** (요약 · 목록 · 필터 · 등록 · 수정 · 삭제 · 제외 · 매칭 · 해제)         |
| `src/features/finance/display.ts`                                                      | **생성** (금액 표기 · 배지 색 · `bankNameFromTxnId`)                            |
| `src/features/finance/routes.ts`                                                       | **생성** (재무 화면 경로 단일 소스)                                             |
| `src/features/finance/FinanceHub.tsx`                                                  | **생성** (허브 — 항목별 미연결 건수)                                            |
| `src/features/finance/CashFlowList.tsx`                                                | **생성** (필터 · 표 · 다건 선택 · 행 메뉴)                                      |
| `src/features/finance/CashFlowFormModal.tsx`                                           | **생성** (직접 등록 · 수정 — 출처/연결 상태로 입력 잠금)                        |
| `src/features/finance/CashFlowMatchModal.tsx`                                          | **생성** (정산 블록 추천 후보 선택 · 연결)                                      |
| `src/components/finance/CashFlowSkeletons.tsx`                                         | **생성** (게이트 · `Suspense` 공용 골격)                                        |
| `src/app/finance/page.tsx`                                                             | **생성** (`/finance` 허브 라우트)                                               |
| `src/app/finance/payments/page.tsx`                                                    | 수정 (stub → 목록 화면 연결)                                                    |
| `src/constants/endpoints.ts`                                                           | 수정 (`finance` 블록 — 요약 + 입출금 10개 경로)                                 |
| `src/constants/menu.ts` · `pagePermission/catalog.ts`                                  | 수정 (사이드바 `재무 관리` → `/finance/invoices` → **`/finance`**)              |
| `src/features/auth/errorCodes.ts`                                                      | 수정 (`FINANCE_ACCESS_DENIED` 를 권한 코드로 등록)                              |
| `src/features/pagePermission/PageAccessGate.tsx`                                       | 수정 (경로별 로딩 골격 `ROUTE_SKELETONS`)                                       |
| `src/components/DataTable.tsx`                                                         | 수정 (로딩 행 높이 정합 · `dense` 여백 옵션)                                    |
| `src/features/bidding/NoticeList.tsx` · `NoticeSkeletons.tsx`                          | 수정 (열 폭 재조정 · 가로 스크롤 제거 · `전환` 열 제거 · 공고명 `text-balance`) |
| `src/features/employee/EmployeeList.tsx` · `SettingsSkeletons.tsx`                     | 수정 (가로 스크롤 제거)                                                         |
| `src/features/settlement/errorCodes.ts` · `SettlementForm.tsx` · `SettlementBlock.tsx` | 수정 (`SETL-007` 잠김 → `수정하기` 비활성)                                      |

### 주요 작업 내용

- **입출금 내역 화면 일습(#12)** — 기간 · 프로젝트 · 미연결 · 검색은 서버 쿼리로, **구분 · 출처는 서버 필터가 없어 화면에서** 거른다 (재조회하지 않도록 요청 키에서 뺐다)
- **직접 등록 · 수정 모달** — `MANUAL` + `UNLINKED` 만 전체 수정이고, CSV · 외부 API 이거나 연결된 건은 **적요만** 열어 둔다 (서버 규칙과 동일)
- **다건 삭제 · 연결 제외** — `skippedItems` 를 사유와 함께 토스트로 알린다. **부분 성공이 정상 동작**이다
- **정산 블록 매칭(#14)** — 추천 후보(최대 5건)를 `matchTags`(추천 이유)와 함께 보여주고 라디오로 고른다. 연결/해제는 `linkStatus` 에 따라 **행 메뉴에 하나만** 노출한다
- **연결된 정산 블록은 `수정하기` 를 막는다** — 매칭이 되기 시작하면서 드러난 문제. 정산 상태(`부분 정산` · `정산 완료`)로 잠금을 가늠하고, 상태로 못 걸러진 경우는 저장이 한 번 막힌 뒤(`SETL-007`) 받아 준다

### 트러블슈팅

| 문제                                        | 원인                                                                    | 해결                                                                                 |
| ------------------------------------------- | ----------------------------------------------------------------------- | ------------------------------------------------------------------------------------ |
| 재무 목록이 `불러오지 못했습니다` 로 떨어짐 | `FINANCE_ACCESS_DENIED` 가 권한 코드 목록에 없어 전역 403 처리에서 샜다 | `PERMISSION_CODES` 에 추가 → `/forbidden` 으로 보낸다                                |
| 수정 폼의 은행명이 빈칸                     | **목록 응답에 `bankName` 이 없고 단건 조회 API 도 없다**                | `bankTxnId`(은행명+거래일시) 앞부분을 되읽는다. 임시방편이라 백엔드에 필드 추가 요청 |
| 표가 로딩 → 데이터에서 늘어남               | 로딩 막대(12px)가 글자 한 줄(21px)보다 낮아 행 높이가 달랐다            | 막대를 `h-[1.5em]` 상자에 담아 행 높이를 맞췄다                                      |
| 표가 떴다가 줄어듦                          | 스켈레톤 10줄 뒤에 결과가 1~2건                                         | **첫 조회 중에는 표를 그리지 않는다** (안내 문구만)                                  |
| 공고 목록 날짜가 겹쳐 보임                  | 공용화로 본문이 12px → 14px 가 됐는데 열 폭은 12px 기준 그대로였다      | 폭 재조정 + `dense`(여백 40 → 24px) + 마감일 두 줄                                   |
| `수정할 수 없습니다` 안내 옆에서 폼이 열림  | 블록 응답에 연결 여부 플래그가 없어 화면이 잠금을 몰랐다                | 정산 상태로 판정(`PARTIAL`·`COMPLETED`) + 409 를 보조로 기억                         |
| 잠금이 새로고침하면 풀림                    | 409 를 화면 상태로만 기억해 새로고침에 날아갔다                         | **데이터(정산 상태)에서 판정**하도록 바꿔 새로고침에도 유지                          |

### 부수 결정

- **가로 스크롤을 두지 않는다** — `minWidth` 를 쓰던 표 3개에서 걷어내고, `DataTable` 이 `minWidth` 없는 표는 `overflow-x-hidden` 으로 막는다. 여백은 `dense`(40 → 24px)로 줄였다
- **칸 안에서 글자를 잘라 감추지 않는다** — 넘치면 줄바꿈. 공고명만 `line-clamp-2` + `text-balance`
- **공고 목록 `전환` 열 제거** — 전환 API 가 없어 눌리지 않는 회색 버튼만 늘어서 있었다
- **페이지네이션을 붙이지 않는다** — 목록 API 에 페이징이 없다 (`{ cashFlows: [] }`). 표 아래 `전체 N건` 만 둔다
- **`FINANCE_EDIT_ACCESS_DENIED` 는 권한 코드에 넣지 않는다** — 화면은 볼 수 있는데 저장만 막힌 경우라 `/forbidden` 으로 보내면 보던 목록까지 사라진다

### 백엔드 대기

- 🔴 `PATCH /blocks/settlements/{id}/items` — `?type=INCOME` 을 실어 보내도 컨트롤러에서 null 이라 **500 NPE** (파라미터 바인딩). 정산 항목 작성이 막히면 매칭 후보도 비어 있다
- ⏳ 입출금 목록 응답에 `bankName` 추가 (또는 단건 조회 API)
- ⏳ 정산 블록 목록(10번) `detail` 에 **연결 여부 플래그** (`isLinked` 등). 지금은 정산 상태로 추정한다

---

## [2026-08-12] 정산 블록 낙관적 락 배관 ✅

브랜치: `feat/settlement-optimistic-lock` · 이슈: #125
근거: 백엔드 `.ai/api/settlement.md` (낙관락 PR 머지 완료)

### 변경 파일

| 파일                                          | 변경                                                                                |
| --------------------------------------------- | ----------------------------------------------------------------------------------- |
| `src/features/settlement/types.ts`            | 수정 (`SettlementFields` 분리 · 요청 `version`·`overwrite` · `detail.version` 읽기) |
| `src/features/settlement/errorCodes.ts`       | **생성** (`SETTLEMENT_*` · `SETL-001~011` · 충돌 · 잠김 판정)                       |
| `src/features/settlement/api.ts`              | 수정 (낙관락 주석 — 409 넷의 구분)                                                  |
| `src/features/settlement/SettlementForm.tsx`  | 수정 (`version` 전송 · 새로고침/덮어쓰기 모달 · 잠김 이탈 처리)                     |
| `src/features/settlement/SettlementBlock.tsx` | 수정 (버전 전달 · 응답 버전 우선 · `onStale` 로 목록 재조회)                        |
| `.ai/API.md`                                  | 수정 (정산 공통 절 · 10번 `detail.version` · 86번 낙관락 절)                        |

### 주요 작업 내용

- **`detail.version` 을 저장 요청에 배관** — 없으면 저장 버튼을 막고 새로고침을 안내한다 (텍스트 · 이미지 · 문서명과 같은 방침)
- **버전 충돌 409 → `새로고침 / 덮어쓰기` 확인 모달** — 덮어쓰기는 같은 요청에 `overwrite: true` 만 더해 재전송
- **덮어쓰기로 못 뚫는 두 경우를 따로 처리** — `404 SETL-002`(블록 삭제) · `409 SETL-007`(세금계산서 · 입출금 연결)은 폼을 닫고 `notifyBlockChanged()` 로 목록을 다시 읽는다. 요약 카드에 이유를 남긴다
- **응답 `version` 을 화면이 들고 있게** — 목록을 다시 읽지 않으므로, 연달아 두 번 저장할 때 두 번째가 409 가 되지 않도록 저장 응답의 새 값을 우선한다

### 트러블슈팅

| 문제                                           | 원인                                                              | 해결                                                                |
| ---------------------------------------------- | ----------------------------------------------------------------- | ------------------------------------------------------------------- |
| 409 를 버전 충돌로 단정하면 오진한다           | 이 API 의 409 는 **넷** (`VERSION_CONFLICT` · `SETL-006/007/008`) | `code` 로만 판정 (`isSettlementVersionConflict`)                    |
| `SettlementItem` 에 `overwrite` 가 새어 들어감 | 응답 타입이 요청 타입을 상속하고 있었다                           | 값 필드만 담는 `SettlementFields` 를 분리해 요청 · 응답이 각각 얹음 |
| 조회(85)의 409 판정도 status 로 하고 있었다    | 저장과 달리 이 조회의 409 는 `SETL-006` 하나뿐이라 우연히 맞았다  | 코드로 판정하고, 코드가 비었을 때만 status 로 떨어지게 둠           |

### 부수 결정

- **잠김 · 삭제는 "닫고 재조회"** — 폼을 열어 둔 채 오류만 띄우면 사용자가 같은 저장을 계속 시도한다. 이유는 요약 카드의 안내줄로 이어 말한다
- **취소(Esc · 배경)는 `새로고침` 쪽** — 잘못 눌러 남의 값이 덮이면 안 된다 (`StageFormModal` · 텍스트 블록과 같은 방침)

---

## [2026-08-12] 낙관적 락 전면 정합 · 텍스트 임시저장 ✅

브랜치: `feat/block-optimistic-lock` · 이슈: #124 (이슈 도메인 후속은 #121)
근거: 백엔드 `.ai/docs/global/CONCURRENCY.md`(정본) · `.ai/api/{text,image,file,issue}.md` 대조

### 변경 파일

| 파일                                                      | 변경                                                                           |
| --------------------------------------------------------- | ------------------------------------------------------------------------------ |
| `src/features/block/types.ts`                             | 수정 (`TextBlockDetail.version` · `BlockImage.version` · 요청 타입 3종)        |
| `src/features/block/errorCodes.ts`                        | 수정 (`TEXT_CODES` · `IMAGE_CODES` · 충돌 판정 2종 · 공통 문구)                |
| `src/features/block/api.ts`                               | 수정 (`updateTextBlock` 본문화 · `updateImageItems` 항목별 버전)               |
| `src/features/block/TextBlockModal.tsx`                   | 수정 (버전 전송 · 409 3선택 · **임시저장** · `ChoiceDialog` 신설)              |
| `src/features/block/TextBlock.tsx`                        | 수정 (버전 상태 보유 · 응답 버전 반영 · 재조회 연결)                           |
| `src/features/block/textDraft.ts`                         | **생성** (localStorage 초안 읽기 · 쓰기 · 지우기 · 시각 표기)                  |
| `src/features/block/ImageEditModal.tsx`                   | 수정 (저장 직전 재조회로 추가·삭제 감지 · 항목별 버전 · 409 재조회)            |
| `src/features/block/FileBlock.tsx`                        | 수정 (문서명 저장에 버전 · 409 재조회/덮어쓰기 모달)                           |
| `src/features/file/types.ts` · `api.ts` · `errorCodes.ts` | 수정 (`BlockFile.version` · `RenameFileRequest` · `FILE_VERSION_CONFLICT`)     |
| `src/features/issue/*`                                    | 수정 (`version` **필수로 조임** · 차단 가드 제거)                              |
| `.ai/API.md`                                              | 수정 (11 · 36 · 39 · 67 · 68 · 71 낙관락 반영 · 이슈 절 정정 · 확인 대기 정리) |

### 주요 작업 내용

- **백엔드 문서와 대조해 누락 3건을 찾아 배관** — 텍스트 본문(11) · 문서명(39) · 이미지 캡션·순서(68)가 이미 `version` 필수인데 프론트가 안 보내고 있었다 (배포되면 전부 400)
- **이미지는 "재조회 후 대조" 를 추가** — 낙관적 락은 남아 있는 항목의 변경만 잡는다. 그 사이 남이 **지우거나 새로 올린 것**은 버전에 안 드러나고, 그대로 저장하면 새 이미지가 조용히 삭제된다. 저장 직전 71번을 한 번 더 불러 개수·`imgId` 를 대조한다(`sameMembers`)
- **실서버 `/v3/api-docs` 로 `version` 검증** — 이슈 4개 응답 스키마 확인 후 `version?` → `version` 으로 조이고 차단 가드 제거
- **텍스트 블록 임시저장함** — `localStorage` 에 **여러 개**를 담는다. `자동` 칸 1개(타이핑이 멎으면 덮어씀) + `직접` 칸(임시저장 버튼 · 나가기 · 충돌에서 쌓임), 최대 10개. 목록에서 **이어서 편집 / 삭제 / 전체 비우기**
- **나가기 · 충돌은 3선택** — `ChoiceDialog` 로 `임시저장하고 나가기(닫기) / 저장 안 하고 나가기(덮어쓰기) / 계속 편집`. 충돌에서 "임시저장하고 다시 불러오기" 를 고르면 내 글은 남고 최신 본문을 받는다

### 트러블슈팅

| 문제                                                                       | 원인                                                        | 해결                                                                 |
| -------------------------------------------------------------------------- | ----------------------------------------------------------- | -------------------------------------------------------------------- |
| 백엔드 `.ai/API.md` 에 `version` 이 한 건도 없어 "낙관락 미도입" 으로 오해 | 그 파일은 **API 작성 규칙** 문서고 명세는 `.ai/api/*.md` 다 | 정본 위치(`docs/global/CONCURRENCY.md`)를 우리 문서에 링크로 못 박음 |
| 초안을 되살려도 편집기 화면이 안 바뀜                                      | `useEditor({ content })` 는 **처음 값만** 읽는다            | `key` 를 올려 에디터를 다시 마운트                                   |
| 되살린 초안이 "수정 없음" 으로 잡혀 저장이 막힘                            | 재마운트의 `onReady` 가 비교 기준을 초안 값으로 덮었다      | 비교 기준은 **첫 마운트 값만** 채운다 (`previous ?? normalized`)     |
| 이슈 `ISSUE_NOT_FOUND` 코드가 실제와 다름                                  | 이슈 도메인 접두어는 `ISS_` — 충돌 코드만 `ISSUE_` 다       | `ISS_NOT_FOUND` 로 정정하고 주석에 예외를 적음                       |

### 부수 결정

- **이미지 요청에 싣는 버전은 "화면이 들고 있던 값"** — 방금 재조회한 값을 실으면 그 사이 남이 고친 캡션까지 덮어쓴다. 재조회는 추가·삭제 감지용, 충돌 판정은 서버 몫
- **파일 충돌 판정은 `code` 로만** — 이 도메인은 409 에 `FILE_APPROVAL_IN_PROGRESS` 도 있어 status 로 넘겨짚으면 오진한다 (텍스트·이미지는 409 가 하나뿐이라 status 폴백을 둠)
- **이미지엔 덮어쓰기를 만들지 않았다** — 백엔드도 미지원. 여러 장 배열이라 "무엇을 덮어쓸지" 가 정해지지 않는다
- **초안은 `localStorage`** — 탭을 닫았다 열어도 남아야 실수를 구제한다. 저장소 실패(사생활 보호 모드·용량)는 편집을 막지 않고 푸터로 알린다
- **자동 저장분은 한 칸만 쌓지 않는다** — 자동까지 목록에 쌓으면 임시저장함이 타이핑 기록으로 뒤덮인다. `자동` 은 덮어쓰기 1칸, 사용자가 남긴 `직접` 만 쌓인다 (10개 상한, 넘치면 가장 오래된 직접 저장분부터 버림)
- **서버 저장 성공 시 임시저장함을 통째로 비우지 않는다** — 저장한 내용과 같은 칸 · 자동 칸만 걷어낸다. 따로 남겨 둔 다른 안을 우리가 지울 권리는 없다
- **`나가기` 도 직접 저장분을 지우지 않는다** — 비우기는 임시저장함의 `전체 비우기` 나 개별 `삭제` 가 맡는다 (지우는 자리를 한곳에 모은다)
- **임시저장 실패 시 창을 닫지 않는다** — 닫으면 글이 사라진다. 성공했을 때만 닫는다
- **`ChoiceDialog` 신설** — 선택지가 셋이면 `AlertDialogTwoButton` 으로 표현할 수 없다. Esc·배경 클릭은 가장 안전한 쪽(계속 편집)으로 흐른다

---

## [2026-08-12] 이슈 낙관적 락 배관 ✅

브랜치: `style` · 근거: BE 전달본 「이슈 낙관적 락 명세」 (`issue.version` 신설) 이슈: #121

### 변경 파일

| 파일                                        | 변경                                                                |
| ------------------------------------------- | ------------------------------------------------------------------- |
| `src/features/issue/types.ts`               | 수정 (`version` 필드 · 필드 비교 · 병합 · PATCH 본문 조립 헬퍼)     |
| `src/features/issue/errorCodes.ts`          | **생성** (`ISSUE_VERSION_CONFLICT` 판정 · 공통 문구)                |
| `src/features/issue/api.ts`                 | 수정 (`updateIssueStatus` 에 `version` 인자 추가 · 주석)            |
| `src/features/issue/IssueConflictModal.tsx` | **생성** (필드별 `내 값 / 최신값` 비교·선택)                        |
| `src/features/issue/IssueFormModal.tsx`     | 수정 (`base`/`draft`/`latest` 3단 + 자동 병합 재시도 + 충돌 UI)     |
| `src/features/issue/IssueBoard.tsx`         | 수정 (상태 드래그에 `version` 배관 · 409 동기화)                    |
| `.ai/API.md`                                | 수정 (이슈 도메인 낙관적 락 절 신설 · 55·57·58·59 갱신 · 확인 대기) |

### 주요 작업 내용

- **3단 상태로 분리** — `base`(최초 조회값 · `version` 출처) · `draft`(입력값) · `latest`(409 뒤 재조회값). 409 가 와도 draft 를 초기화하지 않아 **커서·스크롤·입력이 그대로 남는다**
- **필드 교집합으로 충돌 판정** — `diff(base, draft) ∩ diff(base, latest)`. 겹치지 않으면 `latest` 위에 내 수정만 얹어 **최신 version 으로 한 번만** 재시도(성공 시 토스트), 겹치면 `IssueConflictModal` 로 항목마다 고르게 한다
- **PATCH 는 바뀐 필드만** — 상세 객체 전체를 되보내지 않는다. 안 보낸 필드는 서버가 건드리지 않아, 남이 그 사이 고친 다른 필드가 내 옛 값으로 되돌아가지 않는다
- **상태 드래그도 낙관적 락** — 카드의 `version` 을 실어 보내고, 409 면 최신값을 읽어 **남이 이미 같은 상태로 옮겼으면 버전만 동기화**, 다른 상태면 그 상태로 카드를 되돌리고 안내한다

### 트러블슈팅

| 문제                                                                   | 원인                                           | 해결                                                                                         |
| ---------------------------------------------------------------------- | ---------------------------------------------- | -------------------------------------------------------------------------------------------- |
| 공백 하나 눌렀다 지운 필드가 "내가 고친 필드" 로 잡혀 없던 충돌이 생김 | 제목·설명을 다듬지 않고 비교했다               | 비교 전 `trim` (`types.ts` 의 `trimmed`) — 저장 시에도 어차피 떨어지는 값이다                |
| 자동 병합 재시도가 또 409 면 무한히 돌 수 있음                         | 실패할 때마다 최신값을 읽어 다시 병합하는 구조 | `isMerged` 플래그로 **재시도는 한 번만**. 두 번째는 기준만 최신으로 옮기고 사용자에게 맡긴다 |
| 남이 고친 값이 **내 값과 같아도** 충돌로 잡힘                          | 필드 이름만 교집합으로 봤다                    | `diff(draft, latest)` 를 한 번 더 걸러 **결과가 다른 필드만** 충돌로 센다                    |
| 상태 변경 응답에 `version` 이 없으면 다음 수정이 409                   | 옛 버전을 카드에 그대로 들고 있게 된다         | 응답에 없으면 카드 버전을 **비운다** — 다음 저장이 재조회를 한 번 타고 정상 진행된다         |

### 부수 결정

- **`overwrite` 를 만들지 않았다** — 이슈 수정은 **진짜 부분 수정**이라 필드 병합으로 풀 수 있다. 스테이지·스텝·블록의 "덮어쓰기" 는 전체 덮어쓰기라 어쩔 수 없던 선택지였다
- **충돌 모달의 기본값은 `내 값`** — 방금 입력한 것을 잠자코 남의 값으로 바꿔치기하면 사용자는 자기 글이 사라진 줄 안다
- **취소는 `계속 편집`** — Esc·배경 클릭이 취소로 흘러 들어오므로 배경 클릭은 아예 막고(`dismissOnBackdrop={false}`), 취소해도 draft·base 를 건드리지 않는다
- **`version` 은 선택 필드(`version?`)** — 조회 응답에 실린다는 계약은 나왔지만 실서버 확인 전이다. 없으면 **저장·드래그를 막고 재조회를 안내**한다 (스테이지·스텝·블록과 같은 방침)
- **비교 문구는 폼이 만든다** — 담당자·블록은 ID 만으로 무엇이 다른지 알 수 없다. 이름을 아는 폼이 문구를 만들어 넘기고, 비교 모달은 그리기만 한다

---

## [2026-08-12] 상태 색 통일 · 타이포 스케일 보정 ✅

브랜치: `style` · 이슈: #119

> 2026-08-11 [디자인 토큰 스윕](#2026-08-11-디자인-토큰-스윕--타이포--radius--흰색--danger-hover-) 에서 **보류로 넘긴 두 건**(`text-[11px]` 261곳 · `MyProjectList` 의 `tint`)을 이번에 닫았다.

### 변경 파일

`src/` 아래 **100개** (`globals.css` 포함) · 문서 2개. 로직 변경은 없다 (색·크기 토큰 교체만).

커밋은 3개로 나눴다 — ① 토큰 정의 + 타이포 치환 ② 상태 색 적용 ③ 헤더 높이. `globals.css` 는 **①에 둔다** — 토큰 정의가 사용처보다 먼저 들어가야 중간 커밋에서도 빌드가 선다.

| 갈래                | 파일 수 | 비고                                                       |
| ------------------- | ------- | ---------------------------------------------------------- |
| `features/project`  | 17      | 상태 팔레트 · 요약 카드 · 스텝 타임라인                    |
| `features/block`    | 17      | 타이포 치환 (드래그 미리보기 인라인 스타일 포함)           |
| `features/employee` | 10      | 타이포 치환                                                |
| `features/approval` | 8       | 타이포 치환                                                |
| `components`        | 8       | `Header` · `Sidebar` 높이, 나머지는 타이포 치환            |
| 그 외 features 12종 | 39      | 타이포 치환                                                |
| `app/globals.css`   | 1       | 타이포 토큰 3종 조정 · 2종 신설 · `--color-step-done` 변경 |

### 주요 작업 내용

**1. 타이포 스케일 한 단계 올림** — 시안 대비 글자가 작다는 지적 반영

| 토큰               | 이전   | 이후 |
| ------------------ | ------ | ---- |
| `--text-body-m`    | 14px   | 16px |
| `--text-label`     | 12px   | 14px |
| `--text-caption`   | 10px   | 12px |
| `--text-detail` ✨ | (없음) | 13px |
| `--text-micro` ✨  | (없음) | 11px |

- 임의값 `text-[11px]` **281곳** → `text-detail`(13px), `text-[9px]` **67곳** → `text-micro`(11px)
- `BlockDragContext` · `IssueBoard` 의 드래그 미리보기는 인라인 `cssText` 라 `font-size: var(--text-detail)` 로 바꿨다

**2. 프로젝트 계열 상태 색 통일** — 진행 전 회색 · 진행 중 노랑 · 완료 초록

- `--color-step-done` 을 파랑(`#2563eb`) → 초록(`#00bc7d`) 으로 변경
- `projectStatus.ts` · `ProjectCard`(스테이지 배지 · 스텝 노드 · 연결선 · 체크 아이콘) · `issue/types.ts`(이슈보드 배지 · 점 · 드롭 영역) · `ProjectSidebar` 범례가 같은 색을 본다
- 하드코딩 `#22C55E` · `#16A34A` · `#00C951` 을 `step-done` · `green-text` 토큰으로 흡수
- 정산 중은 진행 중과 겹치지 않게 파랑으로 옮겼다

**3. 내 프로젝트 요약 카드 색 분리** — 전체 보라 · 진행 전 회색 · 진행 중 노랑 · 정산 중 파랑 · 완료 초록

- `PROJECT_SUMMARY_ICON_STYLE` 상수를 만들어 카드마다 시맨틱 토큰 클래스를 배정
- 인라인 `style={{ backgroundColor: `${card.tint}15` }}` 제거 — hex 알파를 문자열로 이어붙이던 자리다

**4. 공통 헤더 높이** — `h-15`(60px) → `h-13`(52px). `Sidebar` 로고 줄도 같이 맞춰 밑줄이 한 선으로 이어진다

### 트러블슈팅

| 문제                                | 원인                              | 해결                                              |
| ----------------------------------- | --------------------------------- | ------------------------------------------------- |
| `perl -pi -e` 일괄 치환이 안 돌아감 | Windows 로컬에 Perl 런타임이 없다 | PowerShell 문자열 치환 + UTF-8 인코딩 명시로 대체 |

### 부수 결정

- **`text-caption`(12px) 과 `text-detail`(13px) 을 따로 둔다** — 기존 caption 사용처와 11px 사용처는 성격이 달라, 하나로 흡수하면 한쪽이 반드시 어긋난다. 스케일이 둘 늘지만 각각 한 곳에서 조절된다
- **전체 진행률 막대는 단색 파랑 유지** — 프로젝트 카드 · 사이드바의 완료율 바는 *상태 구간*이 아니라 *비율*이라 상태 팔레트를 따르지 않는다
- **신규 색 토큰은 만들지 않았다** — 기존 시맨틱 팔레트만으로 5종 카드가 겹치지 않게 배정됐다

### 검증

| 명령                                        | 결과 |
| ------------------------------------------- | ---- |
| `npm run build`                             | 성공 |
| `npx prettier --check`                      | 성공 |
| `text-[11px]` · `text-[9px]` 잔여 스캔      | 0건  |
| `#22C55E` · `#16A34A` · `#00C951` 잔여 스캔 | 0건  |

### ⚠️ 남은 확인

- **실화면 검증** — 본문 글자가 전반적으로 커졌다(14→16px 등). 표 행 높이 · 배지 · 모달 안내문이 밀리지 않는지 봐야 한다. 2026-08-11 스윕의 줄높이 변화 검증과 **같이** 볼 것
- `text-[13px]`(26곳)이 이제 `text-detail` 과 **같은 값**이다 — 후속 치환 대상 (백로그 등록)

---

## [2026-08-12] 목록 표 공용화 · 디자인 토큰 정리 ✅

브랜치: `ref/data-table` · 이슈: 확인 필요

### 변경 파일

| 파일                                                 | 변경                                          |
| ---------------------------------------------------- | --------------------------------------------- |
| `src/components/DataTable.tsx`                       | 구현 (기존 `return null` 스텁 대체)           |
| `src/features/employee/EmployeeList.tsx`             | 표 전환 (체크박스 · 행 클릭)                  |
| `src/features/department/DepartmentList.tsx`         | 표 전환 (2단 들여쓰기)                        |
| `src/features/jobPosition/JobPositionList.tsx`       | 표 전환 (순번 · 순서 이동)                    |
| `src/features/businessCategory/CategoryList.tsx`     | 표 전환 + NUL 바이트 제거                     |
| `src/features/employeeGroup/EmployeeGroupList.tsx`   | 표 전환                                       |
| `src/features/pagePermission/PagePermissionList.tsx` | 표 전환                                       |
| `src/features/bidding/NoticeList.tsx`                | 표 전환 + 액션 버튼 위치 · 강조 조정          |
| `src/components/settings/SettingsSkeletons.tsx`      | 표 스켈레톤 4개 제거                          |
| `src/components/AlertDialog.tsx`                     | 크기 축소 · 구두점 줄바꿈                     |
| `src/components/ProfileMenu.tsx`                     | 글자 크기 축소                                |
| `src/features/employee/EmployeeStatusBadge.tsx`      | 하드코딩 hex 제거                             |
| `src/features/bidding/FormFields.tsx`                | 입력 글자 14px · 보조 문구 축소               |
| `src/features/bidding/NoticeCreateForm.tsx`          | 첨부 칸 고정 폭 · 글자 축소                   |
| `src/features/bidding/CollectionConditionList.tsx`   | 활성 여부 양방향 확인 다이얼로그              |
| `src/features/notification/*`                        | 5초 주기 · 탭 간 공유 · 이슈 이동 · 글자 축소 |
| `src/features/project/routes.ts`                     | `step` · `stepIssues` 경로 추가               |
| `src/app/settings/page.tsx`                          | 중복 보조 문구 제거                           |
| `.ai/API.md`                                         | 이슈 알림 `target` 실측 payload 반영          |

### 주요 작업 내용

- **공용 `DataTable`** — 열 정의 하나로 헤더 · 본문 · 스켈레톤이 함께 생성된다. 상태는 `rows`(`null`=로딩 / `[]`=빈 상태) + `errorMessage`(실패)로 갈린다
- 특수 케이스 지원 — `onRowClick` + `column.stopRowClick`(사원 행 클릭), `cell(row, index)`(직급 순번 · 이동), `emptyState`(아이콘형 빈 상태)
- **표 7개 전환** 및 지역 `Th` · `Td` · `Centered` 6벌 제거
- **디자인 토큰 정리** — 임의 폰트 크기 · Tailwind 기본 스케일 · 하드코딩 hex 를 `globals.css` 토큰으로 교체 (입찰 · 전사관리 · 알림 기준 0건)
- **알림** — 배지 5초 주기 + 창 포커스 갱신 + `BroadcastChannel` 탭 간 공유, 이슈 알림을 스텝 이슈 탭으로 이동, `모두 읽음` 제거

### 트러블슈팅

- **문제**: 입찰 목록 헤더와 본문 열이 어긋남
- **원인**: `%` 폭 합계가 **103%**. 브라우저가 초과분을 비례 배분한다
- **해결**: 100% 로 맞추고, `DataTable` 이 개발 모드에서 합계를 검사해 콘솔로 알린다

- **문제**: `CategoryList.tsx` 가 grep · diff 에서 **바이너리로 취급**돼 리뷰 도구에서 변경이 안 보임
- **원인**: 템플릿 리터럴 구분자 자리에 **NUL 바이트 2개**(`�`)가 들어가 있었다 (`HEAD` 부터 존재)
- **해결**: 공백으로 교체

- **문제**: 다이얼로그 설명이 `자동 수집은 꺼진 상 / 태이며` 처럼 말 중간에서 끊김
- **원인**: 한국어는 기본값에서 단어 중간 줄바꿈이 허용된다
- **해결**: `break-keep` + `.` · `,` 뒤로 잘라 `inline-block` 조각으로 둔다 (자리가 남으면 한 줄에 이어 붙는다)

- **문제**: `text-body-s` 로 지정한 오류 문구 크기가 적용되지 않음
- **원인**: **존재하지 않는 토큰**이다 (`globals.css` 에 없다)
- **해결**: `text-caption` 으로 교체

### 부수 결정

- **표는 라이브러리 없이 자체 구현한다** — PrimeReact 를 검토했으나 자체 CSS 테마가 우리 토큰과 이중화되고, Tailwind v4 레이어와 충돌해 `unstyled` 로 쓰면 결국 스타일을 다 짜게 된다. 우리 표는 정렬 · 필터 · 페이징이 전부 서버 · URL 이라 라이브러리 기능을 쓰지 않는다
- **리팩터링과 디자인 통일을 한 PR 에 넣었다** — 표를 옮기면서 여백 · 글자 크기가 어차피 한 곳으로 모이므로, 나누면 중간 상태가 더 어긋나 보인다
- **`모두 읽음` 제거** — 읽음 취소 API 가 없어 되돌릴 수 없다. API 함수(`readAllNotifications`)는 명세 대조를 위해 남겼다
- **`maxHeight` 는 인라인 style 로 준다** — Tailwind 임의값(`max-h-[60vh]`)은 호출부마다 문자열이 흩어지고, 빌드 시점에 없는 값은 클래스가 생성되지 않는다
- **`SSE` 는 요청만 남긴다** — 프론트만으로는 5초가 한계다. 알림 하나에 연결 관리 · 프록시 설정 · 재연결 로직을 들이는 건 규모에 맞지 않아, 필요해지면 그때 붙인다

### 검증

- `tsc --noEmit` · ESLint · Prettier 통과
- 실데이터로 표 7개 · 알림 드롭다운 · 확인 다이얼로그 확인 필요 (담당자 확인 대기)

---

## [2026-08-11] 입찰 수집 조건 운영 · 공고 직접 등록 ✅

> 같은 브랜치(`feat/notices`)에서 아래 `입찰 공고 조회 — 목록 · 상세` 에 이어서 진행했다.
> 그때 막혀 있던 **수집 실패가 해소돼** 목록 · 상세도 실데이터로 검증됐다.

### 변경 파일

| 파일                                                    | 변경                                               |
| ------------------------------------------------------- | -------------------------------------------------- |
| `src/features/bidding/CollectionConditionList.tsx`      | 생성                                               |
| `src/features/bidding/CollectionConditionFormModal.tsx` | 생성                                               |
| `src/features/bidding/collectionDisplay.ts`             | 생성                                               |
| `src/features/bidding/NoticeCreateForm.tsx`             | 생성                                               |
| `src/features/bidding/FormFields.tsx`                   | 생성                                               |
| `src/features/bidding/regions.ts`                       | 생성                                               |
| `src/app/notices/conditions/page.tsx`                   | 생성                                               |
| `src/app/notices/new/page.tsx`                          | 생성                                               |
| `src/features/bidding/api.ts`                           | 수정 (수집 조건 · 실행 · 공고 등록/수정 7개 추가)  |
| `src/features/bidding/types.ts`                         | 수정 (수집 조건 · 실행 · 등록 본문 타입)           |
| `src/features/bidding/routes.ts`                        | 수정 (`create` · `conditions`)                     |
| `src/features/bidding/display.ts`                       | 수정 (배지 색을 `.badge-*` 로)                     |
| `src/features/bidding/NoticeBadges.tsx`                 | 수정 (공용 `.badge` 사용)                          |
| `src/features/bidding/NoticeList.tsx`                   | 수정 (표 · 필터 정리, 액션 버튼)                   |
| `src/features/bidding/NoticeDetail.tsx`                 | 수정 (버튼을 `.btn` 으로)                          |
| `src/components/bidding/NoticeSkeletons.tsx`            | 수정 (열 구성 동기화)                              |
| `src/constants/endpoints.ts`                            | 수정 (`bidding` 수집 API 4개)                      |
| `.ai/API.md`                                            | 수정 (수집 호출 순서 · 등록/수정 본문 · 응답 코드) |

### 주요 작업 내용

- **수집 조건 관리** (`/notices/conditions`) — 조건 카드 목록 · 등록/수정 모달 · 활성 토글 · 활성 여부 칩 필터
- **수동 수집 E2E** — `지금 수집`(202) → `runId` 폴링(2초 · 최대 45회) → 결과 패널(전체 · 신규 · 갱신 · 건너뜀). 조건 등록부터 공고 목록 반영까지 실동작 확인
- **공고 직접 등록** (`/notices/new`) — 5개 구획 19개 필드, 첨부는 URL 행 추가 방식, 등록 후 상세로 이동
- **표기 정리** — 배지 · 버튼 · 입력 · 칩을 `globals.css` 공용 클래스(`.badge-*` · `.btn-*` · `.input` · `.tag-*`)로 통일, 안내 띠는 `AlertBanner` 하나로 통합

### 트러블슈팅

- **문제**: 자동 수집이 켜진 조건을 비활성화하면 `400 자동 수집 일정이 올바르지 않습니다`
- **원인**: `isActive: false` 인데 `autoCollectionEnabled: true` 는 서버가 모순으로 본다 (비활성 조건이 스케줄로 돌 수 없다)
- **해결**: 비활성으로 내릴 때 `autoCollectionEnabled` · 스케줄 3개를 함께 `null` 로 보낸다. 확인 다이얼로그에 "자동 수집도 꺼집니다" 를 명시

- **문제**: 토글 실패 배너가 화면 위에 남아 사라지지 않고, 어느 조건에서 난 오류인지 알 수 없음
- **원인**: 실패 메시지를 화면 단위 상태 하나로 들고 있었다
- **해결**: **조건별**(`Record<conditionId, string>`)로 바꿔 카드 안에 표시. 닫기(✕) + 재시도 시 자동 제거

- **문제**: 조건 모달의 둥근 모서리가 위아래 짝짝이
- **원인**: `<dialog>` 패널 자체가 `overflow-y-auto` 라 스크롤바가 모서리를 잘라먹음
- **해결**: 패널은 `flex flex-col`, **안쪽 필드 영역만** 스크롤. 제목 · 하단 버튼이 고정되는 부수 효과도 얻음

- **문제**: `Date.now()` 로 폴링 시간을 재니 ESLint `react-hooks/purity` 위반
- **해결**: 시계 대신 **시도 횟수**로 상한을 센다 (`MAX_POLLS`)

### 부수 결정

- **수정(`PATCH`)은 전체 교체다** — 한 값만 바꿔도 나머지를 다 실어야 해서 `toUpdateRequest()` 를 `api.ts` 에 두고 모든 부분 수정이 이걸 거치게 했다
- **`scheduledTime` 포맷 비대칭** — 응답 `HH:mm:ss`, 요청 `HH:mm`. 변환 지점을 `toUpdateRequest()` · `toFormState()` 두 곳으로 고정
- **사업 카테고리를 입찰에서 뺐다** — 우리 카테고리는 회사 내부 분류, 나라장터는 업종코드(수천 개)라 체계가 다르다. 억지로 매핑하면 틀린 분류가 쌓인다. 카테고리는 **프로젝트 생성 시 사람이 지정**한다
- **원문 URL 을 화면 정책으로 필수** — 백엔드는 요구하지 않지만, 직접 등록 건은 근거가 사람 입력뿐이라 링크가 없으면 나중에 확인할 방법이 없다
- **`COMPLETED` + 0건은 실패가 아니다** — "조건에 맞는 공고가 없었어요" 로 문구를 분리
- **409 는 오류가 아니라 진행 중** — `BIDDING_COLLECTION_RUN_ALREADY_PROCESSING` 은 빨간 오류 대신 노란 안내
- **없는 API 의 버튼은 만들지 않는다** — 공고 삭제 · 제외 · 복구 · 프로젝트 전환. 전환만 자리를 잡아 `disabled` + 사유 툴팁
- **지역 코드는 프론트 상수** (`regions.ts`) — 목록 API 가 없다. ⚠️ 강원 `51` · 전북 `52` 는 특별자치도 전환 코드라 확인 필요

### 검증

- 조건 등록 → `지금 수집` → 폴링 → 공고 목록에 **나라장터 실공고 534건** 반영 확인
- `tsc --noEmit` · ESLint · Prettier 통과

---

## [2026-08-11] 입찰 공고 조회 — 목록 · 상세 ✅

브랜치: `feat/notices` · 이슈: #7 · PR: #118 (같은 브랜치에서 #9 · #105 와 함께 머지. PR 본문에 `close #7` 이 빠져 이슈만 Open 으로 남았다 → 수동 종료)

### 변경 파일

| 파일                                         | 변경                           |
| -------------------------------------------- | ------------------------------ |
| `src/features/bidding/types.ts`              | 생성                           |
| `src/features/bidding/api.ts`                | 생성                           |
| `src/features/bidding/display.ts`            | 생성                           |
| `src/features/bidding/errorCodes.ts`         | 생성                           |
| `src/features/bidding/routes.ts`             | 생성                           |
| `src/features/bidding/NoticeBadges.tsx`      | 생성                           |
| `src/features/bidding/NoticeList.tsx`        | 생성                           |
| `src/features/bidding/NoticeDetail.tsx`      | 생성                           |
| `src/components/bidding/NoticeSkeletons.tsx` | 생성                           |
| `src/app/notices/page.tsx`                   | 수정 (골격 → 목록 연결)        |
| `src/app/notices/[id]/page.tsx`              | 수정 (골격 → 상세 연결)        |
| `src/constants/endpoints.ts`                 | 수정 (`bidding` 추가)          |
| `.ai/API.md`                                 | 수정 (103·104 + 수집 API 실측) |

### 주요 작업 내용

- 공고 목록 — 8개 필터(기간 · 발주처 · 카테고리 · 지역 · 마감임박 · 검색어 · 상태 · 정렬) + 페이징. URL 이 필터의 단일 원본이다
- 공고 상세 — 좌측 카드 4장(공고 정보 · 일정 · 금액 · 참가 자격·계약) + 우측 카드 2장(원문·첨부 · 프로젝트)
- 표기 규칙(`display.ts`)을 목록·상세가 공유한다 — D-day 배지 5단계, 금액 축약(`3.4억`) vs 전체(`340,000,000원`)

### 트러블슈팅

- **문제**: 화면에 공고가 한 건도 보이지 않음
- **원인**: 프론트가 아니라 **백엔드 수집 실패**. `POST /bidding/collection-conditions/1/runs` 를 두 번(`runId` 1 · 2) 실행했으나 모두 6초 뒤 `FAILED` · `all_collection_tasks_failed`. `bid_notice` 테이블이 0행이다
- **해결**: 위 `입찰 수집 조건 운영 · 공고 직접 등록` 작업에서 수집이 성공하며 해소. 실공고 534건으로 목록 · 상세 검증 완료

### 부수 결정

- **읽기 전용으로 범위 고정** — 제외 · 복구 · 프로젝트 전환 API 가 미배포라 버튼을 두지 않는다. 목록·상세 모두 `disabled` + 사유 툴팁
- **라우트를 `/notices` · `/notices/[id]` 로 잡았다** — 이슈 원문의 `/bidding/notices/:noticeId` 대신 앱 라우팅 컨벤션(도메인 1단계)에 맞췄다
- **사업 카테고리 필터는 제외** — 나라장터 업종코드와 내부 분류 체계가 달라 억지 매핑을 하지 않는다. 카테고리는 프로젝트 생성 시 사람이 지정한다
- **`noticeStatus` · `sort` 는 스웨거가 `string` 이라 값 검증 불가** — `sort=ANNOUNCED_DESC` 만 `200` 으로 실측. 나머지는 데이터가 생겨야 확인된다
- **백엔드 테스트 가이드를 명세로 쓰지 않는다** — 가이드에 있는 `POST /bidding/notices` 등이 실제로는 미배포다. 스웨거에 뜨는 것만 호출한다

---

## [2026-08-11] 프로젝트 카드 결재 뱃지 필드명 정정 ✅

브랜치: `user/project` · 이슈: #114 · 근거: BE 전달본 §02 「지금 호출하면 실패하는 3건」 3번

### 변경 파일

| 파일                                   | 변경                                                       |
| -------------------------------------- | ---------------------------------------------------------- |
| `src/features/project/types.ts`        | 수정 (`myApprovalOpenCount` → `myApprovalInProgressCount`) |
| `src/features/project/ProjectCard.tsx` | 수정 (사용처 1곳)                                          |
| `.ai/API.md`                           | 수정 (84번 스키마 · 주의 문구)                             |

### 주요 작업 내용

- 프로젝트 목록(84번) 응답의 결재 건수 필드명을 서버 계약에 맞춰 정정 — **카드의 `내 결재` 숫자가 다시 뜬다**

### 트러블슈팅

| 문제                                     | 원인                                                                                           | 해결                               |
| ---------------------------------------- | ---------------------------------------------------------------------------------------------- | ---------------------------------- |
| 카드에 `내 결재  건` — **숫자만 사라짐** | 필드명이 서버와 달라 `undefined`. React 는 `undefined` 를 안 그리고, `count > 0` 도 항상 false | 필드명 정정 (3곳)                  |
| 타입체크 · 빌드가 못 잡음                | `lib/api.ts` 가 응답을 `as T` 로 **단언**한다 — 런타임 검증이 없어 없는 필드도 있다고 믿는다   | 문서에 "타입체크로 안 잡힌다" 명시 |

### 부수 결정

- **새 이름이 뜻을 더 헷갈리게 한다** — `myApprovalInProgressCount` 인데 실제로는 `IN_PROGRESS` + **`REJECTED`** 합계다. 기존 주의 문구를 지우지 않고 "이름과 달리 `REJECTED` 도 포함" 을 한 줄 더 붙였다
- 화면 라벨(`내 결재`)은 그대로 — 값의 뜻은 바뀌지 않았다

### ⚠️ 남은 것

BE 전달본 §02 3건이 **모두 해소**됐다. 다만 **실서버 검증은 아직**이다 —
조회 응답에 `version` 이 실제로 실리는지, 이 필드명이 맞는지는 DevTools 로 직접 확인해야 한다 (둘 다 빌드로는 안 잡힌다).

---

## [2026-08-11] 블록 배치 저장 · 수정 낙관적 락 배관 ✅

브랜치: `user/project` · 이슈: #114 · 근거: BE 전달본 §02 「지금 호출하면 실패하는 3건」

### 변경 파일

| 파일                                    | 변경                                                                               |
| --------------------------------------- | ---------------------------------------------------------------------------------- |
| `src/features/block/types.ts`           | 수정 (`BlockLayout.version?` · `BlockLayoutOrder` · `UpdateBlockRequest/Response`) |
| `src/features/block/blockLayout.ts`     | 수정 (`toLayoutOrders()` 신설)                                                     |
| `src/features/block/api.ts`             | 수정 (`updateBlockLayout` 시그니처)                                                |
| `src/features/block/errorCodes.ts`      | 수정 (`versionRequired` · `updateFieldRequired` · `LAYOUT_CONFLICT_MESSAGE`)       |
| `src/features/block/useLayoutSaver.ts`  | 수정 (버전 조립 · 409 재조회)                                                      |
| `src/features/block/BlockBoard.tsx`     | 수정 (`patch` 가 `version` 교체)                                                   |
| `src/features/block/BlockEditModal.tsx` | 수정 (`version` · `overwrite` · 409 확인 모달 · 저장 차단)                         |

### 주요 작업 내용

- **배치 저장**(`PATCH /steps/{id}/blocks/layout`) — 블록마다 자기 `version` 을 실어 보낸다
- **제목·담당자 수정**(`PATCH /blocks/{id}`) — `version` 필수 · 409 시 `덮어쓰기 / 다시 불러오기`
- 저장 응답의 새 `version` 을 화면 상태에 **반드시 꽂는다** (배치는 `applyLayouts`, 수정은 `patch`)

### 트러블슈팅

| 문제                                    | 원인                                                                                                   | 해결                                                                         |
| --------------------------------------- | ------------------------------------------------------------------------------------------------------ | ---------------------------------------------------------------------------- |
| 배치 409 는 다시 보내도 **영원히 실패** | 이 API 에는 `overwrite` 가 없다. 되돌리기만 하면 화면이 든 `version` 은 그대로 옛 값이다               | 409 면 되돌린 뒤 `notifyBlockChanged()` 로 **목록을 다시 읽게** 한다         |
| 수정 후 배치 저장이 409 날 뻔           | 수정 응답의 새 `version` 을 `patch()` 가 안 꽂고 있었다. 배치는 블록의 `version` 을 그대로 실어 보낸다 | `patch()` 에 `version: updated.version` 추가                                 |
| `version` 없는 요청이 나갈 수 있었음    | 위치만 만드는 `toLayouts()` 로 요청까지 조립하고 있었다                                                | 요청 전용 `toLayoutOrders()` 분리 — 하나라도 없으면 `null` 을 주고 안 보낸다 |

### 부수 결정

- **`BlockLayout`(위치) 과 `BlockLayoutOrder`(요청) 를 타입으로 나눴다** — 지문 비교·좌표 계산에는 `version` 이 필요 없고, 오히려 섞이면 버전 없는 값이 요청에 실린다
- **배치 지문에는 `version` 을 넣지 않는다** — 위치가 그대로인데 버전만 올랐다고 재저장할 이유가 없다
- **`version` 이 없으면 배치를 되돌린다** — 저장이 불가능한데 화면만 옮겨진 채로 두면 저장된 줄 안다
- 수정 모달은 **저장 버튼 자체를 막는다** — 확인 모달까지 거친 뒤 실패하는 흐름을 피한다

---

## [2026-08-11] 블록 — 배치 편집 중에만 핸들 노출 · 스텝 이동 (API 121) ✅

브랜치: `user/project` · 이슈: #113

### 변경 파일

| 파일                                        | 변경                                                                   |
| ------------------------------------------- | ---------------------------------------------------------------------- |
| `src/constants/endpoints.ts`                | 수정 (`blocks.step`)                                                   |
| `src/features/block/types.ts`               | 수정 (`StepBlock.version?` · `MoveBlockRequest` · `MoveBlockResponse`) |
| `src/features/block/api.ts`                 | 수정 (`moveBlockToStep`)                                               |
| `src/features/block/BlockMoveStepModal.tsx` | 생성 (목적지 선택 · 이슈 연결 경고 · 409 확인)                         |
| `src/features/block/events.ts`              | 생성 (`BLOCK_CHANGED_EVENT` · `notifyBlockChanged`)                    |
| `src/features/block/BlockCard.tsx`          | 수정 (핸들 조건부 렌더 · `스텝 이동` 메뉴 · 모달 연결)                 |
| `src/features/block/StepBlocks.tsx`         | 수정 (이벤트 상수 사용)                                                |

### 주요 작업 내용

- **드래그 핸들(점 6개)을 배치 편집 중에만 그린다** — 평소에는 아예 렌더하지 않는다
- `⋯` 메뉴에 **`스텝 이동`** 추가 → 같은 프로젝트의 다른 스텝을 골라 옮긴다 (API 121)
- 옮긴 뒤 블록을 보드에서 빼고 토스트로 결과를 알린다. 이슈 연결이 끊기면 건수를 함께 알린다

### 부수 결정

- **핸들은 `invisible` 이 아니라 미렌더** — 흐리게 남겨 두면 "끌 수 있나?" 하고 잡아보게 되는데 아무 일도 일어나지 않는다. 대신 편집 모드를 오갈 때 제목이 핸들 폭만큼 좌우로 밀린다 (배너가 함께 뜨는 전환이라 감수)
- **권한 없는 스텝도 선택지에 보여주되 `disabled`** — 목록에서 지우면 "왜 저 스텝이 안 보이지" 로 읽힌다. 라벨에 `(편집 권한 없음)` 을 붙인다
- **이슈 연결 경고는 연결이 있을 때만 빨갛게** — 없는데도 띄우면 다음에 진짜 위험할 때 읽지 않는다
- **`block:changed` 문자열을 `events.ts` 로 모았다** — 3곳에 흩어져 있었고, 이슈 · 알림 도메인은 이미 같은 모양의 파일을 갖고 있다
- `StepBlock.version` 은 **선택 필드** — 스테이지 · 스텝과 같은 방침이다. 없으면 이동 저장을 막고 재조회를 안내한다

### ⚠️ 남은 것

블록 도메인의 나머지 `version` 배관(**배치 저장** · **제목/담당자 수정**)은 여전히 미처리다 — 그쪽은 400 이 난다.

---

## [2026-08-11] 단계 관리 모달 행 이동 애니메이션 (중첩 FLIP) ✅

브랜치: `user/project` · 이슈: #110

### 변경 파일

| 파일                                              | 변경                                                         |
| ------------------------------------------------- | ------------------------------------------------------------ |
| `src/lib/useFlipReorder.ts`                       | 수정 (중첩 보정 · 읽기/쓰기 단계 분리 · `matchMedia` 재사용) |
| `src/features/project/stage/StageManageModal.tsx` | 수정 (`register` 2곳 · `capture()` 3곳)                      |

### 주요 작업 내용

- 단계 · 스텝을 끌어 놓거나 ↑↓ 로 옮길 때 행이 **미끄러지듯 이동**한다 (200ms · `cubic-bezier(0.2,0,0,1)`)
- `되돌리기` 로 한꺼번에 제자리로 돌아갈 때도 같은 애니메이션을 탄다
- 공용 훅에 **중첩 목록 지원**을 넣어 `단계 > 스텝` 2단 구조에서도 정확히 움직인다

### 트러블슈팅

| 문제                                       | 원인                                                                                            | 해결                                                                     |
| ------------------------------------------ | ----------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------ |
| 단계를 옮기면 안쪽 스텝이 **두 배로 밀림** | 단계 `<li>` 와 스텝 `<li>` 를 모두 등록하면, 스텝이 부모의 `transform` 위에 자기 것을 또 얹는다 | 가장 가까운 **등록된 조상의 이동량을 빼서** 자기 몫만 남긴다             |
| 행마다 강제 리플로우                       | 취소 → 측정 → 애니메이션을 행 단위로 번갈아 하고 있었다                                         | 취소(쓰기) → 측정(읽기) → 보정(계산) → 애니메이션(쓰기) **4단계로 분리** |

### 부수 결정

- **중첩 보정은 옵션이 아니라 기본 동작**으로 넣었다 — 평평한 목록에서는 등록된 조상이 없어 그냥 지나가므로, 기존 사용처(`ImageEditModal` · `ImageUploadModal`)에 영향이 없다. 옵션 플래그를 두면 다음 사람이 켜는 걸 잊는다
- **`capture()` 는 드롭 · 버튼 클릭에서만 부른다** — 이 모달은 `dragover` 로 순서를 바꾸지 않아 이슈 보드처럼 잦은 측정이 일어나지 않는다
- `matchMedia` 를 모듈 수준에서 한 번만 만든다 — 순서를 바꿀 때마다 `MediaQueryList` 를 새로 만들 이유가 없다

---

## [2026-08-11] 순서 변경 로직 점검 — BE 계약 전달본 반영 ✅

브랜치: `user/project` · 이슈: #114 · 근거: BE 전달본 「프로젝트 · 스테이지 · 스텝 · 블록 + 권한 API 변경」(백엔드 `24636ed`)

### 변경 파일

| 파일                                              | 변경                                                                                   |
| ------------------------------------------------- | -------------------------------------------------------------------------------------- |
| `src/features/project/stage/StageManageModal.tsx` | 수정 (`syncPrint` · `isStale` · `toStepPlan`/`planPrint` 신설, `stepArrangement` 제거) |
| `src/features/project/types.ts`                   | 수정 (`StepOrderItem.stageId` → `number \| null` 필수 · `sortOrder` 통번호 명시)       |
| `src/features/project/api.ts`                     | 수정 (`updateStepOrder` 주석에 BE 확인 3건 기록)                                       |
| `.ai/API.md`                                      | 수정 (120번 요청 표 정정 · `version` 증가 시점 표 · 119↔120 동반 호출 경고)            |

### 트러블슈팅

| 문제                                          | 원인                                                                                                                          | 해결                                                                                    |
| --------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------- |
| 순서 저장이 409 나면 **영영 409 에 갇힘**     | 순서 API 에는 `overwrite` 가 없어 재조회가 유일한 출구인데, 실패 시 재조회 경로가 없었다. `되돌리기` 도 옛 `version` 그대로다 | `isStale` 도입 — 실패하면 드래그·저장을 잠그고 확인 버튼을 `다시 불러오기` 로 교체      |
| 남이 **이름만 고쳐도** 다음 저장이 409        | 초안 교체를 순서 지문으로만 판단해, 순서가 같고 `version` 만 오른 경우를 놓쳤다                                               | 교체 지문에 `version` 포함(`syncPrint`). 저장 여부(`isDirty`) 판단은 순서만 유지        |
| 단계 순서만 바꾸면 스텝 번호가 어긋남         | `sortOrder` 를 스테이지마다 1부터 세고 있었다. 실제로는 **프로젝트 단위 통번호**(BE 확인)                                     | `toStepPlan` 이 보드를 위에서 아래로 훑어 1..N 을 매기고, 단계를 끌면 120번도 함께 전송 |
| 미분류 스텝 이동이 400 날 수 있었음           | 순서 변경의 미소속을 `0` 으로 보냈다. 실제 규약은 `null` (BE 확인)                                                            | `stageId: number \| null` 로 정정. 스테이지 삭제의 `0` 과 상수를 분리                   |
| 단계는 저장되고 스텝만 실패하는 경우를 미고지 | 두 API 는 각각 전체 롤백이지만 **서로는 원자적이 아니다**                                                                     | `hasSavedStageOrder` 로 추적해 "단계 순서는 저장됐다" 를 문구에 넣음                    |

### 부수 결정

- **미소속 표현이 두 곳에서 다르다** — 순서 변경은 `null`, 스테이지 삭제는 `0`. 상수를 돌려쓰면 헷갈려서 `UNASSIGN_STEPS`(API) 와 `UNASSIGNED_KEY`(화면 내부 맵 열쇠)로 나눴다
- **보낼 값을 직접 만들어 비교한다** — `sortOrder` 가 통번호라 "스텝을 안 건드렸으니 생략" 같은 어림짐작이 성립하지 않는다. `toStepPlan()` 결과를 baseline 과 문자열로 비교해 전송 여부를 정한다

### ⚠️ 남은 것 (이번 범위 밖)

BE 전달본 §02 「지금 호출하면 실패하는 3건」 중 **블록 도메인 2건이 미처리**다 — 스테이지·스텝 범위가 아니라 손대지 않았다.

| 건                    | 위치                                       | 증상                                                |
| --------------------- | ------------------------------------------ | --------------------------------------------------- |
| 블록 배치 저장        | `block/api.ts` · `block/useLayoutSaver.ts` | `version` 없음 → **드래그 저장 400**                |
| 블록 제목·담당자 수정 | `block/api.ts`                             | `version` 없음 → 400                                |
| 결재 뱃지 필드명      | `project/types.ts`                         | `myApprovalOpenCount` → `myApprovalInProgressCount` |

---

## [2026-08-11] 디자인 토큰 스윕 — 타이포 · radius · 흰색 · danger hover ✅

브랜치: `user/project` · 이슈: #111

### 변경 파일

`src/**/*.tsx` **117개** (기계적 치환 · 로직 변경 없음). `src/app/globals.css` 는 건드리지 않았다.

### 주요 작업 내용

| 갈래   | 치환                                                                                                                                                                                                                             | 건수 |
| ------ | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---- |
| 타이포 | `text-[10px]`→`text-caption` · `text-xs`/`text-[12px]`→`text-label` · `text-sm`→`text-body-m` · `text-base`→`text-body-l` · `text-lg`→`text-heading-m` · `text-xl`/`text-2xl`→`text-heading-l`/`-xl` · `text-[22px]`→`text-logo` | 604  |
| radius | `rounded`→`rounded-button-sm` · `rounded-full`/`rounded-l-full`→`rounded-pill` · `rounded-xl`→`rounded-base` · `rounded-md`→`rounded-button-md`                                                                                  | 354  |
| 흰색   | `bg-white`→`bg-bg-card` · `text-white`→`text-text-white`                                                                                                                                                                         | 181  |
| hex    | `hover:bg-[#c50009]` · `[#c60009]`→`hover:bg-btn-danger-hover`                                                                                                                                                                   | 9    |

- 삭제 버튼 hover 가 `#c50009` · `#c60009` · `#c10007` **세 값**으로 갈려 있던 것을 토큰 하나로 통일
- 원시 Tailwind 팔레트(`text-slate-300` 등)는 스캔 결과 **이미 0건**임을 확인 — STATE.md 의 옛 기록을 정정

### 트러블슈팅

| 문제                                            | 원인                                                                  | 해결                                              |
| ----------------------------------------------- | --------------------------------------------------------------------- | ------------------------------------------------- |
| `grep -P` 가 로케일 오류로 안 돌아감            | Git Bash 로케일이 unibyte/UTF-8 이 아님                               | 스캔·치환 모두 `perl -ne` / `perl -pi -e` 로 통일 |
| `CategoryList.tsx` 가 grep 결과에서 통째로 빠짐 | 50줄 캐시 키에 **literal NUL 바이트**가 박혀 있어 바이너리로 판정된다 | 스캔 시 `-a` 사용. 소스는 별건으로 백로그 등록    |
| prettier 가 파일 하나를 못 씀 (`UNKNOWN: open`) | 일시적 파일 잠금                                                      | 재실행으로 해결                                   |

### 부수 결정

- **값이 1:1로 같은 것만 치환한다** — `features/file/format.ts`(확장자 액센트) · `features/block/types.ts`(블록 유형 액센트)는 값이 우연히 토큰과 같아도 **도메인 고유색**이라 남겼다. `text-danger` 가 바뀔 때 PDF 배지가 따라 움직이면 안 된다
- **`MyProjectList` 의 `tint` 는 손대지 않는다** — `` `${card.tint}15` `` 로 알파값을 문자열로 이어붙여서 `var()` 로 바꾸면 깨진다
- **`text-[#C10007]`(4곳)도 남겼다** — 값이 같은 토큰이 `btn-danger-hover`(버튼 hover 전용)뿐이라 연체 배지 글자색에 쓰면 뜻이 어긋난다
- **`rounded-lg`(266곳)는 치환하지 않았다** — 8px 토큰이 `button`·`sidebar`·`icon` 셋이라 기계 치환이 안 된다. 컨테이너용 8px 토큰이 없는 것도 함께 봐야 한다
- **`text-[11px]`(261곳)은 보류** — 토큰 신설도, 12px 흡수도 지금 결정할 근거가 없어 백로그로 넘겼다

### ⚠️ 남은 확인

**줄높이가 함께 바뀌었다.** 토큰에는 `--text-*--line-height` 가 물려 있어, 폰트 크기만 지정했던 임의값(`normal` ≈1.2)이 1.5 로 올라간다.

| 이전          | 줄높이 | 이후              | 줄높이 | 차이     |
| ------------- | ------ | ----------------- | ------ | -------- |
| `text-[10px]` | ≈12px  | `text-caption`    | 15px   | **+3px** |
| `text-xs`     | 16px   | `text-label`      | 18px   | **+2px** |
| `text-sm`     | 20px   | `text-body-m`     | 21px   | +1px     |
| `text-lg`     | 28px   | `text-heading-m`  | 26.1px | −1.9px   |
| `text-2xl`    | 32px   | `text-heading-xl` | 33.6px | +1.6px   |

명시적 `leading-*` 은 54곳뿐이라 나머지는 전부 영향을 받는다. `text-caption`(332곳)이 몰린 **모달 안내문 · 표 행 · 배지** 실화면 확인이 필요하다.

---

## [2026-08-11] 단계 · 스텝 CRUD · 순서 변경 · 완료 처리 ✅

브랜치: `user/project` · 이슈: 확인 필요

### 변경 파일

| 파일                                              | 변경                                                                                                                                                        |
| ------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `.ai/API.md`                                      | 수정 (112~120 추가 · `스테이지 · 스텝 도메인 — 공통` 절 신설 · 목차 9줄 · 7 · 8번에 `version` 확인 필요 주석)                                               |
| `src/constants/endpoints.ts`                      | 수정 (`stages.detail` · `steps.detail/complete` · `projects.stagesOrder/stepsOrder`)                                                                        |
| `src/features/project/types.ts`                   | 수정 (요청/응답 16종 · `STAGE_NAME_MAX_LENGTH`(100) · `STEP_NAME_MAX_LENGTH`(200) · `UNASSIGN_STEPS`(0) · `version?`)                                       |
| `src/features/project/api.ts`                     | 수정 (`createStage` · `updateStage` · `deleteStage` · `updateStageOrder` · `createStep` · `updateStep` · `updateStepOrder` · `deleteStep` · `completeStep`) |
| `src/features/project/errorCodes.ts`              | 생성 (`STAGE_CODES` · `STEP_CODES` · `isVersionConflict()`)                                                                                                 |
| `src/features/project/stage/StageFormModal.tsx`   | 생성 (단계 추가 · 이름 수정 공용 · 409 확인 모달)                                                                                                           |
| `src/features/project/stage/StageDeleteModal.tsx` | 생성 (하위 스텝 이전 대상 선택)                                                                                                                             |
| `src/features/project/stage/StageManageModal.tsx` | 생성 (`단계수정` 진입점 · 단계 · 스텝 드래그 재정렬 · `순서 저장`)                                                                                          |
| `src/features/project/step/StepFormModal.tsx`     | 생성 (스텝 추가 · 수정 공용 · 409 확인 모달)                                                                                                                |
| `src/features/project/step/StepDeleteModal.tsx`   | 생성 (살릴 블록 체크 · 대상 스텝 선택)                                                                                                                      |
| `src/features/project/step/StepCompleteModal.tsx` | 생성 (`openIssueAction` 라디오)                                                                                                                             |
| `src/components/ProjectSidebar.tsx`               | 수정 (TODO 4곳 연결 · `RowMenu` 항목 주입형으로 일반화 · 모달 6종 `dynamic` · `reloadCount` 재조회 · 토스트)                                                |

### 주요 작업 내용

- **스테이지 3종 + 스텝 4종 API 연동** — 생성 · 수정 · 삭제 · 완료 처리에 순서 변경 2종까지 총 9개
- **낙관적 락 처리** — 409 를 삼키지 않고 `재조회 / 덮어쓰기` 를 묻는 확인 모달. 순서 변경은 `overwrite` 가 없어 재조회만 안내
- **`단계수정` → 단계 관리 모달** — 단계 · 스텝을 드래그(또는 ↑↓ 버튼)로 재정렬하고 `순서 저장` 때 한 번에 전송. 스텝은 다른 단계 · `미분류` 로도 옮긴다
- **하위 정리 UI** — 스테이지 삭제는 스텝 이전 대상 select(필수), 스텝 삭제는 블록을 체크해 골라 살린다. 이슈는 선택지 없이 함께 삭제됨을 상시 경고
- **사이드바 TODO 해제** — `추가` · 스테이지 `＋` · `⋯` 메뉴(이름 수정 · 스텝 수정 · 완료 처리 · 삭제) 전부 연결

### 트러블슈팅

| 문제                                                          | 원인                                                                    | 해결                                                                                                 |
| ------------------------------------------------------------- | ----------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------- |
| 수정 API 가 요구하는 `version` 이 목록 명세(7 · 8번)에 없다   | 낙관적 락이 2026-08-11 신설이라 조회 응답 반영 여부가 미확인            | `version?` 선택 필드로 받고, 없으면 저장 버튼을 막고 재조회를 안내. `.ai/API.md` 확인 대기 표에 등록 |
| 책임자가 참여자 목록에 없으면 저장 시 조용히 해제된다         | `<select>` 에 없는 값은 브라우저가 버린다 + 스텝 수정이 전체 덮어쓰기다 | 현재 책임자를 옵션으로 끼워 넣는다 (`· 삭제된 사원` 표기)                                            |
| `useRef` 로 초안 재동기화를 하니 `react-hooks/refs` 린트 실패 | 렌더 중 ref 접근 금지                                                   | `useState` 로 바꿔 렌더 중 상태 조정 패턴 사용 (`ProjectSidebar` 의 `syncedStageId` 와 같은 방식)    |
| 단계만 끌었는데 스텝 순서 API 까지 나갈 뻔                    | 하나의 지문으로 변경 여부를 판정했다                                    | `fingerprint`(순서 포함) · `stepArrangement`(묶음 정렬) 두 지문으로 분리                             |

### 부수 결정

- **순서는 드롭마다가 아니라 `순서 저장` 때 한 번** — 두 API 모두 전체 최종 순서를 받는다. 매번 보내면 옮기는 중인 배치가 남의 화면에 그대로 보인다 (블록 배치 편집과 같은 규칙)
- **순서 편집 중에는 이름 수정 · 삭제 · 추가를 막는다** — 그 작업들이 목록을 재조회시켜 저장 안 된 드래그를 덮어쓴다
- **충돌 모달의 취소(= Esc · 배경 클릭)를 `다시 불러오기` 에 둔다** — 파괴적인 `덮어쓰기` 를 Esc 로 흘리면 안 된다
- **순서 API 는 `version` 이 하나라도 없으면 아예 보내지 않는다** — 항목별 락이라 하나만 어긋나도 전체 롤백이다
- **스텝 수정 폼은 빈 칸도 그대로 보낸다** — 수정이 전체 덮어쓰기라 "비우면 해제" 를 모달 문구로도 알린다
- **소속 단계 변경은 수정 폼에 두지 않았다** — `PATCH /steps/{stepId}` 가 `stageId` 를 받지 않는다(2026-08-09). 단계 관리 모달의 드래그가 유일한 경로다
- **`단계수정` 을 단계 관리 모달로 붙였다** — `⋯` 메뉴는 호버해야 나와 처음 쓰는 사람이 못 찾는다
- **모달 6종은 `dynamic` + 호버 프리로드** — 사이드바는 프로젝트 하위 전 화면에 떠 있어, 정적으로 물면 편집 권한이 없는 사용자도 매번 내려받는다

---

## [2026-08-11] 프로젝트 전체 화면 — 전체 일정 · 문서함 · 이미지 · 휴지통 ✅

브랜치: `user/project` · 이슈: #107

### 변경 파일

| 파일                                                           | 변경                                                                                                                                                |
| -------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------- |
| `.ai/API.md`                                                   | 수정 (103~111 추가 · 파일/이미지 삭제·복구 공통 절 2개 신설 · 목차 9줄)                                                                             |
| `src/constants/endpoints.ts`                                   | 수정 (`projects.files/filesTrash/images/imagesTrash/issues` · `files.restore/permanentDeletion` · `blocks.imageItemsRestore/imageItemsHardDelete`)  |
| `src/lib/api.ts`                                               | 수정 (`api.deleteWithBody()` 신설 — 본문 있는 DELETE)                                                                                               |
| `src/components/ProjectTabs.tsx`                               | 생성 (전체 이슈 · 문서함 · 이미지 · 휴지통 탭)                                                                                                      |
| `src/app/projects/[id]/(overview)/layout.tsx`                  | 생성 (라우트 그룹 + 탭바)                                                                                                                           |
| `src/app/projects/[id]/(overview)/page.tsx`                    | 생성 (기존 `[id]/page.tsx` 대체)                                                                                                                    |
| `src/app/projects/[id]/(overview)/files·images·trash/page.tsx` | 생성                                                                                                                                                |
| `src/features/project/overview/ProjectIssues.tsx`              | 생성 (스텝 아코디언 + 상태 3열)                                                                                                                     |
| `src/features/project/overview/IssueProgressBar.tsx`           | 생성 (3색 진척 바 · 개수 범례)                                                                                                                      |
| `src/features/project/overview/ProjectFiles.tsx`               | 생성 (스텝 → 블록 트리 문서함)                                                                                                                      |
| `src/features/project/overview/groupFiles.ts`                  | 생성 (평면 목록 → 트리 조합)                                                                                                                        |
| `src/features/project/overview/ProjectImages.tsx`              | 생성 (타일 그리드 · 라이트박스)                                                                                                                     |
| `src/features/project/overview/ProjectTrash.tsx`               | 생성 (문서 · 이미지 갈래)                                                                                                                           |
| `src/features/project/overview/TrashFiles.tsx`                 | 생성 (건별 복구 · 영구 삭제)                                                                                                                        |
| `src/features/project/overview/TrashImages.tsx`                | 생성 (다중 선택 일괄 처리)                                                                                                                          |
| `src/features/project/overview/ProjectOverviewSkeletons.tsx`   | 생성 (이슈 · 문서 · 이미지)                                                                                                                         |
| `src/features/project/overview/useProjectStages.ts`            | 생성 (`stepId → stageId` 색인 · `groupByStage()`)                                                                                                   |
| `src/features/project/overview/StageSection.tsx`               | 생성 (스테이지 묶음 머리)                                                                                                                           |
| `src/features/project/overview/useImageBlockNames.ts`          | 생성 (`imgBlockId → 블록 이름`)                                                                                                                     |
| `src/components/Toast.tsx`                                     | 생성 (`ToastHost` · `notifyToast()`)                                                                                                                |
| `src/components/AppShell.tsx`                                  | 수정 (`ToastHost` 마운트)                                                                                                                           |
| `src/features/file/PermanentDeleteFileModal.tsx`               | 생성 (확인 문자 입력)                                                                                                                               |
| `src/features/block/PermanentDeleteImagesModal.tsx`            | 생성 (다건 확인)                                                                                                                                    |
| `src/features/file/api.ts` · `types.ts`                        | 수정 (`getProjectFiles` · `getProjectTrashFiles` · `restoreFile` · `permanentlyDeleteFile` · `ViewerFile` · `FileLocation`)                         |
| `src/features/file/FileViewerModal.tsx`                        | 수정 (`BlockFile` → `ViewerFile`, 업로더 줄 조립)                                                                                                   |
| `src/features/issue/api.ts` · `types.ts`                       | 수정 (`getProjectIssues` · `IssueProgress` · `todoIssueCount()`)                                                                                    |
| `src/features/block/api.ts` · `types.ts`                       | 수정 (`getProjectImages` · `getProjectTrashImages` · `restoreImages` · `permanentlyDeleteImages` · `ProjectImage` · `TrashImage` · `RestoredImage`) |

### 주요 작업 내용

- **`(overview)` 라우트 그룹** — `/projects/{id}` URL 을 유지하면서 형제인 `steps` · `settings` · `settlement` 에는 탭바가 붙지 않게 격리
- **전체 일정** — 프로젝트 진척도 바 + **스테이지 > 스텝** 아코디언. 펼치면 **스텝 이슈 보드와 같은 3열 칸반**(시작 전 · 진행 중 · 완료)
- **문서함** — 평면 응답을 스텝 → 블록 트리로 조합하고 **스테이지로 한 겹 더 묶는다**. 고아 파일은 스텝당 `블록 삭제됨` 한 묶음
- **이미지 모아보기** — 타일 그리드 + 라이트박스, `블록별로 보기` 토글. 블록 이름은 스텝 블록 목록(10번)에서 모아 온다
- **휴지통** — 문서(건별 · 확인 문자 `영구 삭제`) · 이미지(다중 선택 일괄) 두 갈래. **복구 · 영구 삭제는 낙관적 처리 + 토스트**
- **공용 토스트** — `AppShell` 에 `ToastHost` 하나, 어디서나 `notifyToast()`

### 부수 결정

- **네 화면 모두 조회 전용** — 업로드 · 이름 수정 · 캡션 수정 · 상태 변경은 원래 블록/스텝 화면이 정본이다. 프로젝트를 가로질러 훑는 화면에서 고치면 어느 블록을 건드렸는지 보이지 않는다. 대신 스텝 · 일정으로 가는 링크를 각 머리에 둔다
- **문서 · 파일 화면을 합쳤다** — 사용자는 둘로 요청했지만 백엔드 API 가 `GET /projects/{id}/files` 하나뿐이고, 이 프로젝트에서 "문서 = 파일" 은 같은 도메인이다
- **휴지통을 문서 · 이미지로 나눴다** — 계약이 다르다. 문서는 건별(경로 ID) + 확인 문자, 이미지는 다건(`imgIds[]`) + 확인 문자 없음. 한 목록으로 합치면 어떤 항목이 무슨 규칙으로 지워지는지 설명할 수 없다
- **휴지통은 트리로 묶지 않는다** — 찾는 기준이 위치가 아니라 "언제 지웠나" 다 (서버도 `deletedAt` 내림차순). 위치는 행에 한 줄로 붙인다
- **이미지 복구는 응답 기준으로 목록에서 뺀다** — 권한을 이미지가 속한 **스텝별로** 보므로 보낸 것이 다 돌아오지 않는다. 보낸 목록 기준으로 지우면 복구 안 된 것이 사라진다
- **이미지 영구 삭제 후에는 재조회** — 응답이 `null` 이라 몇 장이 지워졌는지 알 수 없다
- **`ViewerFile` 신설** — 문서함 응답에 업로더 부서 · 직급이 없어 뷰어 prop 을 `BlockFile` 에서 넓혔다. 비는 것은 버전 이력이 도착하기 전 잠깐뿐
- **`api.deleteWithBody()` 를 기본형으로 두지 않았다** — 이미지 영구 삭제만 본문 있는 `DELETE` 다. 같은 성격의 파일 영구 삭제는 프록시가 본문을 버리는 문제로 `POST` 로 설계돼 있다
- **확인 문자는 입력값을 그대로 보낸다** — 상수로 덮어쓰면 아무 값이나 넣어도 통과하는 것처럼 보인다. 화면 검사는 버튼 잠금용 편의일 뿐이고 검증 주체는 서버다
- **이슈 필터 · 제목 검색은 넣지 않았다** — 스텝 보드용으로 이미 백로그에 있어 두 화면을 함께 손보는 편이 맞다
- **탭 이름을 `전체 일정` 으로** — 스텝 화면의 같은 것이 `일정` 탭이다. 한쪽만 `이슈` 라고 부르면 같은 데이터가 두 이름으로 불린다
- **스테이지 묶기는 부가 조회로** — 105 · 108 응답에 `stageId` 가 없어 7 · 8번을 따로 읽는다. **실패해도 목록을 막지 않고** 묶지 않은 채 그린다. 사이드바가 같은 두 API 를 이미 쓰지만 컴포넌트가 달라 값을 넘겨받을 길이 없다
- **스테이지는 아코디언으로 만들지 않았다** — 접히는 층이 둘이면 문서 하나 보는 데 클릭이 세 번이다. 머리로 경계만 긋는다
- **비어 있는 스테이지는 그리지 않는다** — 이슈도 문서도 없는 칸이 늘어서면 훑기가 어렵다
- **이미지 블록 이름은 켤 때만 읽는다** — 스텝 수만큼 요청이 늘어(N+1) `블록별로 보기` · `크게 보기` 에서만 조회한다. 못 읽으면 `블록 #3` 으로 되돌아간다. ❗ 107번에 `blockTitle` 이 실리면 `useImageBlockNames` 는 통째로 지운다
- **복구 · 영구 삭제를 낙관적으로 바꿨다** — 되돌릴 수 없는 동작이지만 확인 모달(영구 삭제) · 명시적 버튼(복구)에서 뜻을 이미 물었고, 여러 건을 잇달아 정리하는 화면이라 매번 응답을 기다리면 손이 멎는다. 실패하면 **원래 자리로** 되돌리고 오류 토스트를 띄운다
- **확인 모달은 요청을 보내지 않는다** — 뜻만 확인하고 닫히며 요청은 부르는 쪽이 뒤에서 돌린다. 그래서 실패 안내가 모달이 아니라 토스트로 간다
- **이미지 복구는 돌아오지 않은 것만 되살린다** — 권한을 스텝별로 봐서 일부만 복구될 수 있다
- **토스트를 컨텍스트가 아니라 전역 이벤트로** — 화면마다 프로바이더를 끼우지 않는다 (`issue:changed` 와 같은 방식). ⚠️ 네이티브 `<dialog>` 가 최상위 레이어라 토스트를 가린다 — 모달을 닫은 뒤 띄운다 (낙관적 처리라 자연히 그렇게 된다)

### 코드 스플리팅 · 최적화

**나눈 청크**

| 대상                                                               | 청크             | 신호                                 |
| ------------------------------------------------------------------ | ---------------- | ------------------------------------ |
| `TrashFiles`                                                       | 12KB             | 휴지통 진입 시                       |
| `TrashImages`                                                      | 16KB             | `이미지` 갈래 hover · focus 프리로드 |
| `ProjectImageLightbox`                                             | 4KB              | 타일 그리드 hover 프리로드           |
| `FileViewerModal`(+pdfjs) · `IssueDetailModal` · 영구삭제 모달 2종 | 기존 방식 그대로 | hover · focus                        |

한 번에 하나만 그리는 휴지통 두 갈래를 함께 싣지 않는다 — 문서만 보고 나가는 사용자가 다중 선택 · 이미지 영구삭제 로더까지 받을 이유가 없다. 이미지 라이트박스도 목록만 훑는 사용자에게는 `Modal` 이 짐이다.

**요청 줄이기 — `sharedRequest`**

`전체 일정` 과 `문서함` 이 둘 다 스테이지 · 스텝을 읽고, 탭을 오갈 때마다 컴포넌트가 새로 마운트돼 같은 요청이 반복됐다. 이미지 블록 이름은 더 비싸다(N+1). 키 기준으로 **도는 요청은 합치고 결과는 TTL 동안 캐시**한다 (스테이지 60초 · 블록 이름 5분). `projectFileVersionsStore` 같은 구독 스토어를 또 만들지 않은 이유는 여기 필요한 것이 폴링이 아니라 중복 제거뿐이어서다.

⚠️ `AbortSignal` 을 받지 않는다 — 요청을 여럿이 나눠 쓰므로 한 화면이 떠났다고 끊으면 기다리는 다른 화면까지 실패한다. 대신 부르는 쪽이 `isStale` 플래그로 **결과를 버린다.**
⚠️ 실패는 캐시하지 않는다 — 한 번 끊겼다고 TTL 동안 재시도가 막히면 안 된다.

**렌더 줄이기**

- `memo` — `StepAccordion` · `IssueRow` · `BlockGroup` · `FileRow` · `ImageGrid`. 스텝 하나를 접었다고 나머지 스텝의 카드까지 다시 그리지 않는다
- 콜백은 **대상을 인자로 받는 고정 함수**(`useCallback`) — 행마다 새 화살표 함수를 넘기면 `memo` 가 무력해진다 (`IssueCard` 와 같은 규칙)
- `useMemo` — `groupFilesByStep` · `groupByStage` · `groupImagesByBlock` · 스텝별 `byDueDate` 정렬. 접혀 있는 스텝은 정렬 자체를 하지 않는다(`isOpen` 조건)

### 트러블슈팅

**1. 삭제한 `[id]/page.tsx` 참조가 남아 타입 체크가 깨졌다**

`(overview)` 로 옮긴 뒤 `next build` 가 `.next/dev/types/validator.ts` 에서 `Cannot find module '.../[id]/page.js'` 로 실패했다. dev 서버가 만들어 둔 **stale 라우트 타입**이라 `.next` 를 지우고 다시 빌드하면 해결된다 (dev 서버는 재시작).

### ❗ 백엔드 확인 필요

- **110번 요청 필드명** — 표에는 `imagIds`, 예시와 111번은 `imgIds`. 예시 쪽으로 연동했다
- **111번이 본문 있는 `DELETE`** — 104번이 `POST` 인 이유("일부 프록시가 DELETE 본문을 버림")가 이미지엔 적용되지 않았다. 배포 환경에서 본문이 사라지면 400
- **111번에 확인 문자가 없다** — 오조작이 곧 영구 삭제다. 프론트 모달이 유일한 방어선
- **109번에 `imgBlockId` 가 없다** — 107번엔 있다. 없어서 이미지 휴지통을 블록으로 묶지 못한다
- **107번에 `orderIndex` · 블록 제목이 없다** — 블록 머리를 `블록 #3` 처럼 ID 로만 적는다

---

## [2026-08-11] 사원 그룹 관리 · 직급별 사원 목록 ✅

브랜치: `feat/employee-group` · 이슈: #96 · #97

### 변경 파일

| 파일                                                      | 변경                                                       |
| --------------------------------------------------------- | ---------------------------------------------------------- |
| `src/features/employeeGroup/types.ts`                     | 생성 (그룹 · 구성원 · 결과 타입 · 길이 상수)               |
| `src/features/employeeGroup/errorCodes.ts`                | 생성 (`GRP_*` 4개 · `ADD_MEMBER_REJECTED_CODES`)           |
| `src/features/employeeGroup/api.ts`                       | 생성 (91~97 7개 함수)                                      |
| `src/features/employeeGroup/EmployeeGroupList.tsx`        | 생성 (목록 · 검색 · 케밥)                                  |
| `src/features/employeeGroup/EmployeeGroupFormModal.tsx`   | 생성 (추가 · 수정 겸용)                                    |
| `src/features/employeeGroup/DeleteEmployeeGroupModal.tsx` | 생성 (공용 `AlertDialogTwoButton`)                         |
| `src/features/employeeGroup/GroupMembersModal.tsx`        | 생성 (구성원 목록 · 추가 · 제거)                           |
| `src/app/settings/employee-groups/page.tsx`               | 생성 (라우트)                                              |
| `src/features/jobPosition/JobPositionEmployeesModal.tsx`  | 생성 (직급별 사원 패널)                                    |
| `src/features/jobPosition/types.ts` · `api.ts`            | 수정 (`JobPositionEmployee` · `getJobPositionEmployees()`) |
| `src/features/jobPosition/JobPositionList.tsx`            | 수정 (인원수를 링크 버튼으로)                              |
| `src/constants/endpoints.ts`                              | 수정 (`employeeGroups` 4개 · `jobPositions.employees`)     |
| `src/features/pagePermission/catalog.ts`                  | 수정 (`PageRoute.label` 신설 — `ADMIN_CONSOLE` 라벨 덮기)  |
| `src/app/settings/page.tsx`                               | 수정 (`그룹 관리` 준비 중 해제)                            |

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

| 파일                                                                                                    | 변경                                                                                        |
| ------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------- |
| `src/features/employee/BulkUploadModal.tsx`                                                             | 생성 (3단 스텝퍼 · 입력 형식표 · 행 오류 표 · 등록 확인)                                    |
| `src/lib/download.ts`                                                                                   | 생성 (`saveResponseAsFile()` — 응답을 파일로 저장. 도메인 무관)                             |
| `src/features/employee/api.ts`                                                                          | 수정 (`downloadBulkTemplate()` · `validateBulkEmployees()` · `registerBulkEmployees()`)     |
| `src/features/employee/types.ts`                                                                        | 수정 (`BulkRowError` · `BulkValidateResult` · `BulkRegisterResult`)                         |
| `src/features/employee/errorCodes.ts`                                                                   | 수정 (파일 3종 + `EMP_HAS_ERRORS` · `BULK_FILE_CODES`)                                      |
| `src/constants/endpoints.ts`                                                                            | 수정 (`bulkTemplate` · `bulkValidate` · `bulk`)                                             |
| `src/components/Modal.tsx`                                                                              | 수정 (`dismissOnBackdrop` prop 신설)                                                        |
| `src/features/employee/EmployeeList.tsx`                                                                | 수정 (`BulkUploadButton` 제거 · 모달 연결 · `.btn` 전환 · `useModal`/`useModalTarget` 전환) |
| `EmployeeDetail` · `EmployeeCreateForm` · `EmployeeEditForm` · `RoleChangeModal` · `PasswordResetModal` | 수정 (하드코딩 버튼 → `.btn` 계열 14곳)                                                     |

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

| 항목 | 내용                                                                                                            |
| ---- | --------------------------------------------------------------------------------------------------------------- |
| 문제 | `파일 다시 선택` 후 네이티브 input 은 "선택된 파일 없음", 아래 문구는 파일명을 표시                             |
| 원인 | 단계 전환으로 input 이 새 DOM 요소로 다시 그려지는데 `input[type=file]` 의 값은 **보안상 JS 로 되돌릴 수 없다** |
| 해결 | 네이티브 표시를 쓰지 않는다 — `sr-only` input + `label` 버튼으로 두고 파일명은 우리 state 한 줄로만 보여준다    |

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
- **스텝 상태 점** — `GET /projects/{projectId}/steps` 의 `status` 로 색을 정한다(진행 전 회색 · 진행 중 노랑 · 완료 초록). 접힘 · 펼침 · 범례가 `STEP_DOT_COLOR` 한 표를 본다
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
