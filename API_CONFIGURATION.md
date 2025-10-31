# Configuration API - Guide de débogage

## 🔧 Configuration actuelle détectée

### Frontend API Configuration
- Base URL: `import.meta.env.VITE_API_BASE_URL || '/api'`
- Endpoint appelé: `/v1/distance-matrix`
- URL complète: `${BASE_URL}/v1/distance-matrix`

### Votre Backend (ngrok)
- URL ngrok: `https://2ab83eedbac0.ngrok-free.app`
- Endpoint Laravel: `/api/v1/distance-matrix`

## 🎯 Problème identifié

Si `VITE_API_BASE_URL` n'est pas défini, l'appel va vers:
```
http://localhost:5173/api/v1/distance-matrix  ❌
```

Au lieu de:
```
https://2ab83eedbac0.ngrok-free.app/api/v1/distance-matrix  ✅
```

## 🚀 Solutions

### Solution 1: Créer un fichier .env.local
```bash
# Dans le dossier racine du projet frontend
echo "VITE_API_BASE_URL=https://2ab83eedbac0.ngrok-free.app/api" > .env.local
```

### Solution 2: Modifier temporairement le code
Dans `src/utils/api.js`, remplacez:
```javascript
baseURL: import.meta.env.VITE_API_BASE_URL || '/api',
```

Par:
```javascript
baseURL: import.meta.env.VITE_API_BASE_URL || 'https://2ab83eedbac0.ngrok-free.app/api',
```

### Solution 3: Vérifier les variables d'environnement
```javascript
// Dans la console du navigateur
console.log('VITE_API_BASE_URL:', import.meta.env.VITE_API_BASE_URL)
console.log('All env vars:', import.meta.env)
```

## 🔍 Tests de diagnostic

### Test 1: Vérifier l'URL complète
```javascript
// Dans la console du navigateur
import { $api } from '@/utils/api'
console.log('API Base URL:', $api.defaults?.baseURL)
```

### Test 2: Test manuel de l'endpoint
```bash
# Test direct avec curl
curl -X POST https://2ab83eedbac0.ngrok-free.app/api/v1/distance-matrix \
  -H "Content-Type: application/json" \
  -H "Accept: application/json" \
  -d '{
    "origin": {"lat": 6.193611, "lng": 1.184028},
    "destination": {"lat": 6.222, "lng": 1.1895}
  }'
```

### Test 3: Vérifier les headers ngrok
Ngrok peut parfois bloquer les requêtes sans certains headers. Ajoutez dans votre contrôleur Laravel:

```php
// Dans le contrôleur, ajoutez ces headers
return response()->json($result)->header('ngrok-skip-browser-warning', 'true');
```

## 📋 Checklist de débogage

- [ ] Vérifier que `VITE_API_BASE_URL` est défini
- [ ] Redémarrer le serveur de développement après modification .env
- [ ] Vérifier les logs Laravel (`tail -f storage/logs/laravel.log`)
- [ ] Tester l'endpoint directement avec curl
- [ ] Vérifier la configuration CORS dans Laravel
- [ ] Vérifier que ngrok fonctionne correctement

## 🎯 Après correction

Une fois la configuration corrigée, vous devriez voir dans la console:
```
=== Sending request to backend ===
URL: /v1/distance-matrix
Method: POST
Body: {
  "origin": {"lat": 6.193611, "lng": 1.184028},
  "destination": {"lat": 6.222, "lng": 1.1895}
}
================================
=== Backend response ===
Response: {
  "success": true,
  "data": {
    "distance": 3.2,
    "distance_text": "3.2 km",
    "duration": "8 mins"
  }
}
========================
```
