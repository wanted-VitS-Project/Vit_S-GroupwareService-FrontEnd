import Link from 'next/link';

export default function NotFound() {
  return (
    <div>
      <h1>페이지를 찾을 수 없습니다</h1>
      <p>주소가 변경되었거나 삭제된 페이지입니다.</p>
      <Link href="/">홈으로 이동</Link>
    </div>
  );
}
