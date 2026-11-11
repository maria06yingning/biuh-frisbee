'use client';

import type { DefenseTactic, MatchMode, OffenseTactic } from '@/game/types';
import { useI18n } from '@/i18n/I18nProvider';

export interface PauseResult {
  win: boolean;
  scoreA: number;
  scoreB: number;
  spirit: number;
  calls: { correct: number; wrong: number; self: number; missed: number };
}

/** 菜单里可选的比赛设置（对手战术多一个「随机」） */
export interface MenuSetup {
  mode: MatchMode;
  ourOffense: OffenseTactic;
  ourDefense: DefenseTactic;
  oppOffense: OffenseTactic | 'random';
  oppDefense: DefenseTactic | 'random';
}

export interface PauseMenuProps {
  mode: 'start' | 'paused' | 'over';
  result?: PauseResult | null;
  onResume: () => void;
  onRestart: () => void;
  onExit: () => void;
  onCodex: () => void;
  onTutorial: () => void;
  tutorialSeen: boolean;
  tutDone: boolean;
  setup: MenuSetup;
  onSetup: (s: MenuSetup) => void;
}

const OFF: OffenseTactic[] = ['vstack', 'hstack'];
const DEF: DefenseTactic[] = ['man', 'zone'];

/** 一组互斥的小按钮（radio 语义，键盘 / 读屏可用） */
function Choice<T extends string>({
  label,
  value,
  options,
  onChange,
  render,
}: {
  label: string;
  value: T;
  options: T[];
  onChange: (v: T) => void;
  render: (v: T) => string;
}) {
  return (
    <div className="pause-choice" role="radiogroup" aria-label={label}>
      <span className="pause-choice-label">{label}</span>
      {options.map((o) => (
        <button
          key={o}
          type="button"
          role="radio"
          aria-checked={value === o}
          className={`pause-chip${value === o ? ' is-on' : ''}`}
          onClick={() => onChange(o)}
        >
          {render(o)}
        </button>
      ))}
    </div>
  );
}

export default function PauseMenu({
  mode,
  result,
  onResume,
  onRestart,
  onExit,
  onCodex,
  onTutorial,
  tutorialSeen,
  tutDone,
  setup,
  onSetup,
}: PauseMenuProps) {
  const { t, lang, setLang } = useI18n();
  const title = tutDone ? t('tut.doneTitle') : mode === 'start' ? t('menu.start') : mode === 'paused' ? t('menu.paused') : result?.win ? t('menu.win') : t('menu.lose');
  const seven = setup.mode === '7v7';
  // 开始 / 结束时可以换模式和双方战术；比赛中暂停只能改我方战术（下一分生效）
  const canPickMode = mode !== 'paused' && !tutDone;
  const canPickOpp = mode !== 'paused';
  const set = (patch: Partial<MenuSetup>) => onSetup({ ...setup, ...patch });
  const tac = (v: string) => t(`tac.${v}`);

  return (
    <div className="pause">
      <div className="pause-card">
        <button className="btn lang-btn" onClick={() => setLang(lang === 'zh' ? 'en' : 'zh')}>
          {t('lang.toggle')}
        </button>
        <h2>{title}</h2>
        {tutDone && <p className="pause-final">{t('tut.doneText')}</p>}
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

        <div className="pause-setup">
          {canPickMode && (
            <Choice
              label={t('mode.title')}
              value={setup.mode}
              options={['3v3', '7v7'] as MatchMode[]}
              onChange={(v) => set({ mode: v })}
              render={(v) => t(`mode.${v}`)}
            />
          )}
          {canPickMode && <p className="pause-setup-note">{t(seven ? 'mode.7v7.d' : 'mode.3v3.d')}</p>}
          {seven && (
            <>
              <Choice label={t('tac.ourOff')} value={setup.ourOffense} options={OFF} onChange={(v) => set({ ourOffense: v })} render={tac} />
              <Choice label={t('tac.ourDef')} value={setup.ourDefense} options={DEF} onChange={(v) => set({ ourDefense: v })} render={tac} />
              {canPickOpp && (
                <>
                  <Choice
                    label={t('tac.oppOff')}
                    value={setup.oppOffense}
                    options={[...OFF, 'random'] as (OffenseTactic | 'random')[]}
                    onChange={(v) => set({ oppOffense: v })}
                    render={tac}
                  />
                  <Choice
                    label={t('tac.oppDef')}
                    value={setup.oppDefense}
                    options={[...DEF, 'random'] as (DefenseTactic | 'random')[]}
                    onChange={(v) => set({ oppDefense: v })}
                    render={tac}
                  />
                </>
              )}
              {mode === 'paused' && <p className="pause-setup-note">{t('tac.note')}</p>}
            </>
          )}
        </div>

        <div className="pause-actions">
          {tutDone ? (
            <button className="btn btn-primary" onClick={onRestart}>
              {t('menu.startMatch')}
            </button>
          ) : (
            <>
              {mode === 'start' && (
                <button className={tutorialSeen ? 'btn' : 'btn btn-primary'} onClick={onTutorial}>
                  {t('menu.tutorial')}
                </button>
              )}
              {mode !== 'over' && (
                <button className={mode === 'start' && !tutorialSeen ? 'btn' : 'btn btn-primary'} onClick={onResume}>
                  {mode === 'start' ? t('menu.startBtn') : t('menu.resume')}
                </button>
              )}
              {mode !== 'start' && (
                <button className={mode === 'over' ? 'btn btn-primary' : 'btn'} onClick={onRestart}>
                  {mode === 'over' ? t('menu.again') : t('menu.restart')}
                </button>
              )}
            </>
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
          <span>{seven ? <><kbd>1</kbd>–<kbd>6</kbd> {t('ctl.pass7')}</> : <><kbd>1</kbd><kbd>2</kbd> {t('ctl.pass')}</>}</span>
          <span>{t('ctl.charge')}</span>
          <span><kbd>Q</kbd> / <kbd>E</kbd> {t('ctl.curve')}</span>
          <span><kbd>A</kbd><kbd>D</kbd> {t('ctl.step')}</span>
          <span><kbd>V</kbd> {t('ctl.fake')}</span>
          <span><kbd>F</kbd> {t('ctl.call')}</span>
          <span><kbd>Esc</kbd> {t('ctl.pause')}</span>
          <span><kbd>M</kbd> {t('ctl.sound')}</span>
        </div>

        <p className="pause-rules">{t('menu.rules')}</p>
      </div>
    </div>
  );
}
