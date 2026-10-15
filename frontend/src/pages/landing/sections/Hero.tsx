import { useTranslation } from "react-i18next"
import { Link } from "react-router-dom"
import { QrCode, ShieldCheck } from "lucide-react"

import { buttonClasses } from "@/components/Button"

export function Hero() {
  const { t } = useTranslation()

  return (
    <section id="top" className="overflow-hidden bg-gradient-to-b from-brand-50 to-white">
      <div className="mx-auto grid max-w-6xl items-center gap-10 px-4 py-12 sm:px-6 sm:py-20 lg:grid-cols-2">
        <div>
          <p className="mb-3 text-sm font-semibold uppercase tracking-wide text-brand-700">
            {t("landing.hero.eyebrow")}
          </p>
          <h1 className="text-3xl font-bold leading-tight text-gray-900 sm:text-4xl lg:text-5xl">
            {t("landing.hero.title")}
          </h1>
          <p className="mt-5 text-lg text-gray-600">{t("landing.hero.subtitle")}</p>

          <div className="mt-8 flex flex-col gap-3 sm:flex-row">
            <Link to="/login" className={buttonClasses("primary", "lg")}>
              {t("landing.hero.ctaPrimary")}
            </Link>
            <a href="#how" className={buttonClasses("outline", "lg")}>
              {t("landing.hero.ctaSecondary")}
            </a>
          </div>

          <div className="mt-6 flex items-center gap-2 text-sm text-gray-500">
            <ShieldCheck size={18} className="text-brand-600" />
            <span>{t("landing.hero.trustLine")}</span>
          </div>
        </div>

        <div className="relative mx-auto flex w-full max-w-sm items-center justify-center">
          <div className="absolute inset-0 -z-10 rounded-full bg-brand-100 blur-3xl" />
          <div className="w-full rounded-3xl border border-gray-100 bg-white p-6 shadow-xl">
            <div className="flex items-center justify-between border-b border-gray-100 pb-4">
              <div>
                <p className="text-sm font-semibold text-gray-900">Kumari Silva</p>
                <p className="text-xs text-gray-500">68 · O+</p>
              </div>
              <div className="rounded-full bg-brand-50 p-2 text-brand-700">
                <QrCode size={28} />
              </div>
            </div>
            <div className="mt-4 space-y-2 text-sm">
              <div className="flex items-center justify-between rounded-lg bg-danger-50 px-3 py-2 text-danger-700">
                <span>Penicillin — severe</span>
              </div>
              <div className="flex items-center justify-between rounded-lg bg-gray-50 px-3 py-2 text-gray-700">
                <span>Nadeesha (daughter)</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}
