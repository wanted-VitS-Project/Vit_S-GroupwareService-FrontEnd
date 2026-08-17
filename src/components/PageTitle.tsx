/**
 * 본문 최상단 제목 + 설명 + 우측 액션 영역.
 *
 * 설명(`description`)까지 이 컴포넌트가 들고 있어야 한다 — 밖에서 붙이면
 * 제목과의 간격 · 글자 크기가 화면마다 갈린다(실제로 `mt-1`/`mt-2`,
 * `text-label`/`text-caption` 로 나뉘어 있었다).
 *
 * ⚠️ 브레드크럼 아래 간격은 `Breadcrumb` 이 자기 `mb-2` 로 갖는다 —
 *    여기서 `mt-*` 를 주면 브레드크럼이 없는 화면만 위가 뜬다.
 */
export default function PageTitle({
  title,
  description,
  children,
}: {
  title: string;
  description?: React.ReactNode;
  children?: React.ReactNode;
}) {
  return (
    <div
      className={`mb-6 flex justify-between gap-4 ${
        // 설명이 붙으면 제목 블록이 두 줄 이상이라, 액션 버튼은 첫 줄에 맞춘다
        description ? 'items-start' : 'items-center'
      }`}
    >
      <div className="min-w-0">
        <h2 className="text-heading-m font-bold">{title}</h2>
        {description && (
          <p className="mt-1.5 text-label break-keep text-text-secondary">
            {description}
          </p>
        )}
      </div>
      {children}
    </div>
  );
}
