// prisma/backfill-failure-codes.js
// One-shot : renseigne `pawapayFailureCode` (+ message d'origine) pour les anciens
// paiements FAILED enregistrés avant l'ajout du code d'échec.
//
// Sûr & idempotent : ne cible QUE les FAILED ayant un depositId et pas encore de
// code. Ne modifie pas le statut. Relançable sans effet de bord.
//
// Usage : node prisma/backfill-failure-codes.js   (ou npm run db:backfill-failures)
require("dotenv").config();
const { prisma } = require("../src/config/database");
const pawapay    = require("../src/services/pawapay.service");

async function main() {
  const targets = await prisma.payment.findMany({
    where: { status: "FAILED", pawapayFailureCode: null, pawapayDepositId: { not: null } },
    select: { id: true, receiptNumber: true, pawapayDepositId: true },
  });

  console.log(`🔎 ${targets.length} paiement(s) FAILED sans code à traiter\n`);

  let updated = 0, skipped = 0, errors = 0;

  for (const p of targets) {
    try {
      const data = await pawapay.checkDepositStatus(p.pawapayDepositId);
      // v2 enveloppe la ressource : { data: { ...dépôt, failureReason }, status: "FOUND" }
      const dep    = Array.isArray(data) ? data[0] : (data && data.data ? data.data : data);
      const reason = dep && dep.failureReason;
      const code   = reason && reason.failureCode    ? reason.failureCode    : null;
      const message= reason && reason.failureMessage ? reason.failureMessage : null;

      if (!code) {
        console.log(`  ⏭️  ${p.receiptNumber} : aucun failureCode renvoyé par PawaPay`);
        skipped++;
        continue;
      }

      await prisma.payment.update({
        where: { id: p.id },
        data:  { pawapayFailureCode: code, ...(message ? { pawapayFailureReason: message } : {}) },
      });
      console.log(`  ✅ ${p.receiptNumber} → ${code}`);
      updated++;

    } catch (e) {
      console.log(`  ⚠️  ${p.receiptNumber} : ${e.message}`);
      errors++;
    }
  }

  console.log(`\n🎉 Backfill terminé — ${updated} mis à jour · ${skipped} ignorés · ${errors} erreur(s)`);
}

main()
  .catch((e) => { console.error(e); process.exit(1); })
  .finally(async () => { await prisma.$disconnect(); });
