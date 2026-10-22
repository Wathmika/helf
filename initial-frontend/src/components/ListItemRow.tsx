import { Pencil, Trash2 } from "lucide-react"
import { useTranslation } from "react-i18next"

import { Switch } from "@/components/Switch"

interface ListItemRowProps {
  primary: string
  secondary?: string
  checked: boolean
  onToggle: (next: boolean) => void
  onEdit: () => void
  onDelete: () => void
  toggleDisabled?: boolean
}

export function ListItemRow({
  primary,
  secondary,
  checked,
  onToggle,
  onEdit,
  onDelete,
  toggleDisabled,
}: ListItemRowProps) {
  const { t } = useTranslation()

  return (
    <div className="flex items-center gap-3 rounded-xl border border-gray-100 px-4 py-3">
      <div className="min-w-0 flex-1">
        <p className="truncate font-medium text-gray-900">{primary}</p>
        {secondary && <p className="truncate text-sm text-gray-500">{secondary}</p>}
      </div>
      <Switch checked={checked} onChange={onToggle} disabled={toggleDisabled} label={t("common.showOnScan")} />
      <button
        type="button"
        onClick={onEdit}
        aria-label={t("common.edit")}
        className="rounded-full p-2 text-gray-400 hover:bg-gray-100 hover:text-gray-600"
      >
        <Pencil size={16} />
      </button>
      <button
        type="button"
        onClick={onDelete}
        aria-label={t("common.delete")}
        className="rounded-full p-2 text-gray-400 hover:bg-danger-50 hover:text-danger-600"
      >
        <Trash2 size={16} />
      </button>
    </div>
  )
}
