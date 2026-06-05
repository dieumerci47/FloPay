// src/utils/audit.js
// Écrit une entrée dans le journal d'audit sans jamais faire échouer la requête
// principale (le logging ne doit pas casser le métier).
const { prisma } = require("../config/database");
const logger     = require("./logger");

const clientIp = (req) =>
  (req.headers["x-forwarded-for"]?.split(",")[0] || req.ip || req.connection?.remoteAddress || "")
    .toString()
    .trim();

const audit = async (req, { action, targetType = null, targetId = null, detail = null, adminId } = {}) => {
  try {
    await prisma.auditLog.create({
      data: {
        action,
        targetType,
        targetId,
        detail,
        ip:      clientIp(req),
        adminId: adminId ?? req.admin?.id ?? null,
      },
    });
  } catch (err) {
    logger.error("Audit log échoué:", err);
  }
};

module.exports = { audit, clientIp };
