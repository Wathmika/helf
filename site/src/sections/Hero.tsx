import type { ReactNode } from 'react'
import { ArrowRight, Check, EyeOff, Lock, MessageSquareText } from 'lucide-react'
import { Phone } from '../components/Phone'
import { QrMark } from '../components/QrMark'
import { ScanCard } from '../components/ScanCard'
import { APP_URL } from '../config'

const TRUST = ['No app needed to scan', 'You choose every field', 'Call buttons for family and 1990']

function Chip({ children, className = '', delay = 0 }: { children: ReactNode; className?: string; delay?: number }) {
  return (
    <div
      className={`float absolute z-20 bg-white text-[var(--text)] rounded-2xl px-3.5 py-2.5 text-[13px] font-bold shadow-[0_14px_30px_-14px_rgba(0,0,0,0.45)] flex items-center gap-2 whitespace-nowrap ${className}`}
      style={{ animationDelay: `${delay}ms` }}
    >
      {children}
    </div>
  )
}

export function Hero() {
  return (
    <section id="top" className="relative bg-[var(--deep)] text-white overflow-hidden">
      <div
        aria-hidden
        className="absolute inset-0 opacity-[0.07]"
        style={{
          backgroundImage:
            'linear-gradient(rgba(255,255,255,.9) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,.9) 1px, transparent 1px)',
          backgroundSize: '44px 44px',
          maskImage: 'radial-gradient(ellipse at 70% 40%, black 20%, transparent 70%)',
          WebkitMaskImage: 'radial-gradient(ellipse at 70% 40%, black 20%, transparent 70%)',
        }}
      />

      <div className="relative max-w-[1200px] mx-auto px-5 md:px-8 pt-[110px] md:pt-[130px] pb-20 md:pb-28">
        <div className="grid grid-cols-1 lg:grid-cols-[1fr_480px] gap-14 lg:gap-10 items-center">
          <div>
            <span
              className="rise-in inline-flex items-center gap-2 text-[13px] font-bold text-[#bff0e6] bg-white/10 px-3.5 py-1.5 rounded-full mb-7"
              style={{ animationDelay: '0ms' }}
            >
              <span className="relative flex w-2 h-2">
                <span className="ping-soft absolute inset-0 rounded-full bg-[#5fe0c8]" />
                <span className="relative w-2 h-2 rounded-full bg-[#5fe0c8]" />
              </span>
              Emergency medical QR for Sri Lanka
            </span>

            <h1
              className="rise-in text-[30px] sm:text-[40px] lg:text-[34px] xl:text-[52px] font-extrabold leading-[1.1] tracking-[-0.02em] text-balance"
              style={{ animationDelay: '70ms' }}
            >
              Scanned once. Everyone who matters knows.
            </h1>

            <p
              className="rise-in text-[17px] md:text-[19px] text-white/80 mt-7 max-w-[540px] leading-relaxed"
              style={{ animationDelay: '140ms' }}
            >
              A QR on a wallet card, a helmet or a phone's lock screen. If Amma, Thaththa or your child is ever found
              in an emergency, whoever helps sees only what you chose to share — in{' '}
              <span className="text-white font-semibold">සිංහල</span>, <span className="text-white font-semibold">தமிழ்</span>{' '}
              or English — and your family gets a text the moment it's scanned.
            </p>

            <div className="rise-in flex flex-col sm:flex-row gap-3 mt-9" style={{ animationDelay: '210ms' }}>
              <a
                href={`${APP_URL}/login`}
                className="group h-[54px] px-6 inline-flex items-center justify-center gap-2 rounded-2xl bg-white text-[var(--accent-ink)] font-extrabold text-[16px] transition-all hover:bg-[var(--accent-soft)] active:scale-[0.98]"
              >
                Create a profile
                <ArrowRight size={18} className="transition-transform group-hover:translate-x-1" />
              </a>
              <a
                href="#demo"
                className="h-[54px] px-6 inline-flex items-center justify-center rounded-2xl border-[1.5px] border-white/40 text-white font-bold text-[16px] transition-all hover:bg-white/10 hover:border-white active:scale-[0.98]"
              >
                See a scan, step by step
              </a>
            </div>

            <ul className="rise-in flex flex-wrap gap-x-6 gap-y-2.5 mt-9" style={{ animationDelay: '280ms' }}>
              {TRUST.map((t) => (
                <li key={t} className="flex items-center gap-2 text-[14px] font-semibold text-white/85">
                  <span className="w-5 h-5 rounded-full bg-white/15 flex items-center justify-center">
                    <Check size={12} strokeWidth={3} />
                  </span>
                  {t}
                </li>
              ))}
            </ul>
          </div>

          <div className="rise-in relative h-[640px] max-w-[480px] w-full mx-auto" style={{ animationDelay: '180ms' }}>
            <div className="absolute left-0 top-[70px] w-[230px] -rotate-[8deg] bg-white rounded-2xl p-4 text-[var(--text)] shadow-[0_24px_50px_-20px_rgba(0,0,0,0.55)] hidden sm:block">
              <div className="flex items-center justify-between mb-3">
                <span className="text-[11px] font-extrabold text-[var(--negative)]">SCAN IN AN EMERGENCY</span>
                <span className="w-5 h-5 rounded-md bg-[var(--accent)] text-white text-[11px] font-extrabold flex items-center justify-center">
                  h
                </span>
              </div>
              <QrMark size={150} sweep />
              <p className="text-[11px] font-bold mt-3 leading-snug">හදිසි අවස්ථාවකදී · அவசரத்தில் · Emergency</p>
              <p className="text-[11px] text-[var(--muted)]">Sunil Perera · blood thinners</p>
            </div>

            <div className="absolute right-0 sm:right-2 top-0">
              <Phone>
                <ScanCard
                  name="Sunil Perera"
                  age={72}
                  alerts={[
                    { label: 'Takes blood thinners', note: 'Warfarin' },
                    { label: 'Diabetic, on insulin', note: 'Insulin glargine at night' },
                  ]}
                  bloodGroup="O+"
                  contact={{ name: 'Nadeesha', relationship: 'daughter' }}
                />
              </Phone>
            </div>

            <Chip className="left-0 sm:-left-6 bottom-[120px]" delay={0}>
              <span className="w-7 h-7 rounded-full bg-[var(--positive-soft)] text-[var(--positive)] flex items-center justify-center">
                <MessageSquareText size={15} />
              </span>
              Nadeesha was texted · just now
            </Chip>
            <Chip className="left-2 sm:left-6 top-[8px] hidden sm:flex" delay={1200}>
              <span className="w-7 h-7 rounded-full bg-[var(--accent-soft)] text-[var(--accent)] flex items-center justify-center">
                <Lock size={14} />
              </span>
              Medicines kept private
            </Chip>
            <Chip className="left-4 sm:left-10 bottom-[16px] hidden sm:flex" delay={2400}>
              <span className="w-7 h-7 rounded-full bg-[var(--raised)] text-[var(--text)] flex items-center justify-center">
                <EyeOff size={14} />
              </span>
              Home address never shown
            </Chip>
          </div>
        </div>
      </div>
    </section>
  )
}
