import { useQuery } from '@tanstack/react-query'
import { supabase } from './supabase'
import { getDemoUser } from './demoStore'

export interface AppUser {
  displayName: string | null
  language: 'si' | 'ta' | 'en'
}

/** The signed-in person's own app_users row (display_name,
 * preferred_language), or the demo stand-in when Supabase isn't set. */
export function useAppUser() {
  return useQuery({
    queryKey: ['app_user'],
    queryFn: async (): Promise<AppUser | null> => {
      if (!supabase) return getDemoUser()
      const { data: auth } = await supabase.auth.getUser()
      if (!auth.user) return null
      const { data, error } = await supabase
        .from('app_users')
        .select('display_name, preferred_language')
        .eq('id', auth.user.id)
        .single()
      if (error) throw error
      return { displayName: data.display_name, language: data.preferred_language }
    },
  })
}

export function initialOf(name: string | null | undefined): string {
  return (name?.trim()[0] ?? '?').toUpperCase()
}
