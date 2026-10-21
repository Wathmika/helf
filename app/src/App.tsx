import { BrowserRouter, Routes, Route } from 'react-router-dom'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { ConfigBanner } from './components/ConfigBanner'
import { AppShell } from './components/AppShell'
import { RequireAuth } from './components/RequireAuth'
import { SessionProvider } from './lib/session'
import { PhoneEntry } from './pages/auth/PhoneEntry'
import { EmailEntry } from './pages/auth/EmailEntry'
import { OtpEntry } from './pages/auth/OtpEntry'
import { Welcome } from './pages/auth/Welcome'
import { ProfilesList } from './pages/profiles/ProfilesList'
import { NewProfile } from './pages/profiles/NewProfile'
import { InviteEntry } from './pages/profiles/InviteEntry'
import { PersonDetail } from './pages/person/PersonDetail'
import { PersonQr } from './pages/person/PersonQr'
import { Account } from './pages/account/Account'

const queryClient = new QueryClient()

export default function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <SessionProvider>
        <BrowserRouter>
          <ConfigBanner />
          <Routes>
            <Route path="/login" element={<PhoneEntry />} />
            <Route path="/login/email" element={<EmailEntry />} />
            <Route path="/login/otp" element={<OtpEntry />} />
            <Route path="/login/welcome" element={<Welcome />} />

            <Route element={<RequireAuth />}>
              <Route element={<AppShell />}>
                <Route path="/" element={<ProfilesList />} />
                <Route path="/profiles/new" element={<NewProfile />} />
                <Route path="/invite" element={<InviteEntry />} />
                <Route path="/person/:personId" element={<PersonDetail />} />
                <Route path="/person/:personId/qr" element={<PersonQr />} />
                <Route path="/account" element={<Account />} />
              </Route>
            </Route>
          </Routes>
        </BrowserRouter>
      </SessionProvider>
    </QueryClientProvider>
  )
}
