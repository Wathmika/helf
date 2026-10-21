import { Link } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { Button, Card } from '../../components/ui'
import { daysSince, initials, isStale, MAX_PROFILES, personHue, useProfiles } from '../../lib/profiles'

const HOW_IT_WORKS = [
  {
    title: 'Add a profile',
    body: "Allergies, conditions, medicines and emergency contacts — you choose what's shown.",
  },
  {
    title: 'Print the QR',
    body: 'A wallet card, a helmet sticker, a lock-screen wallpaper — as many as you need.',
  },
  {
    title: "If it's ever scanned",
    body: "A stranger sees only what you allowed, and your family gets a message the same moment.",
  },
]

function EmptyState() {
  const { t } = useTranslation()
  return (
    <div className="min-h-[62vh] flex flex-col items-center justify-center text-center px-5">
      <div className="w-20 h-20 rounded-[22px] bg-[var(--accent-soft)] flex items-center justify-center mb-6">
        <svg viewBox="0 0 24 24" fill="none" stroke="var(--accent)" strokeWidth="1.6" className="w-9 h-9">
          <path d="M12 21s-7-4.5-9.5-9C.5 7.5 3 3.5 7 3.5c2 0 3.6 1.1 5 3 1.4-1.9 3-3 5-3 4 0 6.5 4 4.5 8.5-2.5 4.5-9.5 9-9.5 9z" />
        </svg>
      </div>
      <h2 className="text-2xl font-bold max-w-md">{t('profiles.emptyTitle')}</h2>
      <p className="text-[15px] text-[var(--muted)] mt-2.5 max-w-md leading-relaxed">{t('profiles.emptyBody')}</p>
      <Link to="/profiles/new" className="inline-block w-full max-w-[280px] mt-7">
        <Button>{t('profiles.addProfile')}</Button>
      </Link>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-5 max-w-3xl mt-16 text-left">
        {HOW_IT_WORKS.map((step, i) => (
          <div key={step.title}>
            <div className="w-9 h-9 rounded-full bg-[var(--raised)] text-[var(--text)] flex items-center justify-center font-bold text-sm mb-3">
              {i + 1}
            </div>
            <p className="font-semibold text-[15px]">{step.title}</p>
            <p className="text-sm text-[var(--muted)] mt-1 leading-relaxed">{step.body}</p>
          </div>
        ))}
      </div>
    </div>
  )
}

