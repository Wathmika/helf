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
import type { QrToken, ScanEvent } from './qr'

/*
  Demo-mode stand-in for one person's full record (people + its five lists,
  managers, invites, QR codes and scans), kept in this browser's localStorage only. Used
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
  tokens?: QrToken[]
  scans?: ScanEvent[]
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

/** Shaped like a real one-time code (private.new_token: 24 URL-safe,
 * case-sensitive characters); only ever shown once, like the real one. */
export function createDemoInvite(personId: string, note: string | null): string {
  const alphabet = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789-_'
  const code = Array.from({ length: 24 }, () => alphabet[Math.floor(Math.random() * alphabet.length)]).join('')
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

// ---- QR codes and scans ----------------------------------------------------

export function demoTokens(personId: string): QrToken[] {
  return [...(load(personId)?.tokens ?? [])].sort((a, b) => b.created_at.localeCompare(a.created_at))
}

export function demoScans(personId: string): ScanEvent[] {
  return [...(load(personId)?.scans ?? [])].sort((a, b) => b.scanned_at.localeCompare(a.scanned_at))
}

/** Same shape as private.new_token(): 24 URL-safe characters. */
function demoToken(): string {
  const alphabet = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789-_'
  return Array.from({ length: 24 }, () => alphabet[Math.floor(Math.random() * alphabet.length)]).join('')
}

export function issueDemoToken(personId: string, label: string | null): QrToken {
  const row: QrToken = { id: uid(), token: demoToken(), label, status: 'active', created_at: new Date().toISOString(), revoked_at: null }
  save(personId, (r) => (r.tokens = [row, ...(r.tokens ?? [])]), false)
  return row
}

export function revokeDemoToken(personId: string, tokenId: string) {
  save(
    personId,
    (r) => {
      const t = r.tokens?.find((x) => x.id === tokenId && x.status === 'active')
      if (!t) throw new Error('not found or not allowed')
      t.status = 'revoked'
      t.revoked_at = new Date().toISOString()
    },
    false,
  )
}

const ALERT_LABEL_EN: Record<string, string> = {
  blood_thinner: 'BLOOD THINNER',
  diabetes_insulin: 'DIABETIC ON INSULIN',
  epilepsy: 'EPILEPSY',
  heart_condition: 'HEART CONDITION',
  pacemaker_implant: 'PACEMAKER/IMPLANT',
  severe_allergy: 'SEVERE ALLERGY',
  pregnancy: 'PREGNANT',
  dementia: 'DEMENTIA',
  hearing_impairment: 'HEARING IMPAIRED',
  vision_impairment: 'VISION IMPAIRED',
}

/**
 * Demo-only copy of private.build_offline_qr_text()
 * (supabase/migrations/20261012000100_family_qr_alerts_privacy.sql): the
 * same lines, priorities and 300-byte budget. Real mode calls the
 * offline_qr_text RPC instead.
 */
export function demoOfflineText(tokenId: string, link: string): string {
  const all = readAll()
  const record = Object.values(all).find((r) => r.tokens?.some((t) => t.id === tokenId))
  if (!record) throw new Error('not allowed')
  const token = record.tokens!.find((t) => t.id === tokenId)!
  if (token.status !== 'active') throw new Error('this QR has been deactivated')
  const p = record.detail
  const sevRank = (s: string) => SEVERITIES.indexOf(s as (typeof SEVERITIES)[number])
  const lines: { prio: number; ord: number; line: string }[] = []
  lines.push({ prio: 0, ord: 0, line: 'EMERGENCY MEDICAL INFO' })
  const age = p.show_age ? ageFrom(p.date_of_birth) : null
  lines.push({ prio: 1, ord: 1, line: (p.display_name || p.full_name) + (age !== null ? `, ${age}` : '') })
  p.critical_alerts
    .filter((a) => a.show_on_scan)
    .sort((a, b) => ALERT_CODES.indexOf(a.code) - ALERT_CODES.indexOf(b.code))
    .forEach((a, i) => lines.push({ prio: 2, ord: 11 + i, line: `!! ${ALERT_LABEL_EN[a.code]}${a.note ? `: ${a.note}` : ''}` }))
  p.allergies
    .filter((a) => a.show_on_scan)
    .sort(
      (a, b) =>
        Number(a.severity === 'unknown') - Number(b.severity === 'unknown') ||
        sevRank(b.severity) - sevRank(a.severity) ||
        a.substance.localeCompare(b.substance),
    )
    .forEach((a, i) =>
      lines.push({ prio: 3, ord: 21 + i, line: `Allergy: ${a.substance}${a.severity !== 'unknown' ? ` (${a.severity.replace('_', '-')})` : ''}` }),
    )
  p.emergency_contacts
    .filter((c) => c.show_on_scan)
    .forEach((c) => lines.push({ prio: c.priority === 1 ? 4 : 7, ord: 30 + c.priority, line: `Call ${c.name} (${c.relationship}) ${c.phone_e164}` }))
  lines.push({ prio: 5, ord: 90, line: 'Ambulance: 1990' })
  const dated = p.info_confirmed_at && p.info_confirmed_at > p.content_updated_at ? p.info_confirmed_at : p.content_updated_at
  lines.push({ prio: 6, ord: 91, line: `Info dated ${new Date(dated).toLocaleDateString('en-CA', { timeZone: 'Asia/Colombo' })}` })
  p.conditions
    .filter((c) => c.show_on_scan)
    .sort((a, b) => (a.since_year ?? 9999) - (b.since_year ?? 9999) || a.name.localeCompare(b.name))
    .forEach((c, i) => lines.push({ prio: 8, ord: 41 + i, line: `Has: ${c.name}` }))
  if (p.show_communication_needs && p.communication_needs) lines.push({ prio: 9, ord: 50, line: `Note: ${p.communication_needs}` })
  if (p.show_blood_group && p.blood_group && p.blood_group !== 'unknown') lines.push({ prio: 10, ord: 51, line: `Blood group (info only): ${p.blood_group}` })

  // Keep lines in priority order while the running byte count (line + newline)
  // stays within 300, then print the kept ones in reading order.
  const bytes = (x: string) => new TextEncoder().encode(x).length
  let running = 0
  const kept = [...lines]
    .sort((a, b) => a.prio - b.prio || a.ord - b.ord)
    .filter((l) => (running += bytes(l.line) + 1) <= 300)
    .sort((a, b) => a.ord - b.ord)
  return `${kept.map((l) => l.line).join('\n')}\nMore: ${link}`
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

  // QR codes and scans. Thaththa's helmet sticker was lost and switched off;
  // the wallet card has been scanned twice (one with location). Kasun has
  // none yet, to show the first-run screen.
  const at = (days: number, hour: number, minute: number) => {
    const d = new Date(Date.now() - days * 86_400_000)
    d.setHours(hour, minute, 0, 0)
    return d.toISOString()
  }
  const t1 = { id: 'qr-s1-card', token: 'Xk2pQ9vLm4Rt7WbN1cYz0aHe', label: 'Wallet card', status: 'active' as const, created_at: at(60, 10, 12), revoked_at: null }
  const t2 = { id: 'qr-s1-helmet', token: 'Pa8sDf3Gh6Jk9Lq2We5Rt0Yu', label: 'Helmet sticker', status: 'revoked' as const, created_at: at(60, 10, 15), revoked_at: at(18, 19, 40) }
  const t3 = { id: 'qr-s1-helmet2', token: 'Zx4Cv7Bn1Mq3Wr6Ty9Ui2Op5', label: 'Helmet sticker (new)', status: 'active' as const, created_at: at(18, 19, 44), revoked_at: null }
  const t4 = { id: 'qr-s2-card', token: 'Lk8Jh5Gf2Ds9Aq6Wz3Xc0Vb7', label: 'Wallet card', status: 'active' as const, created_at: at(150, 9, 2), revoked_at: null }
  const t5 = { id: 'qr-s2-wall', token: 'Nm1Bv4Cx7Za0Qs3Wd6Ef9Rg2', label: 'Phone wallpaper', status: 'active' as const, created_at: at(150, 9, 5), revoked_at: null }
  const scan = (id: number, token_id: string, scanned_at: string, extra: Partial<ScanEvent> = {}): ScanEvent => ({
    id,
    token_id,
    scanned_at,
    approx_lat: null,
    approx_lng: null,
    location_added_at: null,
    country_code: 'LK',
    family_notified_at: scanned_at,
    ...extra,
  })

  const all: Record<string, DemoRecord> = {
    'demo-s1': {
      detail: s1,
      coManagers: [{ displayName: 'Nadeesha', role: 'editor' }],
      invites: [],
      tokens: [t1, t2, t3],
      scans: [
        scan(3, t1.id, at(3, 15, 14)),
        scan(2, t1.id, at(27, 8, 42), { approx_lat: 6.872, approx_lng: 79.889, location_added_at: at(27, 8, 43) }),
        scan(1, t2.id, at(59, 10, 30)),
      ],
    },
    'demo-s2': {
      detail: s2,
      coManagers: [{ displayName: 'Nadeesha', role: 'editor' }],
      invites: [],
      tokens: [t4, t5],
      scans: [scan(4, t4.id, at(9, 17, 5), { approx_lat: 6.865, approx_lng: 79.899, location_added_at: at(9, 17, 7) })],
    },
    'demo-s3': { detail: s3, coManagers: [], invites: [], tokens: [], scans: [] },
  }
  writeAll(all)
}

// ---- account ---------------------------------------------------------------

/** Demo-only copy of export_person_data(): the same top-level keys, built
 * from this browser's sample record. Real mode calls the RPC. */
export function demoExport(personId: string): Record<string, unknown> | null {
  const record = load(personId)
  if (!record) return null
  const { role: _role, person_is_my: _isMy, critical_alerts, allergies, conditions, medications, emergency_contacts, ...person } = record.detail
  void _role
  void _isMy
  return {
    exported_at: new Date().toISOString(),
    person,
    critical_alerts,
    allergies,
    conditions,
    medications,
    emergency_contacts,
    managers: demoManagers(personId).map((m) => ({ user_id: m.userId, role: m.role })),
    qr_codes: (record.tokens ?? []).map(({ label, status, created_at, revoked_at }) => ({ label, status, created_at, revoked_at })),
    scans: demoScans(personId).map((s) => ({
      scanned_at: s.scanned_at,
      country: s.country_code,
      approx_lat: s.approx_lat,
      approx_lng: s.approx_lng,
      family_notified_at: s.family_notified_at,
    })),
  }
}

/** Co-managers of a profile, longest-standing first — the order
 * prepare_account_deletion uses to pick who takes over. */
export function demoCoManagers(personId: string): string[] {
  return (load(personId)?.coManagers ?? []).map((m) => m.displayName)
}

/** Demo "delete my account": forget everything this browser holds. */
export function demoDeleteAccount() {
  for (const key of [KEY, 'helf_demo_profiles', 'helf_demo_user']) {
    try {
      localStorage.removeItem(key)
    } catch {
      // nothing to remove
    }
  }
}
