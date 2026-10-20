import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"

import { useAuth } from "@/auth/AuthContext"
import { supabase } from "@/lib/supabase"
import type { PersonInvite, PersonManagerWithUser, ProfileFor } from "@/types/database"

// code_hash is deliberately not granted to `authenticated` (never readable back out),
// so this must list columns explicitly — `select("*")` fails with a permission error.
const PERSON_INVITE_COLUMNS =
  "id, person_id, role, note, created_by, created_at, expires_at, accepted_by, accepted_at, revoked_at"

export function usePersonInvites(personId: string | undefined) {
  return useQuery({
    queryKey: ["person_invites", personId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("person_invites")
        .select(PERSON_INVITE_COLUMNS)
        .eq("person_id", personId!)
        .order("created_at", { ascending: false })
      if (error) throw error
      return (data ?? []) as unknown as PersonInvite[]
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
      // No direct FK from person_managers.user_id to app_users.id (both point at
      // auth.users.id separately), so PostgREST can't auto-embed app_users here —
      // it has to be two queries, merged client-side.
      const { data: managers, error } = await supabase
        .from("person_managers")
        .select("*")
        .eq("person_id", personId!)
      if (error) throw error

      const userIds = (managers ?? []).map((m) => m.user_id)
      // app_users RLS only exposes your own row, so this returns at most yourself —
      // other managers simply come back missing, not as an error.
      const { data: users, error: usersError } = userIds.length
        ? await supabase.from("app_users").select("id, display_name").in("id", userIds)
        : { data: [], error: null }
      if (usersError) throw usersError

      const usersById = new Map((users ?? []).map((u) => [u.id, u]))
      return (managers ?? []).map((m) => ({
        ...m,
        app_users: usersById.get(m.user_id) ?? null,
      })) as unknown as PersonManagerWithUser[]
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
