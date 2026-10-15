import { useTranslation } from "react-i18next"

import { SUPPORTED_LANGUAGES, type SupportedLanguage } from "@/i18n"

const LABELS: Record<SupportedLanguage, string> = {
  si: "සිං",
  ta: "தமிழ்",
  en: "EN",
}

export function LanguageSwitcher({ className = "" }: { className?: string }) {
  const { i18n } = useTranslation()
  const current = i18n.language as SupportedLanguage

  return (
    <div className={`inline-flex rounded-full border border-gray-200 bg-white p-1 ${className}`}>
      {SUPPORTED_LANGUAGES.map((lng) => (
        <button
          key={lng}
          type="button"
          onClick={() => void i18n.changeLanguage(lng)}
          aria-pressed={current === lng}
          className={`rounded-full px-3 py-1 text-sm font-medium transition-colors ${
            current === lng ? "bg-brand-600 text-white" : "text-gray-600 hover:bg-gray-100"
          }`}
        >
          {LABELS[lng]}
        </button>
      ))}
    </div>
  )
}
