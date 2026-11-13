'use client';

import Link from 'next/link';
import { useEffect, useId, useRef, useState, type ReactNode } from 'react';
import { useI18n } from '@/i18n/I18nProvider';
import { PAGES, pick, withBase, type PageLink } from '@/content/shared';
import '@/styles/aero-nav.css';

/**
 * One shared navigation for the homepage, content pages and the Tactics Lab.
 * `current` is the active content-page slug, 'lab', or undefined on the homepage.
 */
export interface SiteHeaderProps {
  current?: PageLink['slug'] | 'lab';
  onHomeClick?: () => void;
  onPlay?: () => void;
  onLab?: () => void;
  onCodex?: () => void;
}

export default function SiteHeader({ current, onHomeClick, onPlay, onLab, onCodex }: SiteHeaderProps) {
  const { lang, setLang } = useI18n();
  const zh = lang === 'zh';
  const onHome = !current;
  const [menu, setMenu] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const wrapRef = useRef<HTMLSpanElement>(null);
  const toggleRef = useRef<HTMLButtonElement>(null);
  const mobileWrapRef = useRef<HTMLSpanElement>(null);
  const mobileToggleRef = useRef<HTMLButtonElement>(null);
  const id = useId().replace(/:/g, '');
  const menuId = `aero-pages-${id}`;
  const mobileMenuId = `aero-mobile-${id}`;
  const pagesNav = PAGES.filter((page) => page.slug !== '/about');
  const aboutPage = PAGES.find((page) => page.slug === '/about');

  // Close either navigation disclosure on outside click or Escape.
  useEffect(() => {
    if (!menu && !mobileMenuOpen) return;
    const onDown = (e: PointerEvent) => {
      const target = e.target as Node;
      if (menu && !wrapRef.current?.contains(target)) setMenu(false);
      if (mobileMenuOpen && !mobileWrapRef.current?.contains(target)) setMobileMenuOpen(false);
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setMenu(false);
        setMobileMenuOpen(false);
        if (mobileMenuOpen) mobileToggleRef.current?.focus();
        else toggleRef.current?.focus();
      }
    };
    document.addEventListener('pointerdown', onDown);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('pointerdown', onDown);
      document.removeEventListener('keydown', onKey);
    };
  }, [menu, mobileMenuOpen]);

  // Tool actions: the original buttons on the homepage, intent links elsewhere.
  // Intent links are full page loads on purpose: the homepage reads ?open= once on mount.
  const tool = (kind: 'lab' | 'codex' | 'play', handler: (() => void) | undefined, label: ReactNode, primary = false) =>
    handler ? (
      <button
        type="button"
        className={primary ? 'aero-primary' : undefined}
        aria-current={kind === 'lab' && current === 'lab' ? 'page' : undefined}
        onClick={() => { setMobileMenuOpen(false); handler(); }}
      >
        {label}
      </button>
    ) : (
      <a className={`aero-navbtn${primary ? ' aero-primary' : ''}`} href={withBase(`/?open=${kind}`)}>
        {label}
      </a>
    );

  return (
    <header className="aero-header">
      <nav aria-label={zh ? '主导航' : 'Main navigation'}>
        {/* Home link is always available; content links follow it on wide screens. */}
        {current === 'lab' ? (
          <button type="button" onClick={onHomeClick}>
            {zh ? '首页' : 'Home'}
          </button>
        ) : (
          <Link href="/" aria-current={onHome ? 'page' : undefined}>
            {zh ? '首页' : 'Home'}
          </Link>
        )}

        <span className="aero-mobile-nav" ref={mobileWrapRef}>
          <button
            ref={mobileToggleRef}
            type="button"
            className="aero-mobile-nav-toggle"
            aria-expanded={mobileMenuOpen}
            aria-controls={mobileMenuId}
            onClick={() => setMobileMenuOpen((open) => !open)}
          >
            {zh ? '菜单' : 'Menu'} <span aria-hidden="true">{mobileMenuOpen ? '×' : '☰'}</span>
          </button>
          <span className="aero-mobile-nav-items" id={mobileMenuId} data-open={mobileMenuOpen}>
            {/* Content pages: inline on wide screens */}
            <span className="aero-pages-inline">
              {pagesNav.map((p) => (
                <Link key={p.slug} href={p.slug} aria-current={current === p.slug ? 'page' : undefined}>
                  {pick(lang, p.label)}
                </Link>
              ))}
            </span>

            {/* Content pages: a disclosure on narrower screens */}
            <span className="aero-nav-pages" ref={wrapRef}>
              <button
                ref={toggleRef}
                type="button"
                className="aero-pages-toggle"
                aria-expanded={menu}
                aria-controls={menuId}
                onClick={() => setMenu((m) => !m)}
              >
                {zh ? '页面' : 'Pages'} <span aria-hidden="true">▾</span>
              </button>
              <span className="aero-pages-menu" id={menuId} hidden={!menu}>
                {current === 'lab' ? (
                  <button type="button" onClick={() => { setMenu(false); onHomeClick?.(); }}>
                    <b>{zh ? '首页' : 'Home'}</b>
                    <small>{zh ? '回到晴空飞盘游乐场' : 'Back to the disc playground'}</small>
                  </button>
                ) : (
                  <Link href="/" aria-current={onHome ? 'page' : undefined} onClick={() => setMenu(false)}>
                    <b>{zh ? '首页' : 'Home'}</b>
                    <small>{zh ? '回到晴空飞盘游乐场' : 'Back to the disc playground'}</small>
                  </Link>
                )}
                {pagesNav.map((p) => (
                  <Link
                    key={p.slug}
                    href={p.slug}
                    aria-current={current === p.slug ? 'page' : undefined}
                    onClick={() => setMenu(false)}
                  >
                    <b>{pick(lang, p.label)}</b>
                    <small>{pick(lang, p.tagline)}</small>
                  </Link>
                ))}
              </span>
            </span>

            {tool('lab', onLab, zh ? '战术实验室' : 'Tactics Lab')}
            {aboutPage && (
              <Link href={aboutPage.slug} aria-current={current === aboutPage.slug ? 'page' : undefined}>
                {pick(lang, aboutPage.label)}
              </Link>
            )}
            {tool('codex', onCodex, zh ? '规则图鉴' : 'Rule codex')}
            <button onClick={() => setLang(zh ? 'en' : 'zh')}>{zh ? 'English' : '中文'}</button>
          </span>
        </span>
        {tool(
          'play',
          onPlay,
          <>
            {zh ? '上场' : 'Play'} <span aria-hidden="true">↗</span>
          </>,
          true,
        )}
      </nav>
    </header>
  );
}
