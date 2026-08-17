/**
 * 텍스트 블록 **임시저장함** — 편집 중인 본문을 브라우저에 여러 개 남긴다 (`localStorage`).
 *
 * 서버에 저장하지 않고 나가거나, 낙관적 락 충돌로 저장이 막혔을 때 **쓴 글을 잃지 않게** 하는 장치다.
 * 초안은 어디까지나 이 브라우저의 것이라 — 다른 기기 · 다른 사용자와 공유되지 않는다.
 *
 * ⚠️ 초안은 **사용자가 남길 때만** 생긴다 (2026-08-17) — 타이핑 중 자동으로 쌓지 않는다.
 *    `임시저장` 버튼 · 모달 이탈 · 충돌 확인창, 이 세 자리에서만 쓴다.
 *
 * ⚠️ **`sessionStorage` 가 아니라 `localStorage` 다.** 탭을 닫았다 다시 열어도 남아 있어야
 *    "실수로 창을 닫았다" 를 구제할 수 있다.
 * ⚠️ 저장소 접근은 **전부 실패할 수 있다** — Safari 사생활 보호 모드는 쓰기에서 예외를 던지고,
 *    용량이 차면 `QuotaExceededError` 가 난다. 초안은 부가 기능이라 실패해도 편집을 막지 않는다.
 */

const KEY_PREFIX = 'vit-s:text-draft:';

/**
 * 한 블록이 들 수 있는 초안 수.
 *
 * 넘치면 **가장 오래된 것**을 버린다 — 무한히 쌓으면 저장소 용량(보통 5MB)을
 * 텍스트 하나가 다 먹고, 목록도 훑을 수 없게 길어진다.
 */
export const MAX_TEXT_DRAFTS = 10;

export interface TextDraft {
  /** 목록에서 고르고 지울 때 쓰는 열쇠 */
  id: string;
  /** 마크다운 원문 */
  content: string;
  /**
   * 초안을 뜬 시점의 서버 낙관적 락 버전.
   * 지금 서버 버전과 다르면 **그 사이 남이 본문을 고쳤다** — 화면이 경고를 덧붙인다.
   */
  version?: number;
  /** ISO 문자열 */
  savedAt: string;
}

function keyOf(txtId: number | string) {
  return `${KEY_PREFIX}${txtId}`;
}

