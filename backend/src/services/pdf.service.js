// src/services/pdf.service.js
const PDFDocument = require("pdfkit");
const QRCode = require("qrcode");
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
   * Génère la déclaration de recette en PDF.
   * Reproduit la mise en page du document officiel UMG (administratif, Times, N&B).
   *
   * @param {object} payment  - Objet payment avec student, program, establishment
   * @returns {string}         - Chemin absolu du fichier PDF généré
   */
  async generateReceipt(payment) {
    const { student, program, receiptNumber, amount, academicYear, paidAt, paymentMethod, phoneNumber } = payment;
    const establishment = student.establishment;

    const filename = `receipt_${receiptNumber.replace(/[^a-zA-Z0-9]/g, "_")}.pdf`;
    const filepath = path.join(OUTPUT_DIR, filename);

    // QR de vérification : encode une URL si RECEIPT_VERIFY_BASE est défini,
    // sinon la référence du reçu (que la scolarité peut rechercher dans l'admin).
    const verifyTarget = process.env.RECEIPT_VERIFY_BASE
      ? `${process.env.RECEIPT_VERIFY_BASE.replace(/\/$/, "")}/${receiptNumber}`
      : receiptNumber;
    let qrBuffer = null;
    try {
      qrBuffer = await QRCode.toBuffer(verifyTarget, { errorCorrectionLevel: "M", margin: 1, width: 220 });
    } catch (e) {
      logger.warn(`QR non généré pour ${receiptNumber}: ${e.message}`);
    }

    return new Promise((resolve, reject) => {
      const doc = new PDFDocument({ size: "A4", margin: 50 });
      const stream = fs.createWriteStream(filepath);
      doc.pipe(stream);

      // ── Constantes ─────────────────────────────────────────────────────────
      const BLACK = "#000000";
      const GREY  = "#555555";
      const W     = doc.page.width - 100;     // largeur utile
      const LEFT  = 50;
      const RIGHT = 50 + W;
      const CX    = doc.page.width / 2;        // centre horizontal

      const civilite  = student.gender === "F" ? "Mme" : "M.";
      const amountNum = parseFloat(amount);
      const amountStr = new Intl.NumberFormat("fr-FR").format(amountNum);
      const inWords   = numberToWords(amountNum);

      // ── EN-TÊTE OFFICIEL ───────────────────────────────────────────────────
      doc.fillColor(BLACK).font("Times-Bold").fontSize(16)
         .text("REPUBLIQUE DU CONGO", LEFT, 48, { width: W, align: "center" });
      doc.font("Times-Italic").fontSize(10)
         .text("Unité - Travail - Progrès", LEFT, 70, { width: W, align: "center" });

      // Armoiries (optionnel : déposer le fichier pour qu'elles apparaissent)
      const emblemPath = process.env.RECEIPT_EMBLEM_PATH
        || path.join(__dirname, "../../storage/assets/armoiries.png");
      if (fs.existsSync(emblemPath)) {
        try { doc.image(emblemPath, CX - 24, 86, { width: 48, height: 48 }); } catch (_) { /* ignore */ }
      }

      // ── Cadre "Semestre" (haut droite) — selon le niveau ───────────────────
      const [sem1, sem2] = semestersForLevel(program.level);
      const semX = RIGHT - 72, semY = 46, semW = 72, rowH = 15;
      doc.lineWidth(0.7).strokeColor(BLACK);
      doc.rect(semX, semY, semW, rowH).stroke();
      doc.rect(semX, semY + rowH, semW / 2, rowH).stroke();
      doc.rect(semX + semW / 2, semY + rowH, semW / 2, rowH).stroke();
      doc.font("Times-Roman").fontSize(8).fillColor(BLACK)
         .text("Semestre", semX, semY + 4, { width: semW, align: "center" })
         .text(sem1, semX, semY + rowH + 4, { width: semW / 2, align: "center" })
         .text(sem2, semX + semW / 2, semY + rowH + 4, { width: semW / 2, align: "center" });

      // ── TITRE ──────────────────────────────────────────────────────────────
      const titleY = 150;
      doc.font("Times-Bold").fontSize(18)
         .text("DECLARATION DE RECETTE", LEFT, titleY, { width: W, align: "center" });
      const tW = doc.widthOfString("DECLARATION DE RECETTE");
      doc.moveTo(CX - tW / 2, titleY + 25).lineTo(CX + tW / 2, titleY + 25).lineWidth(1).stroke();

      // ── N° INSCRIPTION + MATRICULE ─────────────────────────────────────────
      doc.font("Times-Roman").fontSize(11)
         .text(`( Inscription        N° : ${receiptNumber} )`, LEFT, titleY + 40, { width: W, align: "center" });
      doc.font("Times-Bold").fontSize(11)
         .text(`Matricule : ${student.matricule}`, LEFT, titleY + 58, { width: W, align: "center" });

      // ── CORPS ──────────────────────────────────────────────────────────────
      let y = titleY + 98;
      const lh = 22;

      // Rend une ligne "label : valeur" (label normal, valeur en gras, même ligne)
      const line = (label, value) => {
        doc.font("Times-Roman").fontSize(11).fillColor(BLACK).text(label, LEFT, y, { continued: true });
        doc.font("Times-Bold").text(value);
        y += lh;
      };

      line("ANNEE ACADEMIQUE : ", academicYear);
      line("ETABLISSEMENT : ", establishment.name);

      // Paragraphe de déclaration (pleine largeur, peut tenir sur 2 lignes)
      const para = "LE GESTIONNAIRE DE LA DIRECTION DE LA SCOLARITÉ ET DES EXAMENS, SOUSSIGNÉ DÉCLARE AVOIR REÇU";
      doc.font("Times-Roman").fontSize(11).fillColor(BLACK);
      const paraH = doc.heightOfString(para, { width: W });
      doc.text(para, LEFT, y, { width: W });
      y += paraH + 8;

      line(`de ${civilite} `, `${student.lastName} ${student.firstName}`);

      // Niveau + Parcours sur la même ligne
      doc.font("Times-Roman").fontSize(11).fillColor(BLACK)
         .text("NIVEAU : ", LEFT, y, { continued: true })
         .font("Times-Bold").text(program.level, { continued: true })
         .font("Times-Roman").text("          PARCOURS TYPE : ", { continued: true })
         .font("Times-Bold").text(program.name);
      y += lh;

      line("LA SOMME DE (EN CHIFFRES) : ", `${amountStr} F CFA`);
      line("(EN LETTRES) : ", `${inWords} F CFA`);

      doc.font("Times-Roman").fontSize(11).fillColor(BLACK)
         .text("EN RÈGLEMENT DE L'OPÉRATION SUS-MENTIONNÉE.", LEFT, y, { width: W });
      y += lh;

      // Méthode de paiement (info complémentaire, discrète)
      doc.font("Times-Italic").fontSize(9).fillColor(GREY)
         .text(`Réglé par ${paymentMethod} Mobile Money (${phoneNumber}).`, LEFT, y, { width: W });

      // ── DATE + SIGNATURE (bloc à droite) ───────────────────────────────────
      const paidDate = (paidAt ? new Date(paidAt) : new Date())
        .toLocaleDateString("fr-FR", { day: "2-digit", month: "2-digit", year: "numeric" });

      const sigY = Math.max(y + 34, 500);
      doc.font("Times-Roman").fontSize(11).fillColor(BLACK)
         .text(`Fait à Brazzaville, le ${paidDate}`, CX, sigY, { width: W / 2, align: "center" });
      doc.font("Times-Bold").fontSize(11)
         .text("Le Gestionnaire", CX, sigY + 24, { width: W / 2, align: "center" });

      // ── QR de vérification (bas gauche, face à la signature) ───────────────
      if (qrBuffer) {
        const qrSize = 84;
        doc.image(qrBuffer, LEFT, sigY - 6, { width: qrSize, height: qrSize });
        doc.font("Times-Roman").fontSize(7).fillColor(GREY)
           .text("Scannez pour vérifier", LEFT, sigY + qrSize - 4, { width: qrSize, align: "center" });
      }

      // ── PIED DE PAGE ───────────────────────────────────────────────────────
      const now = new Date();
      const genStamp = `${now.toLocaleDateString("fr-FR")} à ${now.toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit", second: "2-digit" })}`;
      doc.font("Times-Italic").fontSize(8).fillColor(GREY)
         .text(`Établi par : FloPay le ${genStamp}`, LEFT, doc.page.height - 72, { width: W });
      doc.font("Times-Roman").fontSize(7).fillColor(GREY)
         .text(
           `Reçu généré électroniquement via FloPay — vérifiable auprès de la scolarité · Réf. ${receiptNumber}`,
           LEFT, doc.page.height - 58, { width: W, align: "center" }
         );

      doc.end();

      stream.on("finish", () => {
        logger.info(`📄 PDF généré: ${filepath}`);
        resolve(filepath);
      });
      stream.on("error", reject);
    });
  }
}

// ── Semestres couverts selon le niveau ────────────────────────────────────────
// Licence 1 → S1/S2, Licence 2 → S3/S4, Licence 3 → S5/S6
// Le cycle Master repart à zéro : Master 1 → S1/S2, Master 2 → S3/S4
function semestersForLevel(level) {
  const match = String(level || "").match(/(\d+)/);
  const year  = match ? parseInt(match[1], 10) : 1;
  const first = (year - 1) * 2 + 1;
  return [`S${first}`, `S${first + 1}`];
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
