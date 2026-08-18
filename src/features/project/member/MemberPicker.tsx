'use client';

import { useEffect, useRef } from 'react';

import MemberAvatar from '@/components/MemberAvatar';
import PersonNote from '@/components/PersonNote';

// 고르는 대상 한 명. 참여자 목록·사원 검색 결과 양쪽을 다 받는다 —
// 두 응답이 필드가 조금씩 달라, 이 화면이 쓰는 것만 추려 최소 모양으로 둔다.
export interface PickablePerson {
  /** 사번 — 이 값이 열쇠다 (memberId 가 아니다) */
  userId: string;
  name: string;
  department?: string | null;
  position?: string | null;
  /** 재직 중이 아니면 (퇴사자) 문구를 붙인다 */
  resigned?: boolean;
}

interface MemberPickerProps {
  label: string;
  /** 고른 사람. 한 명만 고르는 화면도 배열로 넘긴다 */
  selected: PickablePerson[];
  /** 고를 수 있는 사람 — 이미 고른 사람은 부르는 쪽이 빼서 넘긴다 */
  candidates: PickablePerson[];
  /** 후보 버튼을 그리지 않는 화면(showCandidates: false)에서는 넘기지 않는다 */
  onSelect?: (person: PickablePerson) => void;
  onRelease: (userId: string) => void;
  isBusy?: boolean;
  /** 후보를 아직 못 받았을 때 */
  isLoading?: boolean;
  hasFailed?: boolean;
  // 후보 버튼 줄을 그릴지. 기본 true.
  // 검색 콤보박스(EmployeeSearchInput)로 고르는 화면은 후보가 그쪽 목록에 뜨므로 끈다 —
  // 켜 두면 같은 후보가 두 군데에 나온다.
  showCandidates?: boolean;
  /** 아무도 안 골랐을 때 칩 자리에 뜨는 문구 */
  placeholder?: string;
  /** 후보가 0명일 때 */
  emptyHint?: string;
  /** 칩·후보 아래 덧붙일 안내 */
  hint?: React.ReactNode;
}

