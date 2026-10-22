import { Phone, ScanLine } from 'lucide-react'
import { Reveal } from '../components/Reveal'

export function Responders() {
  return (
    <section className="bg-[var(--deep)] text-white">
      <Reveal className="max-w-[1200px] mx-auto px-5 md:px-8 py-12 md:py-14 flex flex-col md:flex-row md:items-center gap-6 md:gap-10">
        <span className="relative w-14 h-14 rounded-2xl bg-white/10 flex-none flex items-center justify-center">
          <span className="ping-soft absolute inset-0 rounded-2xl bg-white/10" />
          <ScanLine size={26} />
        </span>
        <div className="flex-1">
          <p className="text-[14px] font-bold text-[#9fe0d6]">For paramedics, police and anyone who stops to help</p>
          <p className="text-[19px] md:text-[22px] font-bold leading-snug mt-1.5 text-balance">
            See a helf card, sticker or lock screen? Point any phone camera at the QR. No app, no login.
          </p>
        </div>
        <a
          href="tel:1990"
          className="h-[54px] px-6 inline-flex items-center justify-center gap-2 rounded-2xl bg-[var(--negative)] text-white font-extrabold text-[16px] flex-none transition-all hover:bg-[#a91f1f] active:scale-[0.98]"
        >
          <Phone size={18} strokeWidth={2.5} /> Call 1990
        </a>
      </Reveal>
    </section>
  )
}
