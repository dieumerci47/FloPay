// src/routes/index.js
const express = require("express");
const router  = express.Router();

const { initiatePayment, pawapayWebhook, getPaymentStatus, downloadReceipt, verifyReceipt }
  = require("../controllers/payment.controller");

const { login, searchByMatricule, searchByReceipt, listPayments, getDashboardStats }
  = require("../controllers/admin.controller");

const { getEstablishments, getProgramsByEstablishment, getLevels,
        createEstablishment, createLevel, createProgram }
  = require("../controllers/establishment.controller");

const { authenticate, requireSuperAdmin }
  = require("../middlewares/auth.middleware");

const {
  validate, paymentRules, loginRules, establishmentRules, levelRules, programRules,
} = require("../middlewares/validate.middleware");

// ══════════════════════════════════════════════════════════════════════════════
// PUBLIC — Routes accessibles sans authentification
// ══════════════════════════════════════════════════════════════════════════════

// Établissements, niveaux & programmes (pour le formulaire étudiant)
router.get("/establishments",                        getEstablishments);
router.get("/establishments/:establishmentId/programs", getProgramsByEstablishment);
router.get("/levels",                                getLevels);

// Paiement étudiant
router.post("/payments",                paymentRules, validate, initiatePayment);
router.get("/payments/verify/:receiptNumber",         verifyReceipt);   // vérification publique (QR)
router.get("/payments/:paymentId/status",            getPaymentStatus);
router.get("/payments/:receiptNumber/receipt",        downloadReceipt);

// Webhook PawaPay — doit rester public (PawaPay ne s'authentifie pas avec notre JWT)
router.post("/payments/pawapay/webhook", pawapayWebhook);

// ══════════════════════════════════════════════════════════════════════════════
// ADMIN — Routes protégées (scolarité centrale)
// ══════════════════════════════════════════════════════════════════════════════

// Auth
router.post("/admin/auth/login", loginRules, validate, login);

// Dashboard & recherche
router.get("/admin/dashboard",                   authenticate, getDashboardStats);
router.get("/admin/receipts/:receiptNumber",     authenticate, searchByReceipt);   // vérification principale (par reçu)
router.get("/admin/students/:matricule",         authenticate, searchByMatricule); // secondaire (si matricule fourni)
router.get("/admin/payments",                    authenticate, listPayments);

// Gestion établissements & programmes (Super Admin seulement)
router.post("/admin/establishments",
  authenticate, requireSuperAdmin, establishmentRules, validate, createEstablishment
);
router.post("/admin/levels",
  authenticate, requireSuperAdmin, levelRules, validate, createLevel
);
router.post("/admin/programs",
  authenticate, requireSuperAdmin, programRules, validate, createProgram
);

module.exports = router;
