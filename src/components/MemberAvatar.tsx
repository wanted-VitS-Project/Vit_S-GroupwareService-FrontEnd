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
 */
export default function MemberAvatar({
  userId,
  name,
  size = 'sm',
  withRing = true,
}: {
  userId: string;
  name: string;
  /** `xs` 는 카드 · 칩처럼 좁은 자리, `sm` 은 모달 목록용 */
  size?: 'xs' | 'sm';
  /** 겹쳐 놓을 때 경계를 만드는 흰 테두리 */
  withRing?: boolean;
}) {
  return (
    <span
      title={name}
      style={{ backgroundColor: avatarColor(userId) }}
      className={`flex shrink-0 items-center justify-center rounded-full font-semibold text-white ${
        size === 'xs' ? 'size-5 text-[9px]' : 'size-6 text-[10px]'
      } ${withRing ? 'border border-white' : ''}`}
    >
      {name.slice(0, 1)}
    </span>
  );
}
