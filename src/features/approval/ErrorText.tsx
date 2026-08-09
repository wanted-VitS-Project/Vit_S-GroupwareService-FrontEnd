/**
 * 실패 안내 한 줄. 결재 화면 네 곳(블록 · 초안 폼 · 문서 · 결재선)이 같은 자리를 쓴다.
 *
 * 요소를 조건부로 넣지 않고 **항상 두고 내용만 바꾼다** —
 * 나중에 나타나는 `role="alert"` 는 스크린리더가 읽지 않는 브라우저가 있다.
 * 빈 문자열이면 `empty:hidden` 으로 자리를 접는다.
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
      className={`text-[10px] break-keep text-text-danger empty:hidden ${className}`}
    >
      {message}
    </p>
  );
}
