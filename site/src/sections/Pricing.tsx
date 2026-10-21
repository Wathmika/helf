import { Clock, Info } from 'lucide-react'
import { SectionHead } from '../components/SectionHead'
import { Reveal } from '../components/Reveal'

// No prices have been decided (CLAUDE.md: payments/billing is out of scope
// until the team picks an approach). Replace "To be announced" with real
// figures only once Wathmika confirms them — never ship guessed prices.
const PLANS = [
  {
    name: 'Your family’s profiles',
    price: 'To be announced',
    body: 'Profiles for up to ten people, every privacy switch, scan texts to your family, and the QR to save as a wallpaper.',
    status: 'First to launch',
    featured: true,
  },
  {
    name: 'Printed wallet card',
    price: 'To be announced',
    body: 'A card with the QR, the name and the key alerts, for a wallet or a shirt pocket.',
    status: 'Ordering opens soon',
    featured: false,
  },
  {
    name: 'Helmet or bike sticker',
    price: 'To be announced',
    body: 'A sticker for a helmet, bike or three-wheeler, linked to the same profile.',
    status: 'Ordering opens soon',
    featured: false,
  },
]

export function Pricing() {
  return (
    <section id="pricing" className="bg-[var(--ground)] py-20 md:py-28">
      <div className="max-w-[1200px] mx-auto px-5 md:px-8">
        <SectionHead
          align="center"
          kicker="Pricing"
          title="What it will cost."
          body="We haven’t set prices yet. When we do, they’ll be listed here in rupees."
        />

        <div className="mt-14 grid grid-cols-1 md:grid-cols-3 gap-5 items-stretch">
          {PLANS.map((p, i) => (
            <Reveal key={p.name} delay={i * 80}>
              <div
                className={`h-full rounded-[24px] p-7 flex flex-col transition-all duration-300 hover:-translate-y-1.5 ${
                  p.featured
                    ? 'bg-[var(--deep)] text-white shadow-[0_28px_56px_-32px_rgba(10,61,57,0.9)]'
                    : 'bg-[var(--surface)] border border-[var(--rule)] hover:shadow-[0_24px_48px_-32px_rgba(20,26,33,0.45)]'
                }`}
              >
                <h3 className="text-[18px] font-extrabold">{p.name}</h3>
                <p className={`text-[26px] font-extrabold mt-4 ${p.featured ? 'text-[#9fe0d6]' : 'text-[var(--accent)]'}`}>
                  {p.price}
                </p>
                <p className={`text-[15px] mt-3 leading-relaxed flex-1 ${p.featured ? 'text-white/80' : 'text-[var(--muted)]'}`}>
                  {p.body}
                </p>
                <p
                  className={`mt-6 inline-flex items-center gap-1.5 text-[13px] font-bold ${
                    p.featured ? 'text-white' : 'text-[var(--muted)]'
                  }`}
                >
                  <Clock size={14} /> {p.status}
                </p>
              </div>
            </Reveal>
          ))}
        </div>

        <Reveal delay={240} className="mt-8 flex justify-center">
          <p className="inline-flex items-center gap-2 text-[13px] font-semibold text-[var(--warning-ink)] bg-[var(--warning-soft)] px-4 py-2 rounded-full">
            <Info size={14} /> Placeholder — real prices still to be decided
          </p>
        </Reveal>
      </div>
    </section>
  )
}
