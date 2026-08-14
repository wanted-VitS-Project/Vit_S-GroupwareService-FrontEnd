import { notFound } from 'next/navigation';

import TaxInvoiceDetail from '@/features/finance/TaxInvoiceDetail';

export default async function Page({
  params,
}: {
  params: Promise<{ taxId: string }>;
}) {
  const { taxId } = await params;
  const parsed = Number(taxId);

  // 숫자가 아닌 주소로 들어오면 조회할 것이 없다
  if (!Number.isInteger(parsed) || parsed < 1) notFound();

  return <TaxInvoiceDetail taxId={parsed} />;
}
