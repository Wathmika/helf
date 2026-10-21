import { useState } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { Button, Card } from '../../components/ui'
import { AuthLayout } from '../../components/AuthLayout'
import { supabase } from '../../lib/supabase'

export function EmailEntry() {
  const { t } = useTranslation()
  const navigate = useNavigate()
  const [email, setEmail] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [sending, setSending] = useState(false)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)
    setSending(true)

    if (!supabase) {
      navigate('/login/otp', { state: { destination: email, channel: 'email' } })
      return
    }

    const { error: otpError } = await supabase.auth.signInWithOtp({ email })
    setSending(false)
    if (otpError) {
      setError(otpError.message)
      return
    }
    navigate('/login/otp', { state: { destination: email, channel: 'email' } })
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
            <span className="block text-[13px] font-medium text-[var(--muted)] mb-1.5">Email address</span>
            <input
              className="w-full h-11 rounded-[var(--radius-ctl)] border-[1.5px] border-[var(--border)] bg-[var(--surface)] px-3 text-base outline-none focus:border-[var(--accent)]"
              type="email"
              placeholder="you@example.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
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
        <Link to="/login" className="text-[var(--accent)] font-semibold">
          {t('auth.usePhoneCode')}
        </Link>
      </p>
    </AuthLayout>
  )
}
