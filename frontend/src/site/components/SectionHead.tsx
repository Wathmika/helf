import type { ReactNode } from 'react'
import { Reveal } from './Reveal'

export function SectionHead({
  kicker,
  title,
  body,
  align = 'left',
  tone = 'light',
}: {
  kicker?: string
  title: ReactNode
  body?: ReactNode
  align?: 'left' | 'center'
  tone?: 'light' | 'dark'
}) {
  const centered = align === 'center'
  return (
    <Reveal className={`max-w-[640px] ${centered ? 'mx-auto text-center' : ''}`}>
      {kicker && (
        <p className={`text-[14px] font-bold mb-3 ${tone === 'dark' ? 'text-[#9fe0d6]' : 'text-[var(--accent)]'}`}>
          {kicker}
        </p>
      )}
      <h2
        className={`text-[28px] md:text-[40px] font-extrabold leading-[1.12] tracking-[-0.015em] text-balance ${
          tone === 'dark' ? 'text-white' : ''
        }`}
      >
        {title}
      </h2>
      {body && (
        <p
          className={`text-[16px] md:text-[18px] mt-4 leading-relaxed ${
            tone === 'dark' ? 'text-white/75' : 'text-[var(--muted)]'
          } ${centered ? 'mx-auto max-w-[560px]' : 'max-w-[560px]'}`}
        >
          {body}
        </p>
      )}
    </Reveal>
  )
}
