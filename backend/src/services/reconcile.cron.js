// src/services/reconcile.cron.js
// Filet de sécurité périodique : repêche les paiements restés PENDING (webhook
// jamais arrivé) et les resynchronise avec PawaPay via la logique idempotente
// partagée. N'ajoute aucune dépendance externe (setInterval).
const { prisma }              = require("../config/database");
const { reconcileWithPawapay } = require("./payment.sync");
const logger                  = require("../utils/logger");

const int = (v, d) => {
  const n = parseInt(v, 10);
  return Number.isFinite(n) ? n : d;
};

// Paramètres (surchargeable par variables d'env)
const INTERVAL_MIN  = int(process.env.RECONCILE_CRON_INTERVAL_MIN, 5);   // fréquence
const MIN_AGE_MIN   = int(process.env.RECONCILE_MIN_AGE_MIN, 2);         // laisser le webhook agir d'abord
const MAX_AGE_HOURS = int(process.env.RECONCILE_MAX_AGE_HOURS, 48);      // au-delà = abandonné
const BATCH         = int(process.env.RECONCILE_BATCH, 50);             // plafond par passage

// Un passage de réconciliation. Retourne { scanned, changed, failed }.
async function runReconcileSweep() {
  const now    = Date.now();
  const before = new Date(now - MIN_AGE_MIN * 60 * 1000);   // createdAt <= before
  const after  = new Date(now - MAX_AGE_HOURS * 60 * 60 * 1000); // createdAt >= after

  const targets = await prisma.payment.findMany({
    where: {
      status: "PENDING",
      pawapayDepositId: { not: null },
      createdAt: { lte: before, gte: after },
    },
    orderBy: { createdAt: "asc" },
    take: BATCH,
    include: {
      student: { include: { establishment: true } },
      program: { include: { level: true } },
    },
  });

  let changed = 0, failed = 0;
  for (const payment of targets) {
    try {
      const r = await reconcileWithPawapay(payment);
      if (r.changed) {
        changed++;
        await prisma.auditLog.create({
          data: {
            action: "RECONCILE_CRON", targetType: "Payment", targetId: payment.id,
            detail: `${payment.receiptNumber} → ${r.status}`,
          },
        });
        logger.info(`🔁 Cron: ${payment.receiptNumber} → ${r.status}`);
      }
    } catch (err) {
      failed++;
      logger.warn(`🔁 Cron: échec réconciliation ${payment.receiptNumber}: ${err.message}`);
    }
  }

  return { scanned: targets.length, changed, failed };
}

// Démarre le cron (appelé au boot). Anti-chevauchement + premier passage différé.
function startReconcileCron() {
  if (process.env.RECONCILE_CRON_ENABLED === "false") {
    logger.info("🔁 Cron de réconciliation désactivé (RECONCILE_CRON_ENABLED=false)");
    return null;
  }

  let running = false;
  const tick = async () => {
    if (running) return;                 // évite les passages qui se chevauchent
    running = true;
    try {
      const s = await runReconcileSweep();
      if (s.scanned > 0) {
        logger.info(`🔁 Réconciliation: ${s.scanned} scanné(s), ${s.changed} mis à jour, ${s.failed} échec(s)`);
      }
    } catch (err) {
      logger.error("🔁 Cron de réconciliation:", err.message);
    } finally {
      running = false;
    }
  };

  const timer = setInterval(tick, INTERVAL_MIN * 60 * 1000);
  if (timer.unref) timer.unref();        // ne maintient pas le process en vie à lui seul
  setTimeout(tick, 30 * 1000);           // premier passage 30 s après le démarrage

  logger.info(`🔁 Cron de réconciliation actif — toutes les ${INTERVAL_MIN} min (âge ${MIN_AGE_MIN} min–${MAX_AGE_HOURS} h, lot ${BATCH})`);
  return timer;
}

module.exports = { startReconcileCron, runReconcileSweep };
