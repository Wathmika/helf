import { Plus } from "lucide-react"
import { useState, type FormEvent } from "react"
import { useTranslation } from "react-i18next"

import { Button } from "@/components/Button"
import { ConfirmDialog } from "@/components/ConfirmDialog"
import { ListItemRow } from "@/components/ListItemRow"
import { Modal } from "@/components/Modal"
import { Section } from "@/components/Section"
import { useConditionMutations } from "@/hooks/usePerson"
import { LIMITS, type Condition } from "@/types/database"

const inputClass =
  "w-full rounded-xl border border-gray-200 px-4 py-2.5 text-base focus:border-brand-500 focus:outline-none"

function ConditionForm({
  initial,
  onSubmit,
  pending,
}: {
  initial?: Condition
  onSubmit: (values: { name: string; since_year: number | null; notes: string | null }) => void
  pending: boolean
}) {
  const { t } = useTranslation()
  const [name, setName] = useState(initial?.name ?? "")
  const [sinceYear, setSinceYear] = useState(initial?.since_year?.toString() ?? "")
  const [notes, setNotes] = useState(initial?.notes ?? "")

  function handleSubmit(event: FormEvent) {
    event.preventDefault()
    if (!name.trim()) return
    const year = sinceYear.trim() ? Number(sinceYear) : null
    onSubmit({ name: name.trim(), since_year: year, notes: notes.trim() || null })
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-4">
      <div>
        <label className="mb-1.5 block text-sm font-medium text-gray-700">{t("profile.conditions.nameLabel")}</label>
        <input
          type="text"
          value={name}
          maxLength={LIMITS.conditionName.max}
          placeholder={t("profile.conditions.namePlaceholder")}
          onChange={(e) => setName(e.target.value)}
          required
          className={inputClass}
        />
      </div>
      <div>
        <label className="mb-1.5 block text-sm font-medium text-gray-700">{t("profile.conditions.sinceYearLabel")}</label>
        <input
          type="number"
          value={sinceYear}
          min={LIMITS.conditionSinceYear.min}
          max={LIMITS.conditionSinceYear.max}
          onChange={(e) => setSinceYear(e.target.value)}
          className={inputClass}
        />
      </div>
      <div>
        <label className="mb-1.5 block text-sm font-medium text-gray-700">{t("profile.conditions.notesLabel")}</label>
        <input
          type="text"
          value={notes}
          maxLength={LIMITS.conditionNotes}
          onChange={(e) => setNotes(e.target.value)}
          className={inputClass}
        />
      </div>
      <Button type="submit" disabled={pending} className="mt-1">
        {pending ? t("common.saving") : t("common.save")}
      </Button>
    </form>
  )
}

export function ConditionsSection({ personId, conditions }: { personId: string; conditions: Condition[] }) {
  const { t } = useTranslation()
  const { insert, update, remove } = useConditionMutations(personId)
  const [modalCondition, setModalCondition] = useState<Condition | "new" | null>(null)
  const [deleteTarget, setDeleteTarget] = useState<Condition | null>(null)

  return (
    <Section
      id="conditions"
      title={t("profile.conditions.title")}
      action={
        <Button size="sm" variant="outline" onClick={() => setModalCondition("new")}>
          <Plus size={16} />
          {t("profile.conditions.addCta")}
        </Button>
      }
    >
      {conditions.length === 0 ? (
        <p className="text-sm text-gray-500">{t("profile.conditions.empty")}</p>
      ) : (
        <div className="flex flex-col gap-2">
          {conditions.map((condition) => (
            <ListItemRow
              key={condition.id}
              primary={condition.name}
              secondary={condition.since_year ? String(condition.since_year) : undefined}
              checked={condition.show_on_scan}
              onToggle={(next) => update.mutate({ id: condition.id, patch: { show_on_scan: next } })}
              onEdit={() => setModalCondition(condition)}
              onDelete={() => setDeleteTarget(condition)}
            />
          ))}
        </div>
      )}

      <Modal
        open={modalCondition !== null}
        onClose={() => setModalCondition(null)}
        title={t(modalCondition === "new" ? "profile.conditions.addCta" : "common.edit")}
      >
        <ConditionForm
          initial={modalCondition !== "new" ? modalCondition ?? undefined : undefined}
          pending={insert.isPending || update.isPending}
          onSubmit={(values) => {
            if (modalCondition === "new") {
              insert.mutate({ ...values, show_on_scan: true }, { onSuccess: () => setModalCondition(null) })
            } else if (modalCondition) {
              update.mutate({ id: modalCondition.id, patch: values }, { onSuccess: () => setModalCondition(null) })
            }
          }}
        />
      </Modal>

      <ConfirmDialog
        open={deleteTarget !== null}
        title={t("profile.conditions.deleteConfirmTitle")}
        body={t("profile.conditions.deleteConfirmBody")}
        pending={remove.isPending}
        onCancel={() => setDeleteTarget(null)}
        onConfirm={() => {
          if (deleteTarget) remove.mutate(deleteTarget.id, { onSuccess: () => setDeleteTarget(null) })
        }}
      />
    </Section>
  )
}
