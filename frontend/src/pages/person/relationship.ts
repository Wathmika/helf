import { useTranslation } from 'react-i18next'
import type { ContactRelationship } from '../../lib/person'

/** Relationship words from the scan page, so "daughter" here is the same
 * word a helper reads (and stays distinct from "son" in Sinhala and Tamil). */
export function useRelationshipLabel() {
  const { t, i18n } = useTranslation()
  return (r: ContactRelationship) => {
    if (r === 'other') return t('person.relOther')
    const word = t(`scan.rel_${r}`)
    return i18n.resolvedLanguage === 'en' ? word[0].toUpperCase() + word.slice(1) : word
  }
}
