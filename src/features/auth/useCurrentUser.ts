'use client';

import { useContext } from 'react';

import {
  CurrentUserContext,
  SetProfileImageContext,
} from './CurrentUserProvider';

/** 프로바이더가 불러오기를 마친 뒤에만 children 을 그리므로 항상 값이 있다. */
export function useCurrentUser() {
  const user = useContext(CurrentUserContext);

  if (!user) {
    throw new Error('useCurrentUser 는 CurrentUserProvider 안에서만 쓴다.');
  }
  return user;
}

/** 프로필 사진을 바꾼 뒤 헤더 아바타까지 함께 갱신할 때 쓴다 */
export function useSetProfileImage() {
  const setProfileImage = useContext(SetProfileImageContext);

  if (!setProfileImage) {
    throw new Error('useSetProfileImage 는 CurrentUserProvider 안에서만 쓴다.');
  }
  return setProfileImage;
}
