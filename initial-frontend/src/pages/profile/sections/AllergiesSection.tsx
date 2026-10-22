import { Plus } from "lucide-react"
import { useState, type FormEvent } from "react"
import { useTranslation } from "react-i18next"

import { Button } from "@/components/Button"
import { ConfirmDialog } from "@/components/ConfirmDialog"
import { ListItemRow } from "@/components/ListItemRow"
import { Modal } from "@/components/Modal"
import { Section } from "@/components/Section"
import { useAllergyMutations } from "@/hooks/usePerson"
import { ALLERGY_SEVERITIES, LIMITS, type Allergy, type AllergySeverity } from "@/types/database"

const inputClass =
  "w-full rounded-xl border border-gray-200 px-4 py-2.5 text-base focus:border-brand-500 focus:outline-none"

function AllergyForm({
  initial,
  onSubmit,
  pending,
}: {
  initial?: Allergy
  onSubmit: (values: { substance: string; reaction: string | null; severity: AllergySeverity }) => void
  pending: boolean
}) {
  const { t } = useTranslation()
  const [substance, setSubstance] = useState(initial?.substance ?? "")
  const [reaction, setReaction] = useState(initial?.reaction ?? "")
  const [severity, setSeverity] = useState<AllergySeverity>(initial?.severity ?? "unknown")

  function handleSubmit(event: FormEvent) {
    event.preventDefault()
    if (!substance.trim()) return
    onSubmit({ substance: substance.trim(), reaction: reaction.trim() || null, severity })
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-4">
      <div>
        <label className="mb-1.5 block text-sm font-medium text-gray-700">{t("profile.allergies.substanceLabel")}</label>
        <input
          type="text"
          value={substance}
          maxLength={LIMITS.allergySubstance.max}
          placeholder={t("profile.allergies.substancePlaceholder")}
          onChange={(e) => setSubstance(e.target.value)}
          required
          className={inputClass}
        />
      </div>
      <div>
        <label className="mb-1.5 block text-sm font-medium text-gray-700">{t("profile.allergies.reactionLabel")}</label>
        <input
          type="text"
          value={reaction}
          maxLength={LIMITS.allergyReaction}
          placeholder={t("profile.allergies.reactionPlaceholder")}
          onChange={(e) => setReaction(e.target.value)}
          className={inputClass}
        />
      </div>
      <div>
        <label className="mb-1.5 block text-sm font-medium text-gray-700">{t("profile.allergies.severityLabel")}</label>
        <select value={severity} onChange={(e) => setSeverity(e.target.value as AllergySeverity)} className={inputClass}>
          {ALLERGY_SEVERITIES.map((sev) => (
            <option key={sev} value={sev}>
              {t(`enums.allergySeverity.${sev}`)}
            </option>
          ))}
        </select>
      </div>
      <Button type="submit" disabled={pending} className="mt-1">
        {pending ? t("common.saving") : t("common.save")}
      </Button>
    </form>
  )
}

export function AllergiesSection({ personId, allergies }: { personId: string; allergies: Allergy[] }) {
  const { t } = useTranslation()
  const { insert, update, remove } = useAllergyMutations(personId)
  const [modalAllergy, setModalAllergy] = useState<Allergy | "new" | null>(null)
  const [deleteTarget, setDeleteTarget] = useState<Allergy | null>(null)

  return (
    <Section
      id="allergies"
      title={t("profile.allergies.title")}
      action={
        <Button size="sm" variant="outline" onClick={() => setModalAllergy("new")}>
          <Plus size={16} />
          {t("profile.allergies.addCta")}
        </Button>
      }
    >
      {allergies.length === 0 ? (
        <p className="text-sm text-gray-500">{t("profile.allergies.empty")}</p>
      ) : (
        <div className="flex flex-col gap-2">
          {allergies.map((allergy) => (
            <ListItemRow
              key={allergy.id}
              primary={allergy.substance}
              secondary={[allergy.severity && t(`enums.allergySeverity.${allergy.severity}`), allergy.reaction]
                .filter(Boolean)
                .join(" · ")}
              checked={allergy.show_on_scan}
              onToggle={(next) => update.mutate({ id: allergy.id, patch: { show_on_scan: next } })}
              onEdit={() => setModalAllergy(allergy)}
              onDelete={() => setDeleteTarget(allergy)}
            />
          ))}
        </div>
      )}

      <Modal
        open={modalAllergy !== null}
        onClose={() => setModalAllergy(null)}
        title={t(modalAllergy === "new" ? "profile.allergies.addCta" : "common.edit")}
      >
        <AllergyForm
          initial={modalAllergy !== "new" ? modalAllergy ?? undefined : undefined}
          pending={insert.isPending || update.isPending}
          onSubmit={(values) => {
            if (modalAllergy === "new") {
              insert.mutate({ ...values, show_on_scan: true }, { onSuccess: () => setModalAllergy(null) })
            } else if (modalAllergy) {
              update.mutate({ id: modalAllergy.id, patch: values }, { onSuccess: () => setModalAllergy(null) })
            }
          }}
        />
      </Modal>

      <ConfirmDialog
        open={deleteTarget !== null}
        title={t("profile.allergies.deleteConfirmTitle")}
        body={t("profile.allergies.deleteConfirmBody")}
        pending={remove.isPending}
        onCancel={() => setDeleteTarget(null)}
        onConfirm={() => {
          if (deleteTarget) remove.mutate(deleteTarget.id, { onSuccess: () => setDeleteTarget(null) })
        }}
      />
    </Section>
  )
}
