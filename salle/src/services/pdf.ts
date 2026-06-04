import PDFDocument from 'pdfkit';
import fs from 'fs';
import path from 'path';

export const pdfService = {
  /**
   * Génère un reçu PDF pour une transaction
   * @param transactionId ID de la transaction
   * @param studentName Nom de l'étudiant
   * @param matricule Matricule de l'étudiant
   * @param amount Montant payé
   * @param date Date du paiement
   * @returns Le chemin absolu du fichier PDF généré
   */
  async generateReceipt(
    transactionId: string,
    studentName: string,
    matricule: string,
    amount: number,
    date: Date
  ): Promise<string> {
    return new Promise((resolve, reject) => {
      try {
        const doc = new PDFDocument({ margin: 50 });
        
        // Créer le dossier "receipts" s'il n'existe pas
        const receiptsDir = path.join(__dirname, '../../receipts');
        if (!fs.existsSync(receiptsDir)) {
          fs.mkdirSync(receiptsDir, { recursive: true });
        }

        const fileName = `receipt_${transactionId}.pdf`;
        const filePath = path.join(receiptsDir, fileName);

        const writeStream = fs.createWriteStream(filePath);
        doc.pipe(writeStream);

        // Header
        doc.fontSize(20).text('UMG PayTech', { align: 'center' });
        doc.moveDown();
        doc.fontSize(14).text('Déclaration de Recette Officielle', { align: 'center' });
        doc.moveDown(2);

        // Infos de l'étudiant
        doc.fontSize(12)
           .text(`Date : ${date.toLocaleDateString('fr-FR')} ${date.toLocaleTimeString('fr-FR')}`)
           .text(`Transaction ID : ${transactionId}`)
           .moveDown()
           .text(`Nom de l'étudiant : ${studentName}`)
           .text(`Matricule : ${matricule}`)
           .moveDown();

        // Détails du paiement
        doc.text('--------------------------------------------------')
           .moveDown()
           .text(`Motif : Frais de scolarité`)
           .text(`Montant Payé : ${amount} FCFA`, { underline: true })
           .moveDown()
           .text('--------------------------------------------------');

        // Footer
        doc.moveDown(4);
        doc.fontSize(10).text('Ceci est un document officiel généré par UMG PayTech.', { align: 'center', color: 'grey' });
        doc.text('Université Marien Ngouabi - Brazzaville, Congo', { align: 'center', color: 'grey' });

        doc.end();

        writeStream.on('finish', () => {
          resolve(filePath);
        });

        writeStream.on('error', (err) => {
          reject(err);
        });

      } catch (error) {
        reject(error);
      }
    });
  }
};
