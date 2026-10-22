import { ArrowLeft, Ban, Check, Copy, Share2, UserPlus, Users } from "lucide-react"
import { useState } from "react"
import { useTranslation } from "react-i18next"
import { Link, useParams } from "react-router-dom"

import { useAuth } from "@/auth/AuthContext"
import { Button } from "@/components/Button"
import { ConfirmDialog } from "@/components/ConfirmDialog"
import { Modal } from "@/components/Modal"
import { Section } from "@/components/Section"
import { Spinner } from "@/components/Spinner"
import {
  useCoManagers,
  useCreatePersonInvite,
  usePersonInvites,
  useRevokePersonInvite,
} from "@/hooks/useInvites"
import { usePerson } from "@/hooks/usePerson"
import { LIMITS, type PersonInvite } from "@/types/database"

function isOpenInvite(invite: PersonInvite) {
  return !invite.accepted_at && !invite.revoked_at && new Date(invite.expires_at) > new Date()
}

function NewInviteModal({
  open,
  onClose,
  personId,
  onCreated,
}: {
  open: boolean
  onClose: () => void
  personId: string
  onCreated: (code: string) => void
}) {
  const { t } = useTranslation()
  const [note, setNote] = useState("")
  const create = useCreatePersonInvite(personId)

  function handleClose() {
    setNote("")
    create.reset()
    onClose()
  }

  function handleCreate() {
    create.mutate(note.trim() || null, {
      onSuccess: (code) => {
        setNote("")
        onCreated(code)
      },
    })
  }

  return (
    <Modal open={open} onClose={handleClose} title={t("sharing.newInviteModal.title")}>
      <label className="mb-1.5 block text-sm font-medium text-gray-700">{t("sharing.newInviteModal.noteLabel")}</label>
      <input
        type="text"
        value={note}
        onChange={(event) => setNote(event.target.value)}
        placeholder={t("sharing.newInviteModal.notePlaceholder")}
        maxLength={LIMITS.inviteNote}
        className="w-full rounded-xl border border-gray-200 px-3 py-2 text-sm focus:border-brand-500 focus:outline-none"
      />

      {create.isError && <p className="mt-3 text-sm text-danger-600">{t("sharing.invites.errors.createFailed")}</p>}

      <div className="mt-5 flex justify-end gap-3">
        <Button variant="ghost" onClick={handleClose}>
          {t("common.cancel")}
        </Button>
        <Button onClick={handleCreate} disabled={create.isPending}>
          {create.isPending ? t("sharing.invites.inviting") : t("sharing.newInviteModal.createCta")}
        </Button>
      </div>
    </Modal>
  )
}

function CodeRevealModal({ code, name, onClose }: { code: string | null; name: string; onClose: () => void }) {
  const { t } = useTranslation()
  const [copied, setCopied] = useState(false)

  if (!code) return null
  const revealedCode = code

  const message = t("sharing.codeModal.whatsappMessage", { name, code: revealedCode })
  const whatsappUrl = `https://wa.me/?text=${encodeURIComponent(message)}`

  async function handleCopy() {
    await navigator.clipboard.writeText(revealedCode)
    setCopied(true)
  }

  return (
    <Modal open onClose={onClose} title={t("sharing.codeModal.title")}>
      <p className="mb-4 rounded-xl bg-amber-50 px-3 py-2 text-sm text-amber-700">{t("sharing.codeModal.warning")}</p>
      <p className="mb-5 rounded-xl border border-gray-200 bg-gray-50 px-4 py-4 text-center font-mono text-2xl font-bold tracking-widest text-gray-900">
        {code}
      </p>
      <div className="flex flex-col gap-2 sm:flex-row">
        <Button variant="outline" className="flex-1" onClick={handleCopy}>
          {copied ? <Check size={16} /> : <Copy size={16} />}
          {copied ? t("sharing.codeModal.copied") : t("sharing.codeModal.copyCta")}
        </Button>
        <a
          href={whatsappUrl}
          target="_blank"
          rel="noreferrer"
          className="inline-flex flex-1 items-center justify-center gap-2 rounded-full bg-brand-600 px-5 py-2.5 text-base font-semibold text-white hover:bg-brand-700"
        >
          <Share2 size={16} />
          {t("sharing.codeModal.whatsappCta")}
        </a>
      </div>
      <Button variant="ghost" className="mt-4 w-full" onClick={onClose}>
        {t("sharing.codeModal.closeCta")}
      </Button>
    </Modal>
  )
}

