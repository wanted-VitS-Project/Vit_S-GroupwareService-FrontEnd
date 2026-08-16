/**
 * 프로젝트 목록 **한 줄의 격자**와 그 라벨 줄.
 *
 * 카드(`features/project/ProjectCard`) · 스켈레톤(`ProjectListSkeleton`) ·
 * 대시보드 목록이 모두 이 하나를 쓴다. 어느 한쪽에 두면 나머지가 feature 구현을
 * 거슬러 올라가 참조하게 되므로 **공용 자리에 둔다.**
 *
 * 여기에는 데이터도 비즈니스 규칙도 없다 — 칸 너비와 칸 이름뿐이다.
 */

/**
 * 카드 머리글 한 줄의 **격자**. 머리글 라벨 · 카드 · 스켈레톤이 이 하나를 함께 쓴다.
 *
 * ⚠️ `flex` 로 두면 칸마다 내용 길이가 폭을 정해 **카드마다 열이 어긋난다.**
 *    특히 참여자 아바타는 인원수(0~5명)에 따라 폭이 통째로 달라져, 그 뒤의 진척률이
 *    카드마다 좌우로 밀렸다. 격자로 고정하면 내용과 무관하게 열이 한 줄로 선다.
 *
 * 참여자 칸 `6rem` 은 계산값이다 — 아바타 `size-6`(24px) 다섯 개가 `-space-x-1.5`(-6px)
 * 로 겹치면 `24×5 − 6×4 = 96px`. 카드 쪽 `AVATAR_LIMIT` 을 바꾸면 이 값도 함께 고쳐야 한다.
 *
 * 과업명 · 발주처만 `fr` 로 둔다 — 좁은 화면에서 함께 줄어들어야 가로 스크롤이 안 생긴다.
 * 카드마다 컨테이너 폭이 같으므로 `fr` 도 **모든 카드에서 같은 값으로 풀린다** (열은 그대로 맞는다).
 * 나머지가 고정인 이유는 내용 길이가 제각각이기 때문이다 —
 * 상태(`진행 전`/`완료`) · 분류 이름 · 참여자 수 · 진척률 자릿수.
 */
export const PROJECT_ROW_GRID =
  'grid grid-cols-[4rem_8rem_minmax(0,2fr)_minmax(0,1fr)_10rem_6rem_8rem] items-center gap-4';

/** 카드 오른쪽 펼침 버튼 자리 — 머리글 · 스켈레톤이 같은 폭으로 비워 둔다 */
export const PROJECT_ROW_TOGGLE_SLOT = 'size-9 shrink-0';

/**
 * 목록 머리글. 어느 칸이 무엇인지 알려준다 — 값만 늘어서 있으면
 * `2026.01.02 ~ 2026.03.31` 이 기간인지 계약기간인지 알 수 없다.
 *
 * ⚠️ **스크롤을 따라오지 않는다.** 예전에는 `sticky top-0` 으로 붙들었는데,
 *    목록을 굴릴 때마다 머리글 띠가 화면 위에 계속 남아 프로젝트 헤더 · 다른 구역
 *    위를 덮으며 따라다녔다. 목록과 함께 올라가게 두는 편이 덜 거슬린다 —
 *    대시보드 · `/projects` 둘 다 같게 둔다.
 */
export default function ProjectListHeader() {
  return (
    <div
      aria-hidden
      className="flex items-center gap-2 rounded-base border border-border-default bg-bg-surface pr-3"
    >
      <div
        className={`${PROJECT_ROW_GRID} min-w-0 flex-1 px-5 py-2 text-caption font-semibold text-text-secondary`}
      >
        <span className="text-center">상태</span>
        <span>분류</span>
        <span>과업명</span>
        <span>발주처</span>
        <span>기간</span>
        <span>참여자</span>
        <span>진척률</span>
      </div>
      <span className={PROJECT_ROW_TOGGLE_SLOT} />
    </div>
  );
}
