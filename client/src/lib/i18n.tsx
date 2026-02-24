import React, { createContext, useContext, useMemo, useState } from "react";
import { ru } from "./ru";
import { uz } from "./uz";

type LangCode = "ru" | "uz";
const dictionaries = { ru, uz };

type I18nContextValue = {
  lang: LangCode;
  setLang: (l: LangCode) => void;
  t: (key: keyof typeof ru) => string;
};

const I18nContext = createContext<I18nContextValue | null>(null);

export function I18nProvider({ children }: { children: React.ReactNode }) {
  const [lang, setLang] = useState<LangCode>(
    (localStorage.getItem("lang") as LangCode) || "ru"
  );

  const value = useMemo(() => ({
    lang,
    setLang: (l: LangCode) => {
      localStorage.setItem("lang", l);
      setLang(l);
    },
    t: (key: keyof typeof ru) => {
      // @ts-ignore
      return dictionaries[lang][key] || key;
    },
  }), [lang]);

  return <I18nContext.Provider value={value}>{children}</I18nContext.Provider>;
}

export function useI18n() {
  const ctx = useContext(I18nContext);
  if (!ctx) throw new Error("useI18n must be used within I18nProvider");
  return ctx;
}