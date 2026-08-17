/**
 * 비타메이트 AI 블록 도메인 타입.
 *
 * 이 블록은 채팅형이 아니다 — **검토 유형·세부 카테고리를 고르고, 문서를
 * 기준(REFERENCE)/대상(TARGET)으로 나눠 선택한 뒤**, 서버가 준 기본 프롬프트를
 * 확인·보완해 분석을 요청한다.
 */

/** `PENDING`·`PROCESSING` 은 진행 중, 나머지는 종료 상태다 */
export type AnalysisStatus = 'PENDING' | 'PROCESSING' | 'COMPLETED' | 'FAILED';

export function isRunning(status: AnalysisStatus) {
  return status === 'PENDING' || status === 'PROCESSING';
}

/**
 * 문서의 역할.
 * - `REFERENCE` — 비교 기준이 되는 문서 (매뉴얼 · 산정기준 · RFP)
 * - `TARGET` — 검토받을 문서 (제안서 · 보고서)
 */
export type DocumentRole = 'REFERENCE' | 'TARGET';

export const ROLE_LABEL: Record<DocumentRole, string> = {
  REFERENCE: '기준 문서',
  TARGET: '검토 대상',
};

// ── 검토 템플릿 (GET /vitamate/review-templates) ─────────────────────────────

export interface ReviewCategory {
  categoryCode: string;
  categoryName: string;
  /** 카테고리 보조 안내 문구 */
  guideText: string;
  /** 프롬프트 입력창 **기본값**. 실제 AI 지시문은 서버 밖으로 나오지 않는다 */
  exampleText: string;
  templateVersion: number;
}

export interface ReviewType {
  reviewType: string;
  reviewTypeName: string;
  description: string;
  categories: ReviewCategory[];
}

// ── 분석 (GET /vitamate/analyses/{analysisId}) ───────────────────────────────

export interface AnalysisDocument {
  fileVersionId: number;
  /** **분석 당시** 문서명. 최신 파일명이 아니다 */
  fileName: string;
  /** 서버가 안 줄 수도 있다 */
  versionNo: number | null;
  documentRole: DocumentRole;
}

export interface AnalysisCitation {
  rankOrder: number;
  fileVersionId: number;
  documentChunkId: number;
  pageNumber: number | null;
  excerpt: string;
}

export interface Analysis {
  analysisId: number;
  blockId: number;
  /** 템플릿 도입 이전 레거시 분석은 null 로 온다 */
  reviewType: string | null;
  reviewCategoryCodes: string[];
  prompt: string | null;
  analysisStatus: AnalysisStatus;
  /** `COMPLETED` 에서만 값이 있다 */
  result: string | null;
  /** `FAILED` 에서만 값이 있다 */
  errorMessage: string | null;
  createdAt: string;
  /** 완료·실패 시각. 진행 중이면 null */
  completedAt: string | null;
  documents: AnalysisDocument[];
  citations: AnalysisCitation[];
}

/**
 * 이력 목록의 한 줄 (GET /blocks/{blockId}/vitamate/analyses).
 * ⚠️ `documents`·`result`·`citations` 가 **없다** — 상세는 단건 조회로 받는다.
 */
export interface AnalysisSummary {
  analysisId: number;
  reviewType: string | null;
  reviewCategoryCodes: string[];
  prompt: string | null;
  analysisStatus: AnalysisStatus;
  createdAt: string;
  completedAt: string | null;
}

/** POST /blocks/{blockId}/vitamate/analyses */
export interface CreateAnalysisRequest {
  /** 비교 기준 문서 — 1개 이상 */
  referenceFileVersionIds: number[];
  /** 검토 대상 문서 — 1개 이상. 기준 문서와 겹칠 수 없다 */
  targetFileVersionIds: number[];
  reviewType: string;
  reviewCategoryCodes: string[];
  /** `exampleText` 를 사용자가 확인·보완한 최종값 */
  prompt: string;
}

export interface CreateAnalysisResponse {
  analysisId: number;
  analysisStatus: AnalysisStatus;
  requestedAt: string;
}

// ── 블록 detail ──────────────────────────────────────────────────────────────

