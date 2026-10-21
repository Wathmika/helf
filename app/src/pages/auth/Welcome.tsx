import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { Button, Card } from '../../components/ui'
import { AuthLayout } from '../../components/AuthLayout'
import { supabase } from '../../lib/supabase'
import i18n from '../../i18n'

const LANGUAGES: { code: 'si' | 'ta' | 'en'; label: string }[] = [
  { code: 'si', label: 'සිංහල' },
  { code: 'ta', label: 'தமிழ்' },
  { code: 'en', label: 'English' },
]

export function Welcome() {
  const { t } = useTranslation()
  const navigate = useNavigate()
  const [name, setName] = useState('')
  const [lang, setLang] = useState<'si' | 'ta' | 'en'>('si')
  const [saving, setSaving] = useState(false)

  async function handleContinue() {
    setSaving(true)
    i18n.changeLanguage(lang)

    if (supabase) {
      const { data } = await supabase.auth.getUser()
      if (data.user) {
        await supabase
          .from('app_users')
          .update({ display_name: name, preferred_language: lang })
          .eq('id', data.user.id)
      }
    }

    navigate('/')
  }

  return (
    <AuthLayout>
      <Card>
        <p className="text-[15px] font-bold mb-2.5">{t('auth.welcomeNameLabel')}</p>
        <label className="block mb-4">
          <input
            className="w-full h-11 rounded-[var(--radius-ctl)] border-[1.5px] border-[var(--border)] bg-[var(--surface)] px-3 text-base outline-none focus:border-[var(--accent)]"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Nadeesha"
          />
        </label>

        <p className="text-[13px] font-semibold text-[var(--muted)] mb-2">{t('auth.welcomeLanguageLabel')}</p>
        <div className="flex gap-2.5 mb-4">
          {LANGUAGES.map((l) => (
            <button
              key={l.code}
              type="button"
              onClick={() => setLang(l.code)}
              className={`flex-1 border-[1.5px] rounded-2xl p-3 text-center text-sm font-semibold ${
                lang === l.code
                  ? 'border-[var(--accent)] bg-[var(--accent-soft)] text-[var(--accent-ink)]'
                  : 'border-[var(--border)] text-[var(--text)]'
              }`}
            >
              {l.label}
            </button>
          ))}
        </div>

        <Button onClick={handleContinue} disabled={!name || saving}>
          {t('auth.continue')}
        </Button>
      </Card>
    </AuthLayout>
  )
}
