import type { Metadata } from 'next';
import type { ReactNode } from 'react';
import { I18nProvider } from '@/i18n/I18nProvider';
import '@/styles/experience.css';

export const metadata: Metadata = {
  title: '极限飞盘 · Ultimate Field',
  description: '第一人称极限飞盘体验 · A first-person ultimate frisbee experience',
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="zh-CN">
      <body>
        <I18nProvider>{children}</I18nProvider>
      </body>
    </html>
  );
}
