import { ENDPOINTS } from '@/constants/endpoints';
import { apiUrl } from '@/lib/api';

/**
 * 프로필 사진을 **같은 오리진으로** 내보내는 창구.
 *
 * 백엔드 서빙(`/employees/{userId}/profile-image`)은 302 로 저장소(S3)를 가리키는데,
 * 저장소가 `Access-Control-Allow-Origin` 을 주지 않아 브라우저가 **`crossOrigin` 요청을 막는다**.
 * 그래서 첫 화면에 쓸 아바타 썸네일(`avatarThumbnail`)을 만들지 못했고, 새로고침마다
 * 아바타 자리가 잠깐 비었다.
 *
 * 이 라우트를 거치면 그림이 우리 오리진에서 오므로 CORS 가 걸리지 않는다.
 *
 * ⚠️ 저장소 CORS 가 열리면 **이 라우트는 지운다** — 그때는 백엔드 경로를 직접 쓰는 편이
 *    서버를 한 번 덜 거친다.
 * ⚠️ 세션 쿠키를 그대로 전달한다. 쿠키가 프론트 오리진에 오지 않는 환경(백엔드가 다른
 *    도메인이고 쿠키가 그 도메인 전용)에서는 401 이 되므로, 화면은 실패 시 이니셜로 떨어진다.
 */
export async function GET(
  request: Request,
  { params }: { params: Promise<{ userId: string }> },
) {
  const { userId } = await params;
  const cookie = request.headers.get('cookie');

  const upstream = await fetch(
    apiUrl(ENDPOINTS.employees.profileImage(userId)),
    {
      headers: cookie ? { cookie } : undefined,
      // 302 를 서버가 대신 따라간다 — 브라우저가 저장소로 직접 가지 않게 한다
      redirect: 'follow',
      cache: 'no-store',
    },
  );

  if (!upstream.ok) {
    // 사진 없음(404) · 세션 없음(401) — 화면은 이니셜로 그린다
    return new Response(null, { status: upstream.status });
  }

  return new Response(upstream.body, {
    headers: {
      'Content-Type': upstream.headers.get('content-type') ?? 'image/jpeg',
      /*
        백엔드 서빙과 같은 5분. 개인 사진이라 공유 캐시에는 담지 않는다.
        사진을 바꾼 직후에는 화면이 `?t={시각}` 을 붙여 이 캐시를 비켜 부른다.
      */
      'Cache-Control': 'private, max-age=300',
    },
  });
}
