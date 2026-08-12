/** 담당자 아바타 색. 사번 기준으로 고정 배정해 화면이 달라도 같은 색이 나온다 */
const AVATAR_COLORS = [
  '#FE9A00',
  '#2B7FFF',
  '#FF2056',
  '#8E51FF',
  '#00BC7D',
  '#0092B8',
];

function avatarColor(userId: string) {
  const sum = [...userId].reduce(
    (total, char) => total + char.charCodeAt(0),
    0,
  );
  return AVATAR_COLORS[sum % AVATAR_COLORS.length];
}

/**
 * 이름 첫 글자를 딴 원형 아바타.
 * 블록 담당자 · 이슈 담당자 · 참여자 목록이 같은 모양 · 같은 색을 쓰도록 여기 모았다.
 *
 * 기본은 **이미지로 읽힌다** (`role="img"` + 이름). 아바타만 놓인 자리에서
 * 스크린리더가 이니셜 한 글자만 읽지 않게 하기 위함이다.
 * 옆에 이름 글자가 이미 있는 자리에서는 `decorative` 로 숨겨 같은 이름이 두 번 읽히지 않게 한다.
 *
 * `resigned` 는 퇴사 표시다. **아바타만 놓인 자리**(겹친 담당자 스택)에서는
 * 문구를 놓을 자리가 없어 흐리게 + `이름 (퇴사자)` tooltip 으로만 알린다 —
 * 이름 글자가 함께 있는 자리는 `PersonNote` 를 쓴다.
 */
import { personLabel } from './PersonNote';

export default function MemberAvatar({
  userId,
  name,
  size = 'sm',
  withRing = true,
  decorative = false,
  resigned = false,
}: {
  userId: string;
  name: string;
  /** `xs` 는 카드 · 칩처럼 좁은 자리, `sm` 은 모달 목록용 */
  size?: 'xs' | 'sm';
  /** 겹쳐 놓을 때 경계를 만드는 흰 테두리 */
  withRing?: boolean;
  /** 이름 글자가 바로 옆에 있는 자리 — 장식으로 숨긴다 */
  decorative?: boolean;
  /** 퇴사자 — 블록 담당자는 `owner.deleted` 로 판단한다 */
  resigned?: boolean;
}) {
  const label = personLabel(name, resigned);

  return (
    <span
      {...(decorative
        ? { 'aria-hidden': true }
        : { role: 'img', 'aria-label': label, title: label })}
      style={{ backgroundColor: avatarColor(userId) }}
      className={`flex shrink-0 items-center justify-center rounded-pill font-semibold text-text-white ${
        size === 'xs' ? 'size-5 text-micro' : 'size-6 text-caption'
      } ${withRing ? 'border border-white' : ''} ${resigned ? 'opacity-50' : ''}`}
    >
      {name.slice(0, 1)}
    </span>
  );
}
