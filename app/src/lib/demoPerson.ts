import { getDemoProfile, getDemoUser, patchDemoProfile } from './demoStore'
import { ALERT_CODES, SEVERITIES, ageFrom } from './person'
import type {
  EmergencyContact,
  Invite,
  ListRow,
  ListTable,
  Manager,
  PersonDetail,
  PersonFields,
  PublicProfile,
} from './person'

/*
  Demo-mode stand-in for one person's full record (people + its five lists,
  managers and invites), kept in this browser's localStorage only. Used
  only while Supabase isn't configured; lib/person.ts switches to the real
  tables and RPCs the moment it is.
*/

interface DemoInvite extends Invite {
  code: string
}

interface DemoRecord {
  detail: PersonDetail
  coManagers: { displayName: string; role: 'editor' }[]
  invites: DemoInvite[]
}

const KEY = 'helf_demo_people'

function readAll(): Record<string, DemoRecord> {
  try {
    const raw = localStorage.getItem(KEY)
    return raw ? (JSON.parse(raw) as Record<string, DemoRecord>) : {}
  } catch {
    return {}
  }
}

function writeAll(all: Record<string, DemoRecord>) {
  try {
    localStorage.setItem(KEY, JSON.stringify(all))
  } catch {
    // Storage full or blocked (a large photo can do it) — the change just
    // won't survive a reload.
  }
}

const uid = () => `demo-${Math.random().toString(36).slice(2, 10)}`

/** A new person as create_person leaves them: the column defaults from the
 * initial migration (show_* toggles, empty lists). */
export function blankDetail(personId: string, fullName: string, displayName: string | null, personIsMy: PersonDetail['person_is_my'], updatedAt: string): PersonDetail {
  return {
    id: personId,
    full_name: fullName,
    display_name: displayName,
    date_of_birth: null,
    photo_path: null,
    spoken_languages: [],
    blood_group: null,
    organ_donor: null,
    communication_needs: null,
    home_area: null,
    lost_person_mode: false,
    insurer_name: null,
    insurance_policy_number: null,
    preferred_hospital: null,
    show_photo: true,
    show_age: true,
    show_blood_group: true,
    show_languages: true,
    show_communication_needs: true,
    show_organ_donor: false,
    show_preferred_hospital: false,
    show_insurance: false,
    info_confirmed_at: null,
    content_updated_at: updatedAt,
    role: 'owner',
    person_is_my: personIsMy,
    critical_alerts: [],
    allergies: [],
    conditions: [],
    medications: [],
    emergency_contacts: [],
  }
}

function load(personId: string): DemoRecord | null {
  const all = readAll()
  if (all[personId]) return all[personId]
  const summary = getDemoProfile(personId)
  if (!summary) return null
  const record: DemoRecord = {
    detail: blankDetail(personId, summary.fullName, summary.displayName, summary.personIsMy, summary.freshestAt),
    coManagers: [],
    invites: [],
  }
  all[personId] = record
  writeAll(all)
  return record
}

/** Save a change the way the database would: bump content_updated_at
 * (the people_before_update / touch_person triggers) unless only the
 * "I checked" stamp moved, and keep the profiles list in step. */
function save(personId: string, change: (record: DemoRecord) => void, touch = true) {
  const all = readAll()
  const record = all[personId] ?? load(personId)
  if (!record) return
  change(record)
  if (touch) record.detail.content_updated_at = new Date().toISOString()
  all[personId] = record
  writeAll(all)
  const d = record.detail
  const freshest = d.info_confirmed_at && d.info_confirmed_at > d.content_updated_at ? d.info_confirmed_at : d.content_updated_at
  patchDemoProfile(personId, { fullName: d.full_name, displayName: d.display_name, freshestAt: freshest })
}

export function getDemoDetail(personId: string): PersonDetail | null {
  return load(personId)?.detail ?? null
}

export function updateDemoPerson(personId: string, patch: Partial<PersonFields>) {
  const onlyConfirm = Object.keys(patch).length === 1 && 'info_confirmed_at' in patch
  save(personId, (r) => Object.assign(r.detail, patch), !onlyConfirm)
}

export function addDemoRow<T extends ListTable>(personId: string, table: T, row: Omit<ListRow[T], 'id'>) {
  save(personId, (r) => {
    ;(r.detail[table] as ListRow[T][]).push({ ...row, id: uid() } as ListRow[T])
  })
}

export function updateDemoRow<T extends ListTable>(personId: string, table: T, id: string, patch: Partial<Omit<ListRow[T], 'id'>>) {
  save(personId, (r) => {
    const item = (r.detail[table] as ListRow[T][]).find((x) => x.id === id)
    if (item) Object.assign(item, patch)
  })
}

export function deleteDemoRow(personId: string, table: ListTable, id: string) {
  save(personId, (r) => {
    ;(r.detail as unknown as Record<ListTable, { id: string }[]>)[table] = r.detail[table].filter((x) => x.id !== id)
  })
}

