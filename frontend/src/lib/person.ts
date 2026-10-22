import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { supabase } from './supabase'
import type { ProfileFor } from './profiles'
import * as demo from './demoPerson'

/*
  One person's full profile, as the editor needs it. Every table, column,
  enum and RPC name here is copied from docs/architecture-for-frontend.md §4/§6
  and supabase/migrations/20261012000000_initial_schema.sql — don't rename.

  Without Supabase (demo mode) the same functions read and write
  lib/demoPerson.ts instead, so the editor can be clicked through end to end.
*/

// ---- enums (fixed by the database) ----------------------------------------

export const ALERT_CODES = [
  'blood_thinner',
  'diabetes_insulin',
  'epilepsy',
  'heart_condition',
  'pacemaker_implant',
  'severe_allergy',
  'pregnancy',
  'dementia',
  'hearing_impairment',
  'vision_impairment',
] as const
export type AlertCode = (typeof ALERT_CODES)[number]

export const SEVERITIES = ['mild', 'moderate', 'severe', 'life_threatening', 'unknown'] as const
export type Severity = (typeof SEVERITIES)[number]

export const MED_KINDS = ['prescription', 'over_the_counter', 'herbal_ayurvedic'] as const
export type MedKind = (typeof MED_KINDS)[number]

export const CONTACT_RELATIONSHIPS = [
  'son',
  'daughter',
  'husband',
  'wife',
  'father',
  'mother',
  'brother',
  'sister',
  'grandson',
  'granddaughter',
  'relative',
  'friend',
  'neighbour',
  'caregiver',
  'other',
] as const
export type ContactRelationship = (typeof CONTACT_RELATIONSHIPS)[number]

export const BLOOD_GROUPS = ['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-', 'unknown'] as const

/** The scan page names these three; anything else is shown as typed. */
export const SPOKEN_LANGUAGES = ['si', 'ta', 'en'] as const

export const MAX_CONTACTS = 3
export const MAX_OPEN_INVITES = 5

// ---- rows -----------------------------------------------------------------

export interface PersonFields {
  full_name: string
  display_name: string | null
  date_of_birth: string | null
  photo_path: string | null
  spoken_languages: string[]
  blood_group: string | null
  organ_donor: boolean | null
  communication_needs: string | null
  home_area: string | null
  lost_person_mode: boolean
  insurer_name: string | null
  insurance_policy_number: string | null
  preferred_hospital: string | null
  show_photo: boolean
  show_age: boolean
  show_blood_group: boolean
  show_languages: boolean
  show_communication_needs: boolean
  show_organ_donor: boolean
  show_preferred_hospital: boolean
  show_insurance: boolean
  info_confirmed_at: string | null
}

export interface Person extends PersonFields {
  id: string
  content_updated_at: string
}

export interface CriticalAlert {
  id: string
  code: AlertCode
  note: string | null
  show_on_scan: boolean
}

export interface Allergy {
  id: string
  substance: string
  reaction: string | null
  severity: Severity
  show_on_scan: boolean
}

export interface Condition {
  id: string
  name: string
  since_year: number | null
  notes: string | null
  show_on_scan: boolean
}

export interface Medication {
  id: string
  name: string
  dose: string | null
  frequency: string | null
  kind: MedKind
  is_current: boolean
  started_on: string | null
  show_on_scan: boolean
}

export interface EmergencyContact {
  id: string
  name: string
  relationship: ContactRelationship
  phone_e164: string
  email: string | null
  priority: number
  notify_on_scan: boolean
  show_on_scan: boolean
}

export interface PersonDetail extends Person {
  role: 'owner' | 'editor'
  person_is_my: ProfileFor
  critical_alerts: CriticalAlert[]
  allergies: Allergy[]
  conditions: Condition[]
  medications: Medication[]
  emergency_contacts: EmergencyContact[]
}

export type ListTable = 'critical_alerts' | 'allergies' | 'conditions' | 'medications' | 'emergency_contacts'

export interface ListRow {
  critical_alerts: CriticalAlert
  allergies: Allergy
  conditions: Condition
  medications: Medication
  emergency_contacts: EmergencyContact
}

/** What build_public_profile() returns (architecture doc §7): a field is
 * only present when its toggle is on and there is data. */
export interface PublicProfile {
  name: string
  age?: number
  photo_path?: string
  blood_group?: string
  languages?: string[]
  communication_needs?: string
  organ_donor?: boolean
  preferred_hospital?: string
  insurer?: string
  lost_person_mode: boolean
  home_area?: string
  updated_at?: string
  alerts: { code: AlertCode; note?: string }[]
  allergies: { substance: string; reaction?: string; severity: Severity }[]
  conditions: { name: string; since_year?: number }[]
  medications: { name: string; dose?: string; frequency?: string; kind: MedKind }[]
  contacts: { name: string; relationship: ContactRelationship; phone: string }[]
}

