import type { Session, User } from "@supabase/supabase-js"
import { createContext, useContext, useEffect, useState, type ReactNode } from "react"

import { isSupabaseConfigured, supabase } from "@/lib/supabase"
import type { AppUser } from "@/types/database"

interface AuthContextValue {
  session: Session | null
  user: User | null
  appUser: AppUser | null
  /** True until the initial session check completes. */
  loading: boolean
  /** True while (re)fetching the app_users row after a session appears. */
  appUserLoading: boolean
  refreshAppUser: () => Promise<void>
  signOut: () => Promise<void>
}

const AuthContext = createContext<AuthContextValue | null>(null)

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null)
  const [loading, setLoading] = useState(true)
  const [appUser, setAppUser] = useState<AppUser | null>(null)
  const [appUserLoading, setAppUserLoading] = useState(false)

  async function fetchAppUser(userId: string) {
    setAppUserLoading(true)
    const { data } = await supabase.from("app_users").select("*").eq("id", userId).single()
    setAppUser((data as AppUser) ?? null)
    setAppUserLoading(false)
  }

  useEffect(() => {
    // Unauthenticated routes (the landing page) must still render before a real
    // Supabase anon key is configured — degrade to "logged out" rather than throwing.
    if (!isSupabaseConfigured) {
      setLoading(false)
      return
    }

    supabase.auth.getSession().then(({ data }) => {
      setSession(data.session)
      setLoading(false)
      if (data.session) void fetchAppUser(data.session.user.id)
    })

    const { data: subscription } = supabase.auth.onAuthStateChange((_event, nextSession) => {
      setSession(nextSession)
      if (nextSession) {
        void fetchAppUser(nextSession.user.id)
      } else {
        setAppUser(null)
      }
    })

    return () => subscription.subscription.unsubscribe()
  }, [])

  const value: AuthContextValue = {
    session,
    user: session?.user ?? null,
    appUser,
    loading,
    appUserLoading,
    refreshAppUser: async () => {
      if (session) await fetchAppUser(session.user.id)
    },
    signOut: async () => {
      await supabase.auth.signOut()
    },
  }

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export function useAuth() {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error("useAuth must be used within AuthProvider")
  return ctx
}
