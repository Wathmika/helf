import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"

import { supabase } from "@/lib/supabase"
import type { QrToken, ScanEvent } from "@/types/database"

export function useQrTokens(personId: string | undefined) {
  return useQuery({
    queryKey: ["qr_tokens", personId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("qr_tokens")
        .select("*")
        .eq("person_id", personId!)
        .order("created_at", { ascending: false })
      if (error) throw error
      return (data ?? []) as QrToken[]
    },
    enabled: Boolean(personId),
  })
}

export function useIssueQrToken(personId: string | undefined) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async (label: string | null) => {
      const { data, error } = await supabase.rpc("issue_qr_token", {
        p_person_id: personId!,
        p_label: label,
      })
      if (error) throw error
      return data as QrToken
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["qr_tokens", personId] })
    },
  })
}

export function useRevokeQrToken(personId: string | undefined) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async (tokenId: string) => {
      const { error } = await supabase.rpc("revoke_qr_token", { p_token_id: tokenId })
      if (error) throw error
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["qr_tokens", personId] })
    },
  })
}

export function useOfflineQrText(tokenId: string | undefined, baseUrl: string) {
  return useQuery({
    queryKey: ["offline_qr_text", tokenId, baseUrl],
    queryFn: async () => {
      const { data, error } = await supabase.rpc("offline_qr_text", {
        p_token_id: tokenId!,
        p_base_url: baseUrl,
      })
      if (error) throw error
      return data as string
    },
    enabled: Boolean(tokenId),
  })
}

export function useScanEvents(personId: string | undefined) {
  return useQuery({
    queryKey: ["scan_events", personId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("scan_events")
        .select("*")
        .eq("person_id", personId!)
        .order("scanned_at", { ascending: false })
      if (error) throw error
      return (data ?? []) as ScanEvent[]
    },
    enabled: Boolean(personId),
  })
}
