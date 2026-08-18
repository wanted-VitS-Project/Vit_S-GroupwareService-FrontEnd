'use client';

import { useState } from 'react';

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
 * 사진을 못 받은 사번과 그 시각. 같은 사람이 여러 번 나오는 목록에서 404 반복을 막는다.
 * `onError` 는 상태 코드를 주지 않아 영구 기억은 하지 않고 `RETRY_AFTER_MS` 뒤 재시도한다.
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
 * 프로필 사진을 바꾼 뒤 호출한다. 비워주지 않으면 다른 화면의 내 아바타가 이니셜로 남는다.
 */
export function forgetMissingAvatar(userId: string) {
  missingAvatars.delete(userId);
}

/**
 * 원형 아바타. 사진이 있으면 사진을, 없거나 실패하면 이니셜을 그린다.
 * `userId` 는 접두어까지 포함한 사번이고, 이름이 옆에 있으면 `decorative` 로 숨긴다.
 */
export default function MemberAvatar({
  userId,
  name,
  size = 'sm',
  withRing = true,
  withBorder = true,
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
  /** 겹쳐 놓는 아바타를 갈라 주는 흰 테두리 */
  withRing?: boolean;
  /** 사진 자리를 알려 주는 옅은 테두리. 어두운 바탕에서는 링처럼 도드라져 끈다 */
  withBorder?: boolean;
  /** 이름 글자가 바로 옆에 있는 자리 — 장식으로 숨긴다 */
  decorative?: boolean;
  /** 퇴사자 — 블록 담당자는 `owner.deleted` 로 판단한다 */
  resigned?: boolean;
  /**
   * 사진을 부르지 않고 이니셜 + 단색만 그린다. 아바타가 수십 개 서는 목록 카드 전용이다.
   */
  initialsOnly?: boolean;
  /**
   * 사진 경로를 직접 넘길 때 쓴다. `null` 은 사진이 없음을 이미 안다는 뜻이다.
   */
  imageUrl?: string | null;
  /**
   * 첫 프레임에 바로 그릴 작은 사본. 셸(사이드바 · 헤더) 아바타에만 쓴다.
   */
  thumbnail?: string | null;
}) {
  /** 실패한 주소를 기억한다. `true` 로만 두면 새로 올린 사진도 이니셜로 남는다 */
  const [failedSource, setFailedSource] = useState<string | null>(null);
  const label = personLabel(name, resigned);
  const { box, text } = SIZES[size];

  // `initialsOnly` 는 사진을 아예 쓰지 않는 자리(겹친 담당자 스택 등)에서 켠다
  const source = initialsOnly ? null : sourceOf(userId, imageUrl);
  const showsPhoto = Boolean(source) && source !== failedSource;

  /**
   * 사진을 받을 참이면 테두리만 남긴다 — 사진이 온 뒤에도 그대로라 바뀌는 것이 없다.
   */
  const ring = withRing
    ? 'border border-white'
    : showsPhoto && withBorder
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
       * 사진을 받을 참이면 색 원도 이니셜도 그리지 않는다 — 도착 순간 번갈아 뜬 것처럼 보인다.
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
          /* 주소가 바뀌면 새 `<img>` 로 갈아끼운다 — 재사용하면 직전 사진이 남는다 */
          key={source}
          src={source ?? undefined}
          // 바깥 `span` 이 이미 이름을 읽히므로 사진은 장식이다
          alt=""
          /* 셸 아바타는 가장 먼저 보이는 사진이라 늦게 받으면 티가 크게 난다 */
          loading={IMMEDIATE_SIZES.has(size) ? 'eager' : 'lazy'}
          fetchPriority={IMMEDIATE_SIZES.has(size) ? 'high' : 'auto'}
          decoding="async"
          onError={() => {
            // 사진 없음이거나 일시 장애 — 잠시 쉬었다 다시 시도한다 (위 주석 참고)
            missingAvatars.set(userId, Date.now());
            setFailedSource(source);
          }}
          /* 투명도로 감췄다 보여주지 않는다 — 캐시된 사진이 늦게 뜬 것처럼 보인다 */
          className="absolute inset-0 size-full object-cover"
        />
      )}
    </span>
  );
}

/** 사진을 미루지 않고 곧바로 받는 자리 — 헤더 · 사이드바 · 마이페이지 */
const IMMEDIATE_SIZES = new Set<keyof typeof SIZES>(['md', 'lg', 'xl']);

/**
 * 그릴 사진 주소. 없으면 `null` 이고, 상대 경로라 API 오리진을 씌워야 404 가 안 난다.
 */
/**
 * 그릴 사진 주소. 저장소 CORS 가 막혀 백엔드 경로 대신 우리 오리진 창구로 부른다.
 * `imageUrl` 로 받은 값도 사번만 뽑아 같은 창구로 보낸다.
 */
function sourceOf(userId: string, imageUrl?: string | null) {
  // `null` 은 사진이 없다는 것을 이미 안다는 뜻이다
  if (imageUrl === null) return null;
  if (imageUrl === undefined && isKnownMissing(userId)) return null;

  const idInUrl = imageUrl?.match(/employees\/([^/]+)\/profile-image/)?.[1];
  const target = idInUrl ?? userId;
  // 사진을 바꾼 직후에는 화면이 `?t=` 를 붙여 캐시를 비킨다 — 그 값을 그대로 잇는다
  const bust = imageUrl?.includes('?')
    ? imageUrl.slice(imageUrl.indexOf('?'))
    : '';

  return `/api/avatar/${encodeURIComponent(target)}${bust}`;
}
