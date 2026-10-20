'use client';

import { useI18n } from '@/i18n/I18nProvider';

export interface PauseResult {
  win: boolean;
  scoreA: number;
  scoreB: number;
  spirit: number;
  calls: { correct: number; wrong: number; self: number; missed: number };
}

export interface PauseMenuProps {
  mode: 'start' | 'paused' | 'over';
  result?: PauseResult | null;
  onResume: () => void;
  onRestart: () => void;
  onExit: () => void;
  onCodex: () => void;
}

export default function PauseMenu({ mode, result, onResume, onRestart, onExit, onCodex }: PauseMenuProps) {
  const { t, lang, setLang } = useI18n();
  const title = mode === 'start' ? t('menu.start') : mode === 'paused' ? t('menu.paused') : result?.win ? t('menu.win') : t('menu.lose');

  return (
    <div className="pause">
      <div className="pause-card">
        <button className="btn lang-btn" onClick={() => setLang(lang === 'zh' ? 'en' : 'zh')}>
          {t('lang.toggle')}
        </button>
        <h2>{title}</h2>
        {mode === 'over' && result && (
          <>
            <p className="pause-final">{t('menu.final', { a: result.scoreA, b: result.scoreB })}</p>
            <p className="pause-spirit">
              <b>{t('menu.spirit', { n: result.spirit })}</b>
              <br />
              <span>
                {t('menu.spiritDetail', {
                  c: result.calls.correct,
                  w: result.calls.wrong,
                  s: result.calls.self,
                  m: result.calls.missed,
                })}
              </span>
            </p>
          </>
        )}

        <div className="pause-actions">
          {mode !== 'over' && (
            <button className="btn btn-primary" onClick={onResume}>
              {mode === 'start' ? t('menu.startBtn') : t('menu.resume')}
            </button>
          )}
          {mode !== 'start' && (
            <button className={mode === 'over' ? 'btn btn-primary' : 'btn'} onClick={onRestart}>
              {mode === 'over' ? t('menu.again') : t('menu.restart')}
            </button>
          )}
          <button className="btn" onClick={onCodex}>
            {t('menu.codex')}
          </button>
          <button className="btn btn-ghost" onClick={onExit}>
            {t('menu.exit')}
          </button>
        </div>

        <div className="pause-controls">
          <span><kbd>W</kbd><kbd>A</kbd><kbd>S</kbd><kbd>D</kbd> {t('ctl.move')}</span>
          <span>{t('ctl.look')}</span>
          <span><kbd>Shift</kbd> {t('ctl.sprint')}</span>
          <span><kbd>1</kbd><kbd>2</kbd> {t('ctl.pass')}</span>
          <span>{t('ctl.charge')}</span>
          <span><kbd>Q</kbd> / <kbd>E</kbd> {t('ctl.curve')}</span>
          <span><kbd>A</kbd><kbd>D</kbd> {t('ctl.step')}</span>
          <span><kbd>V</kbd> {t('ctl.fake')}</span>
          <span><kbd>F</kbd> {t('ctl.call')}</span>
          <span><kbd>Esc</kbd> {t('ctl.pause')}</span>
        </div>

        <p className="pause-rules">{t('menu.rules')}</p>
      </div>
    </div>
  );
}
