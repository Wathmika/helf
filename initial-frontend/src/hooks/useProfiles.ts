import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"

import { useAuth } from "@/auth/AuthContext"
import { supabase } from "@/lib/supabase"
import type { Person, PersonManager, ProfileFor } from "@/types/database"

export interface ProfileCard extends PersonManager {
  people: Person
}

export function useProfiles() {
  const { user } = useAuth()

  return useQuery({
    queryKey: ["profiles", user?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("person_managers")
        .select("*, people(*)")
        .eq("user_id", user!.id)
        .order("created_at", { ascending: true, referencedTable: "people" })

      if (error) throw error
      return (data ?? []) as unknown as ProfileCard[]
    },
    enabled: Boolean(user),
  })
}

export function useCreatePerson() {
  const { user } = useAuth()
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async ({ fullName, profileFor }: { fullName: string; profileFor: ProfileFor }) => {
      const { data, error } = await supabase.rpc("create_person", {
        p_full_name: fullName,
        p_profile_for: profileFor,
      })
      if (error) throw error
      return data as string
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["profiles", user?.id] })
    },
  })
}
