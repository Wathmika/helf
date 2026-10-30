import { Navigate, Outlet } from 'react-router-dom'
import { useSession } from '../lib/session'

/** For the sign-in screens: someone already signed in (say, tapping "Sign
 * in" on the home page again) goes straight to their dashboard. In demo
 * mode there is no session, so the screens always show. */
export function GuestOnly() {
  const { session, loading } = useSession()
  if (loading) return null
  if (session) return <Navigate to="/dashboard" replace />
  return <Outlet />
}
