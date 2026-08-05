import PageTitle from '@/components/PageTitle';
import ChangePasswordButton from '@/features/auth/ChangePasswordButton';

// TODO: 내 정보(GET /api/v1/auth/me) 표시 — 별도 이슈
export default function MyPage() {
  return (
    <PageTitle title="마이페이지">
      <ChangePasswordButton />
    </PageTitle>
  );
}
