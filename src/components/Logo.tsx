import Image from 'next/image';

import logoMark from '@/assets/logo-S.svg';
import logoFullDark from '@/assets/logo-vitaS-dark.svg';
import logoFull from '@/assets/logo-vitaS.svg';

/**
 * 서비스 로고 (워드마크).
 *
 * `variant`
 * - `full` — `Vita` + `S` 전체 워드마크
 * - `mark` — 사이드바를 접었을 때 (58px) 들어가는 `S` 한 글자
 *
 * `tone` — **바탕색에 맞춘 글자색**
 * - `onDark` — 흰 글자 (사이드바 · 헤더)
 * - `onLight` — 어두운 글자 (로그인 화면처럼 밝은 면)
 *
 * ⚠️ 밝은 면에 흰 로고를 올리려고 **어두운 판을 깔지 않는다** — 로고를 감싼 상자가
 *    화면에서 홀로 튄다. 노란 포인트는 그대로 두고 글자색만 바꾼 자산을 쓴다.
 *
 * ⚠️ 로고는 **읽히는 이름이 아니라 장식**이다 (`alt=""`). 이름은 감싸는 링크의
 *    `aria-label` 이 말한다 — 안 그러면 "VitaS 홈으로 이동" 처럼 두 번 읽힌다.
 */
export default function Logo({
  variant = 'full',
  tone = 'onDark',
  onReady,
}: {
  variant?: 'full' | 'mark';
  tone?: 'onDark' | 'onLight';
  /**
   * 로고를 다 받았을 때(또는 못 받았을 때) 한 번 부른다.
   * 로그인 화면이 **로고가 자리를 잡은 뒤** 내용을 펴는 데 쓴다.
   * ⚠️ 실패해도 부른다 — 안 그러면 로고를 못 받은 순간 화면이 영영 비어 있는다.
   */
  onReady?: () => void;
}) {
  return (
    <Image
      // 첫 화면 위쪽에 늘 보이는 이미지라 지연 로드하면 로고 자리가 한 번 빈다
      priority
      onLoad={onReady}
      onError={onReady}
      /* `mark`(S 한 글자)는 접힌 사이드바 전용이라 어두운 바탕만 쓴다 */
      src={
        variant === 'mark'
          ? logoMark
          : tone === 'onLight'
            ? logoFullDark
            : logoFull
      }
      alt=""
      // 워드마크 높이(`--text-logo`, 22px)에 맞춘다 — 폭은 비율대로 따라온다
      className="h-5.5 w-auto"
    />
  );
}
