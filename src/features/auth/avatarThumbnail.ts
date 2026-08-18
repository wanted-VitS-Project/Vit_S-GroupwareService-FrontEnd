'use client';

import { writeShellCookie } from './shellCache';

/**
 * 프로필 사진의 축소 사본을 셸 쿠키에 저장해 첫 페인트에 바로 그린다.
 * 실패하거나 쿠키 상한을 넘으면 저장하지 않고 넘어간다.
 */

/** 저장할 사본의 한 변 크기 */
const THUMBNAIL_SIZE = 48;

/** 쿠키에 넣을 수 있는 최대 길이. 넘으면 저장을 건너뛴다 */
const MAX_DATA_URL_LENGTH = 2800;

/** 같은 주소를 중복으로 처리하지 않기 위한 기록 */
let capturedSource: string | null = null;

export function captureAvatarThumbnail(source: string) {
  if (typeof document === 'undefined' || capturedSource === source) return;
  capturedSource = source;

  const image = new Image();
  /* 같은 오리진 경로로 받으므로 crossOrigin 설정이 필요 없다 */

  image.onload = () => {
    try {
      const canvas = document.createElement('canvas');
      canvas.width = THUMBNAIL_SIZE;
      canvas.height = THUMBNAIL_SIZE;

      const context = canvas.getContext('2d');
      if (!context) return;

      context.drawImage(image, 0, 0, THUMBNAIL_SIZE, THUMBNAIL_SIZE);

      // 아주 작은 그림이라 품질을 낮춰도 티가 나지 않는다
      const dataUrl = canvas.toDataURL('image/jpeg', 0.5);

      if (dataUrl.length <= MAX_DATA_URL_LENGTH) {
        writeShellCookie({ avatar: dataUrl });
      }
    } catch {
      // 캔버스가 오염된 경우. 사본 없이 넘어간다
    }
  };

  image.onerror = () => {
    // 사진을 못 받은 경우. 조용히 포기한다
  };

  image.src = source;
}

/** 사진을 지울 때 사본도 함께 지운다 */
export function clearAvatarThumbnail() {
  capturedSource = null;
  writeShellCookie({ avatar: null });
}
