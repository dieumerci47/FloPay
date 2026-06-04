# UMG PayTech — Backend API

Système de paiement des frais de scolarité de l'Université Marien Ngouabi via Mobile Money (MTN & Airtel).

---

## Stack technique

| Couche       | Technologie               |
|--------------|---------------------------|
| Runtime      | Node.js (JavaScript)      |
| Framework    | Express.js                |
| Base de données | PostgreSQL via Prisma  |
| Paiements    | PawaPay (MTN + Airtel)    |
| Auth         | JWT (jsonwebtoken)        |
| PDF          | PDFKit                    |
| Validation   | express-validator         |
| Logs         | Winston                   |

---

## Installation

```bash
# 1. Cloner et installer les dépendances
npm install

# 2. Configurer les variables d'environnement
cp .env.example .env
# → Editer .env avec tes vraies valeurs

# 3. Générer le client Prisma
npm run db:generate

# 4. Lancer les migrations
npm run db:migrate

# 5. Peupler la base de données (établissements, admin par défaut)
npm run db:seed

# 6. Démarrer en développement
npm run dev
```

---

## Structure du projet

```
umg-paytech/
├── prisma/
│   ├── schema.prisma        # Modèles de base de données
│   └── seed.js              # Données initiales
├── src/
│   ├── index.js             # Point d'entrée Express
│   ├── config/
│   │   └── database.js      # Client Prisma
│   ├── controllers/
│   │   ├── payment.controller.js      # Paiements & webhook PawaPay
│   │   ├── admin.controller.js        # Dashboard admin
│   │   └── establishment.controller.js # Établissements & parcours
│   ├── services/
│   │   ├── pawapay.service.js         # Intégration PawaPay
│   │   └── pdf.service.js             # Génération PDF reçus
│   ├── middlewares/
│   │   ├── auth.middleware.js         # JWT authentication
│   │   └── validate.middleware.js     # Validation des données
│   ├── routes/
│   │   └── index.js                   # Toutes les routes
│   └── utils/
│       ├── logger.js                  # Winston logger
│       ├── response.js                # Helpers réponses API
│       └── receiptNumber.js           # Générateur N° reçu
└── storage/
    └── receipts/                      # PDFs générés (gitignore)
```

---

## Documentation API

### Routes publiques (étudiant)

#### `GET /api/establishments`
Liste tous les établissements actifs.

**Réponse**
```json
{
  "success": true,
  "data": [
    { "id": "uuid", "name": "Faculté des Sciences et Techniques", "code": "FST" }
  ]
}
```

---

#### `GET /api/establishments/:id/programs?academicYear=2024-2025`
Parcours d'un établissement pour une année donnée.

**Réponse**
```json
{
  "success": true,
  "data": [
    { "id": "uuid", "name": "Informatique", "level": "Licence 1", "amount": 10750, "academicYear": "2024-2025" }
  ]
}
```

---

#### `POST /api/payments`
Initier un paiement étudiant.

**Body**
```json
{
  "matricule":       "01500251354313533",
  "fullName":        "YOUNDOUKA KOMBILA Davy Sagesse",
  "birthDate":       "2004-02-25",
  "birthPlace":      "Pointe-Noire",
  "phone":           "068786678",
  "establishmentId": "uuid-fst",
  "programId":       "uuid-physique-l1",
  "paymentMethod":   "MTN",
  "paymentPhone":    "068786678"
}
```

**Réponse**
```json
{
  "success": true,
  "data": {
    "paymentId":     "uuid",
    "receiptNumber": "PAIE-20250419-A3K9",
    "depositId":     "pawapay-uuid",
    "amount":        10750,
    "status":        "PENDING",
    "message":       "Confirmez le paiement sur votre téléphone mobile"
  }
}
```

---

#### `GET /api/payments/:paymentId/status`
Vérifier le statut d'un paiement (polling).

---

#### `GET /api/payments/:receiptNumber/receipt`
Télécharger le PDF de la déclaration de recette.

---

#### `POST /api/payments/pawapay/webhook`
Webhook appelé par PawaPay (ne pas appeler manuellement).

---

### Routes admin (scolarité centrale)

> Toutes nécessitent le header : `Authorization: Bearer <token>`

#### `POST /api/admin/auth/login`
```json
{ "email": "admin@umg-paytech.cg", "password": "Admin@2025!" }
```

---

#### `GET /api/admin/students/:matricule`
Recherche d'un étudiant par matricule avec statut de paiement.

---

#### `GET /api/admin/payments?status=SUCCESS&page=1&limit=20`
Liste paginée des paiements avec filtres.

---

#### `GET /api/admin/dashboard?academicYear=2024-2025`
Statistiques : total, revenus, répartition MTN/Airtel.

---

## Flux de paiement complet

```
1. Étudiant soumet le formulaire
        ↓
2. POST /api/payments
        ↓
3. Backend crée Payment (status: PENDING)
        ↓
4. Backend appelle PawaPay API → depositId retourné
        ↓
5. Étudiant reçoit notification sur son téléphone
        ↓
6. Étudiant confirme avec son PIN
        ↓
7. PawaPay appelle POST /api/payments/pawapay/webhook
        ↓
8. Backend met à jour Payment (status: SUCCESS)
        ↓
9. Backend génère le PDF déclaration de recette
        ↓
10. Étudiant télécharge son PDF
        ↓
11. Agent scolarité vérifie via GET /admin/students/:matricule
```

---

## Credentials par défaut (seed)

| Rôle        | Email                    | Mot de passe  |
|-------------|--------------------------|---------------|
| Super Admin | admin@umg-paytech.cg     | Admin@2025!   |

> **Changer le mot de passe immédiatement en production !**

---

## Variables d'environnement requises

| Variable              | Description                        |
|-----------------------|------------------------------------|
| `DATABASE_URL`        | URL PostgreSQL                     |
| `JWT_SECRET`          | Clé secrète JWT (min 32 caractères)|
| `PAWAPAY_API_TOKEN`   | Token API PawaPay                  |
| `PAWAPAY_BASE_URL`    | URL sandbox ou production PawaPay  |
| `APP_URL`             | URL de l'API (pour les callbacks)  |
| `FRONTEND_URL`        | URL du frontend (CORS)             |
