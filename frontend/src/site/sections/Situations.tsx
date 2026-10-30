import { SectionHead } from '../components/SectionHead'
import { Reveal } from '../components/Reveal'

// Illustrative situations, not customer stories — helf has no customers to
// quote yet, and a made-up testimonial on a medical product is a lie.
const SITUATIONS = [
  {
    who: 'Thaththa, 72',
    where: 'On his evening walk',
    tint: '#0f766e',
    soft: '#dceeec',
    story:
      'He feels dizzy near the junction. The tea-shop owner who sits him down scans the card in his shirt pocket, sees he takes blood thinners, and taps to call you.',
    shown: ['Blood thinners alert', 'Call button for his son', '1990'],
  },
  {
    who: 'Kasun, 24',
    where: 'Riding home on the Galle Road',
    tint: '#8a4b2a',
    soft: '#f3e4da',
    story:
      'After a fall, the first person there finds the sticker on his helmet. The page says his blood group, and tells them not to take the helmet off.',
    shown: ['Blood group', 'Do not remove helmet', 'Call button for his mother'],
  },
  {
    who: 'Amma, 80',
    where: 'At the market, confused',
    tint: '#5b4b8a',
    soft: '#e8e3f3',
    story:
      'She can’t remember the way home. A stall-keeper scans her wallet card and sees she may be lost, the area she lives in, and who to call — never her address.',
    shown: ['Lost-person notice', 'Lives near: Nugegoda', 'Call button for her daughter'],
  },
]

export function Situations() {
  return (
    <section className="bg-[var(--ground)] py-20 md:py-28">
      <div className="max-w-[1200px] mx-auto px-5 md:px-8">
        <SectionHead
          kicker="Who it’s for"
          title="Made for the people you worry about."
          body="Examples of the moments helf is built for — what happens, and exactly what the person helping would see."
        />

        <div className="mt-14 grid grid-cols-1 md:grid-cols-3 gap-5">
          {SITUATIONS.map((s, i) => (
            <Reveal key={s.who} delay={i * 90}>
              <article className="group h-full bg-[var(--surface)] border border-[var(--rule)] rounded-[24px] overflow-hidden flex flex-col transition-all duration-300 hover:-translate-y-1.5 hover:shadow-[0_26px_50px_-32px_rgba(20,26,33,0.5)]">
                <div className="h-2 transition-all duration-300 group-hover:h-3" style={{ background: s.tint }} />
                <div className="p-6 md:p-7 flex flex-col flex-1">
                  <div className="flex items-center gap-3">
                    <span
                      className="w-11 h-11 rounded-2xl flex items-center justify-center text-white font-extrabold"
                      style={{ background: s.tint }}
                    >
                      {s.who[0]}
                    </span>
                    <div>
                      <p className="font-extrabold text-[17px] leading-tight">{s.who}</p>
                      <p className="text-[13px] text-[var(--muted)]">{s.where}</p>
                    </div>
                  </div>
                  <p className="text-[15px] leading-relaxed mt-5 flex-1">{s.story}</p>
                  <div className="mt-6">
                    <p className="text-[12px] font-bold text-[var(--muted)] mb-2">What the helper sees</p>
                    <div className="flex flex-wrap gap-1.5">
                      {s.shown.map((x) => (
                        <span
                          key={x}
                          className="text-[12px] font-bold px-2.5 py-1 rounded-full"
                          style={{ background: s.soft, color: s.tint }}
                        >
                          {x}
                        </span>
                      ))}
                    </div>
                  </div>
                </div>
              </article>
            </Reveal>
          ))}
        </div>
      </div>
    </section>
  )
}
