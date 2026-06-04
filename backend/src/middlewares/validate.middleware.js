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

// ── Règles de validation ──────────────────────────────────────────────────────

const paymentRules = [
  body("matricule")
    .trim().notEmpty().withMessage("Le matricule est requis"),
  body("fullName")
    .trim().notEmpty().withMessage("Le nom complet est requis")
    .isLength({ min: 3 }).withMessage("Nom trop court"),
  body("phone")
    .trim().notEmpty().withMessage("Le téléphone est requis"),
  body("establishmentId")
    .isUUID().withMessage("ID établissement invalide"),
  body("programId")
    .isUUID().withMessage("ID programme invalide"),
  body("paymentMethod")
    .isIn(["MTN", "AIRTEL"]).withMessage("Méthode de paiement invalide (MTN ou AIRTEL)"),
  body("paymentPhone")
    .trim().notEmpty().withMessage("Le numéro Mobile Money est requis")
    .matches(/^(\+?242|0)?[0-9]{8,9}$/).withMessage("Numéro de téléphone invalide pour le Congo"),
];

const loginRules = [
  body("email").isEmail().withMessage("Email invalide"),
  body("password").notEmpty().withMessage("Mot de passe requis"),
];

const establishmentRules = [
  body("name").trim().notEmpty().withMessage("Nom requis"),
  body("code").trim().notEmpty().toUpperCase().withMessage("Code requis"),
];

const programRules = [
  body("name").trim().notEmpty().withMessage("Nom du parcours requis"),
  body("level").trim().notEmpty().withMessage("Niveau requis"),
  body("amount").isFloat({ min: 1 }).withMessage("Montant invalide"),
  body("academicYear")
    .matches(/^\d{4}-\d{4}$/).withMessage("Année académique invalide (ex: 2024-2025)"),
  body("establishmentId").isUUID().withMessage("ID établissement invalide"),
];

module.exports = { validate, paymentRules, loginRules, establishmentRules, programRules };
