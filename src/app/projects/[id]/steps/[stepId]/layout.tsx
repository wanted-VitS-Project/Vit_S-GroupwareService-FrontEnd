import StepTabs from '@/components/StepTabs';

/**
 * 스텝 상세 중첩 레이아웃.
 * 탭바는 화면 폭에 꽉 채워 붙이고, 여백은 아래 본문 영역에만 준다.
 *
 * `scrollbar-gutter: stable` — 본문이 길어져 스크롤바가 생기는 순간 폭이 줄면
 * 내용이 왼쪽으로 밀린다. 활동 기록처럼 **스크롤하며 목록이 늘어나는** 화면에서는
 * 그 흔들림이 계속 반복된다. 자리를 미리 비워 두면 스크롤바를 감추지 않고도 폭이 고정된다.
 */
export default function StepLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="flex h-full flex-col">
      <StepTabs />
      <div className="min-h-0 flex-1 [scrollbar-gutter:stable] overflow-y-auto p-6">
        {children}
      </div>
    </div>
  );
}
