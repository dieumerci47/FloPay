// src/services/payment.sync.js
// Logique unique d'application d'un statut de dépôt PawaPay à un paiement.
// Utilisée par :
//   - le webhook PawaPay (notification entrante)
//   - la réconciliation à la demande (vérification admin)
// Garantit l'idempotence : pas de double génération de reçu, pas de double-écriture.
const { prisma }     = require("../config/database");
const pdfService     = require("./pdf.service");
const pawapayService = require("./pawapay.service");
const logger         = require("../utils/logger");

// ── Mapping statut PawaPay → notre PaymentStatus ──────────────────────────────
function mapStatus(pawapayStatus) {
  switch ((pawapayStatus || "").toUpperCase()) {
    case "COMPLETED":
      return "SUCCESS";
    case "FAILED":
    case "REJECTED":
    case "TIMED_OUT":
      return "FAILED";
    // ACCEPTED, SUBMITTED, ENQUEUED, PROCESSING, IN_RECONCILIATION,
    // DUPLICATE_IGNORED, NOT_FOUND… → on n'a pas (encore) de verdict
    default:
      return "PENDING";
  }
}

// ── Codes d'échec PawaPay → message clair en français ─────────────────────────
const FAILURE_FR = {
  INSUFFICIENT_BALANCE:          "Solde insuffisant sur votre compte Mobile Money. Rechargez puis réessayez.",
  PAYER_LIMIT_REACHED:           "Plafond de votre portefeuille Mobile Money atteint. Réessayez plus tard ou augmentez votre limite.",
  PAYMENT_NOT_APPROVED:          "Paiement non validé sur votre téléphone (code PIN non saisi, refusé ou délai dépassé). Relancez et confirmez.",
  TRANSACTION_ALREADY_IN_PROCESS:"Une autre transaction est déjà en cours sur ce numéro. Patientez un instant puis réessayez.",
  PAYER_NOT_FOUND:               "Numéro Mobile Money introuvable. Vérifiez le numéro et l'opérateur choisi.",
  AMOUNT_OUT_OF_BOUNDS:          "Le montant dépasse les limites autorisées par l'opérateur.",
  PROVIDER_TEMPORARILY_UNAVAILABLE:"L'opérateur Mobile Money est momentanément indisponible. Réessayez dans quelques minutes.",
  COULD_NOT_PERFORM_TRANSACTION: "La transaction n'a pas pu être effectuée par l'opérateur. Réessayez.",
  UNSPECIFIED_FAILURE:           "Le paiement a échoué. Réessayez ou contactez votre opérateur.",
  OTHER_ERROR:                   "Le paiement a échoué. Réessayez ou contactez votre opérateur.",
  UNKNOWN_ERROR:                 "Le paiement a échoué. Réessayez ou contactez votre opérateur.",
};

// Message utilisateur final : FR si le code est connu, sinon le message d'origine, sinon défaut.
function failureToFrench(code, fallbackMessage) {
  return FAILURE_FR[code] || fallbackMessage || "Le paiement a échoué.";
}

// Normalise le failureReason PawaPay (objet { failureCode, failureMessage } ou chaîne)
function parseFailure(reason) {
  if (!reason) return { code: null, message: "Paiement échoué" };
  if (typeof reason === "string") return { code: null, message: reason };
  return {
    code:    reason.failureCode || null,
    message: reason.failureMessage || reason.failureCode || "Paiement échoué",
  };
}

/**
 * Applique un statut de dépôt à un paiement, de façon idempotente.
 * `payment` doit inclure student.establishment et program.level (pour le PDF).
 * Retourne le statut final ("SUCCESS" | "FAILED" | "PENDING").
 */
async function applyDepositStatus(payment, { pawapayStatus, failureReason = null, paidAt = null } = {}) {
  const target = mapStatus(pawapayStatus);

  // ── Succès ──────────────────────────────────────────────────────────────────
  if (target === "SUCCESS") {
    if (payment.status === "SUCCESS") {
      // Déjà validé : on s'assure seulement que le reçu existe (rattrapage)
      const receipt = await prisma.receipt.findUnique({ where: { paymentId: payment.id } });
      if (!receipt) await generateReceipt(payment, paidAt || payment.paidAt || new Date());
      return "SUCCESS";
    }

    const when = paidAt || new Date();
    await prisma.payment.update({
      where: { id: payment.id },
      data:  { status: "SUCCESS", pawapayStatus, paidAt: when },
    });
    await generateReceipt(payment, when);
    logger.info(`✅ Paiement validé (sync): ${payment.receiptNumber}`);
    return "SUCCESS";
  }

  // ── Échec ───────────────────────────────────────────────────────────────────
  if (target === "FAILED") {
    if (payment.status === "FAILED") return "FAILED";
    const { code, message } = parseFailure(failureReason);
    await prisma.payment.update({
      where: { id: payment.id },
      data:  {
        status:               "FAILED",
        pawapayStatus,
        pawapayFailureReason: message,   // détail d'origine
        pawapayFailureCode:   code,      // code stable
      },
    });
    logger.warn(`❌ Paiement échoué (sync): ${payment.receiptNumber} | ${code || pawapayStatus}`);
    return "FAILED";
  }

  // ── Toujours en cours : aucun changement ──────────────────────────────────────
  return payment.status;
}

// Génère le PDF + crée le reçu si absent (idempotent)
async function generateReceipt(payment, paidAt) {
  const existing = await prisma.receipt.findUnique({ where: { paymentId: payment.id } });
  if (existing) return existing;
  const pdfPath = await pdfService.generateReceipt({ ...payment, status: "SUCCESS", paidAt });
  return prisma.receipt.create({ data: { paymentId: payment.id, pdfPath } });
}

/**
 * Réconciliation à la demande : interroge PawaPay pour la VÉRITÉ et resynchronise.
 * Ne lève jamais (PawaPay injoignable = on renvoie l'état courant).
 * Retourne { status, changed, reachable, pawapayStatus }.
 */
async function reconcileWithPawapay(payment) {
  if (!payment.pawapayDepositId) {
    return { status: payment.status, changed: false, reachable: false, pawapayStatus: null };
  }

  let data;
  try {
    data = await pawapayService.checkDepositStatus(payment.pawapayDepositId);
  } catch (err) {
    logger.warn(`🔁 Réconciliation: PawaPay injoignable (${payment.receiptNumber}): ${err.message}`);
    return { status: payment.status, changed: false, reachable: false, pawapayStatus: null };
  }

  // v2 enveloppe la ressource : { data: { ...dépôt, status }, status: "FOUND" }
  // On déballe `data.data` ; on tolère aussi un objet direct ou un tableau.
  const dep = Array.isArray(data) ? data[0] : (data && data.data ? data.data : data);
  const pawapayStatus = dep?.status;
  if (!pawapayStatus) {
    return { status: payment.status, changed: false, reachable: true, pawapayStatus: null };
  }

  const before = payment.status;
  const after  = await applyDepositStatus(payment, {
    pawapayStatus,
    failureReason: dep.failureReason,
    paidAt:        dep.created ? new Date(dep.created) : null,
  });

  return { status: after, changed: after !== before, reachable: true, pawapayStatus };
}

module.exports = { applyDepositStatus, reconcileWithPawapay, mapStatus, failureToFrench };
