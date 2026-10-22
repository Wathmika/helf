import { useState } from "react"
import { useTranslation } from "react-i18next"

import { Section } from "@/components/Section"
import { Switch } from "@/components/Switch"
import { ToggleRow } from "@/components/ToggleRow"
import { useUpdatePerson, type PersonWithChildren } from "@/hooks/usePerson"
import { LIMITS, type BloodGroup } from "@/types/database"

import { PhotoUpload } from "./PhotoUpload"

const BLOOD_GROUPS: BloodGroup[] = ["A+", "A-", "B+", "B-", "AB+", "AB-", "O+", "O-", "unknown"]

const inputClass =
  "w-full rounded-xl border border-gray-200 px-4 py-2.5 text-base focus:border-brand-500 focus:outline-none"

export function BasicInfoSection({ person }: { person: PersonWithChildren }) {
  const { t } = useTranslation()
  const updatePerson = useUpdatePerson(person.id)

  const [fullName, setFullName] = useState(person.full_name)
  const [displayName, setDisplayName] = useState(person.display_name ?? "")
  const [languagesText, setLanguagesText] = useState(person.spoken_languages.join(", "))
  const [communicationNeeds, setCommunicationNeeds] = useState(person.communication_needs ?? "")
  const [homeArea, setHomeArea] = useState(person.home_area ?? "")
  const [preferredHospital, setPreferredHospital] = useState(person.preferred_hospital ?? "")
  const [insurerName, setInsurerName] = useState(person.insurer_name ?? "")
  const [policyNumber, setPolicyNumber] = useState(person.insurance_policy_number ?? "")

  function save(patch: Partial<PersonWithChildren>) {
    updatePerson.mutate(patch)
  }

  return (
    <Section id="basic" title={t("profile.basicInfo.title")}>
      <div className="mb-5">
        <PhotoUpload person={person} />
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <label className="mb-1.5 block text-sm font-medium text-gray-700">
            {t("profile.basicInfo.fullNameLabel")}
          </label>
          <input
            type="text"
            value={fullName}
            maxLength={LIMITS.personFullName.max}
            onChange={(e) => setFullName(e.target.value)}
            onBlur={() => fullName.trim() && save({ full_name: fullName.trim() })}
            className={inputClass}
          />
        </div>
        <div>
          <label className="mb-1.5 block text-sm font-medium text-gray-700">
            {t("profile.basicInfo.displayNameLabel")}
          </label>
          <input
            type="text"
            value={displayName}
            maxLength={LIMITS.personDisplayName}
            onChange={(e) => setDisplayName(e.target.value)}
            onBlur={() => save({ display_name: displayName.trim() || null })}
            className={inputClass}
          />
          <p className="mt-1 text-xs text-gray-400">{t("profile.basicInfo.displayNameHint")}</p>
        </div>
      </div>

      <div className="mt-2 divide-y divide-gray-100">
        <ToggleRow
          label={t("profile.basicInfo.dobLabel")}
          checked={person.show_age}
          onChange={(next) => save({ show_age: next })}
        >
          <input
            type="date"
            defaultValue={person.date_of_birth ?? ""}
            onBlur={(e) => save({ date_of_birth: e.target.value || null })}
            className={inputClass}
          />
        </ToggleRow>

        <ToggleRow
          label={t("profile.basicInfo.bloodGroupLabel")}
          checked={person.show_blood_group}
          onChange={(next) => save({ show_blood_group: next })}
        >
          <select
            defaultValue={person.blood_group ?? "unknown"}
            onChange={(e) => save({ blood_group: e.target.value as BloodGroup })}
            className={inputClass}
          >
            {BLOOD_GROUPS.map((group) => (
              <option key={group} value={group}>
                {t(`enums.bloodGroup.${group}`)}
              </option>
            ))}
          </select>
        </ToggleRow>

        <div className="flex items-center justify-between py-3">
          <label className="text-sm font-medium text-gray-700">{t("profile.basicInfo.organDonorLabel")}</label>
          <div className="flex items-center gap-3">
            <Switch checked={person.organ_donor} onChange={(next) => save({ organ_donor: next })} />
            <span className="text-xs text-gray-400">{t("common.showOnScan")}</span>
            <Switch checked={person.show_organ_donor} onChange={(next) => save({ show_organ_donor: next })} />
          </div>
        </div>

        <ToggleRow
          label={t("profile.basicInfo.communicationNeedsLabel")}
          checked={person.show_communication_needs}
          onChange={(next) => save({ show_communication_needs: next })}
        >
          <input
            type="text"
            value={communicationNeeds}
            maxLength={LIMITS.communicationNeeds}
            placeholder={t("profile.basicInfo.communicationNeedsPlaceholder")}
            onChange={(e) => setCommunicationNeeds(e.target.value)}
            onBlur={() => save({ communication_needs: communicationNeeds.trim() || null })}
            className={inputClass}
          />
        </ToggleRow>

        <ToggleRow
          label={t("profile.basicInfo.spokenLanguagesLabel")}
          checked={person.show_languages}
          onChange={(next) => save({ show_languages: next })}
          hint={t("profile.basicInfo.spokenLanguagesHint")}
        >
          <input
            type="text"
            value={languagesText}
            placeholder={t("profile.basicInfo.spokenLanguagesPlaceholder")}
            onChange={(e) => setLanguagesText(e.target.value)}
            onBlur={() =>
              save({
                spoken_languages: languagesText
                  .split(",")
                  .map((lang) => lang.trim())
                  .filter(Boolean)
                  .slice(0, LIMITS.spokenLanguagesMax),
              })
            }
            className={inputClass}
          />
        </ToggleRow>

        <ToggleRow
          label={t("profile.basicInfo.preferredHospitalLabel")}
          checked={person.show_preferred_hospital}
          onChange={(next) => save({ show_preferred_hospital: next })}
        >
          <input
            type="text"
            value={preferredHospital}
            maxLength={LIMITS.preferredHospital}
            onChange={(e) => setPreferredHospital(e.target.value)}
            onBlur={() => save({ preferred_hospital: preferredHospital.trim() || null })}
            className={inputClass}
          />
        </ToggleRow>

        <ToggleRow
          label={t("profile.basicInfo.insurerNameLabel")}
          checked={person.show_insurance}
          onChange={(next) => save({ show_insurance: next })}
        >
          <input
            type="text"
            value={insurerName}
            maxLength={LIMITS.insurerName}
            onChange={(e) => setInsurerName(e.target.value)}
            onBlur={() => save({ insurer_name: insurerName.trim() || null })}
            className={inputClass}
          />
        </ToggleRow>

        <div className="py-3">
          <label className="mb-1.5 block text-sm font-medium text-gray-700">
            {t("profile.basicInfo.insurancePolicyNumberLabel")}
          </label>
          <input
            type="text"
            value={policyNumber}
            maxLength={LIMITS.insurancePolicyNumber}
            onChange={(e) => setPolicyNumber(e.target.value)}
            onBlur={() => save({ insurance_policy_number: policyNumber.trim() || null })}
            className={inputClass}
          />
          <p className="mt-1 text-xs text-gray-400">{t("profile.basicInfo.insurancePolicyNumberHint")}</p>
        </div>

        <div className="py-3">
          <div className="flex items-center justify-between">
            <label className="text-sm font-medium text-gray-700">
              {t("profile.basicInfo.lostPersonModeLabel")}
            </label>
            <Switch checked={person.lost_person_mode} onChange={(next) => save({ lost_person_mode: next })} />
          </div>
          <p className="mt-1 text-xs text-gray-400">{t("profile.basicInfo.lostPersonModeHint")}</p>
          {person.lost_person_mode && (
            <div className="mt-3">
              <label className="mb-1.5 block text-sm font-medium text-gray-700">
                {t("profile.basicInfo.homeAreaLabel")}
              </label>
              <input
                type="text"
                value={homeArea}
                maxLength={LIMITS.homeArea}
                placeholder={t("profile.basicInfo.homeAreaPlaceholder")}
                onChange={(e) => setHomeArea(e.target.value)}
                onBlur={() => save({ home_area: homeArea.trim() || null })}
                className={inputClass}
              />
              <p className="mt-1 text-xs text-gray-400">{t("profile.basicInfo.homeAreaHint")}</p>
            </div>
          )}
        </div>
      </div>
    </Section>
  )
}
