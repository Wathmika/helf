import { useQuery } from '@tanstack/react-query'
import { supabase } from './supabase'
import { listDemoProfiles } from './demoStore'

export const MAX_PROFILES = 10

export type ProfileFor = 'self' | 'parent' | 'child' | 'spouse' | 'other'

export interface ProfileSummary {
  personId: string
  fullName: string
  displayName: string | null
  personIsMy: ProfileFor
  role: 'owner' | 'editor'
  freshestAt: string
}

interface PersonManagerRow {
  person_is_my: ProfileFor
  role: 'owner' | 'editor'
  people: {
    id: string
    full_name: string
    display_name: string | null
    content_updated_at: string
    info_confirmed_at: string | null
  } | null
}

// "Needs review" once the freshest of content_updated_at / info_confirmed_at
// is older than this — matches the ~3-month confirmation cadence in
// docs/frontend-features.md §4.6.
export const STALE_AFTER_DAYS = 90

export function daysSince(iso: string): number {
  return Math.floor((Date.now() - new Date(iso).getTime()) / 86_400_000)
}

export function isStale(freshestAt: string): boolean {
  return daysSince(freshestAt) > STALE_AFTER_DAYS
}

export function useProfiles() {
  return useQuery({
    queryKey: ['profiles'],
    queryFn: async (): Promise<ProfileSummary[]> => {
      // Not configured yet — browse against a local demo store instead of
      // blocking on a real backend. See lib/demoStore.ts.
      if (!supabase) return listDemoProfiles()

      const { data, error } = await supabase
        .from('person_managers')
        .select('person_is_my, role, people(id, full_name, display_name, content_updated_at, info_confirmed_at)')
        .returns<PersonManagerRow[]>()

      if (error) throw error

      return data
        .filter((row): row is PersonManagerRow & { people: NonNullable<PersonManagerRow['people']> } => row.people !== null)
        .map((row) => {
          const { people } = row
          const freshestAt =
            people.info_confirmed_at && people.info_confirmed_at > people.content_updated_at
              ? people.info_confirmed_at
              : people.content_updated_at
          return {
            personId: people.id,
            fullName: people.full_name,
            displayName: people.display_name,
            personIsMy: row.person_is_my,
            role: row.role,
            freshestAt,
          }
        })
    },
  })
}

/** One of 4 identity hues per profile, stable by position — see the
 * --p-1..--p-4 tokens in index.css (pastel-consumer move: each person gets
 * their own tint, never reused for data/status). */
export function personHue(index: number): { fg: string; bg: string } {
  const n = (index % 4) + 1
  return { fg: `var(--p-${n})`, bg: `var(--p-${n}-soft)` }
}

export function initials(name: string): string {
  return name
    .replace(/[()]/g, '')
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase())
    .join('')
}
