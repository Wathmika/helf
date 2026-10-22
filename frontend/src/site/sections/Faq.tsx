import { useState } from 'react'
import { Plus } from 'lucide-react'
import { SectionHead } from '../components/SectionHead'
import { Reveal } from '../components/Reveal'

// Answers come from docs/architecture-for-frontend.md and the backend code,
// not from what sounds reassuring. Check there before changing any of them.
const FAQS = [
  {
    q: 'Does the person scanning need to install anything?',
    a: 'No. Any phone camera opens the emergency page in the web browser. There is no app and no sign-in for the person helping.',
  },
  {
    q: 'Who can see the information?',
    a: 'Only the fields your family switched on. Medicines are private unless you turn each one on. Insurance policy numbers and photos of medicine packets are never shown, and there is no home address — only a general area, and only in lost-person mode.',
  },
  {
    q: 'Will my family know if it gets scanned?',
    a: 'Yes. Every emergency contact you choose gets an SMS, plus an email if they have one. If the person helping taps “Share my location”, a second message follows with a map link.',
  },
  {
    q: 'What if the details change — new medicines, a new phone number?',
    a: 'Edit the profile and the page behind every card, sticker and wallpaper updates straight away. Only if the change is to something printed on a card itself — like a key alert, or the short offline backup inside the QR — is it worth printing a fresh one.',
  },
  {
    q: 'What if a card is lost?',
    a: 'Stop that card from your profile. It stops showing any details at once and shows a short notice with the 1990 button instead. Your other cards keep working, and you can make a new one. A stopped card can’t be switched back on.',
  },
  {
    q: 'Can more than one of us look after a profile?',
    a: 'Yes. Send a one-time invite code to a brother, sister or relative. Codes last seven days and work once.',
  },
  {
    q: 'How do I sign in?',
    a: 'With a one-time code sent to your phone by SMS, or to your email. There are no passwords.',
  },
  {
    q: 'Is this medical advice?',
    a: 'No. helf shows information a family entered. Always follow trained responders and hospital staff, and call 1990 in an emergency.',
  },
]

export function Faq() {
  const [open, setOpen] = useState<number | null>(0)

  return (
    <section id="faq" className="bg-[var(--surface)] border-t border-[var(--rule)] py-20 md:py-28">
      <div className="max-w-[860px] mx-auto px-5 md:px-8">
        <SectionHead align="center" kicker="Questions" title="The things everyone asks first." />

        <div className="mt-12 flex flex-col gap-3">
          {FAQS.map((f, i) => {
            const isOpen = open === i
            return (
              <Reveal key={f.q} delay={Math.min(i, 4) * 50}>
                <div
                  className={`rounded-2xl border transition-colors duration-300 ${
                    isOpen ? 'bg-[var(--ground)] border-[var(--accent-soft)]' : 'bg-[var(--surface)] border-[var(--rule)] hover:border-[#d9d3c8]'
                  }`}
                >
                  <button
                    type="button"
                    aria-expanded={isOpen}
                    onClick={() => setOpen(isOpen ? null : i)}
                    className="w-full text-left px-5 md:px-6 py-5 flex items-center justify-between gap-4"
                  >
                    <span className="text-[16px] md:text-[17px] font-bold">{f.q}</span>
                    <span
                      className={`w-8 h-8 rounded-full flex-none flex items-center justify-center transition-all duration-300 ${
                        isOpen ? 'bg-[var(--accent)] text-white rotate-45' : 'bg-[var(--raised)] text-[var(--text)]'
                      }`}
                    >
                      <Plus size={16} strokeWidth={2.5} />
                    </span>
                  </button>
                  <div
                    className={`grid transition-[grid-template-rows] duration-300 ease-out ${isOpen ? 'grid-rows-[1fr]' : 'grid-rows-[0fr]'}`}
                  >
                    <div className="overflow-hidden">
                      <p className="px-5 md:px-6 pb-5 text-[15px] text-[var(--muted)] leading-relaxed max-w-[680px]">{f.a}</p>
                    </div>
                  </div>
                </div>
              </Reveal>
            )
          })}
        </div>
      </div>
    </section>
  )
}