/**
 * AI 블록의 `detail`.
 *
 * ⚠️ **"블록의 최신 분석" 전용 조회 API 가 없다.** `latestAnalysisId` 가 실려 오면
 *    곧바로 단건 조회로 가고, 없으면 이력 목록(최신순)의 첫 건으로 대체한다.
 *    백엔드에 전용 API 가 생기면 이 폴백만 지우면 된다.
 */
export interface VitamateBlockDetail {
  latestAnalysisId: number | null;
}

export function readVitamateBlockDetail(detail: unknown): VitamateBlockDetail {
  if (typeof detail !== 'object' || detail === null) {
    return { latestAnalysisId: null };
  }

  const { latestAnalysisId, analysisId } = detail as {
    latestAnalysisId?: unknown;
    analysisId?: unknown;
  };
  // 키 이름이 확정 전이라 둘 다 본다
  const found = Number.isSafeInteger(latestAnalysisId)
    ? (latestAnalysisId as number)
    : Number.isSafeInteger(analysisId)
      ? (analysisId as number)
      : null;

  return { latestAnalysisId: found && found > 0 ? found : null };
}

// ── 진행 중 polling 정책 ─────────────────────────────────────────────────────

/** 요청 직후 이만큼은 조회하지 않는다 — 이 구간은 거의 항상 `PROCESSING` 이다 */
export const POLL_DELAY_MS = 15_000;
/** 지연 시작 이후 조회 간격 */
export const POLL_INTERVAL_MS = 3_000;
/** 이 시간을 넘기면 폴링은 유지하되 "예상보다 지연" 문구로 바꾼다 */
export const POLL_SLOW_AFTER_MS = 120_000;

/** 조회가 연속 실패할 때 물러날 간격의 상한 — 죽은 서버를 3초마다 두드리지 않는다 */
export const POLL_MAX_BACKOFF_MS = 30_000;

/*
 * 문서 인덱싱(`indexStatus`) 관련 상수 · 헬퍼는 **파일 도메인**에 있다
 * (`features/file/types.ts`) — 문서 업로드 블록도 같은 값을 쓴다.
 */

// ── 프롬프트 ─────────────────────────────────────────────────────────────────

/** ❗ 백엔드 상한 미확정 — 블록 제목보다 넉넉하게 잡되 무제한으로 두지 않는다 */
export const PROMPT_MAX_LENGTH = 2000;

/**
 * 고른 카테고리들의 `exampleText` 를 프롬프트 기본값 하나로 합친다.
 * API 가 최종 문자열 **하나**만 받으므로 카테고리별로 나누지 않는다.
 */
export function buildDefaultPrompt(categories: ReviewCategory[]) {
  return categories
    .map((category) => category.exampleText.trim())
    .filter((text) => text !== '')
    .join('\n');
}

// ── 결과 파싱 ────────────────────────────────────────────────────────────────

/**
 * 지적 사항 한 건의 심각도. 왼쪽 색 막대로 구분한다.
 * - `high` — 값이 서로 어긋남 (불일치 · 오류 · 초과)
 * - `medium` — 있어야 할 것이 비어 있음 (누락 · 공란 · 미기재)
 * - `low` — 그 외 (표기 · 권장)
 */
export type FindingSeverity = 'high' | 'medium' | 'low';

export interface ResultFinding {
  title: string;
  detail: string;
  severity: FindingSeverity;
}

/**
 * 요약 · 경고 구획을 이루는 한 덩이.
 *
 * 옛 파서는 이 구획들을 문자열 하나로 이어 붙였다. 그러면 `### 계약 금액` 같은
 * **소제목과 문단 · 목록이 한 줄로 뭉개져** 원문의 구조가 사라진다.
 */
export interface ResultBlock {
  kind: 'heading' | 'paragraph' | 'item';
  text: string;
  /** `heading` 의 크기 1~6 (`#` 개수). `**제목**` · `제목:` 꼴은 3 으로 본다 */
  level?: number;
}

export interface ParsedResult {
  /** 검토 요약 */
  summary: ResultBlock[];
  findings: ResultFinding[];
  /** 종합 경고 · 결론 */
  warning: ResultBlock[];
}

