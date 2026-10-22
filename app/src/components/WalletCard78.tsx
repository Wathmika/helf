import { QRCodeSVG } from 'qrcode.react'
import { HelfBadge, HelfLockup } from './Logo'
import './card78.css'

/*
  The printable wallet card: tag design #78 from Desktop/helf/helf-tags.html,
  the same artwork as the promo site (site/src/sections/WaysToCarry.tsx),
  filled with one person's real QR codes.
  - Front: the online QR (the scan page; opening it alerts the family).
  - Back: the offline QR — plain text from offline_qr_text, readable with no
    signal.
  The one addition to #78 is the person's name and up to two critical alerts
  on the front, from what the scan page already shows (spec §5: "name + key
  alerts + the QR"). The card's wording is English, like the offline text.
*/

function CardQr({ value }: { value: string }) {
  return (
    <div className="qri relative">
      {/* Level Q keeps the code readable with the badge covering its middle. */}
      <QRCodeSVG value={value} level="Q" fgColor="#134e4a" bgColor="#ffffff" style={{ width: '100%', height: 'auto', display: 'block' }} />
      <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
        <HelfBadge size="22%" />
      </div>
    </div>
  )
}

export function CardFront({ onlineUrl, name, alerts }: { onlineUrl: string; name: string; alerts: string[] }) {
  return (
    <div className="tag78 relative w-full" lang="en">
      <div className="face front">
        <HelfLockup variant="dark" className="brand" />
        <p className="hl">
          In an emergency?<em>Scan to help me</em>
        </p>
        <div className="who">
          <b>{name}</b>
          {alerts.length > 0 && <span>{alerts.slice(0, 2).join(' · ')}</span>}
        </div>
        <div className="flow">
          <span>Scan</span>→<span>See info</span>→<span>Call 1990</span>
        </div>
        <span className="chip">No signal? Flip for offline QR</span>
        <figure className="qrpanel m-0">
          <CardQr value={onlineUrl} />
          <figcaption className="cap">
            <b>Online</b>Full profile · alerts family
          </figcaption>
        </figure>
      </div>
    </div>
  )
}

export function CardBack({ offlineText }: { offlineText: string }) {
  return (
    <div className="tag78 relative w-full" lang="en">
      <div className="face back">
        <HelfLockup variant="dark" className="brand" />
        <figure className="qrpanel m-0">
          <CardQr value={offlineText} />
          <figcaption className="cap">
            <b>Offline</b>Works with no signal
          </figcaption>
        </figure>
        <p className="eyebrow">If you found me</p>
        <ol className="steps m-0 p-0 list-none">
          <li>
            <span>01</span>
            <div>
              Call 1990<small>Free ambulance, any phone</small>
            </div>
          </li>
          <li>
            <span>02</span>
            <div>
              Scan the front<small>See my medical info</small>
            </div>
          </li>
          <li>
            <span>03</span>
            <div>
              Tap to call family<small>They’re texted when you scan</small>
            </div>
          </li>
        </ol>
      </div>
    </div>
  )
}
