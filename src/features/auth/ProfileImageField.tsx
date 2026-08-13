'use client';

import { useRef, useState } from 'react';

import { AlertDialogTwoButton, DialogIcons } from '@/components/AlertDialog';
import MemberAvatar, { forgetMissingAvatar } from '@/components/MemberAvatar';
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
 * 마이페이지 프로필 사진 — 미리보기 + 변경 · 삭제.
 *
 * 파일 입력은 화면에서 감추고 버튼이 대신 연다. 기본 `<input type="file">` 은
 * 브라우저마다 생김새가 달라 토큰으로 맞출 수가 없다.
 *
 * 서버가 다시 검증하지만 **형식 · 용량은 여기서 먼저 거른다** — 5MB 를 다 올려놓고
 * 400 으로 돌아오는 왕복이 사용자에게는 그냥 느린 실패로 보인다.
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

    // 같은 파일을 다시 고를 수 있게 값을 비운다 — 안 그러면 change 가 안 뜬다
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

      // 다른 화면의 내 아바타가 404 로 기억돼 있으면 지운다
      forgetMissingAvatar(user.userId);

      /**
       * 사진을 바꿔도 **서빙 경로는 그대로**다. 같은 문자열을 그대로 넣으면
       * `<img src>` 가 안 바뀌어 브라우저가 다시 부르지 않는다 — 방금 올린 사진이
       * 아니라 이전 사진이 계속 보인다. 시각을 붙여 강제로 새로 부르게 한다.
       */
      setProfileImage(`${profileImageUrl}?t=${Date.now()}`);
    } catch (caught) {
      setError(profileMessageOf(caught, '사진을 올리지 못했습니다.'));
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
 * 올리기 전에 거를 수 있는 것만 본다 — 위장 · 손상 · 픽셀 과다는 서버가 판단한다.
 * 문구는 서버 코드별 문구를 그대로 쓴다 — 먼저 걸렸는지 나중에 걸렸는지가
 * 사용자에게 다르게 보일 이유가 없다.
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

/**
 * 우리 문구가 있는 코드면 그것을, 없으면 서버 문구를 그대로 쓴다.
 * (`lib/api` 의 `messageOf` 는 코드별 문구를 모르므로 여기서 한 겹 더 감싼다)
 */
function profileMessageOf(caught: unknown, fallback: string) {
  const known =
    caught instanceof ApiError && caught.code
      ? PROFILE_IMAGE_ERROR_MESSAGES[caught.code]
      : undefined;

  return known ?? messageOf(caught, fallback);
}
