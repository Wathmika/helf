// Where "Create your profile" / "Sign in" buttons send people — the real
// management app (the app/ project). Defaults to its local dev port so
// both projects can be clicked through together today.
//
// TODO before this site is actually deployed: confirm with Wathmika what
// domain/path the app lives at (app.helf.lk? helf.lk/app?) and set
// VITE_APP_URL in site/.env accordingly — this is a structural decision
// per CLAUDE.md, not one to guess at.
export const APP_URL = (import.meta.env.VITE_APP_URL as string | undefined) || 'http://localhost:5184'

// What the site's sample QRs open: the scan-page design from
// Desktop/helf/index.html, copied unchanged to public/scan.html. It's a
// static sample, not the live per-person page (/s/{token}), which the
// backend renders.
export const SCAN_PAGE_URL = typeof window === 'undefined' ? '/scan.html' : `${window.location.origin}/scan.html`
