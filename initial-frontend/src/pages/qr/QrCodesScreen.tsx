import { ArrowLeft, Ban, Download, MapPin, Plus, Printer, QrCode } from "lucide-react"
import { useRef, useState } from "react"
import { useTranslation } from "react-i18next"
import { Link, useParams } from "react-router-dom"
import { QRCodeCanvas } from "qrcode.react"

import { Button } from "@/components/Button"
import { ConfirmDialog } from "@/components/ConfirmDialog"
import { Modal } from "@/components/Modal"
import { Section } from "@/components/Section"
import { Spinner } from "@/components/Spinner"
import { usePerson } from "@/hooks/usePerson"
import { useIssueQrToken, useQrTokens, useRevokeQrToken, useScanEvents } from "@/hooks/useQrTokens"
import { SCAN_PAGE_ORIGIN } from "@/lib/supabase"
import { LIMITS, type QrToken } from "@/types/database"

import { PrintableCard } from "./PrintableCard"

function scanUrlFor(token: QrToken) {
  return `${SCAN_PAGE_ORIGIN}/s/${token.token}`
}

function downloadCanvas(canvas: HTMLCanvasElement, filename: string) {
  const link = document.createElement("a")
  link.href = canvas.toDataURL("image/png")
  link.download = filename
  link.click()
}

function NewQrModal({ open, onClose, personId }: { open: boolean; onClose: () => void; personId: string }) {
  const { t } = useTranslation()
  const [label, setLabel] = useState("")
  const issue = useIssueQrToken(personId)

  function handleCreate() {
    issue.mutate(label.trim() || null, {
      onSuccess: () => {
        setLabel("")
        onClose()
      },
    })
  }

  return (
    <Modal open={open} onClose={onClose} title={t("qr.newModal.title")}>
      <label className="mb-1.5 block text-sm font-medium text-gray-700">{t("qr.newModal.labelLabel")}</label>
      <input
        type="text"
        value={label}
        onChange={(event) => setLabel(event.target.value)}
        placeholder={t("qr.newModal.labelPlaceholder")}
        maxLength={LIMITS.qrLabel}
        className="w-full rounded-xl border border-gray-200 px-3 py-2 text-sm focus:border-brand-500 focus:outline-none"
      />
      <p className="mt-1 text-xs text-gray-400">{t("qr.newModal.labelHint")}</p>

      {issue.isError && <p className="mt-3 text-sm text-danger-600">{t("qr.errors.issueFailed")}</p>}

      <div className="mt-5 flex justify-end gap-3">
        <Button variant="ghost" onClick={onClose}>
          {t("common.cancel")}
        </Button>
        <Button onClick={handleCreate} disabled={issue.isPending}>
          {issue.isPending ? t("qr.creating") : t("qr.newModal.createCta")}
        </Button>
      </div>
    </Modal>
  )
}

