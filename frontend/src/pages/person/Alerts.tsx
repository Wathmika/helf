import { useTranslation } from 'react-i18next'
import { Check } from 'lucide-react'
import { ALERT_CODES, useListMutations, type AlertCode, type PersonDetail } from '../../lib/person'
import { AutoInput, Section, Visibility } from './editorUi'
import { useSave } from './editorKit'

/** The fixed alert_code list as a checklist (spec §4.2): ticking one adds a
 * critical_alerts row, unticking deletes it. Labels are the scan page's own
 * words, so the family sees exactly what a helper will read. */
export function Alerts({ person }: { person: PersonDetail }) {
  const { t } = useTranslation()
  const { track } = useSave()
  const { add, update, remove } = useListMutations(person.id, 'critical_alerts')
  const byCode = new Map(person.critical_alerts.map((a) => [a.code, a]))
  const count = person.critical_alerts.length

  function toggle(code: AlertCode) {
    const row = byCode.get(code)
    if (row) track(remove.mutateAsync(row.id))
    else track(add.mutateAsync({ code, note: null, show_on_scan: true }))
  }

  return (
    <Section
      id="alerts"
      tone="alert"
      title={t('person.alertsTitle')}
      description={t('person.alertsBody')}
      aside={<span className="text-[13px] font-semibold text-[var(--muted)] pt-1">{t('person.alertsCount', { count })}</span>}
    >
      {/* Ticked alerts first, full width with their note and switch; the
          rest below as a two-column checklist. Both keep the enum's order,
          which is also the order on the scan page. */}
      {count > 0 && (
        <ul className="flex flex-col gap-2 mb-4">
          {ALERT_CODES.filter((code) => byCode.has(code)).map((code) => {
            const row = byCode.get(code)!
            const label = t(`scan.alert_${code}`)
            return (
              <li key={code} className="rounded-[12px] bg-[var(--surface)] border border-[#f5dcd6]">
                <div className="flex items-center gap-2 pr-2">
                  <AlertBox code={code} checked label={label} onToggle={toggle} />
                  <Visibility on={row.show_on_scan} field={label} onToggle={() => track(update.mutateAsync({ id: row.id, patch: { show_on_scan: !row.show_on_scan } }))} />
                </div>
                <div className="px-3.5 pb-3.5">
                  <label htmlFor={`alert-note-${code}`} className="block text-[13px] font-semibold text-[var(--muted)] mb-1.5">
                    {t('person.alertNote')}
                  </label>
                  <AutoInput
                    id={`alert-note-${code}`}
                    maxLength={120}
                    placeholder={t(`person.alertNotePlaceholder.${code}`)}
                    value={row.note}
                    onSave={(note) => track(update.mutateAsync({ id: row.id, patch: { note } }))}
                  />
                </div>
              </li>
            )
          })}
        </ul>
      )}
      {count < ALERT_CODES.length && (
        <>
          {count > 0 && <p className="text-[13px] font-semibold text-[var(--muted)] mb-2">{t('person.alertsOthers')}</p>}
          <ul className="grid gap-2 sm:grid-cols-2">
            {ALERT_CODES.filter((code) => !byCode.has(code)).map((code) => (
              <li key={code} className="rounded-[12px] bg-[var(--panel-row)] border border-[var(--border)] flex">
                <AlertBox code={code} checked={false} label={t(`scan.alert_${code}`)} onToggle={toggle} />
              </li>
            ))}
          </ul>
        </>
      )}
    </Section>
  )
}

function AlertBox({ code, checked, label, onToggle }: { code: AlertCode; checked: boolean; label: string; onToggle: (code: AlertCode) => void }) {
  return (
    <button
      type="button"
      role="checkbox"
      aria-checked={checked}
      onClick={() => onToggle(code)}
      className="flex-1 min-w-0 min-h-[52px] pl-3.5 pr-2 py-2 flex items-center gap-3 text-left"
    >
      <span
        aria-hidden
        className={`w-6 h-6 rounded-[7px] flex-none flex items-center justify-center border-2 transition-colors ${
          checked ? 'bg-[var(--negative)] border-[var(--negative)] text-white' : 'border-[var(--control)] bg-[var(--surface)]'
        }`}
      >
        {checked && <Check size={15} strokeWidth={3.5} />}
      </span>
      <span className={`text-[15px] ${checked ? 'font-bold' : 'font-medium'}`}>{label}</span>
    </button>
  )
}
