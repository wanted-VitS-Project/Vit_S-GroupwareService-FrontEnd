/**
 * 비밀번호 정책. 백엔드도 같은 기준으로 검사한다 (.ai/API.md).
 * 화면에 체크 목록으로 노출하므로 label 과 test 를 함께 둔다.
 */
export const PASSWORD_RULES = [
  { label: '8자 이상', test: (value: string) => value.length >= 8 },
  {
    label: '영문 · 숫자 포함',
    test: (value: string) => /[A-Za-z]/.test(value) && /\d/.test(value),
  },
  {
    label: '특수문자 포함',
    test: (value: string) => /[^A-Za-z0-9]/.test(value),
  },
] as const;

export function isValidPassword(value: string) {
  return PASSWORD_RULES.every((rule) => rule.test(value));
}
