'use client';

import { useCallback, useEffect, useRef, useState } from 'react';

import { Spinner } from '@/components/Spinner';
import { notifyToast } from '@/components/Toast';
import { ApiError, messageOf, SESSION_TOUCH_EVENT } from '@/lib/api';

import { getSession } from './api';
import {
  describeRemaining,
  EXTEND_PROMPT_SECONDS,
  formatCountdown,
  formatExpiresAt,
  shareSessionTouch,
  subscribeSessionTouch,
  WARNING_SECONDS,
} from './sessionExpiry';

/**
 * 헤더의 세션 만료 표시 · 연장 버튼. (.ai/API.md 159)
 *
 * 평소에는 **만료 시각만 조용히** 적어 둔다 (`15:43 만료`). 남은 시간이 **30분 아래**로
 * 떨어지면 `MM:SS` 카운트다운으로 바뀌면서 그 옆에 **`연장` 버튼이 함께** 나타나고, **5분 아래**부터는
 * 같은 모습을 붉게만 올린다 — 마지막 순간에 새로 나타나는 것이 없어야 화면이 흔들리지 않는다.
 *
 * ⚠️ 30분 전까지는 **버튼이 아니라 표시**다. 누를 것이 늘 떠 있으면 정작 눌러야 할 때
 *    눈에 들어오지 않고, 4시간이 남은 시점의 연장은 어차피 아무것도 바꾸지 않는다
 *    (그 사이 어떤 요청이든 한 번 나가면 세션은 알아서 밀린다).
 *
 * ### 서버에 묻는 횟수는 두 번뿐이다
 * `GET /auth/session` 은 **조회 겸 연장**이라, 남은 시간을 주기적으로 물어보면 그 물음이
 * 세션을 영원히 살려 놓는다. 그래서 화면에 들어올 때 한 번(시드) · 연장 버튼을 누를 때 한 번만
 * 부르고, 그 사이는 로컬에서 센다. 내가 쏜 다른 요청들은 `SESSION_TOUCH_EVENT` 로 들어와
 * 타이머만 밀어 준다 (`src/lib/api.ts`).
 *
 * ### 0 이 돼도 로그아웃시키지 않는다
 * 다른 탭이 조용히 연장해 두었을 수 있다. 세션이 정말 끝났는지는 **다음 요청의 401** 로만
 * 확정된다 (`UNAUTHORIZED_EVENT` → `CurrentUserProvider`). 여기서 앞질러 내보내면
 * 멀쩡히 살아 있는 세션에서 사용자를 쫓아내게 된다.
 */
