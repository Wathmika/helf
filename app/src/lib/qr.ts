import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { supabase } from './supabase'
import * as demo from './demoPerson'

/*
  QR codes and scan history for one person (spec §5). Names from
  supabase/migrations/20261012000000_initial_schema.sql (qr_tokens,
  scan_events, issue_qr_token, revoke_qr_token) and
  20261012000100_family_qr_alerts_privacy.sql (offline_qr_text).
  Managers can only read these tables; every write is an RPC.
*/

export interface QrToken {
  id: string
  token: string
  label: string | null
  status: 'active' | 'revoked'
  created_at: string
  revoked_at: string | null
}

export interface ScanEvent {
  id: number
  token_id: string | null
  scanned_at: string
  approx_lat: number | null
  approx_lng: number | null
  location_added_at: string | null
  country_code: string | null
  family_notified_at: string | null
}

export const MAX_LABEL = 40

/*
  Where a printed QR points. The live scan page is /s/{token} on the
  backend's public domain, which isn't decided yet (architecture doc §11:
  "printed QR links must never change once printed"). So:
  - with Supabase connected, QRs are only drawn once VITE_SCAN_BASE_URL is
    set (https://domain, no trailing slash — the same rule offline_qr_text
    checks);
  - in demo mode they open the sample scan page the promo site serves.
*/
const SCAN_BASE_URL = (import.meta.env.VITE_SCAN_BASE_URL as string | undefined)?.replace(/\/$/, '') || null
const DEMO_SCAN_URL = (import.meta.env.VITE_DEMO_SCAN_URL as string | undefined) || 'http://localhost:5185/scan.html'

export const scanBaseUrl: string | null = supabase ? SCAN_BASE_URL : null

/** The address inside the online QR, or null when it can't be known yet. */
export function scanUrl(token: string): string | null {
  if (!supabase) return DEMO_SCAN_URL
  return SCAN_BASE_URL ? `${SCAN_BASE_URL}/s/${token}` : null
}

export const qrReady = !supabase || Boolean(SCAN_BASE_URL)

export function useQrTokens(personId: string) {
  return useQuery({
    queryKey: ['qr_tokens', personId],
    queryFn: async (): Promise<QrToken[]> => {
      if (!supabase) return demo.demoTokens(personId)
      const { data, error } = await supabase
        .from('qr_tokens')
        .select('id, token, label, status, created_at, revoked_at')
        .eq('person_id', personId)
        .order('created_at', { ascending: false })
      if (error) throw error
      return data
    },
  })
}

/** Newest first; the screen shows the latest 50. */
export function useScanEvents(personId: string) {
  return useQuery({
    queryKey: ['scan_events', personId],
    queryFn: async (): Promise<ScanEvent[]> => {
      if (!supabase) return demo.demoScans(personId)
      const { data, error } = await supabase
        .from('scan_events')
        .select('id, token_id, scanned_at, approx_lat, approx_lng, location_added_at, country_code, family_notified_at')
        .eq('person_id', personId)
        .order('scanned_at', { ascending: false })
        .limit(50)
      if (error) throw error
      return data
    },
  })
}

/** The plain text inside the offline QR (build_offline_qr_text: only
 * "show on scan" details, at most ~300 bytes, then the online link). */
export function useOfflineText(token: QrToken | undefined) {
  return useQuery({
    queryKey: ['offline_qr_text', token?.id],
    enabled: Boolean(token && token.status === 'active' && qrReady),
    queryFn: async (): Promise<string> => {
      if (!supabase) return demo.demoOfflineText(token!.id, DEMO_SCAN_URL)
      const { data, error } = await supabase.rpc('offline_qr_text', { p_token_id: token!.id, p_base_url: SCAN_BASE_URL })
      if (error) throw error
      return data as string
    },
  })
}

export function useIssueToken(personId: string) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async (label: string | null): Promise<QrToken> => {
      if (!supabase) return demo.issueDemoToken(personId, label)
      const { data, error } = await supabase.rpc('issue_qr_token', { p_person_id: personId, p_label: label })
      if (error) throw error
      return data as QrToken
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['qr_tokens', personId] }),
  })
}

export function useRevokeToken(personId: string) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async (tokenId: string) => {
      if (!supabase) return demo.revokeDemoToken(personId, tokenId)
      const { error } = await supabase.rpc('revoke_qr_token', { p_token_id: tokenId })
      if (error) throw error
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['qr_tokens', personId] }),
  })
}
