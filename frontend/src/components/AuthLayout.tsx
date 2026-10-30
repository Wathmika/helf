import type { ReactNode } from 'react'
import { Link } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { ArrowLeft, Check, MessageSquareText, Phone } from 'lucide-react'
import { HelfLockup } from './Logo'
import { LanguageSwitch } from './LanguageSwitch'

const GRID_TEXTURE = {
  backgroundImage:
    'linear-gradient(rgba(255,255,255,.9) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,.9) 1px, transparent 1px)',
  backgroundSize: '44px 44px',
  maskImage: 'radial-gradient(ellipse at 70% 30%, black 15%, transparent 70%)',
  WebkitMaskImage: 'radial-gradient(ellipse at 70% 30%, black 15%, transparent 70%)',
} as const

/** A small picture of what a helper sees, so the sign-in screen shows what
 * the product is for. Sample content, same layout as the scan page. */
function ScanPeek() {
  return (
    <div className="relative w-[300px] xl:w-[320px]" aria-hidden="true">
      <div className="float absolute -top-6 -left-8 z-10 bg-white text-[var(--text)] rounded-2xl px-3.5 py-2.5 text-[13px] font-bold shadow-[0_14px_30px_-14px_rgba(0,0,0,0.45)] flex items-center gap-2 whitespace-nowrap">
        <span className="w-7 h-7 rounded-full bg-[var(--positive-soft)] text-[var(--positive)] flex items-center justify-center">
          <MessageSquareText size={15} />
        </span>
        Nadeesha was texted · just now
      </div>
      <div className="rotate-[-3deg] bg-[var(--ground)] text-[var(--text)] rounded-[24px] p-4 shadow-[0_28px_60px_-28px_rgba(0,0,0,0.6)]">
        <span className="inline-flex items-center bg-[var(--negative)] text-white text-[11px] font-extrabold px-2 py-1 rounded-md tracking-wide">
          + EMERGENCY
        </span>
        <div className="bg-white rounded-xl p-3 mt-2.5">
          <p className="text-[17px] font-extrabold leading-tight">Sunil Perera</p>
          <p className="text-[12px] text-[var(--muted)]">Age 72</p>
        </div>
        <div className="bg-white border-[2.5px] border-[var(--negative)] rounded-xl p-3 mt-2">
          <p className="text-[12px] font-extrabold text-[var(--negative)]">Critical alerts</p>
          <p className="text-[13px] font-bold mt-1">! Takes blood thinners</p>
          <p className="text-[12px] text-[var(--muted)]">Warfarin</p>
        </div>
        <div className="mt-2 bg-[var(--accent)] text-white rounded-xl py-2.5 text-[12px] font-extrabold flex items-center justify-center gap-1.5">
          <Phone size={12} strokeWidth={2.5} /> Call Nadeesha (daughter)
        </div>
        <div className="mt-1.5 bg-[var(--ink)] text-white rounded-xl py-2.5 text-[12px] font-extrabold flex items-center justify-center gap-1.5">
          <Phone size={12} strokeWidth={2.5} /> Call 1990 ambulance
        </div>
      </div>
    </div>
  )
}

/** Frame for every sign-in screen.
 * Desktop: a deep-teal brand band on the left (like the promo site's hero)
 * and the form on the right.
 * Mobile: a short teal header with the form card overlapping its edge. */
