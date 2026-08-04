'use client';

import { useContext } from 'react';

import { CurrentUserContext } from './CurrentUserProvider';

/** 아직 안 불러왔으면 null 이다. 호출하는 쪽에서 로딩 상태를 그린다. */
export function useCurrentUser() {
  return useContext(CurrentUserContext);
}
