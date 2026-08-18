/**
 * 실패 안내 한 줄. 결재 화면 여러 곳이 같은 자리를 쓴다.
 * 조건부로 넣지 않고 항상 두고 내용만 바꿔야 스크린리더가 읽는다.
 */
export default function ErrorText({
  message,
  className = '',
}: {
  message: string;
  className?: string;
}) {
  return (
    <p
      role="alert"
      className={`text-caption break-keep text-text-danger empty:hidden ${className}`}
    >
      {message}
    </p>
  );
}
