import { useTranslation } from 'react-i18next'

const LANGS = [
  { code: 'si', short: 'සිං' },
  { code: 'ta', short: 'தமி' },
  { code: 'en', short: 'EN' },
] as const

export function LanguageSwitch({ tone = 'light' }: { tone?: 'light' | 'dark' }) {
  const { t, i18n } = useTranslation()
  const current = i18n.resolvedLanguage ?? 'si'

  return (
    <div
      role="group"
      aria-label={t('lang.label')}
      className={`inline-flex p-1 rounded-full ${tone === 'dark' ? 'bg-white/10' : 'bg-[var(--panel)]'}`}
    >
      {LANGS.map((l) => {
        const active = current === l.code
        return (
          <button
            key={l.code}
            type="button"
            lang={l.code}
            aria-pressed={active}
            aria-label={t(`lang.${l.code}`)}
            onClick={() => i18n.changeLanguage(l.code)}
            className={`min-w-11 h-11 px-3 rounded-full text-[13px] font-bold transition-colors ${
              active
                ? tone === 'dark'
                  ? 'bg-white text-[var(--deep)]'
                  : 'bg-[var(--deep)] text-white'
                : tone === 'dark'
                  ? 'text-white/75 hover:text-white'
                  : 'text-[var(--muted)] hover:text-[var(--text)]'
            }`}
          >
            {l.short}
          </button>
        )
      })}
    </div>
  )
}
