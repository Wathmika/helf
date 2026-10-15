import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"

import { supabase } from "@/lib/supabase"
import type {
  Allergy,
  Condition,
  CriticalAlert,
  EmergencyContact,
  Medication,
  Person,
} from "@/types/database"

export interface PersonWithChildren extends Person {
  critical_alerts: CriticalAlert[]
  allergies: Allergy[]
  conditions: Condition[]
  medications: Medication[]
  emergency_contacts: EmergencyContact[]
}

function personKey(personId: string | undefined) {
  return ["person", personId]
}

export function usePerson(personId: string | undefined) {
  return useQuery({
    queryKey: personKey(personId),
    queryFn: async () => {
      const { data, error } = await supabase
        .from("people")
        .select("*, critical_alerts(*), allergies(*), conditions(*), medications(*), emergency_contacts(*)")
        .eq("id", personId!)
        .single()
      if (error) throw error
      return data as unknown as PersonWithChildren
    },
    enabled: Boolean(personId),
  })
}

export function useUpdatePerson(personId: string | undefined) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async (patch: Partial<Person>) => {
      const { error } = await supabase.from("people").update(patch).eq("id", personId!)
      if (error) throw error
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: personKey(personId) })
      void queryClient.invalidateQueries({ queryKey: ["preview", personId] })
      void queryClient.invalidateQueries({ queryKey: ["profiles"] })
    },
  })
}

export function useConfirmPersonInfo(personId: string | undefined) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async () => {
      const { error } = await supabase
        .from("people")
        .update({ info_confirmed_at: new Date().toISOString() })
        .eq("id", personId!)
      if (error) throw error
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: personKey(personId) })
      void queryClient.invalidateQueries({ queryKey: ["profiles"] })
    },
  })
}

/** Generic insert/update/delete trio for the five person-scoped child tables. */
function useChildTableMutations<TRow extends { id: string }>(table: string, personId: string | undefined) {
  const queryClient = useQueryClient()

  function invalidate() {
    void queryClient.invalidateQueries({ queryKey: personKey(personId) })
    void queryClient.invalidateQueries({ queryKey: ["preview", personId] })
  }

  const insert = useMutation({
    mutationFn: async (row: Partial<Omit<TRow, "id" | "created_at" | "updated_at" | "person_id">>) => {
      const { error } = await supabase
        .from(table)
        .insert({ ...row, person_id: personId } as never)
      if (error) throw error
    },
    onSuccess: invalidate,
  })

  const update = useMutation({
    mutationFn: async ({ id, patch }: { id: string; patch: Partial<TRow> }) => {
      const { error } = await supabase.from(table).update(patch as never).eq("id", id)
      if (error) throw error
    },
    onSuccess: invalidate,
  })

  const remove = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from(table).delete().eq("id", id)
      if (error) throw error
    },
    onSuccess: invalidate,
  })

  return { insert, update, remove }
}

export function useCriticalAlertMutations(personId: string | undefined) {
  return useChildTableMutations<CriticalAlert>("critical_alerts", personId)
}

export function useAllergyMutations(personId: string | undefined) {
  return useChildTableMutations<Allergy>("allergies", personId)
}

export function useConditionMutations(personId: string | undefined) {
  return useChildTableMutations<Condition>("conditions", personId)
}

export function useMedicationMutations(personId: string | undefined) {
  return useChildTableMutations<Medication>("medications", personId)
}

export function useContactMutations(personId: string | undefined) {
  return useChildTableMutations<EmergencyContact>("emergency_contacts", personId)
}

export function usePreviewScanProfile(personId: string | undefined) {
  return useQuery({
    queryKey: ["preview", personId],
    queryFn: async () => {
      const { data, error } = await supabase.rpc("preview_scan_profile", { p_person_id: personId! })
      if (error) throw error
      return data as import("@/types/database").PublicScanProfile
    },
    enabled: Boolean(personId),
  })
}
