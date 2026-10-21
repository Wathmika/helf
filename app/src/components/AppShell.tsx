import { NavLink, Outlet } from 'react-router-dom'
import { useTranslation } from 'react-i18next'

function UsersIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-[22px] h-[22px]">
      <rect x="3" y="4" width="18" height="16" rx="3" />
      <path d="M8 2v4M16 2v4" />
    </svg>
  )
}

function UserIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-[22px] h-[22px]">
      <circle cx="12" cy="8" r="4" />
      <path d="M4 21c0-4 4-6 8-6s8 2 8 6" />
    </svg>
  )
}

const SIDEBAR_WIDTH = 240

/** Top-level shell for authenticated routes.
 * Mobile (< md): a bottom tab bar (Profiles / Account).
 * Desktop (>= md): a labelled 240px sidebar, per docs/frontend-features.md
 * §1 ("bottom tab bar on mobile, sidebar on wider screens") and the
 * app-screens style's sidebar rules (grey-pill active state, product mark
 * and name at the top). The content area is never just a stretched phone
 * column — each page centres its own width inside what's left. */
export function AppShell() {
  const { t } = useTranslation()

  const mobileTabClass = ({ isActive }: { isActive: boolean }) =>
    `flex-1 flex flex-col items-center justify-center gap-1 text-[11px] font-semibold pt-2 pb-3.5 ${
      isActive ? 'text-[var(--accent)]' : 'text-[var(--muted)]'
    }`

  const sidebarItemClass = ({ isActive }: { isActive: boolean }) =>
    `flex items-center gap-3 h-10 px-3 rounded-[10px] text-[14px] font-medium ${
      isActive ? 'bg-[var(--raised)] text-[var(--text)]' : 'text-[var(--muted)] hover:text-[var(--text)]'
    }`

  return (
    <div className="min-h-screen">
      <aside
        className="hidden md:flex md:flex-col fixed left-0 top-0 bottom-0 border-r border-[var(--rule)] bg-[var(--ground)] px-3 py-5"
        style={{ width: SIDEBAR_WIDTH }}
      >
        <div className="flex items-center gap-2.5 px-2 mb-6">
          <div className="w-8 h-8 rounded-[9px] bg-[var(--accent)] text-white flex items-center justify-center font-extrabold text-sm">
            h
          </div>
          <span className="font-bold text-[16px]">{t('app.name')}</span>
        </div>

        <nav className="flex flex-col gap-1">
          <NavLink to="/" end className={sidebarItemClass}>
            <UsersIcon />
            {t('nav.profiles')}
          </NavLink>
          <NavLink to="/account" className={sidebarItemClass}>
            <UserIcon />
            {t('nav.account')}
          </NavLink>
        </nav>
      </aside>

      <div className="md:pl-[240px]">
        <main className="pb-20 md:pb-10 md:pt-6">
          <Outlet />
        </main>
      </div>

      <nav className="md:hidden fixed bottom-0 left-0 right-0 flex bg-[var(--surface)] border-t border-[var(--rule)]">
        <NavLink to="/" end className={mobileTabClass}>
          <UsersIcon />
          {t('nav.profiles')}
        </NavLink>
        <NavLink to="/account" className={mobileTabClass}>
          <UserIcon />
          {t('nav.account')}
        </NavLink>
      </nav>
    </div>
  )
}
