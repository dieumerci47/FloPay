// src/utils/receiptNumber.js

/**
 * Génère un numéro de reçu unique au format :
 * PAIE-{YEAR}{MONTH}{DAY}-{RANDOM}
 * ex: PAIE-20250419-A3K9
 */
const generateReceiptNumber = () => {
  const now = new Date();
  const date = now.toISOString().slice(0, 10).replace(/-/g, "");
  const rand = Math.random().toString(36).substring(2, 6).toUpperCase();
  return `PAIE-${date}-${rand}`;
};

module.exports = { generateReceiptNumber };
