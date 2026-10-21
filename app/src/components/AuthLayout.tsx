import type { ReactNode } from 'react'
import { useTranslation } from 'react-i18next'

/** Shared frame for every auth screen (phone/email entry, OTP, welcome).
 *
 * Mobile: a single centred column, as before.
 * Desktop (lg+): a real split screen — a brand/trust panel on the left that
 * actually uses the width instead of leaving it empty, and the form on the
 * right. A phone-card centred in a sea of beige ground was the complaint
 * this replaces. */
export function AuthLayout({ children }: { children: ReactNode }) {
  const { t } = useTranslation()

  return (
    <div className="min-h-screen lg:grid lg:grid-cols-[1fr_1fr] xl:grid-cols-[1.1fr_1fr]">
      <div className="hidden lg:flex flex-col justify-between bg-[var(--accent)] text-white p-12 xl:p-16">
        <div className="flex items-center gap-2.5">
          <div className="w-9 h-9 rounded-[10px] bg-white/15 flex items-center justify-center font-extrabold">h</div>
          <span className="font-bold text-lg">{t('app.name')}</span>
        </div>

        <div className="max-w-md">
          <h2 className="text-[34px] xl:text-[40px] font-bold leading-[1.15]">
            Emergency info, ready the moment it's needed.
          </h2>
          <p className="text-white/80 text-[15px] mt-4 leading-relaxed">
            A QR code your family keeps on a wallet card or a sticker — so a stranger who finds someone in
            trouble can call the right people in seconds, without guessing.
          </p>

          <ul className="mt-9 flex flex-col gap-4">
            {[
              ['You choose what shows', 'Every field has its own on/off switch — nothing is public by default.'],
              ['Family can share the work', 'Invite a sibling or relative to help keep a profile up to date.'],
              ['Works without an app', 'The page a stranger scans loads fast, even on a weak connection.'],
            ].map(([title, body]) => (
              <li key={title} className="flex gap-3">
                <span className="mt-1 w-5 h-5 rounded-full bg-white/15 flex-none flex items-center justify-center text-[11px]">
                  ✓
                </span>
                <div>
                  <p className="font-semibold text-[15px]">{title}</p>
                  <p className="text-white/75 text-[13px] mt-0.5 leading-relaxed">{body}</p>
                </div>
              </li>
            ))}
          </ul>
        </div>

        <p className="text-white/60 text-xs">Built for Sri Lanka — සිංහල · தமிழ் · English</p>
      </div>

      <div className="flex items-center justify-center px-5 py-10 lg:py-0">
        <div className="w-full max-w-[400px]">{children}</div>
      </div>
    </div>
  )
}
