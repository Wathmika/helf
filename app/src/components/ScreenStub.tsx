import { Card, CenteredForm } from './ui'

/** Placeholder for a screen not built yet in this scaffold pass — keeps the
 * router complete end to end. Replace with the real screen; see
 * docs/frontend-features.md for what belongs here. */
export function ScreenStub({ title, note }: { title: string; note: string }) {
  return (
    <CenteredForm title={title} maxWidth={520}>
      <Card className="text-sm text-[var(--muted)] text-center">{note}</Card>
    </CenteredForm>
  )
}
