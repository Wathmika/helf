import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Lock } from 'lucide-react'
import {
  MED_KINDS,
  SEVERITIES,
  useListMutations,
  type Allergy,
  type Condition,
  type Medication,
  type MedKind,
  type PersonDetail,
  type Severity,
} from '../../lib/person'
import { Section, Segmented } from './editorUi'
import { inputClass, useSave, useToday } from './editorKit'
import { FormActions, FormField, ItemList, type ItemFormProps } from './ItemList'

const pill = 'inline-flex items-center text-[12px] font-semibold px-2 py-0.5 rounded-full whitespace-nowrap flex-none'
const sevTone: Record<Severity, string> = {
  life_threatening: 'bg-[var(--negative-soft)] text-[var(--negative-ink)]',
  severe: 'bg-[var(--negative-soft)] text-[var(--negative-ink)]',
  moderate: 'bg-[var(--warning-soft)] text-[var(--warning-ink)]',
  mild: 'bg-[var(--raised)] text-[var(--muted)]',
  unknown: 'bg-[var(--raised)] text-[var(--muted)]',
}

// ---- allergies -------------------------------------------------------------

type AllergyValues = Pick<Allergy, 'substance' | 'reaction' | 'severity'>

function AllergyForm({ initial, submitLabel, onSubmit, onCancel }: ItemFormProps<AllergyValues>) {
  const { t } = useTranslation()
  const [v, setV] = useState<AllergyValues>(initial ?? { substance: '', reaction: null, severity: 'unknown' })
  const [error, setError] = useState(false)
  return (
    <form
      className="grid gap-3 sm:grid-cols-2"
      onSubmit={(e) => {
        e.preventDefault()
        if (!v.substance.trim()) return setError(true)
        onSubmit({ substance: v.substance.trim(), reaction: v.reaction?.trim() || null, severity: v.severity })
      }}
    >
      <FormField label={t('person.substance')} htmlFor="al-substance">
        <input id="al-substance" autoFocus maxLength={80} className={inputClass} aria-invalid={error || undefined} value={v.substance} placeholder={t('person.substancePlaceholder')} onChange={(e) => setV({ ...v, substance: e.target.value })} />
        {error && <p className="text-[13px] font-semibold text-[var(--negative)] mt-1.5">{t('person.required')}</p>}
      </FormField>
      <FormField label={t('person.severity')} htmlFor="al-severity">
        <select id="al-severity" className={inputClass} value={v.severity} onChange={(e) => setV({ ...v, severity: e.target.value as Severity })}>
          {SEVERITIES.map((s) => (
            <option key={s} value={s}>
              {t(`person.sev.${s}`)}
            </option>
          ))}
        </select>
      </FormField>
      <div className="sm:col-span-2">
        <FormField label={t('person.reaction')} htmlFor="al-reaction">
          <input id="al-reaction" maxLength={120} className={inputClass} value={v.reaction ?? ''} placeholder={t('person.reactionPlaceholder')} onChange={(e) => setV({ ...v, reaction: e.target.value })} />
        </FormField>
      </div>
      <div className="sm:col-span-2">
        <FormActions submitLabel={submitLabel} onCancel={onCancel} />
      </div>
    </form>
  )
}

export function Allergies({ person }: { person: PersonDetail }) {
  const { t } = useTranslation()
  const { track } = useSave()
  const m = useListMutations(person.id, 'allergies')
  return (
    <Section id="allergies" title={t('person.allergiesTitle')} description={t('person.allergiesBody')}>
      <ItemList<Allergy, AllergyValues>
        items={person.allergies}
        addLabel={t('person.addAllergy')}
        emptyText={t('person.allergiesEmpty')}
        fieldName={(a) => a.substance}
        toValues={(a) => ({ substance: a.substance, reaction: a.reaction, severity: a.severity })}
        summary={(a) => (
          <>
            <p className="flex flex-wrap items-center gap-2">
              <span className="text-[15px] font-bold">{a.substance}</span>
              <span className={`${pill} ${sevTone[a.severity]}`}>{t(`person.sev.${a.severity}`)}</span>
            </p>
            {a.reaction && <p className="text-[13px] text-[var(--muted)] mt-0.5">{a.reaction}</p>}
          </>
        )}
        Form={AllergyForm}
        onAdd={(v) => track(m.add.mutateAsync({ ...v, show_on_scan: true }))}
        onUpdate={(a, v) => track(m.update.mutateAsync({ id: a.id, patch: v }))}
        onDelete={(a) => track(m.remove.mutateAsync(a.id))}
        onToggle={(a) => track(m.update.mutateAsync({ id: a.id, patch: { show_on_scan: !a.show_on_scan } }))}
      />
    </Section>
  )
}

// ---- conditions ------------------------------------------------------------

