# 📦 라이브러리 인벤토리

**최종 업데이트**: 2026-08-04 (이슈 #21 — 구조 단계에 불필요한 의존성 정리)
**기준 파일**: `package.json` · `package-lock.json`

> 📌 이 문서는 **"어떤 라이브러리를, 어디에, 왜 쓰는가"** 를 한눈에 보기 위한 것이다.
> 의존성을 추가·제거·교체하면 **이 표도 같이 갱신**한다. (AI에게 "라이브러리 추가하자" 라고 하면 함께 반영)
>
> 📖 관련: [STRUCTURE.md](STRUCTURE.md) · [PIPELINE.md](PIPELINE.md) · [CONVENTION.md](CONVENTION.md)

---

## 0. 스택 요약

| 항목       | 값                                           |
| ---------- | -------------------------------------------- |
| 프레임워크 | **Next.js 16** (App Router, Turbopack)       |
| 런타임     | **React 19**                                 |
| 언어       | **TypeScript 5** (`strict: true`)            |
| 스타일     | **Tailwind CSS 4**                           |
| 포맷       | **Prettier** + `prettier-plugin-tailwindcss` |
| 린트       | **ESLint 9** + `eslint-config-next`          |
| 경로 별칭  | `@/*` → `src/*` (`tsconfig.json`)            |
| 줄바꿈     | LF 고정 (`.gitattributes`)                   |

> ⚠️ UI 컴포넌트 · 서버 상태 · 폼 검증 라이브러리는 **아직 정하지 않았다.** §4 참고.

---

## 1. 런타임 의존성 (`dependencies`)

| 라이브러리            | 버전      | 역할                                                         | 사용 위치                                                      |
| --------------------- | --------- | ------------------------------------------------------------ | -------------------------------------------------------------- |
| `next`                | `16.2.12` | 프레임워크. 라우팅(App Router), 렌더링(SSR/CSR), 빌드·번들링 | `src/app/**`, `next.config.ts`, `dev`/`build`/`start` 스크립트 |
| `react`               | `19.2.4`  | UI 컴포넌트·상태·훅                                          | `src/app/**`, `src/components/**`                              |
| `react-dom`           | `19.2.4`  | React를 브라우저 DOM에 렌더링                                | Next 내부에서 사용 (직접 import는 드묾)                        |
| `@tiptap/react`       | `3.29.2`  | WYSIWYG 에디터 React 바인딩 (`useEditor` · `EditorContent`)  | `src/features/block/MarkdownEditor.tsx` · `MarkdownView.tsx`   |
| `@tiptap/starter-kit` | `3.29.2`  | 기본 확장 묶음 (제목 · 목록 · 인용 · 코드 · 굵게/기울임)     | 위 두 파일                                                     |
| `@tiptap/pm`          | `3.29.2`  | ProseMirror 코어 (TipTap 필수 peer)                          | TipTap 내부                                                    |
| `tiptap-markdown`     | `0.9.0`   | 마크다운 ↔ 에디터 문서 양방향 변환                           | 위 두 파일                                                     |

> 📌 **텍스트 블록이 마크다운 원문을 화면에 노출하지 않는 WYSIWYG 여야** 해서 도입했다.
> 본문은 마크다운 문자열로 주고받고(`PATCH /blocks/texts/{txtId}`), 화면에는 서식이 적용된 결과만 보인다.
> `@tailwindcss/typography` 는 도입하지 않고 `MARKDOWN_CLASS` 로 필요한 요소만 직접 스타일링한다.

---

## 2. 개발 의존성 (`devDependencies`)

| 라이브러리                    | 버전      | 역할                                         | 사용 위치                            |
| ----------------------------- | --------- | -------------------------------------------- | ------------------------------------ |
| `typescript`                  | `^5`      | 정적 타입 검사·컴파일                        | `tsconfig.json`, 모든 `.ts/.tsx`     |
| `@types/node`                 | `^20`     | Node 내장 API 타입                           | 빌드·설정 파일 타입                  |
| `@types/react`                | `^19`     | React 타입 정의                              | 모든 컴포넌트                        |
| `@types/react-dom`            | `^19`     | react-dom 타입 정의                          | 렌더링 타입                          |
| `tailwindcss`                 | `^4`      | 유틸리티-퍼스트 CSS 프레임워크               | `src/app/globals.css`, `className`   |
| `@tailwindcss/postcss`        | `^4`      | Tailwind v4의 PostCSS 플러그인 (빌드 통합)   | `postcss.config.mjs`                 |
| `eslint`                      | `^9`      | 코드 린트                                    | `eslint.config.mjs`, `lint` 스크립트 |
| `eslint-config-next`          | `16.2.12` | Next 공식 ESLint 규칙셋 (core-web-vitals 등) | `eslint.config.mjs`                  |
| `prettier`                    | `^3.9.6`  | 코드 포맷터                                  | `.prettierrc` · `.prettierignore`    |
| `prettier-plugin-tailwindcss` | `^0.8.1`  | Tailwind 클래스 순서 자동 정렬               | `.prettierrc` 의 `plugins`           |

---

## 3. npm 스크립트

| 스크립트        | 명령         | 용도                    |
| --------------- | ------------ | ----------------------- |
| `npm run dev`   | `next dev`   | 로컬 개발 서버          |
| `npm run build` | `next build` | 프로덕션 빌드 (CI 검증) |
| `npm run start` | `next start` | 빌드 결과 실행          |
| `npm run lint`  | `eslint`     | 린트 검사               |

---

## 4. 도입 예정 / 후보 (미설치)

> 실제 설치하면 위 표(§1·§2)로 옮기고 여기서 지운다. **설치 전에는 코드에서 import 금지.**
> 폴더 구조 단계에서는 쓰지 않으므로 **필요한 이슈에서 설치**한다.

| 후보                                    | 용도                        | 언제 도입하나                              |
| --------------------------------------- | --------------------------- | ------------------------------------------ |
| UI 컴포넌트 (PrimeReact · shadcn/ui 등) | 버튼·테이블·배지 등 공용 UI | 공용 컴포넌트 구현 이슈                    |
| 서버 상태 (`@tanstack/react-query` 등)  | API 데이터 패칭·캐싱        | 첫 API 연동 이슈                           |
| 클라이언트 상태 (`zustand` 등)          | 전역 UI 상태                | 전역 상태가 실제로 필요해질 때             |
| 폼 (`react-hook-form` + `zod`)          | 폼 입력·검증                | 로그인/등록 폼 구현 이슈                   |
| 날짜 (`date-fns` 등)                    | 날짜 계산·표기              | `lib/format.ts` 작성 시                    |
| HTTP 클라이언트 (`axios` 등)            | API 호출 래퍼               | ❌ 미도입 — `fetch` + `lib/api.ts` 로 대체 |

---

## 5. 관리 규칙

- 의존성 추가 시 **왜 필요한지**를 PR 본문 또는 WORKLOG에 남기고, 이 문서 표에 **역할·사용 위치**를 함께 기록한다.
- **당장 쓰지 않는 라이브러리는 미리 설치하지 않는다.** 쓰는 이슈에서 함께 설치한다.
- 비슷한 목적의 라이브러리를 **중복 도입하지 않는다.** (예: 상태관리 2종)
- 버전 고정: 실서비스 핵심(`next`, `react`)은 정확한 버전, 도구류는 캐럿(`^`) 허용.
- 사용처가 사라진 라이브러리는 **즉시 제거**하고 표에서도 지운다.

---

## 6. 변경 이력

| 날짜       | 변경 내용                                                                                                                                                                                                                                          | 담당   |
| ---------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------ |
| 2026-07-29 | 초기 스캐폴드 기준 인벤토리 작성                                                                                                                                                                                                                   | 손윤서 |
| 2026-08-04 | `prettier` · `prettier-plugin-tailwindcss` 추가 (포맷 규칙 확정)                                                                                                                                                                                   | 서민지 |
| 2026-08-04 | 폴더 구조 단계에서 쓰지 않는 9종 제거 — `primereact` · `@primeuix/themes` · `primeicons` · `@tanstack/react-query` · `zustand` · `react-hook-form` · `@hookform/resolvers` · `zod` · `date-fns`. 각 라이브러리는 실제로 쓰는 이슈에서 재설치한다   | 서민지 |
| 2026-08-05 | TipTap 4종 추가 — `@tiptap/react` · `@tiptap/starter-kit` · `@tiptap/pm` · `tiptap-markdown`. 텍스트 블록의 WYSIWYG 마크다운 에디터에 사용. `@uiw/react-md-editor`(분할 미리보기라 WYSIWYG 아님) · Lexical(툴바 상태를 직접 구현해야 함) 대비 채택 | 손윤서 |
