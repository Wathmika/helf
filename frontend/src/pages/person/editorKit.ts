import { createContext, useContext, useEffect, useState } from 'react'

/* Non-component pieces of the editor (hooks, the save context, class
   strings), kept apart from editorUi.tsx so fast refresh keeps working. */

export type SaveState = 'idle' | 'saving' | 'saved' | 'error'

export const SaveContext = createContext<{ state: SaveState; track: (p: Promise<unknown>) => Promise<boolean> }>({
  state: 'idle',
  track: async () => true,
})

export const useSave = () => useContext(SaveContext)

/** Delete with a second tap instead of a dialog: the row itself asks. */
export function useConfirmDelete() {
  const [armed, setArmed] = useState<string | null>(null)
  useEffect(() => {
    if (!armed) return
    const timer = setTimeout(() => setArmed(null), 4000)
    return () => clearTimeout(timer)
  }, [armed])
  return { armed, arm: setArmed }
}

/** Today as yyyy-mm-dd, fixed for the life of the component (the upper
 * limit for date fields), so rendering stays pure. */
export function useToday() {
  const [today] = useState(() => new Date().toISOString().slice(0, 10))
  return today
}

export const inputClass =
  'w-full h-12 rounded-[10px] border border-[var(--control)] bg-[var(--surface)] px-3.5 text-[16px] text-[var(--text)] outline-none focus-visible:outline-none transition-colors placeholder:text-[#7c8580] focus:border-[var(--accent)] focus:ring-4 focus:ring-[var(--accent-soft)] aria-[invalid=true]:border-[var(--negative)]'

export const smallButton =
  'h-11 px-4 rounded-[10px] text-[14px] font-bold inline-flex items-center justify-center gap-1.5 transition-colors active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed disabled:active:scale-100'
export const ghostButton = `${smallButton} bg-[var(--surface)] border border-[var(--border)] hover:border-[var(--control)]`
export const primaryButton = `${smallButton} bg-[var(--deep)] text-white hover:bg-[var(--accent-ink)]`
export const iconButton =
  'w-11 h-11 rounded-[10px] inline-flex items-center justify-center text-[var(--muted)] hover:text-[var(--text)] hover:bg-[var(--surface)] transition-colors disabled:opacity-40 disabled:cursor-not-allowed'
