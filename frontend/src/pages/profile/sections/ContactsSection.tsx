import { Plus } from "lucide-react"
import { useState, type FormEvent } from "react"
import { useTranslation } from "react-i18next"

import { Button } from "@/components/Button"
import { ConfirmDialog } from "@/components/ConfirmDialog"
import { Modal } from "@/components/Modal"
import { Section } from "@/components/Section"
import { Switch } from "@/components/Switch"
import { useContactMutations } from "@/hooks/usePerson"
import {
  CONTACT_RELATIONSHIPS,
  LIMITS,
  PHONE_E164_PATTERN,
  type ContactRelationship,
  type EmergencyContact,
} from "@/types/database"

const inputClass =
  "w-full rounded-xl border border-gray-200 px-4 py-2.5 text-base focus:border-brand-500 focus:outline-none"

interface ContactValues {
  name: string
  relationship: ContactRelationship
  phone_e164: string
  email: string | null
  priority: 1 | 2 | 3
}

function ContactForm({
  initial,
  availablePriorities,
  onSubmit,
  pending,
}: {
  initial?: EmergencyContact
  availablePriorities: (1 | 2 | 3)[]
  onSubmit: (values: ContactValues) => void
  pending: boolean
}) {
  const { t } = useTranslation()
  const [name, setName] = useState(initial?.name ?? "")
  const [relationship, setRelationship] = useState<ContactRelationship>(initial?.relationship ?? "other")
  const [phone, setPhone] = useState(initial?.phone_e164 ?? "")
  const [email, setEmail] = useState(initial?.email ?? "")
  const [priority, setPriority] = useState<1 | 2 | 3>(initial?.priority ?? availablePriorities[0] ?? 1)
  const [phoneError, setPhoneError] = useState(false)

  function handleSubmit(event: FormEvent) {
    event.preventDefault()
    if (!name.trim()) return
    if (!PHONE_E164_PATTERN.test(phone.trim())) {
      setPhoneError(true)
      return
    }
    onSubmit({ name: name.trim(), relationship, phone_e164: phone.trim(), email: email.trim() || null, priority })
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-4">
      <div>
        <label className="mb-1.5 block text-sm font-medium text-gray-700">{t("profile.contacts.nameLabel")}</label>
        <input
          type="text"
          value={name}
          maxLength={LIMITS.contactName.max}
          onChange={(e) => setName(e.target.value)}
          required
          className={inputClass}
        />
      </div>
      <div>
        <label className="mb-1.5 block text-sm font-medium text-gray-700">
          {t("profile.contacts.relationshipLabel")}
        </label>
        <select
          value={relationship}
          onChange={(e) => setRelationship(e.target.value as ContactRelationship)}
          className={inputClass}
        >
          {CONTACT_RELATIONSHIPS.map((rel) => (
            <option key={rel} value={rel}>
              {t(`enums.contactRelationship.${rel}`)}
            </option>
          ))}
        </select>
      </div>
      <div>
        <label className="mb-1.5 block text-sm font-medium text-gray-700">{t("profile.contacts.phoneLabel")}</label>
        <input
          type="tel"
          value={phone}
          placeholder="+94771234567"
          onChange={(e) => {
            setPhone(e.target.value)
            setPhoneError(false)
          }}
          required
          className={inputClass}
        />
        {phoneError && <p className="mt-1 text-xs text-danger-600">{t("profile.contacts.invalidPhone")}</p>}
      </div>
      <div>
        <label className="mb-1.5 block text-sm font-medium text-gray-700">{t("profile.contacts.emailLabel")}</label>
        <input type="email" value={email ?? ""} onChange={(e) => setEmail(e.target.value)} className={inputClass} />
      </div>
      <div>
        <label className="mb-1.5 block text-sm font-medium text-gray-700">{t("profile.contacts.priorityLabel")}</label>
        <select
          value={priority}
          onChange={(e) => setPriority(Number(e.target.value) as 1 | 2 | 3)}
          className={inputClass}
        >
          {availablePriorities.map((p) => (
            <option key={p} value={p}>
              {p}
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

export function ContactsSection({ personId, contacts }: { personId: string; contacts: EmergencyContact[] }) {
  const { t } = useTranslation()
  const { insert, update, remove } = useContactMutations(personId)
  const [modalContact, setModalContact] = useState<EmergencyContact | "new" | null>(null)
  const [deleteTarget, setDeleteTarget] = useState<EmergencyContact | null>(null)

  const sorted = [...contacts].sort((a, b) => a.priority - b.priority)
  const atCap = contacts.length >= LIMITS.maxContactsPerPerson

  function availablePrioritiesFor(contact: EmergencyContact | "new" | null): (1 | 2 | 3)[] {
    const taken = new Set(contacts.filter((c) => c !== contact).map((c) => c.priority))
    const all: (1 | 2 | 3)[] = [1, 2, 3]
    const current = contact !== "new" && contact ? [contact.priority] : []
    return all.filter((p) => !taken.has(p) || current.includes(p))
  }

  return (
    <Section
      id="contacts"
      title={t("profile.contacts.title")}
      action={
        <Button size="sm" variant="outline" onClick={() => setModalContact("new")} disabled={atCap}>
          <Plus size={16} />
          {t("profile.contacts.addCta")}
        </Button>
      }
    >
      {atCap && (
        <p className="mb-3 rounded-xl bg-amber-50 px-4 py-2 text-sm text-amber-700">
          {t("profile.contacts.capReached", { max: LIMITS.maxContactsPerPerson })}
        </p>
      )}

      {sorted.length === 0 ? (
        <p className="text-sm text-gray-500">{t("profile.contacts.empty")}</p>
      ) : (
        <div className="flex flex-col gap-2">
          {sorted.map((contact) => (
            <div key={contact.id} className="rounded-xl border border-gray-100 px-4 py-3">
              <div className="flex items-center justify-between gap-3">
                <button type="button" onClick={() => setModalContact(contact)} className="min-w-0 flex-1 text-left">
                  <p className="truncate font-medium text-gray-900">
                    #{contact.priority} {contact.name}
                  </p>
                  <p className="truncate text-sm text-gray-500">
                    {t(`enums.contactRelationship.${contact.relationship}`)} · {contact.phone_e164}
                  </p>
                </button>
                <button
                  type="button"
                  onClick={() => setDeleteTarget(contact)}
                  className="rounded-full px-2 py-1 text-xs font-medium text-danger-600 hover:bg-danger-50"
                >
                  {t("common.delete")}
                </button>
              </div>
              <div className="mt-2 flex flex-wrap items-center gap-4">
                <label className="flex items-center gap-2 text-xs text-gray-500">
                  <Switch
                    checked={contact.notify_on_scan}
                    onChange={(next) => update.mutate({ id: contact.id, patch: { notify_on_scan: next } })}
                  />
                  {t("profile.contacts.notifyLabel")}
                </label>
                <label className="flex items-center gap-2 text-xs text-gray-500">
                  <Switch
                    checked={contact.show_on_scan}
                    onChange={(next) => update.mutate({ id: contact.id, patch: { show_on_scan: next } })}
                  />
                  {t("common.showOnScan")}
                </label>
              </div>
            </div>
          ))}
        </div>
      )}

      <Modal
        open={modalContact !== null}
        onClose={() => setModalContact(null)}
        title={t(modalContact === "new" ? "profile.contacts.addCta" : "common.edit")}
      >
        <ContactForm
          initial={modalContact !== "new" ? modalContact ?? undefined : undefined}
          availablePriorities={availablePrioritiesFor(modalContact)}
          pending={insert.isPending || update.isPending}
          onSubmit={(values) => {
            if (modalContact === "new") {
              insert.mutate(
                { ...values, notify_on_scan: true, show_on_scan: true },
                { onSuccess: () => setModalContact(null) },
              )
            } else if (modalContact) {
              update.mutate({ id: modalContact.id, patch: values }, { onSuccess: () => setModalContact(null) })
            }
          }}
        />
      </Modal>

      <ConfirmDialog
        open={deleteTarget !== null}
        title={t("profile.contacts.deleteConfirmTitle")}
        body={t("profile.contacts.deleteConfirmBody")}
        pending={remove.isPending}
        onCancel={() => setDeleteTarget(null)}
        onConfirm={() => {
          if (deleteTarget) remove.mutate(deleteTarget.id, { onSuccess: () => setDeleteTarget(null) })
        }}
      />
    </Section>
  )
}
