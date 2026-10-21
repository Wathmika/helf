import { useState } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { Button, Card } from '../../components/ui'
import { AuthLayout } from '../../components/AuthLayout'
import { supabase } from '../../lib/supabase'
import { validatePhone, toE164 } from '../../lib/phone'

export function PhoneEntry() {
  const { t } = useTranslation()
  const navigate = useNavigate()
  const [phone, setPhone] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [sending, setSending] = useState(false)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    const { valid, digits } = validatePhone(phone)
    if (!valid) {
      setError(t('auth.errorDisallowedCountry'))
      return
    }

    setError(null)
    setSending(true)
    const e164 = toE164(digits)

    if (!supabase) {
      // Not configured yet — still let the flow continue so the rest of the
      // screens can be built/reviewed without real Supabase credentials.
      navigate('/login/otp', { state: { destination: e164 } })
      return
    }

    const { error: otpError } = await supabase.auth.signInWithOtp({ phone: e164 })
    setSending(false)
    if (otpError) {
      setError(otpError.message)
      return
    }
    navigate('/login/otp', { state: { destination: e164 } })
  }

  return (
    <AuthLayout>
      <div className="flex flex-col items-center text-center pb-5">
        <div className="w-14 h-14 rounded-2xl bg-[var(--accent)] text-white flex items-center justify-center text-xl font-extrabold mb-4.5">
          h
        </div>
        <h1 className="text-2xl font-bold">{t('auth.phoneTitle')}</h1>
        <p className="text-sm text-[var(--muted)] mt-1">{t('auth.phoneSubtitle')}</p>
      </div>

      <form onSubmit={handleSubmit}>
        <Card>
          <label className="block mb-3.5">
            <span className="block text-[13px] font-medium text-[var(--muted)] mb-1.5">{t('auth.phoneLabel')}</span>
            <input
              className="w-full h-11 rounded-[var(--radius-ctl)] border-[1.5px] border-[var(--border)] bg-[var(--surface)] px-3 text-base outline-none focus:border-[var(--accent)]"
              type="tel"
              inputMode="tel"
              placeholder="+94 77 123 4567"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              required
            />
          </label>
          {error && <p className="text-sm text-[var(--negative)] mb-3">{error}</p>}
          <Button type="submit" disabled={sending}>
            {t('auth.sendCode')}
          </Button>
        </Card>
      </form>

      <p className="text-center text-[13px] text-[var(--muted)] mt-3.5">
        {t('auth.useEmailInstead')}{' '}
        <Link to="/login/email" className="text-[var(--accent)] font-semibold">
          {t('auth.useEmailCode')}
        </Link>
      </p>
    </AuthLayout>
  )
}
