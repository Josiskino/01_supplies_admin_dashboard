# Guide de Gestion des Statuts de Livraison

## 🎯 Nouvelle Fonctionnalité Ajoutée

Une nouvelle section **"Delivery Statuses"** a été ajoutée dans les paramètres pour gérer les différents statuts que peuvent prendre les demandes de livraison.

## 📍 Accès à la Fonctionnalité

**Navigation :** Settings → Delivery Statuses (3ème onglet)

## 🔧 Fonctionnalités Disponibles

### **1. Statuts Par Défaut**
Le système inclut 5 statuts par défaut (non modifiables) :

- 🟡 **Pending** (En attente) - Demande reçue, en attente d'assignation
- 🔵 **Assigned** (Assignée) - Livreur assigné à la demande  
- 🟣 **In Progress** (En cours) - Livraison en cours
- 🟢 **Delivered** (Livrée) - Livraison terminée avec succès
- 🔴 **Cancelled** (Annulée) - Demande annulée

### **2. Statuts Personnalisés**
Vous pouvez ajouter des statuts personnalisés avec :

- **Nom** : Nom technique du statut
- **Libellé** : Nom affiché à l'utilisateur
- **Couleur** : Couleur du chip (Primary, Success, Info, Warning, Error, Secondary)
- **Icône** : Icône Tabler à afficher
- **Description** : Description de l'utilisation du statut

### **3. Actions Disponibles**
- ➕ **Ajouter** un nouveau statut personnalisé
- ✏️ **Modifier** les statuts personnalisés
- 🗑️ **Supprimer** les statuts personnalisés
- 💾 **Sauvegarder** la configuration

## 🎨 Interface Utilisateur

### **Page de Configuration**
- **Cards visuelles** pour chaque statut avec couleur et icône
- **Indicateur "Default Status"** pour les statuts système
- **Boutons d'action** (Edit/Delete) pour les statuts personnalisés
- **Modal d'ajout/modification** avec tous les champs

### **Intégration dans l'Application**
Les statuts configurés sont automatiquement utilisés dans :

- 📝 **Formulaire d'ajout de livraison** - Liste déroulante des statuts
- 📋 **Liste des livraisons** - Filtrage par statut
- 🏷️ **Affichage des statuts** - Chips colorés avec icônes

## 🔄 Synchronisation

### **Composable `useDeliveryStatuses`**
Un composable centralisé gère :
- Chargement des statuts depuis l'API
- Fallback vers les statuts par défaut
- Fonctions utilitaires (couleur, icône, libellé)
- Sauvegarde des modifications

### **API Endpoints Requis**
```bash
# Récupérer les statuts
GET /api/v1/settings/delivery-statuses

# Sauvegarder les statuts  
POST /api/v1/settings/delivery-statuses
```

## 📊 Structure des Données

### **Format de Statut**
```javascript
{
  id: 1,
  name: "pending",           // Nom technique
  label: "En attente",       // Libellé affiché
  color: "warning",          // Couleur du chip
  icon: "tabler-clock",      // Icône Tabler
  description: "...",        // Description
  isDefault: true,           // Statut système ?
  canEdit: false             // Modifiable ?
}
```

### **Réponse API Attendue**
```javascript
{
  "success": true,
  "statuses": [
    // Array of status objects
  ]
}
```

## 🎯 Utilisation Pratique

### **1. Ajouter un Nouveau Statut**
1. Aller dans Settings → Delivery Statuses
2. Cliquer sur "Add New Status"
3. Remplir le formulaire :
   - **Status Name** : "On Hold"
   - **Display Label** : "En pause"
   - **Color** : Warning
   - **Icon** : tabler-player-pause
   - **Description** : "Livraison temporairement suspendue"
4. Cliquer sur "Add Status"
5. Cliquer sur "Save Status Configuration"

### **2. Utiliser les Statuts**
- Les nouveaux statuts apparaissent automatiquement dans les formulaires
- Les filtres de la liste des livraisons sont mis à jour
- Les couleurs et icônes sont appliquées dans toute l'interface

### **3. Modifier un Statut Existant**
- Seuls les statuts personnalisés peuvent être modifiés
- Les statuts par défaut sont protégés contre la modification/suppression

## 🔒 Sécurité et Validation

- **Statuts par défaut** : Non modifiables, garantit le fonctionnement de base
- **Validation** : Nom et libellé requis pour les nouveaux statuts
- **Fallback** : Si l'API échoue, utilise les statuts par défaut

## 🚀 Avantages

✅ **Flexibilité** - Adaptez les statuts à vos processus métier  
✅ **Cohérence** - Interface unifiée dans toute l'application  
✅ **Visuel** - Couleurs et icônes pour une identification rapide  
✅ **Évolutif** - Ajoutez de nouveaux statuts selon vos besoins  
✅ **Robuste** - Fallback automatique en cas de problème API  

## 🎉 Résultat

Vous avez maintenant un système complet de gestion des statuts de livraison qui s'adapte à vos besoins spécifiques tout en conservant une base solide de statuts par défaut ! 🚀
