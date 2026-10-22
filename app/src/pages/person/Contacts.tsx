import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { ArrowUp, Bell, BellOff } from 'lucide-react'
import { buildPhone, COUNTRY_OPTIONS, isSriLankanMobile, normalizePhone, prettyPhone } from '../../lib/phone'
import {
  CONTACT_RELATIONSHIPS,
  MAX_CONTACTS,
  useListMutations,
  useSwapContacts,
  type ContactRelationship,
  type EmergencyContact,
  type PersonDetail,
} from '../../lib/person'
import { Section } from './editorUi'
import { iconButton, inputClass, useSave } from './editorKit'
import { useRelationshipLabel } from './relationship'
import { FormActions, FormField, ItemList, type ItemFormProps } from './ItemList'

type ContactValues = Pick<EmergencyContact, 'name' | 'relationship' | 'phone_e164' | 'email' | 'notify_on_scan'>

const LOOKS_LIKE_EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

function splitPhone(e164: string | undefined): { country: string; local: string } {
  if (!e164) return { country: '94', local: '' }
  const digits = e164.replace(/\D/g, '')
  const match = COUNTRY_OPTIONS.find((c) => digits.startsWith(c.code))
  return match ? { country: match.code, local: digits.slice(match.code.length) } : { country: '94', local: digits }
}

function ContactForm({ initial, submitLabel, onSubmit, onCancel }: ItemFormProps<ContactValues>) {
  const { t } = useTranslation()
  const relLabel = useRelationshipLabel()
  const start = splitPhone(initial?.phone_e164)
  const [name, setName] = useState(initial?.name ?? '')
  const [relationship, setRelationship] = useState<ContactRelationship>(initial?.relationship ?? 'daughter')
  const [country, setCountry] = useState(start.country)
  const [local, setLocal] = useState(start.local)
  const [email, setEmail] = useState(initial?.email ?? '')
  const [errors, setErrors] = useState<{ name?: boolean; phone?: string; email?: boolean }>({})

  const built = local ? buildPhone(country, local) : null
  // A Sri Lankan landline can still be a call button; it just can't get texts.
  const landline = built?.problem === 'srilankaMobile'

  return (
    <form
      className="grid gap-3 sm:grid-cols-2"
      onSubmit={(e) => {
        e.preventDefault()
        const next: typeof errors = {}
        if (!name.trim()) next.name = true
        const digits = built?.digits ?? ''
        if (!built || built.problem === 'tooShort' || built.problem === 'country' || !/^[1-9]\d{7,14}$/.test(digits))
          next.phone = built?.problem === 'country' ? t('person.phoneCountry') : t('person.phoneInvalid')
        if (email.trim() && !LOOKS_LIKE_EMAIL.test(email.trim())) next.email = true
        setErrors(next)
        if (Object.keys(next).length) return
        onSubmit({
          name: name.trim(),
          relationship,
          phone_e164: `+${normalizePhone(digits)}`,
          email: email.trim() || null,
          notify_on_scan: initial?.notify_on_scan ?? true,
        })
      }}
    >
      <FormField label={t('person.contactName')} htmlFor="ec-name">
        <input id="ec-name" autoFocus maxLength={60} className={inputClass} aria-invalid={errors.name || undefined} value={name} onChange={(e) => setName(e.target.value)} />
        {errors.name && <p className="text-[13px] font-semibold text-[var(--negative)] mt-1.5">{t('person.required')}</p>}
      </FormField>
      <FormField label={t('person.relationship')} htmlFor="ec-rel">
        <select id="ec-rel" className={inputClass} value={relationship} onChange={(e) => setRelationship(e.target.value as ContactRelationship)}>
          {CONTACT_RELATIONSHIPS.map((r) => (
            <option key={r} value={r}>
              {relLabel(r)}
            </option>
          ))}
        </select>
      </FormField>
      <div className="sm:col-span-2">
        <FormField
          label={t('person.phone')}
          htmlFor="ec-phone"
          hint={landline && !errors.phone ? t('person.landlineHint') : undefined}
        >
          <div className="flex gap-2">
            <select aria-label={t('auth.countryCode')} className={`${inputClass} w-[118px] flex-none px-2.5`} value={country} onChange={(e) => setCountry(e.target.value)}>
              {COUNTRY_OPTIONS.map((c) => (
                <option key={c.code} value={c.code}>
                  {c.label}
                </option>
              ))}
            </select>
            <input
              id="ec-phone"
              type="tel"
              inputMode="tel"
              autoComplete="off"
              className={inputClass}
              aria-invalid={Boolean(errors.phone) || undefined}
              value={local}
              placeholder="77 123 4567"
              onChange={(e) => setLocal(e.target.value)}
            />
          </div>
          {errors.phone && <p className="text-[13px] font-semibold text-[var(--negative)] mt-1.5">{errors.phone}</p>}
        </FormField>
      </div>
      <div className="sm:col-span-2">
        <FormField label={t('person.emailOptional')} htmlFor="ec-email" hint={t('person.emailHint')}>
          <input id="ec-email" type="email" inputMode="email" autoComplete="off" maxLength={254} className={inputClass} aria-invalid={errors.email || undefined} value={email} onChange={(e) => setEmail(e.target.value)} />
          {errors.email && <p className="text-[13px] font-semibold text-[var(--negative)] mt-1.5">{t('auth.errorEmail')}</p>}
        </FormField>
      </div>
      <div className="sm:col-span-2">
        <FormActions submitLabel={submitLabel} onCancel={onCancel} />
      </div>
    </form>
  )
}

