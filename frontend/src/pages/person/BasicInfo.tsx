import { useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Camera, Trash2 } from 'lucide-react'
import { Switch } from '../../components/ui'
import {
  ageFrom,
  BLOOD_GROUPS,
  SPOKEN_LANGUAGES,
  usePhotoUrl,
  useUpdatePerson,
  useUploadPhoto,
  type PersonDetail,
  type PersonFields,
} from '../../lib/person'
import { initials } from '../../lib/profiles'
import { AlwaysShown, AutoInput, FieldRow, NeverShown, Section, Segmented, Visibility } from './editorUi'
import { ghostButton, inputClass, useSave, useToday } from './editorKit'

/** Centre-crop to a square and shrink to 512px JPEG before upload (spec
 * §4.7: "crop-to-square is enough"). */
async function squarePhoto(file: File): Promise<{ blob: Blob; dataUrl: string }> {
  const bitmap = await createImageBitmap(file)
  const side = Math.min(bitmap.width, bitmap.height)
  const size = Math.min(512, side)
  const canvas = document.createElement('canvas')
  canvas.width = size
  canvas.height = size
  canvas.getContext('2d')!.drawImage(bitmap, (bitmap.width - side) / 2, (bitmap.height - side) / 2, side, side, 0, 0, size, size)
  const dataUrl = canvas.toDataURL('image/jpeg', 0.82)
  const blob = await new Promise<Blob>((resolve, reject) => canvas.toBlob((b) => (b ? resolve(b) : reject(new Error('encode'))), 'image/jpeg', 0.82))
  return { blob, dataUrl }
}

function PhotoField({ person, hue }: { person: PersonDetail; hue: { fg: string; bg: string } }) {
  const { t } = useTranslation()
  const { track } = useSave()
  const update = useUpdatePerson(person.id)
  const upload = useUploadPhoto(person.id)
  const { data: url } = usePhotoUrl(person.photo_path)
  const fileInput = useRef<HTMLInputElement>(null)
  const [problem, setProblem] = useState(false)

  async function onPick(file: File | undefined) {
    if (!file) return
    setProblem(false)
    try {
      const photo = await squarePhoto(file)
      await track(upload.mutateAsync(photo))
    } catch {
      setProblem(true)
    }
  }

  return (
    <FieldRow
      label={t('person.photo')}
      visibility={<Visibility on={person.show_photo} field={t('person.photo')} onToggle={() => track(update.mutateAsync({ show_photo: !person.show_photo }))} />}
      hint={problem ? <span className="text-[var(--negative)] font-semibold">{t('person.photoFailed')}</span> : t('person.photoHint')}
    >
      <div className="flex items-center gap-4">
        {url ? (
          <img src={url} alt="" className="w-20 h-20 rounded-[14px] object-cover flex-none" />
        ) : (
          <span className="w-20 h-20 rounded-[14px] flex-none flex items-center justify-center text-[22px] font-extrabold" style={{ background: hue.bg, color: hue.fg }}>
            {initials(person.display_name || person.full_name)}
          </span>
        )}
        <div className="flex flex-wrap gap-2">
          <input ref={fileInput} type="file" accept="image/*" className="sr-only" tabIndex={-1} onChange={(e) => onPick(e.target.files?.[0])} />
          <button type="button" className={ghostButton} onClick={() => fileInput.current?.click()} disabled={upload.isPending}>
            <Camera size={16} /> {person.photo_path ? t('person.changePhoto') : t('person.addPhoto')}
          </button>
          {person.photo_path && (
            <button type="button" className={ghostButton} onClick={() => track(update.mutateAsync({ photo_path: null }))}>
              <Trash2 size={15} /> {t('person.removePhoto')}
            </button>
          )}
        </div>
      </div>
    </FieldRow>
  )
}

