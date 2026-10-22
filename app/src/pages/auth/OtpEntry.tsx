import { useEffect, useRef, useState } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import { Trans, useTranslation } from 'react-i18next'
import { RotateCcw } from 'lucide-react'
import { AuthLayout } from '../../components/AuthLayout'
import { Button } from '../../components/ui'
import { supabase } from '../../lib/supabase'
import { authErrorKey } from '../../lib/authErrors'
import { getDemoUser } from '../../lib/demoStore'
import { prettyPhone } from '../../lib/phone'

const RESEND_SECONDS = 45
const LENGTH = 6

type LocationState = { destination?: string; channel?: 'phone' | 'email' } | null

export function OtpEntry() {
  const { t } = useTranslation()
  const navigate = useNavigate()
  const state = useLocation().state as LocationState
  const destination = state?.destination
  const channel = state?.channel ?? 'phone'

  const [digits, setDigits] = useState<string[]>(Array(LENGTH).fill(''))
  const [error, setError] = useState<string | null>(null)
  const [verifying, setVerifying] = useState(false)
  const [cooldown, setCooldown] = useState(RESEND_SECONDS)
  const inputs = useRef<(HTMLInputElement | null)[]>([])

  useEffect(() => {
    if (!destination) navigate('/login', { replace: true })
  }, [destination, navigate])

  useEffect(() => {
    if (cooldown <= 0) return
    const timer = setTimeout(() => setCooldown((c) => c - 1), 1000)
    return () => clearTimeout(timer)
  }, [cooldown])

  async function verify(code: string) {
    if (code.length !== LENGTH || !destination || verifying) return
    setError(null)
    setVerifying(true)

    if (!supabase) {
      navigate(getDemoUser() ? '/' : '/login/welcome')
      return
    }

    const { data, error: verifyError } = await supabase.auth.verifyOtp(
      channel === 'email'
        ? { email: destination, token: code, type: 'email' }
        : { phone: destination, token: code, type: 'sms' },
    )

    if (verifyError) {
      setVerifying(false)
      setError(t(authErrorKey(verifyError)))
      setDigits(Array(LENGTH).fill(''))
      inputs.current[0]?.focus()
      return
    }

    const userId = data.session?.user.id
    const { data: appUser } = userId
      ? await supabase.from('app_users').select('display_name').eq('id', userId).single()
      : { data: null }
    navigate(appUser?.display_name ? '/' : '/login/welcome')
  }

  function setAndMaybeVerify(next: string[]) {
    setDigits(next)
    if (error) setError(null)
    if (next.every((d) => d !== '')) void verify(next.join(''))
  }

  function handleChange(i: number, value: string) {
    const typed = value.replace(/\D/g, '')
    if (typed.length > 1) {
      // Autofill or paste into one box: spread the digits across the rest.
      const next = [...digits]
      typed
        .slice(0, LENGTH - i)
        .split('')
        .forEach((d, k) => (next[i + k] = d))
      inputs.current[Math.min(i + typed.length, LENGTH - 1)]?.focus()
      setAndMaybeVerify(next)
      return
    }
    const next = digits.map((cur, idx) => (idx === i ? typed : cur))
    if (typed && i < LENGTH - 1) inputs.current[i + 1]?.focus()
    setAndMaybeVerify(next)
  }

  function handleKeyDown(i: number, e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === 'Backspace' && !digits[i] && i > 0) {
      inputs.current[i - 1]?.focus()
      setDigits((d) => d.map((cur, idx) => (idx === i - 1 ? '' : cur)))
    }
    if (e.key === 'ArrowLeft' && i > 0) inputs.current[i - 1]?.focus()
    if (e.key === 'ArrowRight' && i < LENGTH - 1) inputs.current[i + 1]?.focus()
  }

  async function handleResend() {
    if (!destination) return
    setCooldown(RESEND_SECONDS)
    setError(null)
    if (!supabase) return
    const { error: otpError } = await supabase.auth.signInWithOtp(channel === 'email' ? { email: destination } : { phone: destination })
    if (otpError) setError(t(authErrorKey(otpError)))
  }

  const back = channel === 'email' ? '/login/email' : '/login'
  const subtitle = (
    <Trans
      i18nKey={channel === 'email' ? 'auth.otpSubtitleEmail' : 'auth.otpSubtitle'}
      values={{ destination: channel === 'phone' && destination ? prettyPhone(destination) : destination }}
      components={{ b: <span className="font-bold text-[var(--text)] whitespace-nowrap" /> }}
    />
  )

  return (
    <AuthLayout title={t('auth.otpTitle')} subtitle={subtitle} back={{ to: back, label: t('auth.changeDestination') }}>
      <fieldset>
        <legend className="block text-[14px] font-semibold mb-3">{t('auth.codeLabel')}</legend>
        <div className={`grid grid-cols-6 gap-2 sm:gap-2.5 ${error ? 'shake' : ''}`} key={error ?? 'ok'}>
          {digits.map((d, i) => (
            <input
              key={i}
              ref={(el) => {
                inputs.current[i] = el
              }}
              value={d}
              onChange={(e) => handleChange(i, e.target.value)}
              onKeyDown={(e) => handleKeyDown(i, e)}
              onFocus={(e) => e.target.select()}
              inputMode="numeric"
              autoComplete={i === 0 ? 'one-time-code' : 'off'}
              autoFocus={i === 0}
              aria-label={`${t('auth.codeLabel')} ${i + 1}`}
              aria-invalid={error ? true : undefined}
              disabled={verifying}
              className={`w-full aspect-[5/6] min-h-[52px] text-center text-[24px] font-extrabold rounded-[var(--radius-ctl)] border-[1.5px] bg-[var(--surface)] outline-none focus-visible:outline-none transition-all focus:ring-4 disabled:opacity-60 ${
                error
                  ? 'border-[var(--negative)] focus:ring-[var(--negative-soft)]'
                  : d
                    ? 'border-[var(--accent)] bg-[var(--accent-soft)]/40 focus:ring-[var(--accent-soft)]'
                    : 'border-[var(--border)] focus:border-[var(--accent)] focus:ring-[var(--accent-soft)]'
              }`}
            />
          ))}
        </div>
      </fieldset>

      <p role={error ? 'alert' : undefined} className={`text-[13px] mt-4 min-h-5 ${error ? 'font-semibold text-[var(--negative)]' : 'text-[var(--muted)]'}`}>
        {error ?? (!supabase ? t('auth.demoCodeHint') : '')}
      </p>

      <Button type="button" onClick={() => verify(digits.join(''))} disabled={verifying || digits.some((d) => !d)} className="mt-4">
        {verifying ? t('auth.verifying') : t('auth.verify')}
      </Button>

      <div className="mt-5 flex justify-center">
        {cooldown > 0 ? (
          <p className="h-10 flex items-center text-[14px] text-[var(--muted)] tabular-nums">
            {t('auth.resendIn', { time: `0:${cooldown.toString().padStart(2, '0')}` })}
          </p>
        ) : (
          <button
            type="button"
            onClick={handleResend}
            className="inline-flex items-center gap-1.5 h-10 px-3 rounded-lg text-[14px] font-bold text-[var(--accent)] hover:bg-[var(--accent-soft)] transition-colors"
          >
            <RotateCcw size={15} /> {t('auth.resend')}
          </button>
        )}
      </div>
    </AuthLayout>
  )
}