export function InvitesScreen() {
  const { t } = useTranslation()
  const { user } = useAuth()
  const { personId } = useParams<{ personId: string }>()
  const { data: person } = usePerson(personId)
  const { data: invites, isLoading: invitesLoading } = usePersonInvites(personId)
  const { data: coManagers, isLoading: coManagersLoading, isError: coManagersError } = useCoManagers(personId)
  const revoke = useRevokePersonInvite(personId)

  const [createOpen, setCreateOpen] = useState(false)
  const [revealCode, setRevealCode] = useState<string | null>(null)
  const [revokeTarget, setRevokeTarget] = useState<PersonInvite | null>(null)

  const name = person?.display_name ?? person?.full_name ?? ""
  const isOwner = coManagers?.find((manager) => manager.user_id === user?.id)?.role === "owner"
  const openInvites = invites?.filter(isOpenInvite) ?? []
  const atCap = openInvites.length >= LIMITS.maxOpenInvitesPerPerson

  function handleRevokeConfirm() {
    if (!revokeTarget) return
    revoke.mutate(revokeTarget.id, { onSuccess: () => setRevokeTarget(null) })
  }

  return (
    <div className="mx-auto max-w-3xl px-4 py-6 sm:px-6 sm:py-10">
      {personId && (
        <Link
          to={`/app/profiles/${personId}`}
          className="mb-4 inline-flex items-center gap-1.5 text-sm font-medium text-gray-500 hover:text-gray-700"
        >
          <ArrowLeft size={16} />
          {t("sharing.backToProfile")}
        </Link>
      )}

      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">{t("sharing.title")}</h1>
        {name && <p className="mt-0.5 text-sm text-gray-500">{t("sharing.subtitle", { name })}</p>}
      </div>

      <Section title={t("sharing.coManagers.title")}>
        {coManagersLoading ? (
          <div className="flex justify-center py-6">
            <Spinner />
          </div>
        ) : coManagersError ? (
          <p className="rounded-xl bg-danger-50 px-4 py-3 text-sm text-danger-700">{t("common.error.generic")}</p>
        ) : !coManagers || coManagers.length === 0 ? (
          <p className="py-2 text-sm text-gray-400">{t("sharing.coManagers.empty")}</p>
        ) : (
          <ul className="divide-y divide-gray-100">
            {coManagers.map((manager) => (
              <li key={manager.user_id} className="flex items-center gap-3 py-3">
                <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-brand-50 text-brand-700">
                  <Users size={16} />
                </span>
                <span className="flex-1 text-sm font-medium text-gray-900">
                  {manager.app_users?.display_name ?? t("sharing.coManagers.unnamed")}
                  {manager.user_id === user?.id && ` ${t("sharing.coManagers.you")}`}
                </span>
                <span
                  className={`rounded-full px-2.5 py-1 text-xs font-semibold ${
                    manager.role === "owner" ? "bg-brand-50 text-brand-700" : "bg-gray-100 text-gray-600"
                  }`}
                >
                  {t(`sharing.coManagers.role${manager.role === "owner" ? "Owner" : "Editor"}`)}
                </span>
              </li>
            ))}
          </ul>
        )}
      </Section>

      {isOwner && (
        <div className="mt-6">
          <Section
            title={t("sharing.invites.title")}
            action={
              <Button size="sm" onClick={() => setCreateOpen(true)} disabled={atCap}>
                <UserPlus size={16} />
                {t("sharing.invites.inviteCta")}
              </Button>
            }
          >
            {atCap && (
              <p className="mb-4 rounded-xl bg-amber-50 px-4 py-3 text-sm text-amber-700">
                {t("sharing.invites.capReached", { max: LIMITS.maxOpenInvitesPerPerson })}
              </p>
            )}

            {invitesLoading ? (
              <div className="flex justify-center py-6">
                <Spinner />
              </div>
            ) : openInvites.length === 0 ? (
              <p className="py-2 text-sm text-gray-400">{t("sharing.invites.empty")}</p>
            ) : (
              <div className="space-y-3">
                {openInvites.map((invite) => (
                  <div key={invite.id} className="flex items-center gap-3 rounded-xl border border-gray-100 p-4">
                    <div className="min-w-0 flex-1">
                      <p className="font-medium text-gray-900">{invite.note || t("sharing.invites.noteFallback")}</p>
                      <p className="mt-0.5 text-xs text-gray-400">
                        {t("sharing.invites.createdOn", { date: new Date(invite.created_at).toLocaleDateString() })}
                        {" · "}
                        {t("sharing.invites.expiresOn", { date: new Date(invite.expires_at).toLocaleDateString() })}
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={() => setRevokeTarget(invite)}
                      className="inline-flex items-center gap-1.5 rounded-full border border-danger-200 px-3 py-1.5 text-xs font-medium text-danger-600 hover:bg-danger-50"
                    >
                      <Ban size={14} />
                      {t("sharing.invites.revokeCta")}
                    </button>
                  </div>
                ))}
              </div>
            )}
          </Section>
        </div>
      )}

      {personId && (
        <NewInviteModal
          open={createOpen}
          onClose={() => setCreateOpen(false)}
          personId={personId}
          onCreated={(code) => {
            setCreateOpen(false)
            setRevealCode(code)
          }}
        />
      )}

      <CodeRevealModal code={revealCode} name={name} onClose={() => setRevealCode(null)} />

      <ConfirmDialog
        open={Boolean(revokeTarget)}
        title={t("sharing.invites.revokeConfirm.title")}
        body={t("sharing.invites.revokeConfirm.body")}
        confirmLabel={t("sharing.invites.revokeCta")}
        pending={revoke.isPending}
        onConfirm={handleRevokeConfirm}
        onCancel={() => setRevokeTarget(null)}
      />
    </div>
  )
}