export function Contacts({ person }: { person: PersonDetail }) {
  const { t } = useTranslation()
  const { track } = useSave()
  const relLabel = useRelationshipLabel()
  const m = useListMutations(person.id, 'emergency_contacts')
  const swap = useSwapContacts(person.id)
  const items = [...person.emergency_contacts].sort((a, b) => a.priority - b.priority)
  const freePriority = [1, 2, 3].find((p) => !items.some((c) => c.priority === p)) ?? 3

  return (
    <Section id="contacts" title={t('person.contactsTitle')} description={t('person.contactsBody')}>
      <ItemList<EmergencyContact, ContactValues>
        items={items}
        addLabel={t('person.addContact')}
        emptyText={t('person.contactsEmpty')}
        limit={{ max: MAX_CONTACTS, reason: t('person.contactsLimit') }}
        fieldName={(c) => c.name}
        toValues={({ name, relationship, phone_e164, email, notify_on_scan }) => ({ name, relationship, phone_e164, email, notify_on_scan })}
        summary={(c) => (
          <div className="flex items-start gap-3">
            <span className="w-7 h-7 mt-0.5 rounded-full bg-[var(--surface)] border border-[var(--border)] flex-none flex items-center justify-center text-[13px] font-bold tabular-nums" title={t('person.callOrder', { n: c.priority })}>
              {c.priority}
            </span>
            <div className="min-w-0">
              <p className="text-[15px] font-bold">
                {c.name} <span className="font-normal text-[var(--muted)]">· {relLabel(c.relationship)}</span>
              </p>
              <p className="text-[13px] text-[var(--muted)] mt-0.5 tabular-nums">
                {prettyPhone(c.phone_e164)}
                {c.email && <> · {c.email}</>}
              </p>
              {!isSriLankanMobile(c.phone_e164.slice(1)) && c.phone_e164.startsWith('+94') && (
                <p className="text-[12.5px] text-[var(--warning-ink)] mt-0.5">{t('person.landlineShort')}</p>
              )}
            </div>
          </div>
        )}
        extraControls={(c) => {
          const index = items.indexOf(c)
          return (
            <>
              <button
                type="button"
                aria-pressed={c.notify_on_scan}
                onClick={() => track(m.update.mutateAsync({ id: c.id, patch: { notify_on_scan: !c.notify_on_scan } }))}
                title={c.notify_on_scan ? t('person.alertedOn') : t('person.alertedOff')}
                aria-label={t('person.alertToggle', { name: c.name })}
                className={`h-11 px-2.5 rounded-[10px] inline-flex items-center gap-1.5 text-[13px] font-semibold transition-colors hover:bg-[var(--surface)] ${
                  c.notify_on_scan ? 'text-[var(--text)]' : 'text-[var(--muted)]'
                }`}
              >
                {c.notify_on_scan ? <Bell size={16} /> : <BellOff size={16} />}
                <span className="hidden sm:inline">{c.notify_on_scan ? t('person.alerted') : t('person.notAlerted')}</span>
              </button>
              <button
                type="button"
                className={iconButton}
                disabled={index === 0 || swap.isPending}
                aria-label={t('person.moveUp', { name: c.name })}
                onClick={() => track(swap.mutateAsync({ a: c, b: items[index - 1] }))}
              >
                <ArrowUp size={16} />
              </button>
            </>
          )
        }}
        Form={ContactForm}
        onAdd={(v) => track(m.add.mutateAsync({ ...v, priority: freePriority, show_on_scan: true }))}
        onUpdate={(c, v) => track(m.update.mutateAsync({ id: c.id, patch: v }))}
        onDelete={(c) => track(m.remove.mutateAsync(c.id))}
        onToggle={(c) => track(m.update.mutateAsync({ id: c.id, patch: { show_on_scan: !c.show_on_scan } }))}
      />
      <p className="text-[13px] text-[var(--muted)] mt-4 leading-relaxed">{t('person.contactsSwitchesNote')}</p>
    </Section>
  )
}
