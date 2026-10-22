import type { ReactNode } from 'react'

/** A phone frame for showing what the actual scan page looks like — never a
 * stock photo, always the real interface recreated from
 * docs/scan-page-preview-*.html. `bleed` drops the status-bar padding for
 * full-screen views (camera, lock screen). */
export function Phone({ children, className = '', bleed = false }: { children: ReactNode; className?: string; bleed?: boolean }) {
  return (
    <div className={`w-[300px] rounded-[38px] bg-[var(--ink)] p-2.5 shadow-[0_28px_60px_-24px_rgba(0,0,0,0.5)] ${className}`}>
      <div className="rounded-[30px] bg-[var(--ground)] overflow-hidden h-[600px] relative">
        <div className="absolute top-2 left-1/2 -translate-x-1/2 w-[84px] h-[22px] bg-[var(--ink)] rounded-full z-30" />
        <div className={`h-full ${bleed ? 'overflow-hidden' : 'overflow-hidden pt-9'}`}>{children}</div>
      </div>
    </div>
  )
}
