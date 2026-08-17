import { createContext, useContext, type ReactNode } from "react";

import { dictionaries, type DemoLocaleDict, type LocaleCode } from "../i18n/index.js";

export interface DemoLocaleContextValue {
  locale: LocaleCode;
  dict: DemoLocaleDict;
}

const DemoLocaleContext = createContext<DemoLocaleContextValue>({
  locale: "en-US",
  dict: dictionaries["en-US"],
});

export function DemoLocaleProvider({
  locale,
  children,
}: {
  locale: LocaleCode;
  children: ReactNode;
}) {
  return (
    <DemoLocaleContext.Provider value={{ locale, dict: dictionaries[locale] }}>
      {children}
    </DemoLocaleContext.Provider>
  );
}

export function useDemoLocale(): DemoLocaleContextValue {
  return useContext(DemoLocaleContext);
}
