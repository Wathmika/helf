import { Link } from 'react-router-dom'
import { HelfLockup } from '../../components/Logo'
import { useEffect, useState } from 'react'
import { Menu, Phone, X } from 'lucide-react'

const LINKS = [
  { href: '#demo', label: 'How a scan works' },
  { href: '#carry', label: 'Cards' },
  { href: '#privacy', label: 'Privacy' },
  { href: '#faq', label: 'FAQ' },
]

export function Nav() {
  const [scrolled, setScrolled] = useState(false)
  const [open, setOpen] = useState(false)

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 24)
    onScroll()
    window.addEventListener('scroll', onScroll, { passive: true })
    return () => window.removeEventListener('scroll', onScroll)
  }, [])

  const solid = scrolled || open

  return (
    <header
      className={`fixed top-0 inset-x-0 z-40 transition-colors duration-300 ${
        solid ? 'bg-[var(--ground)] border-b border-[var(--rule)]' : 'bg-transparent border-b border-transparent'
      }`}
    >
      <div className="max-w-[1200px] mx-auto px-5 md:px-8 h-[68px] flex items-center justify-between gap-4">
        <a href="#top" className="h-11 flex items-center shrink-0" aria-label="helf.lk" onClick={() => setOpen(false)}>
          {/* The same "Help call" logo as the dashboard: the dark-ground
              version over the teal hero, the light one once the bar fills. */}
          <HelfLockup variant={solid ? 'light' : 'dark'} className="text-[22px]" />
        </a>

        <nav className="hidden lg:flex items-center gap-8 text-[15px] font-semibold">
          {LINKS.map((l) => (
            <a
              key={l.href}
              href={l.href}
              className={`group relative py-1 transition-colors ${
                solid ? 'text-[var(--muted)] hover:text-[var(--text)]' : 'text-white/80 hover:text-white'
              }`}
            >
              {l.label}
              <span
                className={`absolute left-0 right-0 -bottom-0.5 h-[2px] rounded-full origin-left scale-x-0 transition-transform duration-300 group-hover:scale-x-100 ${
                  solid ? 'bg-[var(--accent)]' : 'bg-white'
                }`}
              />
            </a>
          ))}
        </nav>

        <div className="flex items-center gap-2.5">
          <a
            href="tel:1990"
            className={`hidden sm:inline-flex items-center gap-1.5 h-9 px-3 rounded-full text-[13px] font-bold transition-colors ${
              solid
                ? 'bg-[var(--negative-soft)] text-[var(--negative-ink)] hover:bg-[#f7d2ce]'
                : 'bg-white/15 text-white hover:bg-white/25'
            }`}
          >
            <Phone size={14} strokeWidth={2.5} />
            1990 ambulance
          </a>
          <Link
            to="/login"
            className={`hidden sm:inline-flex h-10 px-4 items-center rounded-full font-bold text-[14px] transition-all active:scale-[0.97] ${
              solid
                ? 'bg-[var(--accent)] text-white hover:bg-[var(--accent-ink)]'
                : 'bg-white text-[var(--accent-ink)] hover:bg-[var(--accent-soft)]'
            }`}
          >
            Sign in
          </Link>
          <button
            type="button"
            aria-label={open ? 'Close menu' : 'Open menu'}
            aria-expanded={open}
            onClick={() => setOpen((v) => !v)}
            className={`lg:hidden w-10 h-10 rounded-full flex items-center justify-center transition-colors ${
              solid ? 'text-[var(--text)] hover:bg-[var(--raised)]' : 'text-white hover:bg-white/15'
            }`}
          >
            {open ? <X size={22} /> : <Menu size={22} />}
          </button>
        </div>
      </div>

      {open && (
        <div className="lg:hidden border-t border-[var(--rule)] bg-[var(--ground)] screen-in">
          <nav className="max-w-[1200px] mx-auto px-5 py-4 flex flex-col">
            {LINKS.map((l) => (
              <a
                key={l.href}
                href={l.href}
                onClick={() => setOpen(false)}
                className="py-3.5 text-[17px] font-semibold border-b border-[var(--rule)] last:border-b-0"
              >
                {l.label}
              </a>
            ))}
            <div className="grid grid-cols-2 gap-3 pt-4">
              <a
                href="tel:1990"
                className="h-12 rounded-xl bg-[var(--negative-soft)] text-[var(--negative-ink)] font-bold flex items-center justify-center gap-2"
              >
                <Phone size={16} /> Call 1990
              </a>
              <Link
                to="/login"
                className="h-12 rounded-xl bg-[var(--accent)] text-white font-bold flex items-center justify-center"
              >
                Sign in
              </Link>
            </div>
          </nav>
        </div>
      )}
    </header>
  )
}
