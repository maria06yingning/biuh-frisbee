'use client';

import Link from 'next/link';
import { useEffect, useId, useRef, useState, type ReactNode } from 'react';
import { useI18n } from '@/i18n/I18nProvider';
import { PAGES, pick, type PageLink } from '@/content/shared';
import '@/styles/aero-nav.css';

/**
 * One header for the whole site. On the homepage it fires the existing
 * in-page handlers (onPlay / onLab / onCodex), exactly as before. On the content
 * pages those become plain links back to the homepage with an ?open= intent,
 * so the Three.js game and the Tactics Lab are only ever started by the homepage.
 *
 * `current` is the slug of the content page you're on (undefined on the homepage).
 */
export interface SiteHeaderProps {
  current?: PageLink['slug'];
  onPlay?: () => void;
  onLab?: () => void;
  onCodex?: () => void;
}

export default function SiteHeader({ current, onPlay, onLab, onCodex }: SiteHeaderProps) {
  const { lang, setLang } = useI18n();
  const zh = lang === 'zh';
  const onHome = !current;
  const [menu, setMenu] = useState(false);
  const wrapRef = useRef<HTMLSpanElement>(null);
  const toggleRef = useRef<HTMLButtonElement>(null);
  const menuId = `aero-pages-${useId().replace(/:/g, '')}`;

  // Close the pages disclosure on outside click or Escape.
  useEffect(() => {
    if (!menu) return;
    const onDown = (e: PointerEvent) => {
      if (!wrapRef.current?.contains(e.target as Node)) setMenu(false);
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setMenu(false);
        toggleRef.current?.focus();
      }
    };
    document.addEventListener('pointerdown', onDown);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('pointerdown', onDown);
      document.removeEventListener('keydown', onKey);
    };
  }, [menu]);

  // Tool actions: the original buttons on the homepage, intent links elsewhere.
  // Intent links are full page loads on purpose: the homepage reads ?open= once on mount.
  const tool = (kind: 'lab' | 'codex' | 'play', handler: (() => void) | undefined, label: ReactNode, primary = false) =>
    onHome && handler ? (
      <button className={primary ? 'aero-primary' : undefined} onClick={handler}>
        {label}
      </button>
    ) : (
      <a className={`aero-navbtn${primary ? ' aero-primary' : ''}`} href={`/?open=${kind}`}>
        {label}
      </a>
    );

  return (
    <header className="aero-header">
      {onHome ? (
        <a className="aero-brand" href="#aero-top">
          Ultimate Field<span aria-hidden="true">↗</span>
        </a>
      ) : (
        <Link className="aero-brand" href="/">
          Ultimate Field<span aria-hidden="true">↗</span>
        </Link>
      )}
      <nav aria-label={zh ? '主导航' : 'Main navigation'}>
        {/* Content pages: inline on wide screens */}
        <span className="aero-pages-inline">
          {PAGES.map((p) => (
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
            {PAGES.map((p) => (
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

        <span className="aero-nav-sep" aria-hidden="true" />

        {tool('lab', onLab, zh ? '战术实验室' : 'Tactics Lab')}
        {tool('codex', onCodex, zh ? '规则图鉴' : 'Rule codex')}
        <button onClick={() => setLang(zh ? 'en' : 'zh')}>{zh ? 'English' : '中文'}</button>
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
