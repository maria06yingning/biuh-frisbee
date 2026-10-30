'use client';

import Link from 'next/link';
import type { ReactNode } from 'react';
import { useI18n } from '@/i18n/I18nProvider';
import { PAGES, pick, type Bi, type PageLink } from '@/content/shared';
import DiscArt, { type DiscVariant } from './DiscArt';
import SiteHeader from './SiteHeader';
import '@/styles/aero-home.css';
import '@/styles/aero-pages.css';

/** Hero + body + "next page" + footer, shared by Rules / Fouls / Spirit / Why. */
export default function PageShell({
  slug,
  art,
  title,
  lede,
  children,
}: {
  slug: PageLink['slug'];
  art: DiscVariant;
  title: ReactNode;
  lede: Bi;
  children: ReactNode;
}) {
  const { lang } = useI18n();
  const zh = lang === 'zh';
  const i = PAGES.findIndex((p) => p.slug === slug);
  const page = PAGES[i];
  // The last page hands off to the homepage instead of looping back to Rules.
  const next: { slug: string; num: string; label: Bi } =
    i < PAGES.length - 1 ? PAGES[i + 1] : { slug: '/', num: '01', label: ['回到首页', 'Back to the start'] };

  return (
    // .aero-home brings the homepage tokens and type; .aero-page adds page layout.
    <div className="aero-home aero-page">
      <a className="aero-skip" href="#ap-main">
        {zh ? '跳至正文' : 'Skip to content'}
      </a>
      <SiteHeader current={slug} />

      <main id="ap-main">
        <section className="ap-hero" aria-labelledby="ap-title">
          <div className="ap-hero-inner">
            <div className="ap-eyebrow">
              <span>ULTIMATE FIELD</span>
              <span>
                {page.num} — {pick(lang, page.tagline)}
              </span>
            </div>
            <h1 id="ap-title">{title}</h1>
            <p className="ap-hero-lede">{pick(lang, lede)}</p>
            <div className="ap-hero-art">
              <DiscArt variant={art} />
            </div>
          </div>
        </section>

        <div className="ap-body">{children}</div>

        <nav className="ap-next" aria-label={zh ? '下一页' : 'Next page'}>
          <Link href={next.slug}>
            <span>
              <span className="ap-next-k">{next.slug === '/' ? (zh ? '继续' : 'Continue') : zh ? '下一页' : 'Next'} · {next.num}</span>
              <br />
              <span className="ap-next-t">
                {pick(lang, next.label)} <span aria-hidden="true">→</span>
              </span>
            </span>
          </Link>
        </nav>
      </main>

      <footer className="aero-page-footer">
        <span className="afo-brand">Ultimate Field</span>
        <span className="afo-links">
          <Link href="/">{zh ? '首页' : 'Home'}</Link>
          {PAGES.map((p) => (
            <Link key={p.slug} href={p.slug}>
              {pick(lang, p.label)}
            </Link>
          ))}
        </span>
        <span className="afo-cite">
          {zh ? '规则内容依据 ' : 'Rules content follows the '}
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

/** Core-term annotation for Chinese copy: 标记者（marker）. English text renders as-is. */
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

/** Section scaffold: label + heading on the left (sticky), body on the right. */
export function Section({
  id,
  label,
  heading,
  intro,
  full,
  children,
}: {
  id: string;
  label: string;
  heading: ReactNode;
  intro?: ReactNode;
  full?: boolean;
  children: ReactNode;
}) {
  const hid = `${id}-h`;
  return (
    <section id={id} className={`ap-section${full ? ' ap-full' : ''}`} aria-labelledby={hid}>
      <div className="ap-section-head">
        <div className="ap-sticky">
          <span className="ap-label">{label}</span>
          <h2 id={hid}>{heading}</h2>
          {intro && <p>{intro}</p>}
        </div>
      </div>
      <div className="ap-section-body">{children}</div>
    </section>
  );
}
