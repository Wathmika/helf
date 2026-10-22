import { Link } from 'react-router-dom'
import { ArrowRight, Phone } from 'lucide-react'
import { Reveal } from '../components/Reveal'
import { QrMark } from '../components/QrMark'

const YEAR = new Date().getFullYear()

export function CtaFooter() {
  return (
    <>
      <section className="bg-[var(--ground)] py-20 md:py-24">
        <div className="max-w-[1200px] mx-auto px-5 md:px-8">
          <Reveal className="relative overflow-hidden rounded-[32px] bg-[var(--accent)] text-white px-6 py-14 md:px-14 md:py-16 grid grid-cols-1 md:grid-cols-[1fr_auto] gap-10 items-center">
            <div
              aria-hidden
              className="absolute -right-24 -top-24 w-[360px] h-[360px] rounded-full border-[48px] border-white/[0.06]"
            />
            <div className="relative">
              <h2 className="text-[24px] sm:text-[30px] md:text-[32px] lg:text-[42px] font-extrabold leading-[1.12] tracking-[-0.015em] text-balance max-w-[620px]">
                Set it up once. It’s there the day it matters.
              </h2>
              <p className="text-white/80 text-[16px] md:text-[18px] mt-4 max-w-[520px] leading-relaxed">
                A few minutes tonight for Amma, Thaththa, or yourself.
              </p>
              <Link
                to="/login"
                className="group mt-8 inline-flex items-center gap-2 h-[54px] px-7 rounded-2xl bg-white text-[var(--accent-ink)] font-extrabold text-[16px] transition-all hover:bg-[var(--accent-soft)] active:scale-[0.98]"
              >
                Create a profile
                <ArrowRight size={18} className="transition-transform group-hover:translate-x-1" />
              </Link>
            </div>
            <div className="relative hidden md:block rotate-[4deg] transition-transform duration-500 hover:rotate-0">
              <div className="bg-white rounded-2xl p-4 shadow-[0_24px_50px_-24px_rgba(0,0,0,0.5)]">
                <QrMark size={150} sweep />
                <p className="text-[12px] font-bold text-[var(--text)] text-center mt-2">Point your camera to try it</p>
              </div>
            </div>
          </Reveal>
        </div>
      </section>

      <footer className="bg-[var(--deep)] text-white">
        <div className="max-w-[1200px] mx-auto px-5 md:px-8 pt-14 pb-10">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-[1.4fr_1fr_1fr_1.2fr] gap-10">
            <div>
              <div className="flex items-center gap-2.5">
                <span className="w-9 h-9 rounded-[10px] bg-white text-[var(--accent)] flex items-center justify-center font-extrabold">
                  h
                </span>
                <span className="font-extrabold text-[18px]">helf</span>
              </div>
              <p className="text-[14px] text-white/70 mt-4 leading-relaxed max-w-[280px]">
                An emergency medical QR for Sri Lankan families, in සිංහල, தமிழ் and English.
              </p>
            </div>

            <div>
              <p className="text-[13px] font-bold text-[#9fe0d6] mb-3">The product</p>
              <ul className="flex flex-col gap-2.5 text-[14px] text-white/80">
                {[
                  ['#demo', 'How a scan works'],
                  ['#carry', 'Cards and stickers'],
                  ['#privacy', 'Privacy switches'],
                  ['#pricing', 'Pricing'],
                ].map(([href, label]) => (
                  <li key={href}>
                    <a href={href} className="hover:text-white transition-colors">
                      {label}
                    </a>
                  </li>
                ))}
              </ul>
            </div>

            <div>
              <p className="text-[13px] font-bold text-[#9fe0d6] mb-3">Your account</p>
              <ul className="flex flex-col gap-2.5 text-[14px] text-white/80">
                <li>
                  <Link to="/login" className="hover:text-white transition-colors">
                    Sign in
                  </Link>
                </li>
                <li>
                  <Link to="/login" className="hover:text-white transition-colors">
                    Create a profile
                  </Link>
                </li>
                <li>
                  <a href="#faq" className="hover:text-white transition-colors">
                    Questions
                  </a>
                </li>
              </ul>
            </div>

            <div className="rounded-2xl bg-white/[0.07] p-5">
              <p className="text-[13px] font-bold text-[#ffb3ae]">In an emergency</p>
              <a href="tel:1990" className="mt-2 flex items-center gap-2 text-[24px] font-extrabold hover:text-[#ffd9d6] transition-colors">
                <Phone size={20} strokeWidth={2.5} /> 1990
              </a>
              <p className="text-[13px] text-white/70 mt-1.5 leading-relaxed">Suwa Seriya, the free national ambulance service.</p>
            </div>
          </div>

          <div className="mt-12 pt-6 border-t border-white/10 flex flex-col md:flex-row md:items-center md:justify-between gap-3 text-[13px] text-white/60">
            <p>helf shows information entered by a person or their family. It is not medical advice or an emergency service.</p>
            <p className="shrink-0">© {YEAR} helf</p>
          </div>
        </div>
      </footer>
    </>
  )
}