function newId() {
  return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 7)}`;
}

function isDraft(value: unknown): value is TextDraft {
  return (
    typeof value === 'object' &&
    value !== null &&
    typeof (value as TextDraft).content === 'string'
  );
}

/**
 * 저장소에 담긴 값을 초안 목록으로 다듬는다 — 모양이 어긋난 항목은 버린다.
 *
 * 예전 값도 읽어 준다: 초안이 한 칸이던 시절(2026-08-12 이전)의 단일 객체,
 * 자동/직접을 나누던 시절(2026-08-17 이전)의 `kind` 필드 — 지금은 둘 다 그냥 초안이다.
 */
function normalize(raw: unknown): TextDraft[] {
  const list = Array.isArray(raw) ? raw : [raw];

  return list.filter(isDraft).map((draft) => ({
    id: typeof draft.id === 'string' ? draft.id : newId(),
    content: draft.content,
    version: typeof draft.version === 'number' ? draft.version : undefined,
    savedAt: typeof draft.savedAt === 'string' ? draft.savedAt : '',
  }));
}

/** 최신순. 없거나 읽을 수 없으면 빈 배열 */
export function loadTextDrafts(txtId: number | string): TextDraft[] {
  if (typeof window === 'undefined') return [];

  try {
    const raw = window.localStorage.getItem(keyOf(txtId));
    if (!raw) return [];

    return sortNewestFirst(normalize(JSON.parse(raw)));
  } catch {
    // JSON 이 깨졌거나 저장소를 못 읽는다 — 초안이 없는 것과 같게 다룬다
    return [];
  }
}

function sortNewestFirst(drafts: TextDraft[]) {
  return [...drafts].sort((left, right) =>
    left.savedAt === right.savedAt ? 0 : left.savedAt < right.savedAt ? 1 : -1,
  );
}

/** 쓰기에 성공하면 저장된 목록, 실패하면 `null` (화면이 "임시저장 못 함" 을 알린다) */
function write(
  txtId: number | string,
  drafts: TextDraft[],
): TextDraft[] | null {
  if (typeof window === 'undefined') return null;

  const sorted = sortNewestFirst(drafts);

  try {
    window.localStorage.setItem(keyOf(txtId), JSON.stringify(sorted));
    return sorted;
  } catch {
    return null;
  }
}

/**
 * 초안을 남긴다 — 목록에 **쌓인다**.
 *
 * 같은 내용이 이미 있으면 새로 만들지 않고 그것을 최신으로 올린다 —
 * 임시저장을 두 번 눌렀다고 똑같은 칸이 둘이 되면 목록만 지저분해진다.
 */
export function saveTextDraft(
  txtId: number | string,
  draft: { content: string; version?: number },
) {
  const existing = loadTextDrafts(txtId);
  const same = existing.find((kept) => kept.content === draft.content);

  const saved: TextDraft = {
    id: same?.id ?? newId(),
    content: draft.content,
    version: draft.version,
    savedAt: new Date().toISOString(),
  };

  const rest = sortNewestFirst(existing.filter((kept) => kept.id !== saved.id));
  // 넘치면 가장 오래된 것부터 버린다
  const keepCount = Math.max(0, MAX_TEXT_DRAFTS - 1);

  return write(txtId, [saved, ...rest.slice(0, keepCount)]);
}

/** 한 칸만 지운다. 남은 목록을 돌려준다 (쓰기 실패면 `null`) */
export function removeTextDraft(txtId: number | string, id: string) {
  return write(
    txtId,
    loadTextDrafts(txtId).filter((kept) => kept.id !== id),
  );
}

/** 조건에 맞는 칸을 지운다 — 저장에 성공했을 때 그 내용과 같은 초안을 걷어낼 때 쓴다 */
export function removeTextDraftsWhere(
  txtId: number | string,
  shouldRemove: (draft: TextDraft) => boolean,
) {
  return write(
    txtId,
    loadTextDrafts(txtId).filter((kept) => !shouldRemove(kept)),
  );
}

/** 임시저장함을 비운다 */
export function clearTextDrafts(txtId: number | string) {
  if (typeof window === 'undefined') return;

  try {
    window.localStorage.removeItem(keyOf(txtId));
  } catch {
    // 지우지 못해도 할 수 있는 게 없다 — 다음 열 때 다시 안내된다
  }
}

/**
 * 초안을 뜬 시각 표기.
 * 오늘이면 `오후 3:14`, 다른 날이면 `8월 12일 오후 3:14` — 며칠 전 초안을 오늘 것으로 착각하면 안 된다.
 */
export function formatDraftTime(savedAt: string) {
  if (!savedAt) return '';

  const at = new Date(savedAt);
  if (Number.isNaN(at.getTime())) return '';

  const time = at.toLocaleTimeString('ko-KR', {
    hour: 'numeric',
    minute: '2-digit',
  });
  const now = new Date();
  const isToday =
    at.getFullYear() === now.getFullYear() &&
    at.getMonth() === now.getMonth() &&
    at.getDate() === now.getDate();

  if (isToday) return time;

  return `${at.getMonth() + 1}월 ${at.getDate()}일 ${time}`;
}

/** 목록에서 어느 초안인지 알아볼 한 줄 — 마크다운 기호는 걷어낸다 */
export function draftPreview(content: string) {
  const line = content
    .split('\n')
    .map((row) => row.replace(/^[#>\-*\s]+/, '').trim())
    .find((row) => row.length > 0);

  if (!line) return '(빈 내용)';

  return line.length > 40 ? `${line.slice(0, 40)}…` : line;
}
