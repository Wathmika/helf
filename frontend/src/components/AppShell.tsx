import { Link, NavLink, Outlet, useNavigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { useQueryClient } from '@tanstack/react-query'
import { LogOut, Plus, UserRound, Users } from 'lucide-react'
import { HelfLockup } from './Logo'
import { LanguageSwitch } from './LanguageSwitch'
import { supabase } from '../lib/supabase'
import { initialOf, useAppUser } from '../lib/user'

/** Shell for signed-in screens ("open plane": the sidebar sits on the white
 * page behind one hairline, no top bar on desktop).
 * Desktop (md+): logo, nav with a neutral grey pill for the current screen,
 * and the language switch and signed-in person at the foot. Each screen's
 * main action lives in its own title row, not here.
 * Mobile: a slim top bar and a bottom tab bar with "Add" in the middle. */
export function AppShell() {
  const { t } = useTranslation()
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const { data: user } = useAppUser()
  const name = user?.displayName ?? t('nav.you')

  async function signOut() {
    if (supabase) await supabase.auth.signOut()
    queryClient.clear()
    navigate('/login')
  }

  const sideItem = ({ isActive }: { isActive: boolean }) =>
    `flex items-center gap-2.5 h-10 px-3 rounded-[10px] text-[15px] font-semibold transition-colors ${
      isActive ? 'bg-[var(--active)] text-[var(--text)]' : 'text-[var(--muted)] hover:text-[var(--text)] hover:bg-[var(--panel)]'
    }`

  const tab = ({ isActive }: { isActive: boolean }) =>
    `flex-1 flex flex-col items-center justify-center gap-1 h-16 text-[12px] font-bold transition-colors ${
      isActive ? 'text-[var(--text)]' : 'text-[var(--muted)]'
    }`

  return (
    <div className="min-h-screen">
      <aside className="hidden md:flex fixed inset-y-0 left-0 w-[240px] flex-col bg-[var(--ground)] border-r border-[var(--rule)] px-3 py-6">
        <Link to="/dashboard" className="flex items-center h-11 px-3" aria-label="helf.lk">
          <HelfLockup className="text-[22px]" />
        </Link>

        <nav className="mt-8 flex flex-col gap-0.5">
          <NavLink to="/dashboard" end className={sideItem}>
            <Users size={17} strokeWidth={1.75} /> {t('nav.profiles')}
          </NavLink>
          <NavLink to="/dashboard/account" className={sideItem}>
            <UserRound size={17} strokeWidth={1.75} /> {t('nav.account')}
          </NavLink>
        </nav>

        <div className="mt-auto flex flex-col gap-3 px-1">
          <LanguageSwitch />
          <div className="flex items-center gap-3 pl-1 pt-3 border-t border-[var(--rule)]">
            <span className="w-9 h-9 rounded-full bg-[var(--accent-soft)] text-[var(--accent-ink)] font-extrabold text-[14px] flex items-center justify-center flex-none">
              {initialOf(user?.displayName)}
            </span>
            <span className="flex-1 min-w-0 text-[14px] font-bold truncate">{name}</span>
            <button
              type="button"
              onClick={signOut}
              aria-label={t('nav.signOut')}
              title={t('nav.signOut')}
              className="w-11 h-11 rounded-[10px] flex items-center justify-center text-[var(--muted)] hover:text-[var(--text)] hover:bg-[var(--panel)] transition-colors"
            >
              <LogOut size={18} />
            </button>
          </div>
        </div>
      </aside>

      <header className="md:hidden sticky top-0 z-30 bg-[var(--surface)] border-b border-[var(--rule)] h-14 px-4 flex items-center justify-between">
        <Link to="/dashboard" className="h-11 flex items-center" aria-label="helf.lk">
          <HelfLockup className="text-[19px]" />
        </Link>
        <Link
          to="/dashboard/account"
          aria-label={t('nav.account')}
          className="w-11 h-11 flex items-center justify-center"
        >
          <span className="w-9 h-9 rounded-full bg-[var(--accent-soft)] text-[var(--accent-ink)] font-extrabold text-[14px] flex items-center justify-center">
            {initialOf(user?.displayName)}
          </span>
        </Link>
      </header>

      <div className="md:pl-[240px]">
        <main className="pb-28 md:pb-14">
          <Outlet />
        </main>
      </div>

      <nav
        className="md:hidden fixed bottom-0 inset-x-0 z-30 bg-[var(--surface)] border-t border-[var(--rule)] flex items-stretch px-2"
        style={{ paddingBottom: 'env(safe-area-inset-bottom, 0px)' }}
      >
        <NavLink to="/dashboard" end className={tab}>
          <Users size={21} strokeWidth={1.75} /> {t('nav.profiles')}
        </NavLink>
        <NavLink to="/dashboard/profiles/new" aria-label={t('profiles.addProfile')} className="flex-1 flex items-center justify-center h-16">
          <span className="h-11 px-4 rounded-full bg-[var(--deep)] text-white text-[13px] font-bold flex items-center gap-1.5 transition-transform active:scale-[0.97]">
            <Plus size={18} strokeWidth={2.5} /> {t('nav.add')}
          </span>
        </NavLink>
        <NavLink to="/dashboard/account" className={tab}>
          <UserRound size={21} strokeWidth={1.75} /> {t('nav.account')}
        </NavLink>
      </nav>
    </div>
  )
}
