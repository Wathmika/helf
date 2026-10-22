import { useEffect, useRef, useState, type ReactNode } from 'react'
import { useNavigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { useQueryClient } from '@tanstack/react-query'
import { Check, Download, TriangleAlert } from 'lucide-react'
import { canDeleteAccount, DELETE_PHRASE, deleteAccount, downloadPersonData, useDeletionPlan, useUpdateAppUser, type DeletionStep } from '../../lib/account'
import { useProfiles } from '../../lib/profiles'
import { useAppUser } from '../../lib/user'
import { useSession } from '../../lib/session'
import { prettyPhone } from '../../lib/phone'
import { AutoInput, SaveProvider, SaveStamp } from '../person/editorUi'
import { ghostButton, inputClass, smallButton, useSave } from '../person/editorKit'

/*
  Account (spec §7), in the settings layout of the dealt style: each section
  is a row — its title and a sentence on the left, its panel on the right —
  stacked on a phone. One save model: name and language save themselves,
  with the "Saved" stamp in the title row. The danger zone comes last.
*/

const LANGS = [
  { code: 'si', native: 'සිංහල', latin: 'Sinhala' },
  { code: 'ta', native: 'தமிழ்', latin: 'Tamil' },
  { code: 'en', native: 'English', latin: 'English' },
] as const

function Row({ id, title, body, tone, children }: { id: string; title: string; body: ReactNode; tone?: 'danger'; children: ReactNode }) {
  return (
    <section aria-labelledby={`${id}-h`} className="grid gap-4 lg:grid-cols-[minmax(0,340px)_minmax(0,1fr)] lg:gap-10 py-8 border-t border-[var(--rule)] first:border-t-0 first:pt-2">
      <div>
        <h2 id={`${id}-h`} className={`text-[17px] font-bold ${tone === 'danger' ? 'text-[var(--negative-ink)]' : ''}`}>
          {title}
        </h2>
        <div className="text-[14px] text-[var(--muted)] mt-1.5 leading-relaxed">{body}</div>
      </div>
      <div className={`rounded-[16px] p-4 sm:p-5 ${tone === 'danger' ? 'bg-[var(--negative-soft)]/50 border border-[#f3cdc9]' : 'bg-[var(--panel)]'}`}>{children}</div>
    </section>
  )
}

function Details() {
  const { t, i18n } = useTranslation()
  const { track } = useSave()
  const { data: user } = useAppUser()
  const { session } = useSession()
  const update = useUpdateAppUser()
  const language = (i18n.resolvedLanguage ?? 'si') as 'si' | 'ta' | 'en'
  const signedInWith = session?.user.phone ? prettyPhone(`+${session.user.phone.replace(/^\+/, '')}`) : session?.user.email ?? null

  const save = (next: { displayName?: string; language?: 'si' | 'ta' | 'en' }) =>
    track(update.mutateAsync({ displayName: next.displayName ?? user?.displayName ?? '', language: next.language ?? language }))

  return (
    <Row id="details" title={t('account.detailsTitle')} body={t('account.detailsBody')}>
      <label htmlFor="display_name" className="block text-[14px] font-semibold mb-1.5">
        {t('account.name')}
      </label>
      <AutoInput id="display_name" required maxLength={60} value={user?.displayName ?? ''} autoComplete="name" onSave={(v) => save({ displayName: v ?? '' })} />
      <p className="text-[13px] text-[var(--muted)] mt-2">{t('account.nameHint')}</p>

      <p className="text-[14px] font-semibold mt-6 mb-2">{t('account.language')}</p>
      <div role="radiogroup" aria-label={t('account.language')} className="grid grid-cols-3 gap-2">
        {LANGS.map((l) => {
          const on = language === l.code
          return (
            <button
              key={l.code}
              type="button"
              role="radio"
              aria-checked={on}
              onClick={() => {
                void i18n.changeLanguage(l.code)
                save({ language: l.code })
              }}
              className={`relative min-h-[72px] rounded-[12px] border-2 px-3 py-3 text-left transition-colors ${
                on ? 'bg-[var(--surface)] border-[var(--accent)]' : 'bg-[var(--panel-row)] border-[var(--border)] hover:border-[var(--control)]'
              }`}
            >
              <span lang={l.code} className="block text-[17px] font-bold">
                {l.native}
              </span>
              {l.code !== 'en' && (
                <span lang="en" className="block text-[12.5px] text-[var(--muted)]">
                  {l.latin}
                </span>
              )}
              {on && (
                <span aria-hidden className="absolute top-2.5 right-2.5 w-5 h-5 rounded-full bg-[var(--deep)] text-white flex items-center justify-center">
                  <Check size={12} strokeWidth={3.5} />
                </span>
              )}
            </button>
          )
        })}
      </div>
      <p className="text-[13px] text-[var(--muted)] mt-2">{t('account.languageHint')}</p>

      <div className="mt-6 pt-5 border-t border-[var(--rule)]">
        <p className="text-[14px] font-semibold">{t('account.signIn')}</p>
        <p className="text-[14px] text-[var(--muted)] mt-1 tabular-nums">{signedInWith ?? t('account.signInDemo')}</p>
      </div>
    </Row>
  )
}

function DataDownload() {
  const { t } = useTranslation()
  const { data: profiles } = useProfiles()
  const [busy, setBusy] = useState<string | null>(null)
  const [failed, setFailed] = useState<string | null>(null)
  return (
    <Row id="data" title={t('account.dataTitle')} body={t('account.dataBody')}>
      {profiles && profiles.length === 0 && <p className="text-[14px] text-[var(--muted)]">{t('account.dataNone')}</p>}
      <ul className="flex flex-col gap-2">
        {(profiles ?? []).map((p) => {
          const name = p.displayName ?? p.fullName
          return (
            <li key={p.personId} className="rounded-[12px] bg-[var(--panel-row)] border border-[var(--border)] pl-4 pr-2 py-2 flex flex-wrap items-center justify-between gap-x-3 gap-y-1">
              <div className="min-w-0 py-1">
                <p className="text-[15px] font-bold truncate">{name}</p>
                {failed === p.personId && <p className="text-[13px] font-semibold text-[var(--negative)]">{t('auth.errorGeneric')}</p>}
              </div>
              <button
                type="button"
                className={ghostButton}
                disabled={busy === p.personId}
                onClick={async () => {
                  setBusy(p.personId)
                  setFailed(null)
                  try {
                    await downloadPersonData(p.personId, name)
                  } catch {
                    setFailed(p.personId)
                  } finally {
                    setBusy(null)
                  }
                }}
              >
                <Download size={16} /> {t('account.download')}
              </button>
            </li>
          )
        })}
      </ul>
      <p className="text-[13px] text-[var(--muted)] mt-3 leading-relaxed">{t('account.dataWhat')}</p>
    </Row>
  )
}

function Outcome({ step }: { step: DeletionStep }) {
  const { t } = useTranslation()
  const name = step.profile.displayName ?? step.profile.fullName
  const text =
    step.outcome === 'handover'
      ? t('account.outcomeHandover', { name, heir: step.heir ?? t('account.coManager') })
      : step.outcome === 'delete'
        ? t('account.outcomeDelete', { name })
        : t('account.outcomeLeave', { name })
  return (
    <li className="flex gap-2.5 text-[14px] leading-relaxed">
      <span aria-hidden className={`mt-[7px] w-2 h-2 rounded-full flex-none ${step.outcome === 'delete' ? 'bg-[var(--negative)]' : 'bg-[var(--control)]'}`} />
      <span className={step.outcome === 'delete' ? 'font-semibold' : ''}>{text}</span>
    </li>
  )
}

function DeleteDialog({ open, onClose, steps }: { open: boolean; onClose: () => void; steps: DeletionStep[] }) {
  const { t } = useTranslation()
  const ref = useRef<HTMLDialogElement>(null)
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const [typed, setTyped] = useState('')
  const [busy, setBusy] = useState(false)
  const [failed, setFailed] = useState(false)
  const matches = typed.trim() === DELETE_PHRASE
  const deleting = steps.filter((s) => s.outcome === 'delete').length

  useEffect(() => {
    const d = ref.current
    if (!d) return
    if (open && !d.open) {
      setTyped('')
      setFailed(false)
      d.showModal()
    }
    if (!open && d.open) d.close()
  }, [open])

  return (
    <dialog
      ref={ref}
      onClose={onClose}
      aria-labelledby="delete-h"
      className="m-auto w-[min(520px,calc(100vw-32px))] rounded-[20px] p-0 bg-[var(--surface)] text-[var(--text)] shadow-[0_24px_60px_-20px_rgba(10,30,28,0.45)] backdrop:bg-[rgba(10,30,28,0.45)]"
    >
      <form
        className="p-6"
        onSubmit={async (e) => {
          e.preventDefault()
          if (!matches) return
          setBusy(true)
          setFailed(false)
          try {
            await deleteAccount()
            queryClient.clear()
            ref.current?.close()
            navigate('/login', { replace: true, state: { accountDeleted: true } })
          } catch {
            setFailed(true)
            setBusy(false)
          }
        }}
      >
        <h2 id="delete-h" className="text-[20px] font-extrabold">
          {t('account.dialogTitle')}
        </h2>
        <p className="text-[15px] mt-2 leading-relaxed">{t('account.dialogBody', { count: deleting })}</p>
        <label htmlFor="delete-phrase" className="block text-[14px] font-semibold mt-5 mb-1.5">
          {t('account.typePhrase')} <span lang="en" className="font-extrabold tracking-wide">{DELETE_PHRASE}</span>
        </label>
        <input
          id="delete-phrase"
          lang="en"
          autoComplete="off"
          autoCapitalize="characters"
          spellCheck={false}
          className={inputClass}
          value={typed}
          onChange={(e) => setTyped(e.target.value)}
        />
        {failed && <p className="mt-3 text-[13px] font-semibold text-[var(--negative)]">{t('account.deleteFailed')}</p>}
        <div className="mt-6 flex flex-wrap gap-2 justify-end">
          <button type="button" className={ghostButton} onClick={onClose} autoFocus>
            {t('account.keepAccount')}
          </button>
          <button type="submit" disabled={!matches || busy} className={`${smallButton} bg-[var(--negative)] text-white hover:bg-[var(--negative-ink)]`}>
            {t('account.deleteForever')}
          </button>
        </div>
      </form>
    </dialog>
  )
}

function DangerZone() {
  const { t } = useTranslation()
  const { data: profiles } = useProfiles()
  const { data: steps = [] } = useDeletionPlan(profiles)
  const [open, setOpen] = useState(false)
  return (
    <Row id="delete" tone="danger" title={t('account.deleteTitle')} body={t('account.deleteBody')}>
      {steps.length > 0 && (
        <>
          <p className="text-[14px] font-semibold mb-2">{t('account.whatHappens')}</p>
          <ul className="flex flex-col gap-1.5">
            {steps.map((s) => (
              <Outcome key={s.profile.personId} step={s} />
            ))}
          </ul>
        </>
      )}
      <p className="text-[14px] text-[var(--muted)] mt-4 leading-relaxed">{t('account.keepTip')}</p>
      {!canDeleteAccount && (
        <p className="mt-4 text-[13px] text-[#92400e] flex gap-2">
          <TriangleAlert size={16} className="flex-none mt-0.5" /> {t('account.noApiUrl')}
        </p>
      )}
      <button
        type="button"
        disabled={!canDeleteAccount}
        onClick={() => setOpen(true)}
        className={`${smallButton} mt-5 bg-[var(--surface)] border border-[var(--negative)] text-[var(--negative-ink)] hover:bg-[var(--negative-soft)]`}
      >
        {t('account.deleteButton')}
      </button>
      <DeleteDialog open={open} onClose={() => setOpen(false)} steps={steps} />
    </Row>
  )
}

export function Account() {
  const { t } = useTranslation()
  return (
    <SaveProvider>
      <div className="w-full max-w-[1100px] mx-auto px-4 sm:px-6 xl:px-0 pt-6 md:pt-14">
        <header className="flex flex-wrap items-end justify-between gap-3">
          <div>
            <h1 className="text-[26px] md:text-[30px] font-extrabold tracking-[-0.015em] leading-tight">{t('account.title')}</h1>
            <p className="text-[15px] text-[var(--muted)] mt-1.5">{t('account.subtitle')}</p>
          </div>
          <SaveStamp />
        </header>
        <div className="mt-6 md:mt-8">
          <Details />
          <DataDownload />
          <DangerZone />
        </div>
      </div>
    </SaveProvider>
  )
}
