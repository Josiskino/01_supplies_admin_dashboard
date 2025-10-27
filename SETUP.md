# Guide d'installation et de configuration

## Installation de NVM

NVM (Node Version Manager) est installé sur votre système. Si vous devez l'installer manuellement sur un autre environnement, suivez ces étapes :

### Installation sur macOS/Linux :
```bash
curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/v0.39.0/install.sh | bash
```

Ou avec wget :
```bash
wget -qO- https://raw.githubusercontent.com/nvm-sh/nvm/v0.39.0/install.sh | bash
```

### Configuration de votre shell
Ajoutez ces lignes à votre fichier `~/.bashrc` ou `~/.zshrc` :
```bash
export NVM_DIR="$HOME/.nvm"
[ -s "$NVM_DIR/nvm.sh" ] && \. "$NVM_DIR/nvm.sh"
[ -s "$NVM_DIR/bash_completion" ] && \. "$NVM_DIR/bash_completion"
```

## Utilisation avec ce projet

Ce projet utilise Node.js version 18 (spécifiée dans le fichier `.nvmrc`).

### Étapes pour commencer :

1. **Installer la version de Node.js spécifiée** (si vous utilisez nvm) :
   ```bash
   nvm install
   nvm use
   ```

2. **Installer les dépendances** :
   ```bash
   npm install --legacy-peer-deps
   ```
   
   > Note: Le flag `--legacy-peer-deps` est nécessaire pour résoudre les conflits de dépendances peer.

3. **Démarrer le serveur de développement** :
   ```bash
   npm run dev
   ```

4. **Construire pour la production** :
   ```bash
   npm run build
   ```

## Scripts disponibles

- `npm run dev` - Lance le serveur de développement
- `npm run build` - Construit l'application pour la production
- `npm run preview` - Prévisualise la version de production (port 5050)
- `npm run lint` - Lance le linter ESLint

## Notes importantes

- Node.js v22.21.0 est actuellement installé sur votre système
- Les dépendances ont été installées avec succès
- 33 vulnérabilités ont été détectées (15 low, 11 moderate, 6 high, 1 critical)
- Pour résoudre les vulnérabilités :
  ```bash
  npm audit fix
  ```

