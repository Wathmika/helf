import { Link } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import type { TFunction } from 'i18next'
import { ArrowRight, Pencil, Plus, QrCode } from 'lucide-react'
import { daysSince, initials, MAX_PROFILES, personHue, STALE_AFTER_DAYS, useProfiles, type ProfileSummary } from '../../lib/profiles'

/*
  Profiles home — "editorial-greeting" style from the taste skill.
  The screen's one question: is everyone's emergency information current?
  So the biggest block is the list of people, each with a 90-day check bar
  (the signature element: time since the last check against the review
  window), and the one finding (whoever is most overdue) is the line under
  the title, next to that person's "Check now".

  Grid (desktop, xl+): a centred 1100px column, 12 columns of 77px with 16px
  gutters: 12 x 77 + 11 x 16 = 1100. Count tiles span 3 each
  (4 x 263 + 3 x 16 = 1100); then people 9 + invite 3 (821 + 16 + 263 = 1100).
*/

interface Row {
  profile: ProfileSummary
  /** Position in the list as loaded, so each person keeps the same tint
   * however the rows are sorted. */
  hueIndex: number
  days: number
  /** Days until the 3-month check is due; negative when overdue. */
  left: number
}

function toRows(profiles: ProfileSummary[]): Row[] {
  return profiles
    .map((profile, hueIndex) => {
      const days = daysSince(profile.freshestAt)
      return { profile, hueIndex, days, left: STALE_AFTER_DAYS - days }
    })
    .sort((a, b) => a.left - b.left)
}

const nameOf = (p: ProfileSummary) => p.displayName ?? p.fullName

function checkedText(t: TFunction, days: number) {
  return days === 0 ? t('profiles.updatedToday') : t('profiles.updatedDaysAgo', { count: days })
}

function dueText(t: TFunction, left: number) {
  if (left < 0) return t('profiles.overdueBy', { count: -left })
  if (left === 0) return t('profiles.dueToday')
  return t('profiles.dueIn', { count: left })
}

/** Time since the last check against the 90-day review window. The fill is
 * the true share of the window used; once it runs out the whole track turns
 * amber. Both ends are labelled. */
function CheckClock({ row }: { row: Row }) {
  const { t } = useTranslation()
  const overdue = row.left < 0
  const share = Math.min(1, row.days / STALE_AFTER_DAYS)
  return (
    <div className="min-w-0">
      <div className="flex flex-wrap items-baseline justify-between gap-x-3 gap-y-0.5 text-[13px]">
        <span className="text-[var(--muted)]">{checkedText(t, row.days)}</span>
        <span className={`flex-none font-semibold ${overdue ? 'text-[var(--warning-ink)]' : 'text-[var(--text)]'}`}>
          {dueText(t, row.left)}
        </span>
      </div>
      <div aria-hidden className="mt-2 h-2 rounded-full bg-[var(--raised)] overflow-hidden">
        <div
          className={`h-full rounded-full ${overdue ? 'bg-[var(--warning)]' : 'bg-[var(--accent)]'}`}
          style={{ width: `${overdue ? 100 : share * 100}%` }}
        />
      </div>
    </div>
  )
}

const rowAction =
  'h-10 px-3.5 rounded-[10px] text-[14px] font-bold inline-flex items-center justify-center gap-1.5 transition-colors active:scale-[0.98]'

function PersonRow({ row }: { row: Row }) {
  const { t } = useTranslation()
  const { profile } = row
  const name = nameOf(profile)
  const hue = personHue(row.hueIndex)
  const overdue = row.left < 0
  return (
    <li className="rounded-[12px] bg-[var(--panel-row)] border border-[var(--border)] px-4 py-4 lg:py-3.5 grid gap-4 lg:grid-cols-[minmax(0,0.9fr)_minmax(0,1.25fr)_auto] lg:items-center lg:gap-6">
      <div className="flex items-center gap-3 min-w-0">
        <span
          className="w-11 h-11 rounded-full flex-none flex items-center justify-center font-extrabold text-[15px]"
          style={{ background: hue.bg, color: hue.fg }}
        >
          {initials(name)}
        </span>
        <div className="min-w-0">
          <Link
            to={`/dashboard/person/${profile.personId}`}
            className="block py-2.5 -my-2.5 text-[16px] font-bold truncate hover:text-[var(--accent)] transition-colors"
          >
            {name}
          </Link>
          <p className="text-[13px] text-[var(--muted)] truncate">
            {t(`profiles.relationship.${profile.personIsMy}`)}
            {profile.displayName && profile.displayName !== profile.fullName && <> · {profile.fullName}</>}
          </p>
        </div>
      </div>

      <CheckClock row={row} />

      <div className="flex gap-2">
        {overdue ? (
          <Link
            to={`/dashboard/person/${profile.personId}`}
            className={`${rowAction} flex-1 lg:flex-none bg-[var(--warning-soft)] text-[var(--warning-ink)] border border-[#f3d9b1] hover:bg-[#ffecd2]`}
          >
            {t('profiles.reviewAction')} <ArrowRight size={15} />
          </Link>
        ) : (
          <Link
            to={`/dashboard/person/${profile.personId}`}
            className={`${rowAction} flex-1 lg:flex-none bg-[var(--surface)] border border-[var(--border)] hover:border-[var(--control)]`}
          >
            <Pencil size={14} /> {t('profiles.edit')}
          </Link>
        )}
        <Link
          to={`/dashboard/person/${profile.personId}/qr`}
          className={`${rowAction} flex-1 lg:flex-none bg-[var(--surface)] border border-[var(--border)] hover:border-[var(--control)]`}
        >
          <QrCode size={14} /> {t('profiles.qr')}
        </Link>
      </div>
    </li>
  )
}