export default function SessionTimer({
  /** 프로젝트 화면의 어두운 헤더 위에 놓일 때 (색만 달라진다) */
  isDark = false,
}: {
  isDark?: boolean;
}) {
  /** 정책값(초). 서버에서 받기 전에는 0 — 받기 전 신호는 무시한다 */
  const timeoutSeconds = useRef(0);
  /** 로컬 만료 시각(ms). **서버 시각이 아니라 이 값**으로 화면을 그린다 */
  const expiresAt = useRef(0);
  /** 다른 탭에 마지막으로 연장을 알린 시각 — 너무 잦은 방송을 막는다 */
  const lastSharedAt = useRef(0);

  /**
   * 화면에 적는 숫자. 문자열 하나로 두는 것이 요점이다 —
   * 남은 초를 그대로 상태에 넣으면 4시간 내내 1초마다 다시 그리는데, 경고 구간 밖에서는
   * 그려지는 글자(`15:43`)가 바뀌지 않는다. 같은 문자열을 다시 넣으면 React 가 렌더를 건너뛴다.
   */
  const [label, setLabel] = useState('');
  /** 남은 시간이 30분 아래 — 카운트다운 + `연장` 버튼 */
  const [isNearExpiry, setIsNearExpiry] = useState(false);
  /** 남은 시간이 5분 아래 — 같은 모습을 붉게 */
  const [isWarning, setIsWarning] = useState(false);
  const [isExtending, setIsExtending] = useState(false);
  /**
   * 만료 시각(`15:43`). 경고 구간에서는 `label` 자리를 카운트다운에 내주므로,
   * 마우스를 올렸을 때 읽히는 문구용으로 따로 들고 있는다.
   *
   * ⚠️ 이것도 상태다 — 그릴 때 `expiresAt.current` 를 읽으면 렌더가 ref 에 기대게 된다.
   *    ref 는 바뀌어도 다시 그리지 않으니 화면과 어긋날 수 있다 (`react-hooks/refs`).
   */
  const [clockText, setClockText] = useState('');
  /** 보조기술 · 마우스 올림에 쓰는 문구. 분 단위라 이것도 자주 바뀌지 않는다 */
  const [remainingText, setRemainingText] = useState('');

  /** 로컬 만료 시각으로 화면 글자를 다시 만든다. 서버를 부르지 않는다 */
  const refresh = useCallback(() => {
    if (expiresAt.current === 0) return;

    const left = Math.max(
      0,
      Math.round((expiresAt.current - Date.now()) / 1000),
    );
    const near = left <= EXTEND_PROMPT_SECONDS;
    const clock = formatExpiresAt(expiresAt.current);

    setIsNearExpiry(near);
    setIsWarning(left <= WARNING_SECONDS);
    setClockText(clock);
    setLabel(near ? formatCountdown(left) : clock);
    setRemainingText(describeRemaining(left));
  }, []);

  /** 서버 응답으로 타이머를 새로 맞춘다 (진입 시드 · 연장 버튼) */
  const seed = useCallback(
    (policySeconds: number, remainingSeconds: number) => {
      timeoutSeconds.current = policySeconds;
      expiresAt.current = Date.now() + remainingSeconds * 1000;
      refresh();
    },
    [refresh],
  );

  /** 진입 시드 — 화면당 한 번. 실패하면 위젯을 그리지 않는다 */
  useEffect(() => {
    const controller = new AbortController();
    let isStale = false;

    getSession(controller.signal)
      .then((info) => {
        if (!isStale) seed(info.timeoutSeconds, info.remainingSeconds);
      })
      .catch(() => {
        /*
         * 401 은 공통 인터셉터가 로그인 화면으로 보낸다. 그 밖의 실패(네트워크 등)는
         * 조용히 접는다 — 만료 시각은 **부가 정보**라, 못 받았다고 화면에 오류를
         * 띄우면 본래 하려던 일보다 커진다.
         */
      });

    return () => {
      isStale = true;
      controller.abort();
    };
  }, [seed]);

  /** 1초마다 로컬 계산만 한다 (서버 호출 없음) */
  useEffect(() => {
    const timer = window.setInterval(refresh, 1_000);

    return () => window.clearInterval(timer);
  }, [refresh]);

  /** 내 요청 · 다른 탭의 요청 — 둘 다 세션을 늘렸으니 타이머를 되감는다 */
  useEffect(() => {
    function push() {
      // 정책값을 아직 못 받았으면 얼마나 밀어야 할지 모른다
      if (timeoutSeconds.current === 0) return;

      expiresAt.current = Date.now() + timeoutSeconds.current * 1000;
      refresh();
    }

    // 받은 신호는 되받아 보내지 않는다 — 서로 중계하면 탭끼리 무한히 메아리친다
    const { channel, close } = subscribeSessionTouch(push);

    function handleLocalTouch() {
      push();
      lastSharedAt.current = shareSessionTouch(channel, lastSharedAt.current);
    }

    window.addEventListener(SESSION_TOUCH_EVENT, handleLocalTouch);
    return () => {
      window.removeEventListener(SESSION_TOUCH_EVENT, handleLocalTouch);
      close();
    };
  }, [refresh]);

  async function handleExtend() {
    if (isExtending) return;

    setIsExtending(true);

    try {
      const info = await getSession();

      seed(info.timeoutSeconds, info.remainingSeconds);
      notifyToast('세션을 연장합니다.');
    } catch (caught) {
      // 401 이면 이미 끊긴 세션이다 — 공통 인터셉터가 로그인 화면으로 보내므로 여기선 조용히 둔다
      if (!(caught instanceof ApiError && caught.status === 401)) {
        notifyToast(messageOf(caught, '세션을 연장하지 못했습니다.'), 'error');
      }
    } finally {
      setIsExtending(false);
    }
  }

  // 시드 전에는 자리를 잡지 않는다 — 빈 칸이 잠깐 생겼다 채워지면 헤더가 한 번 흔들린다
  if (label === '') return null;

  return (
    // 표시와 버튼은 **한 덩어리로 읽혀야 한다** — 헤더 기본 간격(`gap-3`)으로 벌어지면
    // 옆의 알림 종과 같은 거리가 돼 어느 쪽에 딸린 버튼인지 알 수 없다
    <div className="flex shrink-0 items-center gap-1.5">
      {/*
        ⚠️ 버튼이 아니라 **표시**다. 30분 전까지는 누를 것이 없다 (위 컴포넌트 주석 참고).
           글자를 읽는 사람에겐 아래 `sr-only` 한 문장이, 마우스에겐 `title` 이 전체를 말해 준다.
      */}
      <span
        title={`${remainingText} 남음 (${clockText} 만료)`}
        className={`flex items-center gap-1.5 rounded-pill border px-2 py-1 md:px-2.5 ${toneClass(
          isNearExpiry,
          isWarning,
          isDark,
        )}`}
      >
        <ClockIcon isWarning={isWarning} />

        {/* 숫자가 1초마다 바뀌어도 폭이 흔들리지 않게 고정폭 숫자를 쓴다 */}
        <span aria-hidden className="text-caption font-semibold tabular-nums">
          {label}
        </span>

        {/*
          평소에만 붙는 꼬리말 — `15:43` 만 있으면 지금 시각인지 만료 시각인지 알 수 없다.
          카운트다운으로 바뀌면 뗀다: `29:59` 는 그 자체로 남은 시간으로 읽히고,
          바로 옆에 `연장` 버튼이 서서 무슨 일이 벌어지는지 이미 말하고 있다.
          (글자 수가 늘면 375px 에서 프로필 이름을 밀어낸다 — 뗄 수 있을 때 뗀다.)
        */}
        {!isNearExpiry && (
          <span aria-hidden className="text-caption whitespace-nowrap">
            만료
          </span>
        )}

        {/* 눈에 보이는 조각들은 위에서 숨기고, 읽히는 것은 이 한 문장으로 모은다 */}
        <span className="sr-only">
          {`세션 만료 ${clockText}, ${remainingText} 남음`}
        </span>
      </span>

      {/*
        30분부터 나타나는 연장 버튼. 색은 왼쪽 표시와 한 쌍으로 움직인다(`extendButtonClass`).
        높이 28px(`btn-sm`)은 왼쪽 표시와 **같은 값**이라 두 조각의 위아래 선이 맞는다.
      */}
      {isNearExpiry && (
        <button
          type="button"
          onClick={handleExtend}
          disabled={isExtending}
          className={`btn btn-sm shrink-0 ${extendButtonClass(
            isWarning,
            isDark,
          )}`}
        >
          {isExtending && <Spinner className="size-3.5" />}
          연장
        </button>
      )}

      {/*
        경고 구간에서만 소리로 알린다. 1초마다 읽어 주면 시끄러워 **분 단위**로만 바뀐다 —
        같은 문장이 다시 그려지는 것은 읽히지 않는다.
      */}
      {isWarning && (
        <span role="status" className="sr-only">
          {`세션이 곧 만료됩니다. ${remainingText} 남음`}
        </span>
      )}
    </div>
  );
}

