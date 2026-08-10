import { ErrorStateOneButton } from '@/components/ErrorState';

/**
 * 권한이 없어 막힌 화면. 403 을 받은 곳에서 이리로 보낸다.
 *
 * 다시 시도해도 결과가 같아 버튼은 홈으로 하나뿐이다 —
 * 권한은 사용자가 이 화면에서 바꿀 수 있는 것이 아니다.
 */
export default function Page() {
  return (
    <ErrorStateOneButton
      title="접근 권한이 없습니다."
      description={
        '이 페이지를 볼 수 있는 권한이 없습니다.\n담당자에게 문의해주세요.'
      }
    />
  );
}
