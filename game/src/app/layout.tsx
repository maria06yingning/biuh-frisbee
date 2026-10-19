import type { Metadata } from 'next';
import type { ReactNode } from 'react';
import '@/styles/experience.css';

export const metadata: Metadata = {
  title: '极限飞盘 · 第一人称体验',
  description: '没玩过飞盘？先在球场里传几次盘。',
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="zh-CN">
      <body>{children}</body>
    </html>
  );
}
