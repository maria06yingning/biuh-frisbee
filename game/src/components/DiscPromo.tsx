'use client';

import { useEffect, useId, useRef, useState, type MouseEvent } from 'react';
import { useI18n } from '@/i18n/I18nProvider';
import { CONTACT_EMAIL, withBase } from '@/content/shared';
import '@/styles/aero-promo.css';

export default function DiscPromo({ enabled = true }: { enabled?: boolean }) {
  const { lang } = useI18n();
  const zh = lang === 'zh';
  const [open, setOpen] = useState(false);
  const id = useId().replace(/:/g, '');
  const triggerRef = useRef<HTMLButtonElement>(null);
  const closeRef = useRef<HTMLButtonElement>(null);
  const dialogRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    const focusTimer = window.setTimeout(() => closeRef.current?.focus(), 0);
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        event.preventDefault();
        setOpen(false);
        window.requestAnimationFrame(() => triggerRef.current?.focus());
        return;
      }
      if (event.key !== 'Tab') return;
      const focusable = dialogRef.current?.querySelectorAll<HTMLElement>('button:not([disabled]), a[href]');
      if (!focusable?.length) return;
      const first = focusable[0];
      const last = focusable[focusable.length - 1];
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first.focus();
      }
    };
    document.addEventListener('keydown', onKeyDown);
    return () => {
      window.clearTimeout(focusTimer);
      document.body.style.overflow = previousOverflow;
      document.removeEventListener('keydown', onKeyDown);
    };
  }, [open]);

  const close = () => {
    setOpen(false);
    window.requestAnimationFrame(() => triggerRef.current?.focus());
  };
  const closeOnBackdrop = (event: MouseEvent<HTMLDivElement>) => {
    if (event.target === event.currentTarget || event.target === dialogRef.current) close();
  };

  if (!enabled) return null;

  return (
    <div className="ap-promo-root">
      <button
        ref={triggerRef}
        className="ap-promo-teaser is-right"
        type="button"
        onClick={() => setOpen(true)}
        aria-haspopup="dialog"
        aria-expanded={open}
        aria-label={zh ? '打开飞盘活动海报预览' : 'Open the frisbee event poster preview'}
      >
        <svg className="ap-promo-teaser-disc" viewBox="0 0 180 100" aria-hidden="true">
          <ellipse className="ap-promo-disc-shadow" cx="90" cy="78" rx="68" ry="17" />
          <ellipse className="ap-promo-disc-body" cx="90" cy="52" rx="76" ry="34" />
          <ellipse className="ap-promo-disc-highlight" cx="90" cy="50" rx="57" ry="22" />
          <ellipse className="ap-promo-disc-groove" cx="90" cy="52" rx="29" ry="11" />
          <path className="ap-promo-disc-seam" d="M70 52q20-11 40 0" />
          <text className="ap-promo-disc-label" x="90" y="57" textAnchor="middle">{zh ? '活动' : 'EVENT'}</text>
        </svg>
      </button>

      {open && (
        <div className="ap-promo-overlay" onClick={closeOnBackdrop}>
          <div
            ref={dialogRef}
            className="ap-promo-dialog"
            role="dialog"
            aria-modal="true"
            aria-labelledby={`ap-promo-title-${id}`}
          >
            <button ref={closeRef} className="ap-promo-close" type="button" onClick={close} aria-label={zh ? '关闭活动预览' : 'Close event preview'}>
              <span aria-hidden="true">×</span>
            </button>
            <div className="ap-promo-flight from-right">
              <div className="ap-promo-card">
                <div className="ap-promo-face ap-promo-front" aria-hidden="true">
                  <svg className="ap-promo-large-disc" viewBox="0 0 280 180">
                    <ellipse className="ap-promo-disc-shadow" cx="140" cy="146" rx="102" ry="17" />
                    <ellipse className="ap-promo-disc-body" cx="140" cy="90" rx="124" ry="62" />
                    <ellipse className="ap-promo-disc-highlight" cx="140" cy="86" rx="95" ry="43" />
                    <ellipse className="ap-promo-disc-groove" cx="140" cy="90" rx="54" ry="22" />
                    <path className="ap-promo-disc-seam" d="M104 90q36-22 72 0" />
                  </svg>
                </div>
                <div className="ap-promo-face ap-promo-back">
                  <div className="ap-promo-poster-head">
                    <span>{zh ? '活动海报 · 预览' : 'EVENT POSTER · PREVIEW'}</span>
                    <span className="ap-promo-poster-stamp" aria-hidden="true">
                      <svg viewBox="0 0 64 44"><ellipse cx="32" cy="22" rx="28" ry="16"/><ellipse cx="32" cy="22" rx="18" ry="9"/><path d="M22 22q10-6 20 0"/></svg>
                    </span>
                  </div>
                  <h2 id={`ap-promo-title-${id}`}>{zh ? '一起去草地上玩盘吧！' : 'Come play on the field!'}</h2>
                  <div className="ap-promo-poster-box">
                    <img
                      className="ap-promo-poster-image"
                      src={withBase(zh ? '/activity-poster-zh.png' : '/activity-poster-en.png')}
                      alt={zh ? '飞盘活动宣传海报' : 'Ultimate frisbee event poster'}
                    />
                  </div>
                  <p>{zh ? '活动详情请查看海报；如需进一步了解，欢迎联系 Maria。' : 'See the poster for event details. Contact Maria if you would like to know more.'}</p>
                  <a className="ap-promo-contact" href={`mailto:${CONTACT_EMAIL}`} onClick={close}>
                    {zh ? '联系 Maria' : 'Contact Maria'} <span aria-hidden="true">↗</span>
                  </a>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
