import { isSupabaseConfigured } from '../lib/supabase'

/** Shown app-wide until .env has real Supabase values; renders nothing
 * once isSupabaseConfigured is true. Developer-facing, so English only. */
export function ConfigBanner() {
  if (isSupabaseConfigured) return null

  return (
    <div
      lang="en"
      title="No Supabase connected: this browser uses local sample data and nothing is sent anywhere. Fill in .env to connect the real backend."
      className="bg-[var(--warning-soft)] text-[var(--warning-ink)] text-[12px] sm:text-[13px] font-semibold px-4 py-2 text-center"
    >
      Demo mode — sample data only, nothing is sent.
    </div>
  )
}
