import { AlertTriangle, Download } from "lucide-react"
import { useState } from "react"
import { useTranslation } from "react-i18next"

import { useAuth } from "@/auth/AuthContext"
import { Button } from "@/components/Button"
import { Section } from "@/components/Section"
import { Spinner } from "@/components/Spinner"
import { DELETE_CONFIRM_TEXT, useDeleteAccount, useExportPersonData, useUpdateAppUser } from "@/hooks/useAccount"
import { useProfiles } from "@/hooks/useProfiles"
import { SUPPORTED_LANGUAGES, type SupportedLanguage } from "@/i18n"
import { LIMITS, type PreferredLanguage } from "@/types/database"

function ProfileSettingsSection() {
  const { t, i18n } = useTranslation()
  const { appUser } = useAuth()
  const updateAppUser = useUpdateAppUser()
  const [displayName, setDisplayName] = useState(appUser?.display_name ?? "")

  if (!appUser) return null

  function handleNameBlur() {
    const trimmed = displayName.trim()
    if (trimmed && trimmed !== appUser!.display_name) {
      updateAppUser.mutate({ display_name: trimmed })
    }
  }

  function handleLanguageChange(value: PreferredLanguage) {
    updateAppUser.mutate({ preferred_language: value })
    void i18n.changeLanguage(value)
  }

  return (
    <Section title={t("account.profile.title")}>
      <div className="flex flex-col gap-4">
        <div>
          <label htmlFor="display-name" className="mb-1.5 block text-sm font-medium text-gray-700">
            {t("account.profile.nameLabel")}
          </label>
          <input
            id="display-name"
            type="text"
            value={displayName}
            onChange={(event) => setDisplayName(event.target.value)}
            onBlur={handleNameBlur}
            maxLength={LIMITS.appUserDisplayName}
            className="w-full rounded-xl border border-gray-200 px-4 py-2.5 text-base focus:border-brand-500 focus:outline-none"
          />
        </div>

        <div>
          <label htmlFor="preferred-language" className="mb-1.5 block text-sm font-medium text-gray-700">
            {t("account.profile.languageLabel")}
          </label>
          <select
            id="preferred-language"
            value={appUser.preferred_language}
            onChange={(event) => handleLanguageChange(event.target.value as SupportedLanguage)}
            className="w-full rounded-xl border border-gray-200 px-4 py-2.5 text-base focus:border-brand-500 focus:outline-none"
          >
            {SUPPORTED_LANGUAGES.map((lng) => (
              <option key={lng} value={lng}>
                {t(`account.profile.languages.${lng}`)}
              </option>
            ))}
          </select>
        </div>

        {updateAppUser.isPending && <p className="text-xs text-gray-400">{t("common.saving")}</p>}
      </div>
    </Section>
  )
}

function ExportDataSection() {
  const { t } = useTranslation()
  const { data: profiles, isLoading } = useProfiles()
  const exportData = useExportPersonData()
  const [exportingId, setExportingId] = useState<string | null>(null)

  function handleExport(personId: string, name: string) {
    setExportingId(personId)
    exportData.mutate(
      { personId, fileLabel: name.toLowerCase().replace(/[^a-z0-9]+/g, "-") },
      { onSettled: () => setExportingId(null) },
    )
  }

  return (
    <Section title={t("account.export.title")} subtitle={t("account.export.subtitle")}>
      {isLoading ? (
        <div className="flex justify-center py-4">
          <Spinner />
        </div>
      ) : !profiles || profiles.length === 0 ? (
        <p className="py-2 text-sm text-gray-400">{t("account.export.empty")}</p>
      ) : (
        <div className="space-y-2">
          {profiles.map((card) => {
            const name = card.people.display_name ?? card.people.full_name
            return (
              <div key={card.person_id} className="flex items-center justify-between gap-3 rounded-xl border border-gray-100 px-4 py-3">
                <span className="font-medium text-gray-900">{name}</span>
                <button
                  type="button"
                  onClick={() => handleExport(card.person_id, name)}
                  disabled={exportingId === card.person_id}
                  className="inline-flex items-center gap-1.5 rounded-full border border-gray-200 px-3 py-1.5 text-xs font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50"
                >
                  <Download size={14} />
                  {exportingId === card.person_id ? t("account.export.exporting") : t("account.export.cta")}
                </button>
              </div>
            )
          })}
        </div>
      )}
      {exportData.isError && <p className="mt-3 text-sm text-danger-600">{t("account.export.error")}</p>}
    </Section>
  )
}

function DeleteAccountSection() {
  const { t } = useTranslation()
  const deleteAccount = useDeleteAccount()
  const [confirmText, setConfirmText] = useState("")

  const canDelete = confirmText === DELETE_CONFIRM_TEXT

  return (
    <Section title={t("account.danger.title")}>
      <div className="rounded-xl border border-danger-200 bg-danger-50 p-4">
        <div className="mb-2 flex items-center gap-2 text-danger-700">
          <AlertTriangle size={18} />
          <p className="font-semibold">{t("account.danger.warningTitle")}</p>
        </div>
        <p className="text-sm text-danger-700">{t("account.danger.warningBody")}</p>

        <label htmlFor="delete-confirm" className="mb-1.5 mt-4 block text-sm font-medium text-danger-700">
          {t("account.danger.confirmLabel", { phrase: DELETE_CONFIRM_TEXT })}
        </label>
        <input
          id="delete-confirm"
          type="text"
          value={confirmText}
          onChange={(event) => setConfirmText(event.target.value)}
          placeholder={DELETE_CONFIRM_TEXT}
          className="w-full rounded-xl border border-danger-300 bg-white px-4 py-2.5 text-base focus:border-danger-500 focus:outline-none"
        />

        {deleteAccount.isError && <p className="mt-3 text-sm text-danger-700">{t("account.danger.error")}</p>}

        <Button
          variant="danger"
          className="mt-4"
          disabled={!canDelete || deleteAccount.isPending}
          onClick={() => deleteAccount.mutate()}
        >
          {deleteAccount.isPending ? t("account.danger.deleting") : t("account.danger.deleteCta")}
        </Button>
      </div>
    </Section>
  )
}

export function AccountScreen() {
  const { t } = useTranslation()

  return (
    <div className="mx-auto max-w-2xl px-4 py-6 sm:px-6 sm:py-10">
      <h1 className="mb-6 text-2xl font-bold text-gray-900">{t("account.title")}</h1>

      <div className="flex flex-col gap-6">
        <ProfileSettingsSection />
        <ExportDataSection />
        <DeleteAccountSection />
      </div>
    </div>
  )
}
