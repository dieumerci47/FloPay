// src/controllers/payment.controller.js
const { prisma }              = require("../config/database");
const pawapayService          = require("../services/pawapay.service");
const pdfService              = require("../services/pdf.service");
const { generateReceiptNumber } = require("../utils/receiptNumber");
const { generateMatricule }     = require("../utils/matricule");

// Fenêtre pendant laquelle un paiement PENDING récent est réutilisé au lieu d'en
// créer un nouveau (évite un 2ᵉ dépôt PawaPay → double débit sur re-soumission).
const PENDING_REUSE_WINDOW_MS = 5 * 60 * 1000; // 5 minutes
const { success, error }      = require("../utils/response");
const logger                  = require("../utils/logger");

// ── Initier un paiement ───────────────────────────────────────────────────────
const initiatePayment = async (req, res) => {
  const { lastName, firstName, gender, birthDate, birthPlace, phone,
          establishmentId, programId, academicYear, studyYear, paymentMethod, paymentPhone } = req.body;

  try {
    // 1. Récupérer le programme (le montant vient désormais du niveau)
    const program = await prisma.program.findFirst({
      where: { id: programId, isActive: true },
      include: { establishment: true, level: true },
    });
    if (!program) return error(res, "Programme introuvable", 404);

    const programAmount = program.level.amount;   // frais = montant du cycle (toutes années confondues)

    // L'année d'étude choisie doit être valide pour le cycle (ex: Licence → 1..3)
    if (!Number.isInteger(studyYear) || studyYear < 1 || studyYear > program.level.years) {
      return error(res, `Niveau invalide pour le cycle ${program.level.name}`, 422);
    }

    // 2. Vérifier que l'étudiant n'a pas déjà payé ce parcours pour l'année choisie.
    //    Identité = téléphone + nom + prénom. L'année est choisie par l'étudiant.
    const alreadyPaid = await prisma.payment.findFirst({
      where: {
        student: { phone, lastName, firstName },
        programId,
        academicYear,
        status: "SUCCESS",
      },
    });
    if (alreadyPaid) {
      return error(res, "Ce numéro a déjà un paiement validé pour ce parcours cette année académique", 409);
    }

    // 2 bis. Réutiliser un paiement PENDING récent (anti double-dépôt sur re-soumission).
    //        On renvoie l'existant → le frontend reprend son polling, pas de 2ᵉ prompt PIN.
    const recentPending = await prisma.payment.findFirst({
      where: {
        student: { phone, lastName, firstName },
        programId,
        academicYear,
        studyYear,
        status: "PENDING",
        pawapayDepositId: { not: null },   // un dépôt a bien été initié
        createdAt: { gte: new Date(Date.now() - PENDING_REUSE_WINDOW_MS) },
      },
      orderBy: { createdAt: "desc" },
    });
    if (recentPending) {
      logger.info(`♻️  Paiement PENDING réutilisé: ${recentPending.receiptNumber}`);
      return success(res, {
        paymentId:     recentPending.id,
        receiptNumber: recentPending.receiptNumber,
        depositId:     recentPending.pawapayDepositId,
        amount:        Number(recentPending.amount),
        currency:      recentPending.currency,
        status:        "PENDING",
        message:       "Un paiement est déjà en cours pour ce parcours. Confirmez-le sur votre téléphone.",
      }, "Paiement déjà en cours", 200);
    }

    // 3. Créer ou retrouver l'étudiant (identité = téléphone + nom + prénom)
    let student = await prisma.student.findFirst({ where: { phone, lastName, firstName } });
    if (!student) {
      student = await prisma.student.create({
        data: {
          matricule: generateMatricule(),   // identifiant interne auto-généré
          lastName,
          firstName,
          gender,
          birthDate: birthDate ? new Date(birthDate) : null,
          birthPlace,
          phone,
          establishmentId,
          programId,
        },
      });
    }

    // 4. Générer le numéro de reçu
    const receiptNumber = generateReceiptNumber();

    // 5. Créer le paiement en statut PENDING
    const payment = await prisma.payment.create({
      data: {
        receiptNumber,
        amount:        programAmount,
        currency:      "XAF",
        paymentMethod,
        phoneNumber:   PawapayService_formatPhone(paymentPhone),
        academicYear,
        studyYear,
        studentId:     student.id,
        programId:     program.id,
      },
    });

    // 6. Appeler PawaPay
    const formattedPhone = pawapayService.constructor.formatPhone(paymentPhone);

    const { depositId } = await pawapayService.initiateDeposit({
      phone:         formattedPhone,
      amount:        Number(programAmount),
      method:        paymentMethod,
      receiptNumber,
      description:   `Scolarite UMG ${academicYear} - ${student.lastName} ${student.firstName}`,
    });

    // 7. Mettre à jour le paiement avec l'ID PawaPay
    await prisma.payment.update({
      where: { id: payment.id },
      data:  { pawapayDepositId: depositId },
    });

    logger.info(`💳 Paiement initié: ${receiptNumber} | Étudiant: ${student.lastName} ${student.firstName} (${phone})`);

    return success(res, {
      paymentId:     payment.id,
      receiptNumber,
      depositId,
      amount:        Number(programAmount),
      currency:      "XAF",
      status:        "PENDING",
      message:       "Confirmez le paiement sur votre téléphone mobile",
    }, "Paiement initié avec succès", 201);

  } catch (err) {
    logger.error("Erreur initiatePayment:", err);
    return error(res, err.message || "Erreur lors de l'initiation du paiement", 500);
  }
};

