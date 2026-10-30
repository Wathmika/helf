import { lazy, Suspense } from 'react'
import { BrowserRouter, Navigate, Routes, Route } from 'react-router-dom'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { ConfigBanner } from './components/ConfigBanner'
import { AppShell } from './components/AppShell'
import { GuestOnly } from './components/GuestOnly'
import { RequireAuth } from './components/RequireAuth'
import { SessionProvider } from './lib/session'
import { PhoneEntry } from './pages/auth/PhoneEntry'
import { EmailEntry } from './pages/auth/EmailEntry'
import { OtpEntry } from './pages/auth/OtpEntry'
import { Welcome } from './pages/auth/Welcome'
import { ProfilesList } from './pages/profiles/ProfilesList'
import { NewProfile } from './pages/profiles/NewProfile'
import { InviteEntry } from './pages/profiles/InviteEntry'
import { Account } from './pages/account/Account'

/*
  One website (helf.lk):
  - /            the public home page (src/site)
  - /login…      sign in by phone or email code
  - /dashboard…  everything after signing in
  The live scan page, /s/{token}, is not part of this build: it's served by
  the backend, so the host (CloudFront) must send /s/* there.

  The public page and the two biggest dashboard screens load on demand, so
  a phone on a weak connection only downloads the part it opens.
*/
const Home = lazy(() => import('./site/Home').then((m) => ({ default: m.Home })))
const PersonDetail = lazy(() => import('./pages/person/PersonDetail').then((m) => ({ default: m.PersonDetail })))
const PersonQr = lazy(() => import('./pages/person/PersonQr').then((m) => ({ default: m.PersonQr })))

const queryClient = new QueryClient()

export default function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <SessionProvider>
        <BrowserRouter>
          <ConfigBanner />
          <Suspense fallback={null}>
            <Routes>
              <Route path="/" element={<Home />} />

              <Route element={<GuestOnly />}>
                <Route path="/login" element={<PhoneEntry />} />
                <Route path="/login/email" element={<EmailEntry />} />
              </Route>
              <Route path="/login/otp" element={<OtpEntry />} />
              <Route path="/login/welcome" element={<Welcome />} />

              <Route element={<RequireAuth />}>
                <Route path="/dashboard" element={<AppShell />}>
                  <Route index element={<ProfilesList />} />
                  <Route path="profiles/new" element={<NewProfile />} />
                  <Route path="invite" element={<InviteEntry />} />
                  <Route path="person/:personId" element={<PersonDetail />} />
                  <Route path="person/:personId/qr" element={<PersonQr />} />
                  <Route path="account" element={<Account />} />
                </Route>
              </Route>

              <Route path="*" element={<Navigate to="/" replace />} />
            </Routes>
          </Suspense>
        </BrowserRouter>
      </SessionProvider>
    </QueryClientProvider>
  )
}
