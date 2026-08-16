import Image from 'next/image';

import logoMark from '@/assets/logo-S.svg';
import logoFull from '@/assets/logo-vitaS.svg';

/**
 * 서비스 로고 (워드마크).
 *
 * 어두운 바탕 전용이다 — 글자가 흰색이라 밝은 면 위에 올리면 사라진다.
 * 쓰는 곳은 두 군데뿐이다: 공통 `Sidebar` 로고 줄, 프로젝트 화면의 `Header` 로고 칸.
 *
 * `variant`
 * - `full` — `Vita` + `S` 전체 워드마크
 * - `mark` — 사이드바를 접었을 때 (58px) 들어가는 `S` 한 글자
 *
 * ⚠️ 로고는 **읽히는 이름이 아니라 장식**이다 (`alt=""`). 이름은 감싸는 링크의
 *    `aria-label` 이 말한다 — 안 그러면 "VitaS 홈으로 이동" 처럼 두 번 읽힌다.
 */
export default function Logo({
  variant = 'full',
  onReady,
}: {
  variant?: 'full' | 'mark';
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
      src={variant === 'mark' ? logoMark : logoFull}
      alt=""
      // 워드마크 높이(`--text-logo`, 22px)에 맞춘다 — 폭은 비율대로 따라온다
      className="h-5.5 w-auto"
    />
  );
}