export function AuthLayout({
  title,
  subtitle,
  back,
  children,
}: {
  title: string
  subtitle?: ReactNode
  back?: { to: string; label: string; state?: unknown }
  children: ReactNode
}) {
  const { t, i18n } = useTranslation()
  const latin = i18n.resolvedLanguage === 'en'
  const trust = [t('auth.trust1'), t('auth.trust2'), t('auth.trust3')]

  return (
    <div className="min-h-screen lg:grid lg:grid-cols-[minmax(0,1.05fr)_minmax(0,1fr)]">
      <aside className="hidden lg:flex sticky top-0 h-screen overflow-hidden bg-[var(--deep)] text-white flex-col p-12 xl:p-16">
        <div aria-hidden className="absolute inset-0 opacity-[0.07]" style={GRID_TEXTURE} />

        <HelfLockup variant="dark" className="relative text-[24px]" />

        {/* The sample card sits beside the copy only when the band is wide
            enough (~910px) for both; below that the copy stands alone. */}
        <div className="relative mt-auto mb-auto grid min-[1760px]:grid-cols-[minmax(0,1fr)_auto] gap-12 items-center pt-10">
          <div className="max-w-[540px]">
            {/* Sinhala and Tamil run longer and need taller lines for their
                vowel signs, so they get a smaller, looser setting. */}
            <h2
              className={`font-extrabold text-balance ${
                latin ? 'text-[34px] xl:text-[40px] leading-[1.1] tracking-[-0.02em]' : 'text-[28px] xl:text-[34px] leading-[1.25]'
              }`}
            >
              {t('auth.panelTitle')}
            </h2>
            <p className="text-white/75 text-[16px] mt-4 leading-relaxed">{t('auth.panelBody')}</p>
            <ul className="mt-8 flex flex-col gap-3.5">
              {trust.map((line) => (
                <li key={line} className="flex items-center gap-3 text-[15px] font-semibold text-white/90">
                  <Check size={17} strokeWidth={2.75} className="flex-none text-[var(--aqua)]" />
                  {line}
                </li>
              ))}
            </ul>
          </div>
          <div className="hidden min-[1760px]:block pr-4">
            <ScanPeek />
          </div>
        </div>

        <a
          href="tel:1990"
          className="relative self-start inline-flex items-center gap-2 h-11 px-4 rounded-full bg-white/10 text-[14px] font-bold hover:bg-white/20 transition-colors"
        >
          <Phone size={15} strokeWidth={2.5} /> {t('auth.emergency')}
        </a>
      </aside>

      <main className="min-h-screen flex flex-col">
        <div className="lg:hidden relative overflow-hidden bg-[var(--deep)] text-white px-5 pt-5 pb-24">
          <div aria-hidden className="absolute inset-0 opacity-[0.07]" style={GRID_TEXTURE} />
          <div className="relative flex items-center justify-between gap-3">
            <HelfLockup variant="dark" className="text-[20px]" />
            <LanguageSwitch tone="dark" />
          </div>
          <p className="relative text-[21px] font-extrabold leading-[1.2] tracking-[-0.01em] mt-8 max-w-[340px] text-balance">
            {t('auth.panelTitle')}
          </p>
        </div>

        <div className="hidden lg:flex justify-end px-10 pt-8">
          <LanguageSwitch />
        </div>

        <div className="flex-1 flex items-start lg:items-center justify-center px-4 sm:px-5 lg:px-10 pb-10">
          <div className="w-full max-w-[440px] -mt-16 lg:mt-0 lg:-translate-y-6">
            <div className="rise-in bg-[var(--surface)] rounded-[28px] p-6 sm:p-8 border border-[var(--border)]">
              {back && (
                <Link
                  to={back.to}
                  state={back.state}
                  className="inline-flex items-center gap-1.5 -ml-1 mb-4 h-11 px-2 rounded-lg text-[14px] font-semibold text-[var(--muted)] hover:text-[var(--text)] hover:bg-[var(--raised)] transition-colors"
                >
                  <ArrowLeft size={16} /> {back.label}
                </Link>
              )}
              <h1 className="text-[26px] sm:text-[28px] font-extrabold leading-[1.15] tracking-[-0.015em] text-balance">{title}</h1>
              {subtitle && <p className="text-[15px] text-[var(--muted)] mt-2 leading-relaxed">{subtitle}</p>}
              <div className="mt-7">{children}</div>
            </div>

            <a
              href="tel:1990"
              className="lg:hidden mt-5 flex items-center justify-center gap-2 h-11 text-[14px] font-bold text-[var(--negative)]"
            >
              <Phone size={15} strokeWidth={2.5} /> {t('auth.emergency')}
            </a>
          </div>
        </div>
      </main>
    </div>
  )
}
