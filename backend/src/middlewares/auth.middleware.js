// src/middlewares/auth.middleware.js
const { verifyAccessToken } = require("../utils/tokens");
const { error }             = require("../utils/response");

// ── Authentification : valide l'access token (header Bearer) ───────────────────
const authenticate = (req, res, next) => {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    return error(res, "Token manquant ou invalide", 401);
  }

  const token = authHeader.split(" ")[1];
  try {
    req.admin = verifyAccessToken(token);
    next();
  } catch (err) {
    // Distingue l'expiration (le client tentera /refresh) des autres erreurs
    const expired = err.name === "TokenExpiredError";
    return error(res, expired ? "Token expiré" : "Token invalide", 401);
  }
};

// ── Restriction de rôle ───────────────────────────────────────────────────────
const requireSuperAdmin = (req, res, next) => {
  if (req.admin?.role !== "SUPER_ADMIN") {
    return error(res, "Accès refusé — Super Admin requis", 403);
  }
  next();
};

// ── Cloisonnement multi-tenant ────────────────────────────────────────────────
// Injecte req.scope.establishmentId :
//   - null  pour un SUPER_ADMIN (accès global)
//   - l'établissement rattaché pour un ESTABLISHMENT_ADMIN
// Un admin d'établissement SANS établissement rattaché est rejeté (sécurité).
const attachScope = (req, res, next) => {
  if (req.admin?.role === "SUPER_ADMIN") {
    req.scope = { establishmentId: null, isSuperAdmin: true };
    return next();
  }
  if (!req.admin?.establishmentId) {
    return error(res, "Compte non rattaché à un établissement", 403);
  }
  req.scope = { establishmentId: req.admin.establishmentId, isSuperAdmin: false };
  next();
};

// Helper : un admin d'établissement n'a-t-il PAS le droit de voir cet établissement ?
const isOutOfScope = (req, establishmentId) =>
  !req.scope?.isSuperAdmin && req.scope?.establishmentId !== establishmentId;

// Bloque toute action métier tant que le mot de passe provisoire n'est pas changé.
// (À appliquer sur les routes protégées, SAUF /auth/change-password, /auth/me, /auth/logout.)
const requirePasswordChanged = (req, res, next) => {
  if (req.admin?.mustChangePassword) {
    return error(res, "Vous devez d'abord changer votre mot de passe provisoire", 403);
  }
  next();
};

module.exports = { authenticate, requireSuperAdmin, attachScope, isOutOfScope, requirePasswordChanged };
