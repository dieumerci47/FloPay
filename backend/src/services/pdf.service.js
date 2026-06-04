// src/services/pdf.service.js
const PDFDocument = require("pdfkit");
const fs = require("fs");
const path = require("path");
const logger = require("../utils/logger");

const OUTPUT_DIR = process.env.PDF_OUTPUT_DIR || "./storage/receipts";

// S'assurer que le dossier existe
if (!fs.existsSync(OUTPUT_DIR)) {
  fs.mkdirSync(OUTPUT_DIR, { recursive: true });
}

class PdfService {
  /**
   * Génère la déclaration de recette en PDF
   * Reproduit fidèlement le format du document officiel UMG
   *
   * @param {object} payment  - Objet payment avec student, program, establishment
   * @returns {string}         - Chemin absolu du fichier PDF généré
   */
  async generateReceipt(payment) {
    const { student, program, receiptNumber, amount, paidAt, paymentMethod, phoneNumber } = payment;
    const establishment = student.establishment;

    const filename = `receipt_${receiptNumber.replace(/[^a-zA-Z0-9]/g, "_")}.pdf`;
    const filepath = path.join(OUTPUT_DIR, filename);

    return new Promise((resolve, reject) => {
      const doc = new PDFDocument({ size: "A4", margin: 50 });
      const stream = fs.createWriteStream(filepath);

      doc.pipe(stream);

      // ── Couleurs & constantes ──────────────────────────────────────────────
      const NAVY   = "#1A3C6E";
      const AMBER  = "#F5A623";
      const GREY   = "#F5F5F5";
      const BLACK  = "#1C1C1C";
      const W      = doc.page.width - 100; // largeur utile

      // ── EN-TÊTE ───────────────────────────────────────────────────────────
      // Bannière bleue
      doc.rect(50, 40, W, 70).fill(NAVY);

      doc
        .fillColor("white")
        .fontSize(18)
        .font("Helvetica-Bold")
        .text("UMG PAYTECH", 50, 55, { width: W, align: "center" });

      doc
        .fontSize(9)
        .font("Helvetica")
        .text("Plateforme de Paiement des Frais de Scolarité", 50, 78, { width: W, align: "center" });

      doc
        .fontSize(8)
        .text("Université Marien Ngouabi · Brazzaville, République du Congo", 50, 93, {
          width: W, align: "center",
        });

      // ── TITRE DOCUMENT ────────────────────────────────────────────────────
      doc
        .moveDown(0.5)
        .rect(50, 120, W, 30).fill(AMBER);

      doc
        .fillColor("white")
        .fontSize(13)
        .font("Helvetica-Bold")
        .text("DÉCLARATION DE RECETTE", 50, 128, { width: W, align: "center" });

      // ── NUMÉRO DE REÇU ────────────────────────────────────────────────────
      doc
        .fillColor(BLACK)
        .fontSize(9)
        .font("Helvetica")
        .text(`N° : ${receiptNumber}`, 50, 162, { width: W / 2 })
        .text(
          `Matricule : ${student.matricule}`,
          50 + W / 2, 162,
          { width: W / 2, align: "right" }
        );

      // ligne séparatrice
      doc.moveTo(50, 180).lineTo(50 + W, 180).strokeColor("#CCCCCC").lineWidth(0.5).stroke();

      // ── BLOC INTRO ────────────────────────────────────────────────────────
      doc
        .fillColor(BLACK)
        .fontSize(10)
        .font("Helvetica")
        .text(
          "Le Gestionnaire de la Direction de la Scolarité et des Examens, soussigné, déclare avoir reçu de :",
          50, 192, { width: W }
        );

      // ── INFOS ÉTUDIANT ────────────────────────────────────────────────────
      doc.rect(50, 215, W, 90).fill(GREY).stroke("#E0E0E0");

      const infoY  = 225;
      const col1   = 60;
      const col2   = 230;
      const lineH  = 18;

      const fields = [
        ["Nom et Prénom(s)", student.fullName],
        ["Établissement",    establishment.name],
        ["Parcours Type",    program.name],
        ["Niveau",          program.level],
        ["Année Académique", program.academicYear],
      ];

      fields.forEach(([label, value], i) => {
        doc
          .fillColor("#666666").fontSize(8).font("Helvetica")
          .text(label, col1, infoY + i * lineH);
        doc
          .fillColor(BLACK).fontSize(9).font("Helvetica-Bold")
          .text(value, col2, infoY + i * lineH);
      });

      // ── MONTANT ───────────────────────────────────────────────────────────
      const amountY = 320;
      doc.rect(50, amountY, W, 55).fill(NAVY);

      const amountNum = parseFloat(amount);
      const amountStr = new Intl.NumberFormat("fr-FR").format(amountNum);
      const inWords   = numberToWords(amountNum);

      doc
        .fillColor("white")
        .fontSize(9).font("Helvetica")
        .text("LA SOMME DE :", 60, amountY + 10);

      doc
        .fontSize(20).font("Helvetica-Bold")
        .text(`${amountStr} F CFA`, 60, amountY + 25, { width: W - 20, align: "center" });

      doc
        .fillColor(AMBER)
        .fontSize(8).font("Helvetica-Oblique")
        .text(`(En lettres : ${inWords})`, 60, amountY + 47, { width: W - 20, align: "center" });

      // ── MODE DE PAIEMENT ──────────────────────────────────────────────────
      const methodY = 390;
      doc
        .fillColor(BLACK)
        .fontSize(9).font("Helvetica")
        .text("En règlement de l'opération sus-mentionnée, via :", 50, methodY);

      doc
        .fontSize(10).font("Helvetica-Bold")
        .fillColor(NAVY)
        .text(`${paymentMethod} Mobile Money · ${phoneNumber}`, 50, methodY + 15);

      // ── PIED DE PAGE DOCUMENT ─────────────────────────────────────────────
      const footerY = 430;
      doc.moveTo(50, footerY).lineTo(50 + W, footerY).strokeColor("#CCCCCC").lineWidth(0.5).stroke();

      const paidDate = paidAt
        ? new Date(paidAt).toLocaleDateString("fr-FR", { day: "2-digit", month: "long", year: "numeric" })
        : "—";

      doc
        .fillColor(BLACK)
        .fontSize(9).font("Helvetica")
        .text(`Fait à Brazzaville, le ${paidDate}`, 50, footerY + 12)
        .text("Pour le Directeur de la Scolarité et des Examens", 50 + W - 250, footerY + 12, {
          width: 250, align: "right",
        });

      doc
        .fontSize(8).font("Helvetica-Bold")
        .text("Le Chef de Service", 50 + W - 250, footerY + 28, { width: 250, align: "right" });

      // Zone signature
      doc.rect(50 + W - 200, footerY + 40, 195, 50).stroke("#CCCCCC");
      doc
        .fontSize(7).font("Helvetica").fillColor("#999999")
        .text("Signature + Cachet", 50 + W - 200, footerY + 58, { width: 195, align: "center" });

      // ── QR CODE placeholder ───────────────────────────────────────────────
      doc.rect(50, footerY + 40, 80, 50).fill(GREY).stroke("#CCCCCC");
      doc
        .fontSize(6).fillColor("#999999")
        .text("QR Vérification", 50, footerY + 62, { width: 80, align: "center" });

      // ── BAS DE PAGE ───────────────────────────────────────────────────────
      const bottomY = doc.page.height - 60;
      doc.rect(50, bottomY, W, 25).fill(NAVY);
      doc
        .fillColor("white").fontSize(7).font("Helvetica")
        .text(
          `Document généré automatiquement par UMG PayTech · ${receiptNumber} · Ce document tient lieu de reçu officiel`,
          50, bottomY + 8, { width: W, align: "center" }
        );

      // ── NOTE SEMESTRES ─────────────────────────────────────────────────────
      doc
        .fillColor("#666666").fontSize(8).font("Helvetica")
        .text("Semestres couverts :", 50, bottomY - 30)
        .rect(170, bottomY - 33, 60, 16).stroke("#CCCCCC")
        .text("S1  ☐   S2  ☐", 175, bottomY - 28);

      doc.end();

      stream.on("finish", () => {
        logger.info(`📄 PDF généré: ${filepath}`);
        resolve(filepath);
      });
      stream.on("error", reject);
    });
  }
}

