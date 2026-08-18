// 크기가 제각각인 모달 안에서 쓰는 로딩 표시.
// 스켈레톤은 실물과 자리가 같을 때만 값을 한다. 모달은 너비·높이·본문 구성이
// 저마다 달라 뼈대를 맞춰 두기 어렵고, 어긋난 뼈대는 청크가 도착할 때 오히려 화면을
// 튀게 만든다. 그래서 모달 로딩은 뼈대 대신 가운데 스피너 하나로 통일한다.
// (블록 곁패널의 연결된 이슈·활동 로그처럼 목록 모양이 고정된 곳은 예외 —
// 거기는 그대로 스켈레톤을 쓴다.)
export function Spinner({ className = 'size-6' }: { className?: string }) {
  return (
    <span
      aria-hidden
      className={`${className} animate-spin rounded-pill border-2 border-border-default border-t-text-primary-blue`}
    />
  );
}

/** 모달 본문 자리를 채우는 가운데 정렬 스피너. */
export default function LoadingSpinner({
  label,
  /** 차지할 자리. 본문이 넓은 모달은 py-16, 좁은 모달은 py-8 처럼 부르는 쪽이 정한다 */
  className = 'py-12',
  spinnerClassName,
}: {
  label: string;
  className?: string;
  spinnerClassName?: string;
}) {
  return (
    <div
      role="status"
      aria-label={label}
      aria-busy="true"
      className={`flex items-center justify-center ${className}`}
    >
      <Spinner className={spinnerClassName} />
    </div>
  );
}
