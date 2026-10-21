import { useParams } from 'react-router-dom'
import { ScreenStub } from '../../components/ScreenStub'

export function PersonDetail() {
  const { personId } = useParams()
  return (
    <ScreenStub
      title="Profile editor"
      note={`Basic info, critical alerts, allergies/conditions/medications, emergency contacts and the live preview (calling preview_scan_profile) go here — see docs/frontend-features.md §4. Person ${personId}.`}
    />
  )
}
