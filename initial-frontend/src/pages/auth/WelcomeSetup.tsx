import { useState, type FormEvent } from "react"
import { useTranslation } from "react-i18next"
import { useNavigate } from "react-router-dom"

import { useAuth } from "@/auth/AuthContext"
import { Button } from "@/components/Button"
import { supabase } from "@/lib/supabase"
import { SUPPORTED_LANGUAGES, type SupportedLanguage } from "@/i18n"
import { AuthLayout } from "@/pages/auth/AuthLayout"
import { LIMITS } from "@/types/database"

const inputClasses =
  "w-full rounded-xl border border-gray-200 bg-white px-4 py-3 text-base text-gray-900 placeholder:text-gray-400 focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-100"

const LANGUAGE_LABELS: Record<SupportedLanguage, string> = {
  si: "සිංහල",
  ta: "தமிழ்",
  en: "English",
}

export function WelcomeSetup() {
  const { t, i18n } = useTranslation()
  const navigate = useNavigate()
  const { user, refreshAppUser } = useAuth()

  const [name, setName] = useState("")
  const [language, setLanguage] = useState<SupportedLanguage>(
    (i18n.language as SupportedLanguage) ?? "si",
  )
  const [error, setError] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)

  async function handleSubmit(e: FormEvent) {
    e.preventDefault()
    if (!user) return

    setError(null)
    setSaving(true)

    const { error: updateError } = await supabase
      .from("app_users")
      .update({ display_name: name.trim(), preferred_language: language })
      .eq("id", user.id)

    setSaving(false)

    if (updateError) {
      setError(t("auth.welcome.errors.saveFailed"))
      return
    }

    await refreshAppUser()
    void i18n.changeLanguage(language)
    navigate("/app", { replace: true })
  }

  return (
    <AuthLayout>
      <h1 className="text-2xl font-bold text-gray-900">{t("auth.welcome.title")}</h1>
      <p className="mt-2 text-sm text-gray-600">{t("auth.welcome.subtitle")}</p>

      <form className="mt-6 space-y-4" onSubmit={handleSubmit}>
        <div>
          <label htmlFor="name" className="mb-1.5 block text-sm font-medium text-gray-700">
            {t("auth.welcome.nameLabel")}
          </label>
          <input
            id="name"
            type="text"
            autoComplete="name"
            maxLength={LIMITS.appUserDisplayName}
            className={inputClasses}
            placeholder={t("auth.welcome.namePlaceholder")}
            value={name}
            onChange={(e) => setName(e.target.value)}
          />
        </div>

        <div>
          <p className="mb-1.5 block text-sm font-medium text-gray-700">{t("auth.welcome.languageLabel")}</p>
          <div className="grid grid-cols-3 gap-2">
            {SUPPORTED_LANGUAGES.map((lng) => (
              <button
                key={lng}
                type="button"
                onClick={() => setLanguage(lng)}
                aria-pressed={language === lng}
                className={`rounded-xl border px-3 py-2.5 text-sm font-medium transition-colors ${
                  language === lng
                    ? "border-brand-600 bg-brand-50 text-brand-700"
                    : "border-gray-200 text-gray-600"
                }`}
              >
                {LANGUAGE_LABELS[lng]}
              </button>
            ))}
          </div>
        </div>

        {error && <p className="text-sm text-danger-600">{error}</p>}

        <Button type="submit" size="lg" className="w-full" disabled={saving || !name.trim()}>
          {saving ? t("auth.welcome.saving") : t("auth.welcome.continueCta")}
        </Button>
      </form>
    </AuthLayout>
  )
}
