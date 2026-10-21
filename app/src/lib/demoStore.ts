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
