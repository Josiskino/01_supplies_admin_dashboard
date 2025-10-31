# Test API Distance Matrix

## 🚀 Changements effectués

1. **URL corrigée** : `/distance-matrix` → `/v1/distance-matrix`
2. **Base URL configurée** : Pointe vers votre ngrok
3. **Logging ajouté** : Pour voir exactement ce qui est envoyé/reçu

## 🧪 Test à effectuer

1. **Redémarrez le serveur** :
   ```bash
   npm run dev -- --port 3000
   ```

2. **Ouvrez la console du navigateur** (F12)

3. **Testez l'ajout d'une livraison** avec ces coordonnées :
   - Pickup: `6.193611, 1.184028`
   - Dropoff: `6.222, 1.1895`

4. **Observez les logs** dans la console :
   ```
   === Sending request to backend ===
   URL: /v1/distance-matrix
   Method: POST
   Body: {
     "origin": {"lat": 6.193611, "lng": 1.184028},
     "destination": {"lat": 6.222, "lng": 1.1895}
   }
   ================================
   ```

## 📋 Résultats attendus

### ✅ Si ça marche (backend répond)
```
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
Distance calculation result: {
  distance: "3.2 km",
  price: "500 FCFA", 
  duration: "8 mins"
}
```

### ❌ Si ça ne marche pas (toujours 400)
```
POST https://2ab83eedbac0.ngrok-free.app/api/v1/distance-matrix 400 (Bad Request)
Backend distance calculation failed, using fallback: [POST] "...": 400
Using fallback distance calculation: {
  straightLine: '3.21 km', 
  adjusted: '4.18 km'
}
```

## 🔍 Si l'erreur 400 persiste

### Vérifiez côté Laravel :

1. **Logs Laravel** :
   ```bash
   tail -f storage/logs/laravel.log
   ```

2. **Test direct** :
   ```bash
   curl -X POST https://2ab83eedbac0.ngrok-free.app/api/v1/distance-matrix \
     -H "Content-Type: application/json" \
     -H "Accept: application/json" \
     -d '{"origin":{"lat":6.193611,"lng":1.184028},"destination":{"lat":6.222,"lng":1.1895}}'
   ```

3. **Vérifiez la route** dans `routes/api.php` :
   ```php
   Route::post('/v1/distance-matrix', [DistanceMatrixController::class, 'calculate']);
   ```

## 🎯 Points de contrôle

- [ ] Serveur frontend démarré sur port 3000
- [ ] Console ouverte pour voir les logs
- [ ] Test avec coordonnées simples
- [ ] Vérification des logs Laravel
- [ ] Test direct avec curl si nécessaire

## 💡 Note importante

Même si l'API backend a encore des problèmes, **votre application fonctionne** grâce au système de fallback ! Le calcul Haversine donne une estimation très correcte (4.18 km) et le prix est calculé automatiquement (500 FCFA).

L'objectif est maintenant d'optimiser pour avoir la distance exacte via Google Maps, mais le système est déjà opérationnel ! 🎉
