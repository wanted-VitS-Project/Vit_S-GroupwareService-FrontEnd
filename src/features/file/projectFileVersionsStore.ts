import { messageOf } from '@/lib/api';

import { getProjectFileVersions } from './api';
import {
  hasIndexingDocument,
  INDEX_MAX_FAILURES,
  INDEX_POLL_INTERVAL_MS,
  INDEX_POLL_SLOW_AFTER_MS,
  INDEX_POLL_SLOW_INTERVAL_MS,
  INDEX_RETRY_BASE_MS,
  INDEX_RETRY_MAX_MS,
  type ProjectFileVersion,
} from './types';

/**
 * 프로젝트 파일 버전 목록의 **프로젝트당 하나뿐인** 조회·폴링.
 *
 * 이 목록을 보는 곳이 여럿이라(비타메이트 실행 모달 · 문서 선택 모달) 컴포넌트마다
 * 각자 받으면 같은 프로젝트 전체 목록을 중복해서 받고, 인덱싱 중에는 폴링까지 겹친다.
 * 그래서 구독 구조로 두고 **조회 1회 · 타이머 1개**만 돈다.
 */

export interface ProjectFileVersionsState {
  /** 아직 안 왔으면 null */
  versions: ProjectFileVersion[] | null;
  loadError: string;
}

type Listener = (state: ProjectFileVersionsState) => void;

interface Store {
  /**
   * 참조를 그대로 유지한다 — 구독 즉시 같은 객체를 돌려주면 React 가
   * 상태가 안 바뀐 것으로 보고 불필요한 렌더를 건너뛴다.
   */
  state: ProjectFileVersionsState;
  listeners: Set<Listener>;
  timer: ReturnType<typeof setTimeout> | undefined;
  /** 폴링 간격을 늘릴 시점을 재는 기준 */
  watchStartedAt: number;
  /** 마지막으로 응답을 받은 시각 — 다시 볼지 판단한다 */
  fetchedAt: number;
  /** 연속 실패 횟수 — 재시도 간격과 포기 시점을 정한다 */
  failureCount: number;
  /** 도는 중인 조회. 구독자가 몰려도 요청은 하나만 나간다 */
  inFlight: Promise<void> | undefined;
}

const EMPTY_STATE: ProjectFileVersionsState = { versions: null, loadError: '' };

/**
 * 이만큼 지난 값은 낡은 것으로 본다.
 *
 * 폴링이 멈춘 뒤(전부 인덱싱 완료) 새 구독자가 붙으면, 그사이 다른 화면에서
 * 올린 문서가 빠져 있을 수 있어 조용히 한 번 다시 받는다.
 */
const STALE_MS = 30_000;

const stores = new Map<string, Store>();

function storeOf(projectId: string) {
  const found = stores.get(projectId);
  if (found) return found;

  const created: Store = {
    state: EMPTY_STATE,
    listeners: new Set(),
    timer: undefined,
    watchStartedAt: 0,
    fetchedAt: 0,
    failureCount: 0,
    inFlight: undefined,
  };
  stores.set(projectId, created);
  return created;
}

function publish(store: Store, next: ProjectFileVersionsState) {
  store.state = next;
  store.listeners.forEach((listener) => listener(next));
}

/**
 * 화면이 가려져 있으면 폴링하지 않는다.
 * 안 보는 탭에서 5초마다 프로젝트 전체 목록을 받아 봐야 쓸모가 없다.
 */
function isHidden() {
  return typeof document !== 'undefined' && document.hidden;
}

/**
 * 더 볼 것이 남았는지.
 *
 * 실패한 뒤에는 목록이 비어 있어도 다시 시도해야 한다 — 첫 조회가 네트워크 문제로
 * 실패했을 때 `versions` 만 보고 판단하면 "인덱싱 중인 문서 없음" 으로 읽혀
 * 재시도가 영영 걸리지 않는다.
 */
function shouldKeepWatching(store: Store) {
  if (store.listeners.size === 0) return false;
  if (store.failureCount > 0) return store.failureCount <= INDEX_MAX_FAILURES;
  if (store.state.versions === null) return false;

  return hasIndexingDocument(store.state.versions);
}

