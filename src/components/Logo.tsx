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
}: {
  variant?: 'full' | 'mark';
}) {
  return (
    <Image
      // 첫 화면 위쪽에 늘 보이는 이미지라 지연 로드하면 로고 자리가 한 번 빈다
      priority
      src={variant === 'mark' ? logoMark : logoFull}
      alt=""
      // 워드마크 높이(`--text-logo`, 22px)에 맞춘다 — 폭은 비율대로 따라온다
      className="h-5.5 w-auto"
    />
  );
}
