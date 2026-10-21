import { useState } from 'react'
import { Bike, Check, CreditCard, RotateCw, Smartphone } from 'lucide-react'
import { QrMark } from '../components/QrMark'
import { SectionHead } from '../components/SectionHead'
import { Reveal } from '../components/Reveal'

type Way = 'card' | 'sticker' | 'wallpaper'

const WAYS: { id: Way; label: string; icon: typeof CreditCard; title: string; points: string[] }[] = [
  {
    id: 'card',
    label: 'Wallet card',
    icon: CreditCard,
    title: 'Where a wallet or ID gets checked first',
    points: [
      'Name, key alerts and the QR on the front',
      'A short text backup inside the QR, readable with no signal',
      'Lost it? Stop that one card — the others keep working',
    ],
  },
  {
    id: 'sticker',
    label: 'Helmet sticker',
    icon: Bike,
    title: 'For riders, where a responder looks before moving anyone',
    points: [
      'Goes on a helmet, bike or three-wheeler',
      'The page itself reminds helpers not to remove a helmet',
      'Same profile as the card, with its own label',
    ],
  },
  {
    id: 'wallpaper',
    label: 'Lock-screen wallpaper',
    icon: Smartphone,
    title: 'Nothing extra to carry or lose',
    points: [
      'The QR is the wallpaper, visible without unlocking',
      'Download it from your profile and set it once',
      'Works for anyone who always has their phone',
    ],
  },
]

function WalletCard() {
  const [flipped, setFlipped] = useState(false)
  return (
    <div className="w-full max-w-[420px]">
      <button
        type="button"
        onClick={() => setFlipped((f) => !f)}
        aria-label={flipped ? 'Show the front of the card' : 'Show the back of the card'}
        className="flip w-full aspect-[1.586] block text-left group"
      >
        <div className={`flip-inner relative w-full h-full ${flipped ? 'is-flipped' : ''}`}>
          <div className="flip-face absolute inset-0 rounded-[22px] bg-white border border-[var(--rule)] p-5 flex gap-4 shadow-[0_26px_50px_-28px_rgba(10,61,57,0.55)] transition-shadow group-hover:shadow-[0_30px_60px_-26px_rgba(10,61,57,0.65)]">
            <div className="flex-1 flex flex-col">
              <div className="flex items-center gap-2">
                <span className="w-7 h-7 rounded-lg bg-[var(--accent)] text-white text-[13px] font-extrabold flex items-center justify-center">
                  h
                </span>
                <span className="text-[11px] font-extrabold text-[var(--negative)] tracking-wide">SCAN IN AN EMERGENCY</span>
              </div>
              <p className="text-[12px] font-semibold mt-2 leading-snug">හදිසි අවස්ථාවකදී · அவசரத்தில்</p>
              <p className="text-[20px] font-extrabold mt-auto leading-tight">Sunil Perera</p>
              <p className="text-[12px] text-[var(--negative)] font-bold mt-1">! Blood thinners · ! Insulin</p>
            </div>
            <div className="self-center">
              <QrMark size={104} />
            </div>
          </div>

          <div className="flip-face flip-back absolute inset-0 rounded-[22px] bg-[var(--deep)] text-white p-5 flex flex-col shadow-[0_26px_50px_-28px_rgba(10,61,57,0.55)]">
            <p className="text-[12px] font-bold text-[#9fe0d6]">If you found this person</p>
            <ol className="mt-2 text-[13px] leading-snug flex flex-col gap-1.5 text-white/90">
              <li>1. Call 1990 for an ambulance.</li>
              <li>2. Point your phone camera at the front.</li>
              <li>3. Tap the call button to reach the family.</li>
            </ol>
            <div className="mt-auto flex items-end justify-between">
              <p className="text-[11px] text-white/60">No app needed · works in සිංහල, தமிழ், English</p>
              <span className="text-[22px] font-extrabold">1990</span>
            </div>
          </div>
        </div>
      </button>
      <p className="text-center text-[13px] font-semibold text-[var(--muted)] mt-4 flex items-center justify-center gap-1.5">
        <RotateCw size={14} /> Tap the card to turn it over
      </p>
    </div>
  )
}

