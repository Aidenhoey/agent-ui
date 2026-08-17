import { createContext, useContext } from "react";

import { componentDictionaries } from "./library.js";
import type { LocaleCode, LocaleDict } from "./library.js";

export const localeDictionaries = componentDictionaries;

export interface LocaleContextValue {
  locale: LocaleCode;
  dict: LocaleDict;
}

const LocaleContext = createContext<LocaleContextValue>({
  locale: "en-US",
  dict: componentDictionaries["en-US"],
});

export interface LocaleProviderProps {
  locale: LocaleCode;
  /** Deep-partial dictionary merged over the built-in one for this locale. */
  dictionary?: Partial<LocaleDict>;
  children: React.ReactNode;
}

/**
 * Provides UI copy to all agent components. Components never hardcode text:
 * they read from this context and accept per-instance `labels` overrides.
 */
export function LocaleProvider({ locale, dictionary, children }: LocaleProviderProps) {
  const base = componentDictionaries[locale];
  const dict = dictionary ? deepMerge(base, dictionary) : base;
  return <LocaleContext.Provider value={{ locale, dict }}>{children}</LocaleContext.Provider>;
}

export function useLocale(): LocaleContextValue {
  return useContext(LocaleContext);
}

/** Fills `{placeholder}` tokens in a dictionary string. */
export function interpolate(template: string, vars: Record<string, string | number>): string {
  return template.replace(/\{(\w+)\}/g, (match, key: string) =>
    key in vars ? String(vars[key]) : match,
  );
}

function isPlainObject(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function deepMerge<T>(base: T, override: Partial<T>): T {
  if (!isPlainObject(base) || !isPlainObject(override)) {
    return (override === undefined ? base : override) as T;
  }
  const result: Record<string, unknown> = { ...base };
  for (const [key, value] of Object.entries(override)) {
    if (value === undefined) continue;
    const baseValue = (base as Record<string, unknown>)[key];
    result[key] = isPlainObject(baseValue) && isPlainObject(value) ? deepMerge(baseValue, value) : value;
  }
  return result as T;
}
