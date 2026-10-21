import { useParams } from 'react-router-dom'
import { ScreenStub } from '../../components/ScreenStub'

export function PersonQr() {
  const { personId } = useParams()
  return (
    <ScreenStub
      title="QR codes"
      note={`QR tokens, issue/revoke, printable card (offline_qr_text) and scan activity go here — see docs/frontend-features.md §5. Person ${personId}.`}
    />
  )
}
