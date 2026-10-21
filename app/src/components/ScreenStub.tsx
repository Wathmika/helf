import { Card, PageContainer } from './ui'

/** Placeholder for a screen not built yet in this scaffold pass — keeps the
 * router complete end to end. Replace with the real screen; see
 * docs/frontend-features.md for what belongs here. */
export function ScreenStub({ title, note }: { title: string; note: string }) {
  return (
    <PageContainer>
      <h1 className="text-2xl font-bold mb-3 pt-5 md:pt-0">{title}</h1>
      <Card className="text-sm text-[var(--muted)]">{note}</Card>
    </PageContainer>
  )
}
