import type { ButtonHTMLAttributes, InputHTMLAttributes, ReactNode } from 'react'

export function Card({ children, className = '' }: { children: ReactNode; className?: string }) {
  return (
    <div className={`bg-[var(--surface)] rounded-[var(--radius-card)] p-4 md:p-5 w-full ${className}`}>
      {children}
    </div>
  )
}

/** Wraps a screen's content: full-bleed cards on a phone, a comfortably
 * centred column with room to breathe on wider screens. Every page except
 * the split-panel auth screens uses this so the desktop view never reads as
 * a stretched phone layout. */
export function PageContainer({ children, className = '' }: { children: ReactNode; className?: string }) {
  return (
    <div className={`w-full max-w-[760px] mx-auto px-5 md:px-8 ${className}`}>{children}</div>
  )
}

export function Stack({ children, className = '' }: { children: ReactNode; className?: string }) {
  return <div className={`flex flex-col gap-3 ${className}`}>{children}</div>
}

type ButtonVariant = 'primary' | 'ghost' | 'danger'

export function Button({
  variant = 'primary',
  className = '',
  ...props
}: ButtonHTMLAttributes<HTMLButtonElement> & { variant?: ButtonVariant }) {
  const base =
    'inline-flex items-center justify-center gap-2 h-12 rounded-[var(--radius-ctl)] font-semibold text-[15px] px-4 w-full disabled:opacity-50 disabled:cursor-not-allowed transition-colors'
  const variants: Record<ButtonVariant, string> = {
    primary: 'bg-[var(--accent)] text-white hover:bg-[var(--accent-ink)]',
    ghost: 'bg-transparent text-[var(--accent)] border-[1.5px] border-[var(--accent)] hover:bg-[var(--accent-soft)]',
    danger: 'bg-[var(--negative)] text-white hover:bg-[var(--negative-ink)]',
  }
  return <button className={`${base} ${variants[variant]} ${className}`} {...props} />
}

export function Field({
  label,
  hint,
  ...props
}: InputHTMLAttributes<HTMLInputElement> & { label: string; hint?: string }) {
  return (
    <label className="block mb-3.5">
      <span className="block text-[13px] font-medium text-[var(--muted)] mb-1.5">{label}</span>
      <input
        className="w-full h-11 rounded-[var(--radius-ctl)] border-[1.5px] border-[var(--border)] bg-[var(--surface)] px-3 text-base text-[var(--text)] outline-none focus:border-[var(--accent)]"
        {...props}
      />
      {hint && <span className="block text-xs text-[var(--muted)] mt-1">{hint}</span>}
    </label>
  )
}

export function Switch({ on, onToggle, label }: { on: boolean; onToggle: () => void; label?: string }) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={on}
      aria-label={label}
      onClick={onToggle}
      className={`relative w-10 h-6 rounded-full flex-none transition-colors ${
        on ? 'bg-[var(--accent)]' : 'bg-[var(--control)]'
      }`}
    >
      <span
        className={`absolute top-[3px] w-[18px] h-[18px] rounded-full bg-white transition-all ${
          on ? 'left-[19px]' : 'left-[3px]'
        }`}
      />
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

export function Pill({ tone = 'neutral', children }: { tone?: 'pos' | 'neg' | 'warn' | 'neutral'; children: ReactNode }) {
  const tones: Record<string, string> = {
    pos: 'bg-[var(--positive-soft)] text-[var(--positive-ink)]',
    neg: 'bg-[var(--negative-soft)] text-[var(--negative-ink)]',
    warn: 'bg-[var(--warning-soft)] text-[var(--warning-ink)]',
    neutral: 'bg-[var(--raised)] text-[var(--muted)]',
  }
  return (
    <span className={`inline-flex items-center gap-1 text-xs font-semibold px-2.5 py-1 rounded-full ${tones[tone]}`}>
      {children}
    </span>
  )
}
