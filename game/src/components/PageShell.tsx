'use client';

import Link from 'next/link';
import type { ReactNode } from 'react';
import { useI18n } from '@/i18n/I18nProvider';
import { PAGES, pick, type Bi, type PageLink } from '@/content/shared';
import SiteHeader from './SiteHeader';
import '@/styles/aero-home.css';
import '@/styles/aero-playful.css';

/** Hero + body + "next page" + footer, shared by Rules / Fouls / Spirit / Why. */
export default function PageShell({
  slug,
  title,
  lede,
  children,
}: {
  slug: PageLink['slug'];
  art?: never;
  title: ReactNode;
  lede: Bi;
  children: ReactNode;
}) {
  const { lang } = useI18n();
  const zh = lang === 'zh';
  const i = PAGES.findIndex((p) => p.slug === slug);
  const page = PAGES[i];
  const next: { slug: string; num: string; label: Bi } =
    i < PAGES.length - 1 ? PAGES[i + 1] : { slug: '/', num: '01', label: ['回到首页', 'Back to the start'] };

  return (
    <div className="aero-home aero-page aero-playful">
      <a className="aero-skip" href="#ap-main">
        {zh ? '跳至正文' : 'Skip to content'}
      </a>
      <SiteHeader current={slug} />

      <main id="ap-main">
        <section className="ap-hero" aria-labelledby="ap-title">
          <div className="ap-hero-inner">
            <span className="ap-eyebrow">{page.num} — {pick(lang, page.tagline)}</span>
            <h1 id="ap-title">{title}</h1>
            <p className="ap-hero-lede">{pick(lang, lede)}</p>
          </div>
        </section>

        <div className="ap-body">{children}</div>

        <nav className="ap-next" aria-label={zh ? '下一页' : 'Next page'}>
          <Link href={next.slug}>
            <span className="ap-next-label">
              {next.slug === '/' ? (zh ? '继续' : 'Continue') : zh ? '下一页' : 'Next'} · {next.num}
            </span>
            <h2 className="ap-next-title">{pick(lang, next.label)}</h2>
          </Link>
        </nav>
      </main>

      <footer className="aero-page-footer">
        <span className="afo-brand">Ultimate Field</span>
        <span className="afo-links">
          <a href="https://github.com/maria06yingning/biuh-frisbee" target="_blank" rel="noopener noreferrer">
            GitHub
          </a>
        </span>
        <span className="afo-cite">
          {zh ? '规则内容来自 ' : 'Rules content is derived from '}
          <a href="https://rules.wfdf.sport/" target="_blank" rel="noopener noreferrer">
            {zh ? 'WFDF 极限飞盘规则 2025–2028' : 'WFDF Rules of Ultimate 2025–2028'}
          </a>
          {zh
            ? '（CC BY 4.0）。本站为通俗解读，若有出入以官方原文为准。'
            : ' (CC BY 4.0). This site is a plain-language summary; the official text takes precedence.'}
        </span>
      </footer>
    </div>
  );
}

export function Term({ zh, en }: { zh: string; en: string }) {
  const { lang } = useI18n();
  if (lang !== 'zh') return <>{en}</>;
  return (
    <span className="ap-term">
      {zh}
      <span className="ap-en" lang="en">
        {en}
      </span>
    </span>
  );
}

export function Section({
  id,
  label,
  heading,
  intro,
  full,
  children,
}: {
  id?: string;
  label?: ReactNode;
  heading: ReactNode;
  intro?: ReactNode;
  full?: boolean;
  children: ReactNode;
}) {
  return (
    <section id={id} className="ap-section">
      <div className={full ? 'ap-section-full' : 'ap-section-grid'}>
        <div className="ap-section-head">
          {label && <span className="ap-label">{label}</span>}
          <h2>{heading}</h2>
          {intro && <p>{intro}</p>}
        </div>
        <div className="ap-section-body">{children}</div>
      </div>
    </section>
  );
}
