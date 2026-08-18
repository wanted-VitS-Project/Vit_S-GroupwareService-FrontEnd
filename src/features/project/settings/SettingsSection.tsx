// 설정 화면의 카드 한 칸 — 다섯 섹션이 같은 테두리·여백을 쓴다.
// 컨테이너(ProjectSettings)가 아니라 여기에 둔다 — 컨테이너가 각 섹션을
// 가져다 쓰는데 섹션이 다시 컨테이너에서 이걸 가져오면 순환 참조다 (labels.ts 주석 참고).
export default function SettingsSection({
  title,
  description,
  action,
  children,
}: {
  title: string;
  description?: string;
  /** 제목 줄 오른쪽에 붙는 버튼 (예: 참여자 추가) */
  action?: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <section className="rounded-base border border-border-default bg-bg-card">
      <div className="flex items-start justify-between gap-4 border-b border-border-default px-5 py-4">
        <div className="min-w-0">
          <h2 className="text-body-m font-semibold text-text-primary">
            {title}
          </h2>
          {description && (
            <p className="mt-1 text-caption break-keep text-text-secondary">
              {description}
            </p>
          )}
        </div>
        {action}
      </div>
      <div className="p-5">{children}</div>
    </section>
  );
}