export function QrCodesScreen() {
  const { t } = useTranslation()
  const { personId } = useParams<{ personId: string }>()
  const { data: person } = usePerson(personId)
  const { data: tokens, isLoading } = useQrTokens(personId)
  const { data: scanEvents } = useScanEvents(personId)
  const revoke = useRevokeQrToken(personId)

  const [createOpen, setCreateOpen] = useState(false)
  const [revokeTarget, setRevokeTarget] = useState<QrToken | null>(null)
  const [printTarget, setPrintTarget] = useState<QrToken | null>(null)
  const canvasRefs = useRef(new Map<string, HTMLCanvasElement>())

  const name = person?.display_name ?? person?.full_name ?? ""

  function handleRevokeConfirm() {
    if (!revokeTarget) return
    revoke.mutate(revokeTarget.id, { onSuccess: () => setRevokeTarget(null) })
  }

  return (
    <div className="mx-auto max-w-3xl px-4 py-6 sm:px-6 sm:py-10">
      <div className="no-print">
        {personId && (
          <Link
            to={`/app/profiles/${personId}`}
            className="mb-4 inline-flex items-center gap-1.5 text-sm font-medium text-gray-500 hover:text-gray-700"
          >
            <ArrowLeft size={16} />
            {t("qr.backToProfile")}
          </Link>
        )}

        <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">{t("qr.title")}</h1>
            {name && <p className="mt-0.5 text-sm text-gray-500">{t("qr.subtitle", { name })}</p>}
          </div>
          <Button onClick={() => setCreateOpen(true)}>
            <Plus size={18} />
            {t("qr.createCta")}
          </Button>
        </div>

        <Section title={t("qr.title")}>
          {isLoading ? (
            <div className="flex justify-center py-6">
              <Spinner />
            </div>
          ) : !tokens || tokens.length === 0 ? (
            <div className="py-6 text-center">
              <QrCode className="mx-auto mb-3 text-gray-300" size={40} />
              <p className="font-medium text-gray-900">{t("qr.empty.title")}</p>
              <p className="mt-1 text-sm text-gray-500">{t("qr.empty.body")}</p>
            </div>
          ) : (
            <div className="space-y-3">
              {tokens.map((token) => (
                <div key={token.id} className="flex flex-wrap items-center gap-4 rounded-xl border border-gray-100 p-4">
                  <QRCodeCanvas
                    value={scanUrlFor(token)}
                    size={64}
                    ref={(node) => {
                      if (node) canvasRefs.current.set(token.id, node)
                      else canvasRefs.current.delete(token.id)
                    }}
                  />
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <p className="font-medium text-gray-900">{token.label || t("qr.title")}</p>
                      <span
                        className={`rounded-full px-2 py-0.5 text-xs font-semibold ${
                          token.status === "active" ? "bg-green-50 text-green-700" : "bg-gray-100 text-gray-500"
                        }`}
                      >
                        {t(`qr.status.${token.status}`)}
                      </span>
                    </div>
                    <p className="mt-0.5 text-xs text-gray-400">
                      {token.status === "revoked" && token.revoked_at
                        ? t("qr.revokedOn", { date: new Date(token.revoked_at).toLocaleDateString() })
                        : t("qr.createdOn", { date: new Date(token.created_at).toLocaleDateString() })}
                    </p>
                  </div>
                  <div className="flex shrink-0 flex-wrap gap-2">
                    {token.status === "active" && (
                      <button
                        type="button"
                        onClick={() => setPrintTarget(token)}
                        className="inline-flex items-center gap-1.5 rounded-full border border-gray-200 px-3 py-1.5 text-xs font-medium text-gray-700 hover:bg-gray-50"
                      >
                        <Printer size={14} />
                        {t("qr.actions.printCard")}
                      </button>
                    )}
                    <button
                      type="button"
                      onClick={() => {
                        const canvas = canvasRefs.current.get(token.id)
                        if (canvas) downloadCanvas(canvas, `helf-qr-${token.label || token.id}.png`)
                      }}
                      className="inline-flex items-center gap-1.5 rounded-full border border-gray-200 px-3 py-1.5 text-xs font-medium text-gray-700 hover:bg-gray-50"
                    >
                      <Download size={14} />
                      {t("qr.actions.download")}
                    </button>
                    {token.status === "active" && (
                      <button
                        type="button"
                        onClick={() => setRevokeTarget(token)}
                        className="inline-flex items-center gap-1.5 rounded-full border border-danger-200 px-3 py-1.5 text-xs font-medium text-danger-600 hover:bg-danger-50"
                      >
                        <Ban size={14} />
                        {t("qr.actions.revoke")}
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </Section>

        <div className="mt-6">
          <Section title={t("qr.activity.title")} subtitle={t("qr.activity.subtitle")}>
            {!scanEvents || scanEvents.length === 0 ? (
              <p className="py-4 text-center text-sm text-gray-400">{t("qr.activity.empty")}</p>
            ) : (
              <ul className="divide-y divide-gray-100">
                {scanEvents.map((event) => (
                  <li key={event.id} className="flex items-center justify-between gap-3 py-3 text-sm">
                    <span className="text-gray-700">{new Date(event.scanned_at).toLocaleString()}</span>
                    <span className="flex items-center gap-1.5 text-xs text-gray-400">
                      {event.approx_lat != null && <MapPin size={14} />}
                      {event.approx_lat != null ? t("qr.activity.locationShared") : t("qr.activity.locationNotShared")}
                      {event.country_code && ` · ${event.country_code}`}
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </Section>
        </div>
      </div>

      {personId && <NewQrModal open={createOpen} onClose={() => setCreateOpen(false)} personId={personId} />}

      <ConfirmDialog
        open={Boolean(revokeTarget)}
        title={t("qr.revokeConfirm.title")}
        body={t("qr.revokeConfirm.body")}
        confirmLabel={t("qr.actions.revoke")}
        pending={revoke.isPending}
        onConfirm={handleRevokeConfirm}
        onCancel={() => setRevokeTarget(null)}
      />

      {printTarget && person && (
        <PrintableCard token={printTarget} person={person} onClose={() => setPrintTarget(null)} />
      )}
    </div>
  )
}
