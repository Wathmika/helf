import { useTranslation } from "react-i18next"

import { Button } from "@/components/Button"
import { Modal } from "@/components/Modal"

interface ConfirmDialogProps {
  open: boolean
  title: string
  body: string
  confirmLabel?: string
  danger?: boolean
  pending?: boolean
  onConfirm: () => void
  onCancel: () => void
}

export function ConfirmDialog({
  open,
  title,
  body,
  confirmLabel,
  danger = true,
  pending,
  onConfirm,
  onCancel,
}: ConfirmDialogProps) {
  const { t } = useTranslation()

  return (
    <Modal open={open} onClose={onCancel} title={title}>
      <p className="mb-5 text-sm text-gray-600">{body}</p>
      <div className="flex justify-end gap-3">
        <Button variant="ghost" onClick={onCancel}>
          {t("common.cancel")}
        </Button>
        <Button variant={danger ? "danger" : "primary"} onClick={onConfirm} disabled={pending}>
          {confirmLabel ?? t("common.delete")}
        </Button>
      </div>
    </Modal>
  )
}
