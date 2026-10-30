// What the site's sample QRs open: the scan-page design from
// Desktop/helf/index.html, copied unchanged to public/scan.html. It's a
// static sample, not the live per-person page (/s/{token}), which the
// backend renders.
export const SCAN_PAGE_URL = typeof window === 'undefined' ? '/scan.html' : `${window.location.origin}/scan.html`
