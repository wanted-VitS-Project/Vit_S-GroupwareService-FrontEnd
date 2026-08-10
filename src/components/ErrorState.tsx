import Link from 'next/link';

/**
 * 화면 전체를 채우는 오류 안내. (공용)
 *
 * 다이얼로그(`AlertDialog`)와 쓰임이 다르다 — 저쪽은 화면 위에 **덮어서** 확인을 받고,
 * 이쪽은 보여줄 콘텐츠가 없어 그 자리에 **대신 놓인다.**
 *
 * 버튼 개수로 둘로 나뉜다.
 * - `ErrorStateOneButton` — 할 수 있는 일이 하나뿐 (없는 페이지 → 홈으로)
 * - `ErrorStateTwoButton` — 다시 해볼 여지가 있다 (조회 실패 → 새로고침 · 홈으로)
 *
 * 색 · 버튼 · 글자 크기는 모두 `globals.css` 의 기존 토큰과 `.btn` 계열을 쓴다.
 */
interface ErrorStateProps {
  title: string;
  /** 줄바꿈을 그대로 살린다 — 시안처럼 두 줄로 끊어 쓸 수 있다 */
  description?: string;
}

/**
 * 버튼 하나짜리 오류 안내.
 *
 * 없는 페이지에 `새로고침` 을 두면 눌러도 같은 화면이 다시 나온다 —
 * 할 수 있는 일이 하나뿐일 때는 그 하나만 둔다.
 */
export function ErrorStateOneButton({
  title,
  description,
  actionLabel = '홈으로 이동',
  actionHref = '/',
}: ErrorStateProps & {
  actionLabel?: string;
  actionHref?: string;
}) {
  return (
    <Shell title={title} description={description}>
      <Link href={actionHref} className="btn btn-primary">
        {actionLabel}
      </Link>
    </Shell>
  );
}

/**
 * 버튼 두 개짜리 오류 안내.
 *
 * 왼쪽이 **다시 해보기**(보조), 오른쪽이 **빠져나가기**(주)다 —
 * 되돌릴 수 없는 동작이 아니라 둘 다 안전한 색을 쓴다.
 */
export function ErrorStateTwoButton({
  title,
  description,
  retryLabel = '새로고침',
  onRetry,
  actionLabel = '홈으로 이동',
  actionHref = '/',
}: ErrorStateProps & {
  retryLabel?: string;
  onRetry: () => void;
  actionLabel?: string;
  actionHref?: string;
}) {
  return (
    <Shell title={title} description={description}>
      <button type="button" onClick={onRetry} className="btn btn-gray">
        {retryLabel}
      </button>
      <Link href={actionHref} className="btn btn-primary">
        {actionLabel}
      </Link>
    </Shell>
  );
}

/** 아이콘 · 제목 · 설명은 둘이 같다 — 버튼만 갈아끼운다 */
function Shell({
  title,
  description,
  children,
}: ErrorStateProps & { children: React.ReactNode }) {
  return (
    /**
     * 부모 높이를 채우고 가운데 둔다.
     * `min-h-full` 은 셸 안(본문 영역)에서도, 셸 밖(`/forbidden`)에서도 통한다 —
     * 뒤쪽은 `html · body { height: 100% }` 덕에 부모가 곧 화면 높이다.
     */
    <div className="flex min-h-full flex-col items-center justify-center gap-6 p-8 text-center">
      <span className="flex size-24 items-center justify-center rounded-pill border border-blue-border-soft bg-blue-bg-soft text-blue-text">
        <WarningIcon />
      </span>

      {/* 한 줄이 길어지면 읽기 힘들다 — 글 폭을 묶어 두 줄로 접히게 한다 */}
      <div className="max-w-100">
        <h1 className="text-heading-xl font-semibold text-text-primary">
          {title}
        </h1>
        {/* 설명이 없으면 줄 자체가 사라진다 */}
        {description && (
          <p className="mt-2 text-body-l whitespace-pre-line text-text-secondary">
            {description}
          </p>
        )}
      </div>

      <div className="flex justify-center gap-2">{children}</div>
    </div>
  );
}

function WarningIcon() {
  return (
    <svg
      aria-hidden
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.6"
      strokeLinecap="round"
      strokeLinejoin="round"
      className="size-12"
    >
      <path d="M10.3 3.9 1.8 18a2 2 0 0 0 1.7 3h17a2 2 0 0 0 1.7-3L13.7 3.9a2 2 0 0 0-3.4 0" />
      <path d="M12 9v4" />
      <path d="M12 17h.01" />
    </svg>
  );
}
