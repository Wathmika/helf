import { useEffect, useRef, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { QRCodeCanvas } from 'qrcode.react'
import { ArrowLeft, Download, MapPin, Plus, Printer, QrCode, TriangleAlert } from 'lucide-react'
import { CardBack, CardFront } from '../../components/WalletCard78'
import { HELF_BADGE_DATA_URL } from '../../components/Logo'
import { usePersonDetail, usePreview } from '../../lib/person'
import { daysSince } from '../../lib/profiles'
import {
  MAX_LABEL,
  qrReady,
  scanUrl,
  useIssueToken,
  useOfflineText,
  useQrTokens,
  useRevokeToken,
  useScanEvents,
  type QrToken,
  type ScanEvent,
} from '../../lib/qr'
import { Section } from './editorUi'
import { ghostButton, inputClass, primaryButton, smallButton } from './editorKit'

/*
  QR codes for one person (spec §5). The screen's question: "which of this
  person's QR codes work, and has anyone scanned them?" So the left column
  is the selected code as the printable card (#78) with its scan history
  under it, and the right column is the list of codes with "make a new one".

  Desktop (xl): 8 + 4 columns of the shared 1100px grid; below xl the two
  columns stack, list first, so the codes come before the card.
*/

const LOCALES: Record<string, string> = { si: 'si-LK', ta: 'ta-LK', en: 'en-GB' }

function useDates() {
  const { i18n } = useTranslation()
  const locale = LOCALES[i18n.resolvedLanguage ?? 'en'] ?? 'en-GB'
  return {
    day: (iso: string) => new Intl.DateTimeFormat(locale, { day: 'numeric', month: 'short', year: 'numeric' }).format(new Date(iso)),
    when: (iso: string) =>
      new Intl.DateTimeFormat(locale, { weekday: 'short', day: 'numeric', month: 'short', hour: 'numeric', minute: '2-digit' }).format(new Date(iso)),
    time: (iso: string) => new Intl.DateTimeFormat(locale, { hour: 'numeric', minute: '2-digit' }).format(new Date(iso)),
  }
}

// ---- making a new QR --------------------------------------------------------

function NewQr({ personId, onMade, first }: { personId: string; onMade: (t: QrToken) => void; first: boolean }) {
  const { t } = useTranslation()
  const issue = useIssueToken(personId)
  const [label, setLabel] = useState('')
  const [failed, setFailed] = useState(false)
  const suggestions = [t('qr.labelCard'), t('qr.labelHelmet'), t('qr.labelWallpaper')]
  return (
    <form
      className="flex flex-col gap-3"
      onSubmit={async (e) => {
        e.preventDefault()
        setFailed(false)
        try {
          const made = await issue.mutateAsync(label.trim() || null)
          setLabel('')
          onMade(made)
        } catch {
          setFailed(true)
        }
      }}
    >
      <div>
        <label htmlFor="qr-label" className="block text-[14px] font-semibold mb-1.5">
          {t('qr.labelField')}
        </label>
        <input id="qr-label" maxLength={MAX_LABEL} className={inputClass} value={label} placeholder={t('qr.labelCard')} onChange={(e) => setLabel(e.target.value)} />
        <div className="mt-2 flex flex-wrap gap-1.5" aria-label={t('qr.suggestions')}>
          {suggestions.map((s) => (
            <button
              key={s}
              type="button"
              onClick={() => setLabel(s)}
              className="h-11 px-3.5 rounded-full text-[13px] font-semibold bg-[var(--surface)] border border-[var(--border)] hover:border-[var(--accent)]"
            >
              {s}
            </button>
          ))}
        </div>
        <p className="text-[13px] text-[var(--muted)] mt-2 leading-relaxed">{t('qr.labelHint')}</p>
      </div>
      {failed && <p className="text-[13px] font-semibold text-[var(--negative)]">{t('auth.errorGeneric')}</p>}
      <button type="submit" className={`${primaryButton} self-start`} disabled={issue.isPending}>
        <Plus size={16} strokeWidth={2.5} /> {first ? t('qr.makeFirst') : t('qr.make')}
      </button>
    </form>
  )
}

// ---- switching a QR off -------------------------------------------------------

function RevokeDialog({ token, personId, onClose }: { token: QrToken | null; personId: string; onClose: () => void }) {
  const { t } = useTranslation()
  const ref = useRef<HTMLDialogElement>(null)
  const revoke = useRevokeToken(personId)
  const [failed, setFailed] = useState(false)
  const label = token?.label || t('qr.unnamed')

  useEffect(() => {
    const d = ref.current
    if (!d) return
    if (token && !d.open) {
      setFailed(false)
      d.showModal()
    }
    if (!token && d.open) d.close()
  }, [token])

  return (
    <dialog
      ref={ref}
      onClose={onClose}
      aria-labelledby="revoke-h"
      className="m-auto w-[min(480px,calc(100vw-32px))] rounded-[20px] p-0 bg-[var(--surface)] text-[var(--text)] shadow-[0_24px_60px_-20px_rgba(10,30,28,0.45)] backdrop:bg-[rgba(10,30,28,0.45)]"
    >
      <div className="p-6">
        <h2 id="revoke-h" className="text-[20px] font-extrabold">
          {t('qr.revokeTitle', { label })}
        </h2>
        <ul className="mt-3 flex flex-col gap-2 text-[15px] leading-relaxed">
          <li>{t('qr.revokeNow')}</li>
          <li>{t('qr.revokeShows')}</li>
          <li className="font-semibold">{t('qr.revokeForever')}</li>
        </ul>
        {failed && <p className="mt-3 text-[13px] font-semibold text-[var(--negative)]">{t('auth.errorGeneric')}</p>}
        <div className="mt-6 flex flex-wrap gap-2 justify-end">
          <button type="button" className={ghostButton} onClick={onClose} autoFocus>
            {t('qr.keepIt')}
          </button>
          <button
            type="button"
            disabled={revoke.isPending}
            className={`${smallButton} bg-[var(--negative)] text-white hover:bg-[var(--negative-ink)]`}
            onClick={async () => {
              try {
                await revoke.mutateAsync(token!.id)
                onClose()
              } catch {
                setFailed(true)
              }
            }}
          >
            {t('qr.revokeConfirm')}
          </button>
        </div>
      </div>
    </dialog>
  )
}

// ---- the list of codes ---------------------------------------------------------

function QrList({
  tokens,
  scans,
  selectedId,
  onSelect,
  onRevoke,
}: {
  tokens: QrToken[]
  scans: ScanEvent[]
  selectedId: string | null
  onSelect: (id: string) => void
  onRevoke: (t: QrToken) => void
}) {
  const { t } = useTranslation()
  const { day } = useDates()
  const active = tokens.filter((x) => x.status === 'active')
  const off = tokens.filter((x) => x.status === 'revoked')
  const lastScan = (id: string) => scans.find((s) => s.token_id === id)

  return (
    <div className="flex flex-col gap-2">
      <ul className="flex flex-col gap-2" aria-label={t('qr.listTitle')}>
        {active.map((tok) => {
          const selected = tok.id === selectedId
          const last = lastScan(tok.id)
          return (
            <li key={tok.id} className={`rounded-[12px] border transition-colors ${selected ? 'bg-[var(--surface)] border-[var(--accent)]' : 'bg-[var(--panel-row)] border-[var(--border)]'}`}>
              <button type="button" aria-pressed={selected} onClick={() => onSelect(tok.id)} className="w-full text-left px-4 pt-3 pb-1">
                <p className="text-[15px] font-bold flex items-center gap-2">
                  <QrCode size={16} className="flex-none text-[var(--accent)]" />
                  <span className="truncate">{tok.label || t('qr.unnamed')}</span>
                </p>
                <p className="text-[13px] text-[var(--muted)] mt-0.5">
                  {t('qr.madeOn', { date: day(tok.created_at) })} · {last ? t('qr.lastScan', { count: daysSince(last.scanned_at) }) : t('qr.neverScanned')}
                </p>
              </button>
              <div className="px-2 pb-2 flex justify-end">
                <button type="button" onClick={() => onRevoke(tok)} className={`${smallButton} h-10 text-[13px] text-[var(--negative-ink)] hover:bg-[var(--negative-soft)]`}>
                  {t('qr.revoke')}
                </button>
              </div>
            </li>
          )
        })}
      </ul>

      {off.length > 0 && (
        <details className="mt-2 group">
          <summary className="cursor-pointer list-none h-11 flex items-center text-[14px] font-semibold text-[var(--muted)] hover:text-[var(--text)]">
            {t('qr.offTitle', { count: off.length })}
          </summary>
          <ul className="flex flex-col gap-1.5">
            {off.map((tok) => (
              <li key={tok.id} className="rounded-[12px] border border-dashed border-[var(--control)] px-4 py-2.5">
                <p className="text-[14px] font-semibold text-[var(--muted)] line-through decoration-1">{tok.label || t('qr.unnamed')}</p>
                <p className="text-[13px] text-[var(--muted)]">{t('qr.offOn', { date: day(tok.revoked_at!) })}</p>
              </li>
            ))}
          </ul>
        </details>
      )}
    </div>
  )
}

// ---- the card, print and download ------------------------------------------------

function downloadQrPng(canvas: HTMLCanvasElement | null, label: string) {
  if (!canvas) return
  const a = document.createElement('a')
  a.href = canvas.toDataURL('image/png')
  a.download = `helf-qr-${label.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '') || 'code'}.png`
  a.click()
}

function CardPanel({ token, name, alerts }: { token: QrToken; name: string; alerts: string[] }) {
  const { t } = useTranslation()
  const online = scanUrl(token.token)!
  const { data: offline, isError } = useOfflineText(token)
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const label = token.label || t('qr.unnamed')

  return (
    <Section id="card" title={label} description={t('qr.cardBody')}>
      <div className="grid gap-4 md:grid-cols-2" data-ui>
        <figure className="m-0">
          <CardFront onlineUrl={online} name={name} alerts={alerts} />
          <figcaption className="text-[13px] text-[var(--muted)] mt-2">{t('qr.front')}</figcaption>
        </figure>
        <figure className="m-0">
          {offline ? (
            <CardBack offlineText={offline} />
          ) : (
            <div className="aspect-[1.586] rounded-[14px] bg-[var(--raised)] flex items-center justify-center p-4 text-center text-[14px] text-[var(--muted)]">
              {isError ? t('qr.offlineError') : t('qr.offlineLoading')}
            </div>
          )}
          <figcaption className="text-[13px] text-[var(--muted)] mt-2">{t('qr.back')}</figcaption>
        </figure>
      </div>

      <div className="mt-5 flex flex-wrap gap-2">
        <button type="button" className={primaryButton} disabled={!offline} onClick={() => window.print()}>
          <Printer size={16} /> {t('qr.print')}
        </button>
        <button type="button" className={ghostButton} onClick={() => downloadQrPng(canvasRef.current, label)}>
          <Download size={16} /> {t('qr.download')}
        </button>
      </div>
      <p className="text-[13px] text-[var(--muted)] mt-2 leading-relaxed">{t('qr.printHint')}</p>

      {offline && (
        <details className="mt-4 rounded-[12px] bg-[var(--panel-row)] border border-[var(--border)]">
          <summary className="cursor-pointer min-h-11 px-4 flex items-center text-[14px] font-semibold">{t('qr.offlineTitle')}</summary>
          <div className="px-4 pb-4">
            <p className="text-[13px] text-[var(--muted)] leading-relaxed">{t('qr.offlineBody')}</p>
            <p lang="en" className="mt-3 rounded-[10px] bg-[var(--surface)] border border-[var(--border)] p-3 text-[13px] leading-relaxed whitespace-pre-wrap break-words">
              {offline}
            </p>
          </div>
        </details>
      )}

      {/* The download picture: a large plain QR with the badge cut into its middle. */}
      <QRCodeCanvas
        ref={canvasRef}
        value={online}
        size={1024}
        level="Q"
        marginSize={4}
        fgColor="#134e4a"
        bgColor="#ffffff"
        imageSettings={{ src: HELF_BADGE_DATA_URL, width: 225, height: 225, excavate: true }}
        className="hidden"
        aria-hidden
      />

      {/* Only this prints: both sides at real card size (85.6 x 54 mm). */}
      {offline && (
        <div className="print-sheet" aria-hidden>
          <p>{t('qr.printSheetNote', { name, label })}</p>
          <div className="print-card">
            <CardFront onlineUrl={online} name={name} alerts={alerts} />
          </div>
          <div className="print-card">
            <CardBack offlineText={offline} />
          </div>
        </div>
      )}
    </Section>
  )
}

// ---- scan history ------------------------------------------------------------------

function ScanHistory({ scans, tokens, personId, name }: { scans: ScanEvent[]; tokens: QrToken[]; personId: string; name: string }) {
  const { t } = useTranslation()
  const { when, time } = useDates()
  const labelOf = (id: string | null) => tokens.find((x) => x.id === id)?.label || t('qr.unnamed')

  return (
    <Section
      id="scans"
      title={t('qr.scansTitle')}
      description={
        <>
          {t('qr.scansBody')}{' '}
          <Link to={`/person/${personId}`} className="font-semibold text-[var(--accent-ink)] underline underline-offset-2">
            {t('qr.scansPreviewLink', { name })}
          </Link>
        </>
      }
    >
      {scans.length === 0 ? (
        <p className="text-[14px] text-[var(--muted)] rounded-[12px] border border-dashed border-[var(--control)] px-4 py-3">{t('qr.noScans')}</p>
      ) : (
        <ul className="flex flex-col gap-2">
          {scans.map((s) => {
            const located = s.approx_lat !== null && s.approx_lng !== null
            return (
              <li key={s.id} className="rounded-[12px] bg-[var(--panel-row)] border border-[var(--border)] px-4 py-3 grid gap-x-4 gap-y-1 sm:grid-cols-[minmax(0,1fr)_auto] sm:items-center">
                <div className="min-w-0">
                  <p className="text-[15px] font-bold">{when(s.scanned_at)}</p>
                  <p className="text-[13px] text-[var(--muted)]">
                    {t('qr.fromQr', { label: labelOf(s.token_id) })}
                    {s.country_code && s.country_code !== 'LK' && <> · {s.country_code}</>}
                    {' · '}
                    {s.family_notified_at ? t('qr.familyTexted', { time: time(s.family_notified_at) }) : t('qr.familyNotTexted')}
                  </p>
                </div>
                {located ? (
                  <a
                    href={`https://www.google.com/maps?q=${s.approx_lat},${s.approx_lng}`}
                    target="_blank"
                    rel="noreferrer"
                    className={`${ghostButton} h-10 justify-self-start sm:justify-self-end`}
                  >
                    <MapPin size={15} /> {t('qr.openMap')}
                  </a>
                ) : (
                  <span className="text-[13px] text-[var(--muted)] sm:text-right">{t('qr.noLocation')}</span>
                )}
              </li>
            )
          })}
        </ul>
      )}
    </Section>
  )
}

// ---- the screen ------------------------------------------------------------------------

export function PersonQr() {
  const { t } = useTranslation()
  const { personId = '' } = useParams()
  const { data: person, isLoading, isError } = usePersonDetail(personId)
  const { data: preview } = usePreview(personId)
  const { data: tokens = [] } = useQrTokens(personId)
  const { data: scans = [] } = useScanEvents(personId)
  const [chosen, setChosen] = useState<string | null>(null)
  const [revoking, setRevoking] = useState<QrToken | null>(null)
  const [making, setMaking] = useState(false)

  const active = tokens.filter((x) => x.status === 'active')
  const selected = active.find((x) => x.id === chosen) ?? active[0]

  if (isLoading) {
    return <div className="w-full max-w-[1100px] mx-auto px-4 sm:px-6 xl:px-0 pt-16" aria-busy="true"><div className="h-[420px] rounded-[16px] bg-[var(--panel)]" /></div>
  }
  if (isError || !person) {
    return (
      <div className="w-full max-w-[640px] mx-auto px-4 pt-16">
        <section className="rounded-[16px] bg-[var(--panel)] p-6">
          <h1 className="text-[22px] font-extrabold">{isError ? t('person.loadError') : t('person.notFound')}</h1>
          <Link to="/" className={`${ghostButton} mt-4`}>
            <ArrowLeft size={16} /> {t('profiles.title')}
          </Link>
        </section>
      </div>
    )
  }

  const name = person.display_name || person.full_name
  const alertsForCard = (preview?.alerts ?? []).map((a) => t(`scan.alert_${a.code}`, { lng: 'en' }))
  const last = scans[0]
  const finding = last
    ? t('qr.findingLast', { count: daysSince(last.scanned_at), label: tokens.find((x) => x.id === last.token_id)?.label || t('qr.unnamed') })
    : t('qr.findingNever')

  return (
    <div className="w-full max-w-[1100px] mx-auto px-4 sm:px-6 xl:px-0 pt-4 md:pt-8">
      <Link to={`/person/${person.id}`} className="inline-flex items-center gap-1.5 h-11 -ml-2 px-2 rounded-[10px] text-[14px] font-semibold text-[var(--muted)] hover:text-[var(--text)] hover:bg-[var(--panel)]">
        <ArrowLeft size={16} /> {name}
      </Link>
      <header className="mt-2">
        <h1 className="text-[22px] sm:text-[26px] md:text-[30px] font-extrabold tracking-[-0.015em] leading-tight text-balance">{t('qr.title', { name })}</h1>
        <p className="text-[15px] text-[var(--muted)] mt-1.5">
          {t('qr.workingCount', { count: active.length })} · {finding}
        </p>
      </header>

      {!qrReady && (
        <div role="note" className="mt-5 rounded-[16px] bg-[#fffbeb] border border-[#fde68a] p-4 flex gap-3">
          <TriangleAlert size={18} className="flex-none text-[#92400e] mt-0.5" />
          <p className="text-[14px] text-[#92400e] leading-relaxed">{t('qr.noBaseUrl')}</p>
        </div>
      )}

      <div className="mt-6 md:mt-8 grid gap-4 xl:grid-cols-12 xl:items-start">
        <div className="xl:col-span-4 xl:order-2 flex flex-col gap-4">
          <Section id="codes" title={t('qr.listTitle')} description={active.length ? t('qr.listBody') : undefined}>
            {active.length === 0 && tokens.length === 0 ? (
              <>
                <p className="text-[14px] text-[var(--muted)] leading-relaxed mb-4">{t('qr.firstRun')}</p>
                <NewQr personId={person.id} first onMade={(m) => setChosen(m.id)} />
              </>
            ) : (
              <>
                <QrList tokens={tokens} scans={scans} selectedId={selected?.id ?? null} onSelect={setChosen} onRevoke={setRevoking} />
                <div className="mt-4 pt-4 border-t border-[var(--rule)]">
                  {making || active.length === 0 ? (
                    <NewQr
                      personId={person.id}
                      first={active.length === 0}
                      onMade={(m) => {
                        setChosen(m.id)
                        setMaking(false)
                      }}
                    />
                  ) : (
                    <button type="button" className={ghostButton} onClick={() => setMaking(true)}>
                      <Plus size={16} strokeWidth={2.5} /> {t('qr.make')}
                    </button>
                  )}
                </div>
              </>
            )}
          </Section>
        </div>

        <div className="xl:col-span-8 xl:order-1 flex flex-col gap-4">
          {selected && qrReady ? (
            <CardPanel token={selected} name={name} alerts={alertsForCard} />
          ) : (
            <section className="rounded-[16px] bg-[var(--panel)] p-6">
              <h2 className="text-[17px] font-bold">{t('qr.noCardTitle')}</h2>
              <p className="text-[14px] text-[var(--muted)] mt-1 leading-relaxed">{qrReady ? t('qr.noCardBody') : t('qr.noCardNoUrl')}</p>
            </section>
          )}
          <ScanHistory scans={scans} tokens={tokens} personId={person.id} name={name} />
        </div>
      </div>

      <RevokeDialog token={revoking} personId={person.id} onClose={() => setRevoking(null)} />
    </div>
  )
}
