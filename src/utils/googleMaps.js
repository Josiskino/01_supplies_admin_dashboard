/**
 * Utilitaires Google Maps — côté frontend.
 *
 * Le calcul de distance (parsing de coordonnées + appel OSRM/Google Maps)
 * est désormais entièrement géré par le backend via POST /distance-matrix.
 *
 * Ce fichier conserve uniquement :
 *  - parseCoordinates()          → utilisé pour générer des liens Google Maps
 *  - generateCombinedMapLink()   → lien d'itinéraire affiché dans la liste des livraisons
 *  - calculateDistanceFromUrls() → appel backend simplifié
 *  - calculateDeliveryPrice()    → appel backend pour le calcul tarifaire
 */

import { $api } from '@/utils/api'

// -----------------------------------------------------------------------------
// Parsing de coordonnées (conservé pour generateCombinedMapLink uniquement)
// -----------------------------------------------------------------------------

/**
 * Convertit une valeur DMS en degrés décimaux.
 * @param {string} dms - Ex: "6°11'37.0\"N"
 * @returns {number|null}
 */
const dmsToDecimal = dms => {
  const match = dms.match(/(\d+)°(\d+)'([\d.]+)"([NSEW])/i)
  if (!match) return null

  const [, degrees, minutes, seconds, direction] = match
  let decimal = parseFloat(degrees) + parseFloat(minutes) / 60 + parseFloat(seconds) / 3600

  if (direction.toUpperCase() === 'S' || direction.toUpperCase() === 'W') {
    decimal = -decimal
  }

  return decimal
}

/**
 * Parse une chaîne de localisation vers {lat, lng}.
 * Formats supportés : URL Google Maps, DMS, décimal.
 *
 * Utilisé uniquement pour generateCombinedMapLink().
 * Le calcul de distance passe par le backend — pas besoin d'appeler cette
 * fonction avant d'envoyer les locations à l'API.
 *
 * @param {string} input
 * @returns {{lat: number, lng: number}|null}
 */
export const parseCoordinates = input => {
  if (!input) return null

  const trimmedInput = input.trim()

  try {
    // Format DMS : "6°11'37.0"N 1°11'02.5"E"
    const dmsPattern = /(\d+°\d+'[\d.]+"[NSEW])\s+(\d+°\d+'[\d.]+"[NSEW])/i
    const dmsMatch = trimmedInput.match(dmsPattern)

    if (dmsMatch) {
      const decimal1 = dmsToDecimal(dmsMatch[1])
      const decimal2 = dmsToDecimal(dmsMatch[2])

      if (decimal1 !== null && decimal2 !== null) {
        const firstIsLat = dmsMatch[1].match(/[NS]/i)

        return firstIsLat
          ? { lat: decimal1, lng: decimal2 }
          : { lat: decimal2, lng: decimal1 }
      }
    }

    // Format décimal : "6.193611, 1.184028"
    const decimalMatch = trimmedInput.match(/^(-?(?:\d+(?:\.\d+)?|\.\d+))\s*,\s*(-?\d*\.?\d+)$/)
    if (decimalMatch) {
      return { lat: parseFloat(decimalMatch[1]), lng: parseFloat(decimalMatch[2]) }
    }

    // URLs Google Maps
    const urlPatterns = [
      /[?&]q=(-?(?:\d+(?:\.\d+)?|\.\d+)),(-?\d*\.?\d+)/,
      /[?&]ll=(-?(?:\d+(?:\.\d+)?|\.\d+)),(-?\d*\.?\d+)/,
      /@(-?(?:\d+(?:\.\d+)?|\.\d+)),(-?(?:\d+(?:\.\d+)?|\.\d+)),/,
    ]

    for (const pattern of urlPatterns) {
      const match = trimmedInput.match(pattern)
      if (match) {
        return { lat: parseFloat(match[1]), lng: parseFloat(match[2]) }
      }
    }

    return null
  }
  catch (error) {
    console.error('Error parsing coordinates:', error)
    return null
  }
}

/** Alias pour compatibilité ascendante */
export const extractCoordinatesFromUrl = url => parseCoordinates(url)

// -----------------------------------------------------------------------------
// Calcul de distance — délégué au backend
// -----------------------------------------------------------------------------

/**
 * Calcule la distance entre deux localisations via le backend.
 *
 * Le backend accepte n'importe quel format pour origin et destination :
 *  - URL Google Maps
 *  - DMS  (ex: 6°11'37.0"N 1°11'02.5"E)
 *  - Décimal (ex: 6.1936, 1.1840)
 *
 * @param {string} pickupInput  - Localisation de départ (brute, tel quel)
 * @param {string} dropoffInput - Localisation d'arrivée (brute, tel quel)
 * @returns {Promise<{distance: number, duration: string, distanceText: string, isEstimated: boolean}>}
 */
export const calculateDistanceFromUrls = async (pickupInput, dropoffInput) => {
  const response = await $api('/distance-matrix', {
    method: 'POST',
    body: {
      origin:      pickupInput,
      destination: dropoffInput,
    },
  })

  if (response?.success && response?.data) {
    return {
      distance:     response.data.distance,
      duration:     response.data.duration,
      distanceText: response.data.distance_text,
      isEstimated:  response.data.is_estimated ?? false,
    }
  }

  throw new Error(response?.message || 'Impossible de calculer la distance')
}

// -----------------------------------------------------------------------------
// Calcul de prix — délégué au backend
// -----------------------------------------------------------------------------

/**
 * Calcule le prix d'une livraison via le backend.
 *
 * @param {number} distanceKm    - Distance en km
 * @param {number|null} configId - ID de la config tarifaire (null = config par défaut)
 * @returns {Promise<{price: number, rounded_km: number, config_id: number, config_name: string}>}
 */
export const calculateDeliveryPrice = async (distanceKm, configId = null) => {
  const body = { distance_km: distanceKm }
  if (configId) body.config_id = configId

  const response = await $api('/calculation-configs/calculate', {
    method: 'POST',
    body,
  })

  return response.data
}

// -----------------------------------------------------------------------------
// Génération de lien Maps
// -----------------------------------------------------------------------------

/**
 * Génère un lien Google Maps avec l'itinéraire pickup → dropoff.
 * Utilisé dans la liste des livraisons pour afficher un lien cliquable.
 *
 * @param {string|Object} pickup
 * @param {string|Object} dropoff
 * @returns {string}
 */
export const generateCombinedMapLink = (pickup, dropoff) => {
  const pickupCoords  = parseCoordinates(pickup)
  const dropoffCoords = parseCoordinates(dropoff)

  if (pickupCoords && dropoffCoords) {
    return `https://www.google.com/maps/dir/?api=1&origin=${pickupCoords.lat},${pickupCoords.lng}&destination=${dropoffCoords.lat},${dropoffCoords.lng}`
  }

  if (dropoffCoords) {
    return `https://www.google.com/maps/dir/?api=1&destination=${dropoffCoords.lat},${dropoffCoords.lng}`
  }

  if (pickupCoords) {
    return `https://www.google.com/maps/search/?api=1&query=${pickupCoords.lat},${pickupCoords.lng}`
  }

  const pickupStr  = typeof pickup === 'string' ? pickup : (pickup?.url || '')
  const dropoffStr = typeof dropoff === 'string' ? dropoff : (dropoff?.url || '')

  if (pickupStr && dropoffStr) {
    return `https://www.google.com/maps/dir/?api=1&origin=${encodeURIComponent(pickupStr)}&destination=${encodeURIComponent(dropoffStr)}`
  }

  const finalQuery = dropoffStr || pickupStr || ''
  if (finalQuery) {
    return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(finalQuery)}`
  }

  return 'https://www.google.com/maps'
}
