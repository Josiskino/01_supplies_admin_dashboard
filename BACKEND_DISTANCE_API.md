# Backend Distance Matrix API Implementation

## Endpoint Required

Vous devez implémenter cet endpoint sur votre backend pour éviter les problèmes CORS avec l'API Google Maps.

### Endpoint: `POST /distance-matrix`

#### Request Body:
```json
{
  "origin": {
    "lat": 6.193611,
    "lng": 1.184028
  },
  "destination": {
    "lat": 6.222,
    "lng": 1.1895
  }
}
```

#### Response:
```json
{
  "distance": 3.2,
  "duration": "8 mins",
  "distanceText": "3.2 km"
}
```

## Implementation Examples

### Node.js/Express Example:
```javascript
const express = require('express');
const axios = require('axios');
const app = express();

app.post('/distance-matrix', async (req, res) => {
  try {
    const { origin, destination } = req.body;
    
    const originStr = `${origin.lat},${origin.lng}`;
    const destinationStr = `${destination.lat},${destination.lng}`;
    
    const url = `https://maps.googleapis.com/maps/api/distancematrix/json?origins=${originStr}&destinations=${destinationStr}&units=metric&key=${process.env.GOOGLE_MAPS_API_KEY}`;
    
    const response = await axios.get(url);
    const data = response.data;

    if (data.status !== 'OK') {
      return res.status(400).json({ error: `Google Maps API error: ${data.status}` });
    }

    const element = data.rows[0]?.elements[0];
    
    if (!element || element.status !== 'OK') {
      return res.status(400).json({ error: `Distance calculation failed: ${element?.status || 'Unknown error'}` });
    }

    res.json({
      distance: element.distance.value / 1000, // Convert meters to kilometers
      duration: element.duration.text,
      distanceText: element.distance.text,
    });
  } catch (error) {
    console.error('Distance calculation error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});
```

### PHP/Laravel Example:
```php
<?php

Route::post('/distance-matrix', function (Request $request) {
    $origin = $request->input('origin');
    $destination = $request->input('destination');
    
    $originStr = $origin['lat'] . ',' . $origin['lng'];
    $destinationStr = $destination['lat'] . ',' . $destination['lng'];
    
    $url = "https://maps.googleapis.com/maps/api/distancematrix/json?origins={$originStr}&destinations={$destinationStr}&units=metric&key=" . env('GOOGLE_MAPS_API_KEY');
    
    $response = Http::get($url);
    $data = $response->json();
    
    if ($data['status'] !== 'OK') {
        return response()->json(['error' => 'Google Maps API error: ' . $data['status']], 400);
    }
    
    $element = $data['rows'][0]['elements'][0] ?? null;
    
    if (!$element || $element['status'] !== 'OK') {
        return response()->json(['error' => 'Distance calculation failed'], 400);
    }
    
    return response()->json([
        'distance' => $element['distance']['value'] / 1000, // Convert to km
        'duration' => $element['duration']['text'],
        'distanceText' => $element['distance']['text'],
    ]);
});
```

### Python/Django Example:
```python
import requests
from django.http import JsonResponse
from django.views.decorators.csrf import csrf_exempt
import json
import os

@csrf_exempt
def distance_matrix(request):
    if request.method == 'POST':
        data = json.loads(request.body)
        origin = data['origin']
        destination = data['destination']
        
        origin_str = f"{origin['lat']},{origin['lng']}"
        destination_str = f"{destination['lat']},{destination['lng']}"
        
        url = f"https://maps.googleapis.com/maps/api/distancematrix/json?origins={origin_str}&destinations={destination_str}&units=metric&key={os.environ['GOOGLE_MAPS_API_KEY']}"
        
        response = requests.get(url)
        data = response.json()
        
        if data['status'] != 'OK':
            return JsonResponse({'error': f'Google Maps API error: {data["status"]}'}, status=400)
        
        element = data['rows'][0]['elements'][0]
        
        if element['status'] != 'OK':
            return JsonResponse({'error': 'Distance calculation failed'}, status=400)
        
        return JsonResponse({
            'distance': element['distance']['value'] / 1000,  # Convert to km
            'duration': element['duration']['text'],
            'distanceText': element['distance']['text'],
        })
```

## Environment Variables

Assurez-vous d'avoir la clé API Google Maps dans vos variables d'environnement backend :

```bash
GOOGLE_MAPS_API_KEY=your_google_maps_api_key_here
```

## API Permissions

Votre clé API Google Maps doit avoir les permissions pour :
- Distance Matrix API
- Être configurée pour les requêtes serveur (pas client)

## Fallback

Si l'endpoint backend n'est pas disponible, le frontend utilisera automatiquement un calcul de distance géométrique simple (formule de Haversine) avec un ajustement de +30% pour approximer les routes réelles.
