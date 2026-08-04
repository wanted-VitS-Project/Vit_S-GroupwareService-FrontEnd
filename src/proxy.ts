import { NextResponse, type NextRequest } from 'next/server';

/**
 * 인증 가드. (Next 16 부터 middleware.ts 대신 proxy.ts 규약을 쓴다)
 *
 * 세션 쿠키가 HttpOnly 라 JS 로는 못 읽고 서버에서만 확인할 수 있다.
 * 쿠키 존재 여부만 보며, 유효성 판단은 백엔드 몫이다 — 만료된 쿠키는 API 401 로 걸러진다.
 */

const SESSION_COOKIE = 'SESSION';
const PUBLIC_PATHS = ['/login', '/forbidden'];

export default function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const isPublic = PUBLIC_PATHS.includes(pathname);
  const hasSession = request.cookies.has(SESSION_COOKIE);

  if (!hasSession && !isPublic) {
    return NextResponse.redirect(new URL('/login', request.url));
  }

  // 쿠키가 있다고 /login 진입을 막지 않는다.
  // 만료된 쿠키는 여기서 걸러낼 수 없어서, 막으면 /login ↔ / 리디렉션 루프가 된다.
  return NextResponse.next();
}

export const config = {
  // 정적 파일 · Next 내부 경로는 가드 대상에서 뺀다
  matcher: ['/((?!_next/static|_next/image|favicon.ico|.*\\.svg).*)'],
};
