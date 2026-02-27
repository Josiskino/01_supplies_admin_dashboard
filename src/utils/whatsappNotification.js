export async function sendWhatsAppMessage(phone, message) {
  if (!phone) return null

  // Nettoyage du numéro de téléphone
  const cleanPhone = phone.replace(/[\s\-()]/g, '')
  // S'assurer qu'il commence par un + (requis par de nombreux standards, bien que l'API l'accepte sans)
  const formattedPhone = cleanPhone.startsWith('+') ? cleanPhone : `+${cleanPhone}`

  try {
    const url = 'https://vmi3052503.contaboserver.net/webhook/delivery-notification'
    const apiKey = 'c655bcd9957c0002274829a775af1703068f57f5f4f130c4b6ad253cbcbd9d69'

    console.log(`Sending WhatsApp message to ${formattedPhone}`)

    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'NW-API-KEY': apiKey,
      },
      body: JSON.stringify({
        phone: formattedPhone,
        message: message,
      }),
    })

    const data = await response.json()
    if (!response.ok) {
      console.error('WhatsApp API Error:', data)
      throw new Error(data.message || 'Error sending WhatsApp notification')
    }

    return data
  } catch (error) {
    console.error('Failed to send WhatsApp message:', error)
    // Nous ne lançons pas d'erreur pour ne pas bloquer l'interface si WhatsApp échoue
    return null
  }
}

/**
 * Fonction métier pour construire et envoyer les messages lors de l'assignation initiale
 */
export async function notifyActorsOnAssignment(delivery, t) {
  // Extraire les noms et numéros avec les fallbacks existants (similaire à openWhatsApp)
  const requesterObj = delivery?.requester || delivery?.partner || delivery?.customer
  let requesterName =
    delivery?.requester_name ||
    requesterObj?.full_name ||
    requesterObj?.name ||
    (requesterObj ? `${requesterObj.first_name || ''} ${requesterObj.last_name || ''}`.trim() : '') ||
    '—'
  let requesterPhone = requesterObj?.phone || requesterObj?.contact_phone || requesterObj?.phone_number || ''

  const recipientObj = delivery?.recipient || delivery?.customer
  let recipientName =
    delivery?.recipient_name ||
    recipientObj?.full_name ||
    recipientObj?.name ||
    (recipientObj ? `${recipientObj.first_name || ''} ${recipientObj.last_name || ''}`.trim() : '') ||
    '—'
  let recipientPhone = recipientObj?.phone || recipientObj?.contact_phone || recipientObj?.phone_number || ''

  const driverName = `${delivery?.driver?.first_name || ''} ${delivery?.driver?.last_name || ''}`.trim() || '—'
  const driverPhone = delivery?.driver?.phone || ''

  const formatPrice = (price) => {
    return price ? new Intl.NumberFormat('fr-FR').format(price) : '0'
  }
  const price = delivery?.price ? `${formatPrice(delivery.price)} FCFA` : (t('Not specified') || 'Non spécifié')

  const formatLocation = (loc) => {
    let locStr = loc?.url || loc?.address || loc || ''
    if (typeof locStr !== 'string' || !locStr) return t('Not specified') || 'Non spécifié'
    if (locStr.startsWith('http://') || locStr.startsWith('https://')) return locStr
    return `${locStr}\n🗺️ https://www.google.com/maps?q=${encodeURIComponent(locStr)}`
  }

  const pickupLocation = formatLocation(delivery?.pickup_location)
  const dropoffLocation = formatLocation(delivery?.dropoff_location)

  const promises = []

  // 1. Message pour le Livreur (format complet)
  if (driverPhone) {
    let driverMessage = `🚚 *Nouvelle livraison*\n\n`
    driverMessage += `📍 *${t('Requester') || 'Demandeur'}:* ${requesterName}`
    if (requesterPhone) driverMessage += `\n📞 Tél: ${requesterPhone}`
    driverMessage += `\n`
    driverMessage += `👤 *${t('Recipient') || 'Destinataire'}:* ${recipientName}`
    if (recipientPhone) driverMessage += `\n📞 Tél: ${recipientPhone}`
    driverMessage += `\n\n`
    driverMessage += `📦 *Point de collecte:*\n${pickupLocation}\n\n`
    driverMessage += `🏠 *Point de livraison:*\n${dropoffLocation}\n\n`
    driverMessage += `💰 *Prix:* ${price}\n`
    
    // Possibilité d'ajouter le lien map combiné si on a les coordonnées, sinon on prend l'adresse
    
    promises.push(sendWhatsAppMessage(driverPhone, driverMessage))
  }

  // 2. Message pour le Demandeur
  if (requesterPhone) {
    let requesterMessage = `🚚 *Nouvelle livraison validée*\nVotre livraison a été assignée.\n`
    requesterMessage += `👤 *Livreur:* ${driverName}\n`
    requesterMessage += `📞 *Téléphone:* ${driverPhone}\n`
    requesterMessage += `💰 *Prix:* ${price}`

    promises.push(sendWhatsAppMessage(requesterPhone, requesterMessage))
  }

  // 3. Message pour le Destinataire
  if (recipientPhone) {
    const hour = new Date().getHours()
    const greeting = hour < 18 ? 'Bonjour' : 'Bonsoir'
    let recipientMessage = `${greeting} 👋,\n\n📦 *Prise en charge de votre colis*\nUn livreur a été assigné pour récupérer et vous apporter votre colis.\n\n`
    recipientMessage += `👤 *Livreur:* ${driverName}\n`
    recipientMessage += `📞 *Téléphone:* ${driverPhone}\n`

    promises.push(sendWhatsAppMessage(recipientPhone, recipientMessage))
  }

  await Promise.allSettled(promises)
}

