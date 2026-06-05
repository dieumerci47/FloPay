// src/controllers/adminManagement.controller.js
// Réservé au SUPER_ADMIN : création et gestion des comptes admin d'établissement,
// et consultation du journal d'audit.
const { prisma }          = require("../config/database");
const bcrypt              = require("bcryptjs");
const { success, error, paginated } = require("../utils/response");
const logger              = require("../utils/logger");
const { audit }           = require("../utils/audit");

const publicAdmin = (a) => ({
  id:            a.id,
  email:         a.email,
  fullName:      a.fullName,
  role:          a.role,
  isActive:      a.isActive,
  lastLoginAt:   a.lastLoginAt,
  establishment: a.establishment
    ? { id: a.establishment.id, name: a.establishment.name, code: a.establishment.code }
    : null,
  createdAt:     a.createdAt,
});

// ── Liste des admins ──────────────────────────────────────────────────────────
const listAdmins = async (req, res) => {
  try {
    const admins = await prisma.admin.findMany({
      orderBy: [{ role: "asc" }, { createdAt: "desc" }],
      include: { establishment: true },
    });
    return success(res, admins.map(publicAdmin));
  } catch (err) {
    logger.error("Erreur listAdmins:", err);
    return error(res, "Erreur serveur", 500);
  }
};

// ── Créer un admin ────────────────────────────────────────────────────────────
const createAdmin = async (req, res) => {
  const { email, fullName, password, role, establishmentId } = req.body;
  try {
    const exists = await prisma.admin.findUnique({ where: { email } });
    if (exists) return error(res, "Un admin avec cet email existe déjà", 409);

    // Cohérence rôle / établissement
    let estId = null;
    if (role === "ESTABLISHMENT_ADMIN") {
      if (!establishmentId) return error(res, "Un admin d'établissement doit être rattaché à un établissement", 422);
      const est = await prisma.establishment.findUnique({ where: { id: establishmentId } });
      if (!est) return error(res, "Établissement introuvable", 404);
      estId = establishmentId;
    }

    const passwordHash = await bcrypt.hash(password, 12);
    const admin = await prisma.admin.create({
      data: { email, fullName, passwordHash, role, establishmentId: estId },
      include: { establishment: true },
    });

    await audit(req, { action: "CREATE_ADMIN", targetType: "Admin", targetId: admin.id, detail: email });
    return success(res, publicAdmin(admin), "Admin créé", 201);

  } catch (err) {
    logger.error("Erreur createAdmin:", err);
    return error(res, "Erreur serveur", 500);
  }
};

// ── Activer / désactiver un admin ─────────────────────────────────────────────
const setAdminActive = async (req, res) => {
  const { id } = req.params;
  const { isActive } = req.body;
  try {
    if (id === req.admin.id) return error(res, "Vous ne pouvez pas modifier votre propre statut", 422);

    const admin = await prisma.admin.findUnique({ where: { id } });
    if (!admin) return error(res, "Admin introuvable", 404);

    const updated = await prisma.admin.update({
      where: { id },
      data:  { isActive: !!isActive, ...(isActive ? {} : {}) },
      include: { establishment: true },
    });

    // Désactivation → on révoque toutes ses sessions
    if (!isActive) {
      await prisma.refreshToken.updateMany({
        where: { adminId: id, revokedAt: null }, data: { revokedAt: new Date() },
      });
    }

    await audit(req, {
      action: isActive ? "ENABLE_ADMIN" : "DISABLE_ADMIN",
      targetType: "Admin", targetId: id,
    });
    return success(res, publicAdmin(updated), "Statut mis à jour");

  } catch (err) {
    logger.error("Erreur setAdminActive:", err);
    return error(res, "Erreur serveur", 500);
  }
};

// ── Réinitialiser le mot de passe d'un admin ──────────────────────────────────
const resetAdminPassword = async (req, res) => {
  const { id } = req.params;
  const { password } = req.body;
  try {
    const admin = await prisma.admin.findUnique({ where: { id } });
    if (!admin) return error(res, "Admin introuvable", 404);

    const passwordHash = await bcrypt.hash(password, 12);
    await prisma.admin.update({
      where: { id },
      data:  { passwordHash, failedLoginAttempts: 0, lockedUntil: null },
    });
    // Sessions invalidées par sécurité
    await prisma.refreshToken.updateMany({
      where: { adminId: id, revokedAt: null }, data: { revokedAt: new Date() },
    });

    await audit(req, { action: "RESET_PASSWORD", targetType: "Admin", targetId: id });
    return success(res, null, "Mot de passe réinitialisé");

  } catch (err) {
    logger.error("Erreur resetAdminPassword:", err);
    return error(res, "Erreur serveur", 500);
  }
};

// ── Journal d'audit ───────────────────────────────────────────────────────────
const listAuditLogs = async (req, res) => {
  const { page = 1, limit = 30, action } = req.query;
  const skip = (parseInt(page) - 1) * parseInt(limit);
  try {
    const where = action ? { action } : {};
    const [logs, total] = await Promise.all([
      prisma.auditLog.findMany({
        where, skip, take: parseInt(limit),
        orderBy: { createdAt: "desc" },
        include: { admin: { select: { fullName: true, email: true } } },
      }),
      prisma.auditLog.count({ where }),
    ]);

    const data = logs.map((l) => ({
      id:        l.id,
      action:    l.action,
      target:    l.targetType ? `${l.targetType}:${l.detail || l.targetId || ""}` : (l.detail || ""),
      admin:     l.admin ? l.admin.fullName : "—",
      adminEmail:l.admin ? l.admin.email : null,
      ip:        l.ip,
      createdAt: l.createdAt,
    }));
    return paginated(res, data, total, page, limit);

  } catch (err) {
    logger.error("Erreur listAuditLogs:", err);
    return error(res, "Erreur serveur", 500);
  }
};

module.exports = { listAdmins, createAdmin, setAdminActive, resetAdminPassword, listAuditLogs };
