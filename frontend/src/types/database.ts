/**
 * Hand-written types mirroring the real Supabase schema. Source of truth:
 * docs/architecture-for-frontend.md + supabase/migrations/*.sql — re-check those files
 * before changing anything here, don't guess plausible alternatives.
 */

export type PreferredLanguage = "si" | "ta" | "en"

export type ProfileFor = "self" | "parent" | "child" | "spouse" | "other"

export type ManagerRole = "owner" | "editor"

export type BloodGroup = "A+" | "A-" | "B+" | "B-" | "AB+" | "AB-" | "O+" | "O-" | "unknown"

export const ALERT_CODES = [
  "blood_thinner",
  "diabetes_insulin",
  "epilepsy",
  "heart_condition",
  "pacemaker_implant",
  "severe_allergy",
  "pregnancy",
  "dementia",
  "hearing_impairment",
  "vision_impairment",
] as const
export type AlertCode = (typeof ALERT_CODES)[number]

export const ALLERGY_SEVERITIES = [
  "mild",
  "moderate",
  "severe",
  "life_threatening",
  "unknown",
] as const
export type AllergySeverity = (typeof ALLERGY_SEVERITIES)[number]

export const MEDICATION_KINDS = ["prescription", "over_the_counter", "herbal_ayurvedic"] as const
export type MedicationKind = (typeof MEDICATION_KINDS)[number]

export const CONTACT_RELATIONSHIPS = [
  "son",
  "daughter",
  "husband",
  "wife",
  "father",
  "mother",
  "brother",
  "sister",
  "grandson",
  "granddaughter",
  "relative",
  "friend",
  "neighbour",
  "caregiver",
  "other",
] as const
export type ContactRelationship = (typeof CONTACT_RELATIONSHIPS)[number]

export const QR_TOKEN_STATUSES = ["active", "revoked"] as const
export type QrTokenStatus = (typeof QR_TOKEN_STATUSES)[number]

export interface AppUser {
  id: string
  display_name: string | null
  preferred_language: PreferredLanguage
  created_at: string
  updated_at: string
}

export interface Person {
  id: string
  created_by: string
  full_name: string
  display_name: string | null
  date_of_birth: string | null
  photo_path: string | null
  spoken_languages: string[]
  blood_group: BloodGroup | null
  organ_donor: boolean
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
  content_updated_at: string
  created_at: string
  updated_at: string
}

export interface PersonManager {
  person_id: string
  user_id: string
  role: ManagerRole
  person_is_my: ProfileFor
}

export interface PersonManagerWithUser extends PersonManager {
  // null for a co-manager other than yourself: app_users RLS only exposes your own row.
  app_users: Pick<AppUser, "id" | "display_name"> | null
}

export interface CriticalAlert {
  id: string
  person_id: string
  code: AlertCode
  note: string | null
  show_on_scan: boolean
  created_at: string
  updated_at: string
}

export interface Allergy {
  id: string
  person_id: string
  substance: string
  reaction: string | null
  severity: AllergySeverity | null
  code_system: string | null
  code: string | null
  show_on_scan: boolean
  created_at: string
  updated_at: string
}

export interface Condition {
  id: string
  person_id: string
  name: string
  since_year: number | null
  notes: string | null
  code_system: string | null
  code: string | null
  show_on_scan: boolean
  created_at: string
  updated_at: string
}

export interface Medication {
  id: string
  person_id: string
  name: string
  dose: string | null
  frequency: string | null
  kind: MedicationKind | null
  packet_photo_path: string | null
  is_current: boolean
  started_on: string | null
  code_system: string | null
  code: string | null
  show_on_scan: boolean
  created_at: string
  updated_at: string
}

export interface EmergencyContact {
  id: string
  person_id: string
  name: string
  relationship: ContactRelationship
  phone_e164: string
  email: string | null
  priority: 1 | 2 | 3
  notify_on_scan: boolean
  show_on_scan: boolean
  created_at: string
  updated_at: string
}

export interface QrToken {
  id: string
  person_id: string
  token: string
  label: string | null
  status: QrTokenStatus
  created_by: string
  created_at: string
  revoked_at: string | null
}

export interface ScanEvent {
  id: number
  person_id: string
  token_id: string
  scanned_at: string
  approx_lat: number | null
  approx_lng: number | null
  location_accuracy_m: number | null
  location_added_at: string | null
  country_code: string | null
  family_notified_at: string | null
  location_notified_at: string | null
}

export interface PersonInvite {
  id: string
  person_id: string
  role: "editor"
  note: string | null
  created_by: string
  created_at: string
  expires_at: string
  accepted_by: string | null
  accepted_at: string | null
  revoked_at: string | null
}

/** Shape returned by preview_scan_profile / get_scan_profile (nulls stripped). */
export interface PublicScanProfile {
  name?: string
  age?: number
  photo_path?: string
  blood_group?: BloodGroup
  languages?: string[]
  communication_needs?: string
  organ_donor?: boolean
  preferred_hospital?: string
  insurer?: string
  lost_person_mode?: boolean
  home_area?: string
  updated_at?: string
  alerts?: { code: AlertCode; note: string | null }[]
  allergies?: { substance: string; reaction: string | null; severity: AllergySeverity | null }[]
  conditions?: { name: string; since_year: number | null }[]
  medications?: { name: string; dose: string | null; frequency: string | null; kind: MedicationKind | null }[]
  contacts?: { name: string; relationship: ContactRelationship; phone: string }[]
}

/** Field length/shape limits lifted straight from the migrations — mirror client-side. */
export const LIMITS = {
  appUserDisplayName: 60,
  personFullName: { min: 1, max: 120 },
  personDisplayName: 60,
  spokenLanguagesMax: 6,
  communicationNeeds: 300,
  homeArea: 80,
  insurerName: 80,
  insurancePolicyNumber: 60,
  preferredHospital: 120,
  criticalAlertNote: 120,
  allergySubstance: { min: 1, max: 80 },
  allergyReaction: 120,
  conditionName: { min: 1, max: 120 },
  conditionSinceYear: { min: 1900, max: 2100 },
  conditionNotes: 200,
  medicationName: { min: 1, max: 120 },
  medicationDose: 60,
  medicationFrequency: 60,
  contactName: { min: 1, max: 60 },
  qrLabel: 40,
  inviteNote: 60,
  maxProfilesPerUser: 10,
  maxContactsPerPerson: 3,
  maxOpenInvitesPerPerson: 5,
  inviteExpiryDays: 7,
} as const

export const PHONE_E164_PATTERN = /^\+[1-9][0-9]{7,14}$/
export const EMAIL_PATTERN = /^[^@\s]+@[^@\s]+\.[^@\s]+$/