export interface Manager {
  userId: string
  displayName: string | null
  role: 'owner' | 'editor'
  isYou: boolean
}

export interface Invite {
  id: string
  note: string | null
  created_at: string
  expires_at: string
  accepted_at: string | null
  revoked_at: string | null
}

// ---- reads ----------------------------------------------------------------

async function fetchPersonDetail(personId: string): Promise<PersonDetail | null> {
  if (!supabase) return demo.getDemoDetail(personId)

  const { data: auth } = await supabase.auth.getUser()
  const [{ data: person, error }, { data: mine, error: mineError }] = await Promise.all([
    supabase
      .from('people')
      .select('*, critical_alerts(*), allergies(*), conditions(*), medications(*), emergency_contacts(*)')
      .eq('id', personId)
      .maybeSingle(),
    supabase
      .from('person_managers')
      .select('role, person_is_my')
      .eq('person_id', personId)
      .eq('user_id', auth.user?.id ?? '')
      .maybeSingle(),
  ])
  if (error) throw error
  if (mineError) throw mineError
  if (!person || !mine) return null
  return { ...person, role: mine.role, person_is_my: mine.person_is_my } as PersonDetail
}

export function usePersonDetail(personId: string) {
  return useQuery({ queryKey: ['person', personId], queryFn: () => fetchPersonDetail(personId) })
}

/** Exactly what a stranger would see. Real mode always asks the database
 * (preview_scan_profile), so the preview can't drift from the scan page. */
export function usePreview(personId: string) {
  return useQuery({
    queryKey: ['preview', personId],
    queryFn: async (): Promise<PublicProfile | null> => {
      if (!supabase) return demo.demoPreview(personId)
      const { data, error } = await supabase.rpc('preview_scan_profile', { p_person_id: personId })
      if (error) throw error
      return data as PublicProfile | null
    },
  })
}

/** A displayable URL for photo_path: demo mode keeps a data URL; real
 * photos live in the private person-photos bucket, so sign a short link. */
export function usePhotoUrl(photoPath: string | null | undefined) {
  return useQuery({
    queryKey: ['photo', photoPath],
    enabled: Boolean(photoPath),
    staleTime: 4 * 60_000,
    queryFn: async (): Promise<string | null> => {
      if (!photoPath) return null
      if (!supabase || photoPath.startsWith('data:')) return photoPath
      const { data, error } = await supabase.storage.from('person-photos').createSignedUrl(photoPath, 300)
      if (error) throw error
      return data.signedUrl
    },
  })
}

export function useManagers(personId: string) {
  return useQuery({
    queryKey: ['managers', personId],
    queryFn: async (): Promise<Manager[]> => {
      if (!supabase) return demo.demoManagers(personId)
      const { data: auth } = await supabase.auth.getUser()
      const { data: rows, error } = await supabase.from('person_managers').select('user_id, role').eq('person_id', personId)
      if (error) throw error
      // No foreign key links person_managers to app_users directly (both point
      // at auth.users), so names come from a second query — allowed for
      // co-managers by private.shares_person_with() (architecture doc §6).
      const ids = rows.map((r) => r.user_id)
      const { data: users, error: usersError } = await supabase.from('app_users').select('id, display_name').in('id', ids)
      if (usersError) throw usersError
      const names = new Map(users.map((u) => [u.id, u.display_name as string | null]))
      return rows
        .map((r) => ({ userId: r.user_id, displayName: names.get(r.user_id) ?? null, role: r.role, isYou: r.user_id === auth.user?.id }))
        .sort((a, b) => (a.role === b.role ? 0 : a.role === 'owner' ? -1 : 1))
    },
  })
}

export function useInvites(personId: string, enabled: boolean) {
  return useQuery({
    queryKey: ['invites', personId],
    enabled,
    queryFn: async (): Promise<Invite[]> => {
      if (!supabase) return demo.demoInvites(personId)
      const { data, error } = await supabase
        .from('person_invites')
        .select('id, note, created_at, expires_at, accepted_at, revoked_at')
        .eq('person_id', personId)
        .order('created_at', { ascending: false })
      if (error) throw error
      return data
    },
  })
}

export function isOpenInvite(invite: Invite): boolean {
  return !invite.accepted_at && !invite.revoked_at && new Date(invite.expires_at).getTime() > Date.now()
}

// ---- writes ---------------------------------------------------------------

function useInvalidatePerson(personId: string) {
  const queryClient = useQueryClient()
  return () =>
    Promise.all([
      queryClient.invalidateQueries({ queryKey: ['person', personId] }),
      queryClient.invalidateQueries({ queryKey: ['preview', personId] }),
      queryClient.invalidateQueries({ queryKey: ['profiles'] }),
    ])
}

/** Update columns on `people` (only the ones the authenticated grant allows;
 * content_updated_at is set by a trigger, never from here). */
