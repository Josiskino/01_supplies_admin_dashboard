/**
 * usePhoneValidation
 *
 * Validation et normalisation des numéros de téléphone internationaux.
 *
 * Formats acceptés :
 *   - Avec préfixe international : +22890000000, 0022890000000
 *   - Sans préfixe explicite     : 22890000000
 *   - Tout pays : Togo (228), Bénin (229), France (33), etc.
 *
 * Règles :
 *   - Aucun espace autorisé
 *   - Débute par +, 00, ou des chiffres uniquement
 *   - Longueur : 8 à 15 chiffres (après suppression de + ou 00)
 *   - L'indicatif pays doit toujours être inclus
 */

// ─── Règles Vuetify (:rules sur AppTextField / VTextField) ──────────────────

export const phoneRules = [
  v => !v || !/\s/.test(v) || 'Supprimez les espaces du numéro',
  v => !v || /^(\+|00)?\d+$/.test(v) || 'Format invalide : utilisez uniquement des chiffres, avec + ou 00 en préfixe optionnel (ex: +22890000000)',
  v => {
    if (!v) return true
    const d = v.replace(/^\+|^00/, '').replace(/\D/g, '')
    if (d.length >= 8 && d.length <= 15) return true
    return 'Format invalide : saisissez le numéro complet avec indicatif (ex: +22890000000 ou 0022890000000)'
  },
]

// ─── Normalisation avant soumission ─────────────────────────────────────────

/**
 * Normalise le numéro en format E.164 sans le +.
 * Convertit le préfixe 00 en chiffres bruts.
 */
export const normalizePhone = phone => {
  if (!phone) return phone
  return phone.replace(/^\+|^00/, '').replace(/\D/g, '')
}

/**
 * Supprime les espaces en temps réel (appelé sur @update:model-value).
 * Retourne { value, warned } — warned = true si des espaces ont été détectés.
 */
export const stripSpaces = raw => {
  if (!raw) return { value: raw, warned: false }
  const warned = /\s/.test(raw)
  return { value: raw.replace(/\s/g, ''), warned }
}

// ─── Composable (pour usage dans <script setup>) ─────────────────────────────

export const usePhoneValidation = () => {
  return { phoneRules, normalizePhone, stripSpaces }
}

export default usePhoneValidation