function Tile({ label, value, caption, tone }: { label: string; value: string; caption: string; tone?: 'warn' }) {
  return (
    <div className="rounded-[16px] bg-[var(--panel)] p-4 sm:min-h-[124px] flex flex-col">
      <p className="text-[13px] font-semibold text-[var(--muted)] flex items-center gap-1.5">
        {tone === 'warn' && <span aria-hidden className="w-2 h-2 rounded-full bg-[var(--warning)]" />}
        {label}
      </p>
      <p className={`mt-auto pt-3 text-[24px] sm:text-[28px] leading-none font-normal tabular-nums ${tone === 'warn' ? 'text-[var(--warning-ink)]' : ''}`}>
        {value}
      </p>
      <p className="hidden sm:block mt-2 text-[13px] text-[var(--muted)]">{caption}</p>
    </div>
  )
}

function Tiles({ rows }: { rows: Row[] }) {
  const { t } = useTranslation()
  const due = rows.filter((r) => r.left < 0)
  const next = rows.find((r) => r.left >= 0)
  return (
    <div className="grid grid-cols-2 xl:grid-cols-4 gap-4">
      <Tile label={t('profiles.tilePeople')} value={String(rows.length)} caption={t('profiles.tilePeopleCaption', { max: MAX_PROFILES })} />
      <Tile label={t('profiles.tileCurrent')} value={String(rows.length - due.length)} caption={t('profiles.tileCurrentCaption')} />
      <Tile
        label={t('profiles.tileDue')}
        value={String(due.length)}
        caption={t('profiles.tileDueCaption')}
        tone={due.length > 0 ? 'warn' : undefined}
      />
      <Tile
        label={t('profiles.tileNext')}
        value={next ? (next.left === 0 ? t('profiles.today') : t('profiles.nextValue', { count: next.left })) : '—'}
        caption={next ? nameOf(next.profile) : t('profiles.tileNextNone')}
      />
    </div>
  )
}

/** The side panel: the two ways a profile is shared between relatives.
 * Both are real flows (accept_person_invite here; sending an invite from a
 * person's page), so the panel fills its height with content, not air. */
function TogetherPanel() {
  const { t } = useTranslation()
  return (
    <section className="rounded-[16px] bg-[var(--panel)] p-5 flex flex-col h-full">
      <h2 className="text-[15px] font-bold">{t('profiles.togetherTitle')}</h2>

      <div className="mt-4 rounded-[12px] bg-[var(--panel-row)] border border-[var(--border)] p-4">
        <p className="text-[14px] font-bold">{t('profiles.haveInviteCode')}</p>
        <p className="text-[13px] text-[var(--muted)] mt-1">{t('profiles.haveInviteCodeHint')}</p>
        <Link
          to="/dashboard/invite"
          className="mt-3 h-10 px-4 w-full rounded-[10px] bg-[var(--surface)] border border-[var(--border)] text-[14px] font-bold inline-flex items-center justify-center hover:border-[var(--control)] transition-colors"
        >
          {t('profiles.enterCode')}
        </Link>
      </div>

      <div className="mt-2 rounded-[12px] bg-[var(--panel-row)] border border-[var(--border)] p-4">
        <p className="text-[14px] font-bold">{t('profiles.sendInviteTitle')}</p>
        <p className="text-[13px] text-[var(--muted)] mt-1 leading-relaxed">{t('profiles.sendInviteBody')}</p>
      </div>
    </section>
  )
}

function FirstRun() {
  const { t } = useTranslation()
  return (
    <section className="rounded-[16px] bg-[var(--panel)] p-5 sm:p-6">
      <h2 className="text-[18px] font-bold">{t('profiles.emptyTitle')}</h2>
      <p className="text-[15px] text-[var(--muted)] mt-1.5 max-w-[560px] leading-relaxed">{t('profiles.emptyBody')}</p>
      <ol className="mt-5 grid gap-2 md:grid-cols-3">
        {(['1', '2', '3'] as const).map((n) => (
          <li key={n} className="rounded-[12px] bg-[var(--panel-row)] border border-[var(--border)] p-4">
            <p className="text-[15px] font-bold">{t(`profiles.steps.${n}.title`)}</p>
            <p className="text-[14px] text-[var(--muted)] mt-1 leading-relaxed">{t(`profiles.steps.${n}.body`)}</p>
          </li>
        ))}
      </ol>
      <Link
        to="/dashboard/profiles/new"
        className="mt-5 h-11 px-5 rounded-[10px] bg-[var(--deep)] text-white text-[14px] font-bold inline-flex items-center gap-2 hover:bg-[var(--accent-ink)] transition-colors active:scale-[0.98]"
      >
        <Plus size={17} strokeWidth={2.5} /> {t('profiles.addProfile')}
      </Link>
    </section>
  )
}

