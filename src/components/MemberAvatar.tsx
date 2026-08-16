'use client';

import { useState } from 'react';

import { ENDPOINTS } from '@/constants/endpoints';
import { apiUrl } from '@/lib/api';

import { personLabel } from './PersonNote';

/** 담당자 아바타 색. 사번 기준으로 고정 배정해 화면이 달라도 같은 색이 나온다 */
const AVATAR_COLORS = [
  '#FE9A00',
  '#2B7FFF',
  '#FF2056',
  '#8E51FF',
  '#00BC7D',
  '#0092B8',
];

function avatarColor(userId: string) {
  const sum = [...userId].reduce(
    (total, char) => total + char.charCodeAt(0),
    0,
  );
  return AVATAR_COLORS[sum % AVATAR_COLORS.length];
}

/**
 * 쓰이는 자리가 정해져 있어 표로 고정한다 — 중간값이 필요하면 여기에 한 줄 추가한다.
 * 이니셜 글자 크기는 원 지름을 따라간다.
 */
const SIZES = {
  /** 카드 · 칩 */
  xs: { box: 'size-5', text: 'text-micro' },
  /** 모달 · 목록 */
  sm: { box: 'size-6', text: 'text-caption' },
  /** 헤더 프로필 */
  md: { box: 'size-9', text: 'text-body-m' },
  /** 사이드바 프로필 */
  lg: { box: 'size-10', text: 'text-body-m' },
  /** 마이페이지 미리보기 */
  xl: { box: 'size-20', text: 'text-heading-l' },
} as const;

/**
 * 사진을 못 받은 사번과 그 시각. 서빙 API 는 사진이 없으면 404 를 주는데, 목록에는
 * 같은 사람이 수십 번 나오므로 그대로 두면 **한 화면에서 같은 404 를 반복해서 부른다**.
 *
 * ⚠️ `<img>` 의 `onError` 는 **상태 코드를 주지 않는다** — 사진 없음(404)인지
 *    네트워크 순단 · 5xx 인지 구분할 수가 없다. 그래서 영구히 기억하지 않고
 *    `RETRY_AFTER_MS` 가 지나면 다시 시도한다. 순단은 알아서 풀리고, 사진이 없는
 *    사번은 그 간격으로만 404 를 낸다.
 *    상태 코드를 알자고 따로 요청을 보내면 아바타마다 왕복이 하나 더 늘어
 *    이 캐시가 막으려던 문제로 되돌아간다.
 *
 * ⚠️ 목록 응답에 `profileImageUrl` 이 생기면 이 캐시째 걷어낸다 (STATE 백로그).
 */
const missingAvatars = new Map<string, number>();

const RETRY_AFTER_MS = 5 * 60 * 1000;

function isKnownMissing(userId: string) {
  const failedAt = missingAvatars.get(userId);

  if (failedAt === undefined) return false;

  if (Date.now() - failedAt < RETRY_AFTER_MS) return true;

  missingAvatars.delete(userId);
  return false;
}

/**
 * 프로필 사진을 바꾼 뒤 호출 — 다음 렌더에서 서빙을 다시 시도한다.
 * 마이페이지 아바타는 `imageUrl` 로 직접 받지만, **다른 화면의 내 아바타**는
 * 사번으로 부르므로 이걸 비워주지 않으면 재시도 간격만큼 이니셜로 남는다.
 */
export function forgetMissingAvatar(userId: string) {
  missingAvatars.delete(userId);
}

