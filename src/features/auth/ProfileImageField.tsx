'use client';

import { useRef, useState } from 'react';

import { AlertDialogTwoButton, DialogIcons } from '@/components/AlertDialog';
import MemberAvatar, { forgetMissingAvatar } from '@/components/MemberAvatar';
import { notifyToast } from '@/components/Toast';
import { ApiError, messageOf } from '@/lib/api';

import { deleteProfileImage, uploadProfileImage } from './api';
import { PROFILE_IMAGE_ERROR_MESSAGES } from './errorCodes';
import {
  PROFILE_IMAGE_ACCEPT,
  PROFILE_IMAGE_EXTENSIONS,
  PROFILE_IMAGE_MAX_BYTES,
} from './types';
import { useCurrentUser, useSetProfileImage } from './useCurrentUser';

/**
 * 마이페이지 프로필 사진 미리보기 · 변경 · 삭제.
 * 파일 입력은 감추고 버튼으로 열며, 형식 · 용량은 올리기 전에 먼저 거른다.
 */
export default function ProfileImageField() {
  const user = useCurrentUser();
  const setProfileImage = useSetProfileImage();
  const fileRef = useRef<HTMLInputElement>(null);

  const [isPending, setIsPending] = useState(false);
  const [isConfirmingDelete, setIsConfirmingDelete] = useState(false);
  const [error, setError] = useState('');

  const hasImage = user.profileImageUrl !== null;

  function pick() {
    setError('');
    fileRef.current?.click();
  }

  async function handleChange(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];

    // 같은 파일을 다시 고를 수 있게 값을 비운다
    event.target.value = '';
    if (!file) return;

    const localError = validate(file);

    if (localError) {
      setError(localError);
      return;
    }

    setError('');
    setIsPending(true);

    try {
      const { profileImageUrl } = await uploadProfileImage(file);

      // 404 로 기억된 아바타 기록을 지운다
      forgetMissingAvatar(user.userId);

      // 사진을 바꿔도 경로가 같아 브라우저가 다시 부르지 않는다. 시각을 붙여 갱신한다
      setProfileImage(`${profileImageUrl}?t=${Date.now()}`);
      notifyToast('프로필 사진을 올렸습니다.');
    } catch (caught) {
      const message = profileMessageOf(caught, '사진을 올리지 못했습니다.');

      setError(message);
      notifyToast(message, 'error');
    } finally {
      setIsPending(false);
    }
  }

  async function handleDelete() {
    setError('');
    setIsPending(true);

    try {
      await deleteProfileImage();
      setProfileImage(null);
      setIsConfirmingDelete(false);
    } catch (caught) {
      setError(profileMessageOf(caught, '사진을 삭제하지 못했습니다.'));
    } finally {
      setIsPending(false);
    }
  }

  return (
    <div className="flex items-center gap-6">
      <MemberAvatar
        userId={user.userId}
        name={user.name}
        size="xl"
        withRing={false}
        imageUrl={user.profileImageUrl}
      />

      <div className="min-w-0">
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            onClick={pick}
            disabled={isPending}
            className="cursor-pointer rounded-lg border border-border-default px-4 py-2 text-body-m hover:bg-bg-surface disabled:cursor-not-allowed disabled:text-text-muted"
          >
            {hasImage ? '사진 변경' : '사진 등록'}
          </button>

          {hasImage && (
            <button
              type="button"
              onClick={() => setIsConfirmingDelete(true)}
              disabled={isPending}
              className="cursor-pointer rounded-lg border border-border-default px-4 py-2 text-body-m text-text-danger hover:bg-bg-surface disabled:cursor-not-allowed disabled:text-text-muted"
            >
              삭제
            </button>
          )}
        </div>

        <p className="mt-2 text-caption break-keep text-text-secondary">
          jpg · jpeg · png · gif · 5MB 이하
        </p>

        {error !== '' && (
          <p
            role="alert"
            className="mt-1 text-caption break-keep text-text-danger"
          >
            {error}
          </p>
        )}
      </div>

      <input
        ref={fileRef}
        type="file"
        accept={PROFILE_IMAGE_ACCEPT}
        onChange={handleChange}
        className="hidden"
      />

      {isConfirmingDelete && (
        <AlertDialogTwoButton
          icon={DialogIcons.danger}
          title="프로필 사진을 삭제할까요?"
          description="기본 아바타로 돌아갑니다."
          confirmLabel="삭제"
          isDanger
          isBusy={isPending}
          errorMessage={error || undefined}
          onConfirm={handleDelete}
          onCancel={() => {
            setError('');
            setIsConfirmingDelete(false);
          }}
        />
      )}
    </div>
  );
}

/**
 * 올리기 전에 거를 수 있는 것만 검사한다. 위장 · 손상은 서버가 판단한다.
 * 문구는 서버 코드별 문구와 동일하게 맞춘다.
 */
function validate(file: File) {
  const extension = file.name.split('.').pop()?.toLowerCase() ?? '';

  if (!PROFILE_IMAGE_EXTENSIONS.includes(extension)) {
    return PROFILE_IMAGE_ERROR_MESSAGES.EMP_PROFILE_IMAGE_TYPE_INVALID;
  }
  if (file.size > PROFILE_IMAGE_MAX_BYTES) {
    return PROFILE_IMAGE_ERROR_MESSAGES.EMP_PROFILE_IMAGE_SIZE_EXCEEDED;
  }
  return '';
}

/** 정의된 코드면 그 문구를, 없으면 서버 문구를 그대로 쓴다 */
function profileMessageOf(caught: unknown, fallback: string) {
  const known =
    caught instanceof ApiError && caught.code
      ? PROFILE_IMAGE_ERROR_MESSAGES[caught.code]
      : undefined;

  return known ?? messageOf(caught, fallback);
}
