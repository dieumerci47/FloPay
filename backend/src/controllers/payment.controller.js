// src/controllers/payment.controller.js
const { prisma }              = require("../config/database");
const pawapayService          = require("../services/pawapay.service");
const pdfService              = require("../services/pdf.service");
const { generateReceiptNumber } = require("../utils/receiptNumber");
const { generateMatricule }     = require("../utils/matricule");
const { success, error }      = require("../utils/response");
const logger                  = require("../utils/logger");

// ── Initier un paiement ───────────────────────────────────────────────────────
const initiatePayment = async (req, res) => {
  const { fullName, birthDate, birthPlace, phone,
          establishmentId, programId, paymentMethod, paymentPhone } = req.body;

  try {
    // 1. Récupérer le programme (contient le montant)
    const program = await prisma.program.findFirst({
      where: { id: programId, isActive: true },
      include: { establishment: true },
    });
    if (!program) return error(res, "Programme introuvable", 404);

    // 2. Vérifier que l'étudiant n'a pas déjà payé ce parcours cette année.
    //    Identité = téléphone + nom (pas de matricule fiable côté UMG).
    const alreadyPaid = await prisma.payment.findFirst({
      where: {
        student: { phone, fullName },
        programId,
        academicYear: program.academicYear,
        status: "SUCCESS",
      },
    });
    if (alreadyPaid) {
      return error(res, "Ce numéro a déjà un paiement validé pour ce parcours cette année académique", 409);
    }

    // 3. Créer ou retrouver l'étudiant (identité = téléphone + nom)
    let student = await prisma.student.findFirst({ where: { phone, fullName } });
    if (!student) {
      student = await prisma.student.create({
        data: {
          matricule: generateMatricule(),   // identifiant interne auto-généré
          fullName,
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
        amount:        program.amount,
        currency:      "XAF",
        paymentMethod,
        phoneNumber:   PawapayService_formatPhone(paymentPhone),
        academicYear:  program.academicYear,
        studentId:     student.id,
        programId:     program.id,
      },
    });

    // 6. Appeler PawaPay
    const formattedPhone = pawapayService.constructor.formatPhone(paymentPhone);

    const { depositId } = await pawapayService.initiateDeposit({
      phone:         formattedPhone,
      amount:        Number(program.amount),
      method:        paymentMethod,
      receiptNumber,
      description:   `Scolarite UMG ${program.academicYear} - ${student.fullName}`,
    });

    // 7. Mettre à jour le paiement avec l'ID PawaPay
    await prisma.payment.update({
      where: { id: payment.id },
      data:  { pawapayDepositId: depositId },
    });

    logger.info(`💳 Paiement initié: ${receiptNumber} | Étudiant: ${student.fullName} (${phone})`);

    return success(res, {
      paymentId:     payment.id,
      receiptNumber,
      depositId,
      amount:        Number(program.amount),
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
        program: true,
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

// helper local pour éviter d'exposer la classe
function PawapayService_formatPhone(phone) {
  const cleaned = phone.replace(/\D/g, "");
  if (cleaned.startsWith("242")) return cleaned;
  if (cleaned.startsWith("0"))   return `242${cleaned.slice(1)}`;
  return `242${cleaned}`;
}

module.exports = { initiatePayment, pawapayWebhook, getPaymentStatus, downloadReceipt };
