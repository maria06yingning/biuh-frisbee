'use client';

import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';
import { translate, type Lang, type Params } from './dict';

interface I18nValue {
  lang: Lang;
  setLang: (l: Lang) => void;
  t: (key: string, params?: Params) => string;
}

const I18nContext = createContext<I18nValue>({ lang: 'zh', setLang: () => undefined, t: (k) => k });

export function I18nProvider({ children }: { children: ReactNode }) {
  const [lang, setLangState] = useState<Lang>('zh');

  // 首次进入：优先用上次的选择，否则跟随浏览器语言
  useEffect(() => {
    try {
      const saved = localStorage.getItem('ufo-lang');
      if (saved === 'zh' || saved === 'en') setLangState(saved);
      else if (!navigator.language.toLowerCase().startsWith('zh')) setLangState('en');
    } catch {
      /* 隐私模式等：忽略 */
    }
  }, []);

  useEffect(() => {
    document.documentElement.lang = lang === 'zh' ? 'zh-CN' : 'en';
  }, [lang]);

  const setLang = useCallback((l: Lang) => {
    setLangState(l);
    try {
      localStorage.setItem('ufo-lang', l);
    } catch {
      /* ignore */
    }
  }, []);

  const t = useCallback((key: string, params?: Params) => translate(lang, key, params), [lang]);
  const value = useMemo(() => ({ lang, setLang, t }), [lang, setLang, t]);
  return <I18nContext.Provider value={value}>{children}</I18nContext.Provider>;
}

export function useI18n(): I18nValue {
  return useContext(I18nContext);
}
