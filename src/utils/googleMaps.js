/**
 * Google Maps Distance Matrix API service
 */

import { $api } from '@/utils/api'

const GOOGLE_MAPS_API_KEY = import.meta.env.VITE_GOOGLE_MAPS_API_KEY

/**
 * Convert DMS (Degrees, Minutes, Seconds) to decimal degrees
 * @param {string} dms - DMS string like "6°11'37.0\"N" or "1°11'02.5\"E"
 * @returns {number} - Decimal degrees
 */
const dmsToDecimal = dms => {
  // Match DMS format: 6°11'37.0"N or 1°11'02.5"E
  const match = dms.match(/(\d+)°(\d+)'([\d.]+)"([NSEW])/i)
  if (!match) return null

  const [, degrees, minutes, seconds, direction] = match
  let decimal = parseFloat(degrees) + parseFloat(minutes) / 60 + parseFloat(seconds) / 3600

  // Make negative for South and West
  if (direction.toUpperCase() === 'S' || direction.toUpperCase() === 'W') {
    decimal = -decimal
  }

  return decimal
}

/**
 * Parse coordinates from various formats
 * @param {string} input - Coordinate input (URL, DMS, or decimal)
 * @returns {Object|null} - {lat, lng} or null if not found
 */
export const parseCoordinates = input => {
  if (!input) return null

  const trimmedInput = input.trim()

  try {
    // Try DMS format first: "6°11'37.0"N 1°11'02.5"E"
    const dmsPattern = /(\d+°\d+'[\d.]+"[NSEW])\s+(\d+°\d+'[\d.]+"[NSEW])/i
    const dmsMatch = trimmedInput.match(dmsPattern)
    
    if (dmsMatch) {
      const [, coord1, coord2] = dmsMatch
      const decimal1 = dmsToDecimal(coord1)
      const decimal2 = dmsToDecimal(coord2)
      
      if (decimal1 !== null && decimal2 !== null) {
        // Determine which is lat and which is lng based on N/S and E/W
        const isFirstLat = coord1.match(/[NS]/i)
        const isSecondLat = coord2.match(/[NS]/i)
        
        if (isFirstLat && !isSecondLat) {
          return { lat: decimal1, lng: decimal2 }
        } else if (!isFirstLat && isSecondLat) {
          return { lat: decimal2, lng: decimal1 }
        }
      }
    }

    // Try decimal format: "6.193611, 1.184028" or "6.193611,1.184028"
    const decimalPattern = /(-?(?:\d+(?:\.\d+)?|\.\d+))\s*,\s*(-?\d*\.?\d+)/
    const decimalMatch = trimmedInput.match(decimalPattern)
    
    if (decimalMatch) {
      return {
        lat: parseFloat(decimalMatch[1]),
        lng: parseFloat(decimalMatch[2]),
      }
    }

    // Try Google Maps URL patterns
    const urlPatterns = [
      // https://www.google.com/maps?q=lat,lng
      /[?&]q=(-?(?:\d+(?:\.\d+)?|\.\d+)),(-?\d*\.?\d+)/,

      // https://maps.google.com/maps?ll=lat,lng
      /[?&]ll=(-?(?:\d+(?:\.\d+)?|\.\d+)),(-?\d*\.?\d+)/,

      // https://www.google.com/maps/@lat,lng,zoom
      /@(-?(?:\d+(?:\.\d+)?|\.\d+)),(-?(?:\d+(?:\.\d+)?|\.\d+)),/,
    ]

    for (const pattern of urlPatterns) {
      const match = trimmedInput.match(pattern)
      if (match) {
        return {
          lat: parseFloat(match[1]),
          lng: parseFloat(match[2]),
        }
      }
    }

    return null
  } catch (error) {
    console.error('Error parsing coordinates:', error)
    
    return null
  }
}

/**
 * Extract coordinates from Google Maps URL (legacy function for backward compatibility)
 * @param {string} url - Google Maps URL
 * @returns {Object|null} - {lat, lng} or null if not found
 */
export const extractCoordinatesFromUrl = url => {
  return parseCoordinates(url)
}

/**
 * Calculate straight-line distance between two coordinates (Haversine formula)
 * @param {Object} origin - {lat, lng}
 * @param {Object} destination - {lat, lng}
 * @returns {number} - Distance in kilometers
 */
const calculateStraightLineDistance = (origin, destination) => {
  const R = 6371 // Earth's radius in kilometers
  const dLat = (destination.lat - origin.lat) * Math.PI / 180
  const dLng = (destination.lng - origin.lng) * Math.PI / 180

  const a = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(origin.lat * Math.PI / 180) * Math.cos(destination.lat * Math.PI / 180) *
    Math.sin(dLng / 2) * Math.sin(dLng / 2)

  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))
  
  return R * c
}

/**
 * Calculate distance between two coordinates using backend proxy with fallback
 * @param {Object} origin - {lat, lng}
 * @param {Object} destination - {lat, lng}
 * @returns {Promise<Object>} - {distance: number (in km), duration: string}
 */
