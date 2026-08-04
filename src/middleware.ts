import { NextResponse, type NextRequest } from 'next/server';

/**
 * 인증 가드.
 *
 * 세션 쿠키가 HttpOnly 라 JS 로는 못 읽고 미들웨어(서버)에서만 확인할 수 있다.
 * 쿠키 존재 여부만 보며, 유효성 판단은 백엔드 몫이다 — 만료된 쿠키는 API 401 로 걸러진다.
 */

const SESSION_COOKIE = 'SESSION';
const PUBLIC_PATHS = ['/login', '/forbidden'];

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const isPublic = PUBLIC_PATHS.includes(pathname);
  const hasSession = request.cookies.has(SESSION_COOKIE);

  if (!hasSession && !isPublic) {
    return NextResponse.redirect(new URL('/login', request.url));
  }

  // 로그인 성공 후 / 로 돌아왔을 때 다시 /login 으로 튕기는 무한루프를 막는다
  if (hasSession && pathname === '/login') {
    return NextResponse.redirect(new URL('/', request.url));
  }

  return NextResponse.next();
}

export const config = {
  // 정적 파일 · Next 내부 경로는 가드 대상에서 뺀다
  matcher: ['/((?!_next/static|_next/image|favicon.ico|.*\\.svg).*)'],
};
