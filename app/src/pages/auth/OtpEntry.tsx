import { useEffect, useRef, useState } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { Button, Card } from '../../components/ui'
import { AuthLayout } from '../../components/AuthLayout'
import { supabase } from '../../lib/supabase'

const RESEND_SECONDS = 45

type LocationState = { destination?: string; channel?: 'phone' | 'email' } | null

export function OtpEntry() {
  const { t } = useTranslation()
  const navigate = useNavigate()
  const location = useLocation()
  const state = location.state as LocationState
  const destination = state?.destination
  const channel = state?.channel ?? 'phone'

  const [digits, setDigits] = useState<string[]>(Array(6).fill(''))
  const [error, setError] = useState<string | null>(null)
  const [verifying, setVerifying] = useState(false)
  const [cooldown, setCooldown] = useState(RESEND_SECONDS)
  const inputs = useRef<(HTMLInputElement | null)[]>([])

  useEffect(() => {
    if (!destination) {
      navigate('/login', { replace: true })
      return
    }
    if (cooldown <= 0) return
    const timer = setTimeout(() => setCooldown((c) => c - 1), 1000)
    return () => clearTimeout(timer)
  }, [cooldown, destination, navigate])

  function handleDigit(i: number, value: string) {
    const v = value.replace(/\D/g, '').slice(-1)
    setDigits((d) => d.map((cur, idx) => (idx === i ? v : cur)))
    if (v && i < 5) inputs.current[i + 1]?.focus()
  }

  async function handleResend() {
    if (!destination) return
    setCooldown(RESEND_SECONDS)
    if (!supabase) return
    await supabase.auth.signInWithOtp(channel === 'email' ? { email: destination } : { phone: destination })
  }

  async function handleVerify() {
    const code = digits.join('')
    if (code.length !== 6 || !destination) return

    setError(null)
    setVerifying(true)

    if (!supabase) {
      navigate('/login/welcome')
      return
    }

    const { data, error: verifyError } = await supabase.auth.verifyOtp(
      channel === 'email'
        ? { email: destination, token: code, type: 'email' }
        : { phone: destination, token: code, type: 'sms' },
    )
    setVerifying(false)

    if (verifyError) {
      setError(t('auth.errorInvalidCode'))
      return
    }

    const userId = data.session?.user.id
    if (!userId) return

    const { data: appUser } = await supabase.from('app_users').select('display_name').eq('id', userId).single()
    navigate(appUser?.display_name ? '/' : '/login/welcome')
  }

  return (
    <AuthLayout>
      <header className="text-center pb-1.5">
        <h1 className="text-2xl font-bold">{t('auth.otpTitle')}</h1>
        <p className="text-sm text-[var(--muted)] mt-1">{t('auth.otpSubtitle', { destination })}</p>
      </header>

      <div className="flex gap-2 justify-center my-6">
        {digits.map((d, i) => (
          <input
            key={i}
            ref={(el) => {
              inputs.current[i] = el
            }}
            value={d}
            onChange={(e) => handleDigit(i, e.target.value)}
            inputMode="numeric"
            maxLength={1}
            className="w-[42px] h-[52px] text-center text-xl font-bold rounded-[var(--radius-ctl)] border-[1.5px] border-[var(--border)] bg-[var(--surface)] outline-none focus:border-[var(--accent)]"
          />
        ))}
      </div>

      {error && <p className="text-center text-sm text-[var(--negative)] mb-3">{error}</p>}

      <p className="text-center text-[13px] text-[var(--muted)]">
        {cooldown > 0 ? (
          t('auth.resendIn', { time: `0:${cooldown.toString().padStart(2, '0')}` })
        ) : (
          <button className="text-[var(--accent)] font-semibold" onClick={handleResend}>
            {t('auth.resend')}
          </button>
        )}
      </p>

      <div className="mt-7">
        <Card>
          <Button onClick={handleVerify} disabled={verifying || digits.join('').length !== 6}>
            {t('auth.verify')}
          </Button>
        </Card>
      </div>
    </AuthLayout>
  )
}
