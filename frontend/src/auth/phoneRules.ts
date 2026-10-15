/**
 * Mirrors backend/src/app/phone.py and backend/src/app/config.py
 * DEFAULT_ALLOWED_COUNTRY_CODES exactly — re-check those files before changing this.
 */

export const ALLOWED_COUNTRIES = [
  { dialCode: "94", iso: "LK", name: "Sri Lanka" },
  { dialCode: "971", iso: "AE", name: "United Arab Emirates" },
  { dialCode: "966", iso: "SA", name: "Saudi Arabia" },
  { dialCode: "974", iso: "QA", name: "Qatar" },
  { dialCode: "965", iso: "KW", name: "Kuwait" },
  { dialCode: "968", iso: "OM", name: "Oman" },
  { dialCode: "973", iso: "BH", name: "Bahrain" },
  { dialCode: "44", iso: "GB", name: "United Kingdom" },
  { dialCode: "61", iso: "AU", name: "Australia" },
  { dialCode: "39", iso: "IT", name: "Italy" },
  { dialCode: "1", iso: "US", name: "United States / Canada" },
] as const

export type AllowedDialCode = (typeof ALLOWED_COUNTRIES)[number]["dialCode"]

export function normalizePhoneDigits(raw: string): string {
  const digits = raw.replace(/\D/g, "")
  return digits.startsWith("00") ? digits.slice(2) : digits
}

export function isSriLankan(digits: string): boolean {
  return digits.startsWith("94")
}

/** Sri Lankan mobiles are 94 7X XXX XXXX. Landlines can't receive SMS. */
export function isSriLankanMobile(digits: string): boolean {
  return /^947\d{8}$/.test(digits)
}

export function isAllowedCountry(digits: string): boolean {
  return ALLOWED_COUNTRIES.some((c) => digits.startsWith(c.dialCode))
}

/** '077 123 4567' + dial code '94' -> '+94771234567' */
export function buildE164(dialCode: string, localNumber: string): string {
  const localDigits = normalizePhoneDigits(localNumber).replace(/^0+/, "")
  return `+${dialCode}${localDigits}`
}

export type PhoneValidation =
  | { valid: true; e164: string }
  | { valid: false; errorKey: "unsupportedCountry" | "notMobile" | "tooShort" }

export function validatePhone(dialCode: string, localNumber: string): PhoneValidation {
  const e164 = buildE164(dialCode, localNumber)
  const digits = normalizePhoneDigits(e164)

  if (!isAllowedCountry(digits)) return { valid: false, errorKey: "unsupportedCountry" }
  if (isSriLankan(digits) && !isSriLankanMobile(digits)) return { valid: false, errorKey: "notMobile" }
  if (digits.length < dialCode.length + 6) return { valid: false, errorKey: "tooShort" }

  return { valid: true, e164 }
}

/** '+94771234567' -> '+94 77 *** **67' for display without exposing the full number. */
export function maskPhone(e164: string): string {
  if (e164.length <= 6) return e164
  return e164.slice(0, 4) + "*".repeat(Math.max(0, e164.length - 6)) + e164.slice(-2)
}