// ── Webhook PawaPay ───────────────────────────────────────────────────────────
// PawaPay appelle cette route quand le paiement est confirmé ou échoue
const pawapayWebhook = async (req, res) => {
  try {
    const signature = req.headers["x-signature"] || "";

    // express.raw() donne req.body en Buffer pour vérifier la signature
    // Il faut parser manuellement le JSON
    const body = Buffer.isBuffer(req.body) ? JSON.parse(req.body.toString()) : req.body;

    // Valider la signature (prod uniquement)
    const isValid = pawapayService.validateWebhookSignature(body, signature);
    if (!isValid) {
      logger.warn("⚠️  Signature webhook invalide");
      return res.status(401).json({ message: "Signature invalide" });
    }

    logger.info("📦 Webhook payload reçu:", JSON.stringify(body));

    const { depositId, status, amount, payer, metadata } = body;

    logger.info(`🔔 Webhook PawaPay reçu: ${depositId} | Status: ${status}`);

    // Trouver le paiement correspondant
    const payment = await prisma.payment.findUnique({
      where:   { pawapayDepositId: depositId },
      include: {
        student: { include: { establishment: true } },
        program: { include: { level: true } },
      },
    });

    if (!payment) {
      logger.warn(`Paiement non trouvé pour depositId: ${depositId}`);
      return res.status(200).json({ received: true }); // 200 pour ne pas que PawaPay réessaie
    }

    // ── Paiement réussi ───────────────────────────────────────────────────────
    if (status === "COMPLETED") {
      // Mettre à jour le paiement
      await prisma.payment.update({
        where: { id: payment.id },
        data: {
          status:         "SUCCESS",
          pawapayStatus:  status,
          paidAt:         new Date(),
        },
      });

      // Générer le PDF de la déclaration de recette
      const pdfPath = await pdfService.generateReceipt({
        ...payment,
        paidAt: new Date(),
      });

      // Sauvegarder le reçu
      await prisma.receipt.create({
        data: {
          paymentId: payment.id,
          pdfPath,
        },
      });

      logger.info(`✅ Paiement validé & PDF généré: ${payment.receiptNumber}`);
    }

    // ── Paiement échoué ───────────────────────────────────────────────────────
    if (status === "FAILED" || status === "TIMED_OUT") {
      await prisma.payment.update({
        where: { id: payment.id },
        data: {
          status:               "FAILED",
          pawapayStatus:        status,
          pawapayFailureReason: body.failureReason || "Paiement échoué",
        },
      });
      logger.warn(`❌ Paiement échoué: ${payment.receiptNumber} | ${status}`);
    }

    // PawaPay attend toujours un 200
    return res.status(200).json({ received: true });

  } catch (err) {
    logger.error("Erreur webhook PawaPay:", err);
    return res.status(200).json({ received: true }); // toujours 200
  }
};

