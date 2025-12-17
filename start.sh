#!/bin/zsh

# Charger nvm
export NVM_DIR="$HOME/.nvm"
[ -s "$NVM_DIR/nvm.sh" ] && \. "$NVM_DIR/nvm.sh"

# Utiliser Node.js 18
nvm use 18

# Démarrer le serveur de développement
npm run dev





