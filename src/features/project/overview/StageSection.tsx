/**
 * 스테이지 묶음 머리.
 *
 * 스텝 아코디언을 한 겹 더 접지 않는다 — 스테이지까지 접히면 문서 하나를 보는 데
 * 클릭이 세 번(스테이지 → 스텝 → 항목)이 된다. 여기서는 **경계만** 긋는다.
 *
 * 스테이지를 못 읽었을 때(`name` 이 빈 문자열)는 머리 없이 내용만 그린다 —
 * 이름 없는 회색 줄이 하나 뜨면 뭔가 잘못된 것으로 보인다.
 */
export default function StageSection({
  name,
  count,
  countLabel,
  children,
}: {
  name: string;
  count: number;
  /** '건' · '개' 처럼 세는 단위 */
  countLabel: string;
  children: React.ReactNode;
}) {
  if (!name) return <>{children}</>;

  return (
    <section className="flex flex-col gap-2">
      <div className="flex items-center gap-2 px-1">
        <h3 className="text-label font-semibold tracking-[0.9px] text-text-secondary uppercase">
          {name}
        </h3>
        <span className="text-caption text-text-secondary">
          {count}
          {countLabel}
        </span>
        {/* 묶음 경계를 이름 오른쪽으로 이어 긋는다 — 상자를 하나 더 두지 않고 구역만 나눈다 */}
        <span aria-hidden className="h-px flex-1 bg-border-default" />
      </div>
      <div className="flex flex-col gap-2">{children}</div>
    </section>
  );
}
