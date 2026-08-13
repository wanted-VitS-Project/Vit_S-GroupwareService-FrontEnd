import Link from 'next/link';

/**
 * 상단 경로 표시. **마지막 항목은 지금 화면**이라 링크가 없다.
 *
 * 화면 아래 `목록으로` 버튼을 대신한다 — 되돌아가는 길은 늘 같은 자리(왼쪽 위)에 있어야
 * 찾기 쉽고, 단계가 있는 화면에서는 아래 버튼이 `이전`(단계 이동)과 헷갈린다.
 */
export default function Breadcrumb({
  items,
}: {
  items: { label: string; href?: string }[];
}) {
  return (
    <nav aria-label="현재 위치">
      <ol className="flex flex-wrap items-center gap-1.5 text-caption text-text-secondary">
        {items.map((item, index) => (
          <li key={item.label} className="flex items-center gap-1.5">
            {item.href ? (
              <Link href={item.href} className="hover:underline">
                {item.label}
              </Link>
            ) : (
              <span className="text-text-primary">{item.label}</span>
            )}

            {index < items.length - 1 && (
              <span aria-hidden className="text-text-muted">
                ›
              </span>
            )}
          </li>
        ))}
      </ol>
    </nav>
  );
}
