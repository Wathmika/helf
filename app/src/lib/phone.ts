// Mirrors backend/src/app/phone.py so the UI rejects a bad number before
// ever calling signInWithOtp — see docs/architecture-for-frontend.md §8.
export const ALLOWED_COUNTRY_CODES = ['94', '971', '966', '974', '965', '968', '973', '44', '61', '39', '1'] as const

export function normalizePhone(raw: string): string {
  let digits = raw.replace(/\D/g, '')
  if (digits.startsWith('00')) digits = digits.slice(2)
  return digits
}

export function isSriLankan(digits: string): boolean {
  return digits.startsWith('94')
}

export function isSriLankanMobile(digits: string): boolean {
  return /^947\d{8}$/.test(digits)
}

export function isAllowedCountry(digits: string): boolean {
  return ALLOWED_COUNTRY_CODES.some((code) => digits.startsWith(code))
}

/** What the phone-entry screen should check before calling signInWithOtp. */
export function validatePhone(raw: string): { valid: boolean; digits: string } {
  const digits = normalizePhone(raw)
  if (!isAllowedCountry(digits)) return { valid: false, digits }
  if (isSriLankan(digits) && !isSriLankanMobile(digits)) return { valid: false, digits }
  return { valid: true, digits }
}

export function toE164(digits: string): string {
  return `+${digits}`
}
