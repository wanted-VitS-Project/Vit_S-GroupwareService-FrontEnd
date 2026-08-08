import { getPreview } from './api';

/**
 * 미리보기 바이너리 캐시 겸 프리페치 창구.
 *
 * 서버가 요청마다 원본을 열어 5페이지를 잘라 주기 때문에 `getPreview` 는 느리고,
 * **프론트에서 이걸 빠르게 만들 방법은 없다**. 대신 문서 행에 마우스가 머무는
 * 순간 미리 시작해 두고, 클릭이 그 요청을 **이어받게** 한다.
 *
 * ⚠️ 캐시는 모듈 전역이라 문서 블록 수에 비례해 쌓일 수 있다. 그래서 항목 수를
 *    묶어 둔다 — 블록이 몇 개든 점유가 고정이어야 한다.
 */

type PreviewResult = Awaited<ReturnType<typeof getPreview>>;

/** 미리보기 blob 1개가 대략 0.2~1MB. 4개면 최대 ~4MB 로 묶인다 */
const MAX_ENTRIES = 4;

/** hover 가 이만큼 유지돼야 시작한다 — 목록을 스쳐 지나간 건 제외 */
const DWELL_MS = 150;

/**
 * `versionId → 진행 중이거나 끝난 요청`.
 *
 * 결과가 아니라 **Promise** 를 담는 게 핵심이다. 프리페치가 시작한 요청을
 * 클릭이 그대로 await 하므로 같은 문서를 두 번 받지 않는다.
 *
 * `versionId` 는 불변 키다 — 새 버전은 새 id 라 무효화가 필요 없다.
 */
const cache = new Map<string, Promise<PreviewResult>>();

/** 프리페치 대기 타이머. 행을 벗어나면 취소한다 */
let dwellTimer: ReturnType<typeof setTimeout> | null = null;

/**
 * 미리보기를 가져온다. 이미 받았거나 받는 중이면 그걸 그대로 준다.
 *
 * ℹ️ `AbortSignal` 을 받지 않는다 — 모달을 닫았다고 요청을 끊으면 프리페치가
 *    무의미해진다. 호출부는 중단이 아니라 **결과를 무시**하는 쪽으로 처리한다.
 */
export function loadPreview(fileVersionId: number | string) {
  const key = String(fileVersionId);
  const cached = cache.get(key);

  if (cached) {
    // 최근 사용으로 올린다 — Map 은 삽입 순서를 지키므로 재삽입이 곧 LRU 다
    cache.delete(key);
    cache.set(key, cached);
    return cached;
  }

  const pending = getPreview(fileVersionId).catch((caught: unknown) => {
    // 실패는 남기지 않는다 — 다시 열었을 때 재시도가 돼야 한다
    cache.delete(key);
    throw caught;
  });

  cache.set(key, pending);
  evictOverflow();

  return pending;
}

/**
 * 열기 전에 미리 받아 둔다. 행에 `DWELL_MS` 이상 머물 때만 시작한다.
 * 반환값은 `onPointerLeave` 등에 걸어 대기를 취소하는 함수다.
 */
export function schedulePreviewPrefetch(fileVersionId: number | string) {
  cancelPreviewPrefetch();

  // 데이터 절약 모드에서는 안 열지도 모르는 파일을 미리 받지 않는다
  if (isSavingData()) return;

  dwellTimer = setTimeout(() => {
    dwellTimer = null;
    // 실패해도 실제로 열 때 다시 시도되므로 여기서는 삼킨다
    void loadPreview(fileVersionId).catch(() => undefined);
  }, DWELL_MS);
}

/** 아직 시작 전인 프리페치만 취소한다. 이미 나간 요청은 끝까지 둔다 */
export function cancelPreviewPrefetch() {
  if (dwellTimer === null) return;
  clearTimeout(dwellTimer);
  dwellTimer = null;
}

function evictOverflow() {
  while (cache.size > MAX_ENTRIES) {
    const oldest = cache.keys().next().value;
    if (oldest === undefined) return;
    cache.delete(oldest);
  }
}

function isSavingData() {
  if (typeof navigator === 'undefined') return false;

  const { connection } = navigator as Navigator & {
    connection?: { saveData?: boolean };
  };

  return connection?.saveData === true;
}
