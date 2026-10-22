import { useTranslation } from "react-i18next"
import { ShieldCheck, Smartphone, Truck } from "lucide-react"

const STEPS = [
  { key: "step1", Icon: Smartphone, FootIcon: Smartphone },
  { key: "step2", Icon: ShieldCheck, FootIcon: ShieldCheck },
  { key: "step3", Icon: Truck, FootIcon: Truck },
] as const

export function HowItWorks() {
  const { t } = useTranslation()

  return (
    <section id="how" className="mx-auto max-w-6xl px-4 py-16 sm:px-6 sm:py-24">
      <div className="mx-auto max-w-2xl text-center">
        <p className="text-xs font-semibold uppercase tracking-widest text-brand-600">{t("landing.how.eyebrow")}</p>
        <h2 className="mt-3 text-2xl font-bold text-gray-900 sm:text-3xl">{t("landing.how.title")}</h2>
        <p className="mt-3 text-gray-600">{t("landing.how.subtitle")}</p>
      </div>

      <div className="mt-12 grid gap-6 sm:grid-cols-3">
        {STEPS.map(({ key, FootIcon }, index) => (
          <div key={key} className="rounded-2xl border border-gray-100 bg-white p-6 shadow-sm">
            <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-brand-700 text-sm font-bold text-white">
              0{index + 1}
            </div>
            <h3 className="mt-4 text-lg font-semibold text-gray-900">{t(`landing.how.${key}Title`)}</h3>
            <p className="mt-2 text-sm text-gray-600">{t(`landing.how.${key}Body`)}</p>
            <p className="mt-4 flex items-center gap-1.5 text-xs font-medium text-brand-700">
              <FootIcon size={14} />
              {t(`landing.how.${key}Foot`)}
            </p>
          </div>
        ))}
      </div>
    </section>
  )
}
