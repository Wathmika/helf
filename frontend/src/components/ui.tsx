import type { ButtonHTMLAttributes, InputHTMLAttributes, ReactNode, SelectHTMLAttributes } from 'react'

export function Card({ children, className = '' }: { children: ReactNode; className?: string }) {
  return (
    <div className={`bg-[var(--surface)] rounded-[var(--radius-card)] p-4 md:p-5 w-full ${className}`}>
      {children}
    </div>
  )
}

export function Stack({ children, className = '' }: { children: ReactNode; className?: string }) {
  return <div className={`flex flex-col gap-3 ${className}`}>{children}</div>
}

/** For a single short form or placeholder (new profile, invite entry, a
 * stubbed screen): vertically centred, with the title and an optional
 * subtitle above a white card. */
export function CenteredForm({
  title,
  subtitle,
  children,
  maxWidth = 460,
}: {
  title: string
  subtitle?: string
  children: ReactNode
  maxWidth?: number
}) {
  return (
    <div className="min-h-[calc(100vh-140px)] flex items-center justify-center px-5 py-10">
      <div className="w-full" style={{ maxWidth }}>
        <h1 className="text-[24px] sm:text-[26px] md:text-[30px] font-extrabold tracking-[-0.015em] text-center text-balance">{title}</h1>
        {subtitle && <p className="text-[15px] text-[var(--muted)] text-center mt-2 mb-6 text-balance">{subtitle}</p>}
        {!subtitle && <div className="mb-5" />}
        {children}
      </div>
    </div>
  )
}

type ButtonVariant = 'primary' | 'ghost' | 'danger' | 'quiet'

export function Button({
  variant = 'primary',
  className = '',
  ...props
}: ButtonHTMLAttributes<HTMLButtonElement> & { variant?: ButtonVariant }) {
  const base =
    'inline-flex items-center justify-center gap-2 h-[52px] rounded-[var(--radius-ctl)] font-bold text-[15px] px-5 w-full transition-all active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed disabled:active:scale-100'
  const variants: Record<ButtonVariant, string> = {
    primary: 'bg-[var(--accent)] text-white hover:bg-[var(--accent-ink)]',
    ghost: 'bg-transparent text-[var(--accent-ink)] border-[1.5px] border-[var(--accent)] hover:bg-[var(--accent-soft)]',
    danger: 'bg-[var(--negative)] text-white hover:bg-[var(--negative-ink)]',
    quiet: 'bg-[var(--raised)] text-[var(--text)] hover:bg-[var(--active)]',
  }
  return <button className={`${base} ${variants[variant]} ${className}`} {...props} />
}

const inputClass =
  'w-full h-[52px] rounded-[var(--radius-ctl)] border-[1.5px] border-[var(--border)] bg-[var(--surface)] px-4 text-[16px] text-[var(--text)] outline-none focus-visible:outline-none transition-colors placeholder:text-[#a9a39a] focus:border-[var(--accent)] focus:ring-4 focus:ring-[var(--accent-soft)] aria-[invalid=true]:border-[var(--negative)] aria-[invalid=true]:ring-[var(--negative-soft)]'

export function Field({
  label,
  hint,
  error,
  className = '',
  ...props
}: InputHTMLAttributes<HTMLInputElement> & { label: string; hint?: string; error?: string | null }) {
  return (
    <label className="block mb-4">
      <span className="block text-[14px] font-semibold mb-2">{label}</span>
      <input className={`${inputClass} ${className}`} aria-invalid={error ? true : undefined} {...props} />
      {error ? (
        <span className="block text-[13px] font-semibold text-[var(--negative)] mt-2">{error}</span>
      ) : (
        hint && <span className="block text-[13px] text-[var(--muted)] mt-2">{hint}</span>
      )}
    </label>
  )
}

export function SelectField({
  label,
  children,
  ...props
}: SelectHTMLAttributes<HTMLSelectElement> & { label: string; children: ReactNode }) {
  return (
    <label className="block mb-4">
      <span className="block text-[14px] font-semibold mb-2">{label}</span>
      <select className={`${inputClass} appearance-none bg-[length:16px] bg-[right_16px_center] bg-no-repeat pr-11`} style={{ backgroundImage: CHEVRON }} {...props}>
        {children}
      </select>
    </label>
  )
}

const CHEVRON =
  "url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24' fill='none' stroke='%235b6472' stroke-width='2.5' stroke-linecap='round' stroke-linejoin='round'%3E%3Cpath d='m6 9 6 6 6-6'/%3E%3C/svg%3E\")"

export function Switch({ on, onToggle, label }: { on: boolean; onToggle: () => void; label?: string }) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={on}
      aria-label={label}
      onClick={onToggle}
      className="flex-none w-[58px] h-11 -mr-1.5 flex items-center justify-center rounded-full"
    >
      <span className={`relative block w-[46px] h-[28px] rounded-full transition-colors duration-200 ${on ? 'bg-[var(--deep)]' : 'bg-[var(--control)]'}`}>
        <span
          className={`absolute top-[3px] w-[22px] h-[22px] rounded-full bg-white shadow-sm transition-all duration-200 ${on ? 'left-[21px]' : 'left-[3px]'}`}
        />
      </span>
    </button>
  )
}

export function ToggleRow({
  title,
  hint,
  on,
  onToggle,
}: {
  title: string
  hint?: string
  on: boolean
  onToggle: () => void
}) {
  return (
    <div className="flex items-center justify-between gap-3 py-2.5 border-t border-[var(--rule)] first:border-t-0">
      <div className="min-w-0 flex-1">
        <p className="text-[15px] font-medium">{title}</p>
        {hint && <p className="text-xs text-[var(--muted)] mt-0.5">{hint}</p>}
      </div>
      <Switch on={on} onToggle={onToggle} label={title} />
    </div>
  )
}

export function Pill({
  tone = 'neutral',
  children,
  className = '',
}: {
  tone?: 'pos' | 'neg' | 'warn' | 'neutral'
  children: ReactNode
  className?: string
}) {
  const tones: Record<string, string> = {
    pos: 'bg-[var(--positive-soft)] text-[var(--positive-ink)]',
    neg: 'bg-[var(--negative-soft)] text-[var(--negative-ink)]',
    warn: 'bg-[var(--warning-soft)] text-[var(--warning-ink)]',
    neutral: 'bg-[var(--raised)] text-[var(--muted)]',
  }
  return (
    <span className={`inline-flex items-center gap-1 text-xs font-semibold px-2.5 py-1 rounded-full whitespace-nowrap ${tones[tone]} ${className}`}>
      {children}
    </span>
  )
}
