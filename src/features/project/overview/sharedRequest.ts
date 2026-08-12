/**
 * 같은 키의 조회를 **합치고 잠깐 캐시한다.**
 *
 * 프로젝트 전체 화면의 네 탭은 같은 부가 정보를 본다 —
 * `전체 일정` 과 `문서함` 이 둘 다 스테이지 · 스텝 목록을 읽고, 탭을 오갈 때마다
 * 컴포넌트가 새로 마운트돼 같은 요청이 다시 나갔다. 이미지 블록 이름은 더 비싸다(N+1).
 *
 * `projectFileVersionsStore` 같은 구독 스토어를 또 만들지는 않았다 — 여기 필요한 것은
 * 폴링 · 구독이 아니라 **중복 제거와 짧은 캐시**뿐이다.
 *
 * ⚠️ `AbortSignal` 을 받지 않는다. 요청을 여럿이 나눠 쓰므로 한 화면이 떠났다고 끊으면
 *    아직 기다리는 다른 화면까지 함께 실패한다. 대신 부르는 쪽이 **결과를 버린다**
 *    (`isStale` 플래그 · 응답에 `projectId` 를 함께 담는 기존 방식).
 * ⚠️ 실패는 캐시하지 않는다 — 한 번 끊겼다고 TTL 동안 재시도가 막히면 안 된다.
 */

interface Entry<T> {
  /** 응답이 도착한 시각. 도는 중이면 0 */
  at: number;
  promise: Promise<T>;
}

const entries = new Map<string, Entry<unknown>>();

export function sharedRequest<T>(
  key: string,
  ttlMs: number,
  load: () => Promise<T>,
): Promise<T> {
  const found = entries.get(key) as Entry<T> | undefined;

  // 도는 중(at === 0)이면 그 요청을 같이 기다린다
  if (found && (found.at === 0 || Date.now() - found.at < ttlMs)) {
    return found.promise;
  }

  const entry: Entry<T> = {
    at: 0,
    promise: load()
      .then((value) => {
        entry.at = Date.now();
        return value;
      })
      .catch((caught) => {
        // 실패한 약속을 남겨 두면 TTL 동안 같은 실패가 반복 반환된다
        if (entries.get(key) === (entry as Entry<unknown>)) entries.delete(key);
        throw caught;
      }),
  };

  entries.set(key, entry as Entry<unknown>);
  return entry.promise;
}

/**
 * 캐시를 버린다. 값이 바뀔 만한 일을 한 뒤에 부른다
 * (예: 스텝 · 블록을 고친 뒤 프로젝트 화면으로 돌아올 때).
 */
export function dropSharedRequests(keyPrefix: string) {
  for (const key of entries.keys()) {
    if (key.startsWith(keyPrefix)) entries.delete(key);
  }
}
