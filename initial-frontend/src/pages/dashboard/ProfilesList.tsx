import { Plus, UserRound } from "lucide-react"
import { useState, type FormEvent } from "react"
import { useTranslation } from "react-i18next"
import { Link, useNavigate } from "react-router-dom"

import { Button } from "@/components/Button"
import { Modal } from "@/components/Modal"
import { Spinner } from "@/components/Spinner"
import { useCreatePerson, useProfiles, type ProfileCard } from "@/hooks/useProfiles"
import { computeFreshness } from "@/lib/freshness"
import { LIMITS, type ProfileFor } from "@/types/database"

const PROFILE_FOR_OPTIONS: ProfileFor[] = ["self", "parent", "child", "spouse", "other"]

function FreshnessBadge({ card }: { card: ProfileCard }) {
  const { t } = useTranslation()
  const { days, stale } = computeFreshness(card.people.content_updated_at, card.people.info_confirmed_at)

  if (stale) {
    return (
      <span className="inline-flex items-center rounded-full bg-amber-50 px-2.5 py-1 text-xs font-medium text-amber-700">
        {t("dashboard.freshness.needsReview")}
      </span>
    )
  }
  if (days <= 0) {
    return (
      <span className="inline-flex items-center rounded-full bg-gray-50 px-2.5 py-1 text-xs font-medium text-gray-500">
        {t("dashboard.freshness.updatedToday")}
      </span>
    )
  }
  return (
    <span className="inline-flex items-center rounded-full bg-gray-50 px-2.5 py-1 text-xs font-medium text-gray-500">
      {t("dashboard.freshness.updatedDaysAgo", { count: days })}
    </span>
  )
}

function ProfileCardItem({ card }: { card: ProfileCard }) {
  const { t } = useTranslation()
  const navigate = useNavigate()
  const name = card.people.display_name ?? card.people.full_name

  return (
    <button
      type="button"
      onClick={() => navigate(`/app/profiles/${card.people.id}`)}
      className="flex w-full items-center gap-4 rounded-2xl border border-gray-100 bg-white p-4 text-left shadow-sm transition-colors hover:border-brand-200 hover:bg-brand-50/30"
    >
      <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-brand-50 text-brand-700">
        <UserRound size={24} />
      </span>
      <span className="min-w-0 flex-1">
        <span className="block truncate font-semibold text-gray-900">{name}</span>
        <span className="block text-sm text-gray-500">{t(`enums.profileFor.${card.person_is_my}`)}</span>
      </span>
      <FreshnessBadge card={card} />
    </button>
  )
}

function AddProfileModal({ open, onClose }: { open: boolean; onClose: () => void }) {
  const { t } = useTranslation()
  const createPerson = useCreatePerson()
  const [fullName, setFullName] = useState("")
  const [profileFor, setProfileFor] = useState<ProfileFor>("self")

  function handleClose() {
    setFullName("")
    setProfileFor("self")
    createPerson.reset()
    onClose()
  }

  function handleSubmit(event: FormEvent) {
    event.preventDefault()
    const trimmed = fullName.trim()
    if (!trimmed) return
    createPerson.mutate(
      { fullName: trimmed, profileFor },
      { onSuccess: () => handleClose() },
    )
  }

  return (
    <Modal open={open} onClose={handleClose} title={t("dashboard.newProfileModal.title")}>
      <form onSubmit={handleSubmit} className="flex flex-col gap-4">
        <div>
          <label htmlFor="full-name" className="mb-1.5 block text-sm font-medium text-gray-700">
            {t("dashboard.newProfileModal.nameLabel")}
          </label>
          <input
            id="full-name"
            type="text"
            value={fullName}
            onChange={(event) => setFullName(event.target.value)}
            placeholder={t("dashboard.newProfileModal.namePlaceholder")}
            maxLength={LIMITS.personFullName.max}
            required
            className="w-full rounded-xl border border-gray-200 px-4 py-2.5 text-base focus:border-brand-500 focus:outline-none"
          />
        </div>

        <div>
          <label htmlFor="profile-for" className="mb-1.5 block text-sm font-medium text-gray-700">
            {t("dashboard.newProfileModal.relationshipLabel")}
          </label>
          <select
            id="profile-for"
            value={profileFor}
            onChange={(event) => setProfileFor(event.target.value as ProfileFor)}
            className="w-full rounded-xl border border-gray-200 px-4 py-2.5 text-base focus:border-brand-500 focus:outline-none"
          >
            {PROFILE_FOR_OPTIONS.map((option) => (
              <option key={option} value={option}>
                {t(`enums.profileFor.${option}`)}
              </option>
            ))}
          </select>
        </div>

        {createPerson.isError && (
          <p className="text-sm text-danger-600">{t("dashboard.errors.createFailed")}</p>
        )}

        <Button type="submit" disabled={createPerson.isPending} className="mt-2">
          {createPerson.isPending ? t("dashboard.newProfileModal.creating") : t("dashboard.newProfileModal.createCta")}
        </Button>
      </form>
    </Modal>
  )
}

export function ProfilesList() {
  const { t } = useTranslation()
  const { data: profiles, isLoading, isError } = useProfiles()
  const [modalOpen, setModalOpen] = useState(false)

  const atCap = (profiles?.length ?? 0) >= LIMITS.maxProfilesPerUser

  return (
    <div className="mx-auto max-w-2xl px-4 py-6 sm:px-6 sm:py-10">
      <div className="mb-6 flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-900">{t("dashboard.title")}</h1>
        <div className="flex items-center gap-3">
          <Link to="/app/join" className="text-sm font-medium text-brand-700 hover:underline">
            {t("dashboard.haveInviteCode")}
          </Link>
          {!!profiles?.length && (
            <Button size="sm" onClick={() => setModalOpen(true)} disabled={atCap}>
              <Plus size={18} />
              {t("dashboard.addProfile")}
            </Button>
          )}
        </div>
      </div>

      {atCap && (
        <p className="mb-4 rounded-xl bg-amber-50 px-4 py-3 text-sm text-amber-700">
          {t("dashboard.capReached", { max: LIMITS.maxProfilesPerUser })}
        </p>
      )}

      {isLoading && (
        <div className="flex justify-center py-16">
          <Spinner />
        </div>
      )}

      {isError && (
        <p className="rounded-xl bg-danger-50 px-4 py-3 text-sm text-danger-700">{t("common.error.generic")}</p>
      )}

      {!isLoading && !isError && profiles?.length === 0 && (
        <div className="flex flex-col items-center gap-4 rounded-2xl border border-dashed border-gray-200 px-6 py-14 text-center">
          <span className="flex h-14 w-14 items-center justify-center rounded-full bg-brand-50 text-brand-700">
            <UserRound size={28} />
          </span>
          <h2 className="text-lg font-semibold text-gray-900">{t("dashboard.emptyState.title")}</h2>
          <p className="max-w-sm text-sm text-gray-500">{t("dashboard.emptyState.body")}</p>
          <Button onClick={() => setModalOpen(true)}>{t("dashboard.emptyState.cta")}</Button>
          <Link to="/app/join" className="text-sm font-medium text-brand-700 hover:underline">
            {t("dashboard.haveInviteCode")}
          </Link>
        </div>
      )}

      {!isLoading && !isError && !!profiles?.length && (
        <div className="flex flex-col gap-3">
          {profiles.map((card) => (
            <ProfileCardItem key={card.person_id} card={card} />
          ))}
        </div>
      )}

      <AddProfileModal open={modalOpen} onClose={() => setModalOpen(false)} />
    </div>
  )
}
