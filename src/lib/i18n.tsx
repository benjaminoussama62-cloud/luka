"use client";

import {
  createContext,
  useContext,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import type { LangCode } from "./types";

const DICT: Record<LangCode, Record<string, string>> = {
  fr: {
    signIn: "Se connecter",
    search: "Recherche",
    tools: "Outils",
    web: "Web",
    images: "Images",
    videos: "Vidéos",
    news: "News",
    maps: "Maps",
    shopping: "Shopping",
    community: "Communauté",
    reading: "Lecture",
    context: "Contexte",
    didYouMean: "Essayez avec :",
    results: "résultats live",
    continue: "Continuer",
    tagline:
      "Ayeba agrège le web entier et fait remonter les voix locales — institutions, presse, savoir — sans étouffer le reste du monde.",
  },
  ln: {
    signIn: "Kota",
    search: "Boluka",
    tools: "Bisaleli",
    web: "Web",
    images: "Bilili",
    videos: "Ba vidéo",
    news: "Sango",
    maps: "Carte",
    shopping: "Somba",
    community: "Lingomba",
    reading: "Tanga",
    context: "Context",
    didYouMean: "Meka na :",
    results: "ba résultat",
    continue: "Koba",
    tagline:
      "Ayeba ezali koluka na internet mobimba mpe epesaka ntina mingi na ba source ya RDC — mpo na koyeba malamu.",
  },
  sw: {
    signIn: "Ingia",
    search: "Tafuta",
    tools: "Zana",
    web: "Wavuti",
    images: "Picha",
    videos: "Video",
    news: "Habari",
    maps: "Ramani",
    shopping: "Nunua",
    community: "Jamii",
    reading: "Soma",
    context: "Muktadha",
    didYouMean: "Jaribu:",
    results: "matokeo",
    continue: "Endelea",
    tagline:
      "Ayeba inatafuta mtandao mzima na kuipa uzito vyanzo vya DRC — bila kuficha ulimwengu.",
  },
  en: {
    signIn: "Sign in",
    search: "Search",
    tools: "Tools",
    web: "Web",
    images: "Images",
    videos: "Videos",
    news: "News",
    maps: "Maps",
    shopping: "Shopping",
    community: "Community",
    reading: "Reading",
    context: "Context",
    didYouMean: "Did you mean:",
    results: "live results",
    continue: "Related",
    tagline:
      "Ayeba aggregates live sources — encyclopedias, press, institutions — then ranks what is worth reading. When the topic touches the DRC, local voices rise without hiding the world.",
  },
};

type I18nState = {
  lang: LangCode;
  setLang: (l: LangCode) => void;
  t: (key: string) => string;
};

const Ctx = createContext<I18nState | null>(null);

export function I18nProvider({ children }: { children: ReactNode }) {
  const [lang, setLang] = useState<LangCode>("fr");
  const value = useMemo(
    () => ({
      lang,
      setLang,
      t: (key: string) => DICT[lang][key] ?? DICT.fr[key] ?? key,
    }),
    [lang],
  );
  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useI18n() {
  const ctx = useContext(Ctx);
  if (!ctx) throw new Error("useI18n missing");
  return ctx;
}
