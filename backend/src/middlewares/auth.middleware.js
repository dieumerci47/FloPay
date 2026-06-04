// src/middlewares/auth.middleware.js
const jwt    = require("jsonwebtoken");
const { error } = require("../utils/response");

const authenticate = (req, res, next) => {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    return error(res, "Token manquant ou invalide", 401);
  }

  const token = authHeader.split(" ")[1];
  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    req.admin = decoded;
    next();
  } catch (err) {
    return error(res, "Token expiré ou invalide", 401);
  }
};

const requireSuperAdmin = (req, res, next) => {
  if (req.admin?.role !== "SUPER_ADMIN") {
    return error(res, "Accès refusé — Super Admin requis", 403);
  }
  next();
};

module.exports = { authenticate, requireSuperAdmin };
