"use client";

import type { ReactNode } from "react";
import { createContext, useContext } from "react";
import type { AppLocale } from "./config";
import { en } from "./en";
import { getMessages, type Messages } from "./index";

const LocaleContext = createContext<{ locale: AppLocale; m: Messages }>({
  locale: "en",
  m: en,
});

export function LocaleProvider({
  locale,
  children,
}: {
  locale: AppLocale;
  children: ReactNode;
}) {
  return (
    <LocaleContext.Provider value={{ locale, m: getMessages(locale) }}>
      {children}
    </LocaleContext.Provider>
  );
}

export function useI18n() {
  return useContext(LocaleContext);
}
