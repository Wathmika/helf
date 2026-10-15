/**
 * Email is an independent, passwordless sign-in method alongside phone OTP
 * (see auth/phoneRules.ts). Supabase Auth validates the address again
 * server-side — this is just a friendly client-side check before we send.
 */

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

export function isValidEmail(value: string): boolean {
  return EMAIL_RE.test(value.trim())
}

/** 'nadeesha@example.com' -> 'na***@example.com' */
export function maskEmail(email: string): string {
  const [local, domain] = email.split("@")
  if (!local || !domain) return email
  const visible = local.slice(0, Math.min(2, local.length))
  return `${visible}***@${domain}`
}
