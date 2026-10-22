import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { ArrowRight, Mail } from 'lucide-react'
import { AuthLayout } from '../../components/AuthLayout'
import { Button } from '../../components/ui'
import { supabase } from '../../lib/supabase'
import { buildPhone, COUNTRY_OPTIONS, toE164, type PhoneProblem } from '../../lib/phone'
import { authErrorKey } from '../../lib/authErrors'

const PROBLEM_KEY: Record<PhoneProblem, string> = {
  srilankaMobile: 'auth.errorSriLankaMobile',
  tooShort: 'auth.errorPhoneShort',
  country: 'auth.errorDisallowedCountry',
}

export function PhoneEntry() {
  const { t } = useTranslation()
  const navigate = useNavigate()
  const [country, setCountry] = useState('94')
  const [phone, setPhone] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [sending, setSending] = useState(false)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    const { digits, problem } = buildPhone(country, phone)
    if (problem) {
      setError(t(PROBLEM_KEY[problem]))
      return
    }

    setError(null)
    const e164 = toE164(digits)

    if (!supabase) {
      // Demo mode — no backend, so go straight to the code screen.
      navigate('/login/otp', { state: { destination: e164, channel: 'phone' } })
      return
    }

    setSending(true)
    const { error: otpError } = await supabase.auth.signInWithOtp({ phone: e164 })
    setSending(false)
    if (otpError) {
      setError(t(authErrorKey(otpError)))
      return
    }
    navigate('/login/otp', { state: { destination: e164, channel: 'phone' } })
  }

  return (
    <AuthLayout title={t('auth.phoneTitle')} subtitle={t('auth.phoneSubtitle')}>
      <form onSubmit={handleSubmit} noValidate>
        <label htmlFor="phone" className="block text-[14px] font-semibold mb-2">
          {t('auth.phoneLabel')}
        </label>
        <div
          className={`flex h-[56px] rounded-[var(--radius-ctl)] border-[1.5px] bg-[var(--surface)] transition-colors focus-within:ring-4 ${
            error
              ? 'border-[var(--negative)] focus-within:ring-[var(--negative-soft)]'
              : 'border-[var(--border)] focus-within:border-[var(--accent)] focus-within:ring-[var(--accent-soft)]'
          }`}
        >
          <select
            aria-label={t('auth.countryLabel')}
            value={country}
            onChange={(e) => setCountry(e.target.value)}
            className="flex-none h-full pl-4 pr-2 bg-transparent text-[15px] font-bold rounded-l-[var(--radius-ctl)] outline-none focus-visible:outline-none border-r border-[var(--rule)] cursor-pointer"
          >
            {COUNTRY_OPTIONS.map((c) => (
              <option key={c.code} value={c.code}>
                {c.label}
              </option>
            ))}
          </select>
          <input
            id="phone"
            type="tel"
            inputMode="tel"
            autoComplete="tel-national"
            placeholder={t('auth.phonePlaceholder')}
            value={phone}
            onChange={(e) => {
              setPhone(e.target.value)
              if (error) setError(null)
            }}
            aria-invalid={error ? true : undefined}
            aria-describedby="phone-help"
            className="flex-1 min-w-0 h-full px-4 bg-transparent text-[17px] font-semibold tracking-wide outline-none focus-visible:outline-none placeholder:font-medium placeholder:text-[#a9a39a]"
          />
        </div>
        <p
          id="phone-help"
          role={error ? 'alert' : undefined}
          className={`text-[13px] mt-2 ${error ? 'font-semibold text-[var(--negative)] shake' : 'text-[var(--muted)]'}`}
          key={error ?? 'hint'}
        >
          {error ?? t('auth.phoneHint')}
        </p>

        <Button type="submit" disabled={sending || phone.trim().length === 0} className="mt-6 group">
          {sending ? t('auth.sending') : t('auth.sendCode')}
          {!sending && <ArrowRight size={18} className="transition-transform group-hover:translate-x-1" />}
        </Button>
      </form>

      <div className="mt-6 pt-5 border-t border-[var(--rule)] flex flex-wrap items-center justify-center gap-x-2 gap-y-1 text-[14px] text-[var(--muted)]">
        {t('auth.useEmailInstead')}
        <Link
          to="/login/email"
          className="inline-flex items-center gap-1.5 h-10 px-2 rounded-lg font-bold text-[var(--accent)] hover:bg-[var(--accent-soft)] transition-colors"
        >
          <Mail size={15} /> {t('auth.useEmailCode')}
        </Link>
      </div>
    </AuthLayout>
  )
}
