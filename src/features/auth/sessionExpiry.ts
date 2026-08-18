/**
 * 세션 만료 타이머의 계산 · 표시 · 탭 간 공유. 화면(`SessionTimer`)은 이 값들만 쓴다.
 *
 * ⚠️ 파일명이 `sessionTimer` 가 **아닌** 이유 — 같은 폴더의 `SessionTimer.tsx` 와 대소문자만
 *    다른 이름이 되어, 대소문자를 구분하지 않는 파일 시스템(Windows · macOS 기본)에서
 *    모듈 해석이 두 파일을 헷갈린다 (`has no default export` 로 빌드가 깨졌다).
 *
 * 📌 **세지 않는 것이 아니라 물어보지 않는 것이 요점이다.**
 *    `GET /auth/session` 은 조회 겸 연장이라, 남은 시간을 주기적으로 물어보면
 *    그 물음 자체가 세션을 계속 살려 4시간 유휴 만료 정책이 무력화된다.
 *    그래서 서버에는 **딱 두 번** 묻고(진입 시드 · 연장 버튼), 그 사이는 여기서 로컬로 센다.
 */

/**
 * 눈금 두 개 — **알리는 시점**과 **재촉하는 시점**은 다르다.
 *
 * | 남은 시간   | 화면                                                      |
 * | ----------- | --------------------------------------------------------- |
 * | 30분 초과   | 만료 **시각**만 조용히 (`15:43 만료`)                     |
 * | 30분 이하   | **카운트다운 + `연장` 버튼** (`29:59` · `연장`)            |
 * | 5분 이하    | 위와 같되 **붉게** — 지금 안 누르면 끝난다는 신호         |
 */

/**
 * `연장` 버튼을 화면에 내미는 시점.
 *
 * 30분은 **하던 일을 마무리할 수 있는 시간**이다. 이보다 이르면 4시간짜리 세션에서
 * 버튼이 상시 노출이라 눈에 안 들어오고, 늦으면 회의 · 자리비움 한 번에 지나가 버린다.
 */
export const EXTEND_PROMPT_SECONDS = 30 * 60;

/**
 * 여기부터는 **붉게** 그린다. 표시는 30분 때와 같고 색만 올라간다 —
 * 새로 나타나는 것이 없어야 마지막 순간에 화면이 흔들리지 않는다.
 */
export const WARNING_SECONDS = 5 * 60;

/**
 * 남은 초 → `MM:SS` (`29:59` · `04:59` · `00:07`). 30분 아래에서만 쓰므로 시간 단위는 없다.
 *
 * ⚠️ 분도 **두 자리로 채운다.** 만료 시각(`15:43`)과 글자 수가 같아야 두 표기가 오갈 때
 *    칸 폭이 그대로다. `4:59` 로 두면 10분을 지나는 순간 옆의 `연장` 버튼이 한 칸 밀린다.
 */
export function formatCountdown(seconds: number) {
  const safe = Math.max(0, seconds);
  const minutes = Math.floor(safe / 60);

  return `${String(minutes).padStart(2, '0')}:${String(safe % 60).padStart(
    2,
    '0',
  )}`;
}

/**
 * 만료 시각(ms) → `15:43`.
 *
 * ⚠️ 서버가 준 `expiresAt` 문자열이 아니라 **로컬 만료 시각**을 그린다.
 *    서버 값은 시드 순간에만 맞고, 그 뒤 요청마다 뒤로 밀리는 연장을 반영하지 못해
 *    금방 낡는다. 로컬 값으로 그리면 화면의 시각과 카운트다운이 늘 같은 것을 가리킨다.
 *    (사용자 시계가 어긋나 있어도, 그 사람 손목시계와는 맞는 시각이 나온다.)
 */
export function formatExpiresAt(expiresAtMs: number) {
  const at = new Date(expiresAtMs);

  return `${String(at.getHours()).padStart(2, '0')}:${String(
    at.getMinutes(),
  ).padStart(2, '0')}`;
}

/** 남은 초 → `3시간 52분` · `52분` · `1분 미만`. 보조기술이 읽을 문구용 */
export function describeRemaining(seconds: number) {
  if (seconds < 60) return '1분 미만';

  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);

  if (hours === 0) return `${minutes}분`;

  return minutes === 0 ? `${hours}시간` : `${hours}시간 ${minutes}분`;
}

/* ─────────────────── 탭 간 공유 ─────────────────── */

/**
 * 다른 탭이 보낸 요청도 **같은 세션**을 늘린다. 그런데 이 탭의 로컬 타이머는 그것을 모른다 —
 * 옆 탭에서 한창 일하는 동안 이 탭만 0 으로 떨어져 "곧 만료" 라고 겁을 준다.
 * 요청을 쏜 탭이 그 사실을 알려 주면 모든 탭의 타이머가 같이 밀린다.
 *
 * ℹ️ `BroadcastChannel` 이 없는 환경에서는 조용히 꺼진다 — 탭마다 자기 요청만 세게 되고,
 *    그래도 **아래 안전장치** 덕분에 잘못 로그아웃되지는 않는다.
 * ⚠️ 그래서 카운트다운이 0 에 닿아도 **로그아웃시키지 않는다.** 이 탭이 못 본 연장이
 *    있을 수 있어서, 세션이 진짜 끝났는지는 다음 요청의 401 로만 확정한다
 *    (`UNAUTHORIZED_EVENT` → `CurrentUserProvider`).
 */
const TOUCH_CHANNEL = 'auth:session-touch';

/**
 * 알림을 **너무 자주 보내지 않기 위한 간격**. 화면 하나 여는 데 요청이 열 개씩 나가는데
 * 그때마다 방송하면 탭 수만큼 메시지가 곱해진다. 4시간짜리 타이머에서 5초 오차는 없는 것과 같다.
 */
const SHARE_INTERVAL_MS = 5_000;

function openChannel() {
  if (typeof window === 'undefined' || !('BroadcastChannel' in window)) {
    return null;
  }

  return new BroadcastChannel(TOUCH_CHANNEL);
}

/**
 * 내가 쏜 요청으로 세션이 늘었음을 다른 탭에 알린다.
 * 마지막으로 알린 시각을 넘겨받아 `SHARE_INTERVAL_MS` 안쪽이면 건너뛴다.
 *
 * @returns 실제로 보냈으면 지금 시각, 건너뛰었으면 받은 값 그대로
 */
export function shareSessionTouch(
  channel: BroadcastChannel | null,
  lastSharedAt: number,
) {
  const now = Date.now();

  if (!channel || now - lastSharedAt < SHARE_INTERVAL_MS) return lastSharedAt;

  channel.postMessage(now);
  return now;
}

/**
 * 다른 탭의 연장 신호를 구독한다. 정리 함수가 채널까지 닫으므로 이펙트에서 그대로 돌려주면 된다.
 *
 * ⚠️ 받은 쪽은 **되받아 보내지 않는다.** 서로 중계하면 두 탭이 무한히 메아리친다.
 */
export function subscribeSessionTouch(listener: () => void) {
  const channel = openChannel();

  if (channel) channel.onmessage = () => listener();

  return {
    channel,
    close: () => channel?.close(),
  };
}