type ConditionValues = Pick<Condition, 'name' | 'since_year' | 'notes'>

function ConditionForm({ initial, submitLabel, onSubmit, onCancel }: ItemFormProps<ConditionValues>) {
  const { t } = useTranslation()
  const [v, setV] = useState({ name: initial?.name ?? '', since: initial?.since_year ? String(initial.since_year) : '', notes: initial?.notes ?? '' })
  const [error, setError] = useState<'name' | 'year' | null>(null)
  const thisYear = Number(useToday().slice(0, 4))
  return (
    <form
      className="grid gap-3 sm:grid-cols-[minmax(0,1fr)_160px]"
      onSubmit={(e) => {
        e.preventDefault()
        if (!v.name.trim()) return setError('name')
        const year = v.since ? Number(v.since) : null
        if (year !== null && (!Number.isInteger(year) || year < 1900 || year > thisYear)) return setError('year')
        onSubmit({ name: v.name.trim(), since_year: year, notes: v.notes.trim() || null })
      }}
    >
      <FormField label={t('person.conditionName')} htmlFor="c-name">
        <input id="c-name" autoFocus maxLength={120} className={inputClass} aria-invalid={error === 'name' || undefined} value={v.name} placeholder={t('person.conditionPlaceholder')} onChange={(e) => setV({ ...v, name: e.target.value })} />
        {error === 'name' && <p className="text-[13px] font-semibold text-[var(--negative)] mt-1.5">{t('person.required')}</p>}
      </FormField>
      <FormField label={t('person.sinceYear')} htmlFor="c-since">
        <input id="c-since" inputMode="numeric" maxLength={4} className={inputClass} aria-invalid={error === 'year' || undefined} value={v.since} placeholder={String(thisYear - 5)} onChange={(e) => setV({ ...v, since: e.target.value.replace(/\D/g, '') })} />
        {error === 'year' && <p className="text-[13px] font-semibold text-[var(--negative)] mt-1.5">{t('person.yearInvalid', { max: thisYear })}</p>}
      </FormField>
      <div className="sm:col-span-2">
        <FormField label={t('person.conditionNotes')} htmlFor="c-notes" hint={t('person.conditionNotesHint')}>
          <input id="c-notes" maxLength={200} className={inputClass} value={v.notes} onChange={(e) => setV({ ...v, notes: e.target.value })} />
        </FormField>
      </div>
      <div className="sm:col-span-2">
        <FormActions submitLabel={submitLabel} onCancel={onCancel} />
      </div>
    </form>
  )
}

export function Conditions({ person }: { person: PersonDetail }) {
  const { t } = useTranslation()
  const { track } = useSave()
  const m = useListMutations(person.id, 'conditions')
  return (
    <Section id="conditions" title={t('person.conditionsTitle')} description={t('person.conditionsBody')}>
      <ItemList<Condition, ConditionValues>
        items={person.conditions}
        addLabel={t('person.addCondition')}
        emptyText={t('person.conditionsEmpty')}
        fieldName={(c) => c.name}
        toValues={(c) => ({ name: c.name, since_year: c.since_year, notes: c.notes })}
        summary={(c) => (
          <>
            <p className="text-[15px] font-bold">
              {c.name}
              {c.since_year && <span className="font-normal text-[var(--muted)]"> · {t('person.since', { year: c.since_year })}</span>}
            </p>
            {c.notes && (
              <p className="text-[13px] text-[var(--muted)] mt-0.5 flex items-center gap-1.5">
                <Lock size={12} className="flex-none" /> {c.notes}
              </p>
            )}
          </>
        )}
        Form={ConditionForm}
        onAdd={(v) => track(m.add.mutateAsync({ ...v, show_on_scan: true }))}
        onUpdate={(c, v) => track(m.update.mutateAsync({ id: c.id, patch: v }))}
        onDelete={(c) => track(m.remove.mutateAsync(c.id))}
        onToggle={(c) => track(m.update.mutateAsync({ id: c.id, patch: { show_on_scan: !c.show_on_scan } }))}
      />
    </Section>
  )
}

// ---- medicines -------------------------------------------------------------

type MedicationValues = Pick<Medication, 'name' | 'dose' | 'frequency' | 'kind' | 'is_current' | 'started_on'>

