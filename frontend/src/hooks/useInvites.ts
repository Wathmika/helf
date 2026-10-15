import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"

import { useAuth } from "@/auth/AuthContext"
import { supabase } from "@/lib/supabase"
import type { PersonInvite, PersonManagerWithUser, ProfileFor } from "@/types/database"

export function usePersonInvites(personId: string | undefined) {
  return useQuery({
    queryKey: ["person_invites", personId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("person_invites")
        .select("*")
        .eq("person_id", personId!)
        .order("created_at", { ascending: false })
      if (error) throw error
      return (data ?? []) as PersonInvite[]
    },
    enabled: Boolean(personId),
  })
}

export function useCreatePersonInvite(personId: string | undefined) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async (note: string | null) => {
      const { data, error } = await supabase.rpc("create_person_invite", {
        p_person_id: personId!,
        p_note: note,
      })
      if (error) throw error
      return data as string
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["person_invites", personId] })
    },
  })
}

export function useRevokePersonInvite(personId: string | undefined) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async (inviteId: string) => {
      const { error } = await supabase.rpc("revoke_person_invite", { p_invite_id: inviteId })
      if (error) throw error
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["person_invites", personId] })
    },
  })
}

export function useCoManagers(personId: string | undefined) {
  return useQuery({
    queryKey: ["co_managers", personId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("person_managers")
        .select("*, app_users(id, display_name)")
        .eq("person_id", personId!)
      if (error) throw error
      return (data ?? []) as unknown as PersonManagerWithUser[]
    },
    enabled: Boolean(personId),
  })
}

export function useAcceptPersonInvite() {
  const { user } = useAuth()
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async ({ code, personIsMy }: { code: string; personIsMy: ProfileFor }) => {
      const { data, error } = await supabase.rpc("accept_person_invite", {
        p_code: code,
        p_person_is_my: personIsMy,
      })
      if (error) throw error
      return data as string
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["profiles", user?.id] })
    },
  })
}