/**
 * 이름 첫 글자를 딴 원형 아바타.
 * 블록 담당자 · 이슈 담당자 · 참여자 목록이 같은 모양 · 같은 색을 쓰도록 여기 모았다.
 *
 * 프로필 사진이 있으면 사진을, 없거나 실패하면 **이니셜**을 그린다. 서빙 경로가
 * 사번으로 정해지므로(`/employees/{userId}/profile-image`) 목록 응답에 사진 URL 이
 * 없어도 아바타가 뜬다 — 호출 측은 사번만 넘기면 된다.
 *
 * ⚠️ `userId` 는 **접두어까지 포함한 사번 그대로**여야 한다 (`vitas-EMP001`).
 *
 * 기본은 **이미지로 읽힌다** (`role="img"` + 이름). 아바타만 놓인 자리에서
 * 스크린리더가 이니셜 한 글자만 읽지 않게 하기 위함이다.
 * 옆에 이름 글자가 이미 있는 자리에서는 `decorative` 로 숨겨 같은 이름이 두 번 읽히지 않게 한다.
 *
 * `resigned` 는 퇴사 표시다. **아바타만 놓인 자리**(겹친 담당자 스택)에서는
 * 문구를 놓을 자리가 없어 흐리게 + `이름 (퇴사자)` tooltip 으로만 알린다 —
 * 이름 글자가 함께 있는 자리는 `PersonNote` 를 쓴다.
 */