export function BasicInfo({ person, hue }: { person: PersonDetail; hue: { fg: string; bg: string } }) {
  const { t } = useTranslation()
  const { track } = useSave()
  const update = useUpdatePerson(person.id)
  const save = (patch: Partial<PersonFields>) => track(update.mutateAsync(patch))
  const flip = (key: keyof PersonFields & `show_${string}`) => save({ [key]: !person[key] })
  const age = ageFrom(person.date_of_birth)
  const today = useToday()

  return (
    <Section id="about" title={t('person.aboutTitle')} description={t('person.aboutBody')}>
      <PhotoField person={person} hue={hue} />

      <FieldRow label={t('person.fullName')} htmlFor="full_name" visibility={<NeverShown />} hint={t('person.fullNameHint')}>
        <AutoInput id="full_name" value={person.full_name} required maxLength={120} autoComplete="off" onSave={(v) => save({ full_name: v ?? person.full_name })} />
      </FieldRow>

      <FieldRow label={t('person.displayName')} htmlFor="display_name" visibility={<AlwaysShown />} hint={t('person.displayNameHint')}>
        <AutoInput id="display_name" value={person.display_name} maxLength={60} placeholder={person.full_name} autoComplete="off" onSave={(v) => save({ display_name: v })} />
      </FieldRow>

      <FieldRow
        label={t('person.dateOfBirth')}
        htmlFor="date_of_birth"
        visibility={<Visibility on={person.show_age} field={t('person.age')} onToggle={() => flip('show_age')} />}
        hint={age !== null ? t('person.ageHint', { age }) : t('person.ageHintEmpty')}
      >
        <AutoInput id="date_of_birth" type="date" min="1900-01-02" max={today} value={person.date_of_birth} onSave={(v) => save({ date_of_birth: v })} />
      </FieldRow>

      <FieldRow
        label={t('person.languages')}
        visibility={<Visibility on={person.show_languages} field={t('person.languages')} onToggle={() => flip('show_languages')} />}
      >
        <div className="flex flex-wrap gap-2" role="group" aria-label={t('person.languages')}>
          {SPOKEN_LANGUAGES.map((code) => {
            const on = person.spoken_languages.includes(code)
            return (
              <button
                key={code}
                type="button"
                lang={code}
                aria-pressed={on}
                onClick={() =>
                  save({ spoken_languages: on ? person.spoken_languages.filter((c) => c !== code) : [...person.spoken_languages, code] })
                }
                className={`h-11 px-4 rounded-full text-[15px] font-semibold border transition-colors ${
                  on ? 'bg-[var(--deep)] border-[var(--deep)] text-white' : 'bg-[var(--surface)] border-[var(--control)] hover:border-[var(--accent)]'
                }`}
              >
                {t(`scan.lang_${code}`, { lng: code })}
              </button>
            )
          })}
        </div>
      </FieldRow>

      <FieldRow
        label={t('person.bloodGroup')}
        htmlFor="blood_group"
        visibility={<Visibility on={person.show_blood_group} field={t('person.bloodGroup')} onToggle={() => flip('show_blood_group')} />}
        hint={t('person.bloodGroupHint')}
      >
        <select
          id="blood_group"
          value={person.blood_group ?? ''}
          onChange={(e) => save({ blood_group: e.target.value || null })}
          className={`${inputClass} max-w-[240px]`}
        >
          <option value="">{t('person.notSet')}</option>
          {BLOOD_GROUPS.map((g) => (
            <option key={g} value={g}>
              {g === 'unknown' ? t('person.bloodUnknown') : g}
            </option>
          ))}
        </select>
      </FieldRow>

      <FieldRow
        label={t('person.organDonor')}
        visibility={<Visibility on={person.show_organ_donor} field={t('person.organDonor')} onToggle={() => flip('show_organ_donor')} />}
        hint={t('person.organDonorHint')}
      >
        <Segmented
          label={t('person.organDonor')}
          value={person.organ_donor === null ? 'unset' : person.organ_donor ? 'yes' : 'no'}
          options={[
            { value: 'yes', label: t('person.yes') },
            { value: 'no', label: t('person.no') },
            { value: 'unset', label: t('person.notSet') },
          ]}
          onChange={(v) => save({ organ_donor: v === 'unset' ? null : v === 'yes' })}
        />
      </FieldRow>

      <FieldRow
        label={t('person.communication')}
        htmlFor="communication_needs"
        visibility={<Visibility on={person.show_communication_needs} field={t('person.communication')} onToggle={() => flip('show_communication_needs')} />}
        hint={t('person.communicationHint')}
      >
        <AutoInput id="communication_needs" multiline maxLength={300} value={person.communication_needs} onSave={(v) => save({ communication_needs: v })} />
      </FieldRow>

      <FieldRow
        label={t('person.hospital')}
        htmlFor="preferred_hospital"
        visibility={<Visibility on={person.show_preferred_hospital} field={t('person.hospital')} onToggle={() => flip('show_preferred_hospital')} />}
      >
        <AutoInput id="preferred_hospital" maxLength={120} value={person.preferred_hospital} onSave={(v) => save({ preferred_hospital: v })} />
      </FieldRow>

      <FieldRow
        label={t('person.insurer')}
        htmlFor="insurer_name"
        visibility={<Visibility on={person.show_insurance} field={t('person.insurer')} onToggle={() => flip('show_insurance')} />}
        hint={t('person.insurerHint')}
      >
        <AutoInput id="insurer_name" maxLength={80} value={person.insurer_name} onSave={(v) => save({ insurer_name: v })} />
      </FieldRow>

      <FieldRow label={t('person.policyNumber')} htmlFor="insurance_policy_number" visibility={<NeverShown />} hint={t('person.policyNumberHint')}>
        <AutoInput id="insurance_policy_number" maxLength={60} value={person.insurance_policy_number} onSave={(v) => save({ insurance_policy_number: v })} />
      </FieldRow>

      <div className="mt-2 rounded-[12px] bg-[var(--panel-row)] border border-[var(--border)] p-4">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <p className="text-[15px] font-bold">{t('person.lostTitle')}</p>
            <p className="text-[13px] text-[var(--muted)] mt-1 leading-relaxed">{t('person.lostBody')}</p>
          </div>
          <Switch on={person.lost_person_mode} label={t('person.lostTitle')} onToggle={() => save({ lost_person_mode: !person.lost_person_mode })} />
        </div>
        {person.lost_person_mode && (
          <div className="mt-3">
            <label htmlFor="home_area" className="block text-[14px] font-semibold mb-1.5">
              {t('person.homeArea')}
            </label>
            <AutoInput id="home_area" maxLength={80} placeholder={t('person.homeAreaPlaceholder')} value={person.home_area} onSave={(v) => save({ home_area: v })} />
            <p className="text-[13px] text-[var(--muted)] mt-2">{t('person.homeAreaHint')}</p>
          </div>
        )}
      </div>
    </Section>
  )
}
