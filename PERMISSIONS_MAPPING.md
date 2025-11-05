# Permissions Mapping Guide

Ce document explique comment les permissions sont mappées entre les rôles utilisateurs et les éléments de navigation.

## Rôles et Permissions

### 1. Logisticien / Assistant Logisticien
- **Permissions Backend** : `view-partners`, `view-customers`, `view-deliveries`, `view-couriers`
- **Éléments de navigation visibles** :
  - ✅ Couriers (Livreurs)
  - ✅ Delivery (Livraisons)
  - ✅ Partners (Partenaires)
  - ✅ Customers (Clients)
  - ✅ Dashboards (accessible à tous)
  - ❌ Financial
  - ❌ Roles & Permissions
  - ❌ Settings

### 2. Comptable
- **Permissions Backend** : `view-financial`, `manage-financial`
- **Éléments de navigation visibles** :
  - ✅ Financial (Transactions, Report)
  - ✅ Dashboards (accessible à tous)
  - ❌ Couriers
  - ❌ Delivery
  - ❌ Partners
  - ❌ Customers
  - ❌ Roles & Permissions
  - ❌ Settings

### 3. Service Client
- **Permissions Backend** : `view-partners`, `view-customers`
- **Éléments de navigation visibles** :
  - ✅ Partners (Partenaires)
  - ✅ Customers (Clients)
  - ✅ Dashboards (accessible à tous)
  - ❌ Couriers
  - ❌ Delivery
  - ❌ Financial
  - ❌ Roles & Permissions
  - ❌ Settings

## Mapping des permissions CASL

Les permissions du backend doivent être au format `action-subject` :
- `view-partners` → `{ action: 'view', subject: 'partners' }`
- `view-customers` → `{ action: 'view', subject: 'customers' }`
- `view-deliveries` → `{ action: 'view', subject: 'deliveries' }`
- `view-couriers` → `{ action: 'view', subject: 'couriers' }`
- `view-financial` → `{ action: 'view', subject: 'financial' }`
- `manage-financial` → `{ action: 'manage', subject: 'financial' }`
- `manage-roles` → `{ action: 'manage', subject: 'roles' }`
- `manage-settings` → `{ action: 'manage', subject: 'settings' }`

## Structure de navigation

Chaque élément de navigation dans `src/navigation/vertical/dashboard.js` a maintenant :
- `action` : L'action CASL requise (ex: 'view', 'manage')
- `subject` : Le sujet CASL (ex: 'partners', 'customers', 'deliveries', 'couriers', 'financial', 'roles', 'settings')

Les éléments sans `action` et `subject` sont accessibles à tous les utilisateurs connectés (ex: Dashboards, Reports).

