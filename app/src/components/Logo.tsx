/** helf's logo: concept 06 "Help call" from the Helf Logo Concepts sheet —
 * a speech bubble with a plus, because the tag speaks for someone who
 * cannot. Same mark as the promo site (site/src/components/Logo.tsx).
 * `dark` is for deep-teal grounds, `light` for white and the warm ground. */
const BUBBLE = 'M9 5h30a5 5 0 0 1 5 5v21a5 5 0 0 1-5 5H23l-10 8v-8H9a5 5 0 0 1-5-5V10a5 5 0 0 1 5-5z'

type Variant = 'dark' | 'light'

const COLOURS: Record<Variant, { bubble: string; plus: string; word: string; lk: string }> = {
  dark: { bubble: '#2dd4bf', plus: '#134e4a', word: '#f0fdfa', lk: '#5eead4' },
  light: { bubble: '#0d9488', plus: '#ffffff', word: '#134e4a', lk: '#0d9488' },
}

export function HelfMark({ variant = 'light', className = '' }: { variant?: Variant; className?: string }) {
  const c = COLOURS[variant]
  return (
    <svg viewBox="0 0 48 48" className={className} aria-hidden="true">
      <path d={BUBBLE} fill={c.bubble} />
      <path d="M24 13.5v14M17 20.5h14" stroke={c.plus} strokeWidth="4.4" strokeLinecap="round" />
    </svg>
  )
}

/** The mark on its dark tile with a white ring — what sits in the middle of
 * every QR (same as the site's HelfBadge). */
export function HelfBadge({ size }: { size: number | string }) {
  return (
    <span className="flex items-center justify-center ring-[3px] ring-white" style={{ width: size, height: size, borderRadius: '24%', background: '#134e4a' }}>
      <HelfMark variant="dark" className="w-[74%] h-[74%] translate-y-[4%]" />
    </span>
  )
}

/** The same badge as an image, for QR pictures drawn on a canvas. */
export const HELF_BADGE_DATA_URL =
  'data:image/svg+xml;charset=utf-8,' +
  encodeURIComponent(
    `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 48 48"><rect width="48" height="48" rx="11.5" fill="#134e4a"/><g transform="translate(6.24 7.2) scale(0.74)"><path d="${BUBBLE}" fill="#2dd4bf"/><path d="M24 13.5v14M17 20.5h14" stroke="#134e4a" stroke-width="4.4" stroke-linecap="round"/></g></svg>`,
  )

/** Mark + "helf.lk" wordmark. Sized by font-size (em). */
export function HelfLockup({ variant = 'light', lk = true, className = '' }: { variant?: Variant; lk?: boolean; className?: string }) {
  const c = COLOURS[variant]
  return (
    <span
      className={`inline-flex items-center gap-[0.27em] font-extrabold leading-none tracking-[-0.045em] ${className}`}
      style={{ fontFamily: 'Manrope, system-ui, sans-serif', color: c.word }}
      aria-label={lk ? 'helf.lk' : 'helf'}
    >
      <HelfMark variant={variant} className="w-[1.18em] h-[1.18em] flex-none" />
      <span aria-hidden="true">
        helf
        {lk && (
          <span className="font-medium tracking-[-0.02em]" style={{ color: c.lk }}>
            .lk
          </span>
        )}
      </span>
    </span>
  )
}
