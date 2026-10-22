import { Navigate, Route, Routes } from "react-router-dom"

import { RequireAuth, RequireOnboarded } from "@/auth/ProtectedRoute"
import { AppShell } from "@/components/AppShell"
import { AccountScreen } from "@/pages/account/AccountScreen"
import { LoginEntry } from "@/pages/auth/LoginEntry"
import { OtpEntry } from "@/pages/auth/OtpEntry"
import { WelcomeSetup } from "@/pages/auth/WelcomeSetup"
import { ProfilesList } from "@/pages/dashboard/ProfilesList"
import { LandingPage } from "@/pages/landing/LandingPage"
import { ProfileEditor } from "@/pages/profile/ProfileEditor"
import { QrCodesScreen } from "@/pages/qr/QrCodesScreen"
import { InvitesScreen } from "@/pages/sharing/InvitesScreen"
import { JoinByCodeScreen } from "@/pages/sharing/JoinByCodeScreen"

export function App() {
  return (
    <Routes>
      <Route path="/" element={<LandingPage />} />
      <Route path="/login" element={<LoginEntry />} />
      <Route path="/login/verify" element={<OtpEntry />} />

      <Route element={<RequireAuth />}>
        <Route path="/welcome" element={<WelcomeSetup />} />

        <Route element={<RequireOnboarded />}>
          <Route path="/app" element={<AppShell />}>
            <Route index element={<ProfilesList />} />
            <Route path="join" element={<JoinByCodeScreen />} />
            <Route path="profiles/:personId" element={<ProfileEditor />} />
            <Route path="profiles/:personId/qr" element={<QrCodesScreen />} />
            <Route path="profiles/:personId/share" element={<InvitesScreen />} />
            <Route path="account" element={<AccountScreen />} />
          </Route>
        </Route>
      </Route>

      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  )
}