export function swapDemoContacts(personId: string, aId: string, bId: string) {
  save(personId, (r) => {
    const a = r.detail.emergency_contacts.find((c) => c.id === aId)
    const b = r.detail.emergency_contacts.find((c) => c.id === bId)
    if (a && b) [a.priority, b.priority] = [b.priority, a.priority]
  })
}

export function demoManagers(personId: string): Manager[] {
  const record = load(personId)
  if (!record) return []
  const you: Manager = { userId: 'demo-you', displayName: getDemoUser()?.displayName ?? null, role: record.detail.role, isYou: true }
  return [you, ...record.coManagers.map((m, i) => ({ userId: `demo-co-${i}`, displayName: m.displayName, role: m.role, isYou: false }))]
}

export function demoInvites(personId: string): Invite[] {
  return (load(personId)?.invites ?? []).map((i) => ({
    id: i.id,
    note: i.note,
    created_at: i.created_at,
    expires_at: i.expires_at,
    accepted_at: i.accepted_at,
    revoked_at: i.revoked_at,
  }))
}

/** Shaped like a real one-time code; only ever shown once, like the real one. */
export function createDemoInvite(personId: string, note: string | null): string {
  const alphabet = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'
  const code = Array.from({ length: 10 }, () => alphabet[Math.floor(Math.random() * alphabet.length)]).join('')
  const now = new Date()
  save(
    personId,
    (r) => {
      r.invites.unshift({
        id: uid(),
        code,
        note,
        created_at: now.toISOString(),
        expires_at: new Date(now.getTime() + 7 * 86_400_000).toISOString(),
        accepted_at: null,
        revoked_at: null,
      })
    },
    false,
  )
  return code
}

export function revokeDemoInvite(personId: string, inviteId: string) {
  save(
    personId,
    (r) => {
      const invite = r.invites.find((i) => i.id === inviteId)
      if (invite) invite.revoked_at = new Date().toISOString()
    },
    false,
  )
}

/**
 * Demo-only copy of private.build_public_profile()
 * (supabase/migrations/20261012000000_initial_schema.sql), field for field
 * and in the same order, so the demo preview behaves like the real one.
 * With Supabase configured this is never used: the editor calls the real
 * preview_scan_profile RPC instead.
 */
export function demoPreview(personId: string): PublicProfile | null {
  const p = getDemoDetail(personId)
  if (!p) return null
  const sevRank = (s: string) => SEVERITIES.indexOf(s as (typeof SEVERITIES)[number])
  const out: PublicProfile = {
    name: p.display_name || p.full_name,
    lost_person_mode: p.lost_person_mode,
    updated_at: p.info_confirmed_at && p.info_confirmed_at > p.content_updated_at ? p.info_confirmed_at : p.content_updated_at,
    alerts: p.critical_alerts
      .filter((a) => a.show_on_scan)
      .sort((a, b) => ALERT_CODES.indexOf(a.code) - ALERT_CODES.indexOf(b.code))
      .map((a) => ({ code: a.code, ...(a.note ? { note: a.note } : {}) })),
    allergies: p.allergies
      .filter((a) => a.show_on_scan)
      .sort(
        (a, b) =>
          Number(a.severity === 'unknown') - Number(b.severity === 'unknown') ||
          sevRank(b.severity) - sevRank(a.severity) ||
          a.substance.localeCompare(b.substance),
      )
      .map((a) => ({ substance: a.substance, severity: a.severity, ...(a.reaction ? { reaction: a.reaction } : {}) })),
    conditions: p.conditions
      .filter((c) => c.show_on_scan)
      .sort((a, b) => (a.since_year ?? 9999) - (b.since_year ?? 9999) || a.name.localeCompare(b.name))
      .map((c) => ({ name: c.name, ...(c.since_year ? { since_year: c.since_year } : {}) })),
    medications: p.medications
      .filter((m) => m.show_on_scan && m.is_current)
      .sort((a, b) => a.name.localeCompare(b.name))
      .map((m) => ({ name: m.name, kind: m.kind, ...(m.dose ? { dose: m.dose } : {}), ...(m.frequency ? { frequency: m.frequency } : {}) })),
    contacts: [...p.emergency_contacts]
      .filter((c) => c.show_on_scan)
      .sort((a, b) => a.priority - b.priority)
      .map((c: EmergencyContact) => ({ name: c.name, relationship: c.relationship, phone: c.phone_e164 })),
  }
  const age = p.show_age ? ageFrom(p.date_of_birth) : null
  if (age !== null) out.age = age
  if (p.show_photo && p.photo_path) out.photo_path = p.photo_path
  if (p.show_blood_group && p.blood_group) out.blood_group = p.blood_group
  if (p.show_languages && p.spoken_languages.length > 0) out.languages = p.spoken_languages
  if (p.show_communication_needs && p.communication_needs) out.communication_needs = p.communication_needs
  if (p.show_organ_donor && p.organ_donor !== null) out.organ_donor = p.organ_donor
  if (p.show_preferred_hospital && p.preferred_hospital) out.preferred_hospital = p.preferred_hospital
  if (p.show_insurance && p.insurer_name) out.insurer = p.insurer_name
  if (p.lost_person_mode && p.home_area) out.home_area = p.home_area
  return out
}

