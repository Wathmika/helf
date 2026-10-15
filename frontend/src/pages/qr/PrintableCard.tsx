import { Printer, X } from "lucide-react"
import { useTranslation } from "react-i18next"
import { QRCodeSVG } from "qrcode.react"

import { Spinner } from "@/components/Spinner"
import { useOfflineQrText } from "@/hooks/useQrTokens"
import type { PersonWithChildren } from "@/hooks/usePerson"
import { SCAN_PAGE_ORIGIN } from "@/lib/supabase"
import type { QrToken } from "@/types/database"

interface PrintableCardProps {
  token: QrToken
  person: PersonWithChildren
  onClose: () => void
}

export function PrintableCard({ token, person, onClose }: PrintableCardProps) {
  const { t } = useTranslation()
  const { data: offlineText, isLoading } = useOfflineQrText(token.id, SCAN_PAGE_ORIGIN)
  const scanUrl = `${SCAN_PAGE_ORIGIN}/s/${token.token}`
  const keyAlerts = person.critical_alerts.filter((alert) => alert.show_on_scan)

  return (
    <div className="fixed inset-0 z-50 overflow-auto bg-white print:static print:overflow-visible">
      <div className="no-print flex items-center justify-between border-b border-gray-100 px-4 py-3">
        <h2 className="text-base font-semibold text-gray-900">{t("qr.printCard.title")}</h2>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => window.print()}
            className="inline-flex items-center gap-1.5 rounded-full bg-brand-600 px-4 py-2 text-sm font-semibold text-white hover:bg-brand-700"
          >
            <Printer size={16} />
            {t("qr.printCard.printCta")}
          </button>
          <button
            type="button"
            onClick={onClose}
            aria-label={t("qr.printCard.closeCta")}
            className="rounded-full p-2 text-gray-400 hover:bg-gray-100 hover:text-gray-600"
          >
            <X size={20} />
          </button>
        </div>
      </div>

      <div className="mx-auto flex max-w-sm flex-col items-center gap-4 px-6 py-10 text-center">
        <div className="w-full rounded-3xl border-2 border-gray-200 p-6 print:border print:p-4">
          <p className="text-lg font-bold text-gray-900">{person.display_name ?? person.full_name}</p>
          {token.label && <p className="mt-0.5 text-sm text-gray-500">{token.label}</p>}

          <div className="my-5 flex justify-center">
            <QRCodeSVG value={scanUrl} size={176} />
          </div>

          <p className="text-sm text-gray-600">{t("qr.printCard.scanHint", { name: person.display_name ?? person.full_name })}</p>

          {keyAlerts.length > 0 ? (
            <ul className="mt-4 space-y-1 text-left text-sm font-medium text-danger-700">
              {keyAlerts.map((alert) => (
                <li key={alert.id}>⚠ {t(`enums.alertCode.${alert.code}`)}</li>
              ))}
            </ul>
          ) : (
            <p className="mt-4 text-sm text-gray-400">{t("qr.printCard.noAlerts")}</p>
          )}

          <p className="mt-5 text-sm font-semibold text-danger-700">{t("qr.printCard.ambulance")}</p>

          <div className="mt-5 border-t border-dashed border-gray-200 pt-4 text-left">
            <p className="text-xs font-medium text-gray-500">{t("qr.printCard.offlineLabel")}</p>
            {isLoading ? (
              <Spinner className="mt-2" />
            ) : (
              <p className="mt-1 whitespace-pre-wrap font-mono text-xs text-gray-700">{offlineText}</p>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
