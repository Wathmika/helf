import type { ReactNode } from 'react'

/** Shared frame for every auth screen (phone/email entry, OTP, welcome).
 * Centred both axes at every width instead of a card stretched edge to edge
 * on desktop — the content itself stays a comfortable reading width
 * (max 400px) whether the viewport is a phone or a 27" monitor. */
export function AuthLayout({ children }: { children: ReactNode }) {
  return (
    <div className="min-h-screen flex items-center justify-center px-5 py-10">
      <div className="w-full max-w-[400px]">{children}</div>
    </div>
  )
}
