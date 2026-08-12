import { ErrorStateOneButton } from '@/components/ErrorState';

/** 없는 주소로 들어왔을 때. 다시 시도할 여지가 없어 버튼은 홈으로 하나뿐이다 */
export default function NotFound() {
  return (
    <ErrorStateOneButton
      title="페이지를 찾을 수 없습니다."
      description={'요청하신 페이지가 존재하지 않거나\n이동되었을 수 있습니다.'}
    />
  );
}
