import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { useQueryClient } from '@tanstack/react-query'
import { ArrowRight } from 'lucide-react'
import { Button, Card, CenteredForm, Field } from '../../components/ui'
import { supabase } from '../../lib/supabase'
import { createDemoProfile } from '../../lib/demoStore'
import { MAX_PROFILES, useProfiles, type ProfileFor } from '../../lib/profiles'

const RELATIONSHIPS: ProfileFor[] = ['parent', 'child', 'spouse', 'self', 'other']

export function NewProfile() {
  const { t } = useTranslation()
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const { data: profiles } = useProfiles()
  const [name, setName] = useState('')
  const [relationship, setRelationship] = useState<ProfileFor>('parent')
  const [error, setError] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)

  // person_managers allows one "self" row per user (unique partial index).
  const hasSelf = profiles?.some((p) => p.personIsMy === 'self') ?? false
  const atLimit = (profiles?.length ?? 0) >= MAX_PROFILES

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    const fullName = name.trim()
    if (!fullName) return
    setError(null)

    if (!supabase) {
      const personId = createDemoProfile(fullName, relationship)
      await queryClient.invalidateQueries({ queryKey: ['profiles'] })
      navigate(`/person/${personId}`)
      return
    }

    setSaving(true)
    const { data, error: rpcError } = await supabase.rpc('create_person', {
      p_full_name: fullName,
      p_profile_for: relationship,
    })
    setSaving(false)
    if (rpcError) {
      setError(/limit|10/i.test(rpcError.message) ? t('profiles.limitReachedBody') : t('auth.errorGeneric'))
      return
    }
    await queryClient.invalidateQueries({ queryKey: ['profiles'] })
    navigate(`/person/${data}`)
  }

  if (atLimit) {
    return (
      <CenteredForm title={t('profiles.limitReachedTitle')} subtitle={t('profiles.limitReachedBody')}>
        <Link to="/" className="block">
          <Button variant="quiet">{t('nav.profiles')}</Button>
        </Link>
      </CenteredForm>
    )
  }

  return (
    <CenteredForm title={t('profiles.new.title')} subtitle={t('profiles.new.subtitle')}>
      <form onSubmit={handleSubmit}>
        <Card className="p-6 md:p-7 border border-[var(--rule)]">
          <Field
            label={t('profiles.new.fullName')}
            placeholder={t('profiles.new.fullNamePlaceholder')}
            autoFocus
            maxLength={120}
            value={name}
            onChange={(e) => setName(e.target.value)}
            error={error}
          />

          <fieldset>
            <legend className="block text-[14px] font-semibold mb-2">{t('profiles.new.relationship')}</legend>
            <div className="flex flex-wrap gap-2">
              {RELATIONSHIPS.map((r) => {
                const active = relationship === r
                const disabled = r === 'self' && hasSelf
                return (
                  <button
                    key={r}
                    type="button"
                    aria-pressed={active}
                    disabled={disabled}
                    onClick={() => setRelationship(r)}
                    className={`h-11 px-4 rounded-full border-[1.5px] text-[14px] font-bold transition-all active:scale-[0.97] disabled:opacity-40 disabled:cursor-not-allowed ${
                      active
                        ? 'border-[var(--accent)] bg-[var(--accent)] text-white'
                        : 'border-[var(--border)] hover:border-[var(--accent)] hover:bg-[var(--ground)]'
                    }`}
                  >
                    {t(`profiles.relationship.${r}`)}
                  </button>
                )
              })}
            </div>
          </fieldset>

          <Button type="submit" disabled={!name.trim() || saving} className="mt-7 group">
            {saving ? t('profiles.new.creating') : t('profiles.new.create')}
            {!saving && <ArrowRight size={18} className="transition-transform group-hover:translate-x-1" />}
          </Button>
        </Card>
      </form>
    </CenteredForm>
  )
}