export function useUpdatePerson(personId: string) {
  const invalidate = useInvalidatePerson(personId)
  return useMutation({
    mutationFn: async (patch: Partial<PersonFields>) => {
      if (!supabase) return demo.updateDemoPerson(personId, patch)
      const { error } = await supabase.from('people').update(patch).eq('id', personId)
      if (error) throw error
    },
    onSuccess: invalidate,
  })
}

type NewRow<T extends ListTable> = Omit<ListRow[T], 'id'>

export function useListMutations<T extends ListTable>(personId: string, table: T) {
  const invalidate = useInvalidatePerson(personId)
  const add = useMutation({
    mutationFn: async (row: NewRow<T>) => {
      if (!supabase) return demo.addDemoRow(personId, table, row)
      const { error } = await supabase.from(table).insert({ ...row, person_id: personId })
      if (error) throw error
    },
    onSuccess: invalidate,
  })
  const update = useMutation({
    mutationFn: async ({ id, patch }: { id: string; patch: Partial<NewRow<T>> }) => {
      if (!supabase) return demo.updateDemoRow(personId, table, id, patch)
      const { error } = await supabase.from(table).update(patch as Record<string, unknown>).eq('id', id)
      if (error) throw error
    },
    onSuccess: invalidate,
  })
  const remove = useMutation({
    mutationFn: async (id: string) => {
      if (!supabase) return demo.deleteDemoRow(personId, table, id)
      const { error } = await supabase.from(table).delete().eq('id', id)
      if (error) throw error
    },
    onSuccess: invalidate,
  })
  return { add, update, remove }
}

/** Swap two contacts' call order. priority is unique per person and must
 * stay within 1..3, so there is no spare value to park one on: the second
 * contact is removed and added back at the first one's old place. */
export function useSwapContacts(personId: string) {
  const invalidate = useInvalidatePerson(personId)
  return useMutation({
    mutationFn: async ({ a, b }: { a: EmergencyContact; b: EmergencyContact }) => {
      if (!supabase) return demo.swapDemoContacts(personId, a.id, b.id)
      const { id: _bId, ...bRest } = b
      void _bId
      const del = await supabase.from('emergency_contacts').delete().eq('id', b.id)
      if (del.error) throw del.error
      const upd = await supabase.from('emergency_contacts').update({ priority: b.priority }).eq('id', a.id)
      if (upd.error) throw upd.error
      const ins = await supabase.from('emergency_contacts').insert({ ...bRest, priority: a.priority, person_id: personId })
      if (ins.error) throw ins.error
    },
    onSuccess: invalidate,
  })
}

/** Upload a square JPEG to person-photos/<person_id>/… (the path shape the
 * storage RLS reads the person id from) and point photo_path at it. */
export function useUploadPhoto(personId: string) {
  const invalidate = useInvalidatePerson(personId)
  return useMutation({
    mutationFn: async (photo: { blob: Blob; dataUrl: string }) => {
      if (!supabase) return demo.updateDemoPerson(personId, { photo_path: photo.dataUrl })
      const path = `${personId}/photo-${Date.now()}.jpg`
      const up = await supabase.storage.from('person-photos').upload(path, photo.blob, { contentType: 'image/jpeg' })
      if (up.error) throw up.error
      const { error } = await supabase.from('people').update({ photo_path: path }).eq('id', personId)
      if (error) throw error
    },
    onSuccess: invalidate,
  })
}

export function useCreateInvite(personId: string) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async (note: string | null): Promise<string> => {
      if (!supabase) return demo.createDemoInvite(personId, note)
      const { data, error } = await supabase.rpc('create_person_invite', { p_person_id: personId, p_note: note })
      if (error) throw error
      return data as string
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['invites', personId] }),
  })
}

export function useRevokeInvite(personId: string) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async (inviteId: string) => {
      if (!supabase) return demo.revokeDemoInvite(personId, inviteId)
      const { error } = await supabase.rpc('revoke_person_invite', { p_invite_id: inviteId })
      if (error) throw error
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['invites', personId] }),
  })
}

// ---- helpers --------------------------------------------------------------

export function ageFrom(dateOfBirth: string | null): number | null {
  if (!dateOfBirth) return null
  const dob = new Date(dateOfBirth)
  const now = new Date()
  let age = now.getFullYear() - dob.getFullYear()
  const beforeBirthday = now.getMonth() < dob.getMonth() || (now.getMonth() === dob.getMonth() && now.getDate() < dob.getDate())
  if (beforeBirthday) age -= 1
  return age
}

/** The freshest of content_updated_at / info_confirmed_at — the same rule
 * as the profiles list and the scan page's "Updated X days ago". */
export function freshestOf(person: Pick<Person, 'content_updated_at' | 'info_confirmed_at'>): string {
  const { content_updated_at: c, info_confirmed_at: i } = person
  return i && i > c ? i : c
}
