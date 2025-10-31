# Debug Guide - Distance API Error 400

## 🔍 Problème actuel
Erreur 400 (Bad Request) lors de l'appel à `/api/v1/distance-matrix`

## 📋 Étapes de débogage

### 1. Vérifier les logs Laravel
```bash
# Dans votre projet Laravel
tail -f storage/logs/laravel.log
```

### 2. Tester l'endpoint directement
```bash
# Test avec curl
curl -X POST https://2ab83eedbac0.ngrok-free.app/api/v1/distance-matrix \
  -H "Content-Type: application/json" \
  -H "Accept: application/json" \
  -d '{
    "origin": {
      "lat": 6.193611111111111,
      "lng": 1.184027777777778
    },
    "destination": {
      "lat": 6.222,
      "lng": 1.1895
    }
  }'
```

### 3. Vérifier la route Laravel
```php
// Dans routes/api.php
Route::post('/distance-matrix', [DistanceMatrixController::class, 'calculate']);
```

### 4. Causes possibles de l'erreur 400

#### A. Problème de validation
- Coordonnées hors limites
- Format JSON invalide
- Champs manquants

#### B. Problème de middleware
```php
// Vérifier dans app/Http/Kernel.php
'api' => [
    // \Laravel\Sanctum\Http\Middleware\EnsureFrontendRequestsAreStateful::class,
    'throttle:api',
    \Illuminate\Routing\Middleware\SubstituteBindings::class,
],
```

#### C. Problème CORS
```php
// Dans config/cors.php
'paths' => ['api/*', 'sanctum/csrf-cookie'],
'allowed_methods' => ['*'],
'allowed_origins' => ['*'], // Ou votre domaine frontend
'allowed_headers' => ['*'],
```

### 5. Solutions à tester

#### Solution 1: Remplacer votre contrôleur
Utilisez le contrôleur amélioré dans `LARAVEL_CONTROLLER_IMPROVED.php`

#### Solution 2: Vérifier la clé API
```bash
# Dans votre .env Laravel
GOOGLE_MAPS_API_KEY=your_actual_key_here
```

#### Solution 3: Test simple
Créez un endpoint de test simple :
```php
Route::post('/test-distance', function (Request $request) {
    return response()->json([
        'success' => true,
        'received' => $request->all(),
        'message' => 'Test endpoint works'
    ]);
});
```

### 6. Format de données attendu par le frontend

Le frontend envoie :
```json
{
  "origin": {
    "lat": 6.193611111111111,
    "lng": 1.184027777777778
  },
  "destination": {
    "lat": 6.222,
    "lng": 1.1895
  }
}
```

Le frontend attend en retour :
```json
{
  "success": true,
  "data": {
    "distance": 3.2,
    "distance_text": "3.2 km",
    "duration": "8 mins"
  }
}
```

### 7. Commandes de débogage dans la console du navigateur

```javascript
// Dans la console du navigateur
import { testDistanceCalculation } from '@/utils/googleMaps'

// Test avec coordonnées décimales
testDistanceCalculation('6.193611, 1.184028', '6.222, 1.1895')

// Test avec coordonnées DMS
testDistanceCalculation('6°11\'37.0"N 1°11\'02.5"E', '6°13\'19.2"N 1°11\'22.2"E')
```

## 🎯 Actions immédiates

1. **Remplacez votre contrôleur** par la version améliorée
2. **Vérifiez les logs Laravel** pendant un test
3. **Testez l'endpoint** directement avec curl
4. **Vérifiez la configuration CORS** si nécessaire

## 📞 Si le problème persiste

Partagez :
- Les logs Laravel complets
- La réponse de l'endpoint avec curl
- La configuration de vos routes API
