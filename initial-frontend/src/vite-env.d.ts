/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_SUPABASE_URL: string
  readonly VITE_SUPABASE_ANON_KEY: string
  readonly VITE_BACKEND_API_URL: string | undefined
  readonly VITE_SCAN_PAGE_ORIGIN: string | undefined
}

interface ImportMeta {
  readonly env: ImportMetaEnv
}
