import { useParams } from 'react-router-dom'
import { ScreenStub } from '../../components/ScreenStub'
import { getDemoProfile } from '../../lib/demoStore'
import { supabase } from '../../lib/supabase'

export function PersonDetail() {
  const { personId } = useParams()
  const demoProfile = !supabase && personId ? getDemoProfile(personId) : undefined

  return (
    <ScreenStub
      title={demoProfile ? demoProfile.fullName : 'Profile editor'}
      note="Basic info, critical alerts, allergies/conditions/medications, emergency contacts and the live preview (calling preview_scan_profile) go here — see docs/frontend-features.md §4."
    />
  )
}
