import { useEffect, useState, type FormEvent } from "react"
import { useTranslation } from "react-i18next"
import { Navigate, useLocation, useNavigate } from "react-router-dom"

import { maskEmail } from "@/auth/emailRules"
import { maskPhone } from "@/auth/phoneRules"
import { Button } from "@/components/Button"
import { supabase } from "@/lib/supabase"
import { AuthLayout } from "@/pages/auth/AuthLayout"

const RESEND_COOLDOWN_SECONDS = 60

const inputClasses =
  "w-full rounded-xl border border-gray-200 bg-white px-4 py-3 text-center text-2xl tracking-[0.5em] text-gray-900 placeholder:tracking-normal placeholder:text-base placeholder:text-gray-400 focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-100"

/**
 * Verifies either a phone OTP or an email OTP, depending on which one
 * LoginEntry sent us here for — phone and email are independent sign-in
 * methods (see auth/emailRules.ts), not two steps of the same account.
 */
export function OtpEntry() {
  const { t } = useTranslation()
  const navigate = useNavigate()
  const location = useLocation()
  const state = location.state as { phone?: string; email?: string } | null
  const phone = state?.phone
  const email = state?.email

  const [code, setCode] = useState("")
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const [resending, setResending] = useState(false)
  const [cooldown, setCooldown] = useState(RESEND_COOLDOWN_SECONDS)

  useEffect(() => {
    if (cooldown <= 0) return
    const id = setInterval(() => setCooldown((s) => s - 1), 1000)
    return () => clearInterval(id)
  }, [cooldown])

  if (!phone && !email) {
    return <Navigate to="/login" replace />
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault()
    setError(null)
    setLoading(true)
    try {
      // Guarded by the `if (!phone && !email)` early return above, which TS can't see into this closure.
      const { error: verifyError } = phone
        ? await supabase.auth.verifyOtp({ phone: phone!, token: code, type: "sms" })
        : await supabase.auth.verifyOtp({ email: email!, token: code, type: "email" })

      if (verifyError) {
        setError(t("auth.otp.errors.invalidCode"))
        return
      }
      navigate("/app", { replace: true })
    } catch {
      setError(t("auth.otp.errors.invalidCode"))
    } finally {
      setLoading(false)
    }
  }

  async function handleResend() {
    setResending(true)
    try {
      const { error: otpError } = phone
        ? await supabase.auth.signInWithOtp({ phone: phone! })
        : await supabase.auth.signInWithOtp({ email: email! })
      if (!otpError) setCooldown(RESEND_COOLDOWN_SECONDS)
    } finally {
      setResending(false)
    }
  }

  const destination = phone ? maskPhone(phone) : maskEmail(email!)

  return (
    <AuthLayout>
      <h1 className="text-2xl font-bold text-gray-900">{t("auth.otp.title")}</h1>
      <p className="mt-2 text-sm text-gray-600">
        {t("auth.otp.subtitle", { destination })}
      </p>

      <form className="mt-6 space-y-4" onSubmit={handleSubmit}>
        <div>
          <label htmlFor="code" className="mb-1.5 block text-sm font-medium text-gray-700">
            {t("auth.otp.codeLabel")}
          </label>
          <input
            id="code"
            type="text"
            inputMode="numeric"
            autoComplete="one-time-code"
            maxLength={6}
            className={inputClasses}
            placeholder="······"
            value={code}
            onChange={(e) => setCode(e.target.value.replace(/\D/g, "").slice(0, 6))}
          />
        </div>

        {error && <p className="text-sm text-danger-600">{error}</p>}

        <Button type="submit" size="lg" className="w-full" disabled={loading || code.length !== 6}>
          {loading ? t("auth.otp.verifying") : t("auth.otp.verifyCta")}
        </Button>
      </form>

      <div className="mt-5 flex flex-col items-center gap-2 text-sm">
        <button
          type="button"
          onClick={handleResend}
          disabled={cooldown > 0 || resending}
          className="font-medium text-brand-700 disabled:text-gray-400"
        >
          {cooldown > 0 ? t("auth.otp.resendCooldown", { seconds: cooldown }) : t("auth.otp.resendCta")}
        </button>
        <button type="button" onClick={() => navigate("/login")} className="text-gray-500">
          {t(phone ? "auth.otp.changeNumber" : "auth.otp.changeEmail")}
        </button>
      </div>
    </AuthLayout>
  )
}
