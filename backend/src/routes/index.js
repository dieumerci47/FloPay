// src/routes/index.js
const express   = require("express");
const rateLimit = require("express-rate-limit");
const router    = express.Router();

const { initiatePayment, pawapayWebhook, getPaymentStatus, downloadReceipt, verifyReceipt }
  = require("../controllers/payment.controller");

const { login, refresh, logout, me, changePassword,
        searchByMatricule, searchByReceipt, listPayments, exportPayments, getDashboardStats }
  = require("../controllers/admin.controller");

const { listAdmins, createAdmin, setAdminActive, resetAdminPassword, listAuditLogs }
  = require("../controllers/adminManagement.controller");

const { getEstablishments, getProgramsByEstablishment, getLevels,
        createEstablishment, createLevel, createProgram }
  = require("../controllers/establishment.controller");

const { authenticate, requireSuperAdmin, attachScope, requirePasswordChanged }
  = require("../middlewares/auth.middleware");

const {
  validate, paymentRules, loginRules, establishmentRules, levelRules, programRules,
  createAdminRules, setActiveRules, resetPasswordRules, changePasswordRules,
} = require("../middlewares/validate.middleware");

// Rate-limit dédié à l'authentification (anti brute-force réseau)
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max:      20,
  message:  { success: false, message: "Trop de tentatives de connexion, réessayez plus tard" },
});

// ══════════════════════════════════════════════════════════════════════════════
// PUBLIC
// ══════════════════════════════════════════════════════════════════════════════
router.get("/establishments",                            getEstablishments);
router.get("/establishments/:establishmentId/programs",  getProgramsByEstablishment);
router.get("/levels",                                    getLevels);

router.post("/payments",                   paymentRules, validate, initiatePayment);
router.get("/payments/verify/:receiptNumber",            verifyReceipt);
router.get("/payments/:paymentId/status",                getPaymentStatus);
router.get("/payments/:receiptNumber/receipt",           downloadReceipt);
router.post("/payments/pawapay/webhook",                 pawapayWebhook);

// ══════════════════════════════════════════════════════════════════════════════
// ADMIN — Authentification
// ══════════════════════════════════════════════════════════════════════════════
router.post("/admin/auth/login",   authLimiter, loginRules, validate, login);
router.post("/admin/auth/refresh", refresh);                 // s'appuie sur le cookie httpOnly
router.post("/admin/auth/logout",  logout);
router.get ("/admin/auth/me",      authenticate, me);
router.post("/admin/auth/change-password", authenticate, changePasswordRules, validate, changePassword);

// ══════════════════════════════════════════════════════════════════════════════
// ADMIN — Espace cloisonné (super admin = global, sinon = son établissement)
// ══════════════════════════════════════════════════════════════════════════════
router.get("/admin/dashboard",               authenticate, requirePasswordChanged, attachScope, getDashboardStats);
router.get("/admin/receipts/:receiptNumber", authenticate, requirePasswordChanged, attachScope, searchByReceipt);
router.get("/admin/students/:matricule",     authenticate, requirePasswordChanged, attachScope, searchByMatricule);
router.get("/admin/payments",                authenticate, requirePasswordChanged, attachScope, listPayments);
router.get("/admin/payments/export",         authenticate, requirePasswordChanged, attachScope, exportPayments);

// ══════════════════════════════════════════════════════════════════════════════
// SUPER ADMIN — Gestion des admins, catalogue & audit
// ══════════════════════════════════════════════════════════════════════════════
router.get ("/admin/admins",            authenticate, requirePasswordChanged, requireSuperAdmin, listAdmins);
router.post("/admin/admins",            authenticate, requirePasswordChanged, requireSuperAdmin, createAdminRules, validate, createAdmin);
router.patch("/admin/admins/:id/status",authenticate, requirePasswordChanged, requireSuperAdmin, setActiveRules, validate, setAdminActive);
router.patch("/admin/admins/:id/password", authenticate, requirePasswordChanged, requireSuperAdmin, resetPasswordRules, validate, resetAdminPassword);
router.get ("/admin/audit",             authenticate, requirePasswordChanged, requireSuperAdmin, listAuditLogs);

router.post("/admin/establishments", authenticate, requirePasswordChanged, requireSuperAdmin, establishmentRules, validate, createEstablishment);
router.post("/admin/levels",         authenticate, requirePasswordChanged, requireSuperAdmin, levelRules, validate, createLevel);
router.post("/admin/programs",       authenticate, requirePasswordChanged, requireSuperAdmin, programRules, validate, createProgram);

module.exports = router;