export function ProfilesList() {
  const { t } = useTranslation()
  const { data: profiles, isLoading, isError } = useProfiles()

  const count = profiles?.length ?? 0
  const atLimit = count >= MAX_PROFILES
  const empty = profiles !== undefined && profiles.length === 0

  return (
    <div className={`w-full mx-auto px-5 md:px-8 ${empty ? 'max-w-[1120px]' : 'max-w-[1400px]'}`}>
      <header className="flex items-start justify-between gap-4 pt-5 pb-5 md:pt-0">
        <div>
          <h1 className="text-2xl font-bold">{t('profiles.title')}</h1>
          {count > 0 && (
            <p className="text-sm text-[var(--muted)] mt-1">{t('profiles.subtitleCount', { count })}</p>
          )}
        </div>
        {count > 0 && !atLimit && (
          <Link to="/profiles/new" className="hidden md:block">
            <Button className="w-auto h-10 px-4">{t('profiles.addProfile')}</Button>
          </Link>
        )}
      </header>

      {isLoading && (
        <div className="min-h-[50vh] flex items-center justify-center text-sm text-[var(--muted)]">Loading…</div>
      )}

      {isError && (
        <div className="min-h-[50vh] flex items-center justify-center">
          <Card className="max-w-sm text-sm text-[var(--negative)] text-center">
            Couldn't reach helf right now. Check your connection and try again.
          </Card>
        </div>
      )}

      {empty && <EmptyState />}

      {count > 0 && (
        <div className="grid grid-cols-1 xl:grid-cols-[1fr_320px] gap-6 items-start">
          <div className="flex flex-col gap-3">
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 2xl:grid-cols-4 gap-3">
              {profiles!.map((profile, i) => {
                const hue = personHue(i)
                const stale = isStale(profile.freshestAt)
                return (
                  <Link key={profile.personId} to={`/person/${profile.personId}`}>
                    <Card className="flex items-center gap-3.5 hover:shadow-sm transition-shadow h-full">
                      <div
                        className="rounded-2xl flex-none flex items-center justify-center font-bold text-lg text-white"
                        style={{ background: hue.fg, width: 52, height: 52 }}
                      >
                        {initials(profile.displayName ?? profile.fullName)}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="font-bold text-[17px] truncate">{profile.displayName ?? profile.fullName}</p>
                        <span
                          className="inline-block text-xs font-semibold px-2 py-0.5 rounded-md mt-1"
                          style={{ background: hue.bg, color: hue.fg }}
                        >
                          {t(`profiles.relationship.${profile.personIsMy}`)}
                        </span>
                        <div
                          className="text-xs font-medium mt-1 flex items-center gap-1.5"
                          style={{ color: stale ? 'var(--warning)' : 'var(--positive)' }}
                        >
                          ●{' '}
                          {stale
                            ? t('profiles.needsReview')
                            : daysSince(profile.freshestAt) === 0
                              ? t('profiles.updatedToday')
                              : t('profiles.updatedDaysAgo', { count: daysSince(profile.freshestAt) })}
                        </div>
                      </div>
                    </Card>
                  </Link>
                )
              })}
            </div>

            <Card className="flex items-center justify-between">
              <div>
                <p className="font-semibold text-[15px]">{t('profiles.haveInviteCode')}</p>
                <p className="text-[13px] text-[var(--muted)] mt-0.5">{t('profiles.haveInviteCodeHint')}</p>
              </div>
              <Link to="/invite">
                <Button variant="ghost" className="w-auto h-9 px-3.5 text-[13px]">
                  {t('profiles.enterCode')}
                </Button>
              </Link>
            </Card>

            <div className="md:hidden">
              {atLimit ? (
                <Card className="text-sm">
                  <p className="font-semibold mb-1">{t('profiles.limitReachedTitle')}</p>
                  <p className="text-[var(--muted)]">{t('profiles.limitReachedBody')}</p>
                </Card>
              ) : (
                <Link to="/profiles/new" className="inline-block w-full">
                  <Button>{t('profiles.addProfile')}</Button>
                </Link>
              )}
            </div>
          </div>

          <aside className="hidden xl:flex flex-col gap-4">
            <Card>
              <p className="text-[13px] font-semibold text-[var(--muted)] mb-2">Profiles used</p>
              <div className="flex items-end gap-1.5 mb-2">
                <span className="text-[28px] font-bold leading-none">{count}</span>
                <span className="text-sm text-[var(--muted)] mb-0.5">/ {MAX_PROFILES}</span>
              </div>
              <div className="h-2 rounded-full bg-[var(--raised)] overflow-hidden">
                <div
                  className="h-full rounded-full bg-[var(--accent)]"
                  style={{ width: `${Math.min(100, (count / MAX_PROFILES) * 100)}%` }}
                />
              </div>
              {atLimit && (
                <p className="text-xs text-[var(--warning)] font-medium mt-2">{t('profiles.limitReachedTitle')}</p>
              )}
            </Card>

            <Card>
              <p className="text-[13px] font-semibold mb-2">Why a profile matters</p>
              <p className="text-[13px] text-[var(--muted)] leading-relaxed">
                Scanning the QR shows only what you've switched on — and quietly lets your family know their
                person was found. Review each profile every few months so it stays accurate.
              </p>
            </Card>
          </aside>
        </div>
      )}
    </div>
  )
}
