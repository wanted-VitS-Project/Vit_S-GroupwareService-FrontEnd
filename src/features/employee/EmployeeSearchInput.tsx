'use client';

import { useEffect, useId, useState } from 'react';

import { isAbortError, messageOf } from '@/lib/api';

import { searchEmployees } from './api';
import type { EmployeeSearchResult } from './types';

/** 타이핑마다 부르지 않기 위한 대기 시간 */
const DEBOUNCE_MS = 250;

interface EmployeeSearchInputProps {
  /** 이미 고른 사번 — 목록에는 남기되 `이미 추가됨` 으로 선택만 막는다 */
  excludedIds?: string[];
  placeholder?: string;
  disabled?: boolean;
  /** 선택 즉시 호출된다. 입력값은 컴포넌트가 알아서 비운다 */
  onSelect: (employee: EmployeeSearchResult) => void;
}

/**
 * 사원 이름 검색 · 선택 (.ai/API.md 35, #41).
 *
 * 인사관리 목록(`GET /employees`, ADMIN 전용)과 **다른 API** 라
 * 로그인한 사용자면 누구나 호출할 수 있다. 결재선 지정에서 쓴다.
 *
 * ⚠️ 빈 입력은 400 `EMP_INVALID_PARAMETER` 라 아예 호출하지 않는다.
 */
