import type { Metadata } from 'next';

import AppShell from '@/components/AppShell';

import Providers from './providers';
import './globals.css';

export const metadata: Metadata = {
  title: 'VitaS',
  description: '프로젝트 · 재무 관리 그룹웨어',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="ko" className="antialiased">
      <body>
        <Providers>
          <AppShell>{children}</AppShell>
        </Providers>
      </body>
    </html>
  );
}
