import { useState } from "react"
import { useTranslation } from "react-i18next"
import { Plus } from "lucide-react"

const QUESTION_KEYS = ["q1", "q2", "q3", "q4", "q5", "q6"] as const

export function Faq() {
  const { t } = useTranslation()
  const [openKey, setOpenKey] = useState<string | null>("q1")

  return (
    <section id="faq" className="mx-auto max-w-6xl px-4 py-16 sm:px-6 sm:py-24">
      <div className="grid gap-10 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.4fr)] lg:gap-16">
        <div className="lg:sticky lg:top-24 lg:self-start">
          <p className="text-xs font-semibold uppercase tracking-widest text-brand-600">{t("landing.faq.eyebrow")}</p>
          <h2 className="mt-3 text-3xl font-bold leading-tight text-gray-900 sm:text-4xl">
            {t("landing.faq.heading")}
          </h2>
        </div>

        <div className="border-t border-gray-200">
          {QUESTION_KEYS.map((key) => {
            const isOpen = openKey === key
            return (
              <div key={key} className="border-b border-gray-200 py-5">
                <button
                  type="button"
                  className="flex w-full items-center justify-between gap-4 text-left"
                  aria-expanded={isOpen}
                  onClick={() => setOpenKey(isOpen ? null : key)}
                >
                  <span className="text-base font-medium text-gray-900">{t(`landing.faq.${key}.q`)}</span>
                  <Plus
                    size={20}
                    className={`shrink-0 text-gray-400 transition-transform duration-200 ${isOpen ? "rotate-45" : ""}`}
                  />
                </button>
                {isOpen && <p className="mt-3 pr-8 text-sm text-gray-600">{t(`landing.faq.${key}.a`)}</p>}
              </div>
            )
          })}
        </div>
      </div>
    </section>
  )
}
