import { useState } from "react"
import { useTranslation } from "react-i18next"
import { Link } from "react-router-dom"
import { Menu, X } from "lucide-react"

import { buttonClasses } from "@/components/Button"
import { LanguageSwitcher } from "@/components/LanguageSwitcher"

const NAV_LINKS = [
  { href: "#how", key: "how" },
  { href: "#privacy", key: "privacy" },
  { href: "#faq", key: "faq" },
] as const

export function Header() {
  const { t } = useTranslation()
  const [open, setOpen] = useState(false)

  return (
    <header className="sticky top-0 z-50 border-b border-gray-100 bg-white/90 backdrop-blur">
      <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-3 sm:px-6">
        <a href="#top" className="text-xl font-bold text-brand-700">
          {t("common.appName")}
        </a>

        <nav className="hidden items-center gap-6 md:flex">
          {NAV_LINKS.map((link) => (
            <a key={link.key} href={link.href} className="text-sm font-medium text-gray-600 hover:text-brand-700">
              {t(`landing.nav.${link.key}`)}
            </a>
          ))}
        </nav>

        <div className="hidden items-center gap-3 md:flex">
          <LanguageSwitcher />
          <Link to="/login" className="text-sm font-medium text-gray-600 hover:text-brand-700">
            {t("landing.nav.login")}
          </Link>
          <Link to="/login" className={buttonClasses("primary", "sm")}>
            {t("landing.nav.getStarted")}
          </Link>
        </div>

        <button
          type="button"
          className="rounded-lg p-2 text-gray-600 hover:bg-gray-100 md:hidden"
          aria-label={t("common.add")}
          aria-expanded={open}
          onClick={() => setOpen((v) => !v)}
        >
          {open ? <X size={22} /> : <Menu size={22} />}
        </button>
      </div>

      {open && (
        <div className="border-t border-gray-100 bg-white px-4 py-4 md:hidden">
          <nav className="flex flex-col gap-4">
            {NAV_LINKS.map((link) => (
              <a
                key={link.key}
                href={link.href}
                className="text-base font-medium text-gray-700"
                onClick={() => setOpen(false)}
              >
                {t(`landing.nav.${link.key}`)}
              </a>
            ))}
            <div className="flex items-center justify-between pt-2">
              <LanguageSwitcher />
              <Link to="/login" className="text-sm font-medium text-gray-600">
                {t("landing.nav.login")}
              </Link>
            </div>
            <Link to="/login" className={buttonClasses("primary", "md", "w-full")} onClick={() => setOpen(false)}>
              {t("landing.nav.getStarted")}
            </Link>
          </nav>
        </div>
      )}
    </header>
  )
}
