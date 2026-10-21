import { QRCodeSVG } from 'qrcode.react'

/** A real, scannable QR — it opens this page's live demo, never a made-up
 * domain. The production scan domain isn't secured yet (architecture doc
 * §11), so nothing here should encode a guessed helf URL. */
export function QrMark({ size = 140, sweep = false, className = '' }: { size?: number; sweep?: boolean; className?: string }) {
  const value = typeof window === 'undefined' ? '#demo' : `${window.location.origin}/#demo`
  return (
    <div className={`relative inline-block bg-white rounded-xl p-2.5 overflow-hidden ${className}`}>
      <QRCodeSVG value={value} size={size} level="M" fgColor="#141a21" bgColor="#ffffff" />
      <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
        {/* ~5% of the code's area: well inside level-M error correction (15%) */}
        <span
          className="rounded-md bg-[var(--accent)] text-white flex items-center justify-center font-extrabold ring-[3px] ring-white"
          style={{ width: Math.round(size * 0.2), height: Math.round(size * 0.2), fontSize: Math.round(size * 0.1) }}
        >
          h
        </span>
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
