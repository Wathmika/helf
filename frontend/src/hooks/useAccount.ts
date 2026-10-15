import { useMutation } from "@tanstack/react-query"

import { useAuth } from "@/auth/AuthContext"
import { BACKEND_API_URL, supabase } from "@/lib/supabase"
import type { AppUser } from "@/types/database"

export function useUpdateAppUser() {
  const { user, refreshAppUser } = useAuth()

  return useMutation({
    mutationFn: async (patch: Partial<Pick<AppUser, "display_name" | "preferred_language">>) => {
      const { error } = await supabase.from("app_users").update(patch).eq("id", user!.id)
      if (error) throw error
    },
    onSuccess: () => void refreshAppUser(),
  })
}

export function useExportPersonData() {
  return useMutation({
    mutationFn: async ({ personId, fileLabel }: { personId: string; fileLabel: string }) => {
      const { data, error } = await supabase.rpc("export_person_data", { p_person_id: personId })
      if (error) throw error

      const blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json" })
      const url = URL.createObjectURL(blob)
      const link = document.createElement("a")
      link.href = url
      link.download = `helf-${fileLabel}-data.json`
      link.click()
      URL.revokeObjectURL(url)
    },
  })
}

const DELETE_CONFIRM_TEXT = "DELETE MY ACCOUNT"

export function useDeleteAccount() {
  const { session, signOut } = useAuth()

  return useMutation({
    mutationFn: async () => {
      if (!BACKEND_API_URL) throw new Error("Missing VITE_BACKEND_API_URL")
      const response = await fetch(`${BACKEND_API_URL}/account/delete`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${session?.access_token}`,
        },
        body: JSON.stringify({ confirm: DELETE_CONFIRM_TEXT }),
      })
      if (!response.ok) throw new Error(`Delete failed with status ${response.status}`)
    },
    onSuccess: () => void signOut(),
  })
}

export { DELETE_CONFIRM_TEXT }
