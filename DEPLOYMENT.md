# Guide de Déploiement sur Firebase Hosting

## Prérequis

1. **Firebase CLI installé** :
```bash
npm install -g firebase-tools
```

2. **Se connecter à Firebase** :
```bash
firebase login
```

3. **Vérifier la connexion** :
```bash
firebase projects:list
```

## Commandes de Déploiement

### 1. Build du projet

Construire l'application pour la production :
```bash
npm run build
```

Cette commande génère le dossier `dist/` qui contient les fichiers optimisés pour la production.

### 2. Déploiement sur Firebase Hosting

#### Déploiement standard :
```bash
firebase deploy --only hosting
```

#### Déploiement avec message :
```bash
firebase deploy --only hosting -m "Description du déploiement"
```

#### Déploiement sur un projet spécifique :
```bash
firebase deploy --only hosting --project supplies-389809
```

### 3. Commandes complètes (Build + Deploy)

#### Option 1 : Commandes séparées
```bash
npm run build && firebase deploy --only hosting
```

#### Option 2 : Avec message
```bash
npm run build && firebase deploy --only hosting -m "Mise à jour: Ajout du mode standard et sélection du service de calcul"
```

### 4. Vérification avant déploiement

#### Prévisualiser localement :
```bash
npm run build
npm run preview
```
Puis ouvrir http://localhost:5050 pour vérifier que tout fonctionne.

#### Tester la configuration Firebase :
```bash
firebase hosting:channel:deploy preview
```

## Configuration Firebase

Le projet est configuré avec :
- **Projet Firebase** : `supplies-389809`
- **Dossier public** : `dist`
- **Rewrites** : Toutes les routes pointent vers `/index.html` (SPA)

## Commandes Utiles

### Voir l'historique des déploiements
```bash
firebase hosting:channel:list
```

### Annuler un déploiement
```bash
firebase hosting:rollback
```

### Voir les sites configurés
```bash
firebase hosting:sites:list
```

### Ouvrir la console Firebase
```bash
firebase open hosting
```

## Variables d'Environnement

Assurez-vous que les variables d'environnement sont correctement configurées dans votre fichier `.env` ou `.env.production` :

```env
VITE_API_BASE_URL=https://adapi.01supplies.com/api
```

## Workflow Recommandé

1. **Développement local** :
   ```bash
   npm run dev
   ```

2. **Test de build** :
   ```bash
   npm run build
   npm run preview
   ```

3. **Déploiement** :
   ```bash
   npm run build && firebase deploy --only hosting -m "Description des changements"
   ```

## Dépannage

### Erreur : "Firebase CLI not found"
```bash
npm install -g firebase-tools
```

### Erreur : "Not authorized"
```bash
firebase login
```

### Erreur : "Project not found"
Vérifiez le fichier `.firebaserc` :
```json
{
  "projects": {
    "default": "supplies-389809"
  }
}
```

### Nettoyer le cache
```bash
rm -rf dist
npm run build
firebase deploy --only hosting
```

## Scripts NPM Personnalisés (Optionnel)

Vous pouvez ajouter ces scripts dans `package.json` pour simplifier le déploiement :

```json
{
  "scripts": {
    "deploy": "npm run build && firebase deploy --only hosting",
    "deploy:preview": "npm run build && firebase hosting:channel:deploy preview"
  }
}
```

Puis utilisez simplement :
```bash
npm run deploy
```

