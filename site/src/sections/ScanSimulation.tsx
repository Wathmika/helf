import { useState } from 'react'
import { Camera, MapPin, MessageSquareText, PhoneCall, Smartphone } from 'lucide-react'
import { Phone } from '../components/Phone'
import { QrMark } from '../components/QrMark'
import { ScanCard } from '../components/ScanCard'
import { SectionHead } from '../components/SectionHead'
import { Reveal } from '../components/Reveal'

const STEP_MS = 3600

const STEPS = [
  {
    icon: Camera,
    title: 'Someone points a phone camera at it',
    body: 'A passer-by, a three-wheeler driver, a 1990 paramedic. Any ordinary camera reads it — no app, no sign-in.',
  },
  {
    icon: Smartphone,
    title: 'The page opens in their language',
    body: 'Sinhala, Tamil or English, with a Listen button that reads it aloud. Critical alerts come first, in red.',
  },
  {
    icon: PhoneCall,
    title: 'One tap calls the family — or 1990',
    body: 'Big call buttons for the contacts you allowed, and the 1990 ambulance on every single page.',
  },
  {
    icon: MessageSquareText,
    title: 'Your family gets a text straight away',
    body: 'An SMS to every emergency contact the moment it’s scanned. If the helper shares their location, a map link follows.',
  },
]

function CameraScreen() {
  return (
    <div className="h-full bg-[#0d1115] flex flex-col items-center justify-center relative screen-in">
      <div className="absolute inset-x-0 top-12 text-center text-white/60 text-[12px] font-semibold">PHOTO · VIDEO</div>
      <div className="relative p-5">
        {['top-0 left-0 border-t-[3px] border-l-[3px] rounded-tl-xl', 'top-0 right-0 border-t-[3px] border-r-[3px] rounded-tr-xl', 'bottom-0 left-0 border-b-[3px] border-l-[3px] rounded-bl-xl', 'bottom-0 right-0 border-b-[3px] border-r-[3px] rounded-br-xl'].map((c) => (
          <span key={c} className={`absolute w-7 h-7 border-[#f5c542] ${c}`} />
        ))}
        <QrMark size={150} sweep />
      </div>
      <div className="mt-6 bg-[#f5c542] text-[#1a1a1a] text-[12px] font-extrabold px-4 py-2 rounded-full flex items-center gap-1.5">
        <span className="w-4 h-4 rounded bg-[var(--accent)] text-white text-[9px] flex items-center justify-center">h</span>
        Open emergency page
      </div>
      <div className="absolute bottom-6 w-14 h-14 rounded-full border-4 border-white/80" />
    </div>
  )
}

function LockScreen() {
  return (
    <div className="h-full bg-[#10302d] text-white flex flex-col items-center pt-16 px-3 screen-in">
      <p className="text-[13px] font-semibold text-white/70">Tuesday 20 October</p>
      <p className="text-[64px] font-bold leading-none tracking-tight mt-1">3:14</p>

      <div className="buzz w-full mt-10 bg-white/90 text-[var(--text)] rounded-2xl p-3 shadow-lg">
        <div className="flex items-center gap-2 mb-1">
          <span className="w-5 h-5 rounded-md bg-[var(--positive)] text-white flex items-center justify-center">
            <MessageSquareText size={11} />
          </span>
          <span className="text-[11px] font-bold text-[var(--muted)]">MESSAGES · now</span>
        </div>
        <p className="text-[13px] font-bold">helf</p>
        <p className="text-[12px] leading-snug">
          helf: Sunil Perera's emergency QR was scanned Tue 3:14pm. Try calling Sunil Perera now. If you can't reach
          them, call 1990 (ambulance).
        </p>
      </div>

      <div className="w-full mt-2.5 bg-white/75 text-[var(--text)] rounded-2xl p-3 screen-in" style={{ animationDelay: '1300ms' }}>
        <div className="flex items-center gap-2 mb-1">
          <span className="w-5 h-5 rounded-md bg-[var(--positive)] text-white flex items-center justify-center">
            <MapPin size={11} />
          </span>
          <span className="text-[11px] font-bold text-[var(--muted)]">MESSAGES · now</span>
        </div>
        <p className="text-[12px] leading-snug">helf: location shared for Sunil Perera. maps.google.com/?q=6.87… Call 1990 if needed.</p>
      </div>
    </div>
  )
}

