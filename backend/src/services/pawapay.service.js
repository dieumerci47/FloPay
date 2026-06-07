// src/services/pawapay.service.js
const axios = require("axios");
const { v4: uuidv4 } = require("uuid");
const { createHash, createPublicKey, createVerify } = require("crypto");
const { httpbis } = require("http-message-signatures");
const logger = require("../utils/logger");

// ── Correspondance opérateur → correspondent ID PawaPay ──────────────────────
// Ces IDs sont fournis par PawaPay dans ton dashboard selon le pays
const CORRESPONDENTS = {
  MTN:    "MTN_MOMO_COG",   // MTN Congo-Brazzaville
  AIRTEL: "AIRTEL_COG", // Airtel Congo-Brazzaville
};

// ── Vérification des callbacks signés (RFC 9421) ──────────────────────────────
// Réplique le schéma officiel PawaPay : ECDSA P-256 / SHA-256, signature DER.
function ppVerifier(publicKey) {
  return {
    async verify(data, signature) {
      // data = base de signature (Buffer), signature = Buffer (DER)
      return createVerify("SHA256").update(data).verify(publicKey, signature, "base64");
    },
  };
}

// Vérifie le Content-Digest (sha-256 ou sha-512) contre le corps brut
function verifyContentDigest(headerValue, rawBody) {
  const m = /(sha-256|sha-512)=:([^:]+):/i.exec(String(headerValue || ""));
  if (!m) return false;
  const algo     = m[1].toLowerCase() === "sha-256" ? "sha256" : "sha512";
  const expected = m[2];
  const actual   = createHash(algo).update(rawBody).digest("base64");
  return expected === actual;
}

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
    this._keys   = null; // cache des clés publiques de vérification
    this._keysAt = 0;
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
   * Récupère (et met en cache 1h) les clés publiques de vérification PawaPay.
   * Endpoint v2 : GET /v2/public-key/http → [{ id, key (PEM) }]
   */
  async getVerificationKeys() {
    const now = Date.now();
    if (this._keys && now - this._keysAt < 60 * 60 * 1000) return this._keys;

    const res = await this.client.get("/v2/public-key/http");
    const map = new Map();
    for (const k of res.data || []) map.set(k.id, k.key);
    this._keys   = map;
    this._keysAt = now;
    return map;
  }

  /**
   * Vérifie la signature d'un callback PawaPay (RFC 9421).
   * Contrôle le Content-Digest (intégrité du corps) ET la signature cryptographique.
   * @param {import('express').Request} req — requête Express (body = Buffer brut via express.raw)
   * @returns {Promise<'valid'|'invalid'|'missing'>}
   */
  async verifyCallbackSignature(req) {
    const hasSig = req.headers["signature"] && req.headers["signature-input"];
    if (!hasSig) return "missing";

    try {
      // 1) Intégrité du corps
      if (!verifyContentDigest(req.headers["content-digest"], req.body)) {
        logger.warn("🔏 Webhook: Content-Digest invalide");
        return "invalid";
      }

      // 2) Signature cryptographique
      const keys = await this.getVerificationKeys();
      const host = process.env.PAWAPAY_CALLBACK_HOST
        || req.headers["x-forwarded-host"]
        || req.headers.host;

      const message = {
        method:  req.method,
        url:     `https://${host}${req.originalUrl}`,
        headers: req.headers,
      };

      const valid = await httpbis.verifyMessage(
        {
          keyLookup: async ({ keyid }) => {
            const pem = (keyid && keys.get(keyid)) || keys.values().next().value;
            return pem ? ppVerifier(createPublicKey(pem)) : null;
          },
        },
        message
      );

      if (valid !== true) logger.warn("🔏 Webhook: signature invalide");
      return valid === true ? "valid" : "invalid";

    } catch (err) {
      logger.error("🔏 Webhook: erreur vérification signature:", err.message);
      return "invalid";
    }
  }

  /**
   * Formater un numéro congolais (COG) au format MSISDN attendu par PawaPay.
   * PawaPay conserve le 0 national après l'indicatif : 242 + 0XXXXXXXX.
   * (cf. numéros de test : 242063456789 pour MTN, 242053456789 pour Airtel)
   *
   * Idempotente et tolérante aux entrées :
   *   06 345 67 89   → 242063456789
   *   063456789      → 242063456789
   *   63456789       → 242063456789   (0 national ré-ajouté)
   *   +242 06 ...    → 242063456789
   *   24263456789    → 242063456789   (corrige un 0 manquant)
   */
  static formatPhone(phone) {
    let c = String(phone || "").replace(/\D/g, "");
    if (c.startsWith("242")) c = c.slice(3); // retire l'indicatif s'il est déjà présent
    if (!c.startsWith("0")) c = `0${c}`;      // garantit le 0 national
    return `242${c}`;
  }
}

module.exports = new PawapayService();
