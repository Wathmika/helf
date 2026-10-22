import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { useQueryClient } from '@tanstack/react-query'
import { Info } from 'lucide-react'
import { Button, Card, CenteredForm, Field, SelectField } from '../../components/ui'
import { supabase } from '../../lib/supabase'
import type { ProfileFor } from '../../lib/profiles'

const RELATIONSHIPS: ProfileFor[] = ['parent', 'child', 'spouse', 'other']

/** Join a profile someone else owns, with the one-time code they sent —
 * accept_person_invite(p_code, p_person_is_my) makes the caller an editor
 * (docs/architecture-for-frontend.md §4, §6). */
export function InviteEntry() {
  const { t } = useTranslation()
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const [code, setCode] = useState('')
  const [relationship, setRelationship] = useState<ProfileFor>('parent')
  const [error, setError] = useState<string | null>(null)
  const [joining, setJoining] = useState(false)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!supabase || !code.trim()) return
    setError(null)
    setJoining(true)
    const { data, error: rpcError } = await supabase.rpc('accept_person_invite', {
      p_code: code.trim(),
      p_person_is_my: relationship,
    })
    setJoining(false)
    if (rpcError) {
      setError(/limit|10/i.test(rpcError.message) ? t('profiles.limitReachedBody') : t('invite.error'))
      return
    }
    await queryClient.invalidateQueries({ queryKey: ['profiles'] })
    navigate(`/person/${data}`)
  }

  return (
    <CenteredForm title={t('invite.title')} subtitle={t('invite.subtitle')}>
      <form onSubmit={handleSubmit}>
        <Card className="p-6 md:p-7 border border-[var(--rule)]">
          {!supabase && (
            <p className="flex gap-2.5 items-start rounded-2xl bg-[var(--warning-soft)] text-[var(--warning-ink)] p-3.5 text-[14px] font-semibold mb-5">
              <Info size={17} className="flex-none mt-0.5" /> {t('invite.demoNote')}
            </p>
          )}
          <Field
            label={t('invite.codeLabel')}
            placeholder={t('invite.codePlaceholder')}
            autoComplete="off"
            autoCapitalize="characters"
            spellCheck={false}
            value={code}
            onChange={(e) => setCode(e.target.value)}
            error={error}
            className="tracking-[0.12em] font-bold"
          />
          <SelectField
            label={t('invite.relationship')}
            value={relationship}
            onChange={(e) => setRelationship(e.target.value as ProfileFor)}
          >
            {RELATIONSHIPS.map((r) => (
              <option key={r} value={r}>
                {t(`profiles.relationship.${r}`)}
              </option>
            ))}
          </SelectField>
          <Button type="submit" disabled={!supabase || !code.trim() || joining} className="mt-3">
            {joining ? t('invite.joining') : t('invite.join')}
          </Button>
        </Card>
      </form>
    </CenteredForm>
  )
}
