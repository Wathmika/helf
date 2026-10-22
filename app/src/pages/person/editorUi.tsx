import { useCallback, useEffect, useRef, useState, type ReactNode } from 'react'
import { useTranslation } from 'react-i18next'
import { Eye, EyeOff, Lock } from 'lucide-react'
import { Switch } from '../../components/ui'
import { inputClass, SaveContext, useSave, type SaveState } from './editorKit'

/*
  Building blocks shared by the editor's sections.

  One save model for the whole screen: every control saves itself (text on
  leaving the field, switches and choices at once) and the title row shows
  one quiet "Saved" stamp. Adding or editing a list item is the exception
  that proves it: that's creating an object, so it has its own Add/Save.
*/

// ---- the "Saved" stamp ----------------------------------------------------

export function SaveProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<SaveState>('idle')
  const pending = useRef(0)
  const track = useCallback(async (p: Promise<unknown>) => {
    pending.current += 1
    setState('saving')
    try {
      await p
      pending.current -= 1
      if (pending.current === 0) setState('saved')
      return true
    } catch {
      pending.current -= 1
      setState('error')
      return false
    }
  }, [])
  return <SaveContext.Provider value={{ state, track }}>{children}</SaveContext.Provider>
}

export function SaveStamp() {
  const { t } = useTranslation()
  const { state } = useSave()
  if (state === 'idle') return null
  const text = { saving: t('person.saving'), saved: t('person.saved'), error: t('person.saveFailed') }[state]
  return (
    <span role="status" className={`text-[13px] font-semibold ${state === 'error' ? 'text-[var(--negative)]' : 'text-[var(--muted)]'}`}>
      {text}
    </span>
  )
}

// ---- layout ----------------------------------------------------------------

export function Section({
  id,
  title,
  description,
  aside,
  tone,
  children,
}: {
  id?: string
  title: string
  description?: ReactNode
  aside?: ReactNode
  tone?: 'alert'
  children: ReactNode
}) {
  return (
    <section id={id} aria-labelledby={id ? `${id}-h` : undefined} className="scroll-mt-20 rounded-[16px] bg-[var(--panel)] p-4 sm:p-6">
      <header className="flex flex-wrap items-start justify-between gap-x-4 gap-y-2">
        <div className="min-w-0 max-w-[560px]">
          <h2 id={id ? `${id}-h` : undefined} className="text-[17px] font-bold flex items-center gap-2">
            {tone === 'alert' && <span aria-hidden className="w-2.5 h-2.5 rounded-full bg-[var(--negative)]" />}
            {title}
          </h2>
          {description && <p className="text-[14px] text-[var(--muted)] mt-1 leading-relaxed">{description}</p>}
        </div>
        {aside}
      </header>
      <div className="mt-4">{children}</div>
    </section>
  )
}

/** A value and its "show on the scan page" control, always side by side —
 * the core trust pattern of the app (CLAUDE.md, spec §4.1). */
export function FieldRow({
  label,
  htmlFor,
  visibility,
  hint,
  children,
}: {
  label: string
  htmlFor?: string
  visibility?: ReactNode
  hint?: ReactNode
  children: ReactNode
}) {
  return (
    <div className="py-4 border-t border-[var(--rule)] first:border-t-0 first:pt-1">
      <div className="flex items-center justify-between gap-3 min-h-11 mb-1.5">
        <label htmlFor={htmlFor} className="text-[14px] font-semibold">
          {label}
        </label>
        {visibility}
      </div>
      {children}
      {hint && <p className="text-[13px] text-[var(--muted)] mt-2 leading-relaxed">{hint}</p>}
    </div>
  )
}

