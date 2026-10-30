import { QRCodeSVG } from 'qrcode.react'
import { HelfBadge } from './Logo'
import { SCAN_PAGE_URL } from '../config'

/** A real, scannable QR with the helf logo in the middle. By default it
 * opens the sample scan page (public/scan.html) on this same site — never a
 * made-up domain, since the production scan domain isn't secured yet
 * (architecture doc §11). */
export function QrMark({
  size = 140,
  sweep = false,
  value,
  fg = '#141a21',
  className = '',
}: {
  size?: number
  sweep?: boolean
  value?: string
  fg?: string
  className?: string
}) {
  const content = value ?? SCAN_PAGE_URL
  return (
    <div className={`relative inline-block bg-white rounded-xl p-2.5 overflow-hidden ${className}`}>
      {/* Level Q keeps the code readable with the logo covering its middle. */}
      <QRCodeSVG value={content} size={size} level="Q" fgColor={fg} bgColor="#ffffff" className="block" />
      <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
        <HelfBadge size={Math.round(size * 0.22)} />
      </div>
      {sweep && (
        <div
          className="scan-sweep absolute left-1 right-1 top-1 h-[3px] rounded-full bg-[var(--accent)] shadow-[0_0_12px_2px_rgba(15,118,110,0.55)]"
          style={{ ['--sweep' as string]: `${size}px` }}
        />
      )}
    </div>
  )
}
