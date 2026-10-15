import { useTranslation } from "react-i18next"
import { Link } from "react-router-dom"
import { Phone } from "lucide-react"

import { buttonClasses } from "@/components/Button"
import { LanguageSwitcher } from "@/components/LanguageSwitcher"

const PRODUCT_LINKS = [
  { href: "#how", key: "how" },
  { href: "#privacy", key: "privacy" },
  { href: "#pricing", key: "pricing" },
  { href: "#faq", key: "faq" },
] as const

export function Footer() {
  const { t } = useTranslation()
  const year = new Date().getFullYear()

  return (
    <footer className="bg-brand-900 text-brand-50">
      <div className="mx-auto max-w-6xl px-4 py-16 sm:px-6">
        <div className="grid gap-12 lg:grid-cols-[1.3fr_1fr_1fr_1.1fr]">
          <div>
            <span className="text-xl font-bold text-white">{t("common.appName")}</span>
            <p className="mt-3 max-w-xs text-sm text-brand-200">{t("landing.footer.tagline")}</p>
            <div className="mt-6">
              <LanguageSwitcher />
            </div>
          </div>

          <div>
            <p className="text-xs font-semibold uppercase tracking-widest text-brand-300">{t("landing.footer.product")}</p>
            <ul className="mt-4 space-y-3">
              {PRODUCT_LINKS.map((link) => (
                <li key={link.key}>
                  <a href={link.href} className="text-sm text-brand-100 hover:text-white">
                    {t(`landing.nav.${link.key}`)}
                  </a>
                </li>
              ))}
            </ul>
          </div>

          <div>
            <p className="text-xs font-semibold uppercase tracking-widest text-brand-300">
              {t("landing.footer.getStartedHeading")}
            </p>
            <ul className="mt-4 space-y-3">
              <li>
                <Link to="/login" className="text-sm text-brand-100 hover:text-white">
                  {t("landing.nav.login")}
                </Link>
              </li>
              <li>
                <Link to="/login" className="text-sm text-brand-100 hover:text-white">
                  {t("landing.nav.getStarted")}
                </Link>
              </li>
            </ul>
            <Link to="/login" className={`${buttonClasses("primary", "sm")} mt-5`}>
              {t("landing.nav.getStarted")}
            </Link>
          </div>

          <div className="rounded-2xl bg-white/5 p-5">
            <div className="flex items-center gap-2 text-brand-200">
              <Phone size={18} />
              <p className="text-xs font-semibold uppercase tracking-widest">{t("landing.footer.emergencyTitle")}</p>
            </div>
            <p className="mt-3 text-3xl font-bold text-white">1990</p>
            <p className="mt-2 text-sm text-brand-200">{t("landing.footer.emergencyBody")}</p>
          </div>
        </div>

        <div className="mt-14 flex flex-col-reverse items-center justify-between gap-4 border-t border-white/10 pt-8 sm:flex-row">
          <p className="text-xs text-brand-300">
            © {year} {t("common.appName")}. {t("landing.footer.rightsReserved")}
          </p>
          <p className="max-w-xl text-center text-xs text-brand-300 sm:text-right">{t("landing.footer.disclaimer")}</p>
        </div>
      </div>
    </footer>
  )
}
