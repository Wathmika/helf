import { Link } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { Button, Card, PageContainer } from '../../components/ui'
import { daysSince, initials, isStale, MAX_PROFILES, personHue, useProfiles } from '../../lib/profiles'

export function ProfilesList() {
  const { t } = useTranslation()
  const { data: profiles, isLoading, isError } = useProfiles()

  const atLimit = (profiles?.length ?? 0) >= MAX_PROFILES

  return (
    <PageContainer>
      <header className="pt-5 pb-4 md:pt-0">
        <h1 className="text-2xl font-bold">{t('profiles.title')}</h1>
        {profiles && profiles.length > 0 && (
          <p className="text-sm text-[var(--muted)] mt-1">
            {t('profiles.subtitleCount', { count: profiles.length })}
          </p>
        )}
      </header>

      {isLoading && <Card className="text-sm text-[var(--muted)]">Loading…</Card>}

      {isError && (
        <Card className="text-sm text-[var(--negative)]">
          Couldn't reach helf right now. Check your connection and try again.
        </Card>
      )}

      {profiles && profiles.length === 0 && (
        <Card className="text-center py-9 px-6">
          <div className="w-16 h-16 rounded-2xl bg-[var(--accent-soft)] mx-auto mb-4" />
          <p className="font-bold text-base mb-1.5">{t('profiles.emptyTitle')}</p>
          <p className="text-sm text-[var(--muted)] mb-5 max-w-sm mx-auto">{t('profiles.emptyBody')}</p>
          <Link to="/profiles/new" className="inline-block w-full max-w-[280px]">
            <Button>{t('profiles.addProfile')}</Button>
          </Link>
        </Card>
      )}

      {profiles && profiles.length > 0 && (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {profiles.map((profile, i) => {
            const hue = personHue(i)
            const stale = isStale(profile.freshestAt)
            return (
              <Link key={profile.personId} to={`/person/${profile.personId}`}>
                <Card className="flex items-center gap-3.5 hover:shadow-sm transition-shadow">
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
      )}

      <Card className="flex items-center justify-between mt-3">
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

      {profiles && profiles.length > 0 && (
        <div className="mt-4.5">
          {atLimit ? (
            <Card className="text-sm">
              <p className="font-semibold mb-1">{t('profiles.limitReachedTitle')}</p>
              <p className="text-[var(--muted)]">{t('profiles.limitReachedBody')}</p>
            </Card>
          ) : (
            <Link to="/profiles/new" className="inline-block w-full max-w-[280px]">
              <Button>{t('profiles.addProfile')}</Button>
            </Link>
          )}
        </div>
      )}
    </PageContainer>
  )
}
