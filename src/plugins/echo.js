import Echo from 'laravel-echo'
import Pusher from 'pusher-js'

window.Pusher = Pusher
Pusher.logToConsole = true

const BASE_URL = import.meta.env.VITE_API_BASE_URL.replace('/api/v1', '')

export const echo = new Echo({
  broadcaster: 'pusher',
  key: import.meta.env.VITE_PUSHER_APP_KEY,
  cluster: import.meta.env.VITE_PUSHER_APP_CLUSTER,
  forceTLS: import.meta.env.VITE_PUSHER_SCHEME === 'https',

  // Authentification des canaux privés avec le token Bearer courant
  authorizer: channel => ({
    authorize: (socketId, callback) => {
      const token = useCookie('accessToken').value

      fetch(`${BASE_URL}/api/broadcasting/auth`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({
          socket_id: socketId,
          channel_name: channel.name,
        }),
      })
        .then(res => res.json())
        .then(data => callback(null, data))
        .catch(err => callback(err, null))
    },
  }),
})

export default function (app) {
  app.config.globalProperties.$echo = echo
}
