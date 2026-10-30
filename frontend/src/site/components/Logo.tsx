/** helf's logo: concept 06 "Help call" from the Helf Logo Concepts sheet —
 * a speech bubble with a plus, because the tag speaks for someone who
 * cannot. These are the sheet's "Dark" colours (the 3rd tile), for use on
 * the deep-teal grounds of the tags and inside QR codes. */
const BUBBLE = 'M9 5h30a5 5 0 0 1 5 5v21a5 5 0 0 1-5 5H23l-10 8v-8H9a5 5 0 0 1-5-5V10a5 5 0 0 1 5-5z'

const LOGO_DARK ={ ground: '#134e4a', bubble: '#2dd4bf', plus: '#134e4a', word: '#f0fdfa', lk: '#5eead4' }

export function HelfMark({ className = '', bubble = LOGO_DARK.bubble, plus = LOGO_DARK.plus }: { className?: string; bubble?: string; plus?: string }) {
  return (
    <svg viewBox="0 0 48 48" className={className} aria-hidden="true">
      <path d={BUBBLE} fill={bubble} />
      <path d="M24 13.5v14M17 20.5h14" stroke={plus} strokeWidth="4.4" strokeLinecap="round" />
    </svg>
  )
}

/** Mark + "helf.lk" wordmark, Dark variant. Sized by font-size (em). */
export function HelfLockup({ className = '', lk = true }: { className?: string; lk?: boolean }) {
  return (
    <span
      className={`inline-flex items-center gap-[0.27em] font-extrabold leading-none tracking-[-0.045em] ${className}`}
      style={{ fontFamily: 'Manrope, system-ui, sans-serif', color: LOGO_DARK.word }}
      aria-label={lk ? 'helf.lk' : 'helf'}
    >
      <HelfMark className="w-[1.18em] h-[1.18em] flex-none" />
      <span>
        helf
        {lk && (
          <span className="font-medium tracking-[-0.02em]" style={{ color: LOGO_DARK.lk }}>
            .lk
          </span>
        )}
      </span>
    </span>
  )
}

/** The mark on its dark tile — what sits in the middle of every QR. */
export function HelfBadge({ size }: { size: number | string }) {
  return (
    <span
      className="flex items-center justify-center ring-[3px] ring-white"
      style={{ width: size, height: size, borderRadius: '24%', background: LOGO_DARK.ground }}
    >
      <HelfMark className="w-[74%] h-[74%] translate-y-[4%]" />
    </span>
  )
}
