# Guide d'activation de l'API Google Maps Distance Matrix

## 🎯 Problème identifié

Votre clé API Google Maps fonctionne, mais l'**API Distance Matrix n'est pas activée** pour votre projet.

**Erreur reçue :**
```
REQUEST_DENIED: You're calling a legacy API, which is not enabled for your project
```

## 🚀 Solution : Activer l'API Distance Matrix

### Étape 1 : Accéder à Google Cloud Console
1. Allez sur : https://console.cloud.google.com/
2. Connectez-vous avec le compte Google lié à votre clé API
3. Sélectionnez le bon projet (celui qui contient votre clé API)

### Étape 2 : Activer l'API Distance Matrix
1. Dans le menu de gauche, cliquez sur **"APIs & Services"** > **"Library"**
2. Dans la barre de recherche, tapez : **"Distance Matrix API"**
3. Cliquez sur **"Distance Matrix API"** dans les résultats
4. Cliquez sur le bouton **"ENABLE"**

### Étape 3 : Vérifier les restrictions de votre clé API
1. Allez dans **"APIs & Services"** > **"Credentials"**
2. Trouvez votre clé API : `AIzaSyAGHlk0PoZ-BdSwUJh_HGSHXWKlARE4Pt8`
3. Cliquez sur l'icône "crayon" pour l'éditer
4. Dans la section **"API restrictions"** :
   - Si "Restrict key" est sélectionné, assurez-vous que **"Distance Matrix API"** est dans la liste
   - Si ce n'est pas le cas, ajoutez-la ou sélectionnez "Don't restrict key" (temporairement)

### Étape 4 : Vérifier les restrictions d'application (optionnel)
Dans la section **"Application restrictions"** :
- **Pour le développement** : Sélectionnez "None"
- **Pour la production** : Configurez selon vos besoins (HTTP referrers, IP addresses, etc.)

## 🧪 Test après activation

Une fois l'API activée, testez avec cette commande :

```bash
curl -X POST https://2ab83eedbac0.ngrok-free.app/api/v1/distance-matrix \
  -H "Content-Type: application/json" \
  -H "Accept: application/json" \
  -d '{
    "origin": {"lat": 6.193611, "lng": 1.184028},
    "destination": {"lat": 6.222, "lng": 1.1895}
  }'
```

**Réponse attendue :**
```json
{
  "success": true,
  "data": {
    "distance": 3.2,
    "distance_text": "3.2 km",
    "duration": "8 mins",
    "duration_in_seconds": 480
  }
}
```

## 💡 APIs Google Maps disponibles

Pour référence, voici les principales APIs que vous pourriez vouloir activer :

- ✅ **Distance Matrix API** - Pour calculer distances et durées
- ✅ **Geocoding API** - Pour convertir adresses en coordonnées
- ✅ **Places API** - Pour recherche de lieux
- ✅ **Maps JavaScript API** - Pour afficher des cartes interactives

## 🔧 En cas de problème

### Si l'activation ne fonctionne pas :
1. Vérifiez que vous êtes sur le bon projet Google Cloud
2. Vérifiez que votre compte a les permissions nécessaires
3. Attendez quelques minutes (propagation des changements)

### Si vous avez des quotas dépassés :
1. Allez dans **"APIs & Services"** > **"Quotas"**
2. Cherchez "Distance Matrix API"
3. Vérifiez vos limites et usage

### Si vous voulez une nouvelle clé API :
1. Allez dans **"APIs & Services"** > **"Credentials"**
2. Cliquez sur **"+ CREATE CREDENTIALS"** > **"API key"**
3. Configurez les restrictions selon vos besoins

## 🎉 Résultat final

Une fois l'API activée, votre système utilisera :
- ✅ **Distance précise** via Google Maps (au lieu d'estimation)
- ✅ **Durée réelle** du trajet
- ✅ **Prix exact** basé sur la distance réelle
- ✅ **Pas d'indicateur "Estimated"** dans l'interface

Votre application fonctionnera de manière optimale ! 🚀
