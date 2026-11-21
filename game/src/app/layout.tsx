import type { Metadata, Viewport } from 'next';
import type { ReactNode } from 'react';
import { I18nProvider } from '@/i18n/I18nProvider';
import '@/styles/experience.css';
import '@/styles/story.css';

const siteOrigin = 'https://maria06yingning.github.io';
const siteUrl = `${siteOrigin}/biuh-frisbee`;
const socialImage = `${siteUrl}/opengraph-image.png`;

export const metadata: Metadata = {
  // Keep this at the origin: Next.js prepends the GitHub Pages basePath to
  // file-based metadata routes such as opengraph-image.png.
  metadataBase: new URL(siteOrigin),
  title: '极限飞盘 · Ultimate Field',
  description: '第一人称极限飞盘体验 · A first-person ultimate frisbee experience',
  openGraph: {
    type: 'website',
    url: siteUrl,
    title: '极限飞盘 · Ultimate Field',
    description: '第一人称极限飞盘体验 · A first-person ultimate frisbee experience',
    siteName: 'Ultimate Field',
    images: [{ url: socialImage, width: 1200, height: 630, alt: 'Ultimate Field — Play. Learn. Together.' }],
  },
  twitter: {
    card: 'summary_large_image',
    title: '极限飞盘 · Ultimate Field',
    description: '第一人称极限飞盘体验 · A first-person ultimate frisbee experience',
    images: [{ url: socialImage, alt: 'Ultimate Field — Play. Learn. Together.' }],
  },
  manifest: `${process.env.NEXT_PUBLIC_BASE_PATH ?? ''}/site.webmanifest?v=02b87c1`,
  icons: {
    icon: [
      { url: `${process.env.NEXT_PUBLIC_BASE_PATH ?? ''}/favicon.png?v=02b87c1`, type: 'image/png', sizes: '512x512' },
    ],
    apple: [{ url: `${process.env.NEXT_PUBLIC_BASE_PATH ?? ''}/apple-touch-icon.png?v=02b87c1`, sizes: '180x180', type: 'image/png' }],
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
