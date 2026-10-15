import { AlertTriangle } from "lucide-react"
import { useTranslation } from "react-i18next"

import { Section } from "@/components/Section"
import { Switch } from "@/components/Switch"
import { useCriticalAlertMutations } from "@/hooks/usePerson"
import { ALERT_CODES, LIMITS, type CriticalAlert } from "@/types/database"

export function CriticalAlertsSection({
  personId,
  alerts,
}: {
  personId: string
  alerts: CriticalAlert[]
}) {
  const { t } = useTranslation()
  const { insert, update, remove } = useCriticalAlertMutations(personId)

  function findAlert(code: string) {
    return alerts.find((alert) => alert.code === code)
  }

  function toggleCode(code: CriticalAlert["code"], existing: CriticalAlert | undefined) {
    if (existing) {
      remove.mutate(existing.id)
    } else {
      insert.mutate({ code, note: null, show_on_scan: true })
    }
  }

  return (
    <Section
      id="alerts"
      title={t("profile.criticalAlerts.title")}
      subtitle={t("profile.criticalAlerts.subtitle")}
    >
      <div className="flex flex-col gap-2">
        {ALERT_CODES.map((code) => {
          const existing = findAlert(code)
          const isSelected = Boolean(existing)
          return (
            <div
              key={code}
              className={`rounded-xl border px-4 py-3 transition-colors ${
                isSelected ? "border-danger-200 bg-danger-50/40" : "border-gray-100"
              }`}
            >
              <label className="flex cursor-pointer items-center gap-3">
                <input
                  type="checkbox"
                  checked={isSelected}
                  onChange={() => toggleCode(code, existing)}
                  className="h-5 w-5 shrink-0 accent-danger-600"
                />
                {isSelected && <AlertTriangle size={18} className="shrink-0 text-danger-600" />}
                <span className="font-medium text-gray-900">{t(`enums.alertCode.${code}`)}</span>
              </label>

              {existing && (
                <div className="mt-3 flex items-center gap-3 pl-8">
                  <input
                    type="text"
                    defaultValue={existing.note ?? ""}
                    maxLength={LIMITS.criticalAlertNote}
                    placeholder={t("profile.criticalAlerts.notePlaceholder")}
                    onBlur={(e) => update.mutate({ id: existing.id, patch: { note: e.target.value.trim() || null } })}
                    className="flex-1 rounded-xl border border-gray-200 px-3 py-2 text-sm focus:border-brand-500 focus:outline-none"
                  />
                  <Switch
                    checked={existing.show_on_scan}
                    onChange={(next) => update.mutate({ id: existing.id, patch: { show_on_scan: next } })}
                    label={t("common.showOnScan")}
                  />
                </div>
              )}
            </div>
          )
        })}
      </div>
    </Section>
  )
}
