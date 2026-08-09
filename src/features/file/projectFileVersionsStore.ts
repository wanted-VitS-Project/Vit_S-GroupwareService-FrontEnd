import { messageOf } from '@/lib/api';

import { getProjectFileVersions } from './api';
import {
  hasIndexingDocument,
  INDEX_POLL_INTERVAL_MS,
  INDEX_POLL_MAX_MS,
  type ProjectFileVersion,
} from './types';

/**
 * 프로젝트 파일 버전 목록의 **프로젝트당 하나뿐인** 조회·폴링.
 *
 * 이 목록을 보는 곳이 여럿이다 — 문서 업로드 블록(AI 준비 배지)과 비타메이트
 * 실행 모달(분석 대상 선택). 컴포넌트마다 각자 받으면 같은 프로젝트 전체 목록을
 * 스텝에 있는 문서 블록 수만큼 중복해서 받고, 인덱싱 중에는 폴링까지 그만큼 겹친다.
 *
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
  /** 폴링 상한(`INDEX_POLL_MAX_MS`) 기준점 */
  watchStartedAt: number;
  /** 마지막으로 응답을 받은 시각 — 다시 볼지 판단한다 */
  fetchedAt: number;
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

/** 더 볼 것이 남았는지 — 읽는 중인 문서가 있고 상한을 안 넘겼을 때만 */
function shouldKeepWatching(store: Store) {
  if (store.listeners.size === 0) return false;
  if (store.state.versions === null) return false;
  if (!hasIndexingDocument(store.state.versions)) return false;

  return Date.now() - store.watchStartedAt <= INDEX_POLL_MAX_MS;
}

function schedule(store: Store, projectId: string) {
  clearTimeout(store.timer);
  store.timer = undefined;

  if (!shouldKeepWatching(store) || isHidden()) return;

  store.timer = setTimeout(() => {
    void load(projectId);
  }, INDEX_POLL_INTERVAL_MS);
}

function load(projectId: string) {
  const store = storeOf(projectId);
  // 이미 도는 중이면 그 요청을 같이 기다린다
  if (store.inFlight) return store.inFlight;

  store.inFlight = getProjectFileVersions(projectId)
    .then((versions) => {
      store.fetchedAt = Date.now();
      publish(store, { versions, loadError: '' });
    })
    .catch((caught) => {
      /*
       * 한 번 실패했다고 접지 않는다 — 일시적인 끊김이면 다음 회차에 붙는다.
       * 이미 받아 둔 목록이 있으면 그대로 두고 안내만 얹는다.
       */
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

  if (isFirst) store.watchStartedAt = Date.now();

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
