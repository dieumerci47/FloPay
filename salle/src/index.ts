import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import { PrismaClient } from '@prisma/client';

dotenv.config();

const app = express();
const prisma = new PrismaClient();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(express.json());

import { pawapayService } from './services/pawapay';
import { pdfService } from './services/pdf';

// Route de test
app.get('/api/health', (req, res) => {
  res.json({ status: 'OK', message: 'UMG PayTech API is running' });
});

// Initier un paiement
app.post('/api/payments/initiate', async (req, res) => {
  try {
    const { studentId, amount, phone, paymentMethod } = req.body;
    
    // 1. Créer la transaction en BDD (PENDING)
    const transaction = await prisma.transaction.create({
      data: {
        studentId,
        amount: parseFloat(amount),
        currency: 'XAF',
        paymentMethod, // MTN, AIRTEL
        pawapayId: null, // Sera mis à jour avec la réponse PawaPay
      }
    });

    // 2. Appeler PawaPay
    // Choix du correspondent selon le moyen de paiement (Exemple pour le Congo Brazzaville - COG)
    const correspondent = paymentMethod === 'MTN' ? 'MTN_MOMO_COG' : 'AIRTEL_OAPI_COG';
    
    const depositResponse = await pawapayService.initiateDeposit({
      depositId: transaction.id,
      amount: amount.toString(),
      currency: 'XAF',
      country: 'COG',
      correspondent,
      payerAddress: phone,
      statementDescription: 'UMG Frais Scolarite'
    });

    res.json({ 
      success: true, 
      message: 'Payment push initiated', 
      transactionId: transaction.id,
      pawapayResponse: depositResponse
    });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// Route PawaPay Webhook
app.post('/api/webhooks/pawapay', async (req, res) => {
  console.log('Webhook reçu de PawaPay:', req.body);
  try {
    const events = Array.isArray(req.body) ? req.body : [req.body];
    
    for (const event of events) {
      if (event.depositId && event.status) {
        // Mise à jour de la transaction en base
        await prisma.transaction.updateMany({
          where: { id: event.depositId },
          data: { status: event.status }
        });

        // Si COMPLETED -> Générer le PDF
        if (event.status === 'COMPLETED') {
           console.log(`Transaction ${event.depositId} confirmée. Génération du PDF...`);
           
           const txn = await prisma.transaction.findFirst({
             where: { id: event.depositId },
             include: { student: true }
           });

           if (txn) {
              const pdfPath = await pdfService.generateReceipt(
                txn.id, 
                `${txn.student.firstName} ${txn.student.lastName}`, 
                txn.student.matricule, 
                txn.amount, 
                txn.updatedAt
              );
              console.log(`PDF généré avec succès : ${pdfPath}`);
              
              await prisma.transaction.update({
                where: { id: txn.id },
                data: { pdfReceiptUrl: pdfPath }
              });
              
              // TODO: Intégrer la passerelle SMS ici plus tard (Twilio/Africa's Talking)
           }
        }
      }
    }
    
    res.status(200).send('OK');
  } catch (error) {
    console.error('Erreur traitement webhook:', error);
    res.status(500).send('Internal Server Error');
  }
});

app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});
