import i18n from 'i18next'
import { initReactI18next } from 'react-i18next'
import LanguageDetector from 'i18next-browser-languagedetector'

import en from './locales/en.json'
import si from './locales/si.json'
import ta from './locales/ta.json'

// Sinhala/Tamil strings here are a first draft, not reviewed by a native
// speaker yet — see docs/frontend-features.md §9 and the architecture doc's
// open items. Flag this to a native speaker before launch.
void i18n
  .use(LanguageDetector)
  .use(initReactI18next)
  .init({
    resources: {
      si: { translation: si },
      ta: { translation: ta },
      en: { translation: en },
    },
    fallbackLng: 'si',
    supportedLngs: ['si', 'ta', 'en'],
    interpolation: { escapeValue: false },
  })

export default i18n
