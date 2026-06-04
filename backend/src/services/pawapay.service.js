// src/services/pawapay.service.js
const axios = require("axios");
const { v4: uuidv4 } = require("uuid");
const logger = require("../utils/logger");

// ── Correspondance opérateur → correspondent ID PawaPay ──────────────────────
// Ces IDs sont fournis par PawaPay dans ton dashboard selon le pays
const CORRESPONDENTS = {
  MTN:    "MTN_MOMO_COG",   // MTN Congo-Brazzaville
  AIRTEL: "AIRTEL_COG", // Airtel Congo-Brazzaville
};

class PawapayService {
  constructor() {
    this.client = axios.create({
      baseURL: process.env.PAWAPAY_BASE_URL,
      headers: {
        Authorization: `Bearer ${process.env.PAWAPAY_API_TOKEN}`,
        "Content-Type": "application/json",
      },
      timeout: 30000,
    });
  }

  /**
   * Initier un dépôt (débit du client)
   * C'est ce qu'on appelle quand l'étudiant paye
   *
   * @param {object} params
   * @param {string} params.phone        - Numéro de téléphone (format international: 242XXXXXXXX)
   * @param {number} params.amount       - Montant en XAF
   * @param {string} params.method       - "MTN" ou "AIRTEL"
   * @param {string} params.receiptNumber - Référence interne
   * @param {string} params.description  - Description pour l'étudiant
   */
  async initiateDeposit({ phone, amount, method, receiptNumber, description }) {
    const depositId = uuidv4(); // ID unique PawaPay côté nous

    const payload = {
      depositId,
      amount: String(amount),
      currency: "XAF",
      payer: {
        type: "MMO",
        accountDetails: {
          phoneNumber: phone,
          provider: CORRESPONDENTS[method],
        },
      },
    };

    logger.info(`🔄 PawaPay deposit initié: ${depositId} | ${phone} | ${amount} XAF`);

    try {
      const response = await this.client.post("/v2/deposits", payload);
      logger.info("response deposit", response.data);
      // PawaPay retourne status 200 avec { depositId, status: "ACCEPTED" | "REJECTED" }
      if (response.data.status !== "ACCEPTED") {
        throw new Error(
          `PawaPay a rejeté le dépôt: ${response.data.rejectionReason || "Raison inconnue"}`
        );
      }

      logger.info(`✅ PawaPay deposit accepté: ${depositId}`);
      return { depositId, status: "ACCEPTED" };
    } catch (error) {
      if (error.response) {
        logger.error(`❌ Erreur PawaPay API (400): ${JSON.stringify(error.response.data)}`);
      }
      throw error;
    }
  }

  /**
   * Vérifier le statut d'un dépôt
   * Utilisé pour le polling si le webhook n'arrive pas
   */
  async checkDepositStatus(depositId) {
    logger.info(`🔍 Vérification statut PawaPay: ${depositId}`);
    const response = await this.client.get(`/v2/deposits/${depositId}`);
    return response.data; // { depositId, status, amount, currency, ... }
  }

  /**
   * Valider la signature du webhook PawaPay
   * PawaPay envoie un header X-Signature qu'on doit vérifier
   *
   * Pour la prod, implémente la vérification de signature RSA
   * Docs: https://docs.pawapay.cloud/webhooks
   */
  validateWebhookSignature(payload, signature) {
    // TODO en production: vérifier la signature RSA avec la clé publique PawaPay
    // Pour le MVP sandbox, on accepte tous les webhooks
    if (process.env.NODE_ENV === "production") {
      logger.warn("⚠️  Vérification signature webhook non implémentée !");
    }
    return true;
  }

  /**
   * Formater le numéro de téléphone en format international Congo
   * 06XXXXXXXX → 24206XXXXXXXX
   */
  static formatPhone(phone) {
    const cleaned = phone.replace(/\D/g, "");
    if (cleaned.startsWith("242")) return cleaned;
    if (cleaned.startsWith("0"))   return `2420${cleaned.slice(1)}`;
    return `242${cleaned}`;
  }
}

module.exports = new PawapayService();
