import { Navigate, Outlet } from 'react-router-dom'
import { useSession } from '../lib/session'
import { isSupabaseConfigured } from '../lib/supabase'

export function RequireAuth() {
  const { session, loading } = useSession()

  // Without Supabase configured there's no real session to check — let the
  // authenticated shell render anyway so screens can be built/reviewed.
  if (!isSupabaseConfigured) return <Outlet />

  if (loading) return null
  if (!session) return <Navigate to="/login" replace />
  return <Outlet />
}
