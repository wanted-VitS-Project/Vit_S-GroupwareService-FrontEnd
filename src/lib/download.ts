/**
 * 응답을 파일로 내려받는 브라우저 처리.
 *
 * 도메인을 모른다 — 응답과 대체 파일명만 다룬다 (`.ai/STRUCTURE.md` §3 기준으로 `lib/`).
 * 데이터를 가져오는 일은 각 도메인의 `api.ts`, 받은 것을 파일로 떨구는 일은 여기다.
 */

/** 파일명을 못 읽었을 때를 대비해 호출 측이 항상 대체 이름을 준다 */
function fileNameOf(disposition: string | null, fallback: string) {
  if (!disposition) return fallback;

  /**
   * 한글 파일명은 `filename*=UTF-8''...` 로 퍼센트 인코딩돼 오고,
   * 구형 클라이언트용 `filename="..."` 이 함께 오는 경우가 많다 — 인코딩된 쪽을 먼저 본다.
   */
  const encoded = disposition.match(/filename\*=UTF-8''([^;]+)/i)?.[1];
  if (encoded) {
    try {
      return decodeURIComponent(encoded);
    } catch {
      // 깨진 인코딩 때문에 다운로드 자체가 실패하면 안 된다
    }
  }

  return disposition.match(/filename="?([^";]+)"?/i)?.[1] ?? fallback;
}

/**
 * 응답 본문을 파일로 저장한다.
 *
 * 인증이 HttpOnly 쿠키라 `<a download href>` 로 바로 링크할 수 없다 —
 * 받아서 `blob:` URL 로 바꾼 뒤 클릭을 흉내 낸다.
 */
export async function saveResponseAsFile(
  response: Response,
  fallbackName: string,
) {
  const blob = await response.blob();
  const url = URL.createObjectURL(blob);

  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = fileNameOf(
    response.headers.get('Content-Disposition'),
    fallbackName,
  );
  document.body.append(anchor);
  anchor.click();
  anchor.remove();

  // 즉시 해제하면 다운로드가 시작되기 전에 URL 이 사라지는 브라우저가 있다
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
