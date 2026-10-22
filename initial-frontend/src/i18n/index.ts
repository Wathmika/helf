import i18next from "i18next"
import LanguageDetector from "i18next-browser-languagedetector"
import { initReactI18next } from "react-i18next"

import en from "./locales/en.json"
import si from "./locales/si.json"
import ta from "./locales/ta.json"

export const SUPPORTED_LANGUAGES = ["si", "ta", "en"] as const
export type SupportedLanguage = (typeof SUPPORTED_LANGUAGES)[number]

void i18next
  .use(LanguageDetector)
  .use(initReactI18next)
  .init({
    resources: {
      si: { translation: si },
      ta: { translation: ta },
      en: { translation: en },
    },
    fallbackLng: "si",
    supportedLngs: SUPPORTED_LANGUAGES,
    interpolation: { escapeValue: false },
    detection: {
      order: ["localStorage", "navigator"],
      caches: ["localStorage"],
    },
  })

i18next.on("languageChanged", (lng) => {
  document.documentElement.lang = lng
})

export default i18next