/**
 * 표시 알약의 색. 평소에는 헤더의 다른 글자와 같은 무게로 가라앉아 있다가 30분 · 5분에서
 * 한 단계씩 올라온다.
 *
 * ⚠️ **밝은 헤더와 어두운 헤더(프로젝트 상세)는 방향이 반대다.**
 *    밝은 쪽은 옅은 배경 + 진한 글자(`tag-yellow` 와 같은 공용 조합)로 색을 *얹는다*.
 *    같은 조합을 어두운 헤더에 그대로 쓰면 거의 흰 알약(`#fffbeb`)이 검은 바탕 위에 떠서,
 *    경고보다 먼저 **밝기**가 눈에 들어온다. 어두운 쪽은 **테두리 색을 글자로 쓰고 배경은
 *    그 색을 옅게 깐다** — 헤더의 어둠을 유지한 채 색만 올라온다.
 *
 * ℹ️ `hover:` 가 없다 — 누를 수 없는 표시라, 손을 올려 반응하면 버튼처럼 보인다.
 */
function toneClass(isNearExpiry: boolean, isWarning: boolean, isDark: boolean) {
  if (isWarning) {
    return isDark
      ? 'border-red-border bg-red-border/15 text-red-border'
      : 'border-red-border bg-red-bg-soft text-red-text';
  }

  // 30분 구간 — 아직 붉히지 않는다. 노란 띠와 옆에 선 버튼만으로 충분히 눈에 들어온다
  if (isNearExpiry) {
    return isDark
      ? 'border-yellow-border bg-yellow-border/15 text-yellow-border'
      : 'border-yellow-border bg-yellow-bg-soft text-yellow-text';
  }

  // 평소 — 헤더 배경에 그대로 얹힌다
  return isDark
    ? 'border-bg-sidebar-hover text-text-muted'
    : 'border-border-default text-text-secondary';
}