function Finding({ rows }: { rows: Row[] }) {
  const { t } = useTranslation()
  if (rows.length === 0) return <>{t('profiles.emptySubtitle')}</>
  const worst = rows[0]
  if (worst.left < 0) {
    return (
      <span className="text-[var(--warning-ink)]">
        {t('profiles.findingDue', { name: nameOf(worst.profile), count: -worst.left })}
      </span>
    )
  }
  return <>{t('profiles.findingAllCurrent')}</>
}

export function ProfilesList() {
  const { t } = useTranslation()
  const { data: profiles, isLoading, isError, refetch } = useProfiles()
  const rows = profiles ? toRows(profiles) : []
  const atLimit = rows.length >= MAX_PROFILES

  return (
    <div className="w-full max-w-[1100px] mx-auto px-4 sm:px-6 xl:px-0 pt-6 md:pt-14">
      <header className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-4">
        <div className="min-w-0">
          <h1 className="text-[26px] md:text-[30px] font-extrabold tracking-[-0.015em] leading-tight">{t('profiles.title')}</h1>
          {profiles && (
            <p className="text-[15px] text-[var(--muted)] mt-1.5">
              <Finding rows={rows} />
            </p>
          )}
        </div>
        {!atLimit && rows.length > 0 && (
          <Link
            to="/dashboard/profiles/new"
            className="hidden md:inline-flex flex-none h-11 px-5 rounded-[10px] bg-[var(--deep)] text-white text-[14px] font-bold items-center gap-2 hover:bg-[var(--accent-ink)] transition-colors active:scale-[0.98]"
          >
            <Plus size={17} strokeWidth={2.5} /> {t('profiles.addProfile')}
          </Link>
        )}
      </header>

      <div className="mt-8 md:mt-10 flex flex-col gap-4">
        {isLoading && (
          <>
            <div className="grid grid-cols-2 xl:grid-cols-4 gap-4" aria-busy="true">
              {[0, 1, 2, 3].map((i) => (
                <div key={i} className="h-[124px] rounded-[16px] bg-[var(--panel)]" />
              ))}
            </div>
            <div className="h-[280px] rounded-[16px] bg-[var(--panel)]" />
          </>
        )}

        {isError && (
          <section className="rounded-[16px] bg-[var(--panel)] p-5 flex flex-wrap items-center justify-between gap-3">
            <p className="text-[15px] font-semibold">{t('profiles.loadError')}</p>
            <button type="button" onClick={() => refetch()} className="h-11 px-4 rounded-[10px] text-[14px] font-bold text-[var(--accent-ink)] hover:bg-[var(--raised)]">
              {t('profiles.retry')}
            </button>
          </section>
        )}

        {profiles && rows.length > 0 && <Tiles rows={rows} />}

        {profiles && (
          <div className="grid gap-4 xl:grid-cols-12">
            {rows.length === 0 ? (
              <div className="xl:col-span-9">
                <FirstRun />
              </div>
            ) : (
              <section className="xl:col-span-9 rounded-[16px] bg-[var(--panel)] p-4 sm:p-5">
                <div className="flex items-center gap-2 mb-4">
                  <h2 className="text-[15px] font-bold">{t('profiles.peopleTitle')}</h2>
                  <span className="text-[12px] font-bold text-[var(--muted)] bg-[var(--surface)] border border-[var(--border)] rounded-full px-2 py-0.5 tabular-nums">
                    {rows.length}
                  </span>
                </div>
                <ul className="flex flex-col gap-2">
                  {rows.map((row) => (
                    <PersonRow key={row.profile.personId} row={row} />
                  ))}
                  {!atLimit && (
                    <li>
                      <Link
                        to="/dashboard/profiles/new"
                        className="min-h-[60px] rounded-[12px] border border-dashed border-[var(--control)] px-4 py-3 flex flex-wrap items-center justify-between gap-x-4 gap-y-1 text-[14px] transition-colors hover:border-[var(--accent)] hover:bg-[var(--panel-row)]"
                      >
                        <span className="inline-flex items-center gap-2 font-bold">
                          <Plus size={16} strokeWidth={2.5} /> {t('profiles.addAnother')}
                        </span>
                        <span className="text-[13px] text-[var(--muted)] tabular-nums">
                          {t('profiles.placesLeft', { count: MAX_PROFILES - rows.length })}
                        </span>
                      </Link>
                    </li>
                  )}
                </ul>
                {atLimit && (
                  <p className="mt-4 text-[14px] text-[var(--muted)]">
                    <span className="font-bold text-[var(--text)]">{t('profiles.limitReachedTitle')}.</span> {t('profiles.limitReachedBody')}
                  </p>
                )}
              </section>
            )}
            <div className="xl:col-span-3">
              <TogetherPanel />
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
