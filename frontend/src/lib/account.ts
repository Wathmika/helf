import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { supabase } from './supabase'
import { setDemoUser } from './demoStore'
import * as demo from './demoPerson'
import type { ProfileSummary } from './profiles'

/*
  The account screen's data (spec §7). Names from the migrations:
  app_users (display_name, preferred_language), export_person_data,
  person_managers; and the one backend call this app makes,
  POST /account/delete (backend/src/app/routes/account.py).
*/

/** The backend's address (the SAM stack's ApiUrl output). Only the
 * delete-account call uses it. Its CORS list (APP_ORIGINS) must include
 * this app's own address. */
const API_URL = (import.meta.env.VITE_BACKEND_API_URL as string | undefined)?.replace(/\/$/, '') || null

/** Exactly what backend/src/app/routes/account.py checks for. */
export const DELETE_PHRASE = 'DELETE MY ACCOUNT'

export const canDeleteAccount = !supabase || Boolean(API_URL)

export function useUpdateAppUser() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async (next: { displayName: string; language: 'si' | 'ta' | 'en' }) => {
      if (!supabase) return setDemoUser(next)
      const { data: auth } = await supabase.auth.getUser()
      if (!auth.user) throw new Error('not signed in')
      const { error } = await supabase
        .from('app_users')
        .update({ display_name: next.displayName, preferred_language: next.language })
        .eq('id', auth.user.id)
      if (error) throw error
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['app_user'] }),
  })
}

/** Download everything held about one person as a JSON file. */
export async function downloadPersonData(personId: string, name: string) {
  let data: unknown
  if (!supabase) {
    data = demo.demoExport(personId)
  } else {
    const res = await supabase.rpc('export_person_data', { p_person_id: personId })
    if (res.error) throw res.error
    data = res.data
  }
  if (!data) throw new Error('not found')
  const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  const slug = name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '') || 'profile'
  a.href = url
  a.download = `helf-${slug}-${new Date().toLocaleDateString('en-CA')}.json`
  a.click()
  setTimeout(() => URL.revokeObjectURL(url), 1000)
}

export interface DeletionStep {
  profile: ProfileSummary
  /** "leave": you edit it and simply stop; "handover": it goes to `heir`;
   * "delete": nobody else manages it, so it is deleted. */
  outcome: 'leave' | 'handover' | 'delete'
  heir: string | null
}

/** What deleting the account will do to each profile, by the same rule as
 * prepare_account_deletion: an owned profile goes to the longest-standing
 * co-manager, or is deleted when there is none. */
export function useDeletionPlan(profiles: ProfileSummary[] | undefined) {
  return useQuery({
    queryKey: ['deletion_plan', profiles?.map((p) => `${p.personId}:${p.role}`).join(',')],
    enabled: Boolean(profiles),
    queryFn: async (): Promise<DeletionStep[]> => {
      const list = profiles ?? []
      if (!supabase) {
        return list.map((profile) => {
          if (profile.role !== 'owner') return { profile, outcome: 'leave', heir: null }
          const heir = demo.demoCoManagers(profile.personId)[0] ?? null
          return { profile, outcome: heir ? 'handover' : 'delete', heir }
        })
      }
      const { data: auth } = await supabase.auth.getUser()
      const owned = list.filter((p) => p.role === 'owner').map((p) => p.personId)
      const { data: rows, error } = owned.length
        ? await supabase.from('person_managers').select('person_id, user_id, created_at').in('person_id', owned).neq('user_id', auth.user?.id ?? '').order('created_at')
        : { data: [] as { person_id: string; user_id: string; created_at: string }[], error: null }
      if (error) throw error
      const firstHeir = new Map<string, string>()
      for (const r of rows ?? []) if (!firstHeir.has(r.person_id)) firstHeir.set(r.person_id, r.user_id)
      const ids = [...new Set(firstHeir.values())]
      const { data: users } = ids.length ? await supabase.from('app_users').select('id, display_name').in('id', ids) : { data: [] }
      const names = new Map((users ?? []).map((u: { id: string; display_name: string | null }) => [u.id, u.display_name]))
      return list.map((profile) => {
        if (profile.role !== 'owner') return { profile, outcome: 'leave' as const, heir: null }
        const heirId = firstHeir.get(profile.personId)
        return heirId ? { profile, outcome: 'handover' as const, heir: names.get(heirId) ?? null } : { profile, outcome: 'delete' as const, heir: null }
      })
    },
  })
}

/** Delete the account through the backend, then sign out. Demo mode just
 * forgets this browser's sample data. */
export async function deleteAccount(): Promise<void> {
  if (!supabase) {
    demo.demoDeleteAccount()
    return
  }
  if (!API_URL) throw new Error('VITE_BACKEND_API_URL is not set')
  const { data } = await supabase.auth.getSession()
  const token = data.session?.access_token
  if (!token) throw new Error('not signed in')
  const res = await fetch(`${API_URL}/account/delete`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ confirm: DELETE_PHRASE }),
  })
  if (!res.ok) throw new Error(`delete failed (${res.status})`)
  await supabase.auth.signOut()
}