function Sticker() {
  return (
    <div className="relative w-[320px] h-[260px] screen-in">
      <svg viewBox="0 0 320 260" className="absolute inset-0 w-full h-full" aria-hidden>
        <path d="M40 200 C40 90 110 30 190 30 C260 30 300 90 300 160 L300 200 Z" fill="#1f2937" />
        <path d="M120 120 C150 95 240 95 290 130 L300 175 L130 175 Z" fill="#0d1115" opacity="0.9" />
        <rect x="30" y="196" width="280" height="22" rx="11" fill="#141a21" />
      </svg>
      <div className="absolute left-[58px] top-[74px] -rotate-[10deg] rounded-full bg-white w-[118px] h-[118px] flex items-center justify-center shadow-[0_10px_24px_-10px_rgba(0,0,0,0.6)]">
        <QrMark size={64} />
      </div>
    </div>
  )
}

function Wallpaper() {
  return (
    <div className="w-[230px] rounded-[34px] bg-[var(--ink)] p-2 shadow-[0_26px_50px_-24px_rgba(0,0,0,0.5)] screen-in">
      <div className="rounded-[27px] bg-[#10302d] h-[440px] flex flex-col items-center pt-12 text-white">
        <p className="text-[12px] text-white/70 font-semibold">Tuesday 20 October</p>
        <p className="text-[52px] font-bold leading-none">9:41</p>
        <div className="mt-auto mb-10 flex flex-col items-center">
          <QrMark size={110} />
          <p className="text-[11px] font-bold mt-3 text-center leading-snug px-4">
            Emergency? Scan for medical info
            <br />
            <span className="text-white/70 font-semibold">හදිසි · அவசரம்</span>
          </p>
        </div>
      </div>
    </div>
  )
}

export function WaysToCarry() {
  const [way, setWay] = useState<Way>('card')
  const current = WAYS.find((w) => w.id === way)!

  return (
    <section id="carry" className="bg-[var(--surface)] border-y border-[var(--rule)] py-20 md:py-28">
      <div className="max-w-[1200px] mx-auto px-5 md:px-8">
        <SectionHead
          kicker="One profile, carried three ways"
          title="Wherever someone would look first."
          body="Every card, sticker and wallpaper points to the same profile. Edit it once and the page behind every one of them updates."
        />

        <Reveal className="mt-10 flex flex-wrap gap-2.5" delay={80}>
          {WAYS.map((w) => {
            const Icon = w.icon
            const active = w.id === way
            return (
              <button
                key={w.id}
                type="button"
                onClick={() => setWay(w.id)}
                aria-pressed={active}
                className={`h-12 px-5 rounded-full inline-flex items-center gap-2 text-[15px] font-bold transition-all active:scale-[0.97] ${
                  active
                    ? 'bg-[var(--accent)] text-white shadow-[0_10px_22px_-12px_rgba(15,118,110,0.8)]'
                    : 'bg-[var(--raised)] text-[var(--text)] hover:bg-[var(--accent-soft)]'
                }`}
              >
                <Icon size={18} /> {w.label}
              </button>
            )
          })}
        </Reveal>

        <div className="mt-10 grid grid-cols-1 lg:grid-cols-[1.1fr_1fr] gap-12 items-center">
          <div className="min-h-[460px] rounded-[28px] bg-[var(--ground)] flex items-center justify-center p-6 md:p-10">
            <div key={way} className="flex justify-center w-full">
              {way === 'card' && <WalletCard />}
              {way === 'sticker' && <Sticker />}
              {way === 'wallpaper' && <Wallpaper />}
            </div>
          </div>

          <div key={way} className="screen-in">
            <h3 className="text-[24px] md:text-[28px] font-extrabold leading-tight text-balance">{current.title}</h3>
            <ul className="mt-6 flex flex-col gap-4">
              {current.points.map((p) => (
                <li key={p} className="flex gap-3 text-[16px] leading-relaxed">
                  <span className="mt-0.5 w-6 h-6 rounded-full bg-[var(--accent-soft)] text-[var(--accent)] flex-none flex items-center justify-center">
                    <Check size={14} strokeWidth={3} />
                  </span>
                  {p}
                </li>
              ))}
            </ul>
            <p className="mt-8 text-[14px] text-[var(--muted)]">
              Ordering printed cards and stickers isn’t open yet. You’ll be able to download your QR and print a card
              at home.
            </p>
          </div>
        </div>
      </div>
    </section>
  )
}
