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
  variant = 'sub',
  tightBottom = false,
  children,
}: {
  title: string;
  description?: React.ReactNode;
  /**
   * `top` 은 사이드바 메뉴가 곧장 여는 **최상위 화면**(결재 관리 · 공고 조회 ·
   * 재무 관리 · 전사 관리 · 내 프로젝트)이다. 제목을 한 단계 크게 잡아
   * 하위 화면(사원 관리 · 입출금 내역 등)과 깊이가 눈으로 갈린다.
   */
  variant?: 'top' | 'sub';
  /**
   * 아래 여백을 **설명 간격까지만** 준다.
   *
   * 설명 대신 **설명 자리에 다른 글자가 오는 화면**에만 쓴다 (전사 관리의 `조직 · 인사`
   * 구역 이름). 기본 여백을 두면 그 글자가 제목에서 한참 떨어져 구역 이름이 아니라
   * 동떨어진 한 줄로 읽힌다.
   * ⚠️ 제목 바로 아래가 카드 · 표인 화면(마이페이지)에는 쓰지 않는다 — 붙어서 답답해진다.
   */
  tightBottom?: boolean;
  children?: React.ReactNode;
}) {
  const isTop = variant === 'top';

  return (
    <div
      className={`flex justify-between gap-4 ${
        // `mb-1` 은 설명이 놓이는 간격과 같은 값이다 (`tightBottom` 주석 참고)
        tightBottom && !description ? 'mb-1' : 'mb-6'
      } ${
        // 설명이 붙으면 제목 블록이 두 줄 이상이라, 액션 버튼은 첫 줄에 맞춘다
        description ? 'items-start' : 'items-center'
      }`}
    >
      <div className="min-w-0">
        <h2
          className={
            isTop
              ? 'text-logo leading-8 font-bold text-text-primary'
              : 'text-heading-m font-bold'
          }
        >
          {title}
        </h2>
        {description && (
          <p
            className={
              isTop
                ? 'mt-1 text-detail break-keep text-text-secondary'
                : 'mt-1.5 text-label break-keep text-text-secondary'
            }
          >
            {description}
          </p>
        )}
      </div>
      {children}
    </div>
  );
}
