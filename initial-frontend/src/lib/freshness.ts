/**
 * Mirrors the scan page's freshness basis: greatest(content_updated_at, info_confirmed_at).
 * The exact "stale" threshold isn't specified anywhere backend-side (it's purely a
 * management-UI nudge, not enforced data) — 90 days is a reasonable default for medical
 * info that doesn't usually change week to week.
 */
const STALE_AFTER_DAYS = 90

export type Freshness = { days: number; stale: boolean }

export function computeFreshness(contentUpdatedAt: string, infoConfirmedAt: string | null): Freshness {
  const latest = Math.max(
    new Date(contentUpdatedAt).getTime(),
    infoConfirmedAt ? new Date(infoConfirmedAt).getTime() : 0,
  )
  const days = Math.floor((Date.now() - latest) / 86_400_000)
  return { days, stale: days > STALE_AFTER_DAYS }
}
