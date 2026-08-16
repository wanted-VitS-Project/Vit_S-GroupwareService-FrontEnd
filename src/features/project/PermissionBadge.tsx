import { MEMBER_PERMISSION_LABELS } from './labels';
import type { ProjectPermission } from './types';

/**
 * **이 프로젝트에서 내 권한**을 알리는 배지.
 *
 * 예전에는 어디에도 적혀 있지 않아, 편집 버튼이 안 보이는 이유가
 * ① 권한이 없어서인지 ② 화면이 아직 안 그려졌는지 구별할 수 없었다 —
 * 사용자는 "고장났다" 로 읽고 새로고침을 반복하게 된다.
 *
 * ⚠️ **판정이 끝나기 전(`null`)에는 아무것도 그리지 않는다.** 기본값을 `열람` 으로 두면
 *    편집자에게 잠깐 `열람` 이 보였다 바뀌어, 권한이 낮아진 것으로 오해한다.
 *
 * 색은 뜻을 따른다 — `편집`(파랑)은 무언가 할 수 있다는 뜻이고,
 * `열람`(회색)은 상태를 알릴 뿐 경고가 아니다 (노랑·빨강을 쓰지 않는 이유).
 */
export default function PermissionBadge({
  permission,
  /** 배지 앞에 `내 권한` 을 함께 적을지 — 자리만 보고는 무엇의 권한인지 알기 어려운 곳에서 켠다 */
  withLabel = false,
  className = '',
}: {
  /** 아직 모르면 `null` — 그리지 않는다 */
  permission: ProjectPermission | null | undefined;
  withLabel?: boolean;
  className?: string;
}) {
  if (!permission) return null;

  const isEditor = permission === 'EDITOR';

  return (
    <span className={`flex shrink-0 items-center gap-1 ${className}`}>
      {withLabel && (
        <span className="text-caption text-text-secondary">내 권한</span>
      )}
      <span
        /*
          `title` 로 한 줄 설명을 붙인다 — `편집` · `열람` 두 글자만으로는
          무엇까지 되는지 알 수 없다. 보조기술에는 아래 `sr-only` 가 같은 말을 전한다.
        */
        title={
          isEditor
            ? '이 프로젝트의 설정 · 참여자 · 스테이지를 바꿀 수 있습니다'
            : '이 프로젝트를 볼 수만 있습니다. 편집하려면 참여자 관리 권한을 가진 사람에게 요청하세요'
        }
        className={`badge ${isEditor ? 'badge-blue' : 'badge-gray'}`}
      >
        {!withLabel && <span className="sr-only">내 권한 </span>}
        {MEMBER_PERMISSION_LABELS[permission]}
      </span>
    </span>
  );
}
