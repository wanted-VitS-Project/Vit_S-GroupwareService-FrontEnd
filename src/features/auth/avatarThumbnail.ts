'use client';

import { writeShellCookie } from './shellCache';

/**
 * 내 프로필 사진의 **아주 작은 사본**을 셸 쿠키에 넣는다.
 * 사진 서빙이 302 라 새로고침마다 네트워크를 타는데, 이 사본은 첫 HTML 에 실려 나간다.
 *
 * ⚠️ 다른 오리진이라 `<canvas>` 가 오염된다 — 보이는 `<img>` 는 두고 CORS 사본을 따로 받는다.
 *    실패하면 조용히 포기한다.
 * ⚠️ 쿠키는 4KB 상한이고 매 요청에 실린다. 넘으면 저장하지 않는다.
 */

/** 저장할 사본의 한 변 — 사이드바 아바타(40px)의 두 배까지만 */
const THUMBNAIL_SIZE = 48;

/** 쿠키에 넣을 수 있는 최대 길이. 넘으면 저장을 건너뛴다 */
const MAX_DATA_URL_LENGTH = 2800;

/** 같은 주소를 두 번 뜨지 않는다 — 화면마다 아바타가 여럿이라 그냥 두면 중복으로 돈다 */
let capturedSource: string | null = null;

export function captureAvatarThumbnail(source: string) {
  if (typeof document === 'undefined' || capturedSource === source) return;
  capturedSource = source;

  const image = new Image();
  /** 쿠키를 실어야 사진이 내려온다 — 서버가 이 오리진을 허용하지 않으면 `onerror` 로 빠진다 */
  image.crossOrigin = 'use-credentials';

  image.onload = () => {
    try {
      const canvas = document.createElement('canvas');
      canvas.width = THUMBNAIL_SIZE;
      canvas.height = THUMBNAIL_SIZE;

      const context = canvas.getContext('2d');
      if (!context) return;

      context.drawImage(image, 0, 0, THUMBNAIL_SIZE, THUMBNAIL_SIZE);

      // 아주 작게 줄여 놓은 그림이라 품질을 낮춰도 티가 나지 않는다
      const dataUrl = canvas.toDataURL('image/jpeg', 0.5);

      if (dataUrl.length <= MAX_DATA_URL_LENGTH) {
        writeShellCookie({ avatar: dataUrl });
      }
    } catch {
      // 오염된 캔버스(CORS 미허용) — 사본 없이 간다
    }
  };

  image.onerror = () => {
    // CORS 를 안 열어 줬거나 사진이 없다 — 조용히 포기한다
  };

  image.src = source;
}

/** 사진을 지웠을 때 사본도 함께 지운다 — 없는 사진이 계속 비치면 안 된다 */
export function clearAvatarThumbnail() {
  capturedSource = null;
  writeShellCookie({ avatar: null });
}
