import { useState, type FormEvent } from "react"
import { useTranslation } from "react-i18next"
import { useNavigate } from "react-router-dom"

import { isValidEmail } from "@/auth/emailRules"
import { ALLOWED_COUNTRIES, validatePhone } from "@/auth/phoneRules"
import { Button } from "@/components/Button"
import { supabase } from "@/lib/supabase"
import { AuthLayout } from "@/pages/auth/AuthLayout"

const inputClasses =
  "w-full rounded-xl border border-gray-200 bg-white px-4 py-3 text-base text-gray-900 placeholder:text-gray-400 focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-100"

type LoginMethod = "phone" | "email"

/**
 * Phone OTP and email OTP are independent, passwordless sign-in methods —
 * picking one here just decides which Supabase Auth identity gets created
 * or signed into; there's no linking between a phone account and an email
 * account for the same person.
 */
export function LoginEntry() {
  const { t } = useTranslation()
  const navigate = useNavigate()
  const [method, setMethod] = useState<LoginMethod>("phone")

  const [dialCode, setDialCode] = useState("94")
  const [localNumber, setLocalNumber] = useState("")
  const [email, setEmail] = useState("")

  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)

  function selectMethod(next: LoginMethod) {
    setMethod(next)
    setError(null)
  }

  async function handlePhoneSubmit(e: FormEvent) {
    e.preventDefault()
    setError(null)

    const result = validatePhone(dialCode, localNumber)
    if (!result.valid) {
      setError(t(`auth.phone.errors.${result.errorKey}`))
      return
    }

    setLoading(true)
    try {
      const { error: otpError } = await supabase.auth.signInWithOtp({ phone: result.e164 })
      if (otpError) {
        setError(t("auth.phone.errors.sendFailed"))
        return
      }
      navigate("/login/verify", { state: { phone: result.e164 } })
    } catch {
      setError(t("auth.phone.errors.sendFailed"))
    } finally {
      setLoading(false)
    }
  }

  async function handleEmailSubmit(e: FormEvent) {
    e.preventDefault()
    setError(null)

    const trimmed = email.trim()
    if (!isValidEmail(trimmed)) {
      setError(t("auth.email.errors.invalid"))
      return
    }

    setLoading(true)
    try {
      const { error: otpError } = await supabase.auth.signInWithOtp({ email: trimmed })
      if (otpError) {
        setError(t("auth.email.errors.sendFailed"))
        return
      }
      navigate("/login/verify", { state: { email: trimmed } })
    } catch {
      setError(t("auth.email.errors.sendFailed"))
    } finally {
      setLoading(false)
    }
  }

  const tabClasses = (active: boolean) =>
    `rounded-lg px-3 py-2 text-sm font-medium transition-colors ${
      active ? "bg-white text-brand-700 shadow-sm" : "text-gray-500"
    }`

  return (
    <AuthLayout>
      <div className="mb-5 grid grid-cols-2 gap-1 rounded-xl bg-gray-100 p-1">
        <button
          type="button"
          onClick={() => selectMethod("phone")}
          aria-pressed={method === "phone"}
          className={tabClasses(method === "phone")}
        >
          {t("auth.methodSelect.phoneTab")}
        </button>
        <button
          type="button"
          onClick={() => selectMethod("email")}
          aria-pressed={method === "email"}
          className={tabClasses(method === "email")}
        >
          {t("auth.methodSelect.emailTab")}
        </button>
      </div>

      {method === "phone" ? (
        <>
          <h1 className="text-2xl font-bold text-gray-900">{t("auth.phone.title")}</h1>
          <p className="mt-2 text-sm text-gray-600">{t("auth.phone.subtitle")}</p>

          <form className="mt-6 space-y-4" onSubmit={handlePhoneSubmit}>
            <div>
              <label htmlFor="country" className="mb-1.5 block text-sm font-medium text-gray-700">
                {t("auth.phone.countryLabel")}
              </label>
              <select
                id="country"
                className={inputClasses}
                value={dialCode}
                onChange={(e) => setDialCode(e.target.value)}
              >
                {ALLOWED_COUNTRIES.map((c) => (
                  <option key={c.dialCode} value={c.dialCode}>
                    +{c.dialCode} {c.name}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label htmlFor="phone" className="mb-1.5 block text-sm font-medium text-gray-700">
                {t("auth.phone.numberLabel")}
              </label>
              <input
                id="phone"
                type="tel"
                inputMode="tel"
                autoComplete="tel-national"
                className={inputClasses}
                placeholder={t("auth.phone.numberPlaceholder")}
                value={localNumber}
                onChange={(e) => setLocalNumber(e.target.value)}
              />
            </div>

            {error && <p className="text-sm text-danger-600">{error}</p>}

            <Button type="submit" size="lg" className="w-full" disabled={loading || !localNumber}>
              {loading ? t("auth.phone.sending") : t("auth.phone.continueCta")}
            </Button>
          </form>
        </>
      ) : (
        <>
          <h1 className="text-2xl font-bold text-gray-900">{t("auth.email.title")}</h1>
          <p className="mt-2 text-sm text-gray-600">{t("auth.email.subtitle")}</p>

          <form className="mt-6 space-y-4" onSubmit={handleEmailSubmit}>
            <div>
              <label htmlFor="email" className="mb-1.5 block text-sm font-medium text-gray-700">
                {t("auth.email.emailLabel")}
              </label>
              <input
                id="email"
                type="email"
                inputMode="email"
                autoComplete="email"
                className={inputClasses}
                placeholder={t("auth.email.emailPlaceholder")}
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />
            </div>

            {error && <p className="text-sm text-danger-600">{error}</p>}

            <Button type="submit" size="lg" className="w-full" disabled={loading || !email}>
              {loading ? t("auth.email.sending") : t("auth.email.continueCta")}
            </Button>
          </form>
        </>
      )}
    </AuthLayout>
  )
}
