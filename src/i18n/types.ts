export type Locale = "en" | "zh-CN";

export interface I18nContextValue {
  locale: Locale;
  setLocale: (locale: Locale) => void;
  t: (key: string, params?: Record<string, string | number | boolean | null | undefined>) => string;
}
