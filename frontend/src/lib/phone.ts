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

export function toE164(digits: string): string {
  return `+${digits}`
}

/** "+94771234567" → "+94 77 123 4567", for showing a number back to its
 * owner. Other countries get light grouping after the country code. */
export function prettyPhone(e164: string): string {
  const d = e164.replace(/\D/g, '')
  const lk = d.match(/^94(\d{2})(\d{3})(\d{4})$/)
  if (lk) return `+94 ${lk[1]} ${lk[2]} ${lk[3]}`
  const code = ALLOWED_COUNTRY_CODES.find((c) => d.startsWith(c))
  if (!code) return e164
  const rest = d.slice(code.length).replace(/(\d{3})(?=\d{3,})/g, '$1 ')
  return `+${code} ${rest}`
}

/** Labels for the country-code picker. ISO codes rather than country
 * names, so the picker reads the same in Sinhala, Tamil and English. */
export const COUNTRY_OPTIONS: { code: (typeof ALLOWED_COUNTRY_CODES)[number]; label: string }[] = [
  { code: '94', label: 'LK +94' },
  { code: '971', label: 'AE +971' },
  { code: '966', label: 'SA +966' },
  { code: '974', label: 'QA +974' },
  { code: '965', label: 'KW +965' },
  { code: '968', label: 'OM +968' },
  { code: '973', label: 'BH +973' },
  { code: '44', label: 'GB +44' },
  { code: '61', label: 'AU +61' },
  { code: '39', label: 'IT +39' },
  { code: '1', label: 'US/CA +1' },
]

export type PhoneProblem = 'srilankaMobile' | 'tooShort' | 'country'

/** Country picker + typed local number → full digits, or why it won't work.
 * A pasted "+94 77…" or "0094 77…" wins over the picker. A typed trunk "0"
 * (077…, 07700…) is dropped, except for Italy, where it's part of the number. */
export function buildPhone(countryCode: string, typed: string): { digits: string; problem: PhoneProblem | null } {
  const trimmed = typed.trim()
  let digits: string
  if (trimmed.startsWith('+') || trimmed.startsWith('00')) {
    digits = normalizePhone(trimmed)
  } else {
    let local = normalizePhone(trimmed)
    if (countryCode !== '39') local = local.replace(/^0+/, '')
    digits = countryCode + local
  }
  if (!isAllowedCountry(digits)) return { digits, problem: 'country' }
  if (isSriLankan(digits) && !isSriLankanMobile(digits)) {
    return { digits, problem: digits.length < 11 ? 'tooShort' : 'srilankaMobile' }
  }
  if (!/^[1-9]\d{7,14}$/.test(digits)) return { digits, problem: 'tooShort' }
  return { digits, problem: null }
}
