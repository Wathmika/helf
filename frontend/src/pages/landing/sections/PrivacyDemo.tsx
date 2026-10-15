import { useState } from "react"
import { useTranslation } from "react-i18next"
import { Phone, Siren } from "lucide-react"

import { buttonClasses } from "@/components/Button"
import { Switch } from "@/components/Switch"

const FIELD_KEYS = ["bloodGroup", "allergies", "medicines", "contact", "homeArea"] as const
type FieldKey = (typeof FIELD_KEYS)[number]

const DEFAULT_VISIBLE: Record<FieldKey, boolean> = {
  bloodGroup: true,
  allergies: true,
  medicines: false,
  contact: true,
  homeArea: true,
}

export function PrivacyDemo() {
  const { t } = useTranslation()
  const [visible, setVisible] = useState(DEFAULT_VISIBLE)

  return (
    <section id="privacy" className="bg-brand-900 py-16 text-white sm:py-24">
      <div className="mx-auto max-w-6xl px-4 sm:px-6">
        <div className="mx-auto max-w-2xl text-center">
          <h2 className="text-2xl font-bold sm:text-3xl">{t("landing.privacyDemo.title")}</h2>
          <p className="mt-3 text-brand-100">{t("landing.privacyDemo.subtitle")}</p>
        </div>

        <div className="mt-12 grid gap-8 lg:grid-cols-2">
          <div className="rounded-2xl bg-white/5 p-6">
            <ul className="divide-y divide-white/10">
              {FIELD_KEYS.map((key) => (
                <li key={key} className="flex items-center justify-between gap-4 py-4">
                  <div>
                    <p className="font-medium">{t(`landing.privacyDemo.fields.${key}.label`)}</p>
                    <p className="text-sm text-brand-100">{t(`landing.privacyDemo.fields.${key}.value`)}</p>
                    {key === "medicines" && (
                      <p className="mt-1 text-xs text-brand-200">{t("landing.privacyDemo.medicinesHint")}</p>
                    )}
                  </div>
                  <Switch
                    checked={visible[key]}
                    onChange={(next) => setVisible((prev) => ({ ...prev, [key]: next }))}
                    label={t(`landing.privacyDemo.fields.${key}.label`)}
                  />
                </li>
              ))}
            </ul>
          </div>

          <div>
            <p className="mb-2 text-sm font-semibold uppercase tracking-wide text-brand-200">
              {t("landing.privacyDemo.previewLabel")}
            </p>
            <div className="rounded-2xl bg-white p-6 text-gray-900 shadow-xl">
              <p className="text-lg font-semibold">{t("landing.privacyDemo.sampleName")}</p>

              <dl className="mt-4 space-y-3">
                {FIELD_KEYS.filter((key) => visible[key]).map((key) => (
                  <div key={key} className="flex justify-between border-b border-gray-100 pb-2 text-sm">
                    <dt className="text-gray-500">{t(`landing.privacyDemo.fields.${key}.label`)}</dt>
                    <dd className="font-medium text-gray-900">{t(`landing.privacyDemo.fields.${key}.value`)}</dd>
                  </div>
                ))}
                {FIELD_KEYS.every((key) => !visible[key]) && (
                  <p className="text-sm text-gray-400">—</p>
                )}
              </dl>

              <div className="mt-6 flex flex-col gap-2 sm:flex-row">
                <button type="button" className={buttonClasses("secondary", "md", "flex-1")} disabled>
                  <Phone size={16} />
                  {t("landing.privacyDemo.callContact")}
                </button>
                <button type="button" className={buttonClasses("danger", "md", "flex-1")} disabled>
                  <Siren size={16} />
                  {t("landing.privacyDemo.callAmbulance")}
                </button>
              </div>
            </div>
            <p className="mt-4 text-sm text-brand-100">{t("landing.privacyDemo.footnote")}</p>
          </div>
        </div>
      </div>
    </section>
  )
}
