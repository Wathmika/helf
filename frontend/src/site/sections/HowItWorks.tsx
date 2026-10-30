import { Link } from 'react-router-dom'
import { KeyRound, ListChecks, QrCode } from 'lucide-react'
import { SectionHead } from '../components/SectionHead'
import { Reveal } from '../components/Reveal'

const STEPS = [
  {
    icon: KeyRound,
    title: 'Sign in with a code',
    body: 'Type your phone number or email and we send a one-time code. There are no passwords to remember.',
  },
  {
    icon: ListChecks,
    title: 'Add their details',
    body: 'Allergies, conditions, medicines and up to three emergency contacts. A live preview shows exactly what a stranger will see.',
  },
  {
    icon: QrCode,
    title: 'Put the QR where it’ll be found',
    body: 'Save it as a lock-screen wallpaper, or print a card for a wallet or a sticker for a helmet.',
  },
]

export function HowItWorks() {
  return (
    <section id="how" className="bg-[var(--surface)] border-y border-[var(--rule)] py-20 md:py-28">
      <div className="max-w-[1200px] mx-auto px-5 md:px-8">
        <SectionHead
          align="center"
          kicker="Setting it up"
          title="Three steps, then you can stop worrying about it."
        />

        <div className="relative mt-16 grid grid-cols-1 md:grid-cols-3 gap-10 md:gap-8">
          <div aria-hidden className="hidden md:block absolute top-7 left-[16.6%] right-[16.6%] h-[2px] bg-[var(--rule)]" />
          {STEPS.map((s, i) => {
            const Icon = s.icon
            return (
              <Reveal key={s.title} delay={i * 110} className="relative text-center group">
                <div className="relative mx-auto w-14 h-14 rounded-full bg-[var(--surface)] border-2 border-[var(--accent)] text-[var(--accent)] flex items-center justify-center transition-all duration-300 group-hover:bg-[var(--accent)] group-hover:text-white group-hover:scale-110">
                  <Icon size={22} />
                  <span className="absolute -top-2 -right-2 w-6 h-6 rounded-full bg-[var(--deep)] text-white text-[12px] font-extrabold flex items-center justify-center">
                    {i + 1}
                  </span>
                </div>
                <h3 className="text-[19px] font-extrabold mt-6">{s.title}</h3>
                <p className="text-[15px] text-[var(--muted)] mt-2 leading-relaxed max-w-[320px] mx-auto">{s.body}</p>
              </Reveal>
            )
          })}
        </div>

        <Reveal delay={200} className="mt-14 flex justify-center">
          <Link
            to="/login"
            className="h-[52px] px-7 inline-flex items-center rounded-2xl bg-[var(--accent)] text-white font-extrabold text-[16px] transition-all hover:bg-[var(--accent-ink)] active:scale-[0.98]"
          >
            Start with the first step
          </Link>
        </Reveal>
      </div>
    </section>
  )
}
