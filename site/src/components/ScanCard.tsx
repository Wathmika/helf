import { MapPin, Phone, Volume2 } from 'lucide-react'

/** Faithful recreation of the real public scan page (see
 * docs/scan-page-preview-*.html): EMERGENCY badge and language switch, the
 * person card, a Listen button, critical alerts as the loudest block, the
 * contact and 1990 call buttons, then the quieter facts. Only fields a
 * family switched on appear — the same rule build_public_profile() uses. */
export interface ScanCardProps {
  name: string
  age?: number
  alerts: { label: string; note: string }[]
  bloodGroup?: string
  medicines?: string[]
  homeArea?: string
  contact?: { name: string; relationship: string }
  calling?: boolean
  lang?: 'si' | 'ta' | 'en'
  compact?: boolean
}

const LANGS: { code: 'si' | 'ta' | 'en'; label: string }[] = [
  { code: 'si', label: 'සිං' },
  { code: 'ta', label: 'தமி' },
  { code: 'en', label: 'EN' },
]

export function ScanCard({
  name,
  age,
  alerts,
  bloodGroup,
  medicines,
  homeArea,
  contact,
  calling = false,
  lang = 'en',
  compact = false,
}: ScanCardProps) {
  return (
    <div className="px-3.5 pb-5 text-[var(--text)]">
      <div className="flex items-center justify-between mb-2.5">
        <span className="inline-flex items-center gap-1 bg-[var(--negative)] text-white text-[11px] font-extrabold px-2 py-1 rounded-md tracking-wide">
          <span className="text-[13px] leading-none">+</span> EMERGENCY
        </span>
        <div className="flex gap-1">
          {LANGS.map((l) => (
            <span
              key={l.code}
              className={`text-[10px] font-bold px-1.5 py-1 rounded-md border-[1.5px] transition-colors ${
                l.code === lang
                  ? 'bg-[var(--accent)] text-white border-[var(--accent)]'
                  : 'border-[var(--accent)] text-[var(--accent)]'
              }`}
            >
              {l.label}
            </span>
          ))}
        </div>
      </div>

      {homeArea && (
        <div className="border-[2.5px] border-[var(--warning)] bg-[#fff7ed] rounded-xl p-2.5 mb-2.5 text-[12px] leading-snug">
          <p className="font-bold">This person may be lost or confused. Please stay with them and call their family.</p>
          <p className="text-[var(--muted)] mt-0.5">Lives near: {homeArea}</p>
        </div>
      )}

      <div className="bg-[var(--surface)] border border-[var(--rule)] rounded-xl p-3 mb-2.5">
        <p className="text-[19px] font-extrabold leading-tight">{name}</p>
        {age !== undefined && <p className="text-[13px] text-[var(--muted)] mt-0.5">Age {age}</p>}
      </div>

      {!compact && (
        <span className="inline-flex items-center gap-1.5 border-[1.5px] border-[var(--accent)] text-[var(--accent)] rounded-lg px-2.5 py-1.5 text-[12px] font-bold mb-2.5">
          <Volume2 size={13} /> Listen
        </span>
      )}

      {alerts.length > 0 && (
        <div className="bg-[var(--surface)] border-[2.5px] border-[var(--negative)] rounded-xl p-3 mb-2.5">
          <p className="font-extrabold text-[var(--negative)] text-[13px] mb-1">Critical alerts</p>
          {alerts.map((a, i) => (
            <div key={a.label} className={`flex gap-2 py-1.5 ${i > 0 ? 'border-t border-[var(--rule)]' : ''}`}>
              <span className="text-[var(--negative)] font-black text-[13px] leading-5">!</span>
              <div>
                <p className="font-bold text-[13px] leading-5">{a.label}</p>
                <p className="text-[12px] text-[var(--muted)]">{a.note}</p>
              </div>
            </div>
          ))}
        </div>
      )}

      {contact && (
        <div
          className={`w-full rounded-xl py-3 mb-2 text-[13px] font-extrabold text-white flex items-center justify-center gap-2 transition-all duration-300 ${
            calling ? 'bg-[var(--accent-ink)] scale-[0.98] ring-4 ring-[var(--accent-soft)]' : 'bg-[var(--accent)]'
          }`}
        >
          <Phone size={14} strokeWidth={2.5} />
          {calling ? `Calling ${contact.name}…` : `Call ${contact.name} (${contact.relationship})`}
        </div>
      )}
      <div className="w-full bg-[var(--ink)] text-white rounded-xl py-3 text-[13px] font-extrabold flex items-center justify-center gap-2">
        <Phone size={14} strokeWidth={2.5} /> Call 1990 ambulance
      </div>

      {medicines && medicines.length > 0 && (
        <div className="bg-[var(--surface)] border border-[var(--rule)] rounded-xl p-3 mt-2.5 screen-in">
          <p className="font-bold text-[13px] mb-1">Current medicines</p>
          {medicines.map((m) => (
            <p key={m} className="text-[12px] text-[var(--muted)]">
              {m}
            </p>
          ))}
        </div>
      )}

      {bloodGroup && (
        <div className="bg-[var(--surface)] border border-[var(--rule)] rounded-xl p-3 mt-2.5 flex justify-between text-[12px] screen-in">
          <span className="text-[var(--muted)]">Blood group (for information only)</span>
          <span className="font-extrabold">{bloodGroup}</span>
        </div>
      )}

      {!compact && (
        <>
          <p className="text-[12px] font-bold text-[var(--positive)] mt-3 flex items-center gap-1.5">✓ Updated today</p>
          <div className="mt-2 w-full border-[1.5px] border-[var(--accent)] text-[var(--accent)] rounded-xl py-2.5 text-[12px] font-bold flex items-center justify-center gap-1.5">
            <MapPin size={13} /> Share my location with the family
          </div>
        </>
      )}
    </div>
  )
}
