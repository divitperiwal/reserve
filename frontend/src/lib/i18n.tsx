import { createContext, useCallback, useContext, useMemo, useState, type ReactNode } from 'react';
import { hi } from '../locales/hi';
import { ta } from '../locales/ta';

export type Lang = 'en' | 'ta' | 'hi';
export type Vars = Record<string, string | number>;
export type T = (text: string, vars?: Vars) => string;

const LANG_KEY = 'reserve.lang';
const dicts: Record<Lang, Record<string, string> | null> = { en: null, ta, hi };
const warned = new Set<string>();

export const isLang = (v: unknown): v is Lang => v === 'en' || v === 'ta' || v === 'hi';

export const fill: T = (text, vars) => (vars ? text.replace(/\{(\w+)\}/g, (m, k: string) => (k in vars ? String(vars[k]) : m)) : text);

// Looks up the English source text in the language's dictionary, falling back to English
export function translate(lang: Lang, text: string, vars?: Vars, dict = dicts[lang]) {
  const hit = dict?.[text];
  if (dict && hit === undefined && import.meta.env.DEV && !warned.has(`${lang}:${text}`)) {
    warned.add(`${lang}:${text}`);
    console.warn(`[i18n] missing ${lang}: ${text}`);
  }
  return fill(hit ?? text, vars);
}

const langStore = {
  get: (): Lang => {
    try {
      const v = localStorage.getItem(LANG_KEY);
      return isLang(v) ? v : 'en';
    } catch {
      return 'en';
    }
  },
  set: (l: Lang) => {
    try {
      localStorage.setItem(LANG_KEY, l);
    } catch {
      /* storage unavailable */
    }
  },
};

let current: Lang = langStore.get();

// Date and time locale for the current UI language, e.g. ta-IN
export const dateLocale = () => `${current}-IN`;

function apply(l: Lang) {
  current = l;
  if (typeof document !== 'undefined') document.documentElement.lang = l;
}

const Ctx = createContext<{ lang: Lang; setLang: (l: Lang) => void }>({ lang: 'en', setLang: () => {} });

export function I18nProvider({ children }: { children: ReactNode }) {
  const [lang, setState] = useState<Lang>(() => {
    apply(current);
    return current;
  });
  const setLang = useCallback((l: Lang) => {
    apply(l);
    langStore.set(l);
    setState(l);
  }, []);
  const value = useMemo(() => ({ lang, setLang }), [lang, setLang]);
  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useLang(): [Lang, (l: Lang) => void] {
  const { lang, setLang } = useContext(Ctx);
  return [lang, setLang];
}

export function useT(): T {
  const { lang } = useContext(Ctx);
  return useCallback((text: string, vars?: Vars) => translate(lang, text, vars), [lang]);
}