// ── Vérifier le statut d'un paiement (polling frontend) ──────────────────────
const getPaymentStatus = async (req, res) => {
  try {
    const { paymentId } = req.params;

    const payment = await prisma.payment.findUnique({
      where:   { id: paymentId },
      include: { receipt: true },
    });

    if (!payment) return error(res, "Paiement non trouvé", 404);

    // Si toujours PENDING, vérifier directement chez PawaPay
    if (payment.status === "PENDING" && payment.pawapayDepositId) {
      try {
        const pawapayData = await pawapayService.checkDepositStatus(payment.pawapayDepositId);
        logger.info(`🔍 Statut PawaPay: ${pawapayData.status} pour ${payment.receiptNumber}`);
        // On pourrait mettre à jour la DB ici si on veut, mais le webhook s'en charge.
      } catch (checkErr) {
        logger.warn(`⚠️ Impossible de vérifier le statut chez PawaPay pour ${payment.receiptNumber}: ${checkErr.message}`);
      }
    }

    return success(res, {
      paymentId:     payment.id,
      receiptNumber: payment.receiptNumber,
      status:        payment.status,
      amount:        Number(payment.amount),
      paidAt:        payment.paidAt,
      hasReceipt:    !!payment.receipt,
    });

  } catch (err) {
    logger.error("Erreur getPaymentStatus:", err);
    return error(res, "Erreur lors de la vérification du statut", 500);
  }
};

// ── Télécharger le reçu PDF ───────────────────────────────────────────────────
const downloadReceipt = async (req, res) => {
  const fs   = require("fs");
  const path = require("path");

  try {
    const { receiptNumber } = req.params;

    const payment = await prisma.payment.findUnique({
      where:   { receiptNumber },
      include: { receipt: true },
    });

    if (!payment)          return error(res, "Paiement non trouvé", 404);
    if (!payment.receipt)  return error(res, "Reçu pas encore généré", 404);
    if (payment.status !== "SUCCESS") return error(res, "Paiement non validé", 400);

    const pdfPath = payment.receipt.pdfPath;
    if (!fs.existsSync(pdfPath)) return error(res, "Fichier PDF introuvable", 404);

    res.setHeader("Content-Type", "application/pdf");
    res.setHeader("Content-Disposition", `attachment; filename="${receiptNumber}.pdf"`);
    fs.createReadStream(pdfPath).pipe(res);

  } catch (err) {
    logger.error("Erreur downloadReceipt:", err);
    return error(res, "Erreur lors du téléchargement", 500);
  }
};

// ── Vérification publique d'un reçu (scan du QR code) ─────────────────────────
// Public : n'expose QUE les infos nécessaires à l'authentification du reçu
// (pas de téléphone, ni date/lieu de naissance).
const verifyReceipt = async (req, res) => {
  try {
    const { receiptNumber } = req.params;

    const payment = await prisma.payment.findUnique({
      where:   { receiptNumber },
      include: {
        student: { include: { establishment: true } },
        program: { include: { level: true } },
      },
    });

    if (!payment) {
      return error(res, "Aucun reçu ne correspond à cette référence", 404);
    }

    const civilite = payment.student.gender === "F" ? "Mme" : "M.";

    return success(res, {
      receiptNumber: payment.receiptNumber,
      status:        payment.status,
      verified:      payment.status === "SUCCESS",
      owner: {
        fullName:      `${civilite} ${payment.student.lastName} ${payment.student.firstName}`,
        matricule:     payment.student.matricule,
        establishment: payment.student.establishment.name,
        program:       payment.program.name,
        level:         `${payment.program.level.name} ${payment.studyYear}`,
      },
      payment: {
        amount:       Number(payment.amount),
        currency:     payment.currency,
        academicYear: payment.academicYear,
        method:       payment.paymentMethod,
        paidAt:       payment.paidAt,
      },
    });

  } catch (err) {
    logger.error("Erreur verifyReceipt:", err);
    return error(res, "Erreur lors de la vérification", 500);
  }
};

// helper local pour éviter d'exposer la classe
function PawapayService_formatPhone(phone) {
  const cleaned = phone.replace(/\D/g, "");
  if (cleaned.startsWith("242")) return cleaned;
  if (cleaned.startsWith("0"))   return `242${cleaned.slice(1)}`;
  return `242${cleaned}`;
}

module.exports = { initiatePayment, pawapayWebhook, getPaymentStatus, downloadReceipt, verifyReceipt };