export const calculateDistance = async (origin, destination) => {
  if (!origin || !destination) {
    throw new Error('Origin and destination coordinates are required')
  }

  try {
    // Try backend proxy first
    const requestBody = {
      origin: {
        lat: origin.lat,
        lng: origin.lng,
      },
      destination: {
        lat: destination.lat,
        lng: destination.lng,
      },
    }
    
    console.log('=== Sending request to backend ===')
    console.log('URL: /distance-matrix')
    console.log('Method: POST')
    console.log('Body:', JSON.stringify(requestBody, null, 2))
    console.log('================================')
    
    const response = await $api('/distance-matrix', {
      method: 'POST',
      body: requestBody,
    })
    
    console.log('=== Backend response ===')
    console.log('Response:', response)
    console.log('========================')

    if (response && response.success && response.data) {
      const data = response.data
      
      return {
        distance: data.distance, // Already in kilometers
        duration: data.duration || 'Unknown',
        distanceText: data.distance_text || `${data.distance.toFixed(1)} km`,
      }
    }
  } catch (backendError) {
    console.warn('Backend distance calculation failed, using fallback:', backendError.message)
    console.log('Full error details:', backendError)
    
    // Log the request data for debugging
    console.log('Request sent to backend:', {
      origin: {
        lat: origin.lat,
        lng: origin.lng,
      },
      destination: {
        lat: destination.lat,
        lng: destination.lng,
      },
    })
  }

  // Fallback to straight-line distance calculation
  try {
    const straightLineDistance = calculateStraightLineDistance(origin, destination)

    // Add ~30% to account for roads not being straight lines
    const adjustedDistance = straightLineDistance * 1.3

    console.log('Using fallback distance calculation:', {
      straightLine: straightLineDistance.toFixed(2) + ' km',
      adjusted: adjustedDistance.toFixed(2) + ' km',
    })

    return {
      distance: adjustedDistance,
      duration: 'Estimated',
      distanceText: `~${adjustedDistance.toFixed(1)} km (estimated)`,
      isEstimated: true,
    }
  } catch (error) {
    console.error('Error calculating distance:', error)
    throw new Error('Unable to calculate distance. Please check your coordinates.')
  }
}

/**
 * Calculate distance from coordinate inputs (URLs, DMS format, or decimal coordinates)
 * @param {string} pickupInput - Pickup location (URL, DMS like "6°11'37.0\"N 1°11'02.5\"E", or decimal coordinates)
 * @param {string} dropoffInput - Dropoff location (URL, DMS like "6°11'37.0\"N 1°11'02.5\"E", or decimal coordinates)
 * @returns {Promise<Object>} - {distance: number (in km), duration: string}
 */
export const calculateDistanceFromUrls = async (pickupInput, dropoffInput) => {
  const pickupCoords = parseCoordinates(pickupInput)
  const dropoffCoords = parseCoordinates(dropoffInput)

  if (!pickupCoords) {
    throw new Error('Could not extract coordinates from pickup location. Supported formats:\n- Google Maps URL\n- DMS format: 6°11\'37.0"N 1°11\'02.5"E\n- Decimal: 6.193611, 1.184028')
  }

  if (!dropoffCoords) {
    throw new Error('Could not extract coordinates from dropoff location. Supported formats:\n- Google Maps URL\n- DMS format: 6°11\'37.0"N 1°11\'02.5"E\n- Decimal: 6.193611, 1.184028')
  }

  return await calculateDistance(pickupCoords, dropoffCoords)
}

/**
 * Calculate delivery price based on distance and pricing settings
 * @param {number} distance - Distance in kilometers
 * @param {Object} pricingSettings - Pricing configuration
 * @returns {number} - Price in FCFA
 */
export const calculateDeliveryPrice = (distance, pricingSettings = null) => {
  // Default pricing if not provided
  /* eslint-disable camelcase */
  const pricing = pricingSettings || {
    range_0_1km: 375,
    range_1_5km: 500,
    range_5_6km: 600,
    additional_per_km: 100,
  }
  /* eslint-enable camelcase */

  if (distance <= 1) {
    return pricing.range_0_1km
  } else if (distance <= 5) {
    return pricing.range_1_5km
  } else if (distance <= 6) {
    return pricing.range_5_6km
  } else {
    // For distances > 6km: base price (5.1-6km) + additional per km
    const additionalKm = Math.ceil(distance - 6)

    return pricing.range_5_6km + (additionalKm * pricing.additional_per_km)
  }
}

/**
 * Test function to validate coordinate parsing (for development/debugging)
 * @param {string} input - Input to test
 * @returns {Object} - Test result with parsed coordinates
 */
export const testCoordinateParsing = input => {
  console.log('Testing coordinate parsing for:', input)

  const result = parseCoordinates(input)

  console.log('Parsed result:', result)
  
  return {
    input,
    result,
    isValid: result !== null,
  }
}

/**
 * Test function to validate backend distance calculation (for development/debugging)
 * @param {string} pickup - Pickup coordinates
 * @param {string} dropoff - Dropoff coordinates
 * @returns {Promise<Object>} - Test result
 */
export const testDistanceCalculation = async (pickup, dropoff) => {
  console.log('=== Testing Distance Calculation ===')
  console.log('Pickup:', pickup)
  console.log('Dropoff:', dropoff)
  
  try {
    const result = await calculateDistanceFromUrls(pickup, dropoff)

    console.log('✅ Success:', result)
    
    return { success: true, result }
  } catch (error) {
    console.log('❌ Error:', error.message)
    
    return { success: false, error: error.message }
  }
}