/**
 * Fonction métier pour notifier UNIQUEMENT le livreur lors d'un changement d'adresse
 */
export async function notifyDriverOnAddressChange(delivery, t) {
  const driverPhone = delivery?.driver?.phone || ''
  if (!driverPhone) return

  const requesterObj = delivery?.requester || delivery?.partner || delivery?.customer
  let requesterName =
    delivery?.requester_name ||
    requesterObj?.full_name ||
    requesterObj?.name ||
    (requesterObj ? `${requesterObj.first_name || ''} ${requesterObj.last_name || ''}`.trim() : '') ||
    '—'
  let requesterPhone = requesterObj?.phone || requesterObj?.contact_phone || requesterObj?.phone_number || ''

  const recipientObj = delivery?.recipient || delivery?.customer
  let recipientName =
    delivery?.recipient_name ||
    recipientObj?.full_name ||
    recipientObj?.name ||
    (recipientObj ? `${recipientObj.first_name || ''} ${recipientObj.last_name || ''}`.trim() : '') ||
    '—'
  let recipientPhone = recipientObj?.phone || recipientObj?.contact_phone || recipientObj?.phone_number || ''
  
  const formatPrice = (price) => {
    return price ? new Intl.NumberFormat('fr-FR').format(price) : '0'
  }
  const price = delivery?.price ? `${formatPrice(delivery.price)} FCFA` : (t('Not specified') || 'Non spécifié')

  const formatLocation = (loc) => {
    let locStr = loc?.url || loc?.address || loc || ''
    if (typeof locStr !== 'string' || !locStr) return t('Not specified') || 'Non spécifié'
    if (locStr.startsWith('http://') || locStr.startsWith('https://')) return locStr
    return `${locStr}\n🗺️ https://www.google.com/maps?q=${encodeURIComponent(locStr)}`
  }

  const pickupLocation = formatLocation(delivery?.pickup_location)
  const dropoffLocation = formatLocation(delivery?.dropoff_location)

  let driverMessage = `⚠️ *MODIFICATION D'ADRESSE DE LIVRAISON*\n`
  driverMessage += `L'adresse pour cette livraison a été modifiée. Voici les nouvelles informations :\n\n`
  driverMessage += `📍 *${t('Requester') || 'Demandeur'}:* ${requesterName}`
  if (requesterPhone) driverMessage += `\n📞 Tél: ${requesterPhone}`
  driverMessage += `\n`
  driverMessage += `👤 *${t('Recipient') || 'Destinataire'}:* ${recipientName}`
  if (recipientPhone) driverMessage += `\n📞 Tél: ${recipientPhone}`
  driverMessage += `\n\n`
  driverMessage += `📦 *Nouveau Point de collecte:*\n${pickupLocation}\n\n`
  driverMessage += `🏠 *Nouveau Point de livraison:*\n${dropoffLocation}\n\n`
  driverMessage += `💰 *Prix (vérifiez s'il a changé):* ${price}\n`

  await sendWhatsAppMessage(driverPhone, driverMessage)
}