/** 값이 어긋난 쪽이 비어 있는 쪽보다 급하다 — 먼저 걸리는 순서로 둔다 */
const HIGH_WORDS = ['불일치', '오류', '차이', '초과', '모순', '상이', '어긋'];
const MEDIUM_WORDS = ['누락', '공란', '미기재', '없음', '미작성', '빠짐'];

function severityOf(text: string): FindingSeverity {
  if (HIGH_WORDS.some((word) => text.includes(word))) return 'high';
  if (MEDIUM_WORDS.some((word) => text.includes(word))) return 'medium';
  return 'low';
}

/** 어느 구획으로 모을지 — 제목 문구의 낱말로 가른다 */
type Bucket = 'summary' | 'findings' | 'warning';

const BUCKET_WORDS: [Bucket, string[]][] = [
  ['summary', ['요약', '개요', '총평', '결과 요약']],
  ['findings', ['불일치', '누락', '항목', '발견', '지적', '오류', '이슈']],
  ['warning', ['경고', '주의', '종합', '리스크', '결론', '유의']],
];

function bucketOf(heading: string): Bucket | null {
  for (const [bucket, words] of BUCKET_WORDS) {
    if (words.some((word) => heading.includes(word))) return bucket;
  }
  return null;
}

/**
 * `## 제목` · `**제목**` · `제목:` 처럼 홀로 선 줄이면 그 제목과 **크기**를 준다.
 *
 * `#` 개수를 흘려버리면 h1 과 h4 가 같은 모양으로 그려져, 원문이 세워 둔 층이 사라진다.
 * 기호 없는 꼴(`**제목**` · `제목:`)은 크기를 알 수 없어 중간(3)으로 둔다.
 */
function headingOf(line: string): { text: string; level: number } | null {
  const hash = /^(#{1,6})\s+(.+?)\s*$/.exec(line);
  if (hash) {
    return {
      text: hash[2].replace(/[*:·]+$/, '').trim(),
      level: hash[1].length,
    };
  }

  const bold = /^\*\*(.+?)\*\*\s*:?\s*$/.exec(line);
  if (bold) return { text: bold[1].replace(/[:·]+$/, '').trim(), level: 3 };

  // "검토 요약:" 처럼 콜론으로 끝나는 짧은 줄. 길면 본문으로 본다
  const colon = /^([^:：]{2,20})[:：]\s*$/.exec(line);
  return colon ? { text: colon[1].trim(), level: 3 } : null;
}

/** 목록 항목이면 글머리표를 뗀 본문을 준다 */
function listItemOf(line: string) {
  const bullet = /^\s*[-*•]\s+(.+)$/.exec(line);
  if (bullet) return bullet[1].trim();

  const numbered = /^\s*\d+[.)]\s+(.+)$/.exec(line);
  return numbered ? numbered[1].trim() : null;
}

/**
 * 한 줄을 제목 / 상세로 가른다.
 * `**제목** 상세` · `제목 — 상세` · `제목: 상세` 를 모두 받는다.
 */
function splitFinding(text: string): ResultFinding {
  const bold = /^\*\*(.+?)\*\*\s*[—–\-:：]?\s*(.*)$/.exec(text);
  if (bold) {
    return {
      title: bold[1].trim(),
      detail: bold[2].trim(),
      severity: severityOf(text),
    };
  }

  const dashed = /^(.{2,40}?)\s*[—–]\s*(.+)$/.exec(text);
  if (dashed) {
    return {
      title: dashed[1].trim(),
      detail: dashed[2].trim(),
      severity: severityOf(text),
    };
  }

  const colon = /^([^:：]{2,40})[:：]\s*(.+)$/.exec(text);
  if (colon) {
    return {
      title: colon[1].trim(),
      detail: colon[2].trim(),
      severity: severityOf(text),
    };
  }

  return { title: text.trim(), detail: '', severity: severityOf(text) };
}

/**
 * AI 결과 문자열을 요약 · 지적 사항 · 경고로 나눈다.
 *
 * ⚠️ **`result` 는 자유 문자열이다** — 서버가 형식을 보장하지 않는다.
 *    그래서 나눠지지 않으면 `null` 을 주고, 호출부는 마크다운 원문을 그대로 그린다.
 *    형식이 계약으로 확정되면 이 파서 대신 구조화된 필드를 읽으면 된다.
 */