// 인원 선택 — 칩 + 후보 버튼. (BlockEditModal·IssueFormModal 과 같은 모양)
// 셀렉트 박스가 아니라 이 모양을 쓰는 이유는 세 화면이 이미 그렇기 때문이다 —
// 같은 "사람 고르기" 가 화면마다 다르게 생기면 조작을 매번 새로 배워야 한다.
// 블록·이슈에 흩어져 있던 것을 여기 한 벌로 모아 프로젝트 설정에서도 그대로 쓴다.
// 퇴사자·삭제된 사원을 후보에서 뺄지는 부르는 쪽이 정한다 — 화면마다 규칙이 다르다
// (담당자 지정은 빼고, 스텝 권한 지정은 이미 참여 중인 퇴사자에게도 걸 수 있다).
export default function MemberPicker({
  label,
  selected,
  candidates,
  onSelect,
  onRelease,
  isBusy = false,
  isLoading = false,
  hasFailed = false,
  showCandidates = true,
  placeholder = '아래에서 선택하세요',
  emptyHint = '고를 수 있는 사람이 없습니다.',
  hint,
}: MemberPickerProps) {
  /*
   * 고르거나 해제하면 방금 누른 버튼이 사라진다.
   * 그대로 두면 초점이 문서로 떨어져 키보드 사용자가 모달을 처음부터 훑어야 한다.
   * (BlockEditModal 과 같은 처리다)
   */
  const focusAfterRender = useRef<'chip' | 'candidate' | null>(null);
  const chipButtons = useRef(new Map<string, HTMLButtonElement>());
  const candidateButtons = useRef(new Map<string, HTMLButtonElement>());
  const candidateBoxRef = useRef<HTMLDivElement>(null);
  /** 방금 누른 사람 — 사라진 버튼의 짝으로 초점을 넘길 때 쓴다 */
  const movedUserId = useRef<string | null>(null);

  useEffect(() => {
    const target = focusAfterRender.current;
    if (!target) return;
    focusAfterRender.current = null;

    const userId = movedUserId.current;
    movedUserId.current = null;

    const next =
      target === 'chip'
        ? userId && chipButtons.current.get(userId)
        : userId && candidateButtons.current.get(userId);

    if (next) next.focus();
    else candidateBoxRef.current?.focus();
  });

  return (
    <div>
      <span className="block pb-1.5 text-detail font-semibold text-text-primary">
        {label}
      </span>

      <div className="flex min-h-10 flex-wrap items-center gap-1.5 rounded-lg border border-border-default bg-bg-surface p-2.5">
        {selected.length === 0 ? (
          <span className="text-caption text-text-secondary">
            {isLoading ? '불러오는 중…' : placeholder}
          </span>
        ) : (
          selected.map((person) => (
            <span
              key={person.userId}
              className="flex items-center gap-1 rounded-pill border border-border-default bg-bg-card px-2 py-0.5"
            >
              <MemberAvatar
                userId={person.userId}
                name={person.name}
                size="xs"
                decorative
                resigned={person.resigned}
              />
              <span className="flex items-center gap-0.5">
                <span className="text-caption font-medium whitespace-nowrap text-text-primary">
                  {person.name}
                </span>
                {person.resigned && <PersonNote />}
              </span>
              <button
                type="button"
                ref={(node) => {
                  if (node) chipButtons.current.set(person.userId, node);
                  else chipButtons.current.delete(person.userId);
                }}
                aria-label={`${person.name} 해제`}
                disabled={isBusy}
                onClick={() => {
                  // 해제하면 이 버튼이 사라진다 — 다시 나타날 후보 버튼으로 초점을 넘긴다
                  movedUserId.current = person.userId;
                  focusAfterRender.current = 'candidate';
                  onRelease(person.userId);
                }}
                className="cursor-pointer text-caption text-text-secondary hover:text-text-primary disabled:cursor-not-allowed disabled:opacity-40"
              >
                ✕
              </button>
            </span>
          ))
        )}
      </div>

      {/* 누른 버튼이 사라졌을 때 초점을 받아줄 자리 */}
      {showCandidates && (
        <div
          ref={candidateBoxRef}
          tabIndex={-1}
          className="mt-1.5 flex flex-wrap gap-1.5 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-border-primary"
        >
          {hasFailed ? (
            <span className="text-caption text-text-secondary">
              목록을 불러오지 못했습니다.
            </span>
          ) : isLoading ? (
            <span className="text-caption text-text-secondary">
              불러오는 중…
            </span>
          ) : candidates.length === 0 ? (
            <span className="text-caption break-keep text-text-secondary">
              {emptyHint}
            </span>
          ) : (
            candidates.map((person) => (
              <button
                key={person.userId}
                type="button"
                ref={(node) => {
                  if (node) candidateButtons.current.set(person.userId, node);
                  else candidateButtons.current.delete(person.userId);
                }}
                disabled={isBusy}
                onClick={() => {
                  // 고르면 이 버튼이 사라진다 — 새로 생기는 해제 버튼으로 초점을 넘긴다
                  movedUserId.current = person.userId;
                  focusAfterRender.current = 'chip';
                  onSelect?.(person);
                }}
                title={[person.name, person.department, person.position]
                  .filter(Boolean)
                  .join(' · ')}
                className="flex cursor-pointer items-center gap-1 rounded-button-md px-1.5 py-0.5 text-caption text-text-secondary hover:bg-bg-hover hover:text-text-primary disabled:cursor-not-allowed disabled:opacity-40"
              >
                <MemberAvatar
                  userId={person.userId}
                  name={person.name}
                  size="xs"
                  decorative
                  resigned={person.resigned}
                />
                <span className="flex items-center gap-0.5">
                  {person.name}
                  {person.resigned && <PersonNote />}
                </span>
              </button>
            ))
          )}
        </div>
      )}

      {hint && (
        <p className="mt-1.5 text-caption break-keep text-text-secondary">
          {hint}
        </p>
      )}
    </div>
  );
}
