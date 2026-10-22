import type { ReactNode } from "react"
import { useTranslation } from "react-i18next"

import { Switch } from "@/components/Switch"

interface ToggleRowProps {
  label: string
  checked: boolean
  onChange: (next: boolean) => void
  children: ReactNode
  disabled?: boolean
  hint?: string
}

/**
 * Pairs a field's control with its own "show on scan" switch — the core trust
 * pattern repeated throughout the editor (basic info, alerts, allergies, etc).
 */
export function ToggleRow({ label, checked, onChange, children, disabled, hint }: ToggleRowProps) {
  const { t } = useTranslation()

  return (
    <div className="flex items-start gap-3 py-3">
      <div className="min-w-0 flex-1">
        <label className="mb-1.5 block text-sm font-medium text-gray-700">{label}</label>
        {children}
        {hint && <p className="mt-1 text-xs text-gray-400">{hint}</p>}
      </div>
      <div className="flex shrink-0 flex-col items-center gap-1 pt-6">
        <Switch checked={checked} onChange={onChange} disabled={disabled} label={t("common.showOnScan")} />
        <span className="text-[11px] text-gray-400">{t("common.showOnScan")}</span>
      </div>
    </div>
  )
}
