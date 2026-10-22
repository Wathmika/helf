import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Check, Phone, TriangleAlert } from 'lucide-react'
import type { PublicProfile } from '../lib/person'
import { usePhotoUrl } from '../lib/person'

/*
  What a stranger sees after scanning, drawn from the preview_scan_profile
  result (never from the editor's own fields). Section order and wording
  follow the live page: backend/src/app/templates/scan.html with
  scan_page.py's formatting, and the strings copied from scan_text.py into
  the "scan" block of each locale file. Colours are the scan design's flat
  equivalents. It's a picture of a page, so it carries data-ui.
*/

const LANGS = [
  { code: 'si', short: 'සිං' },
  { code: 'ta', short: 'தமி' },
  { code: 'en', short: 'EN' },
] as const

function updatedText(s: (k: string, o?: Record<string, unknown>) => string, updatedAt?: string) {
  if (!updatedAt) return { text: s('scan.updated_old'), old: true }
  const days = Math.max(0, Math.floor((Date.now() - new Date(updatedAt).getTime()) / 86_400_000))
  if (days >= 365) return { text: s('scan.updated_old'), old: true }
  if (days === 0) return { text: s('scan.updated_today'), old: false }
  if (days < 60) return { text: s('scan.updated_days', { n: days }), old: false }
  return { text: s('scan.updated_months', { n: Math.floor(days / 30) }), old: false }
}