// ── Convertit un nombre en lettres (XAF, simplifié) ───────────────────────────
function numberToWords(n) {
  const units = ["", "un", "deux", "trois", "quatre", "cinq", "six", "sept", "huit", "neuf",
                 "dix", "onze", "douze", "treize", "quatorze", "quinze", "seize",
                 "dix-sept", "dix-huit", "dix-neuf"];
  const tens  = ["", "", "vingt", "trente", "quarante", "cinquante",
                 "soixante", "soixante-dix", "quatre-vingt", "quatre-vingt-dix"];

  if (n === 0) return "zéro";
  if (n < 20)  return units[n];
  if (n < 100) {
    const t = Math.floor(n / 10);
    const u = n % 10;
    if (t === 7 || t === 9) return `${tens[t - 1]}-${units[10 + u]}`;
    return u === 0 ? tens[t] : `${tens[t]}-${units[u]}`;
  }
  if (n < 1000) {
    const c = Math.floor(n / 100);
    const r = n % 100;
    const prefix = c === 1 ? "cent" : `${units[c]} cent`;
    return r === 0 ? prefix : `${prefix} ${numberToWords(r)}`;
  }
  if (n < 1000000) {
    const k = Math.floor(n / 1000);
    const r = n % 1000;
    const prefix = k === 1 ? "mille" : `${numberToWords(k)} mille`;
    return r === 0 ? prefix : `${prefix} ${numberToWords(r)}`;
  }
  return String(n); // fallback
}

module.exports = new PdfService();
