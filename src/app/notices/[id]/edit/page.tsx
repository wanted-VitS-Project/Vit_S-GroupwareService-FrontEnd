import { notFound } from 'next/navigation';

import NoticeForm from '@/features/bidding/NoticeForm';

export default async function Page({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const parsed = Number(id);

  // 숫자가 아닌 세그먼트로 API 를 부르면 400 이 된다 — 그 전에 404 로 끊는다
  if (!Number.isInteger(parsed) || parsed <= 0) notFound();

  return <NoticeForm noticeId={parsed} />;
}
