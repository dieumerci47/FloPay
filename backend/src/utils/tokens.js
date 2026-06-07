// src/utils/tokens.js
// Génération / vérification des jetons d'authentification admin.
//   - Access token  : court (15 min par défaut), porté en mémoire côté client (header Bearer)
//   - Refresh token : long (7 j), opaque, stocké HASHÉ en base + envoyé en cookie httpOnly
const jwt    = require("jsonwebtoken");
const crypto = require("crypto");

const ACCESS_SECRET  = process.env.JWT_ACCESS_SECRET  || process.env.JWT_SECRET || "dev_access_secret";
const ACCESS_TTL     = process.env.ACCESS_TOKEN_TTL   || "15m";
const REFRESH_TTL_MS = parseInt(process.env.REFRESH_TOKEN_TTL_DAYS || "7", 10) * 24 * 60 * 60 * 1000;

// ── Access token (JWT signé) ──────────────────────────────────────────────────
const signAccessToken = (admin) =>
  jwt.sign(
    {
      id:                 admin.id,
      email:              admin.email,
      role:               admin.role,
      establishmentId:    admin.establishmentId || null,
      mustChangePassword: !!admin.mustChangePassword,
    },
    ACCESS_SECRET,
    { expiresIn: ACCESS_TTL }
  );

const verifyAccessToken = (token) => jwt.verify(token, ACCESS_SECRET);

// ── Refresh token (opaque, aléatoire) ─────────────────────────────────────────
const generateRefreshToken = () => crypto.randomBytes(48).toString("hex");

// On ne stocke jamais le refresh token en clair : seulement son empreinte SHA-256.
const hashToken = (token) => crypto.createHash("sha256").update(token).digest("hex");

const refreshExpiry = () => new Date(Date.now() + REFRESH_TTL_MS);

// Options du cookie httpOnly portant le refresh token
const refreshCookieOptions = () => ({
  httpOnly: true,
  secure:   process.env.NODE_ENV === "production",
  sameSite: process.env.NODE_ENV === "production" ? "none" : "lax",
  path:     "/api/admin/auth",
  maxAge:   REFRESH_TTL_MS,
});

const REFRESH_COOKIE = "flopay_rt";

module.exports = {
  signAccessToken,
  verifyAccessToken,
  generateRefreshToken,
  hashToken,
  refreshExpiry,
  refreshCookieOptions,
  REFRESH_COOKIE,
};
