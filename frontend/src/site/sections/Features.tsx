import { BellRing, CalendarCheck, CreditCard, Users, Volume2, WifiOff } from 'lucide-react'
import { SectionHead } from '../components/SectionHead'
import { Reveal } from '../components/Reveal'

// Every line here maps to something real: alert_sms.py / alert_email.py,
// person_invites, the scan page's Listen button, per-card qr_tokens with
// revoke_qr_token, offline_qr_text, and info_confirmed_at. Keep it that way.
const FEATURES = [
  {
    icon: BellRing,
    title: 'Family texted on every scan',
    body: 'Each emergency contact you choose gets an SMS — and an email if they have one — the moment the QR is opened.',
    foot: 'SMS first, email too',
  },
  {
    icon: Users,
    title: 'Share the care',
    body: 'Send a brother or sister a one-time invite code so you can both keep Amma’s profile up to date.',
    foot: 'Invite codes last 7 days',
  },
  {
    icon: Volume2,
    title: 'Read aloud',
    body: 'A Listen button reads the emergency page out loud, for helpers who can’t read it quickly — or at all.',
    foot: 'Uses the helper’s phone voice',
  },
  {
    icon: CreditCard,
    title: 'Lost a card? Stop just that one',
    body: 'Every card and sticker has its own code. Stop a lost one and it shows a “replaced” notice — with the 1990 button still there.',
    foot: 'The rest keep working',
  },
  {
    icon: WifiOff,
    title: 'Made for a weak signal',
    body: 'The emergency page is light enough for a slow connection, and the QR itself carries a short text backup.',
    foot: 'No app, no sign-in for helpers',
  },
  {
    icon: CalendarCheck,
    title: 'A nudge to keep it right',
    body: 'Every few months the app asks you to check the details. One tap says “nothing has changed” — and helpers see it was checked.',
    foot: '“Updated today” on the page',
  },
]

export function Features() {
  return (
    <section className="bg-[var(--surface)] border-y border-[var(--rule)] py-20 md:py-28">
      <div className="max-w-[1200px] mx-auto px-5 md:px-8">
        <SectionHead
          align="center"
          kicker="Built around the worst day"
          title="Small details that matter when it counts."
          body="For parents getting older, children with allergies, riders on busy roads — and the family looking after all of them."
        />

        <div className="mt-14 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
          {FEATURES.map((f, i) => {
            const Icon = f.icon
            return (
              <Reveal key={f.title} delay={(i % 3) * 80}>
                <div className="group h-full bg-[var(--ground)] border border-[var(--rule)] rounded-[24px] p-6 md:p-7 flex flex-col transition-all duration-300 hover:-translate-y-1.5 hover:bg-white hover:border-[var(--accent-soft)] hover:shadow-[0_24px_48px_-30px_rgba(15,118,110,0.55)]">
                  <span className="w-12 h-12 rounded-2xl bg-[var(--accent-soft)] text-[var(--accent)] flex items-center justify-center transition-all duration-300 group-hover:bg-[var(--accent)] group-hover:text-white group-hover:rotate-[-6deg]">
                    <Icon size={22} />
                  </span>
                  <h3 className="text-[19px] font-extrabold mt-5">{f.title}</h3>
                  <p className="text-[15px] text-[var(--muted)] mt-2 leading-relaxed flex-1">{f.body}</p>
                  <p className="text-[13px] font-bold text-[var(--accent)] mt-5 pt-4 border-t border-[var(--rule)]">{f.foot}</p>
                </div>
              </Reveal>
            )
          })}
        </div>
      </div>
    </section>
  )
}
