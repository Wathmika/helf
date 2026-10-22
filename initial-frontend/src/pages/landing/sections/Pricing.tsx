import { useTranslation } from "react-i18next"
import { Building2, Check } from "lucide-react"

import { buttonClasses } from "@/components/Button"

type TierKey = "digital" | "card" | "sticker" | "family"

const TIERS: { key: TierKey; badge?: boolean; highlight?: boolean; dark?: boolean }[] = [
  { key: "digital" },
  { key: "card", badge: true, highlight: true },
  { key: "sticker" },
  { key: "family", dark: true },
]

const PAYMENT_METHODS = ["cod", "courier", "cards"] as const

export function Pricing() {
  const { t } = useTranslation()

  return (
    <section id="pricing" className="bg-gray-50 py-16 sm:py-24">
      <div className="mx-auto max-w-6xl px-4 sm:px-6">
        <div className="text-center">
          <p className="text-xs font-semibold uppercase tracking-widest text-brand-600">{t("landing.pricing.eyebrow")}</p>
          <h2 className="mx-auto mt-3 max-w-2xl text-3xl font-bold text-gray-900 sm:text-4xl">
            {t("landing.pricing.heading")}
          </h2>
          <p className="mx-auto mt-4 max-w-xl text-gray-600">{t("landing.pricing.subtitle")}</p>
        </div>

        <div className="mt-12 grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
          {TIERS.map((tier) => {
            const features = t(`landing.pricing.tiers.${tier.key}.features`, { returnObjects: true }) as string[]
            return (
              <div
                key={tier.key}
                className={`relative flex flex-col rounded-2xl border p-6 ${
                  tier.dark
                    ? "border-brand-700 bg-brand-700 text-white"
                    : tier.highlight
                      ? "border-brand-600 bg-white shadow-lg ring-1 ring-brand-600"
                      : "border-gray-200 bg-white"
                }`}
              >
                {tier.badge ? (
                  <span className="absolute -top-3 left-1/2 w-max -translate-x-1/2 rounded-full bg-brand-600 px-3 py-1 text-xs font-semibold text-white">
                    {t("landing.pricing.mostPopular")}
                  </span>
                ) : (
                  <span
                    className={`mb-2 w-max rounded-full px-2.5 py-1 text-[11px] font-semibold uppercase tracking-wide ${
                      tier.dark ? "bg-white/15 text-brand-50" : "bg-gray-100 text-gray-500"
                    }`}
                  >
                    {t(`landing.pricing.tiers.${tier.key}.eyebrow`)}
                  </span>
                )}

                <h3 className={`mt-2 text-lg font-bold ${tier.dark ? "text-white" : "text-gray-900"}`}>
                  {t(`landing.pricing.tiers.${tier.key}.title`)}
                </h3>

                <div className="mt-3 flex items-baseline gap-1.5">
                  <span className={`text-3xl font-bold ${tier.dark ? "text-white" : "text-gray-900"}`}>
                    {t(`landing.pricing.tiers.${tier.key}.price`)}
                  </span>
                  <span className={`text-sm ${tier.dark ? "text-brand-100" : "text-gray-400"}`}>
                    {t(`landing.pricing.tiers.${tier.key}.period`)}
                  </span>
                </div>

                <ul className="mt-5 flex-1 space-y-2.5">
                  {features.map((feature) => (
                    <li key={feature} className={`flex items-start gap-2 text-sm ${tier.dark ? "text-brand-50" : "text-gray-600"}`}>
                      <Check size={16} className={`mt-0.5 shrink-0 ${tier.dark ? "text-white" : "text-brand-600"}`} />
                      {feature}
                    </li>
                  ))}
                </ul>

                <button
                  type="button"
                  className={
                    tier.dark
                      ? "mt-6 w-full rounded-full bg-white px-5 py-2.5 text-sm font-semibold text-brand-700 hover:bg-brand-50"
                      : `mt-6 w-full ${buttonClasses(tier.highlight ? "primary" : "secondary", "md")}`
                  }
                >
                  {t(`landing.pricing.tiers.${tier.key}.cta`)}
                </button>
              </div>
            )
          })}
        </div>

        <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
          {PAYMENT_METHODS.map((key) => (
            <span key={key} className="rounded-full border border-gray-200 bg-white px-4 py-2 text-xs font-medium text-gray-600">
              {t(`landing.pricing.methods.${key}`)}
            </span>
          ))}
        </div>

        <div className="mt-6 flex flex-col items-center justify-between gap-4 rounded-2xl border border-gray-200 bg-white p-5 sm:flex-row">
          <div className="flex items-center gap-3">
            <span className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-brand-50 text-brand-700">
              <Building2 size={20} />
            </span>
            <div>
              <p className="font-semibold text-gray-900">{t("landing.pricing.groups.title")}</p>
              <p className="text-sm text-gray-500">{t("landing.pricing.groups.body")}</p>
            </div>
          </div>
          <button type="button" className={buttonClasses("secondary", "md")}>
            {t("landing.pricing.groups.cta")}
          </button>
        </div>
      </div>
    </section>
  )
}