/**
 * `연장` 버튼의 색. **왼쪽 표시와 한 쌍으로 움직인다** — 버튼만 파랑(`btn-primary-outlined`)
 * 으로 두면 노란 띠 · 붉은 띠 옆에서 제3의 색이 끼어들어 두 조각이 따로 논다.
 * 그래서 30분은 노랑 계열, 5분은 붉은 계열로 **띠 색을 따라간다.**
 *
 * 표시와 다른 점은 **채도**뿐이다 — 표시는 옅게 깔고 버튼은 채워, 같은 색 안에서
 * "읽는 것" 과 "누르는 것" 이 갈린다.
 */
function extendButtonClass(isWarning: boolean, isDark: boolean) {
  // 어두운 헤더(프로젝트 상세) — 표시와 같은 방식으로 테두리 색을 글자로 쓴다
  if (isDark) {
    return isWarning
      ? 'border-red-border bg-red-border/15 text-red-border hover:bg-red-border/25'
      : 'border-yellow-border bg-yellow-border/15 text-yellow-border hover:bg-yellow-border/25';
  }

  // 5분 — 공용 위험 버튼이 이미 띠와 같은 붉은색이다
  if (isWarning) return 'btn-danger';

  /*
   * 30분 — 채운 노랑. 배경에 `yellow-border`(#ffb900)를 쓰는 것은 이름과 어긋나 보이지만,
   * 팔레트에서 **글자를 얹을 수 있을 만큼 진한 유일한 노랑**이다.
   * `yellow-text`(#e17100)는 `yellow-bg` 위에서 대비가 2.9 라 14px 버튼 글자로 못 쓴다
   * (여기 조합은 9.6). hover 는 색을 하나 더 만들지 않고 밝기만 한 단계 내린다.
   */
  return 'border-yellow-border bg-yellow-border text-text-primary hover:brightness-95';
}

/** 장식이라 보조기술에는 읽히지 않는다 — 뜻은 버튼의 `aria-label` 이 든다 */
function ClockIcon({ isWarning }: { isWarning: boolean }) {
  return (
    <svg
      aria-hidden
      viewBox="0 0 16 16"
      fill="none"
      stroke="currentColor"
      strokeWidth={isWarning ? 2 : 1.5}
      strokeLinecap="round"
      strokeLinejoin="round"
      className="size-3.5 shrink-0"
    >
      <circle cx="8" cy="8" r="6" />
      <path d="M8 4.5V8l2.5 1.5" />
    </svg>
  );
}
