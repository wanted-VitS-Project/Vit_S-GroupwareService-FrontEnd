import StepTabs from '@/components/StepTabs';

/**
 * 스텝 상세 중첩 레이아웃.
 * 탭바는 화면 폭에 꽉 채워 붙이고, 여백은 아래 본문 영역에만 준다.
 */
export default function StepLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="flex h-full flex-col">
      <StepTabs />
      <div className="min-h-0 flex-1 overflow-y-auto p-6">{children}</div>
    </div>
  );
}
