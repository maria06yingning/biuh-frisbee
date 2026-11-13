import type { Metadata, Viewport } from 'next';
import type { ReactNode } from 'react';
import { I18nProvider } from '@/i18n/I18nProvider';
import '@/styles/experience.css';
import '@/styles/story.css';

export const metadata: Metadata = {
  title: '极限飞盘 · Ultimate Field',
  description: '第一人称极限飞盘体验 · A first-person ultimate frisbee experience',
  manifest: `${process.env.NEXT_PUBLIC_BASE_PATH ?? ''}/site.webmanifest`,
  icons: {
    icon: [
      { url: `${process.env.NEXT_PUBLIC_BASE_PATH ?? ''}/favicon.png`, type: 'image/png', sizes: '512x512' },
    ],
    apple: [{ url: `${process.env.NEXT_PUBLIC_BASE_PATH ?? ''}/apple-touch-icon.png`, sizes: '180x180', type: 'image/png' }],
  },
};

export const viewport: Viewport = {
  themeColor: '#bfdcf2',
  colorScheme: 'light',
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
