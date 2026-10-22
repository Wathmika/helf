import { Phone, Siren } from "lucide-react"
import { useTranslation } from "react-i18next"

import { buttonClasses } from "@/components/Button"
import { Section } from "@/components/Section"
import { Spinner } from "@/components/Spinner"
import { usePreviewScanProfile } from "@/hooks/usePerson"

export function LivePreviewPane({ personId }: { personId: string }) {
  const { t } = useTranslation()
  const { data: profile, isLoading } = usePreviewScanProfile(personId)

  const rows: { label: string; value: string }[] = []
  if (profile) {
    if (profile.age !== undefined) rows.push({ label: t("profile.basicInfo.dobLabel"), value: String(profile.age) })
    if (profile.blood_group) rows.push({ label: t("profile.basicInfo.bloodGroupLabel"), value: t(`enums.bloodGroup.${profile.blood_group}`) })
    if (profile.languages?.length) rows.push({ label: t("profile.basicInfo.spokenLanguagesLabel"), value: profile.languages.join(", ") })
    if (profile.communication_needs) rows.push({ label: t("profile.basicInfo.communicationNeedsLabel"), value: profile.communication_needs })
    if (profile.organ_donor) rows.push({ label: t("profile.basicInfo.organDonorLabel"), value: t("common.yes") })
    if (profile.preferred_hospital) rows.push({ label: t("profile.basicInfo.preferredHospitalLabel"), value: profile.preferred_hospital })
    if (profile.insurer) rows.push({ label: t("profile.basicInfo.insurerNameLabel"), value: profile.insurer })
    if (profile.lost_person_mode && profile.home_area) rows.push({ label: t("profile.basicInfo.homeAreaLabel"), value: profile.home_area })
  }

  const alerts = profile?.alerts ?? []
  const allergies = profile?.allergies ?? []
  const conditions = profile?.conditions ?? []
  const medications = profile?.medications ?? []
  const contacts = profile?.contacts ?? []
  const hasAnything = rows.length > 0 || alerts.length > 0 || allergies.length > 0 || conditions.length > 0 || medications.length > 0

  return (
    <Section id="preview" title={t("profile.preview.title")} subtitle={t("profile.preview.subtitle")}>
      {isLoading ? (
        <div className="flex justify-center py-10">
          <Spinner />
        </div>
      ) : (
        <div className="rounded-2xl border border-gray-100 bg-gray-50 p-5">
          <p className="text-lg font-semibold text-gray-900">{profile?.name ?? t("profile.preview.nameFallback")}</p>

          {alerts.length > 0 && (
            <div className="mt-3 flex flex-wrap gap-2">
              {alerts.map((alert, i) => (
                <span key={i} className="rounded-full bg-danger-100 px-3 py-1 text-xs font-semibold text-danger-700">
                  {t(`enums.alertCode.${alert.code}`)}
                </span>
              ))}
            </div>
          )}

          {!hasAnything && <p className="mt-4 text-sm text-gray-400">{t("profile.preview.noFieldsVisible")}</p>}

          {rows.length > 0 && (
            <dl className="mt-4 space-y-2">
              {rows.map((row) => (
                <div key={row.label} className="flex justify-between border-b border-gray-200 pb-2 text-sm">
                  <dt className="text-gray-500">{row.label}</dt>
                  <dd className="font-medium text-gray-900">{row.value}</dd>
                </div>
              ))}
            </dl>
          )}

          {allergies.length > 0 && (
            <div className="mt-4">
              <p className="text-sm font-semibold text-gray-700">{t("profile.allergies.title")}</p>
              <ul className="mt-1 list-inside list-disc text-sm text-gray-600">
                {allergies.map((a, i) => (
                  <li key={i}>
                    {a.substance}
                    {a.severity && ` — ${t(`enums.allergySeverity.${a.severity}`)}`}
                  </li>
                ))}
              </ul>
            </div>
          )}

          {conditions.length > 0 && (
            <div className="mt-4">
              <p className="text-sm font-semibold text-gray-700">{t("profile.conditions.title")}</p>
              <ul className="mt-1 list-inside list-disc text-sm text-gray-600">
                {conditions.map((c, i) => (
                  <li key={i}>{c.name}</li>
                ))}
              </ul>
            </div>
          )}

          {medications.length > 0 && (
            <div className="mt-4">
              <p className="text-sm font-semibold text-gray-700">{t("profile.medications.title")}</p>
              <ul className="mt-1 list-inside list-disc text-sm text-gray-600">
                {medications.map((m, i) => (
                  <li key={i}>
                    {m.name}
                    {m.dose && ` — ${m.dose}`}
                  </li>
                ))}
              </ul>
            </div>
          )}

          <div className="mt-6 flex flex-col gap-2 sm:flex-row">
            {contacts.length > 0 && (
              <button type="button" className={buttonClasses("secondary", "md", "flex-1")} disabled>
                <Phone size={16} />
                {t("profile.preview.callContact", { name: contacts[0].name })}
              </button>
            )}
            <button type="button" className={buttonClasses("danger", "md", "flex-1")} disabled>
              <Siren size={16} />
              {t("profile.preview.callAmbulance")}
            </button>
          </div>
        </div>
      )}
    </Section>
  )
}