export function ScanPreview({ profile }: { profile: PublicProfile }) {
  const { i18n } = useTranslation()
  const [lang, setLang] = useState<string>(i18n.resolvedLanguage ?? 'si')
  const s = i18n.getFixedT(lang) as (k: string, o?: Record<string, unknown>) => string
  const { data: photoUrl } = usePhotoUrl(profile.photo_path)
  const updated = updatedText(s, profile.updated_at)

  const facts: { label: string; value?: string }[] = []
  if (profile.communication_needs) facts.push({ label: s('scan.communication'), value: profile.communication_needs })
  if (profile.languages?.length)
    facts.push({ label: s('scan.languages'), value: profile.languages.map((c) => (['si', 'ta', 'en'].includes(c) ? s(`scan.lang_${c}`) : c)).join(', ') })
  if (profile.blood_group) facts.push({ label: s('scan.blood_group'), value: profile.blood_group })
  if (profile.organ_donor) facts.push({ label: s('scan.organ_donor') })
  if (profile.preferred_hospital) facts.push({ label: s('scan.preferred_hospital'), value: profile.preferred_hospital })
  if (profile.insurer) facts.push({ label: s('scan.insurer'), value: profile.insurer })

  return (
    <div data-ui lang={lang} className="bg-[#fdf6ec] text-[#201a14] text-[14px] leading-[1.45] px-3.5 pt-3.5 pb-6 flex flex-col gap-3">
      <div className="flex items-center justify-between gap-2">
        <span className="inline-flex items-center gap-1.5 bg-[#c62828] text-white text-[12px] font-extrabold px-2.5 py-1 rounded-md">
          + {s('scan.badge')}
        </span>
        <div className="flex gap-0.5" role="group" aria-label="Preview language">
          {LANGS.map((l) => (
            <button
              key={l.code}
              type="button"
              lang={l.code}
              aria-pressed={lang === l.code}
              onClick={() => setLang(l.code)}
              className={`h-8 min-w-9 px-2 rounded-md text-[12px] font-bold ${lang === l.code ? 'bg-[#201a14] text-white' : 'text-[#6b5f51]'}`}
            >
              {l.short}
            </button>
          ))}
        </div>
      </div>

      <div className="bg-white rounded-2xl p-3.5 flex items-center gap-3">
        {photoUrl && <img src={photoUrl} alt="" className="w-16 h-16 rounded-xl object-cover flex-none" />}
        <div className="min-w-0">
          <p className="text-[20px] font-extrabold leading-tight break-words">{profile.name}</p>
          {profile.age !== undefined && <p className="text-[13px] text-[#6b5f51] mt-0.5">{s('scan.age', { n: profile.age })}</p>}
        </div>
      </div>

      {profile.lost_person_mode && (
        <div className="rounded-2xl bg-[#fff2d9] border-2 border-[#f5a524] p-3">
          <p className="text-[13px] font-bold text-[#7a4a04]">{s('scan.lost_banner')}</p>
          {profile.home_area && <p className="text-[13px] text-[#7a4a04] mt-1">{s('scan.home_area', { area: profile.home_area })}</p>}
        </div>
      )}

      {profile.alerts.length > 0 && (
        <div className="rounded-2xl bg-white border-2 border-[#e4472a] p-3">
          <p className="text-[13px] font-extrabold text-[#b8321a] flex items-center gap-1.5">
            <TriangleAlert size={14} /> {s('scan.alerts')}
          </p>
          <ul className="mt-1.5">
            {profile.alerts.map((a) => (
              <li key={a.code} className="py-1.5 border-t border-[#e4472a]/15 first:border-t-0">
                <span className="block text-[14px] font-extrabold">{s(`scan.alert_${a.code}`)}</span>
                {a.note && <span className="block text-[12.5px] font-semibold text-[#7a1a0c]">{a.note}</span>}
              </li>
            ))}
          </ul>
        </div>
      )}

      <div className="flex flex-col gap-2">
        {profile.contacts.map((c) => (
          <span key={c.phone + c.name} className="rounded-xl bg-[#0f766e] text-white px-3 py-3 text-[13.5px] font-extrabold flex items-center gap-2">
            <Phone size={14} strokeWidth={2.5} className="flex-none" />
            {s('scan.call_contact', { name: c.name, relationship: s(`scan.rel_${c.relationship}`) })}
          </span>
        ))}
        <span className="rounded-xl bg-[#111827] text-white px-3 py-3 text-[13.5px] font-extrabold flex items-center gap-2">
          <Phone size={14} strokeWidth={2.5} className="flex-none" /> {s('scan.call_1990')}
        </span>
      </div>

      <PreviewBlock title={s('scan.first_steps')}>
        <ol className="list-decimal pl-5 text-[13px] flex flex-col gap-1">
          <li>{s('scan.step_1')}</li>
          <li>{s('scan.step_2')}</li>
          <li>{s('scan.step_3')}</li>
        </ol>
      </PreviewBlock>

      {profile.allergies.length > 0 && (
        <PreviewBlock title={s('scan.allergies')}>
          <ul className="flex flex-col gap-1.5 text-[13px]">
            {profile.allergies.map((a) => (
              <li key={a.substance}>
                <strong>{a.substance}</strong>
                {s(`scan.sev_${a.severity}`) && <> – <span className="font-semibold text-[#7a1a0c]">{s(`scan.sev_${a.severity}`)}</span></>}
                {a.reaction && <span className="block text-[12.5px] text-[#6b5f51]">{a.reaction}</span>}
              </li>
            ))}
          </ul>
        </PreviewBlock>
      )}

      {profile.conditions.length > 0 && (
        <PreviewBlock title={s('scan.conditions')}>
          <ul className="flex flex-col gap-1 text-[13px]">
            {profile.conditions.map((c) => (
              <li key={c.name}>
                {c.name}
                {c.since_year ? ` (${s('scan.since', { year: c.since_year })})` : ''}
              </li>
            ))}
          </ul>
        </PreviewBlock>
      )}

      {profile.medications.length > 0 && (
        <PreviewBlock title={s('scan.medicines')}>
          <ul className="flex flex-col gap-1 text-[13px]">
            {profile.medications.map((m) => (
              <li key={m.name}>{[m.name, m.dose, m.frequency].filter(Boolean).join(' ')}</li>
            ))}
          </ul>
        </PreviewBlock>
      )}

      {facts.length > 0 && (
        <div className="bg-white rounded-2xl p-3">
          <dl className="text-[13px] flex flex-col gap-1.5">
            {facts.map((f) => (
              <div key={f.label}>
                <dt className="font-bold">{f.label}</dt>
                {f.value && <dd className="text-[#6b5f51]">{f.value}</dd>}
              </div>
            ))}
          </dl>
        </div>
      )}

      <p className={`flex items-center gap-1.5 text-[12.5px] font-semibold ${updated.old ? 'text-[#b45309]' : 'text-[#15803d]'}`}>
        {updated.old ? <TriangleAlert size={14} /> : <Check size={14} strokeWidth={3} />} {updated.text}
      </p>
      <p className="text-[11.5px] text-[#6b5f51] leading-snug">{s('scan.disclaimer')}</p>
    </div>
  )
}

function PreviewBlock({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="bg-white rounded-2xl p-3">
      <p className="text-[13px] font-extrabold mb-1.5">{title}</p>
      {children}
    </div>
  )
}
