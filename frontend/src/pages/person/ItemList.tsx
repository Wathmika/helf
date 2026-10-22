import { useState, type ReactNode } from 'react'
import { useTranslation } from 'react-i18next'
import { Pencil, Plus, Trash2 } from 'lucide-react'
import { Visibility } from './editorUi'
import { ghostButton, iconButton, smallButton, useConfirmDelete } from './editorKit'

/*
  A repeatable list (allergies, conditions, medicines, contacts): each row
  shows its summary beside its own "show on scan" switch, with edit and
  delete; one inline form at a time for adding or editing.
*/

export interface ItemFormProps<V> {
  initial?: V
  submitLabel: string
  onSubmit: (values: V) => Promise<boolean>
  onCancel: () => void
}

export function ItemList<T extends { id: string; show_on_scan: boolean }, V>({
  items,
  addLabel,
  emptyText,
  summary,
  fieldName,
  toValues,
  Form,
  onAdd,
  onUpdate,
  onDelete,
  onToggle,
  toggleDisabled,
  extraControls,
  limit,
}: {
  items: T[]
  addLabel: string
  emptyText: string
  summary: (item: T) => ReactNode
  fieldName: (item: T) => string
  toValues: (item: T) => V
  Form: (props: ItemFormProps<V>) => ReactNode
  onAdd: (values: V) => Promise<boolean>
  onUpdate: (item: T, values: V) => Promise<boolean>
  onDelete: (item: T) => void
  onToggle: (item: T) => void
  toggleDisabled?: (item: T) => boolean
  extraControls?: (item: T) => ReactNode
  limit?: { max: number; reason: string }
}) {
  const { t } = useTranslation()
  const [editing, setEditing] = useState<string | 'new' | null>(null)
  const { armed, arm } = useConfirmDelete()
  const full = limit ? items.length >= limit.max : false

  return (
    <div className="flex flex-col gap-2">
      {items.length === 0 && editing !== 'new' && <p className="text-[14px] text-[var(--muted)] py-1">{emptyText}</p>}

      {items.map((item) =>
        editing === item.id ? (
          <div key={item.id} className="rounded-[12px] bg-[var(--surface)] border border-[var(--accent)] p-4">
            <Form
              initial={toValues(item)}
              submitLabel={t('person.save')}
              onSubmit={async (v) => {
                const ok = await onUpdate(item, v)
                if (ok) setEditing(null)
                return ok
              }}
              onCancel={() => setEditing(null)}
            />
          </div>
        ) : (
          <div key={item.id} className="rounded-[12px] bg-[var(--panel-row)] border border-[var(--border)] pl-4 pr-2 py-2.5">
            <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
              <div className="flex-1 min-w-[180px] py-1">{summary(item)}</div>
              <div className="flex items-center gap-1 ml-auto">
                <Visibility on={item.show_on_scan} field={fieldName(item)} onToggle={() => onToggle(item)} disabled={toggleDisabled?.(item)} />
                {extraControls?.(item)}
                <button type="button" className={iconButton} aria-label={t('person.editItem', { name: fieldName(item) })} onClick={() => setEditing(item.id)}>
                  <Pencil size={16} />
                </button>
                {armed === item.id ? (
                  <button type="button" className={`${smallButton} h-11 px-3 bg-[var(--negative-soft)] text-[var(--negative-ink)]`} onClick={() => onDelete(item)}>
                    {t('person.confirmDelete')}
                  </button>
                ) : (
                  <button type="button" className={iconButton} aria-label={t('person.deleteItem', { name: fieldName(item) })} onClick={() => arm(item.id)}>
                    <Trash2 size={16} />
                  </button>
                )}
              </div>
            </div>
          </div>
        ),
      )}

      {editing === 'new' ? (
        <div className="rounded-[12px] bg-[var(--surface)] border border-[var(--accent)] p-4">
          <Form
            submitLabel={t('person.add')}
            onSubmit={async (v) => {
              const ok = await onAdd(v)
              if (ok) setEditing(null)
              return ok
            }}
            onCancel={() => setEditing(null)}
          />
        </div>
      ) : (
        <div className="flex flex-wrap items-center gap-3 pt-1">
          <button type="button" className={ghostButton} disabled={full} onClick={() => setEditing('new')}>
            <Plus size={16} strokeWidth={2.5} /> {addLabel}
          </button>
          {full && limit && <p className="text-[13px] text-[var(--muted)]">{limit.reason}</p>}
        </div>
      )}
    </div>
  )
}

/** Labelled control inside an item form. */
export function FormField({ label, htmlFor, children, hint }: { label: string; htmlFor: string; children: ReactNode; hint?: ReactNode }) {
  return (
    <div>
      <label htmlFor={htmlFor} className="block text-[14px] font-semibold mb-1.5">
        {label}
      </label>
      {children}
      {hint && <p className="text-[13px] text-[var(--muted)] mt-1.5">{hint}</p>}
    </div>
  )
}

export function FormActions({ submitLabel, onCancel, busy }: { submitLabel: string; onCancel: () => void; busy?: boolean }) {
  const { t } = useTranslation()
  return (
    <div className="flex flex-wrap gap-2 pt-1">
      <button type="submit" disabled={busy} className={`${smallButton} bg-[var(--deep)] text-white hover:bg-[var(--accent-ink)]`}>
        {submitLabel}
      </button>
      <button type="button" onClick={onCancel} className={ghostButton}>
        {t('person.cancel')}
      </button>
    </div>
  )
}
