import { ArrowLeft, QrCode, ShieldCheck, Users } from "lucide-react"
import { useTranslation } from "react-i18next"
import { Link, useParams } from "react-router-dom"

import { Button } from "@/components/Button"
import { Spinner } from "@/components/Spinner"
import { useConfirmPersonInfo, usePerson } from "@/hooks/usePerson"
import { computeFreshness } from "@/lib/freshness"

import { AllergiesSection } from "./sections/AllergiesSection"
import { BasicInfoSection } from "./sections/BasicInfoSection"
import { ConditionsSection } from "./sections/ConditionsSection"
import { ContactsSection } from "./sections/ContactsSection"
import { CriticalAlertsSection } from "./sections/CriticalAlertsSection"
import { LivePreviewPane } from "./sections/LivePreviewPane"
import { MedicationsSection } from "./sections/MedicationsSection"

const ANCHOR_KEYS = ["basic", "alerts", "allergies", "conditions", "medications", "contacts", "preview"] as const

export function ProfileEditor() {
  const { t } = useTranslation()
  const { personId } = useParams<{ personId: string }>()
  const { data: person, isLoading, isError } = usePerson(personId)
  const confirmInfo = useConfirmPersonInfo(personId)

  if (isLoading) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <Spinner />
      </div>
    )
  }

  if (isError || !person) {
    return (
      <div className="mx-auto max-w-2xl px-4 py-10">
        <p className="rounded-xl bg-danger-50 px-4 py-3 text-sm text-danger-700">{t("profile.errors.loadFailed")}</p>
      </div>
    )
  }

  const freshness = computeFreshness(person.content_updated_at, person.info_confirmed_at)

  return (
    <div className="mx-auto max-w-3xl px-4 py-6 sm:px-6 sm:py-10">
      <Link to="/app" className="mb-4 inline-flex items-center gap-1.5 text-sm font-medium text-gray-500 hover:text-gray-700">
        <ArrowLeft size={16} />
        {t("profile.backToList")}
      </Link>

      <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-2xl font-bold text-gray-900">{person.display_name ?? person.full_name}</h1>
        <div className="flex gap-2">
          <Link
            to={`/app/profiles/${person.id}/qr`}
            className="inline-flex items-center gap-1.5 rounded-full border border-gray-200 px-3 py-1.5 text-sm font-medium text-gray-700 hover:bg-gray-50"
          >
            <QrCode size={16} />
            {t("profile.links.qr")}
          </Link>
          <Link
            to={`/app/profiles/${person.id}/share`}
            className="inline-flex items-center gap-1.5 rounded-full border border-gray-200 px-3 py-1.5 text-sm font-medium text-gray-700 hover:bg-gray-50"
          >
            <Users size={16} />
            {t("profile.links.share")}
          </Link>
        </div>
      </div>

      <nav className="mb-6 flex gap-2 overflow-x-auto pb-1">
        {ANCHOR_KEYS.map((key) => (
          <a
            key={key}
            href={`#${key}`}
            className="shrink-0 rounded-full bg-gray-100 px-3 py-1.5 text-sm font-medium text-gray-600 hover:bg-gray-200"
          >
            {t(`profile.nav.${key}`)}
          </a>
        ))}
      </nav>

      <div className="mb-6 flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-gray-100 bg-white p-4 shadow-sm">
        <div className="flex items-center gap-2 text-sm">
          <ShieldCheck size={18} className={freshness.stale ? "text-amber-600" : "text-brand-600"} />
          <span className={freshness.stale ? "text-amber-700" : "text-gray-600"}>
            {freshness.stale ? t("profile.confirmInfo.staleBanner") : t("profile.confirmInfo.explain")}
          </span>
        </div>
        <Button size="sm" variant={freshness.stale ? "primary" : "outline"} onClick={() => confirmInfo.mutate()} disabled={confirmInfo.isPending}>
          {confirmInfo.isPending ? t("profile.confirmInfo.confirming") : t("profile.confirmInfo.cta")}
        </Button>
      </div>

      <div className="flex flex-col gap-6">
        <BasicInfoSection person={person} />
        <CriticalAlertsSection personId={person.id} alerts={person.critical_alerts} />
        <AllergiesSection personId={person.id} allergies={person.allergies} />
        <ConditionsSection personId={person.id} conditions={person.conditions} />
        <MedicationsSection personId={person.id} medications={person.medications} />
        <ContactsSection personId={person.id} contacts={person.emergency_contacts} />
        <LivePreviewPane personId={person.id} />
      </div>
    </div>
  )
}
