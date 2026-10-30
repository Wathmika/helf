import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Copy, Check, MessageCircle, UserPlus } from 'lucide-react'
import {
  isOpenInvite,
  MAX_OPEN_INVITES,
  useCreateInvite,
  useInvites,
  useManagers,
  useRevokeInvite,
  type PersonDetail,
} from '../../lib/person'
import { initialOf } from '../../lib/user'
import { daysSince } from '../../lib/profiles'
import { Section } from './editorUi'
import { ghostButton, inputClass, primaryButton, smallButton } from './editorKit'

/** The one-time code from create_person_invite. It is never stored or
 * shown again (only its hash is kept), so this panel says so loudly and
 * offers the two ways people actually send it. */
function CodeReveal({ code, name, onDone }: { code: string; name: string; onDone: () => void }) {
  const { t } = useTranslation()
  const [copied, setCopied] = useState(false)
  const message = t('person.inviteMessage', { name, code, url: window.location.origin })
  return (
    <div role="alert" className="rounded-[12px] bg-[#fffbeb] border border-[#fde68a] p-4">
      <p className="text-[15px] font-bold text-[#92400e]">{t('person.codeOnceTitle')}</p>
      <p className="text-[13px] text-[#92400e] mt-1 leading-relaxed">{t('person.codeOnceBody')}</p>
      <p className="mt-3 text-[20px] sm:text-[24px] font-extrabold tracking-[0.04em] tabular-nums break-all select-all" aria-label={code.split('').join(' ')}>
        {code}
      </p>
      <div className="mt-3 flex flex-wrap gap-2">
        <button
          type="button"
          className={ghostButton}
          onClick={async () => {
            try {
              await navigator.clipboard.writeText(code)
              setCopied(true)
            } catch {
              setCopied(false)
            }
          }}
        >
          {copied ? <Check size={16} /> : <Copy size={16} />} {copied ? t('person.copied') : t('person.copyCode')}
        </button>
        <a className={ghostButton} href={`https://wa.me/?text=${encodeURIComponent(message)}`} target="_blank" rel="noreferrer">
          <MessageCircle size={16} /> {t('person.shareWhatsApp')}
        </a>
        <button type="button" className={primaryButton} onClick={onDone}>
          {t('person.codeSent')}
        </button>
      </div>
    </div>
  )
}

export function Sharing({ person }: { person: PersonDetail }) {
  const { t } = useTranslation()
  const name = person.display_name || person.full_name
  const isOwner = person.role === 'owner'
  const { data: managers } = useManagers(person.id)
  const { data: invites } = useInvites(person.id, isOwner)
  const create = useCreateInvite(person.id)
  const revoke = useRevokeInvite(person.id)
  const [note, setNote] = useState('')
  const [formOpen, setFormOpen] = useState(false)
  const [code, setCode] = useState<string | null>(null)
  const [failed, setFailed] = useState(false)

  const open = (invites ?? []).filter(isOpenInvite)
  const atLimit = open.length >= MAX_OPEN_INVITES
  const owner = managers?.find((m) => m.role === 'owner')

  return (
    <Section id="sharing" title={t('person.sharingTitle', { name })} description={t('person.sharingBody')}>
      <ul className="flex flex-col gap-2">
        {(managers ?? []).map((m) => (
          <li key={m.userId} className="rounded-[12px] bg-[var(--panel-row)] border border-[var(--border)] px-4 py-3 flex items-center gap-3">
            <span className="w-9 h-9 rounded-full bg-[var(--accent-soft)] text-[var(--accent-ink)] font-extrabold text-[14px] flex-none flex items-center justify-center">
              {initialOf(m.displayName)}
            </span>
            <span className="flex-1 min-w-0 text-[15px] font-semibold truncate">
              {m.displayName ?? t('person.noName')}
              {m.isYou && <span className="font-normal text-[var(--muted)]"> · {t('person.you')}</span>}
            </span>
            <span className="text-[12px] font-semibold px-2 py-0.5 rounded-full bg-[var(--raised)] text-[var(--muted)] flex-none">
              {m.role === 'owner' ? t('person.roleOwner') : t('person.roleEditor')}
            </span>
          </li>
        ))}
      </ul>

      {!isOwner && <p className="text-[14px] text-[var(--muted)] mt-4">{t('person.onlyOwnerInvites', { name: owner?.displayName ?? t('person.theOwner') })}</p>}

      {isOwner && (
        <div className="mt-5 flex flex-col gap-3">
          {code && <CodeReveal code={code} name={name} onDone={() => setCode(null)} />}

          {open.length > 0 && (
            <div>
              <p className="text-[13px] font-semibold text-[var(--muted)] mb-2">{t('person.openInvites', { count: open.length })}</p>
              <ul className="flex flex-col gap-2">
                {open.map((inv) => {
                  const left = Math.max(0, -daysSince(inv.expires_at))
                  return (
                    <li key={inv.id} className="rounded-[12px] bg-[var(--panel-row)] border border-dashed border-[var(--control)] pl-4 pr-2 py-2 flex flex-wrap items-center gap-x-3 gap-y-1">
                      <div className="flex-1 min-w-[160px] py-1">
                        <p className="text-[14px] font-semibold">{inv.note || t('person.inviteNoNote')}</p>
                        <p className="text-[13px] text-[var(--muted)]">{t('person.inviteExpires', { count: left })}</p>
                      </div>
                      <button type="button" className={`${smallButton} text-[var(--negative-ink)] hover:bg-[var(--negative-soft)]`} onClick={() => revoke.mutate(inv.id)}>
                        {t('person.cancelInvite')}
                      </button>
                    </li>
                  )
                })}
              </ul>
            </div>
          )}

          {!code &&
            (formOpen ? (
              <form
                className="rounded-[12px] bg-[var(--surface)] border border-[var(--accent)] p-4 flex flex-col gap-3"
                onSubmit={async (e) => {
                  e.preventDefault()
                  setFailed(false)
                  try {
                    const raw = await create.mutateAsync(note.trim() || null)
                    setCode(raw)
                    setNote('')
                    setFormOpen(false)
                  } catch {
                    setFailed(true)
                  }
                }}
              >
                <div>
                  <label htmlFor="invite-note" className="block text-[14px] font-semibold mb-1.5">
                    {t('person.inviteNote')}
                  </label>
                  <input id="invite-note" autoFocus maxLength={60} className={inputClass} value={note} placeholder={t('person.inviteNotePlaceholder')} onChange={(e) => setNote(e.target.value)} />
                  <p className="text-[13px] text-[var(--muted)] mt-1.5">{t('person.inviteNoteHint')}</p>
                </div>
                {failed && <p className="text-[13px] font-semibold text-[var(--negative)]">{t('auth.errorGeneric')}</p>}
                <div className="flex flex-wrap gap-2">
                  <button type="submit" className={primaryButton} disabled={create.isPending}>
                    {t('person.makeCode')}
                  </button>
                  <button type="button" className={ghostButton} onClick={() => setFormOpen(false)}>
                    {t('person.cancel')}
                  </button>
                </div>
              </form>
            ) : (
              <div className="flex flex-wrap items-center gap-3">
                <button type="button" className={ghostButton} disabled={atLimit} onClick={() => setFormOpen(true)}>
                  <UserPlus size={16} /> {t('person.inviteSomeone')}
                </button>
                {atLimit && <p className="text-[13px] text-[var(--muted)]">{t('person.invitesLimit', { max: MAX_OPEN_INVITES })}</p>}
              </div>
            ))}
        </div>
      )}
    </Section>
  )
}
