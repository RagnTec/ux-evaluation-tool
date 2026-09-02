import React, { createContext, useContext, useState, useEffect, useMemo, ReactNode } from "react";
import type { Locale, I18nContextValue } from "./types";
import { zhCN } from "./locales/zh-CN";
import { en } from "./locales/en";

export type { Locale, I18nContextValue };

const STORAGE_KEY = "ux_eval_locale";

const DICTIONARIES: Record<Locale, Record<string, string>> = {
  "zh-CN": zhCN,
  en: en
};

/**
 * Resolves initial locale based on:
 * 1. localStorage persisted user preference
 * 2. navigator.language (starts with "zh" -> "zh-CN", otherwise -> "en")
 */
export function getInitialLocale(): Locale {
  try {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved === "en" || saved === "zh-CN") {
      return saved;
    }
  } catch {
    // Ignore localStorage read errors
  }

  if (typeof navigator !== "undefined" && navigator.language) {
    const lang = navigator.language.toLowerCase();
    if (lang.startsWith("zh")) {
      return "zh-CN";
    }
  }

  return "zh-CN"; // Default to zh-CN for native project alignment
}

/**
 * Persists user locale choice in localStorage (UI preference only).
 */
export function setSavedLocale(locale: Locale): void {
  try {
    localStorage.setItem(STORAGE_KEY, locale);
  } catch {
    // Ignore localStorage write errors
  }
}

/**
 * Pure translation function with lightweight token interpolation {key}.
 */
export function translate(
  locale: Locale,
  key: string,
  params?: Record<string, string | number | boolean | null | undefined>
): string {
  const dict = DICTIONARIES[locale] || DICTIONARIES["zh-CN"];
  let text = dict[key] || DICTIONARIES["zh-CN"][key] || key;

  if (params) {
    Object.entries(params).forEach(([paramKey, paramVal]) => {
      const placeholder = `{${paramKey}}`;
      text = text.split(placeholder).join(String(paramVal ?? ""));
    });
  }

  return text;
}

export const I18nContext = createContext<I18nContextValue>({
  locale: "zh-CN",
  setLocale: () => {},
  t: (key, params) => translate("zh-CN", key, params)
});

export const I18nProvider: React.FC<{
  children: ReactNode;
  initialLocale?: Locale;
  onLocaleChange?: (locale: Locale) => void;
}> = ({ children, initialLocale, onLocaleChange }) => {
  const [locale, setLocaleState] = useState<Locale>(() => initialLocale || getInitialLocale());

  const setLocale = (newLocale: Locale) => {
    setLocaleState(newLocale);
    setSavedLocale(newLocale);
    if (onLocaleChange) {
      onLocaleChange(newLocale);
    }
  };

  const t = useMemo(() => {
    return (key: string, params?: Record<string, string | number | boolean | null | undefined>) =>
      translate(locale, key, params);
  }, [locale]);

  const value = useMemo(
    () => ({
      locale,
      setLocale,
      t
    }),
    [locale, t]
  );

  return <I18nContext.Provider value={value}>{children}</I18nContext.Provider>;
};

export function useI18n(): I18nContextValue {
  return useContext(I18nContext);
}
