# 🚀 Guide de Build et Déploiement Firebase

Guide complet pour builder le projet et le déployer sur Firebase Hosting.

---

## 📋 Prérequis

1. **Node.js** installé (version 18 ou supérieure recommandée)
2. **Firebase CLI** installé globalement :
   ```bash
   npm install -g firebase-tools
   ```
3. **Authentification Firebase** :
   ```bash
   firebase login
   ```

---

## 🔨 Build du projet

### Build pour la production

```bash
npm run build
```

Cette commande :
- Compile le projet avec Vite
- Optimise les assets (minification, tree-shaking)
- Génère les fichiers dans le dossier `dist/`
- Prépare l'application pour la production

### Build avec preview locale

Après le build, tu peux prévisualiser le résultat localement :

```bash
npm run build
npm run preview
```

Le serveur de preview démarre sur `http://localhost:5050`

---

## 🚀 Déploiement sur Firebase

### 1. Vérifier la configuration Firebase

Le projet est configuré pour déployer sur le projet Firebase : **supplies-389809**

Fichiers de configuration :
- `.firebaserc` : Contient l'ID du projet Firebase
- `firebase.json` : Configuration du hosting (dossier `dist`, rewrites pour SPA)

### 2. Déployer sur Firebase Hosting

#### Déploiement standard

```bash
npm run build
firebase deploy --only hosting
```

#### Déploiement avec message

```bash
npm run build
firebase deploy --only hosting --message "Description de la mise à jour"
```

#### Déploiement sur un projet spécifique

```bash
npm run build
firebase deploy --only hosting --project supplies-389809
```

### 3. Commandes complètes (en une ligne)

#### Build + Deploy

```bash
npm run build && firebase deploy --only hosting
```

#### Build + Deploy avec message

```bash
npm run build && firebase deploy --only hosting --message "Mise à jour: [description]"
```

---

## 📝 Scripts npm personnalisés (optionnel)

Tu peux ajouter des scripts dans `package.json` pour simplifier :

```json
{
  "scripts": {
    "build": "vite build",
    "deploy": "npm run build && firebase deploy --only hosting",
    "deploy:prod": "npm run build && firebase deploy --only hosting --project supplies-389809"
  }
}
```

Ensuite, tu peux simplement utiliser :

```bash
npm run deploy
```

---

## 🔍 Vérifications avant déploiement

### 1. Tester le build localement

```bash
npm run build
npm run preview
```

Vérifie que tout fonctionne correctement sur `http://localhost:5050`

### 2. Vérifier la taille du build

```bash
npm run build
du -sh dist/
```

### 3. Vérifier les fichiers générés

```bash
npm run build
ls -la dist/
```

---

## 🛠️ Commandes Firebase utiles

### Voir l'état du déploiement

```bash
firebase hosting:channel:list
```

### Ouvrir le site déployé

```bash
firebase open hosting:site
```

### Voir les logs de déploiement

```bash
firebase hosting:clone
```

### Annuler un déploiement

```bash
firebase hosting:rollback
```

---

## 📦 Structure du build

Après `npm run build`, le dossier `dist/` contient :

```
dist/
├── index.html          # Point d'entrée de l'application
├── assets/
│   ├── index-[hash].js # Code JavaScript principal
│   ├── index-[hash].css # Styles CSS
│   └── ...             # Autres assets (images, fonts, etc.)
└── ...
```

---

## ⚙️ Configuration Firebase

### `firebase.json`

```json
{
  "hosting": {
    "public": "dist",
    "ignore": [
      "firebase.json",
      "**/.*",
      "**/node_modules/**"
    ],
    "rewrites": [
      {
        "source": "**",
        "destination": "/index.html"
      }
    ]
  }
}
```

**Explication :**
- `public: "dist"` : Dossier à déployer (généré par Vite)
- `rewrites` : Toutes les routes sont redirigées vers `index.html` (nécessaire pour les SPA Vue.js)

### `.firebaserc`

```json
{
  "projects": {
    "default": "supplies-389809"
  }
}
```

**Explication :**
- `default` : Projet Firebase par défaut utilisé lors des déploiements

---

## 🐛 Résolution de problèmes

### Erreur : "Firebase CLI not found"

```bash
npm install -g firebase-tools
```

### Erreur : "Not authenticated"

```bash
firebase login
```

### Erreur : "Build failed"

1. Vérifie les erreurs dans la console
2. Nettoie le cache :
   ```bash
   rm -rf node_modules dist
   npm install
   npm run build
   ```

### Erreur : "Deployment failed"

1. Vérifie que tu es connecté :
   ```bash
   firebase projects:list
   ```
2. Vérifie les permissions sur le projet Firebase
3. Vérifie que le dossier `dist/` existe après le build

---

## 📊 Workflow recommandé

### Développement local

```bash
npm run dev
```

### Test du build

```bash
npm run build
npm run preview
```

### Déploiement en production

```bash
npm run build
firebase deploy --only hosting --message "Version X.X.X - [Description]"
```

---

## 🔐 Sécurité

### Variables d'environnement

Si tu utilises des variables d'environnement, crée un fichier `.env.production` :

```env
VITE_API_URL=https://adapi.01supplies.com
VITE_APP_NAME=01 Supplies Admin
```

Vite les inclura automatiquement lors du build.

---

## 📝 Checklist avant déploiement

- [ ] Code testé localement
- [ ] Build réussi sans erreurs
- [ ] Preview locale fonctionne correctement
- [ ] Variables d'environnement configurées
- [ ] Authentification Firebase effectuée
- [ ] Projet Firebase correctement configuré
- [ ] Message de déploiement préparé (optionnel)

---

## 🎯 Commandes rapides

### Build + Deploy (recommandé)

```bash
npm run build && firebase deploy --only hosting
```

### Avec message

```bash
npm run build && firebase deploy --only hosting --message "Mise à jour: Ajout fonctionnalité X"
```

### Preview avant déploiement

```bash
npm run build && npm run preview
```

---

**Dernière mise à jour** : 29 novembre 2025

