import { ArrowLeft } from "lucide-react"
import { useState, type FormEvent } from "react"
import { useTranslation } from "react-i18next"
import { Link, useNavigate } from "react-router-dom"

import { Button } from "@/components/Button"
import { useAcceptPersonInvite } from "@/hooks/useInvites"
import type { ProfileFor } from "@/types/database"

const PROFILE_FOR_OPTIONS: ProfileFor[] = ["parent", "spouse", "child", "self", "other"]

export function JoinByCodeScreen() {
  const { t } = useTranslation()
  const navigate = useNavigate()
  const accept = useAcceptPersonInvite()
  const [code, setCode] = useState("")
  const [personIsMy, setPersonIsMy] = useState<ProfileFor>("parent")

  function handleSubmit(event: FormEvent) {
    event.preventDefault()
    const trimmed = code.trim()
    if (!trimmed) return
    accept.mutate(
      { code: trimmed, personIsMy },
      {
        onSuccess: (personId) => navigate(`/app/profiles/${personId}`),
      },
    )
  }

  return (
    <div className="mx-auto max-w-md px-4 py-6 sm:px-6 sm:py-10">
      <Link to="/app" className="mb-4 inline-flex items-center gap-1.5 text-sm font-medium text-gray-500 hover:text-gray-700">
        <ArrowLeft size={16} />
        {t("sharing.join.backToProfiles")}
      </Link>

      <h1 className="mb-1 text-2xl font-bold text-gray-900">{t("sharing.join.title")}</h1>
      <p className="mb-6 text-sm text-gray-500">{t("sharing.join.subtitle")}</p>

      <form onSubmit={handleSubmit} className="flex flex-col gap-4">
        <div>
          <label htmlFor="invite-code" className="mb-1.5 block text-sm font-medium text-gray-700">
            {t("sharing.join.codeLabel")}
          </label>
          <input
            id="invite-code"
            type="text"
            value={code}
            onChange={(event) => setCode(event.target.value)}
            placeholder={t("sharing.join.codePlaceholder")}
            required
            className="w-full rounded-xl border border-gray-200 px-4 py-2.5 text-base tracking-widest focus:border-brand-500 focus:outline-none"
          />
        </div>

        <div>
          <label htmlFor="person-is-my" className="mb-1.5 block text-sm font-medium text-gray-700">
            {t("sharing.join.relationshipLabel")}
          </label>
          <select
            id="person-is-my"
            value={personIsMy}
            onChange={(event) => setPersonIsMy(event.target.value as ProfileFor)}
            className="w-full rounded-xl border border-gray-200 px-4 py-2.5 text-base focus:border-brand-500 focus:outline-none"
          >
            {PROFILE_FOR_OPTIONS.map((option) => (
              <option key={option} value={option}>
                {t(`enums.profileFor.${option}`)}
              </option>
            ))}
          </select>
        </div>

        {accept.isError && <p className="text-sm text-danger-600">{t("sharing.join.errors.failed")}</p>}

        <Button type="submit" disabled={accept.isPending} className="mt-2">
          {accept.isPending ? t("sharing.join.joining") : t("sharing.join.submitCta")}
        </Button>
      </form>
    </div>
  )
}
