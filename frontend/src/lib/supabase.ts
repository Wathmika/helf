import { createClient, type SupabaseClient } from "@supabase/supabase-js"

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL as string | undefined
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined

export const isSupabaseConfigured = Boolean(supabaseUrl && supabaseAnonKey)

function createMissingConfigError() {
  return new Error(
    "Missing VITE_SUPABASE_URL or VITE_SUPABASE_ANON_KEY. Copy frontend/.env.example to " +
      "frontend/.env and fill in the anon key from Supabase Dashboard > Settings > API.",
  )
}

// Built lazily behind a Proxy: public, unauthenticated routes (the landing page)
// must render even before a real anon key is configured. The loud failure still
// happens, just deferred to the first place that actually needs Supabase.
const client = isSupabaseConfigured ? createClient(supabaseUrl!, supabaseAnonKey!) : null

export const supabase = new Proxy({} as SupabaseClient, {
  get(_target, prop, receiver) {
    if (!client) throw createMissingConfigError()
    return Reflect.get(client, prop, receiver)
  },
})

export const BACKEND_API_URL = import.meta.env.VITE_BACKEND_API_URL as string | undefined
export const SCAN_PAGE_ORIGIN =
  (import.meta.env.VITE_SCAN_PAGE_ORIGIN as string | undefined) ?? "https://helf.lk"
