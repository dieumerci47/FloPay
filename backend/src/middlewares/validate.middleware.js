// src/middlewares/validate.middleware.js
const { validationResult, body, param } = require("express-validator");
const { error } = require("../utils/response");

// Exécute les validations et retourne les erreurs
const validate = (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return error(res, "Données invalides", 422, errors.array());
  }
  next();
};

// ── Helpers communs ───────────────────────────────────────────────────────────
// Numéro mobile congolais : national 0[5|6]XXXXXXX, ou international (+)242…,
// avec ou sans le 0 (MTN = 06, Airtel = 05).
const CONGO_MOBILE = /^(\+?242)?0?[56]\d{7}$/;
const stripPhone   = (v) => String(v || "").replace(/[\s.\-()]/g, "");

// ── Règles de validation ──────────────────────────────────────────────────────

const paymentRules = [
  // matricule : non saisi par l'étudiant — généré côté backend
  body("lastName")
    .trim().notEmpty().withMessage("Le nom est requis"),
  body("firstName")
    .trim().notEmpty().withMessage("Le(s) prénom(s) est/sont requis"),
  body("gender")
    .isIn(["M", "F"]).withMessage("Sexe invalide (M ou F)"),
  body("phone")
    .customSanitizer(stripPhone)
    .notEmpty().withMessage("Le téléphone est requis")
    .matches(CONGO_MOBILE).withMessage("Numéro congolais invalide (ex. 06 XXX XX XX ou 05 XXX XX XX)"),
  body("establishmentId")
    .isUUID().withMessage("ID établissement invalide"),
  body("programId")
    .isUUID().withMessage("ID programme invalide"),
  body("academicYear")
    .matches(/^\d{4}-\d{4}$/).withMessage("Année académique invalide (ex: 2025-2026)"),
  body("studyYear")
    .isInt({ min: 1 }).withMessage("Niveau (année d'étude) invalide").toInt(),
  body("paymentMethod")
    .isIn(["MTN", "AIRTEL"]).withMessage("Méthode de paiement invalide (MTN ou AIRTEL)"),
  body("paymentPhone")
    .customSanitizer(stripPhone)
    .notEmpty().withMessage("Le numéro Mobile Money est requis")
    .matches(CONGO_MOBILE).withMessage("Numéro Mobile Money invalide (MTN 06… ou Airtel 05…)"),
];

const loginRules = [
  body("email").isEmail().withMessage("Email invalide"),
  body("password").notEmpty().withMessage("Mot de passe requis"),
];

const establishmentRules = [
  body("name").trim().notEmpty().withMessage("Nom requis"),
  body("code").trim().notEmpty().toUpperCase().withMessage("Code requis"),
];

const levelRules = [
  body("name").trim().notEmpty().withMessage("Nom du niveau requis"),
  body("amount").isFloat({ min: 1 }).withMessage("Montant invalide"),
  body("years").optional().isInt({ min: 1, max: 10 }).withMessage("Nombre d'années invalide").toInt(),
];

const programRules = [
  body("name").trim().notEmpty().withMessage("Nom du parcours requis"),
  body("levelId").isUUID().withMessage("Niveau invalide"),
  body("establishmentId").isUUID().withMessage("ID établissement invalide"),
];

// ── Règles : gestion des admins (super admin) ─────────────────────────────────
const STRONG_PASSWORD = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[^A-Za-z0-9]).{8,}$/;
const PASSWORD_MSG = "8 caractères min, avec majuscule, minuscule, chiffre et caractère spécial";

const createAdminRules = [
  body("email").isEmail().withMessage("Email invalide").normalizeEmail(),
  body("fullName").trim().notEmpty().withMessage("Nom complet requis"),
  body("password")
    .matches(STRONG_PASSWORD)
    .withMessage(`Mot de passe : ${PASSWORD_MSG}`),
  body("role").isIn(["SUPER_ADMIN", "ESTABLISHMENT_ADMIN"]).withMessage("Rôle invalide"),
  body("establishmentId")
    .if(body("role").equals("ESTABLISHMENT_ADMIN"))
    .isUUID().withMessage("Établissement requis pour un admin d'établissement"),
];

const setActiveRules = [
  body("isActive").isBoolean().withMessage("Statut invalide").toBoolean(),
];

const resetPasswordRules = [
  body("password")
    .matches(STRONG_PASSWORD)
    .withMessage(`Mot de passe : ${PASSWORD_MSG}`),
];

const changePasswordRules = [
  body("currentPassword").notEmpty().withMessage("Mot de passe actuel requis"),
  body("newPassword")
    .matches(STRONG_PASSWORD)
    .withMessage(`Nouveau mot de passe : ${PASSWORD_MSG}`),
];

module.exports = {
  validate, paymentRules, loginRules, establishmentRules, levelRules, programRules,
  createAdminRules, setActiveRules, resetPasswordRules, changePasswordRules,
};
