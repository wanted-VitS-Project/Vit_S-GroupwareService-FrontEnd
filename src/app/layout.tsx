import type { Metadata } from 'next';
import { cookies } from 'next/headers';

import AppShell from '@/components/AppShell';
import { decodeShell, SHELL_COOKIE } from '@/features/auth/shellCache';
import { ENDPOINTS } from '@/constants/endpoints';
import { apiUrl } from '@/lib/api';

import Providers from './providers';
import './globals.css';

export const metadata: Metadata = {
  title: 'VitaS',
  description: '프로젝트 · 재무 관리 그룹웨어',
};

export default async function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  /**
   * 직전 셸 값(이름 · 소속 · 사진 · 메뉴)을 **HTML 에 이미 담아** 내린다.
   * 세션 확인을 기다렸다 그리면 새로고침마다 사이드바 · 헤더가 한 번 번쩍인다.
   */
  const shell = decodeShell((await cookies()).get(SHELL_COOKIE)?.value);
  /**
   * 프로필 사진을 **문서 맨 앞에서** 받기 시작한다.
   * 사진 서빙은 302 라 왕복이 한 번 더 있는데, `<img>` 를 만나서야 시작하면
   * 그 사이 아바타가 색 원으로 남는다.
   */
  const avatarUrl = shell?.user
    ? apiUrl(
        shell.user.profileImageUrl ??
          ENDPOINTS.employees.profileImage(shell.user.userId),
      )
    : null;

  return (
    <html lang="ko" className="antialiased">
      <head>
        {avatarUrl && (
          <link
            rel="preload"
            as="image"
            href={avatarUrl}
            fetchPriority="high"
          />
        )}
      </head>
      <body>
        <Providers>
          <AppShell initialShell={shell}>{children}</AppShell>
        </Providers>
      </body>
    </html>
  );
}
