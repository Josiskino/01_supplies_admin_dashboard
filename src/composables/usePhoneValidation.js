/**
 * usePhoneValidation
 *
 * Validation et normalisation des numéros de téléphone togolais.
 *
 * Formats acceptés :
 *   - 228XXXXXXXX  (11 chiffres, indicatif inclus)
 *   - XXXXXXXX     (8 chiffres, indicatif 228 ajouté automatiquement à la soumission)
 *
 * Règles :
 *   - Aucun espace autorisé
 *   - Chiffres uniquement
 *   - Longueur : 8 ou 11 chiffres (11 doit commencer par 228)
 */

// ─── Règles Vuetify (:rules sur AppTextField / VTextField) ──────────────────

export const phoneRules = [
  v => !v || !/\s/.test(v)    || 'Supprimez les espaces du numéro',
  v => !v || /^\d+$/.test(v)  || 'Le numéro ne doit contenir que des chiffres',
  v => {
    if (!v) return true
    const d = v.replace(/\D/g, '')
    if (d.length === 8) return true
    if (d.length === 11 && d.startsWith('228')) return true
    return 'Format invalide : 228XXXXXXXX (11 chiffres) ou XXXXXXXX (8 chiffres sans indicatif)'
  },
]

// ─── Normalisation avant soumission ─────────────────────────────────────────

/**
 * Retire les espaces, ajoute l'indicatif 228 si 8 chiffres.
 * Retourne null si le format final est invalide.
 */
export const normalizePhone = phone => {
  if (!phone) return phone
  const digits = phone.replace(/\D/g, '')
  if (digits.length === 8)                        return '228' + digits
  if (digits.length === 11 && digits.startsWith('228')) return digits
  return phone // laisser passer (la validation Vuetify aura déjà bloqué)
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
