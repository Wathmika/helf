import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useQueryClient } from '@tanstack/react-query'
import { Button, Card, CenteredForm } from '../../components/ui'
import { supabase } from '../../lib/supabase'
import { createDemoProfile } from '../../lib/demoStore'
import type { ProfileFor } from '../../lib/profiles'

const RELATIONSHIPS: ProfileFor[] = ['self', 'parent', 'child', 'spouse', 'other']

export function NewProfile() {
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const [name, setName] = useState('')
  const [relationship, setRelationship] = useState<ProfileFor>('parent')
  const [error, setError] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()

    if (!supabase) {
      // Demo mode — no backend configured, so this writes to the local
      // demo store instead of calling create_person. See lib/demoStore.ts.
      const personId = createDemoProfile(name, relationship)
      queryClient.invalidateQueries({ queryKey: ['profiles'] })
      navigate(`/person/${personId}`)
      return
    }

    setSaving(true)
    setError(null)
    const { data, error: rpcError } = await supabase.rpc('create_person', {
      p_full_name: name,
      p_profile_for: relationship,
    })
    setSaving(false)
    if (rpcError) {
      setError(rpcError.message)
      return
    }
    navigate(`/person/${data}`)
  }

  return (
    <CenteredForm title="Add a profile">
      <form onSubmit={handleSubmit}>
        <Card>
          <label className="block mb-3.5">
            <span className="block text-[13px] font-medium text-[var(--muted)] mb-1.5">Full name</span>
            <input
              className="w-full h-11 rounded-[var(--radius-ctl)] border-[1.5px] border-[var(--border)] bg-[var(--surface)] px-3 text-base outline-none focus:border-[var(--accent)]"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Sriyani Perera"
              required
            />
          </label>

          <span className="block text-[13px] font-medium text-[var(--muted)] mb-1.5">Your relationship</span>
          <select
            className="w-full h-11 rounded-[var(--radius-ctl)] border-[1.5px] border-[var(--border)] bg-[var(--surface)] px-3 text-base mb-4"
            value={relationship}
            onChange={(e) => setRelationship(e.target.value as ProfileFor)}
          >
            {RELATIONSHIPS.map((r) => (
              <option key={r} value={r}>
                {r}
              </option>
            ))}
          </select>

          {error && <p className="text-sm text-[var(--negative)] mb-3">{error}</p>}
          <Button type="submit" disabled={!name || saving}>
            Create profile
          </Button>
        </Card>
      </form>
    </CenteredForm>
  )
}
