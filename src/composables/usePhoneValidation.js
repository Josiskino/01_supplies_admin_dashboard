/**
 * usePhoneValidation
 *
 * Validation et normalisation des numéros de téléphone internationaux.
 *
 * Formats acceptés :
 *   - Tout numéro international avec indicatif : 228XXXXXXXX, 229XXXXXXXX, 225XXXXXXXX, etc.
 *   - Entre 8 et 15 chiffres après suppression des caractères non numériques
 *   - L'indicatif pays doit toujours être inclus
 *
 * Règles :
 *   - Aucun espace autorisé
 *   - Chiffres uniquement (pas de +, pas de tirets)
 *   - Longueur : 8 à 15 chiffres
 */

// ─── Règles Vuetify (:rules sur AppTextField / VTextField) ──────────────────

export const phoneRules = [
  v => !v || !/\s/.test(v)   || 'Supprimez les espaces du numéro',
  v => !v || /^\d+$/.test(v) || 'Le numéro ne doit contenir que des chiffres (ex: 22890000000)',
  v => {
    if (!v) return true
    const d = v.replace(/\D/g, '')
    if (d.length >= 8 && d.length <= 15) return true
    return 'Format invalide : saisissez le numéro complet avec indicatif (ex: 22890000000)'
  },
]

// ─── Normalisation avant soumission ─────────────────────────────────────────

/**
 * Retire tous les caractères non numériques.
 * L'indicatif doit être fourni par l'utilisateur.
 */
export const normalizePhone = phone => {
  if (!phone) return phone
  return phone.replace(/\D/g, '')
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
