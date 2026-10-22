import { Plus } from "lucide-react"
import { useState, type FormEvent } from "react"
import { useTranslation } from "react-i18next"

import { Button } from "@/components/Button"
import { ConfirmDialog } from "@/components/ConfirmDialog"
import { ListItemRow } from "@/components/ListItemRow"
import { Modal } from "@/components/Modal"
import { Section } from "@/components/Section"
import { useMedicationMutations } from "@/hooks/usePerson"
import { LIMITS, MEDICATION_KINDS, type Medication, type MedicationKind } from "@/types/database"

const inputClass =
  "w-full rounded-xl border border-gray-200 px-4 py-2.5 text-base focus:border-brand-500 focus:outline-none"

interface MedicationValues {
  name: string
  dose: string | null
  frequency: string | null
  kind: MedicationKind
  is_current: boolean
  started_on: string | null
}

function MedicationForm({
  initial,
  onSubmit,
  pending,
}: {
  initial?: Medication
  onSubmit: (values: MedicationValues) => void
  pending: boolean
}) {
  const { t } = useTranslation()
  const [name, setName] = useState(initial?.name ?? "")
  const [dose, setDose] = useState(initial?.dose ?? "")
  const [frequency, setFrequency] = useState(initial?.frequency ?? "")
  const [kind, setKind] = useState<MedicationKind>(initial?.kind ?? "prescription")
  const [isCurrent, setIsCurrent] = useState(initial?.is_current ?? true)
  const [startedOn, setStartedOn] = useState(initial?.started_on ?? "")

  function handleSubmit(event: FormEvent) {
    event.preventDefault()
    if (!name.trim()) return
    onSubmit({
      name: name.trim(),
      dose: dose.trim() || null,
      frequency: frequency.trim() || null,
      kind,
      is_current: isCurrent,
      started_on: startedOn || null,
    })
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-4">
      <div>
        <label className="mb-1.5 block text-sm font-medium text-gray-700">{t("profile.medications.nameLabel")}</label>
        <input
          type="text"
          value={name}
          maxLength={LIMITS.medicationName.max}
          placeholder={t("profile.medications.namePlaceholder")}
          onChange={(e) => setName(e.target.value)}
          required
          className={inputClass}
        />
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="mb-1.5 block text-sm font-medium text-gray-700">{t("profile.medications.doseLabel")}</label>
          <input
            type="text"
            value={dose}
            maxLength={LIMITS.medicationDose}
            placeholder={t("profile.medications.dosePlaceholder")}
            onChange={(e) => setDose(e.target.value)}
            className={inputClass}
          />
        </div>
        <div>
          <label className="mb-1.5 block text-sm font-medium text-gray-700">
            {t("profile.medications.frequencyLabel")}
          </label>
          <input
            type="text"
            value={frequency}
            maxLength={LIMITS.medicationFrequency}
            placeholder={t("profile.medications.frequencyPlaceholder")}
            onChange={(e) => setFrequency(e.target.value)}
            className={inputClass}
          />
        </div>
      </div>
      <div>
        <label className="mb-1.5 block text-sm font-medium text-gray-700">{t("profile.medications.kindLabel")}</label>
        <select value={kind} onChange={(e) => setKind(e.target.value as MedicationKind)} className={inputClass}>
          {MEDICATION_KINDS.map((k) => (
            <option key={k} value={k}>
              {t(`enums.medicationKind.${k}`)}
            </option>
          ))}
        </select>
      </div>
      <div className="flex items-center justify-between">
        <label className="text-sm font-medium text-gray-700">{t("profile.medications.currentLabel")}</label>
        <input
          type="checkbox"
          checked={isCurrent}
          onChange={(e) => setIsCurrent(e.target.checked)}
          className="h-5 w-5 accent-brand-600"
        />
      </div>
      <div>
        <label className="mb-1.5 block text-sm font-medium text-gray-700">{t("profile.medications.startedOnLabel")}</label>
        <input type="date" value={startedOn} onChange={(e) => setStartedOn(e.target.value)} className={inputClass} />
      </div>
      <p className="text-xs text-gray-400">{t("profile.medications.packetPhotoNote")}</p>
      <Button type="submit" disabled={pending} className="mt-1">
        {pending ? t("common.saving") : t("common.save")}
      </Button>
    </form>
  )
}

export function MedicationsSection({ personId, medications }: { personId: string; medications: Medication[] }) {
  const { t } = useTranslation()
  const { insert, update, remove } = useMedicationMutations(personId)
  const [modalMedication, setModalMedication] = useState<Medication | "new" | null>(null)
  const [deleteTarget, setDeleteTarget] = useState<Medication | null>(null)

  return (
    <Section
      id="medications"
      title={t("profile.medications.title")}
      subtitle={t("profile.medications.privacyHint")}
      action={
        <Button size="sm" variant="outline" onClick={() => setModalMedication("new")}>
          <Plus size={16} />
          {t("profile.medications.addCta")}
        </Button>
      }
    >
      {medications.length === 0 ? (
        <p className="text-sm text-gray-500">{t("profile.medications.empty")}</p>
      ) : (
        <div className="flex flex-col gap-2">
          {medications.map((medication) => (
            <ListItemRow
              key={medication.id}
              primary={medication.name}
              secondary={[medication.dose, medication.frequency].filter(Boolean).join(" · ")}
              checked={medication.show_on_scan}
              onToggle={(next) => update.mutate({ id: medication.id, patch: { show_on_scan: next } })}
              onEdit={() => setModalMedication(medication)}
              onDelete={() => setDeleteTarget(medication)}
            />
          ))}
        </div>
      )}

      <Modal
        open={modalMedication !== null}
        onClose={() => setModalMedication(null)}
        title={t(modalMedication === "new" ? "profile.medications.addCta" : "common.edit")}
      >
        <MedicationForm
          initial={modalMedication !== "new" ? modalMedication ?? undefined : undefined}
          pending={insert.isPending || update.isPending}
          onSubmit={(values) => {
            if (modalMedication === "new") {
              insert.mutate({ ...values, show_on_scan: false }, { onSuccess: () => setModalMedication(null) })
            } else if (modalMedication) {
              update.mutate({ id: modalMedication.id, patch: values }, { onSuccess: () => setModalMedication(null) })
            }
          }}
        />
      </Modal>

      <ConfirmDialog
        open={deleteTarget !== null}
        title={t("profile.medications.deleteConfirmTitle")}
        body={t("profile.medications.deleteConfirmBody")}
        pending={remove.isPending}
        onCancel={() => setDeleteTarget(null)}
        onConfirm={() => {
          if (deleteTarget) remove.mutate(deleteTarget.id, { onSuccess: () => setDeleteTarget(null) })
        }}
      />
    </Section>
  )
}
