import crypto from 'crypto';

// Configuration PawaPay
const PAWAPAY_API_URL = process.env.PAWAPAY_API_URL || 'https://api.sandbox.pawapay.cloud/v1';
const PAWAPAY_JWT = process.env.PAWAPAY_JWT || '';

export interface DepositRequest {
  depositId: string;
  amount: string;
  currency: string;
  country: string; // ex: "COG"
  correspondent: string; // ex: "MTN_MOMO_COG" ou "AIRTEL_OAPI_COG"
  payerAddress: string; // Numéro de téléphone MSISDN (ex: "242060000000")
  statementDescription: string;
}

export const pawapayService = {
  /**
   * Initie un dépôt (Push USSD) via PawaPay
   */
  async initiateDeposit(data: DepositRequest) {
    const payload = {
      depositId: data.depositId,
      amount: data.amount,
      currency: data.currency,
      country: data.country,
      correspondent: data.correspondent,
      payer: {
        type: "MSISDN",
        address: data.payerAddress
      },
      customerTimestamp: new Date().toISOString(),
      statementDescription: data.statementDescription
    };

    try {
      const response = await fetch(`${PAWAPAY_API_URL}/deposits`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${PAWAPAY_JWT}`
        },
        body: JSON.stringify(payload)
      });

      if (!response.ok) {
        const errorData = await response.json();
        console.error('Erreur PawaPay API:', errorData);
        throw new Error(`PawaPay API Error: ${response.statusText}`);
      }

      return await response.json();
    } catch (error) {
      console.error('Erreur lors de l\'initiation du dépôt PawaPay:', error);
      throw error;
    }
  }
};
