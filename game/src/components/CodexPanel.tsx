'use client';

import { CODEX } from '@/game/codex';
import { useI18n } from '@/i18n/I18nProvider';

export default function CodexPanel({ unlocked, onClose }: { unlocked: string[]; onClose: () => void }) {
  const { t } = useI18n();
  const n = CODEX.filter((e) => unlocked.includes(e.id)).length;
  return (
    <div className="codex" role="dialog" aria-label={t('codex.title')}>
      <div className="codex-card">
        <div className="codex-head">
          <h2>{t('codex.title')}</h2>
          <span className="codex-count">{t('codex.count', { n, m: CODEX.length })}</span>
          <button className="btn" onClick={onClose}>
            {t('codex.close')}
          </button>
        </div>
        <div className="codex-grid">
          {CODEX.map((e) => {
            const open = unlocked.includes(e.id);
            return (
              <article key={e.id} className={`codex-item${open ? '' : ' is-locked'}`}>
                <h3>{open ? t(`tip.${e.tipKey}.t`) : '???'}</h3>
                <p>{open ? t(`tip.${e.tipKey}.x`) : t('codex.locked')}</p>
              </article>
            );
          })}
        </div>
      </div>
    </div>
  );
}