function MedicationForm({ initial, submitLabel, onSubmit, onCancel }: ItemFormProps<MedicationValues>) {
  const { t } = useTranslation()
  const [v, setV] = useState<MedicationValues>(initial ?? { name: '', dose: null, frequency: null, kind: 'prescription', is_current: true, started_on: null })
  const [error, setError] = useState(false)
  const today = useToday()
  const set = (patch: Partial<MedicationValues>) => setV({ ...v, ...patch })
  return (
    <form
      className="grid gap-3 sm:grid-cols-2"
      onSubmit={(e) => {
        e.preventDefault()
        if (!v.name.trim()) return setError(true)
        onSubmit({ ...v, name: v.name.trim(), dose: v.dose?.trim() || null, frequency: v.frequency?.trim() || null, started_on: v.started_on || null })
      }}
    >
      <div className="sm:col-span-2">
        <FormField label={t('person.medName')} htmlFor="m-name">
          <input id="m-name" autoFocus maxLength={120} className={inputClass} aria-invalid={error || undefined} value={v.name} placeholder={t('person.medPlaceholder')} onChange={(e) => set({ name: e.target.value })} />
          {error && <p className="text-[13px] font-semibold text-[var(--negative)] mt-1.5">{t('person.required')}</p>}
        </FormField>
      </div>
      <FormField label={t('person.dose')} htmlFor="m-dose">
        <input id="m-dose" maxLength={60} className={inputClass} value={v.dose ?? ''} placeholder="5 mg" onChange={(e) => set({ dose: e.target.value })} />
      </FormField>
      <FormField label={t('person.frequency')} htmlFor="m-freq">
        <input id="m-freq" maxLength={60} className={inputClass} value={v.frequency ?? ''} placeholder={t('person.frequencyPlaceholder')} onChange={(e) => set({ frequency: e.target.value })} />
      </FormField>
      <FormField label={t('person.kind')} htmlFor="m-kind">
        <select id="m-kind" className={inputClass} value={v.kind} onChange={(e) => set({ kind: e.target.value as MedKind })}>
          {MED_KINDS.map((k) => (
            <option key={k} value={k}>
              {t(`person.kinds.${k}`)}
            </option>
          ))}
        </select>
      </FormField>
      <FormField label={t('person.startedOn')} htmlFor="m-started">
        <input id="m-started" type="date" min="1900-01-02" max={today} className={inputClass} value={v.started_on ?? ''} onChange={(e) => set({ started_on: e.target.value || null })} />
      </FormField>
      <div className="sm:col-span-2">
        <p className="text-[14px] font-semibold mb-1.5">{t('person.takingNow')}</p>
        <Segmented
          label={t('person.takingNow')}
          value={v.is_current ? 'current' : 'past'}
          options={[
            { value: 'current', label: t('person.current') },
            { value: 'past', label: t('person.past') },
          ]}
          onChange={(x) => set({ is_current: x === 'current' })}
        />
      </div>
      <div className="sm:col-span-2">
        <FormActions submitLabel={submitLabel} onCancel={onCancel} />
      </div>
    </form>
  )
}

export function Medicines({ person }: { person: PersonDetail }) {
  const { t } = useTranslation()
  const { track } = useSave()
  const m = useListMutations(person.id, 'medications')
  // Current medicines first; within each group, by name (the scan page's order).
  const items = [...person.medications].sort((a, b) => Number(b.is_current) - Number(a.is_current) || a.name.localeCompare(b.name))
  return (
    <Section id="medicines" title={t('person.medsTitle')} description={t('person.medsBody')}>
      <ItemList<Medication, MedicationValues>
        items={items}
        addLabel={t('person.addMed')}
        emptyText={t('person.medsEmpty')}
        fieldName={(x) => x.name}
        toValues={({ name, dose, frequency, kind, is_current, started_on }) => ({ name, dose, frequency, kind, is_current, started_on })}
        toggleDisabled={(x) => !x.is_current}
        summary={(x) => (
          <>
            <p className="flex flex-wrap items-center gap-2">
              <span className={`text-[15px] font-bold ${x.is_current ? '' : 'text-[var(--muted)]'}`}>{[x.name, x.dose].filter(Boolean).join(' ')}</span>
              <span className={`${pill} bg-[var(--raised)] text-[var(--muted)]`}>{t(`person.kinds.${x.kind}`)}</span>
              {!x.is_current && <span className={`${pill} bg-[var(--raised)] text-[var(--muted)]`}>{t('person.past')}</span>}
            </p>
            <p className="text-[13px] text-[var(--muted)] mt-0.5">{x.is_current ? x.frequency : t('person.pastNeverShown')}</p>
          </>
        )}
        Form={MedicationForm}
        // Private by default, as in the database (show_on_scan default false).
        onAdd={(v) => track(m.add.mutateAsync({ ...v, show_on_scan: false }))}
        onUpdate={(x, v) => track(m.update.mutateAsync({ id: x.id, patch: v }))}
        onDelete={(x) => track(m.remove.mutateAsync(x.id))}
        onToggle={(x) => track(m.update.mutateAsync({ id: x.id, patch: { show_on_scan: !x.show_on_scan } }))}
      />
    </Section>
  )
}