/**
 * 다음 조회까지의 간격.
 *
 * 실패 중이면 두 배씩 물러나고, 오래 걸리는 인덱싱은 5분 뒤부터 느슨하게 본다.
 * **어느 경우에도 완전히 놓지는 않는다** — 늦게라도 끝나면 화면이 풀려야 한다.
 */
function nextDelay(store: Store) {
  if (store.failureCount > 0) {
    return Math.min(
      INDEX_RETRY_BASE_MS * 2 ** (store.failureCount - 1),
      INDEX_RETRY_MAX_MS,
    );
  }

  return Date.now() - store.watchStartedAt > INDEX_POLL_SLOW_AFTER_MS
    ? INDEX_POLL_SLOW_INTERVAL_MS
    : INDEX_POLL_INTERVAL_MS;
}

function schedule(store: Store, projectId: string) {
  clearTimeout(store.timer);
  store.timer = undefined;

  if (!shouldKeepWatching(store) || isHidden()) return;

  store.timer = setTimeout(() => {
    void load(projectId);
  }, nextDelay(store));
}

function load(projectId: string) {
  const store = storeOf(projectId);
  // 이미 도는 중이면 그 요청을 같이 기다린다
  if (store.inFlight) return store.inFlight;

  store.inFlight = getProjectFileVersions(projectId)
    .then((versions) => {
      store.fetchedAt = Date.now();
      store.failureCount = 0;
      publish(store, { versions, loadError: '' });
    })
    .catch((caught) => {
      /*
       * 한 번 실패했다고 접지 않는다 — 일시적인 끊김이면 다음 회차에 붙는다.
       * 이미 받아 둔 목록이 있으면 그대로 두고 안내만 얹는다.
       */
      store.failureCount += 1;
      publish(store, {
        versions: store.state.versions ?? [],
        loadError: messageOf(caught, '문서 목록을 불러오지 못했습니다.'),
      });
    })
    .finally(() => {
      store.inFlight = undefined;
      schedule(store, projectId);
    });

  return store.inFlight;
}

/** 탭이 다시 보이면 밀린 조회를 곧바로 따라잡는다 */
function handleVisibility() {
  if (isHidden()) {
    stores.forEach((store) => {
      clearTimeout(store.timer);
      store.timer = undefined;
    });
    return;
  }

  stores.forEach((store, projectId) => {
    if (shouldKeepWatching(store)) void load(projectId);
  });
}

let isVisibilityBound = false;

function bindVisibility() {
  if (isVisibilityBound || typeof document === 'undefined') return;
  isVisibilityBound = true;
  document.addEventListener('visibilitychange', handleVisibility);
}

/** 구독 시점의 값 — 훅이 첫 렌더에서 캐시를 그대로 쓰게 한다 */
export function readProjectFileVersions(projectId: string) {
  return storeOf(projectId).state;
}

/**
 * 목록을 구독한다. 반환값을 부르면 구독이 끊긴다.
 * 마지막 구독자가 떠나면 타이머도 멈춘다 (받아 둔 값은 캐시로 남는다).
 */
export function subscribeProjectFileVersions(
  projectId: string,
  listener: Listener,
) {
  const store = storeOf(projectId);
  const isFirst = store.listeners.size === 0;

  store.listeners.add(listener);
  bindVisibility();

  if (isFirst) {
    store.watchStartedAt = Date.now();
    // 지난 실패는 새 구독의 판단을 막지 않는다
    store.failureCount = 0;
  }

  /*
   * 지금 값을 곧바로 건네준다.
   *
   * 훅은 렌더에서 `readProjectFileVersions()` 를 읽고 effect 에서 구독하는데,
   * 그 사이에 조회가 끝나면 이 구독자만 갱신을 놓친다. 인덱싱 중인 문서가 없으면
   * 다음 `publish` 도 없어서 화면이 영영 로딩으로 남는다.
   * 값이 그대로면 참조가 같아 React 가 렌더를 건너뛴다.
   */
  listener(store.state);

  // 값이 없거나 낡았을 때만 새로 받는다 — 두 번째 구독자는 캐시를 그대로 쓴다
  if (
    store.state.versions === null ||
    Date.now() - store.fetchedAt > STALE_MS
  ) {
    void load(projectId);
  } else {
    schedule(store, projectId);
  }

  return () => {
    store.listeners.delete(listener);
    if (store.listeners.size > 0) return;

    clearTimeout(store.timer);
    store.timer = undefined;
  };
}
