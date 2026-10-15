import { Navigate, Outlet, useLocation } from "react-router-dom"

import { useAuth } from "@/auth/AuthContext"
import { Spinner } from "@/components/Spinner"

/** Blocks unauthenticated visitors from everything under /app. */
export function RequireAuth() {
  const { session, loading } = useAuth()
  const location = useLocation()

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <Spinner />
      </div>
    )
  }

  if (!session) {
    return <Navigate to="/login" state={{ from: location }} replace />
  }

  return <Outlet />
}

/**
 * Sits inside RequireAuth. Sends first-ever logins to the name/language setup
 * step before they can reach the rest of the app.
 */
export function RequireOnboarded() {
  const { appUser, appUserLoading } = useAuth()

  if (appUserLoading && !appUser) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <Spinner />
      </div>
    )
  }

  if (appUser && !appUser.display_name) {
    return <Navigate to="/welcome" replace />
  }

  return <Outlet />
}
