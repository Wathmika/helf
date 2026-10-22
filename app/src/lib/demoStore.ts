import type { ProfileFor } from './profiles'

/**
 * Local, in-browser stand-in for Supabase so every screen and flow can be
 * clicked through end to end with no backend configured — nothing here is
 * sent anywhere, it only lives in this browser's localStorage. Every call
 * site that uses it checks `isSupabaseConfigured` first and falls back to
 * the real RPC/query the moment .env is filled in.
 */

export interface DemoProfile {
  personId: string
  fullName: string
  displayName: string | null
  personIsMy: ProfileFor
  role: 'owner'
  freshestAt: string
}

const KEY = 'helf_demo_profiles'

function read(): DemoProfile[] {
  try {
    const raw = localStorage.getItem(KEY)
    return raw ? (JSON.parse(raw) as DemoProfile[]) : []
  } catch {
    return []
  }
}

function write(profiles: DemoProfile[]) {
  try {
    localStorage.setItem(KEY, JSON.stringify(profiles))
  } catch {
    // Private browsing / storage blocked — demo mode just won't persist
    // across reloads, which is fine; nothing else depends on it.
  }
}

export function listDemoProfiles(): DemoProfile[] {
  return read()
}

export function getDemoProfile(personId: string): DemoProfile | undefined {
  return read().find((p) => p.personId === personId)
}

export function createDemoProfile(fullName: string, personIsMy: ProfileFor): string {
  const profiles = read()
  const personId = `demo-${Date.now()}`
  profiles.push({
    personId,
    fullName,
    displayName: fullName,
    personIsMy,
    role: 'owner',
    freshestAt: new Date().toISOString(),
  })
  write(profiles)
  return personId
}

export function clearDemoProfiles() {
  write([])
}

// The demo stand-in for this user's app_users row (display_name,
// preferred_language).
export interface DemoUser {
  displayName: string
  language: 'si' | 'ta' | 'en'
}

const USER_KEY = 'helf_demo_user'

export function getDemoUser(): DemoUser | null {
  try {
    const raw = localStorage.getItem(USER_KEY)
    return raw ? (JSON.parse(raw) as DemoUser) : null
  } catch {
    return null
  }
}

export function setDemoUser(user: DemoUser) {
  try {
    localStorage.setItem(USER_KEY, JSON.stringify(user))
  } catch {
    // Storage blocked — the name just won't survive a reload.
  }
}

/** `?demo=family` on any URL loads a sample family (three people, one of
 * them overdue for a check) and a signed-in demo user, so every screen can
 * be looked at with data in a fresh browser. Demo mode only: main.tsx calls
 * this only while Supabase is not configured. */
export function seedDemoFromUrl() {
  const params = new URLSearchParams(window.location.search)
  if (params.get('demo') !== 'family') return
  const daysAgo = (n: number) => new Date(Date.now() - n * 86_400_000).toISOString()
  write([
    { personId: 'demo-s1', fullName: 'Sunil Perera', displayName: 'Thaththa', personIsMy: 'parent', role: 'owner', freshestAt: daysAgo(12) },
    { personId: 'demo-s2', fullName: 'Sriyani Perera', displayName: 'Amma (Sriyani)', personIsMy: 'parent', role: 'owner', freshestAt: daysAgo(104) },
    { personId: 'demo-s3', fullName: 'Kasun Perera', displayName: 'Kasun', personIsMy: 'child', role: 'owner', freshestAt: daysAgo(0) },
  ])
  if (!getDemoUser()) setDemoUser({ displayName: 'Minaga', language: 'en' })
  params.delete('demo')
  const rest = params.toString()
  window.history.replaceState(null, '', window.location.pathname + (rest ? `?${rest}` : '') + window.location.hash)
}