export function parseResult(result: string): ParsedResult | null {
  const lines = result.split('\n');

  const summary: ResultBlock[] = [];
  const findings: ResultFinding[] = [];
  const warning: ResultBlock[] = [];
  /** 아직 제목을 못 만난 구간 — 첫 문단은 요약으로 본다 */
  let current: Bucket = 'summary';
  let sawHeading = false;
  /** 빈 줄 · 제목을 지나왔다 — 다음 줄은 앞 문단에 잇지 않고 새로 세운다 */
  let brokeParagraph = true;

  /**
   * 블록을 쌓는 구획은 요약 · 경고 **둘뿐**이다 (지적 사항은 `findings` 가 따로 받는다).
   *
   * ⚠️ 타입에서 `findings` 를 빼 둔 것은 실수를 막기 위해서다 — 예전에는 `Bucket` 을
   *    그대로 받아, 지적 사항 구획의 줄이 조용히 **요약으로 새어 들어갔다**.
   */
  type TextBucket = Exclude<Bucket, 'findings'>;

  function blocksOf(bucket: TextBucket) {
    return bucket === 'warning' ? warning : summary;
  }

  /**
   * 이어지는 평범한 줄은 **한 문단으로 잇는다** — 마크다운의 soft wrap 과 같다.
   * 빈 줄이나 제목을 지나온 뒤라면 새 문단을 세운다.
   */
  function pushText(
    bucket: TextBucket,
    text: string,
    kind: 'paragraph' | 'item',
  ) {
    const blocks = blocksOf(bucket);
    const last = blocks[blocks.length - 1];

    if (kind === 'paragraph' && !brokeParagraph && last?.kind === 'paragraph') {
      last.text = `${last.text} ${text}`;
      return;
    }

    blocks.push({ kind, text });
    // 목록 항목은 줄마다 하나다 — 다음 줄을 여기에 이어 붙이지 않는다
    brokeParagraph = kind === 'item';
  }

  for (const line of lines) {
    const text = line.trim();
    if (text === '') {
      brokeParagraph = true;
      continue;
    }

    const heading = headingOf(text);
    if (heading) {
      const next = bucketOf(heading.text);
      if (next) {
        current = next;
        sawHeading = true;
        brokeParagraph = true;
        continue;
      }

      /*
       * 못 알아본 제목도 **버리지 않는다.**
       *
       * `## 지적 사항` 아래의 `### 금액 불일치` 처럼, 구획을 가르지는 못해도
       * 그 자체가 내용인 경우가 많다. 건너뛰면 제목이 사라지고 뒤따르는 설명만
       * 남아 엉뚱한 항목에 붙는다.
       */
      if (current === 'findings') {
        findings.push(splitFinding(heading.text));
      } else {
        blocksOf(current).push({
          kind: 'heading',
          text: heading.text,
          level: heading.level,
        });
      }
      brokeParagraph = true;
      continue;
    }

    const item = listItemOf(text);

    /*
     * 지적 사항 구획의 줄은 **여기서 전부 처리한다.**
     *
     * 예전에는 첫 줄이 목록이 아니면 아래로 흘러가 `요약`에 쌓였다 — `## 지적 사항`
     * 아래 문장이 `검토 요약` 칸에 뜨는 셈이라, 사용자는 읽은 자리에서 그 문장을 잃는다.
     */
    if (current === 'findings') {
      if (item !== null) {
        findings.push(splitFinding(item));
        continue;
      }
      // 목록이 아닌 줄은 직전 항목의 이어지는 설명으로 붙인다
      if (findings.length > 0) {
        const last = findings[findings.length - 1];
        last.detail = last.detail ? `${last.detail} ${text}` : text;
        continue;
      }
      // 아직 항목이 하나도 없다 — 이 구획의 머리글이라 첫 항목으로 세운다
      findings.push(splitFinding(text));
      continue;
    }

    if (item !== null) pushText(current, item, 'item');
    else pushText(current, text, 'paragraph');
  }

  // 제목도 없고 지적 사항도 못 찾았으면 구조가 아니다 — 원문을 그대로 보여준다
  if (!sawHeading && findings.length === 0) return null;

  return { summary, findings, warning };
}
