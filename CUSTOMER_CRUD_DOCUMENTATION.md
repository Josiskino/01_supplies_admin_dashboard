# 📘 Documentation - Création et Mise à Jour des Clients

Documentation complète sur la création et la mise à jour des clients dans l'application frontend.

---

## 📋 Table des matières

1. [Créer un client](#1-créer-un-client)
2. [Mettre à jour un client](#2-mettre-à-jour-un-client)
3. [Structure des données](#3-structure-des-données)
4. [Gestion des adresses](#4-gestion-des-adresses)
5. [Flux de données](#5-flux-de-données)

---

## 1. Créer un client

### Endpoint utilisé

```
POST /api/v1/customers
```

### Informations passées au backend

Lors de la création d'un client, les informations suivantes sont envoyées au backend :

#### Champs requis

| Champ | Type | Description | Exemple |
|-------|------|-------------|---------|
| `phone` | string | Numéro de téléphone (unique, requis) | `"+22898700015"` |

#### Champs optionnels

| Champ | Type | Description | Exemple |
|-------|------|-------------|---------|
| `first_name` | string | Prénom du client | `"John"` |
| `last_name` | string | Nom de famille du client | `"Doe"` |
| `email` | string | Adresse email du client | `"johndoe@example.com"` |
| `location` | string | Coordonnées GPS ou URL Google Maps | `"6.123456,1.234567"` |
| `address` | string | Adresse textuelle (max 500 caractères) | `"123 Rue de la Paix, Lomé"` |
| `address_label` | string | Label de l'adresse (max 100 caractères) | `"Adresse principale"` |

### Exemple de payload JSON

```json
{
  "phone": "+22898700015",
  "first_name": "John",
  "last_name": "Doe",
  "email": "johndoe@example.com",
  "location": "6.123456,1.234567",
  "address": "123 Rue de la Paix, Lomé",
  "address_label": "Adresse principale"
}
```

### Format du champ `location`

Le champ `location` peut contenir :

1. **Coordonnées décimales** (recommandé) :
   ```json
   "location": "6.123456,1.234567"
   ```
   Format : `"latitude,longitude"` (sans espaces)

2. **URL Google Maps** :
   ```json
   "location": "https://maps.google.com/?q=6.123456,1.234567"
   ```

3. **Coordonnées DMS** :
   ```json
   "location": "6°10'53.8\"N 1°12'35.7\"E"
   ```

### Comportement du backend

- ✅ **Le téléphone est unique** : Si un client existe déjà avec ce numéro, une erreur 422 sera retournée
- ✅ **L'adresse est créée automatiquement** : Si `location` est fourni, une adresse est créée dans la table `addresses` avec `is_default: true`
- ✅ **Transaction atomique** : Si la création de l'adresse échoue, le client n'est pas créé (rollback automatique)

### Réponse en cas de succès (201 Created)

```json
{
  "success": true,
  "message": "Client créé avec succès",
  "data": {
    "id": 1,
    "phone": "+22898700015",
    "first_name": "John",
    "last_name": "Doe",
    "full_name": "John Doe",
    "email": "johndoe@example.com",
    "addresses": [
      {
        "id": 5,
        "label": "Adresse principale",
        "address": "123 Rue de la Paix, Lomé",
        "location": "6.123456,1.234567",
        "is_default": true,
        "created_at": "2025-11-29T10:30:00.000000Z"
      }
    ],
    "default_address": {
      "id": 5,
      "label": "Adresse principale",
      "address": "123 Rue de la Paix, Lomé",
      "location": "6.123456,1.234567",
      "is_default": true
    },
    "created_at": "2025-11-29T10:30:00.000000Z",
    "updated_at": "2025-11-29T10:30:00.000000Z"
  }
}
```

### Flux de création dans le frontend

1. L'utilisateur remplit le formulaire dans le drawer `CustomerAddDrawer`
2. Les données sont validées et formatées dans `onSubmit()` (fichier `src/pages/app/customer/add/index.vue`)
3. Le payload est construit avec tous les champs remplis (y compris les champs d'adresse)
4. L'événement `submit` est émis avec le payload
5. La fonction `addNewCustomer()` (fichier `src/pages/app/customer/list/index.vue`) est appelée
6. Un appel API `POST /api/v1/customers` est effectué avec le payload
7. Si succès :
   - Le nouveau client est ajouté à la liste locale (`customers.value.unshift(response.data)`)
   - Le drawer est fermé
   - La liste est rafraîchie pour obtenir les données complètes du serveur
   - Une notification de succès est affichée

---

## 2. Mettre à jour un client

### Endpoint utilisé

```
PATCH /api/v1/customers/{id}
```

ou

```
PUT /api/v1/customers/{id}
```

### Informations passées au backend

Lors de la mise à jour d'un client, **tous les champs sont optionnels** (mise à jour partielle). Les mêmes champs que pour la création peuvent être envoyés :

#### Champs disponibles

| Champ | Type | Requis | Description | Exemple |
|-------|------|--------|-------------|---------|
| `phone` | string | ❌ Non | Numéro de téléphone (unique, sauf pour le client actuel) | `"+22898700016"` |
| `first_name` | string | ❌ Non | Prénom du client | `"Jane"` |
| `last_name` | string | ❌ Non | Nom de famille du client | `"Smith"` |
| `email` | string | ❌ Non | Adresse email du client | `"janesmith@example.com"` |
| `location` | string | ❌ Non | Coordonnées GPS ou URL Google Maps | `"6.123456,1.234567"` |
| `address` | string | ❌ Non | Adresse textuelle | `"123 Rue de la Paix, Lomé"` |
| `address_label` | string | ❌ Non | Label de l'adresse | `"Adresse principale"` |

### Exemple de payload JSON (mise à jour partielle)

```json
{
  "phone": "+22898700016",
  "first_name": "Jane",
  "last_name": "Smith"
}
```

### Exemple de payload JSON (mise à jour complète avec adresse)

```json
{
  "phone": "+22898700016",
  "first_name": "Jane",
  "last_name": "Smith",
  "email": "janesmith@example.com",
  "location": "6.123456,1.234567",
  "address": "123 Rue de la Paix, Lomé",
  "address_label": "Adresse principale"
}
```

### Comportement du backend

- ✅ **L'adresse est créée/mise à jour automatiquement** : Si `location` est fourni, une adresse est créée ou mise à jour dans la table `addresses` avec `is_default: true`
- ✅ **Transaction atomique** : Si la mise à jour de l'adresse échoue, le client n'est pas mis à jour (rollback automatique)
- ✅ **Mise à jour partielle** : Tu peux envoyer seulement les champs que tu veux modifier
- ✅ **Le téléphone doit être unique** : Si un autre client a déjà ce numéro, erreur 422

### Réponse en cas de succès (200 OK)

```json
{
  "success": true,
  "message": "Client mis à jour avec succès",
  "data": {
    "id": 1,
    "phone": "+22898700016",
    "first_name": "Jane",
    "last_name": "Smith",
    "full_name": "Jane Smith",
    "email": "janesmith@example.com",
    "addresses": [
      {
        "id": 5,
        "label": "Adresse principale",
        "address": "123 Rue de la Paix, Lomé",
        "location": "6.123456,1.234567",
        "is_default": true
      }
    ],
    "default_address": {
      "id": 5,
      "label": "Adresse principale",
      "address": "123 Rue de la Paix, Lomé",
      "location": "6.123456,1.234567",
      "is_default": true
    },
    "created_at": "2025-11-29T10:30:00.000000Z",
    "updated_at": "2025-11-29T10:35:00.000000Z"
  }
}
```

### Flux de mise à jour dans le frontend

1. L'utilisateur clique sur l'icône d'édition d'un client dans la liste
2. La fonction `editCustomer(customer)` est appelée
3. Les données du client sont chargées dans le drawer `CustomerAddDrawer`
4. L'utilisateur modifie les informations souhaitées
5. Le système détecte les changements via `hasChanges` (comparaison champ par champ)
6. Le bouton "Mettre à jour" est activé uniquement si des changements sont détectés
7. Lors du clic sur "Mettre à jour", `onSubmit()` est appelé
8. Le payload est construit avec tous les champs modifiés (y compris les champs d'adresse)
9. L'événement `submit` est émis avec le payload
10. La fonction `addNewCustomer()` est appelée avec `isEditMode = true`
11. Un appel API `PATCH /api/v1/customers/{id}` est effectué avec le payload
12. Si succès :
    - Le client est mis à jour dans la liste locale avec les données de la réponse
    - Le drawer est fermé
    - La liste est rafraîchie pour obtenir les données complètes du serveur
    - Une notification de succès est affichée

---

## 3. Structure des données

### Structure du formulaire (frontend)

```javascript
const form = {
  phone: '',           // Requis pour création
  first_name: '',      // Optionnel
  last_name: '',       // Optionnel
  email: '',           // Optionnel
  location: '',        // Optionnel (crée/met à jour l'adresse si fourni)
  address: '',         // Optionnel
  address_label: ''    // Optionnel
}
```

### Structure de la réponse API

```javascript
{
  success: true,
  message: "Client créé/mis à jour avec succès",
  data: {
    id: 1,
    phone: "+22898700015",
    first_name: "John",
    last_name: "Doe",
    full_name: "John Doe",  // Calculé par le backend
    email: "johndoe@example.com",
    addresses: [             // Array de toutes les adresses
      {
        id: 5,
        label: "Adresse principale",
        address: "123 Rue de la Paix, Lomé",
        location: "6.123456,1.234567",
        is_default: true,
        created_at: "2025-11-29T10:30:00.000000Z"
      }
    ],
    default_address: {       // Adresse par défaut (peut être null)
      id: 5,
      label: "Adresse principale",
      address: "123 Rue de la Paix, Lomé",
      location: "6.123456,1.234567",
      is_default: true
    },
    deliveries_count: 5,
    created_at: "2025-11-29T10:30:00.000000Z",
    updated_at: "2025-11-29T10:30:00.000000Z"
  }
}
```

---

## 4. Gestion des adresses

### Création automatique d'adresse

Lors de la création ou de la mise à jour d'un client :

- Si le champ `location` est fourni dans le payload, le backend crée automatiquement une adresse
- L'adresse créée a `is_default: true`
- Si `address` et `address_label` sont également fournis, ils sont utilisés pour l'adresse
- Si `address_label` n'est pas fourni, une valeur par défaut est utilisée

### Mise à jour automatique d'adresse

Lors de la mise à jour d'un client :

- Si le champ `location` est fourni et qu'une adresse par défaut existe déjà, elle est mise à jour
- Si le champ `location` est fourni et qu'aucune adresse par défaut n'existe, une nouvelle adresse est créée
- La transaction est atomique : si la mise à jour de l'adresse échoue, le client n'est pas mis à jour

### Affichage dans le frontend

Les adresses sont affichées dans le tableau des clients :

- **Colonne "Address"** : Affiche `default_address.address` ou `addresses[0].address` si `default_address` est null
- **Colonne "Location"** : Affiche `default_address.location` ou `addresses[0].location` si `default_address` est null
- Si aucune adresse n'existe, "—" est affiché

---

## 5. Flux de données

### Création d'un client

```
[Formulaire] 
    ↓
[onSubmit() - CustomerAddDrawer]
    ↓ (construit payload avec tous les champs)
[emit('submit', payload)]
    ↓
[addNewCustomer() - CustomerList]
    ↓ (POST /api/v1/customers)
[Backend]
    ↓ (crée client + adresse si location fourni)
[Response avec data complet]
    ↓
[Frontend ajoute client à la liste]
    ↓
[fetchCustomers() - rafraîchit la liste]
    ↓
[Affichage dans le tableau]
```

### Mise à jour d'un client

```
[Clic sur icône édition]
    ↓
[editCustomer(customer)]
    ↓ (charge données dans drawer)
[Modification des champs]
    ↓
[hasChanges détecte les modifications]
    ↓
[Clic sur "Mettre à jour"]
    ↓
[onSubmit() - CustomerAddDrawer]
    ↓ (construit payload avec champs modifiés)
[emit('submit', payload)]
    ↓
[addNewCustomer() - CustomerList]
    ↓ (PATCH /api/v1/customers/{id})
[Backend]
    ↓ (met à jour client + adresse si location fourni)
[Response avec data complet]
    ↓
[Frontend met à jour client dans la liste]
    ↓
[fetchCustomers() - rafraîchit la liste]
    ↓
[Affichage mis à jour dans le tableau]
```

---

## 📝 Résumé rapide

### Créer un client

**Endpoint :** `POST /api/v1/customers`

**Payload minimal :**
```json
{
  "phone": "+22898700015"
}
```

**Payload complet :**
```json
{
  "phone": "+22898700015",
  "first_name": "John",
  "last_name": "Doe",
  "email": "johndoe@example.com",
  "location": "6.123456,1.234567",
  "address": "123 Rue de la Paix, Lomé",
  "address_label": "Adresse principale"
}
```

### Mettre à jour un client

**Endpoint :** `PATCH /api/v1/customers/{id}`

**Payload (mise à jour partielle) :**
```json
{
  "phone": "+22898700016",
  "first_name": "Jane"
}
```

**Payload (mise à jour complète avec adresse) :**
```json
{
  "phone": "+22898700016",
  "first_name": "Jane",
  "last_name": "Smith",
  "email": "janesmith@example.com",
  "location": "6.123456,1.234567",
  "address": "123 Rue de la Paix, Lomé",
  "address_label": "Adresse principale"
}
```

---

## ⚠️ Notes importantes

1. **Le téléphone est unique** : Un client ne peut pas avoir le même numéro de téléphone qu'un autre client
2. **L'adresse est créée automatiquement** : Si `location` est fourni, une adresse est créée/mise à jour automatiquement
3. **Transaction atomique** : Si la création/mise à jour de l'adresse échoue, le client n'est pas créé/mis à jour
4. **Mise à jour partielle** : Tu peux envoyer seulement les champs que tu veux modifier
5. **Détection des changements** : Le bouton "Mettre à jour" est désactivé si aucun changement n'est détecté

---

**Dernière mise à jour** : 29 novembre 2025





