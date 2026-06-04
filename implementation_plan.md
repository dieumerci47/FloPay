# Architecture UMG PayTech avec PawaPay

Ce document définit l'architecture technique retenue pour le projet **UMG PayTech**, avec l'intégration de **PawaPay** comme agrégateur de paiement (Mobile Money).

## Pourquoi PawaPay plutôt que les API natives (MTN / Airtel) ?

L'idée de passer par un agrégateur comme PawaPay est **excellente** pour un MVP avec des contraintes de temps (10 semaines). Voici les avantages majeurs :
1. **Intégration Unique** : Au lieu de développer et maintenir deux intégrations complexes (MTN MoMo et Airtel Money), nous n'avons qu'une seule API REST standardisée à implémenter.
2. **Gestion des Webhooks simplifiée** : PawaPay s'occupe de normaliser les callbacks (notifications de succès ou d'échec du paiement) venant des différents opérateurs.
3. **Réconciliation Comptable** : PawaPay offre un tableau de bord unifié pour suivre tous les flux financiers (Airtel et MTN confondus), ce qui facilitera grandement l'export comptable (Phase 3).
4. **Gain de temps sur la Phase 1 et 2** : Le temps gagné sur l'intégration des paiements pourra être investi dans l'expérience utilisateur, la génération des PDF et le portail Admin.

> [!WARNING]
> **Modèle Économique** : PawaPay prend une commission sur chaque transaction. Il faudra s'assurer que notre modèle économique (la commission de 1,5% mentionnée) couvre à la fois les frais de l'opérateur (MTN/Airtel) ET ceux de PawaPay, tout en dégageant de la rentabilité.

---

## Architecture Technique Proposée

L'architecture reste basée sur les 3 couches modernes, optimisées pour la rapidité de développement et la scalabilité.

### 1. FRONTEND (Interface Étudiant et Admin)
- **Web (Étudiants & Scolarité)** : React.js (via Vite) avec Tailwind CSS pour un design rapide, premium et dynamique.
- **Mobile (Étudiants)** : React Native (via Expo) pour déployer simultanément sur Android et iOS.
- **État & Fetching** : React Query (TanStack Query) ou Zustand pour la gestion d'état.

### 2. BACKEND (Logique Métier & API)
- **Framework** : Node.js avec Express.js.
- **Base de données** : PostgreSQL.
- **ORM (Object-Relational Mapping)** : Prisma ORM (pour des requêtes robustes et typées).
- **Génération PDF** : `puppeteer` ou `pdfkit` pour créer des déclarations de recette avec un beau design.

### 3. INTÉGRATIONS EXTERNES
- **PawaPay API** : Utilisation du point de terminaison `/v1/deposits` pour initier les demandes de paiement (USSD Push) sur le téléphone de l'étudiant.
- **SMS Gateway** : Un fournisseur comme Twilio ou un agrégateur local (ex: SMS Congo, ou Africa's Talking) pour envoyer le lien de téléchargement du reçu.

---

## Flux de Paiement Cible (PawaPay)

1. L'étudiant remplit ses informations sur l'app.
2. Le Backend UMG crée une transaction **"PENDING"** en base de données.
3. Le Backend appelle l'API PawaPay (Deposit) avec le numéro de téléphone et le montant.
4. L'étudiant reçoit un **Push USSD** sur son téléphone et valide avec son code PIN (MTN ou Airtel).
5. PawaPay envoie une requête HTTP (**Webhook Callback**) à notre Backend UMG pour informer que le paiement est "COMPLETED".
6. Le Backend :
   - Met à jour la transaction en **"SUCCESS"**.
   - Génère le **Reçu PDF**.
   - Déclenche l'envoi du **SMS** avec le lien du reçu.

---

## Open Questions

> [!IMPORTANT]
> Pour valider cette architecture, j'ai quelques questions :
> 1. Es-tu d'accord avec l'utilisation de **Prisma ORM** pour communiquer avec PostgreSQL de manière sécurisée côté Node.js ?
> 2. Pour le frontend Web, es-tu à l'aise avec **Tailwind CSS** (ou préfères-tu du CSS Vanilla comme défini dans mes règles internes) ?
> 3. Disposes-tu déjà d'un compte de test (Sandbox) sur PawaPay ou devons-nous utiliser leurs numéros de test documentés pour l'instant ?

## Prochaines Étapes
Dès que tu auras validé cette architecture, je vais générer un fichier de tâches (`task.md`) et nous pourrons commencer à implémenter le Backend et la base de données.