export function ScanSimulation() {
  const [step, setStep] = useState(0)
  const [paused, setPaused] = useState(false)
  // The active step's progress bar drives auto-advance (onAnimationEnd), so
  // hover-pause freezes the bar and the timer together. With reduced motion
  // there's no bar animation, so nothing plays by itself.
  const [autoplay] = useState(() => !window.matchMedia('(prefers-reduced-motion: reduce)').matches)
  const next = () => setStep((s) => (s + 1) % STEPS.length)

  const card = {
    name: 'Sunil Perera',
    age: 72,
    alerts: [
      { label: 'Takes blood thinners', note: 'Warfarin' },
      { label: 'Diabetic, on insulin', note: 'Insulin glargine at night' },
    ],
    contact: { name: 'Nadeesha', relationship: 'daughter' },
  }

  return (
    <section id="demo" className="bg-[var(--ground)] py-20 md:py-28">
      <div className="max-w-[1200px] mx-auto px-5 md:px-8">
        <SectionHead
          align="center"
          kicker="What happens after a scan"
          title="From a stranger’s camera to your family’s phone."
          body="Watch it play through, or tap a step. Each screen is copied from the real page a helper sees and the real text your family receives."
        />

        <div
          className="mt-14 grid grid-cols-1 lg:grid-cols-[380px_1fr] gap-12 lg:gap-16 items-center"
          onMouseEnter={() => setPaused(true)}
          onMouseLeave={() => setPaused(false)}
          onFocus={() => setPaused(true)}
          onBlur={() => setPaused(false)}
        >
          <Reveal className="flex justify-center">
            <Phone bleed={step === 0 || step === 3}>
              <div key={step} className="h-full">
                {step === 0 && <CameraScreen />}
                {step === 1 && (
                  <div className="screen-in">
                    <ScanCard {...card} />
                  </div>
                )}
                {step === 2 && (
                  <div className="screen-in">
                    <ScanCard {...card} calling compact />
                  </div>
                )}
                {step === 3 && <LockScreen />}
              </div>
            </Phone>
          </Reveal>

          <ol className="flex flex-col gap-3">
            {STEPS.map((s, i) => {
              const Icon = s.icon
              const active = i === step
              return (
                <Reveal as="li" key={s.title} delay={i * 70}>
                  <button
                    type="button"
                    onClick={() => setStep(i)}
                    className={`w-full text-left rounded-2xl p-5 flex gap-4 items-start border transition-all duration-300 ${
                      active
                        ? 'bg-[var(--surface)] border-[var(--accent)] shadow-[0_18px_40px_-26px_rgba(15,118,110,0.6)]'
                        : 'bg-transparent border-transparent hover:bg-[var(--surface)] hover:border-[var(--rule)]'
                    }`}
                  >
                    <span
                      className={`w-11 h-11 rounded-xl flex-none flex items-center justify-center transition-colors ${
                        active ? 'bg-[var(--accent)] text-white' : 'bg-[var(--raised)] text-[var(--muted)]'
                      }`}
                    >
                      <Icon size={20} />
                    </span>
                    <span className="flex-1 min-w-0">
                      <span className={`block text-[17px] md:text-[18px] font-bold ${active ? '' : 'text-[var(--muted)]'}`}>
                        {s.title}
                      </span>
                      <span
                        className={`block text-[15px] text-[var(--muted)] leading-relaxed overflow-hidden transition-all duration-500 ${
                          active ? 'max-h-32 opacity-100 mt-1.5' : 'max-h-0 opacity-0'
                        }`}
                      >
                        {s.body}
                      </span>
                      <span className="block h-[3px] rounded-full bg-[var(--rule)] mt-3 overflow-hidden">
                        {active && autoplay && (
                          <span
                            key={step}
                            onAnimationEnd={next}
                            className="block h-full bg-[var(--accent)] origin-left"
                            style={{
                              animation: `step-fill ${STEP_MS}ms linear both`,
                              animationPlayState: paused ? 'paused' : 'running',
                            }}
                          />
                        )}
                        {active && !autoplay && <span className="block h-full bg-[var(--accent)]" />}
                      </span>
                    </span>
                  </button>
                </Reveal>
              )
            })}
          </ol>
        </div>
      </div>
    </section>
  )
}
