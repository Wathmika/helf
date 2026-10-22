import { useState } from 'react'
import { QRCodeSVG } from 'qrcode.react'
import { Bike, Check, CreditCard, RotateCw, Smartphone } from 'lucide-react'
import { QrMark } from '../components/QrMark'
import { HelfBadge, HelfLockup } from '../components/Logo'
import { SCAN_PAGE_URL } from '../config'
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
      'The online QR on the front opens the full profile and texts the family',
      'An offline QR on the back holds the basics as plain text, for no signal',
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

// The text the backend's build_offline_qr_text() would put inside this
// card's offline QR (same line format and alert labels), for a sample
// person. A real card gets it from the offline_qr_text RPC.
const OFFLINE_SAMPLE = [
  'EMERGENCY MEDICAL INFO',
  'Sunil Perera, 72',
  '!! BLOOD THINNER: Warfarin',
  '!! DIABETIC ON INSULIN: Insulin glargine at night',
  'Ambulance: 1990',
  'Info dated 2026-10-20',
].join('\n')

/** A QR that scales with the card (the shared QrMark is fixed-size). */
function CardQr({ value }: { value?: string }) {
  const content = value ?? SCAN_PAGE_URL
  return (
    <div className="qri relative">
      <QRCodeSVG value={content} level="Q" fgColor="#134e4a" bgColor="#ffffff" style={{ width: '100%', height: 'auto' }} />
      <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
        <HelfBadge size="22%" />
      </div>
    </div>
  )
}

/** Tag design #78 ("Mosaic — emerald sheen") from Desktop/helf/helf-tags.html,
 * with the "Help call" logo (Dark variant) in place of the old mark. */
function WalletCard() {
  const [flipped, setFlipped] = useState(false)
  return (
    <div className="w-full max-w-[460px]">
      <button
        type="button"
        onClick={() => setFlipped((f) => !f)}
        aria-label={flipped ? 'Show the front of the card' : 'Show the back of the card'}
        className="flip tag78 w-full block text-left group transition-transform duration-300 hover:-translate-y-1"
      >
        <div className={`flip-inner relative w-full h-full ${flipped ? 'is-flipped' : ''}`}>
          <div className="flip-face face front">
            <HelfLockup className="brand" />
            <h3 className="hl">
              In an emergency?<em>Scan to help me</em>
            </h3>
            <div className="flow">
              <span>Scan</span>→<span>See info</span>→<span>Call 1990</span>
            </div>
            <span className="chip">No signal? Flip for offline QR</span>
            <figure className="qrpanel m-0">
              <CardQr />
              <figcaption className="cap">
                <b>Online</b>Full profile · alerts family
              </figcaption>
            </figure>
          </div>

          <div className="flip-face flip-back face back">
            <HelfLockup className="brand" />
            <figure className="qrpanel m-0">
              <CardQr value={OFFLINE_SAMPLE} />
              <figcaption className="cap">
                <b>Offline</b>Works with no signal
              </figcaption>
            </figure>
            <p className="eyebrow">If you found me</p>
            <ol className="steps m-0 p-0 list-none">
              <li>
                <span>01</span>
                <div>
                  Call 1990<small>Free ambulance, any phone</small>
                </div>
              </li>
              <li>
                <span>02</span>
                <div>
                  Scan the front<small>See my medical info</small>
                </div>
              </li>
              <li>
                <span>03</span>
                <div>
                  Tap to call family<small>They’re texted when you scan</small>
                </div>
              </li>
            </ol>
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