/** Sample records for ?demo=family (see seedDemoFromUrl in demoStore.ts). */
export function seedDemoPeople() {
  const daysAgo = (n: number) => new Date(Date.now() - n * 86_400_000).toISOString()
  const s1 = blankDetail('demo-s1', 'Sunil Perera', 'Thaththa', 'parent', daysAgo(12))
  Object.assign(s1, {
    date_of_birth: '1953-04-18',
    spoken_languages: ['si', 'en'],
    blood_group: 'B+',
    organ_donor: true,
    communication_needs: 'Hard of hearing in the left ear — speak on his right side.',
    preferred_hospital: 'Colombo South Teaching Hospital, Kalubowila',
    show_preferred_hospital: true,
    insurer_name: 'Ceylinco Life',
    insurance_policy_number: 'CL-00482913',
    critical_alerts: [
      { id: 'a1', code: 'blood_thinner', note: 'Warfarin 5 mg daily', show_on_scan: true },
      { id: 'a2', code: 'diabetes_insulin', note: null, show_on_scan: true },
    ],
    allergies: [
      { id: 'al1', substance: 'Penicillin', reaction: 'Swelling of the face and throat', severity: 'life_threatening', show_on_scan: true },
      { id: 'al2', substance: 'Shellfish', reaction: 'Rash', severity: 'mild', show_on_scan: true },
    ],
    conditions: [
      { id: 'c1', name: 'Type 2 diabetes', since_year: 2009, notes: null, show_on_scan: true },
      { id: 'c2', name: 'Atrial fibrillation', since_year: 2018, notes: 'Seen at the cardiology clinic every 3 months', show_on_scan: true },
    ],
    medications: [
      { id: 'm1', name: 'Warfarin', dose: '5 mg', frequency: 'once a day', kind: 'prescription', is_current: true, started_on: '2018-06-01', show_on_scan: true },
      { id: 'm2', name: 'Insulin glargine', dose: '18 units', frequency: 'at night', kind: 'prescription', is_current: true, started_on: '2021-02-10', show_on_scan: false },
      { id: 'm3', name: 'Kothala himbutu tea', dose: null, frequency: 'mornings', kind: 'herbal_ayurvedic', is_current: true, started_on: null, show_on_scan: false },
    ],
    emergency_contacts: [
      { id: 'e1', name: 'Nadeesha', relationship: 'daughter', phone_e164: '+94771234567', email: 'nadeesha.perera@mail.lk', priority: 1, notify_on_scan: true, show_on_scan: true },
      { id: 'e2', name: 'Kasun', relationship: 'son', phone_e164: '+94712345678', email: null, priority: 2, notify_on_scan: true, show_on_scan: true },
    ],
  } satisfies Partial<PersonDetail>)

  const s2 = blankDetail('demo-s2', 'Sriyani Perera', 'Amma (Sriyani)', 'parent', daysAgo(104))
  Object.assign(s2, {
    date_of_birth: '1957-11-02',
    spoken_languages: ['si'],
    blood_group: 'O+',
    communication_needs: 'Gets confused when rushed. Speak slowly, in Sinhala.',
    lost_person_mode: true,
    home_area: 'Nugegoda',
    critical_alerts: [
      { id: 'a1', code: 'dementia', note: 'Early stage — may not know her address', show_on_scan: true },
      { id: 'a2', code: 'hearing_impairment', note: null, show_on_scan: true },
    ],
    conditions: [{ id: 'c1', name: 'High blood pressure', since_year: 2012, notes: null, show_on_scan: true }],
    medications: [
      { id: 'm1', name: 'Donepezil', dose: '5 mg', frequency: 'at night', kind: 'prescription', is_current: true, started_on: '2024-03-01', show_on_scan: true },
    ],
    emergency_contacts: [
      { id: 'e1', name: 'Nadeesha', relationship: 'daughter', phone_e164: '+94771234567', email: null, priority: 1, notify_on_scan: true, show_on_scan: true },
    ],
  } satisfies Partial<PersonDetail>)

  const s3 = blankDetail('demo-s3', 'Kasun Perera', 'Kasun', 'child', daysAgo(0))

  const all: Record<string, DemoRecord> = {
    'demo-s1': { detail: s1, coManagers: [{ displayName: 'Nadeesha', role: 'editor' }], invites: [] },
    'demo-s2': { detail: s2, coManagers: [{ displayName: 'Nadeesha', role: 'editor' }], invites: [] },
    'demo-s3': { detail: s3, coManagers: [], invites: [] },
  }
  writeAll(all)
}
