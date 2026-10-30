import type { AuthError } from '@supabase/supabase-js'

/** Maps a Supabase Auth error to one of the auth.* message keys. Supabase
 * says "Token has expired or is invalid" for both cases, so a bad and an
 * expired code share one message. The SMS hook rejects disallowed
 * countries before sending (backend/src/app/routes/hooks.py). */
export function authErrorKey(error: AuthError): string {
  const code = (error.code ?? '').toLowerCase()
  const message = error.message.toLowerCase()
  if (error.status === 429 || code.includes('rate_limit')) return 'auth.errorRateLimited'
  if (code === 'otp_expired' || message.includes('expired') || message.includes('invalid')) return 'auth.errorInvalidCode'
  if (message.includes('country')) return 'auth.errorDisallowedCountry'
  if (message.includes('mobile number')) return 'auth.errorSriLankaMobile'
  // Supabase couldn't hand the code to its email or SMS sender ("Error
  // sending confirmation email" / "...sms"): a server-side problem, not the
  // person's connection.
  if (message.includes('error sending')) return 'auth.errorSendFailed'
  return 'auth.errorGeneric'
}
