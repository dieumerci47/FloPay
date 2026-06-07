# FloPay — Paiement des frais de scolarité (UMNG)

FloPay est une application de **paiement des frais de scolarité par Mobile Money** (MTN & Airtel, Congo-Brazzaville) pour l'Université Marien Ngouabi. Elle couvre tout le parcours : l'étudiant paie en ligne, reçoit un **reçu PDF avec QR de vérification**, et la scolarité dispose d'un **back-office** pour superviser et vérifier les paiements.

Le paiement Mobile Money est opéré via **[PawaPay](https://docs.pawapay.io/)**.

---

## ✨ Fonctionnalités

### Parcours étudiant (public)
- Formulaire de paiement (établissement → parcours → niveau → identité → Mobile Money).
- Dépôt PawaPay (MTN / Airtel) avec confirmation sur le téléphone.
- Suivi du statut en temps réel, **reçu PDF** téléchargeable avec **QR code de vérification**.
- Page publique de vérification d'un reçu via son QR.
- En cas d'échec, **motif clair en français** (solde insuffisant, PIN non validé, etc.).

### Back-office admin
- **Deux rôles** :
  - **Super admin** — supervision **globale** (tous les établissements), gestion des admins, journal d'audit.
  - **Admin d'établissement** — **cloisonné** à sa faculté/école : ne voit et ne vérifie que *ses* étudiants/paiements.
- Tableau de bord (recettes, statuts, répartition par établissement / par moyen).
- **Vérification d'un paiement** par n° de reçu ou matricule (action métier centrale).
- Liste des paiements (filtres, recherche, pagination) + **export CSV**.
- Gestion des comptes admin, **journal d'audit** de toutes les actions sensibles.

---

## 🔐 Sécurité

- **Authentification** : access token JWT court (15 min, en mémoire) + **refresh token en cookie httpOnly** (rotation, stocké hashé SHA-256). Pas de token en `localStorage` → résistant au vol par XSS.
- **Cloisonnement multi-tenant** appliqué **côté serveur** (middleware + filtres Prisma) : un admin d'établissement ne peut pas accéder aux données d'un autre, même en forçant l'URL.
- **Anti brute-force** : verrouillage du compte **15 min après 3 tentatives** échouées.
- **Mot de passe provisoire** : un admin créé par le super admin doit **changer son mot de passe à la première connexion** (bloqué tant que ce n'est pas fait).
- **Rate-limiting** dédié à la connexion + global.
- **Signature des webhooks PawaPay** vérifiée (RFC 9421, ECDSA P-256/SHA-256 + Content-Digest) — voir [Webhooks & réconciliation](#-paiements-webhooks--réconciliation).
- **Journal d'audit** : connexions, vérifications, exports, créations d'admin, réconciliations…
- `helmet`, CORS restreint, validation systématique des entrées (`express-validator`).

> 2FA TOTP : prévu (la base d'auth est prête à l'accueillir), pas encore activé.

---

## 🧱 Stack technique

| Couche | Technologies |
|--------|--------------|
| **Backend** | Node.js, Express, Prisma ORM, PostgreSQL, JWT, bcrypt, Helmet, express-rate-limit, PDFKit, qrcode, Winston, http-message-signatures |
| **Frontend** | React 18, React Router 7, Tailwind CSS 3, Axios |
| **Paiement** | PawaPay (Mobile Money MTN / Airtel) |

> Le dépôt contient aussi des dossiers `mobile/` et `salle/` (modules annexes non couverts par ce README).

---

## 🚀 Démarrage

### Prérequis
- Node.js 18+
- PostgreSQL en service
- `pnpm` (ou `npm`)
- Un compte PawaPay (sandbox ou production) avec token API

### 1) Backend
```bash
cd backend
pnpm install
cp .env.example .env          # puis renseigner les valeurs (voir ci-dessous)
pnpm run db:migrate           # applique les migrations Prisma
pnpm run db:generate          # génère le client Prisma
pnpm run db:seed              # données de base + comptes admin
pnpm run dev                  # démarre l'API (http://localhost:3000)
```

### 2) Frontend
```bash
cd frontend
pnpm install
cp .env.example .env          # définir REACT_APP_API_URL
pnpm start                    # http://localhost:3001 (ou port proposé)
```

L'espace admin est accessible sur **`/admin`** (lien discret « Espace administration » en pied du parcours étudiant).

---

## 👤 Comptes par défaut (seed)

| Rôle | Email | Mot de passe |
|------|-------|--------------|
| Super admin | `admin@umg-paytech.cg` | `Admin@2025!` |
| Admin d'établissement (Faculté de Droit) | `admin.fd@umg-paytech.cg` | `Faculte@2025!` |

> Les admins créés ensuite via le back-office reçoivent un **mot de passe provisoire** à changer à la première connexion.

---

## ⚙️ Variables d'environnement (backend)

| Variable | Rôle | Défaut |
|----------|------|--------|
| `PORT` | Port de l'API | `3000` |
| `NODE_ENV` | `development` / `production` | `development` |
| `DATABASE_URL` | Chaîne de connexion PostgreSQL | — |
| `JWT_ACCESS_SECRET` | Secret de signature de l'access token | — |
| `ACCESS_TOKEN_TTL` | Durée de vie de l'access token | `15m` |
| `REFRESH_TOKEN_TTL_DAYS` | Durée de vie du refresh token (jours) | `7` |
| `PAWAPAY_API_TOKEN` | Token API PawaPay | — |
| `PAWAPAY_BASE_URL` | URL de base PawaPay (sandbox/prod) | — |
| `PAWAPAY_VERIFY_SIGNATURE` | Forcer la vérif de signature des webhooks en dev | `false` |
| `PAWAPAY_CALLBACK_HOST` | Host public pour reconstruire l'URL signée (proxy/ngrok) | *(auto)* |
| `FRONTEND_URL` | Origine autorisée (CORS) | — |
| `PDF_OUTPUT_DIR` | Dossier de stockage des reçus PDF | `./storage/receipts` |
| `RECEIPT_VERIFY_BASE` | URL encodée dans le QR de vérification | — |
| `RECONCILE_CRON_ENABLED` | Activer le cron de réconciliation | `true` |
| `RECONCILE_CRON_INTERVAL_MIN` | Fréquence du cron (min) | `5` |
| `RECONCILE_MIN_AGE_MIN` | Âge min d'un PENDING avant réconciliation | `2` |
| `RECONCILE_MAX_AGE_HOURS` | Âge max au-delà duquel on ignore | `48` |
| `RECONCILE_BATCH` | Nb max de paiements traités par passage | `50` |

**Frontend** : `REACT_APP_API_URL` (URL de l'API, ex. `http://localhost:3000/api`).

> ⚠️ En production : définir `NODE_ENV=production` (active la vérif stricte des signatures webhook et les cookies `secure`) et un `JWT_ACCESS_SECRET` long et aléatoire.

---

## 📜 Scripts (backend)

| Script | Action |
|--------|--------|
| `pnpm run dev` | API en mode dev (nodemon) |
| `pnpm start` | API en production |
| `pnpm run db:migrate` | Applique les migrations Prisma |
| `pnpm run db:generate` | Régénère le client Prisma |
| `pnpm run db:seed` | Données de base + comptes admin |
| `pnpm run db:studio` | Prisma Studio (exploration de la base) |
| `pnpm run db:backfill-failures` | Renseigne le code d'échec des anciens paiements FAILED |

---

## 🛰️ Déploiement

### Principes (production)
- **HTTPS obligatoire** des deux côtés (cookies `secure` + le webhook PawaPay doit être en https).
- `NODE_ENV=production` → active la **vérification stricte des signatures webhook** et les cookies `secure` + `SameSite=None`.
- **Secrets forts** : `JWT_ACCESS_SECRET` long et aléatoire (ex. `openssl rand -hex 48`).
- PostgreSQL dédié/managé, sauvegardé.
- En prod, **ne jamais** utiliser `db:migrate` (= `prisma migrate dev`, interactif) → utiliser `prisma migrate deploy`.

### Backend
```bash
cd backend
pnpm install
npx prisma migrate deploy      # applique les migrations (non interactif)
npx prisma generate
pnpm run db:seed               # UNIQUEMENT sur une base neuve (1ʳᵉ mise en service)
# Lancement via un gestionnaire de process :
pm2 start src/index.js --name flopay-api    # ou : pnpm start
```
À placer **derrière un reverse proxy HTTPS** (Nginx, Caddy…) qui transmet `X-Forwarded-Host` / `X-Forwarded-Proto` (utiles à la reconstruction de l'URL signée des webhooks ; sinon définir `PAWAPAY_CALLBACK_HOST`).

### Frontend
Build statique (l'URL de l'API est figée **au moment du build**) :
```bash
cd frontend
REACT_APP_API_URL=https://api.mondomaine.cg/api pnpm run build
```
Servir le dossier `build/` via Nginx / Netlify / Vercel / S3+CDN, avec **fallback SPA** (toutes les routes inconnues → `index.html`, indispensable pour `/admin/*`).

### PawaPay (production)
- `PAWAPAY_BASE_URL` = URL de production, `PAWAPAY_API_TOKEN` = token de production.
- Configurer l'**URL de callback** dans le dashboard PawaPay → `https://api.mondomaine.cg/api/payments/pawapay/webhook`.
- La clé publique de vérification est récupérée automatiquement (`/v2/public-key/http`) et mise en cache.

### Cookies cross-domaine
Si le front et l'API sont sur des domaines différents : HTTPS des deux côtés, `FRONTEND_URL` = origine exacte du front, et cookies `secure` + `SameSite=None` (automatique en prod). Le CORS est déjà configuré avec `credentials`.

### Cron en multi-instance
Le cron de réconciliation tourne **dans le process** de l'API. Si tu déploies **plusieurs instances** (scaling horizontal), il s'exécutera sur chacune → pour éviter les doublons, mets `RECONCILE_CRON_ENABLED=false` sur toutes sauf une (ou un worker dédié). En instance unique : rien à faire.

### Docker (option)
Le `docker-compose.yml` fournit un **PostgreSQL** (port hôte `5434`) et un service **backend**. ⚠️ Le service backend attend un `backend/Dockerfile` **à ajouter**. Exemple minimal :
```dockerfile
FROM node:20-alpine
WORKDIR /app
RUN corepack enable
COPY package.json pnpm-lock.yaml ./
RUN pnpm install --frozen-lockfile
COPY . .
RUN npx prisma generate
EXPOSE 3000
CMD ["sh", "-c", "npx prisma migrate deploy && node src/index.js"]
```
Puis renseigner les variables d'environnement de production dans le `compose` (ou un `.env`).

### Checklist mise en production
- [ ] `NODE_ENV=production`
- [ ] `JWT_ACCESS_SECRET` fort et unique
- [ ] `DATABASE_URL` vers la base de prod, `npx prisma migrate deploy` exécuté
- [ ] `PAWAPAY_BASE_URL` / `PAWAPAY_API_TOKEN` de production
- [ ] Callback webhook configuré dans le dashboard PawaPay (https)
- [ ] `FRONTEND_URL` = origine du front ; HTTPS actif des deux côtés
- [ ] Frontend buildé avec le bon `REACT_APP_API_URL` + fallback SPA
- [ ] `RECONCILE_CRON_ENABLED` sur une seule instance si scaling horizontal
- [ ] Sauvegardes PostgreSQL en place

---

## 💳 Paiements, webhooks & réconciliation

Le statut d'un paiement est synchronisé avec PawaPay par **trois mécanismes complémentaires** (défense en profondeur), tous via la **même logique idempotente** (`payment.sync.js`) — jamais de double traitement ni de reçu en double :

1. **Webhook** (temps réel) — PawaPay notifie `COMPLETED` / `FAILED`. La **signature est vérifiée** (RFC 9421). En dev, la vérif est *non bloquante* (journalisée) ; en prod (ou `PAWAPAY_VERIFY_SIGNATURE=true`), tout callback non valide est **rejeté (401)**.
2. **À la demande** — quand un admin vérifie un reçu encore `PENDING`, ou que l'écran étudiant fait son polling, on **réinterroge PawaPay** et on resynchronise.
3. **Cron de réconciliation** (tâche de fond) — toutes les `RECONCILE_CRON_INTERVAL_MIN` minutes, repêche les paiements `PENDING` (âgés de 2 min à 48 h, par lots) dont le webhook n'est jamais arrivé, et les met à jour depuis PawaPay. Filet de sécurité ultime.

> Le callback webhook doit être configuré dans le **dashboard PawaPay** vers `https://<votre-host>/api/payments/pawapay/webhook`.

---

## 🗺️ Principales routes API

**Public**
```
GET  /establishments                         Liste des établissements actifs
GET  /establishments/:id/programs            Parcours d'un établissement
GET  /levels                                 Niveaux/cycles
POST /payments                               Initier un paiement
GET  /payments/:paymentId/status             Statut d'un paiement (+ réconciliation)
GET  /payments/:receiptNumber/receipt        Télécharger le reçu PDF
GET  /payments/verify/:receiptNumber         Vérification publique (QR)
POST /payments/pawapay/webhook               Callback PawaPay (signé)
```

**Admin — authentification**
```
POST /admin/auth/login                       Connexion
POST /admin/auth/refresh                      Renouvellement (cookie httpOnly)
POST /admin/auth/logout                       Déconnexion
GET  /admin/auth/me                           Profil courant
POST /admin/auth/change-password              Changer son mot de passe
```

**Admin — espace cloisonné** (super admin = global, sinon son établissement)
```
GET  /admin/dashboard                         Statistiques
GET  /admin/receipts/:receiptNumber           Vérifier un paiement (+ réconciliation)
GET  /admin/students/:matricule               Recherche par matricule
GET  /admin/payments                          Liste des paiements (filtres)
GET  /admin/payments/export                   Export CSV
```

**Super admin uniquement**
```
GET   /admin/admins                           Liste des admins
POST  /admin/admins                           Créer un admin
PATCH /admin/admins/:id/status                Activer / désactiver
PATCH /admin/admins/:id/password              Réinitialiser le mot de passe
GET   /admin/audit                            Journal d'audit
POST  /admin/establishments | /levels | /programs   Catalogue
```

---

## 📁 Structure (backend)

```
backend/
├── prisma/
│   ├── schema.prisma           Modèles (Establishment, Level, Program, Student,
│   │                           Payment, Receipt, Admin, RefreshToken, AuditLog)
│   ├── migrations/             Migrations SQL
│   ├── seed.js                 Données de base + comptes admin
│   └── backfill-failure-codes.js
└── src/
    ├── index.js                Bootstrap Express + démarrage du cron
    ├── config/database.js      Client Prisma
    ├── controllers/            payment, admin, adminManagement, establishment
    ├── middlewares/            auth (JWT, scope, lockpwd), validate
    ├── services/               pawapay, payment.sync, reconcile.cron, pdf
    └── utils/                  tokens, audit, logger, response, matricule, receiptNumber
```

---

## 🧩 Modèle de données (résumé)

`Establishment` (faculté/école) → `Program` (parcours, lié à un `Level`/cycle) → `Student` → `Payment` → `Receipt`.
Côté admin : `Admin` (rattaché ou non à un `Establishment`), `RefreshToken`, `AuditLog`.

---

*Projet FloPay — paiement des frais de scolarité, Université Marien Ngouabi.*
