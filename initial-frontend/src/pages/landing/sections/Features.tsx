import { useTranslation } from "react-i18next"
import { Bell, Globe, HeartHandshake, MapPinned, Pill, RotateCcw } from "lucide-react"

const FEATURE_KEYS = ["sharing", "lostPerson", "localMeds", "languages", "alerts", "revoke"] as const

const ICONS = {
  sharing: HeartHandshake,
  lostPerson: MapPinned,
  localMeds: Pill,
  languages: Globe,
  alerts: Bell,
  revoke: RotateCcw,
} as const

export function Features() {
  const { t } = useTranslation()

  return (
    <section className="mx-auto max-w-6xl px-4 py-16 sm:px-6 sm:py-24">
      <h2 className="mx-auto max-w-2xl text-center text-2xl font-bold text-gray-900 sm:text-3xl">
        {t("landing.features.title")}
      </h2>

      <div className="mt-12 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
        {FEATURE_KEYS.map((key) => {
          const Icon = ICONS[key]
          return (
            <div key={key} className="rounded-2xl border border-gray-100 p-6">
              <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-brand-50 text-brand-700">
                <Icon size={22} />
              </div>
              <h3 className="mt-4 font-semibold text-gray-900">{t(`landing.features.${key}.title`)}</h3>
              <p className="mt-2 text-sm text-gray-600">{t(`landing.features.${key}.body`)}</p>
            </div>
          )
        })}
      </div>
    </section>
  )
}
