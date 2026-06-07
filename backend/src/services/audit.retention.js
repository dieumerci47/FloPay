// src/services/audit.retention.js
// Purge périodique du journal d'audit pour éviter le gonflement de la table sur
// le long terme. Conserve les N derniers mois (par défaut 12).
const { prisma } = require("../config/database");
const logger     = require("../utils/logger");

const RETENTION_MONTHS = parseInt(process.env.AUDIT_RETENTION_MONTHS || "12", 10);
const INTERVAL_MS      = 24 * 60 * 60 * 1000; // une fois par jour

function cutoffDate() {
  const d = new Date();
  d.setMonth(d.getMonth() - RETENTION_MONTHS);
  return d;
}

async function purgeOldAuditLogs() {
  const cutoff = cutoffDate();
  const { count } = await prisma.auditLog.deleteMany({ where: { createdAt: { lt: cutoff } } });
  if (count > 0) {
    logger.info(`🧹 Audit: ${count} entrée(s) de plus de ${RETENTION_MONTHS} mois purgée(s)`);
  }
  return count;
}

function startAuditRetention() {
  if (process.env.AUDIT_RETENTION_ENABLED === "false") {
    logger.info("🧹 Rétention du journal d'audit désactivée (AUDIT_RETENTION_ENABLED=false)");
    return null;
  }

  let running = false;
  const tick = async () => {
    if (running) return;
    running = true;
    try { await purgeOldAuditLogs(); }
    catch (err) { logger.error("🧹 Rétention audit:", err.message); }
    finally { running = false; }
  };

  const timer = setInterval(tick, INTERVAL_MS);
  if (timer.unref) timer.unref();
  setTimeout(tick, 60 * 1000); // premier passage 1 min après le démarrage

  logger.info(`🧹 Rétention du journal d'audit active — conservation ${RETENTION_MONTHS} mois`);
  return timer;
}

module.exports = { startAuditRetention, purgeOldAuditLogs };
