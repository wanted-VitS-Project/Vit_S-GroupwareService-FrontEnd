import EmployeeEditForm from '@/features/employee/EmployeeEditForm';

/** 라우트 세그먼트는 `[id]` 지만 실제 값은 사번(`userId`)이다 */
export default async function Page({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  return <EmployeeEditForm userId={id} />;
}