export default function EmployeeSearchInput({
  excludedIds = [],
  // 한 글자만 쳐도 부분 일치로 걸려 목록처럼 훑을 수 있다는 걸 알려준다
  placeholder = '결재자 이름 (예: 김)',
  disabled = false,
  onSelect,
}: EmployeeSearchInputProps) {
  const listId = useId();
  const [keyword, setKeyword] = useState('');
  const [results, setResults] = useState<EmployeeSearchResult[]>([]);
  const [isOpen, setIsOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  /** 키보드로 짚고 있는 후보. -1 이면 아무것도 안 짚은 상태 */
  const [activeIndex, setActiveIndex] = useState(-1);

  const name = keyword.trim();

  useEffect(() => {
    // 빈 입력은 400 이 확정이라 요청 자체를 만들지 않는다
    if (name === '') return;

    // 입력이 바뀌면 이전 요청을 취소한다 — 늦게 온 응답이 최신 결과를 덮지 않게
    const controller = new AbortController();

    const timer = setTimeout(async () => {
      try {
        const found = await searchEmployees(name, controller.signal);
        setResults(found);
        setActiveIndex(-1);
        setError('');
      } catch (caught) {
        if (isAbortError(caught)) return;
        setResults([]);
        setError(messageOf(caught, '사원을 검색하지 못했습니다.'));
      } finally {
        if (!controller.signal.aborted) setIsLoading(false);
      }
    }, DEBOUNCE_MS);

    return () => {
      clearTimeout(timer);
      controller.abort();
    };
  }, [name]);

  /**
   * 입력을 지우면 목록도 사라져야 한다 — 직전 검색 결과가 남지 않게 여기서 걸러낸다.
   * 이미 결재선에 있는 사람은 **숨기지 않고 `이미 추가됨` 으로 보여준다** —
   * 목록에서 사라지면 "검색이 안 되는 것" 처럼 보인다.
   */
  const options =
    name === ''
      ? []
      : results.map((employee) => ({
          ...employee,
          isAdded: excludedIds.includes(employee.userId),
        }));
  const selectableCount = options.filter((option) => !option.isAdded).length;
  const isListVisible = isOpen && name !== '';

  function choose(employee: EmployeeSearchResult) {
    onSelect(employee);
    setKeyword('');
    setResults([]);
    setActiveIndex(-1);
    setIsOpen(false);
  }

  function handleKeyDown(event: React.KeyboardEvent<HTMLInputElement>) {
    if (event.key === 'Escape') {
      setIsOpen(false);
      setActiveIndex(-1);
      return;
    }

    if (event.key === 'ArrowDown' || event.key === 'ArrowUp') {
      if (selectableCount === 0) return;
      event.preventDefault();
      setIsOpen(true);

      const step = event.key === 'ArrowDown' ? 1 : -1;
      // 이미 추가된 사람은 건너뛴다. 끝에 닿으면 반대편으로 돈다
      // 아무것도 안 짚은 상태(-1)에서 ↑ 를 누르면 마지막 항목으로 간다
      let next = activeIndex < 0 && step === -1 ? 0 : activeIndex;
      do {
        next = (next + step + options.length) % options.length;
      } while (options[next].isAdded);

      setActiveIndex(next);
      return;
    }

    if (event.key === 'Enter') {
      // 폼 안에서 쓰이므로 Enter 가 상신 · 저장으로 새어 나가면 안 된다
      event.preventDefault();
      const picked = options[activeIndex];
      if (picked && !picked.isAdded) choose(picked);
    }
  }

  return (
    <div className="relative">
      <input
        type="text"
        role="combobox"
        aria-expanded={isListVisible}
        aria-controls={listId}
        aria-autocomplete="list"
        autoComplete="off"
        value={keyword}
        disabled={disabled}
        placeholder={placeholder}
        onChange={(event) => {
          const next = event.target.value;
          setKeyword(next);
          setIsOpen(true);
          setError('');
          // 디바운스가 끝나기 전까지는 직전 결과가 아니라 "검색 중" 을 보여준다
          setIsLoading(next.trim() !== '');
        }}
        onFocus={() => setIsOpen(true)}
        // 항목 클릭이 블러보다 먼저 처리되도록 목록 쪽에서 mousedown 을 막는다
        onBlur={() => setIsOpen(false)}
        onKeyDown={handleKeyDown}
        className="w-full min-w-0 rounded-lg border border-[#1C1F2A]/10 bg-[#ECEEF4]/40 px-2.5 py-1.5 text-[10px] text-[#1C1F2A] placeholder:text-[#6C7389] focus:outline-2 focus:outline-offset-2 focus:outline-[#3B5BDB] disabled:cursor-not-allowed disabled:text-[#C7CCD9]"
      />

      {isListVisible && (
        <ul
          id={listId}
          role="listbox"
          onMouseDown={(event) => event.preventDefault()}
          className="absolute top-full right-0 left-0 z-10 mt-1 max-h-40 overflow-y-auto rounded-lg border border-[#1C1F2A]/10 bg-white py-1 shadow-lg"
        >
          {isLoading && (
            <li className="px-2.5 py-1.5 text-[10px] text-[#6C7389]">
              검색 중…
            </li>
          )}

          {!isLoading && error !== '' && (
            <li
              role="alert"
              className="px-2.5 py-1.5 text-[10px] break-keep text-[#E7000B]"
            >
              {error}
            </li>
          )}

          {!isLoading && error === '' && options.length === 0 && (
            <li className="px-2.5 py-1.5 text-[10px] break-keep text-[#6C7389]">
              검색 결과가 없습니다. 성만 입력해도 돼요 (예: 김)
            </li>
          )}

          {!isLoading && error === '' && options.length > 0 && (
            <li className="px-2.5 py-1 text-[9px] text-[#6C7389]">
              {options.length}명
            </li>
          )}

          {!isLoading &&
            error === '' &&
            options.map((employee, index) => (
              <li key={employee.userId} role="none">
                <button
                  type="button"
                  role="option"
                  aria-selected={index === activeIndex}
                  aria-disabled={employee.isAdded}
                  disabled={employee.isAdded}
                  onClick={() => choose(employee)}
                  onMouseEnter={() => {
                    if (!employee.isAdded) setActiveIndex(index);
                  }}
                  className={`flex w-full items-baseline gap-1.5 px-2.5 py-1.5 text-left text-[10px] ${
                    employee.isAdded ? 'cursor-not-allowed' : 'cursor-pointer'
                  } ${index === activeIndex ? 'bg-[#ECEEF4]' : ''}`}
                >
                  <span
                    className={`shrink-0 font-semibold ${
                      employee.isAdded ? 'text-[#C7CCD9]' : 'text-[#1C1F2A]'
                    }`}
                  >
                    {employee.name}
                  </span>
                  {/* 동명이인이 있을 수 있어 부서 · 직급을 함께 보여준다 */}
                  <span
                    className={`min-w-0 truncate ${
                      employee.isAdded ? 'text-[#C7CCD9]' : 'text-[#6C7389]'
                    }`}
                  >
                    {[employee.position, employee.department]
                      .filter(Boolean)
                      .join(' · ')}
                  </span>
                  {employee.isAdded && (
                    <span className="ml-auto shrink-0 text-[9px] text-[#6C7389]">
                      이미 추가됨
                    </span>
                  )}
                </button>
              </li>
            ))}
        </ul>
      )}
    </div>
  );
}
