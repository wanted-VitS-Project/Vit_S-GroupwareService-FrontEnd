'use client';

import { useEffect, useId, useState } from 'react';

import { getDepartments } from '@/features/department/api';
import { isAbortError, messageOf } from '@/lib/api';

import {
  toDepartmentOptions,
  type DepartmentOption,
} from '@/features/department/options';

import { searchEmployees } from './api';
import { readCachedDepartments, writeCachedDepartments } from './optionCache';
import type { EmployeeSearchResult } from './types';

/** 타이핑마다 부르지 않기 위한 대기 시간 */
const DEBOUNCE_MS = 250;

interface EmployeeSearchInputProps {
  /** 이미 고른 사번. 목록에는 남기되 이미 추가됨 으로 선택만 막는다 */
  excludedIds?: string[];
  placeholder?: string;
  disabled?: boolean;
  /** 선택 즉시 호출된다. 입력값은 컴포넌트가 알아서 비운다 */
  onSelect: (employee: EmployeeSearchResult) => void;
}

/**
 * 사원 이름 검색 · 선택. 인사관리 목록과 다른 API 라 누구나 호출할 수 있다.
 * 빈 입력은 400 이라 아예 호출하지 않는다.
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
  /**
   * 아무것도 치지 않았을 때 보여줄 후보 목록.
   * 부서를 고르면 그 부서 재직자가 펴진다. 이름 · 부서 둘 다 비면 400 이다.
   */
  const [allEmployees, setAllEmployees] = useState<EmployeeSearchResult[]>([]);

  const name = keyword.trim();

  /** 부서로 후보를 펼칠 때 고른 부서 */
  const [departmentId, setDepartmentId] = useState('');
  /** 캐시된 부서를 초기값으로 읽는다. 효과에서 넣으면 셀렉트가 비었다 채워진다 */
  const [departments, setDepartments] = useState<DepartmentOption[]>(() =>
    toDepartmentOptions(readCachedDepartments() ?? []),
  );

  /**
   * 부서 선택지. 못 받아도 이름 검색은 그대로 쓸 수 있어 실패를 삼킨다.
   * 캐시된 값을 먼저 그려 셀렉트 폭이 늦게 바뀌지 않게 한다.
   */
  useEffect(() => {
    const controller = new AbortController();

    getDepartments(controller.signal)
      .then((list) => {
        setDepartments(toDepartmentOptions(list));
        writeCachedDepartments(list);
      })
      .catch(() => {});

    return () => controller.abort();
  }, []);

  /**
   * 이름을 모를 때 부서로 후보를 펼친다.
   * 전 사원 목록은 ADMIN 전용이라 일반 사원이 열면 403 이 화면을 덮었다.
   */
  useEffect(() => {
    // 고른 부서가 없으면 부를 것이 없다
    if (departmentId === '') return;

    const controller = new AbortController();

    searchEmployees({ departmentId: Number(departmentId) }, controller.signal)
      .then(setAllEmployees)
      .catch(() => {});

    return () => controller.abort();
  }, [departmentId]);

  useEffect(() => {
    // 빈 입력은 400 이 확정이라 요청 자체를 만들지 않는다
    if (name === '') return;

    // 입력이 바뀌면 이전 요청을 취소한다. 늦게 온 응답이 최신 결과를 덮지 않게
    const controller = new AbortController();

    const timer = setTimeout(async () => {
      try {
        const found = await searchEmployees({ name }, controller.signal);
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
   * 입력을 지우면 목록도 사라져야 해 직전 검색 결과를 여기서 걸러낸다.
   * 이미 결재선에 있는 사람은 숨기지 않고 이미 추가됨 으로 보여준다.
   */
  /** 이름을 치면 검색 결과, 비어 있으면 고른 부서의 후보를 보여준다 */
  const listed =
    name !== '' ? results : departmentId === '' ? [] : allEmployees;
  const options = listed.map((employee) => ({
    ...employee,
    isAdded: excludedIds.includes(employee.userId),
  }));
  const selectableCount = options.filter((option) => !option.isAdded).length;
  /** 칸을 누르면 아무것도 치지 않아도 목록이 펴진다 */
  const isListVisible = isOpen && options.length > 0;

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
      // 아무것도 안 짚은 상태에서 위 화살표를 누르면 마지막 항목으로 간다
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
      {/* 이름을 모를 때 쓰는 길이다. 부서를 고르면 그 부서 재직자가 목록으로 펴진다 */}
      <div className="mb-1.5 flex items-center gap-1.5">
        <label htmlFor={`${listId}-department`} className="sr-only">
          부서로 찾기
        </label>
        <select
          id={`${listId}-department`}
          value={departmentId}
          disabled={disabled}
          onChange={(event) => {
            setDepartmentId(event.target.value);
            setIsOpen(true);
          }}
          className="input w-40 cursor-pointer py-1 text-caption disabled:cursor-not-allowed"
        >
          <option value="">부서로 찾기</option>
          {departments.map((option) => (
            <option key={option.id} value={option.id}>
              {option.label}
            </option>
          ))}
        </select>
      </div>

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
          // 디바운스가 끝나기 전까지는 직전 결과가 아니라 검색 중 을 보여준다
          setIsLoading(next.trim() !== '');
        }}
        onFocus={() => setIsOpen(true)}
        // 항목 클릭이 블러보다 먼저 처리되도록 목록에서 mousedown 을 막는다
        onBlur={() => setIsOpen(false)}
        onKeyDown={handleKeyDown}
        className="w-full min-w-0 rounded-lg border border-border-default bg-bg-surface px-2.5 py-1.5 text-caption text-text-primary placeholder:text-text-secondary focus:outline-2 focus:outline-offset-2 focus:outline-border-primary disabled:cursor-not-allowed disabled:text-text-muted"
      />

      {isListVisible && (
        <ul
          id={listId}
          role="listbox"
          onMouseDown={(event) => event.preventDefault()}
          className="absolute top-full right-0 left-0 z-10 mt-1 max-h-40 overflow-y-auto rounded-lg border border-border-default bg-bg-card py-1 shadow-lg"
        >
          {isLoading && (
            <li className="px-2.5 py-1.5 text-caption text-text-secondary">
              검색 중…
            </li>
          )}

          {!isLoading && error !== '' && (
            <li
              role="alert"
              className="px-2.5 py-1.5 text-caption break-keep text-text-danger"
            >
              {error}
            </li>
          )}

          {!isLoading && error === '' && options.length === 0 && (
            <li className="px-2.5 py-1.5 text-caption break-keep text-text-secondary">
              검색 결과가 없습니다
            </li>
          )}

          {!isLoading && error === '' && options.length > 0 && (
            <li className="px-2.5 py-1 text-micro text-text-secondary">
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
                  className={`flex w-full items-baseline gap-1.5 px-2.5 py-1.5 text-left text-caption ${
                    employee.isAdded ? 'cursor-not-allowed' : 'cursor-pointer'
                  } ${index === activeIndex ? 'bg-bg-hover' : ''}`}
                >
                  <span
                    className={`shrink-0 font-semibold ${
                      employee.isAdded ? 'text-text-muted' : 'text-text-primary'
                    }`}
                  >
                    {employee.name}
                  </span>
                  {/* 동명이인이 있을 수 있어 부서 · 직급을 함께 보여준다 */}
                  <span
                    className={`min-w-0 truncate ${
                      employee.isAdded
                        ? 'text-text-muted'
                        : 'text-text-secondary'
                    }`}
                  >
                    {[employee.position, employee.department]
                      .filter(Boolean)
                      .join(' · ')}
                  </span>
                  {employee.isAdded && (
                    <span className="ml-auto shrink-0 text-micro text-text-secondary">
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
