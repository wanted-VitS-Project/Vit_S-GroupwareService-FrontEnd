/** 본문 최상단 제목 + 우측 액션 영역. */
export default function PageTitle({
  title,
  children,
}: {
  title: string;
  children?: React.ReactNode;
}) {
  return (
    <div className="mb-6 flex items-center justify-between">
      <h2 className="text-lg font-bold">{title}</h2>
      {children}
    </div>
  );
}
