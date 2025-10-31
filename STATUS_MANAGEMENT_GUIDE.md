# Guide de Gestion des Statuts - Système Unifié

## 🎯 Nouveau Système Implémenté

Un système unifié de gestion des statuts a été créé pour gérer tous les types de statuts dans l'application.

## 📍 Accès à la Fonctionnalité

**Navigation :** Settings → Status Management (3ème onglet)

## 🏗️ Architecture du Système

### **1. Composable Principal : `useStatusManagement`**
Gère tous les types de statuts de l'application :

```javascript
const { 
  getStatusOptions,      // Options pour les selects
  getStatusColor,        // Couleur par statut
  getStatusIcon,         // Icône par statut  
  getStatusLabel,        // Libellé par statut
  addStatus,             // Ajouter un statut
  updateStatus,          // Modifier un statut
  deleteStatus,          // Supprimer un statut
  saveAllStatuses        // Sauvegarder tout
} = useStatusManagement()
```

### **2. Composable de Compatibilité : `useDeliveryStatuses`**
Maintient la compatibilité avec l'ancien système pour les livraisons.

## 📊 Catégories de Statuts Disponibles

### **🚚 Deliveries (Livraisons)**
- 🟡 **Pending** (En attente) - Demande reçue
- 🔵 **Assigned** (Assignée) - Livreur assigné  
- 🟣 **In Progress** (En cours) - Livraison en cours
- 🟢 **Delivered** (Livrée) - Terminée avec succès
- 🔴 **Cancelled** (Annulée) - Demande annulée

### **👤 Drivers (Livreurs)**
- 🟢 **Available** (Disponible) - Prêt pour mission
- 🟡 **Busy** (Occupé) - En cours de livraison
- ⚫ **Offline** (Hors ligne) - Non disponible
- 🔴 **Suspended** (Suspendu) - Temporairement suspendu

### **🤝 Partners (Partenaires)**
- 🔵 **Prospecting** (Prospection) - En cours de prospection
- 🟢 **Active** (Actif) - Partenaire opérationnel
- ⚫ **Inactive** (Inactif) - Temporairement inactif
- 🔴 **Rejected** (Rejeté) - Partenariat terminé

### **👥 Clients**
- 🟢 **Active** (Actif) - Compte valide
- 🟡 **Pending** (En attente) - Validation en cours
- 🔴 **Suspended** (Suspendu) - Temporairement suspendu

## 🎨 Interface de Gestion

### **Sélection de Catégorie**
- **Cards interactives** pour chaque catégorie
- **Icônes distinctives** : Truck, User, Handshake, Users
- **Descriptions** explicatives pour chaque type

### **Gestion des Statuts**
- **Affichage en cards** avec couleurs et icônes
- **Statuts par défaut** : Non modifiables, protégés
- **Statuts personnalisés** : Modifiables et supprimables
- **État vide** : Interface d'aide pour première utilisation

### **Formulaires**
- **Ajout/Modification** : Nom, libellé, couleur, icône, description
- **Validation** : Champs requis et contrôles
- **Aperçu** : Prévisualisation en temps réel

## 🔧 Intégration dans l'Application

### **Fichiers Mis à Jour**

#### **✅ Livraisons**
- `src/pages/app/delivery/add.vue` - Formulaire d'ajout
- `src/pages/app/delivery/list.vue` - Liste et filtres

#### **✅ Livreurs**  
- `src/pages/app/couriers/list/index.vue` - Liste avec statuts colorés

#### **🔄 Partenaires (En cours)**
- `src/pages/app/partners/list/index.vue` - Filtres ajoutés, templates à compléter

### **Utilisation dans les Composants**

```javascript
// Import du composable
import { useStatusManagement } from '@/composables/useStatusManagement'

// Utilisation
const { getStatusOptions, getStatusColor, getStatusLabel } = useStatusManagement()

// Dans les templates
<AppSelect :items="getStatusOptions('drivers')" />
<VChip :color="getStatusColor('partners', item.status)">
  {{ getStatusLabel('partners', item.status) }}
</VChip>
```

## 🔄 Migration et Compatibilité

### **Ancien Système → Nouveau Système**
- ✅ **useDeliveryStatuses** maintenu pour compatibilité
- ✅ **Imports mis à jour** automatiquement
- ✅ **Fonctionnalités préservées** sans rupture

### **Nouveaux Développements**
- 🎯 **Utiliser `useStatusManagement`** pour nouveaux composants
- 🎯 **Spécifier la catégorie** : 'deliveries', 'drivers', 'partners', 'clients'
- 🎯 **Bénéficier des icônes** et couleurs automatiques

## 📋 API Endpoints Requis

```bash
# Récupérer tous les statuts
GET /api/v1/settings/statuses

# Sauvegarder tous les statuts
POST /api/v1/settings/statuses
```

### **Format de Données**
```javascript
{
  "success": true,
  "statuses": {
    "deliveries": [/* array of delivery statuses */],
    "drivers": [/* array of driver statuses */],
    "partners": [/* array of partner statuses */],
    "clients": [/* array of client statuses */]
  }
}
```

## 🎯 Prochaines Étapes

### **1. Compléter l'Intégration**
- [ ] Ajouter templates de statuts dans la liste des partenaires
- [ ] Intégrer dans d'autres listes (clients, etc.)
- [ ] Ajouter statuts dans les formulaires d'ajout

### **2. Fonctionnalités Avancées**
- [ ] Workflow de statuts (transitions autorisées)
- [ ] Notifications sur changement de statut
- [ ] Historique des changements de statut
- [ ] Permissions par rôle pour modification

### **3. Optimisations**
- [ ] Cache des statuts côté client
- [ ] Synchronisation en temps réel
- [ ] Import/Export de configurations

## 🚀 Avantages du Nouveau Système

✅ **Centralisation** - Un seul endroit pour tous les statuts  
✅ **Cohérence** - Interface et couleurs unifiées  
✅ **Flexibilité** - Ajout facile de nouveaux types  
✅ **Maintenabilité** - Code réutilisable et modulaire  
✅ **Évolutivité** - Extensible pour nouveaux besoins  
✅ **Robustesse** - Fallback et gestion d'erreurs  

## 🎉 Résultat

Vous avez maintenant un système complet et évolutif de gestion des statuts qui s'adapte à tous vos besoins métier tout en conservant une interface cohérente ! 🚀
