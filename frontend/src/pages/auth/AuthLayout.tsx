import type { ReactNode } from "react"
import { useTranslation } from "react-i18next"
import { Link } from "react-router-dom"

export function AuthLayout({ children }: { children: ReactNode }) {
  const { t } = useTranslation()

  return (
    <div className="flex min-h-svh flex-col bg-brand-50">
      <header className="px-4 py-5 sm:px-6">
        <Link to="/" className="text-xl font-bold text-brand-700">
          {t("common.appName")}
        </Link>
      </header>
      <main className="flex flex-1 items-start justify-center px-4 pb-10 sm:items-center">
        <div className="w-full max-w-sm rounded-2xl border border-gray-100 bg-white p-6 shadow-sm sm:p-8">
          {children}
        </div>
      </main>
    </div>
  )
}