/** The switch plus a word saying what it means right now. */
export function Visibility({ on, onToggle, field, disabled }: { on: boolean; onToggle: () => void; field: string; disabled?: boolean }) {
  const { t } = useTranslation()
  return (
    <span className={`flex items-center gap-1 flex-none ${disabled ? 'opacity-60' : ''}`}>
      <span className={`hidden sm:inline-flex items-center gap-1.5 text-[13px] font-semibold ${on ? 'text-[var(--text)]' : 'text-[var(--muted)]'}`}>
        {on ? <Eye size={15} /> : <EyeOff size={15} />}
        {on ? t('person.onScan') : t('person.hidden')}
      </span>
      <span className="sm:hidden text-[13px] font-semibold text-[var(--muted)]">{on ? t('person.onScan') : t('person.hidden')}</span>
      <Switch on={on} onToggle={disabled ? () => {} : onToggle} label={t('person.showOnScanFor', { field })} />
    </span>
  )
}

export function NeverShown() {
  const { t } = useTranslation()
  return (
    <span className="inline-flex items-center gap-1.5 text-[13px] font-semibold text-[var(--muted)]">
      <Lock size={14} /> {t('person.neverShown')}
    </span>
  )
}

export function AlwaysShown() {
  const { t } = useTranslation()
  return (
    <span className="inline-flex items-center gap-1.5 text-[13px] font-semibold text-[var(--muted)]">
      <Eye size={15} /> {t('person.alwaysShown')}
    </span>
  )
}

// ---- inputs -----------------------------------------------------------------

/** A text field that saves itself when you leave it (or press Enter), and
 * only when the text really changed. Empty means "not set" (null). */
export function AutoInput({
  id,
  value,
  onSave,
  required,
  multiline,
  ...rest
}: {
  id: string
  value: string | null
  onSave: (next: string | null) => void
  required?: boolean
  multiline?: boolean
  maxLength?: number
  placeholder?: string
  type?: string
  inputMode?: 'text' | 'numeric' | 'email' | 'tel'
  min?: string
  max?: string
  autoComplete?: string
}) {
  const { t } = useTranslation()
  const [draft, setDraft] = useState(value ?? '')
  const [error, setError] = useState(false)
  const focused = useRef(false)

  useEffect(() => {
    if (!focused.current) setDraft(value ?? '')
  }, [value])

  function commit() {
    focused.current = false
    const next = draft.trim()
    if (required && !next) {
      setError(true)
      setDraft(value ?? '')
      return
    }
    setError(false)
    if ((next || null) !== (value || null)) onSave(next || null)
  }

  const shared = {
    id,
    value: draft,
    'aria-invalid': error || undefined,
    'aria-describedby': error ? `${id}-err` : undefined,
    onFocus: () => (focused.current = true),
    onBlur: commit,
    ...rest,
  }

  return (
    <>
      {multiline ? (
        <textarea
          {...shared}
          rows={3}
          onChange={(e) => setDraft(e.target.value)}
          className={`${inputClass} h-auto py-3 leading-relaxed resize-y min-h-[96px]`}
        />
      ) : (
        <input
          {...shared}
          onChange={(e) => setDraft(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && (e.target as HTMLInputElement).blur()}
          className={inputClass}
        />
      )}
      {error && (
        <p id={`${id}-err`} className="text-[13px] font-semibold text-[var(--negative)] mt-2">
          {t('person.required')}
        </p>
      )}
    </>
  )
}

/** Small segmented choice (Yes / No / Not set and the like). */
export function Segmented<T extends string>({
  value,
  options,
  onChange,
  label,
}: {
  value: T
  options: { value: T; label: string }[]
  onChange: (v: T) => void
  label: string
}) {
  return (
    <div role="radiogroup" aria-label={label} className="inline-flex flex-wrap gap-1 p-1 rounded-[12px] bg-[var(--surface)] border border-[var(--border)]">
      {options.map((o) => (
        <button
          key={o.value}
          type="button"
          role="radio"
          aria-checked={value === o.value}
          onClick={() => onChange(o.value)}
          className={`h-10 px-4 rounded-[9px] text-[14px] font-semibold transition-colors ${
            value === o.value ? 'bg-[var(--deep)] text-white' : 'text-[var(--muted)] hover:text-[var(--text)] hover:bg-[var(--panel)]'
          }`}
        >
          {o.label}
        </button>
      ))}
    </div>
  )
}
