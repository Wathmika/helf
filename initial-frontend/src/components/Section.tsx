import type { ReactNode } from "react"

interface SectionProps {
  id?: string
  title: string
  subtitle?: string
  action?: ReactNode
  children: ReactNode
}

export function Section({ id, title, subtitle, action, children }: SectionProps) {
  return (
    <section id={id} className="scroll-mt-20 rounded-2xl border border-gray-100 bg-white p-5 shadow-sm sm:p-6">
      <div className="mb-4 flex items-start justify-between gap-3">
        <div>
          <h2 className="text-lg font-semibold text-gray-900">{title}</h2>
          {subtitle && <p className="mt-0.5 text-sm text-gray-500">{subtitle}</p>}
        </div>
        {action}
      </div>
      {children}
    </section>
  )
}
