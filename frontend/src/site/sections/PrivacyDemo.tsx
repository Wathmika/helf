import { useState } from 'react'
import { Ban } from 'lucide-react'
import { Phone } from '../components/Phone'
import { ScanCard } from '../components/ScanCard'
import { SectionHead } from '../components/SectionHead'
import { Reveal } from '../components/Reveal'

function Switch({ on, onToggle, label }: { on: boolean; onToggle: () => void; label: string }) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={on}
      aria-label={label}
      onClick={onToggle}
      className="flex-none w-[58px] h-11 -mr-1.5 flex items-center justify-center rounded-full"
    >
      <span
        className={`relative block w-[46px] h-[28px] rounded-full transition-colors duration-200 ${
          on ? 'bg-[var(--accent)]' : 'bg-[#cfc9be]'
        }`}
      >
        <span
          className={`absolute top-[3px] w-[22px] h-[22px] rounded-full bg-white shadow-sm transition-all duration-200 ${
            on ? 'left-[21px]' : 'left-[3px]'
          }`}
        />
      </span>
    </button>
  )
}

type Key = 'age' | 'blood' | 'medicines' | 'contact' | 'area'

const ROWS: { key: Key; title: string; value: string; hint: string }[] = [
  { key: 'age', title: 'Age', value: '72', hint: 'Worked out from the date of birth — the date itself stays private' },
  { key: 'blood', title: 'Blood group', value: 'O+', hint: 'Shown as “for information only”' },
  { key: 'medicines', title: 'Medicines', value: 'Warfarin 5mg', hint: 'Private by default — switch on only what responders must know' },
  { key: 'contact', title: 'Call button for Nadeesha', value: 'Daughter', hint: 'Can still be texted on a scan even if this is off' },
  { key: 'area', title: 'Lost-person mode', value: 'Nugegoda', hint: 'For dementia — a general area only, never an address' },
]

export function PrivacyDemo() {
  const [on, setOn] = useState<Record<Key, boolean>>({
    age: true,
    blood: true,
    medicines: false,
    contact: true,
    area: false,
  })
  const toggle = (k: Key) => setOn((s) => ({ ...s, [k]: !s[k] }))
  const shown = Object.values(on).filter(Boolean).length

  return (
    <section id="privacy" className="bg-[var(--ground)] py-20 md:py-28">
      <div className="max-w-[1200px] mx-auto px-5 md:px-8 grid grid-cols-1 lg:grid-cols-[1fr_380px] gap-14 lg:gap-16 items-center">
        <div>
          <SectionHead
            kicker="You decide, field by field"
            title="Flip a switch. Watch what a stranger sees change."
            body="Every detail on a profile has its own switch, right next to it. Nothing reaches the scan page unless someone in the family turned it on."
          />

          <Reveal delay={100} className="mt-9 bg-[var(--surface)] border border-[var(--rule)] rounded-[24px] p-2 max-w-[560px]">
            {ROWS.map((r, i) => (
              <div
                key={r.key}
                className={`flex items-center gap-4 px-4 py-3.5 rounded-2xl transition-colors hover:bg-[var(--ground)] ${
                  i > 0 ? 'border-t border-[var(--rule)]' : ''
                }`}
              >
                <div className="flex-1 min-w-0">
                  <p className="text-[15px] font-bold flex flex-wrap items-baseline gap-x-2">
                    {r.title}
                    <span className={`text-[14px] font-semibold transition-colors ${on[r.key] ? 'text-[var(--accent)]' : 'text-[var(--muted)] line-through decoration-1'}`}>
                      {r.value}
                    </span>
                  </p>
                  <p className="text-[13px] text-[var(--muted)] mt-0.5 leading-snug">{r.hint}</p>
                </div>
                <Switch on={on[r.key]} onToggle={() => toggle(r.key)} label={r.title} />
              </div>
            ))}
          </Reveal>

          <Reveal delay={160} className="mt-5 max-w-[560px] flex gap-3 items-start text-[14px] text-[var(--muted)] leading-relaxed">
            <span className="w-8 h-8 rounded-full bg-[var(--raised)] flex-none flex items-center justify-center text-[var(--text)]">
              <Ban size={15} />
            </span>
            <p>
              <span className="font-bold text-[var(--text)]">Never on the scan page, whatever the switches say:</span> insurance
              policy numbers, photos of medicine packets, and any home address.
            </p>
          </Reveal>
        </div>

        <Reveal delay={120} className="flex flex-col items-center">
          <Phone>
            <ScanCard
              name="Sunil Perera"
              age={on.age ? 72 : undefined}
              alerts={[{ label: 'Takes blood thinners', note: 'Warfarin' }]}
              bloodGroup={on.blood ? 'O+' : undefined}
              medicines={on.medicines ? ['Warfarin 5mg · once daily'] : undefined}
              contact={on.contact ? { name: 'Nadeesha', relationship: 'daughter' } : undefined}
              homeArea={on.area ? 'Nugegoda' : undefined}
              compact
            />
          </Phone>
          <p className="mt-4 text-[13px] font-semibold text-[var(--muted)]">
            {shown} of {ROWS.length} switched on · live preview
          </p>
        </Reveal>
      </div>
    </section>
  )
}
