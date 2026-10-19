import { createContext, useContext, useEffect, useState, type ReactNode } from "react";
import { translate, type CopyKey, type Lang } from "./locale";

type LocaleValue = {
  lang: Lang;
  t: (key: CopyKey, vars?: Record<string, string | number>) => string;
  choose: (lang: Lang) => void;
};

const LocaleContext = createContext<LocaleValue | null>(null);

function writeLang(lang: Lang) {
  document.cookie = `ddr-lang=${lang}; Path=/; Max-Age=31536000; SameSite=Lax`;
  document.cookie = "ddr-lang-choice=1; Path=/; Max-Age=31536000; SameSite=Lax";
  document.documentElement.lang = lang === "en" ? "en" : "pt-BR";
}

export function LocaleProvider({ initial, children }: { initial: Lang; children: ReactNode }) {
  const [lang, setLang] = useState<Lang>(initial);
  useEffect(() => {
    document.documentElement.lang = lang === "en" ? "en" : "pt-BR";
  }, [lang]);
  const value: LocaleValue = {
    lang,
    t: (key, vars) => translate(lang, key, vars),
    choose: (next) => {
      setLang(next);
      writeLang(next);
    },
  };
  return <LocaleContext.Provider value={value}>{children}</LocaleContext.Provider>;
}

export function useLocale(): LocaleValue {
  const value = useContext(LocaleContext);
  if (!value) {
    return { lang: "pt", t: (key, vars) => translate("pt", key, vars), choose: () => {} };
  }
  return value;
}
