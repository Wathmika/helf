import { useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { ArrowLeft, CheckCheck, EyeOff, QrCode } from 'lucide-react'
import { ScanPreview } from '../../components/ScanPreview'
import { freshestOf, usePersonDetail, usePhotoUrl, usePreview, useUpdatePerson, type PersonDetail as Detail } from '../../lib/person'
import { daysSince, initials, personHue, STALE_AFTER_DAYS, useProfiles } from '../../lib/profiles'
import { Alerts } from './Alerts'
import { BasicInfo } from './BasicInfo'
import { Contacts } from './Contacts'
import { Allergies, Conditions, Medicines } from './HealthLists'
import { Sharing } from './Sharing'
import { SaveProvider, SaveStamp } from './editorUi'
import { ghostButton, primaryButton, useSave } from './editorKit'

/*
  Profile editor (spec §4) — the core screen. Its one question: "is what a
  stranger will see right?" So the live preview (preview_scan_profile) sits
  beside the sections on desktop and is one tap away on a phone, and the
  "Kept private" list under it names everything the family switched off.

  Desktop (xl): sections in a fluid column, preview in a 380px column kept in
  view while the page scrolls. Below xl the two become tabs.
*/

/** Everything with data that the scan page will NOT show — the other half
 * of "you choose what is shown". */
function usePrivateItems(p: Detail): string[] {
  const { t } = useTranslation()
  const out: string[] = []
  if (p.photo_path && !p.show_photo) out.push(t('person.photo'))
  if (p.date_of_birth && !p.show_age) out.push(t('person.age'))
  if (p.spoken_languages.length && !p.show_languages) out.push(t('person.languages'))
  if (p.blood_group && !p.show_blood_group) out.push(t('person.bloodGroup'))
  if (p.organ_donor !== null && !p.show_organ_donor) out.push(t('person.organDonor'))
  if (p.communication_needs && !p.show_communication_needs) out.push(t('person.communication'))
  if (p.preferred_hospital && !p.show_preferred_hospital) out.push(t('person.hospital'))
  if (p.insurer_name && !p.show_insurance) out.push(t('person.insurer'))
  if (p.insurance_policy_number) out.push(t('person.policyNumber'))
  if (p.home_area && !p.lost_person_mode) out.push(t('person.homeArea'))
  const hiddenAlerts = p.critical_alerts.filter((a) => !a.show_on_scan).length
  if (hiddenAlerts) out.push(t('person.privateAlerts', { count: hiddenAlerts }))
  const hiddenAllergies = p.allergies.filter((a) => !a.show_on_scan).length
  if (hiddenAllergies) out.push(t('person.privateAllergies', { count: hiddenAllergies }))
  const hiddenConditions = p.conditions.filter((c) => !c.show_on_scan).length
  if (hiddenConditions) out.push(t('person.privateConditions', { count: hiddenConditions }))
  const hiddenMeds = p.medications.filter((m) => !m.show_on_scan || !m.is_current).length
  if (hiddenMeds) out.push(t('person.privateMeds', { count: hiddenMeds }))
  const hiddenContacts = p.emergency_contacts.filter((c) => !c.show_on_scan).length
  if (hiddenContacts) out.push(t('person.privateContacts', { count: hiddenContacts }))
  if (p.conditions.some((c) => c.notes)) out.push(t('person.conditionNotes'))
  return out
}

function PreviewColumn({ person }: { person: Detail }) {
  const { t } = useTranslation()
  const { data: preview, isError } = usePreview(person.id)
  const privateItems = usePrivateItems(person)
  return (
    <div className="flex flex-col gap-4">
      <section aria-labelledby="preview-h" className="rounded-[16px] bg-[var(--panel)] p-4">
        <div className="flex items-baseline justify-between gap-3 px-1">
          <h2 id="preview-h" className="text-[15px] font-bold">
            {t('person.previewTitle')}
          </h2>
          <span className="text-[12.5px] text-[var(--muted)]">{t('person.previewLive')}</span>
        </div>
        <div className="mt-3 mx-auto max-w-[360px] rounded-[30px] border-[7px] border-[#1f2a2a] bg-[#1f2a2a] overflow-hidden">
          <div className="rounded-[23px] overflow-hidden max-h-[680px] overflow-y-auto overscroll-contain">
            {preview ? (
              <ScanPreview profile={preview} />
            ) : (
              <div className="h-[420px] bg-[#fdf6ec] flex items-center justify-center p-6 text-center text-[14px] text-[#6b5f51]">
                {isError ? t('person.previewError') : t('person.previewLoading')}
              </div>
            )}
          </div>
        </div>
      </section>

      <section aria-labelledby="private-h" className="rounded-[16px] bg-[var(--panel)] p-5">
        <h2 id="private-h" className="text-[15px] font-bold flex items-center gap-2">
          <EyeOff size={16} /> {t('person.privateTitle')}
        </h2>
        {privateItems.length > 0 ? (
          <ul className="mt-2.5 flex flex-wrap gap-1.5">
            {privateItems.map((item) => (
              <li key={item} className="text-[13px] font-semibold px-2.5 py-1 rounded-full bg-[var(--surface)] border border-[var(--border)]">
                {item}
              </li>
            ))}
          </ul>
        ) : (
          <p className="text-[14px] text-[var(--muted)] mt-1.5">{t('person.privateNone')}</p>
        )}
      </section>
    </div>
  )
}

/** The editor is long, so the sections are listed under the title with how
 * much each holds. Empty ones say so: a nudge to finish the profile
 * (the activation goal in spec §8). */
function SectionLinks({ person, onJump }: { person: Detail; onJump: () => void }) {
  const { t } = useTranslation()
  const links: { id: string; label: string; count?: number }[] = [
    { id: 'about', label: t('person.aboutTitle') },
    { id: 'alerts', label: t('person.alertsTitle'), count: person.critical_alerts.length },
    { id: 'allergies', label: t('person.allergiesTitle'), count: person.allergies.length },
    { id: 'conditions', label: t('person.conditionsTitle'), count: person.conditions.length },
    { id: 'medicines', label: t('person.medsTitle'), count: person.medications.length },
    { id: 'contacts', label: t('person.contactsTitle'), count: person.emergency_contacts.length },
    { id: 'sharing', label: t('person.navSharing') },
  ]
  return (
    <nav aria-label={t('person.navLabel')} className="mt-5">
      <ul className="flex flex-wrap gap-2">
        {links.map((l) => {
          const empty = l.count === 0
          return (
            <li key={l.id}>
              <a
                href={`#${l.id}`}
                onClick={onJump}
                className={`h-11 px-3.5 rounded-full inline-flex items-center gap-2 text-[14px] font-semibold whitespace-nowrap transition-colors ${
                  empty
                    ? 'border border-dashed border-[var(--control)] text-[var(--muted)] hover:border-[var(--accent)]'
                    : 'bg-[var(--panel)] hover:bg-[var(--active)]'
                }`}
              >
                {l.label}
                {l.count !== undefined && (
                  <span className={`text-[13px] tabular-nums ${empty ? '' : 'text-[var(--muted)]'}`}>{empty ? t('person.navNone') : l.count}</span>
                )}
              </a>
            </li>
          )
        })}
      </ul>
    </nav>
  )
}

function ConfirmButton({ person, className }: { person: Detail; className: string }) {
  const { t } = useTranslation()
  const { track } = useSave()
  const update = useUpdatePerson(person.id)
  return (
    <button type="button" className={className} onClick={() => track(update.mutateAsync({ info_confirmed_at: new Date().toISOString() }))}>
      <CheckCheck size={17} /> {t('person.confirm')}
    </button>
  )
}

function Editor({ person }: { person: Detail }) {
  const { t } = useTranslation()
  const { data: profiles } = useProfiles()
  const { data: photoUrl } = usePhotoUrl(person.photo_path)
  const [tab, setTab] = useState<'details' | 'preview'>('details')
  const index = Math.max(0, profiles?.findIndex((p) => p.personId === person.id) ?? 0)
  const hue = personHue(index)
  const name = person.display_name || person.full_name
  const days = daysSince(freshestOf(person))
  const left = STALE_AFTER_DAYS - days
  const overdue = left < 0

  return (
    <div className="w-full max-w-[1180px] mx-auto px-4 sm:px-6 lg:px-10 pt-4 md:pt-8">
      <Link to="/" className="inline-flex items-center gap-1.5 h-11 -ml-2 px-2 rounded-[10px] text-[14px] font-semibold text-[var(--muted)] hover:text-[var(--text)] hover:bg-[var(--panel)]">
        <ArrowLeft size={16} /> {t('profiles.title')}
      </Link>

      <header className="mt-2 flex flex-col lg:flex-row lg:items-end lg:justify-between gap-4">
        <div className="flex items-center gap-4 min-w-0">
          {photoUrl ? (
            <img src={photoUrl} alt="" className="w-14 h-14 rounded-[14px] object-cover flex-none" />
          ) : (
            <span className="w-14 h-14 rounded-[14px] flex-none flex items-center justify-center text-[18px] font-extrabold" style={{ background: hue.bg, color: hue.fg }}>
              {initials(name)}
            </span>
          )}
          <div className="min-w-0">
            <h1 className="text-[26px] md:text-[30px] font-extrabold tracking-[-0.015em] leading-tight truncate">{name}</h1>
            <p className={`text-[14px] mt-0.5 ${overdue ? 'text-[var(--warning-ink)] font-semibold' : 'text-[var(--muted)]'}`}>
              {t(`profiles.relationship.${person.person_is_my}`)} ·{' '}
              {overdue ? t('profiles.overdueBy', { count: -left }) : days === 0 ? t('profiles.updatedToday') : t('profiles.updatedDaysAgo', { count: days })}
            </p>
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-2 lg:justify-end">
          <SaveStamp />
          <Link to={`/person/${person.id}/qr`} className={ghostButton}>
            <QrCode size={16} /> {t('profiles.qr')}
          </Link>
          {!overdue && <ConfirmButton person={person} className={ghostButton} />}
        </div>
      </header>

      {overdue && (
        <div className="mt-5 rounded-[16px] bg-[#fffbeb] border border-[#fde68a] p-4 sm:p-5 flex flex-col sm:flex-row sm:items-center gap-3 sm:gap-5">
          <div className="flex-1 min-w-0">
            <p className="text-[15px] font-bold text-[#92400e]">{t('person.overdueTitle', { count: days })}</p>
            <p className="text-[14px] text-[#92400e] mt-1 leading-relaxed">{t('person.confirmExplain')}</p>
          </div>
          <ConfirmButton person={person} className={`${primaryButton} flex-none`} />
        </div>
      )}

      <SectionLinks person={person} onJump={() => setTab('details')} />

      <div role="tablist" aria-label={t('person.viewLabel')} className="xl:hidden mt-5 grid grid-cols-2 gap-1 p-1 rounded-[12px] bg-[var(--panel)]">
        {(['details', 'preview'] as const).map((key) => (
          <button
            key={key}
            type="button"
            role="tab"
            aria-selected={tab === key}
            onClick={() => setTab(key)}
            className={`h-11 rounded-[9px] text-[14px] font-bold transition-colors ${tab === key ? 'bg-[var(--surface)] text-[var(--text)] shadow-[0_1px_2px_rgba(0,0,0,0.06)]' : 'text-[var(--muted)]'}`}
          >
            {key === 'details' ? t('person.tabDetails') : t('person.tabPreview')}
          </button>
        ))}
      </div>

      <div className="mt-5 xl:mt-8 grid gap-6 xl:grid-cols-[minmax(0,1fr)_380px] xl:items-start">
        <div className={`flex flex-col gap-4 ${tab === 'details' ? '' : 'hidden xl:flex'}`}>
          <BasicInfo person={person} hue={hue} />
          <Alerts person={person} />
          <Allergies person={person} />
          <Conditions person={person} />
          <Medicines person={person} />
          <Contacts person={person} />
          <Sharing person={person} />
          {!overdue && (
            <section className="rounded-[16px] bg-[var(--panel)] p-4 sm:p-6 flex flex-col sm:flex-row sm:items-center gap-3 sm:gap-5">
              <div className="flex-1 min-w-0">
                <h2 className="text-[17px] font-bold">{t('person.confirmTitle')}</h2>
                <p className="text-[14px] text-[var(--muted)] mt-1 leading-relaxed">{t('person.confirmExplain')}</p>
              </div>
              <ConfirmButton person={person} className={`${primaryButton} flex-none`} />
            </section>
          )}
        </div>
        <div className={`xl:sticky xl:top-6 ${tab === 'preview' ? '' : 'hidden xl:block'}`}>
          <PreviewColumn person={person} />
        </div>
      </div>
    </div>
  )
}

export function PersonDetail() {
  const { t } = useTranslation()
  const { personId = '' } = useParams()
  const { data: person, isLoading, isError, refetch } = usePersonDetail(personId)

  if (isLoading) {
    return (
      <div className="w-full max-w-[1180px] mx-auto px-4 sm:px-6 lg:px-10 pt-16 grid gap-4" aria-busy="true">
        <div className="h-14 w-72 rounded-[14px] bg-[var(--panel)]" />
        <div className="h-[420px] rounded-[16px] bg-[var(--panel)]" />
      </div>
    )
  }

  if (isError || !person) {
    return (
      <div className="w-full max-w-[640px] mx-auto px-4 pt-16">
        <section className="rounded-[16px] bg-[var(--panel)] p-6">
          <h1 className="text-[22px] font-extrabold">{isError ? t('person.loadError') : t('person.notFound')}</h1>
          <div className="mt-4 flex flex-wrap gap-2">
            {isError && (
              <button type="button" className={ghostButton} onClick={() => refetch()}>
                {t('profiles.retry')}
              </button>
            )}
            <Link to="/" className={ghostButton}>
              <ArrowLeft size={16} /> {t('profiles.title')}
            </Link>
          </div>
        </section>
      </div>
    )
  }

  return (
    <SaveProvider>
      <Editor person={person} />
    </SaveProvider>
  )
}
