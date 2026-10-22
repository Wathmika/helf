import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { ArrowRight, Check } from 'lucide-react'
import { AuthLayout } from '../../components/AuthLayout'
import { Button, Field } from '../../components/ui'
import { supabase } from '../../lib/supabase'
import { setDemoUser } from '../../lib/demoStore'

type Lang = 'si' | 'ta' | 'en'

const TILES: { code: Lang; native: string; latin: string }[] = [
  { code: 'si', native: 'සිංහල', latin: 'Sinhala' },
  { code: 'ta', native: 'தமிழ்', latin: 'Tamil' },
  { code: 'en', native: 'English', latin: 'English' },
]

export function Welcome() {
  const { t, i18n } = useTranslation()
  const navigate = useNavigate()
  const [name, setName] = useState('')
  const [lang, setLang] = useState<Lang>(((i18n.resolvedLanguage as Lang) ?? 'si'))
  const [error, setError] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)

  function pick(code: Lang) {
    setLang(code)
    void i18n.changeLanguage(code)
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    const displayName = name.trim()
    if (!displayName) return
    setSaving(true)

    if (!supabase) {
      setDemoUser({ displayName, language: lang })
      navigate('/')
      return
    }

    const { data } = await supabase.auth.getUser()
    if (data.user) {
      const { error: saveError } = await supabase
        .from('app_users')
        .update({ display_name: displayName, preferred_language: lang })
        .eq('id', data.user.id)
      if (saveError) {
        setSaving(false)
        setError(t('auth.errorGeneric'))
        return
      }
    }
    navigate('/')
  }

  return (
    <AuthLayout title={t('auth.welcomeTitle')} subtitle={t('auth.welcomeSubtitle')}>
      <form onSubmit={handleSubmit}>
        <Field
          label={t('auth.welcomeNameLabel')}
          placeholder={t('auth.welcomeNamePlaceholder')}
          autoComplete="given-name"
          autoFocus
          maxLength={60}
          value={name}
          onChange={(e) => setName(e.target.value)}
          error={error}
        />

        <fieldset className="mt-2">
          <legend className="block text-[14px] font-semibold mb-2">{t('auth.welcomeLanguageLabel')}</legend>
          <div className="grid grid-cols-3 gap-2.5">
            {TILES.map((tile) => {
              const active = lang === tile.code
              return (
                <button
                  key={tile.code}
                  type="button"
                  lang={tile.code}
                  aria-pressed={active}
                  onClick={() => pick(tile.code)}
                  className={`relative rounded-2xl border-[1.5px] px-2 py-3.5 text-center transition-all active:scale-[0.97] ${
                    active
                      ? 'border-[var(--accent)] bg-[var(--accent-soft)] text-[var(--accent-ink)]'
                      : 'border-[var(--border)] hover:border-[var(--accent)] hover:bg-[var(--ground)]'
                  }`}
                >
                  {active && (
                    <span className="absolute top-1.5 right-1.5 w-5 h-5 rounded-full bg-[var(--accent)] text-white flex items-center justify-center">
                      <Check size={12} strokeWidth={3} />
                    </span>
                  )}
                  <span className="block text-[17px] font-extrabold leading-tight">{tile.native}</span>
                  <span className="block text-[12px] font-semibold text-[var(--muted)] mt-1" lang="en">
                    {tile.latin}
                  </span>
                </button>
              )
            })}
          </div>
        </fieldset>

        <Button type="submit" disabled={!name.trim() || saving} className="mt-7 group">
          {t('auth.continue')}
          <ArrowRight size={18} className="transition-transform group-hover:translate-x-1" />
        </Button>
      </form>
    </AuthLayout>
  )
}
