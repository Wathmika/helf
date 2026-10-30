import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { ArrowRight, Smartphone } from 'lucide-react'
import { AuthLayout } from '../../components/AuthLayout'
import { Button, Field } from '../../components/ui'
import { supabase } from '../../lib/supabase'
import { authErrorKey } from '../../lib/authErrors'

const LOOKS_LIKE_EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/

export function EmailEntry() {
  const { t } = useTranslation()
  const navigate = useNavigate()
  const [email, setEmail] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [sending, setSending] = useState(false)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    const address = email.trim()
    if (!LOOKS_LIKE_EMAIL.test(address)) {
      setError(t('auth.errorEmail'))
      return
    }
    setError(null)

    if (!supabase) {
      navigate('/login/otp', { state: { destination: address, channel: 'email' } })
      return
    }

    setSending(true)
    const { error: otpError } = await supabase.auth.signInWithOtp({ email: address })
    setSending(false)
    if (otpError) {
      setError(t(authErrorKey(otpError)))
      return
    }
    navigate('/login/otp', { state: { destination: address, channel: 'email' } })
  }

  return (
    <AuthLayout title={t('auth.emailTitle')} subtitle={t('auth.emailSubtitle')}>
      <form onSubmit={handleSubmit} noValidate>
        <Field
          label={t('auth.emailLabel')}
          type="email"
          inputMode="email"
          autoComplete="email"
          placeholder={t('auth.emailPlaceholder')}
          value={email}
          onChange={(e) => {
            setEmail(e.target.value)
            if (error) setError(null)
          }}
          error={error}
        />
        <Button type="submit" disabled={sending || email.trim().length === 0} className="mt-2 group">
          {sending ? t('auth.sending') : t('auth.sendCode')}
          {!sending && <ArrowRight size={18} className="transition-transform group-hover:translate-x-1" />}
        </Button>
      </form>

      <div className="mt-6 pt-5 border-t border-[var(--rule)] flex justify-center">
        <Link
          to="/login"
          className="inline-flex items-center gap-1.5 h-10 px-2 rounded-lg text-[14px] font-bold text-[var(--accent)] hover:bg-[var(--accent-soft)] transition-colors"
        >
          <Smartphone size={15} /> {t('auth.usePhoneCode')}
        </Link>
      </div>
    </AuthLayout>
  )
}
