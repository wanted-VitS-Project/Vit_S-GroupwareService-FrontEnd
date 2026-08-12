/**
 * 사람 이름 **바로 뒤**에 붙는 `(퇴사자)` 문구. (.ai/API.md 퇴사자 표기 컨벤션)
 *
 * 테두리 있는 배지가 아니라 **회색 괄호 문구**다. 담당자 줄에는 아바타 · 이름 ·
 * 이슈 수가 이미 붙어 있어, 칩을 하나 더 얹으면 상태가 이름보다 강하게 읽힌다.
 * 이름과 붙여 읽히도록 **간격은 `gap-0.5`** 로 좁힌다 (호출부에서 감싼다).
 *
 * 근거 필드는 화면마다 다르지만 **문구는 하나로 통일한다** — 사용자에게는
 * "지금 이 사람은 재직 중이 아니다" 가 전부이고, 사원 데이터가 남았는지 지워졌는지는
 * 백엔드 사정이다.
 *
 * | 화면                    | 근거 필드                    |
 * | ----------------------- | ---------------------------- |
 * | 이슈 담당자 · 활동 수행자 | `resignedAt: string \| null` |
 * | 블록 담당자             | `owner.deleted` (D-6)        |
 * | 참여자 목록 기반 후보    | `member.resigned`            |
 *
 * ⚠️ 블록 일괄 조회에는 `resignedAt` 이 없다 — 블록 담당자는 `deleted` 로만 판단한다.
 *    퇴사 여부를 알아내려고 참여자 목록을 따로 부르지 않는다 (2026-08-12 결정).
 * ⚠️ **이름은 그대로 두고 항목도 화면에서 지우지 않는다.** 문구만 붙인다.
 *    (담당자 *선택 후보*에서만 뺀다)
 */
const LABEL = '퇴사자';

/**
 * 이름과 상태를 한 문자열로 — `김용준 (퇴사자)`.
 * 아바타만 놓인 자리(겹친 담당자 스택)에서 `title` · `aria-label` 로 넘긴다.
 */
export function personLabel(name: string, resigned: boolean) {
  return resigned ? `${name} (${LABEL})` : name;
}

export default function PersonNote() {
  return (
    <span className="shrink-0 text-caption text-text-secondary">({LABEL})</span>
  );
}