export default function MemberAvatar({
  userId,
  name,
  size = 'sm',
  withRing = true,
  decorative = false,
  resigned = false,
  initialsOnly = false,
  imageUrl,
  thumbnail,
}: {
  userId: string;
  name: string;
  /** `SIZES` 참고 */
  size?: keyof typeof SIZES;
  /** 겹쳐 놓을 때 경계를 만드는 흰 테두리 */
  withRing?: boolean;
  /** 이름 글자가 바로 옆에 있는 자리 — 장식으로 숨긴다 */
  decorative?: boolean;
  /** 퇴사자 — 블록 담당자는 `owner.deleted` 로 판단한다 */
  resigned?: boolean;
  /**
   * 사진을 아예 부르지 않고 **이니셜 + 단색**만 그린다 (2026-08-16, 프로젝트 카드 전용).
   *
   * 목록 카드는 한 화면에 아바타가 수십 개 서고 크기도 24px 이라 사진이 거의 읽히지 않는데,
   * 사번마다 서빙 요청이 한 번씩 나간다. 여기서는 색으로만 구별하는 편이 낫다.
   * ⚠️ **다른 화면은 그대로 사진을 쓴다** — 이 값을 기본값으로 바꾸지 말 것.
   */
  initialsOnly?: boolean;
  /**
   * 사진 경로를 직접 넘길 때만 쓴다 (`/auth/me` 의 `profileImageUrl`).
   * 본인 아바타는 사진을 바꾼 직후 갱신돼야 해서 사번이 아니라 이 값을 받는다.
   * `null` 은 **사진이 없는 것을 이미 안다**는 뜻이라 서빙을 시도하지 않는다.
   */
  imageUrl?: string | null;
  /**
   * 첫 프레임에 바로 그릴 아주 작은 사본 (data URL).
   * 원본이 도착하기 전까지 이 그림이 자리를 지키고, 도착하면 그 위를 덮는다.
   * 셸(사이드바 · 헤더) 아바타에만 쓴다 — 목록 아바타까지 담기엔 쿠키가 작다.
   */
  thumbnail?: string | null;
}) {
  /**
   * 실패한 주소를 기억한다 (`boolean` 이 아니다) — 사진을 지웠다 다시 올리면
   * 주소가 바뀌는데, `true` 로만 두면 새 사진도 계속 이니셜로 남는다.
   */
  const [failedSource, setFailedSource] = useState<string | null>(null);
  const label = personLabel(name, resigned);
  const { box, text } = SIZES[size];

  // `initialsOnly` 는 사진을 아예 쓰지 않는 자리(겹친 담당자 스택 등)에서 켠다
  const source = initialsOnly ? null : sourceOf(userId, imageUrl);
  const showsPhoto = Boolean(source) && source !== failedSource;

  /**
   * 사진을 받을 참이면 **테두리만** 남긴다.
   *
   * 색 원이나 이니셜을 먼저 그리면 사진이 도착하는 순간 둘이 번갈아 뜬 것처럼 보이고,
   * 아예 비워 두면 그 자리가 뚫린 것처럼 보인다. 테두리는 **사진이 온 뒤에도 그대로**라
   * 바뀌는 것이 없으면서 자리를 알려준다.
   */
  const ring = withRing
    ? 'border border-white'
    : showsPhoto
      ? 'border border-border-default'
      : '';

  const shape = `shrink-0 rounded-pill ${box} ${ring} ${
    resigned ? 'opacity-50' : ''
  }`;

  return (
    <span
      {...(decorative
        ? { 'aria-hidden': true }
        : { role: 'img', 'aria-label': label, title: label })}
      /**
       * ⚠️ 사진을 받을 참이면 **색 원도 이니셜도 그리지 않는다.**
       *
       * 무엇이든 먼저 그려 두면 사진이 도착하는 순간 그것과 얼굴이 번갈아 뜬 것처럼 보인다.
       * 자리만 비워 두면 사진이 그냥 나타날 뿐이라 바뀌는 것이 없다.
       * 사진이 없거나(404) 실패하면 그때 색 원과 글자가 나온다.
       */
      style={showsPhoto ? undefined : { backgroundColor: avatarColor(userId) }}
      className={`relative flex items-center justify-center overflow-hidden font-semibold text-text-white ${shape} ${text}`}
    >
      {!showsPhoto && name.slice(0, 1)}

      {/* 원본이 오기 전까지 자리를 지키는 사본 — 같은 그림이라 덮여도 바뀐 티가 없다 */}
      {showsPhoto && thumbnail && (
        // eslint-disable-next-line @next/next/no-img-element -- data URL 이라 로더가 필요 없다
        <img
          src={thumbnail}
          alt=""
          className="absolute inset-0 size-full object-cover"
        />
      )}

      {showsPhoto && (
        // eslint-disable-next-line @next/next/no-img-element -- 서빙이 302 라 next/image 로더가 따라가지 못한다
        <img
          /**
           * ⚠️ 주소가 바뀌면 **새 `<img>` 로 갈아끼운다** (`key`) — 같은 요소를 재사용하면
           *    새 사진을 받는 동안 **직전 사진이 그대로 남아** 바뀐 줄 모른다.
           */
          key={source}
          src={source ?? undefined}
          // 바깥 `span` 이 이미 이름을 읽히므로 사진은 장식이다
          alt=""
          /**
           * 헤더 · 사이드바 · 마이페이지 아바타는 **화면에서 가장 먼저 보이는 사진**이라
           * 늦게 받으면 티가 크게 난다. 목록 안 작은 아바타는 수십 개라 그렇게 다루지 않는다.
           */
          loading={IMMEDIATE_SIZES.has(size) ? 'eager' : 'lazy'}
          fetchPriority={IMMEDIATE_SIZES.has(size) ? 'high' : 'auto'}
          decoding="async"
          onError={() => {
            // 사진 없음이거나 일시 장애 — 잠시 쉬었다 다시 시도한다 (위 주석 참고)
            missingAvatars.set(userId, Date.now());
            setFailedSource(source);
          }}
          /**
           * ⚠️ 투명도로 감췄다 보여주지 않는다 — 캐시된 사진은 이미 받아져 있어서
           *    한 박자 늦게 나타나는 것처럼(딸깍) 보인다. 그릴 수 있을 때 그냥 그린다.
           */
          className="absolute inset-0 size-full object-cover"
        />
      )}
    </span>
  );
}

/** 사진을 미루지 않고 곧바로 받는 자리 — 헤더 · 사이드바 · 마이페이지 */
const IMMEDIATE_SIZES = new Set<keyof typeof SIZES>(['md', 'lg', 'xl']);

/**
 * 그릴 사진 주소. 없으면 `null` (이니셜로 떨어진다).
 *
 * `imageUrl` 을 명시적으로 넘겼으면 그 값이 곧 정답이고, 안 넘겼으면 사번으로
 * 서빙 경로를 만든다. 둘 다 **상대 경로**라 API 오리진을 씌워야 한다 —
 * 안 씌우면 프론트 오리진으로 나가 404 가 된다.
 */
function sourceOf(userId: string, imageUrl?: string | null) {
  const path =
    imageUrl !== undefined
      ? imageUrl
      : isKnownMissing(userId)
        ? null
        : ENDPOINTS.employees.profileImage(userId);

  return path ? apiUrl(path) : null;
}
