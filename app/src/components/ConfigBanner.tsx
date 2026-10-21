import { isSupabaseConfigured } from '../lib/supabase'

/** Shown app-wide until .env has real Supabase values. Remove nothing here —
 * once .env is filled in, isSupabaseConfigured is true and this renders null. */
export function ConfigBanner() {
  if (isSupabaseConfigured) return null

  return (
    <div className="bg-[var(--warning-soft)] text-[var(--warning-ink)] text-sm font-medium px-5 py-2.5 text-center">
      Demo mode — no Supabase connected, so this browser is using local sample data (nothing is sent anywhere). Every
      screen and flow works; fill in .env later to connect the real backend.
    </div>
  )
}
