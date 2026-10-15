import { LogOut, UserRound, Users } from "lucide-react"
import { useTranslation } from "react-i18next"
import { NavLink, Outlet } from "react-router-dom"

import { useAuth } from "@/auth/AuthContext"
import { LanguageSwitcher } from "@/components/LanguageSwitcher"

const NAV_ITEMS = [
  { to: "/app", end: true, key: "profiles", Icon: Users },
  { to: "/app/account", end: false, key: "account", Icon: UserRound },
] as const

export function AppShell() {
  const { t } = useTranslation()
  const { signOut } = useAuth()

  return (
    <div className="flex min-h-svh flex-col bg-gray-50 sm:flex-row">
      <aside className="no-print hidden w-60 shrink-0 flex-col border-r border-gray-100 bg-white sm:flex">
        <div className="px-6 py-5 text-xl font-bold text-brand-700">{t("common.appName")}</div>
        <nav className="flex flex-1 flex-col gap-1 px-3">
          {NAV_ITEMS.map(({ to, end, key, Icon }) => (
            <NavLink
              key={key}
              to={to}
              end={end}
              className={({ isActive }) =>
                `flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-colors ${
                  isActive ? "bg-brand-50 text-brand-700" : "text-gray-600 hover:bg-gray-100"
                }`
              }
            >
              <Icon size={20} />
              {t(`nav.${key}`)}
            </NavLink>
          ))}
        </nav>
        <div className="flex flex-col gap-3 border-t border-gray-100 px-3 py-4">
          <LanguageSwitcher className="self-start" />
          <button
            type="button"
            onClick={() => void signOut()}
            className="flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium text-gray-600 hover:bg-gray-100"
          >
            <LogOut size={20} />
            {t("nav.logout")}
          </button>
        </div>
      </aside>

      <div className="flex min-w-0 flex-1 flex-col">
        <main className="flex-1 pb-20 sm:pb-0">
          <Outlet />
        </main>

        <nav className="no-print fixed inset-x-0 bottom-0 z-40 flex border-t border-gray-100 bg-white sm:hidden">
          {NAV_ITEMS.map(({ to, end, key, Icon }) => (
            <NavLink
              key={key}
              to={to}
              end={end}
              className={({ isActive }) =>
                `flex flex-1 flex-col items-center gap-1 py-2.5 text-xs font-medium ${
                  isActive ? "text-brand-700" : "text-gray-500"
                }`
              }
            >
              <Icon size={22} />
              {t(`nav.${key}`)}
            </NavLink>
          ))}
        </nav>
      </div>
    </div>
  )
}
