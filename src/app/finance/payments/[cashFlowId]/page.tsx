import { notFound } from 'next/navigation';

import CashFlowDetail from '@/features/finance/CashFlowDetail';

export default async function Page({
  params,
}: {
  params: Promise<{ cashFlowId: string }>;
}) {
  const { cashFlowId } = await params;
  const parsed = Number(cashFlowId);

  // 숫자가 아닌 주소로 들어오면 조회할 것이 없다
  if (!Number.isInteger(parsed) || parsed < 1) notFound();

  return <CashFlowDetail cashFlowId={parsed} />;
}
