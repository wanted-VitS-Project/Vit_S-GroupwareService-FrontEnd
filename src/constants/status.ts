/**
 * 상태 → 배지 라벨·색 매핑.
 * 배지 색을 컴포넌트에서 직접 지정하지 않는다.
 *
 * 작성 예시
 *   export const STATUS = {
 *     IN_PROGRESS: { label: '진행 중', variant: 'default' },
 *     REJECTED:    { label: '반려',   variant: 'destructive' },
 *   };
 *
 * ⚠️ 키는 백엔드 enum 값과 같아야 한다. API 명세 확정 후 작성할 것.
 */

export const STATUS = {};
